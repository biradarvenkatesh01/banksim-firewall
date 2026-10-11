/**
 * [Orchestrator] index.ts
 * Main entry point for the BankSim Blue-Team AI Firewall.
 * 
 * Pipeline:
 * [0] input_contract -> validate length & basic types
 * [1] canonicalization -> generate multi-view normalized texts
 * [2] signature_scan -> scan all views with regex & noisy-OR scoring
 * [3] intent_parse -> deterministic grammar produces candidate tool args
 * [4] semantic_classifier -> optional secondary LLM check (Groq)
 * [5] risk_decision -> evaluate risk thresholds (fail closed on grey zone)
 * [6] policy_engine -> enforce limits, single payee, balance, registered accounts
 * [7] tool_execution -> execute allow-listed financial tool if APPROVED (and not dry-run)
 */

import crypto from "node:crypto";
import type {
  Verdict,
  PipelineStage,
  Action,
  ThreatCategory,
  Signal,
  PolicyCheck,
} from "./schema";
import { ENGINE_VERSION } from "./schema";
import { checkContract, type FirewallInput } from "./contract";
import { scan, primaryCategory } from "./detectors";
import { parseIntent, extractInlineMemo } from "./parser";
import { evaluateRiskThreshold, evaluatePolicy } from "./policy";
import { classifyWithLLM } from "./llm";
import {
  type BankState,
  getSharedState,
  executeTool,
  ToolError,
} from "./bank";

export interface AnalyzeOptions {
  dryRun?: boolean;
  useLLM?: boolean;
  state?: BankState;
}

export async function analyze(
  input: FirewallInput,
  options: AnalyzeOptions = {}
): Promise<Verdict> {
  const startTime = Date.now();
  const bankState = options.state ?? getSharedState();
  const dryRun = Boolean(options.dryRun);

  // Generate deterministic input fingerprint based on raw message and memo
  const rawFingerprint = crypto
    .createHash("sha256")
    .update(`${input.message ?? ""}||${input.memo ?? ""}`)
    .digest("hex");

  // Pseudo-random request ID matching schema: ^req_[0-9a-f]{16}$
  const requestId = `req_${crypto.randomBytes(8).toString("hex")}`;
  const timestamp = new Date().toISOString();

  const pipeline: PipelineStage[] = [];
  const signals: Signal[] = [];
  const policyChecks: PolicyCheck[] = [];

  const defaultEngine = {
    version: ENGINE_VERSION,
    mode: "rules-only" as const,
    latency_ms: 0,
  };

  const defaultAction: Action = {
    tool: null,
    executed: false,
    dry_run: dryRun,
    result: null,
  };

  // -------------------------------------------------------------
  // [0] Input Contract Stage
  // -------------------------------------------------------------
  const contractResult = checkContract(input);
  if (!contractResult.ok) {
    pipeline.push({
      stage: "input_contract",
      passed: false,
      detail: contractResult.reason,
    });
    return {
      request_id: requestId,
      timestamp,
      status: "BLOCKED",
      risk_score: 100,
      threat_category: "INVALID_INPUT",
      explanation: `Blocked at input boundary: ${contractResult.reason}. No tools were executed.`,
      intent: "UNKNOWN",
      parsed_request: null,
      signals: [],
      policy_checks: [],
      pipeline,
      action: defaultAction,
      input_fingerprint: rawFingerprint,
      engine: { ...defaultEngine, latency_ms: Date.now() - startTime },
    };
  }

  pipeline.push({
    stage: "input_contract",
    passed: true,
    detail: "Message and memo lengths are within safety contract limits.",
  });

  const validMessage = contractResult.message;
  const validMemo = contractResult.memo;

  // Check for inline memo in message
  const { inlineMemo } = extractInlineMemo(validMessage);
  const allMemos: string[] = [];
  if (validMemo) allMemos.push(validMemo);
  if (inlineMemo && inlineMemo !== validMemo) allMemos.push(inlineMemo);

  // -------------------------------------------------------------
  // [1] Canonicalization Stage & [2] Signature Scan Stage
  // -------------------------------------------------------------
  const scanResult = scan({
    message: validMessage,
    memos: allMemos,
  });

  pipeline.push({
    stage: "canonicalization",
    passed: true,
    detail: `Produced ${scanResult.normalized.message.views.length} views; detected flags: [${scanResult.normalized.message.flags.join(", ") || "NONE"}].`,
  });

  signals.push(...scanResult.signals);
  let currentRisk = scanResult.rule_risk;
  let topCategory: ThreatCategory = primaryCategory(signals) ?? "NONE";

  pipeline.push({
    stage: "signature_scan",
    passed: currentRisk < 50,
    detail: `Scanned all canonical views. Found ${signals.length} threat signals. Rule risk score: ${currentRisk}/100.`,
  });

  // -------------------------------------------------------------
  // [3] Intent Parse Stage
  // -------------------------------------------------------------
  const parseResult = parseIntent(validMessage, validMemo);
  pipeline.push({
    stage: "intent_parse",
    passed: parseResult.intent !== "UNKNOWN" && parseResult.intent !== "MULTI_INTENT",
    detail: `Resolved intent: ${parseResult.intent}. Detected intents: [${parseResult.detected_intents.join(", ")}].`,
  });

  // -------------------------------------------------------------
  // [4] Semantic Classifier Stage (Groq)
  // -------------------------------------------------------------
  let llmMode: "rules-only" | "rules+llm" = "rules-only";
  let llmResult = null;

  if (options.useLLM !== false && process.env.GROQ_API_KEY?.trim()) {
    llmMode = "rules+llm";
    const sem = await classifyWithLLM(validMessage, validMemo);
    if (sem.enabled && sem.verdict) {
      llmResult = sem.verdict;
      pipeline.push({
        stage: "semantic_classifier",
        passed: !sem.verdict.is_attack,
        detail: `Semantic layer (${sem.verdict.confidence}): is_attack=${sem.verdict.is_attack}, category=${sem.verdict.category}. ${sem.verdict.reason}`,
      });

      if (sem.verdict.is_attack) {
        // LLM can only ADD risk
        const addedRisk = Math.round(sem.verdict.confidence * 80);
        currentRisk = Math.max(currentRisk, addedRisk);
        const attackCategory =
          topCategory !== "NONE"
            ? (topCategory as import("./schema").AttackCategory)
            : sem.verdict.category !== "NONE"
            ? sem.verdict.category
            : "PROMPT_INJECTION";
        topCategory = attackCategory;
        signals.push({
          rule_id: "SEMANTIC-LLM",
          category: attackCategory,
          label: "Flagged by Groq semantic layer",
          weight: sem.verdict.confidence,
          field: "semantic",
          view: "raw",
          evidence: sem.verdict.reason,
        });
      }
    } else {
      pipeline.push({
        stage: "semantic_classifier",
        passed: true,
        detail: sem.error ?? "Semantic classifier skipped.",
      });
    }
  } else {
    pipeline.push({
      stage: "semantic_classifier",
      passed: true,
      detail: "Semantic layer disabled or GROQ_API_KEY absent. Operating in deterministic rules-only mode.",
    });
  }

  // -------------------------------------------------------------
  // [5] Risk Decision Stage
  // -------------------------------------------------------------
  const riskDecision = evaluateRiskThreshold(currentRisk, llmResult);
  pipeline.push({
    stage: "risk_decision",
    passed: riskDecision.status === "APPROVED",
    detail: riskDecision.reason,
  });

  if (riskDecision.status === "BLOCKED") {
    const threat = topCategory !== "NONE" ? topCategory : "PROMPT_INJECTION";
    return {
      request_id: requestId,
      timestamp,
      status: "BLOCKED",
      risk_score: currentRisk,
      threat_category: threat,
      explanation: `Blocked by AI Firewall (${threat}): ${riskDecision.reason} Evidence: ${
        signals.map((s) => s.label).join("; ") || "Pattern heuristic match"
      }. No financial tools were executed.`,
      intent: parseResult.intent,
      parsed_request: parseResult.parsed_request,
      signals,
      policy_checks: [],
      pipeline,
      action: defaultAction,
      input_fingerprint: rawFingerprint,
      engine: {
        version: ENGINE_VERSION,
        mode: llmMode,
        latency_ms: Date.now() - startTime,
      },
    };
  }

  // -------------------------------------------------------------
  // [6] Policy Engine Stage
  // -------------------------------------------------------------
  const policyEval = evaluatePolicy(parseResult, bankState, validMessage);
  policyChecks.push(...policyEval.checks);

  pipeline.push({
    stage: "policy_engine",
    passed: policyEval.allowed,
    detail: policyEval.explanation,
  });

  if (!policyEval.allowed) {
    return {
      request_id: requestId,
      timestamp,
      status: "BLOCKED",
      risk_score: Math.max(currentRisk, 30),
      threat_category: policyEval.category,
      explanation: `Blocked by Policy Guardrails (${policyEval.category}): ${policyEval.explanation}. No financial tools were executed.`,
      intent: parseResult.intent,
      parsed_request: parseResult.parsed_request,
      signals,
      policy_checks: policyChecks,
      pipeline,
      action: defaultAction,
      input_fingerprint: rawFingerprint,
      engine: {
        version: ENGINE_VERSION,
        mode: llmMode,
        latency_ms: Date.now() - startTime,
      },
    };
  }

  // -------------------------------------------------------------
  // [7] Tool Execution Stage
  // -------------------------------------------------------------
  let toolToExecute: "get_balance" | "get_history" | "transfer" | null = null;
  let toolArgs: Record<string, unknown> = {};

  if (parseResult.intent === "BALANCE_CHECK") {
    toolToExecute = "get_balance";
    toolArgs = {};
  } else if (parseResult.intent === "TRANSACTION_HISTORY") {
    toolToExecute = "get_history";
    toolArgs = { limit: 5 };
  } else if (parseResult.intent === "TRANSFER") {
    toolToExecute = "transfer";
    const amountRupees = parseResult.parsed_request?.amount ?? 0;
    toolArgs = {
      payee_id: parseResult.parsed_request?.payee_id,
      amount_paise: Math.round(amountRupees * 100),
      memo: parseResult.parsed_request?.memo ?? null,
    };
  }

  let executionResult: Record<string, unknown> | null = null;
  let toolPassed = true;
  let toolDetail = "";

  if (toolToExecute) {
    if (dryRun) {
      toolDetail = `Dry run: ${toolToExecute} validated but not executed against ledger.`;
      executionResult = { simulated: true, tool: toolToExecute, args: toolArgs };
    } else {
      try {
        executionResult = executeTool(bankState, toolToExecute, toolArgs);
        toolDetail = `Tool ${toolToExecute} executed successfully.`;
      } catch (err) {
        toolPassed = false;
        const msg = err instanceof ToolError ? err.message : String(err);
        toolDetail = `Tool execution failed: ${msg}`;
        pipeline.push({
          stage: "tool_execution",
          passed: false,
          detail: toolDetail,
        });

        return {
          request_id: requestId,
          timestamp,
          status: "BLOCKED",
          risk_score: Math.max(currentRisk, 40),
          threat_category: "POLICY_VIOLATION",
          explanation: `Tool execution failed: ${msg}. State remained unaltered.`,
          intent: parseResult.intent,
          parsed_request: parseResult.parsed_request,
          signals,
          policy_checks: policyChecks,
          pipeline,
          action: {
            tool: toolToExecute,
            executed: false,
            dry_run: dryRun,
            result: null,
          },
          input_fingerprint: rawFingerprint,
          engine: {
            version: ENGINE_VERSION,
            mode: llmMode,
            latency_ms: Date.now() - startTime,
          },
        };
      }
    }
  } else {
    toolDetail = "No tool execution required (query/help).";
  }

  pipeline.push({
    stage: "tool_execution",
    passed: toolPassed,
    detail: toolDetail,
  });

  const finalExplanation = toolToExecute
    ? `Request APPROVED. Safely routed to financial tool '${toolToExecute}' (${
        dryRun ? "dry run" : "executed"
      }).`
    : parseResult.intent === "HELP"
    ? "Request APPROVED. Welcome to BankSim AI Assistant! I can help you check your account balance, view recent transaction history, or transfer funds to registered payees."
    : "Request APPROVED. Validated as safe informational banking request.";

  return {
    request_id: requestId,
    timestamp,
    status: "APPROVED",
    risk_score: currentRisk,
    threat_category: "NONE",
    explanation: finalExplanation,
    intent: parseResult.intent,
    parsed_request: parseResult.parsed_request,
    signals,
    policy_checks: policyChecks,
    pipeline,
    action: {
      tool: toolToExecute,
      executed: !dryRun && Boolean(toolToExecute),
      dry_run: dryRun,
      result: executionResult,
    },
    input_fingerprint: rawFingerprint,
    engine: {
      version: ENGINE_VERSION,
      mode: llmMode,
      latency_ms: Date.now() - startTime,
    },
  };
}

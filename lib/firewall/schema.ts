/**
 * Output contract for every firewall verdict.
 * The TypeScript type and the JSON Schema below describe the SAME shape; tests
 * validate real verdicts against the JSON Schema so the two cannot drift silently.
 */

export const ENGINE_VERSION = "1.0.0";

/** Attack categories produced by the signature engine and (optionally) the semantic layer. */
export const ATTACK_CATEGORIES = [
  "PROMPT_INJECTION",
  "JAILBREAK",
  "ROLEPLAY_ATTACK",
  "MEMO_INJECTION",
  "OUTPUT_MANIPULATION",
  "AUTHORITY_IMPERSONATION",
  "SOCIAL_ENGINEERING",
  "DATA_EXFILTRATION",
  "CODE_INJECTION",
  "TOOL_HIJACKING",
  "TRANSACTION_MANIPULATION",
  "FRAUD_INDICATOR",
  "OBFUSCATION",
] as const;
export type AttackCategory = (typeof ATTACK_CATEGORIES)[number];

/** Non-attack reasons a request can be blocked. */
export const POLICY_CATEGORIES = [
  "INVALID_INPUT",
  "POLICY_VIOLATION",
  "AMBIGUOUS_REQUEST",
  "UNSUPPORTED_REQUEST",
] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

export const THREAT_CATEGORIES = ["NONE", ...ATTACK_CATEGORIES, ...POLICY_CATEGORIES] as const;
export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

export const INTENTS = [
  "BALANCE_CHECK",
  "TRANSACTION_HISTORY",
  "TRANSFER",
  "HELP",
  "MULTI_INTENT",
  "UNKNOWN",
] as const;
export type Intent = (typeof INTENTS)[number];

export const TOOL_NAMES = ["get_balance", "get_history", "transfer"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const PIPELINE_STAGES = [
  "input_contract",
  "canonicalization",
  "signature_scan",
  "intent_parse",
  "semantic_classifier",
  "risk_decision",
  "policy_engine",
  "tool_execution",
] as const;
export type PipelineStageName = (typeof PIPELINE_STAGES)[number];

export type SignalField = "message" | "memo" | "semantic";

export interface Signal {
  rule_id: string;
  category: AttackCategory;
  label: string;
  /** Rule weight in [0, 1]. */
  weight: number;
  field: SignalField;
  /** Which canonical view of the text matched (e.g. "nfkc", "leet", "decoded:base64"). */
  view: string;
  /** Short, sanitised excerpt of the matched text. */
  evidence: string;
}

export interface PolicyCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface PipelineStage {
  stage: PipelineStageName;
  passed: boolean;
  detail: string;
}

export interface ParsedRequest {
  /** Amount in rupees (2-decimal precision) or null when not applicable. */
  amount: number | null;
  currency: "INR";
  /** Display name of the resolved registered payee. */
  payee: string | null;
  payee_id: string | null;
  memo: string | null;
}

export interface Action {
  tool: ToolName | null;
  executed: boolean;
  dry_run: boolean;
  result: Record<string, unknown> | null;
}

export interface Verdict {
  request_id: string;
  timestamp: string;
  status: "APPROVED" | "BLOCKED";
  risk_score: number;
  threat_category: ThreatCategory;
  explanation: string;
  intent: Intent;
  parsed_request: ParsedRequest | null;
  signals: Signal[];
  policy_checks: PolicyCheck[];
  pipeline: PipelineStage[];
  action: Action;
  input_fingerprint: string;
  engine: {
    version: string;
    mode: "rules-only" | "rules+llm";
    latency_ms: number;
  };
}

/** JSON Schema (draft 2020-12) for {@link Verdict}. */
export const VERDICT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://banksim.local/schemas/verdict.json",
  title: "BankSim Firewall Verdict",
  type: "object",
  additionalProperties: false,
  required: [
    "request_id",
    "timestamp",
    "status",
    "risk_score",
    "threat_category",
    "explanation",
    "intent",
    "parsed_request",
    "signals",
    "policy_checks",
    "pipeline",
    "action",
    "input_fingerprint",
    "engine",
  ],
  properties: {
    request_id: { type: "string", pattern: "^req_[0-9a-f]{16}$" },
    timestamp: { type: "string", format: "date-time" },
    status: { enum: ["APPROVED", "BLOCKED"] },
    risk_score: { type: "integer", minimum: 0, maximum: 100 },
    threat_category: { enum: [...THREAT_CATEGORIES] },
    explanation: { type: "string", minLength: 1 },
    intent: { enum: [...INTENTS] },
    parsed_request: {
      oneOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["amount", "currency", "payee", "payee_id", "memo"],
          properties: {
            amount: { type: ["number", "null"] },
            currency: { const: "INR" },
            payee: { type: ["string", "null"] },
            payee_id: { type: ["string", "null"] },
            memo: { type: ["string", "null"] },
          },
        },
      ],
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rule_id", "category", "label", "weight", "field", "view", "evidence"],
        properties: {
          rule_id: { type: "string" },
          category: { enum: [...ATTACK_CATEGORIES] },
          label: { type: "string" },
          weight: { type: "number", minimum: 0, maximum: 1 },
          field: { enum: ["message", "memo", "semantic"] },
          view: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    policy_checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "passed", "detail"],
        properties: {
          id: { type: "string" },
          passed: { type: "boolean" },
          detail: { type: "string" },
        },
      },
    },
    pipeline: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stage", "passed", "detail"],
        properties: {
          stage: { enum: [...PIPELINE_STAGES] },
          passed: { type: "boolean" },
          detail: { type: "string" },
        },
      },
    },
    action: {
      type: "object",
      additionalProperties: false,
      required: ["tool", "executed", "dry_run", "result"],
      properties: {
        tool: { enum: [...TOOL_NAMES, null] },
        executed: { type: "boolean" },
        dry_run: { type: "boolean" },
        result: { type: ["object", "null"] },
      },
    },
    input_fingerprint: { type: "string", pattern: "^[0-9a-f]{64}$" },
    engine: {
      type: "object",
      additionalProperties: false,
      required: ["version", "mode", "latency_ms"],
      properties: {
        version: { type: "string" },
        mode: { enum: ["rules-only", "rules+llm"] },
        latency_ms: { type: "number", minimum: 0 },
      },
    },
  },
} as const;

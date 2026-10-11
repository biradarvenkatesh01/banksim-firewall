/**
 * [5] Decision thresholds & [6] Policy engine (policy.ts)
 * 
 * Thresholds:
 * - risk >= 50 -> BLOCKED
 * - 25-49 = grey zone -> BLOCKED unless semantic layer is enabled and confidently says benign (fail closed)
 * - risk < 25 -> proceed to policy checks
 * 
 * Policy rules:
 * - Exactly one amount for transfers
 * - Amount > 0, <= 2 decimal digits
 * - Exactly one recipient who is a verified registered payee
 * - Per-transaction limit: ₹50,000
 * - Daily limit: ₹1,00,000
 * - Sufficient account balance
 * - Single operation per request (MULTI_INTENT -> AMBIGUOUS_REQUEST)
 * - Unknown requests -> UNSUPPORTED_REQUEST
 */

import type { PolicyCheck, PolicyCategory, ThreatCategory } from "./schema";
import {
  type BankState,
  PER_TXN_LIMIT_PAISE,
  DAILY_LIMIT_PAISE,
  formatINR,
  rolloverIfNewDay,
} from "./bank";
import type { ParseResult } from "./parser";

export const RISK_HIGH_THRESHOLD = 50;
export const RISK_GREY_THRESHOLD = 25;

export interface RiskDecision {
  status: "APPROVED" | "BLOCKED";
  reason: string;
}

/**
 * Evaluates numerical risk score against security thresholds with fail-closed grey zone semantics.
 *
 * @param riskScore - Combined risk score from signature scanning (0–100).
 * @param llmVerdict - Optional semantic classifier opinion for grey-zone arbitration.
 * @returns RiskDecision containing status (APPROVED/BLOCKED) and justification.
 */
export function evaluateRiskThreshold(
  riskScore: number,
  llmVerdict?: { is_attack: boolean; confidence: number } | null
): RiskDecision {
  if (riskScore >= RISK_HIGH_THRESHOLD) {
    return {
      status: "BLOCKED",
      reason: `High risk score (${riskScore}/100) exceeds safety threshold (${RISK_HIGH_THRESHOLD}).`,
    };
  }

  if (riskScore >= RISK_GREY_THRESHOLD) {
    if (llmVerdict && !llmVerdict.is_attack && llmVerdict.confidence >= 0.8) {
      return {
        status: "APPROVED",
        reason: `Grey-zone risk score (${riskScore}) verified safe by semantic classifier (confidence ${llmVerdict.confidence}).`,
      };
    }
    return {
      status: "BLOCKED",
      reason: `Moderate risk score (${riskScore}/100) in grey zone (${RISK_GREY_THRESHOLD}-${
        RISK_HIGH_THRESHOLD - 1
      }); blocked under strict fail-closed policy.`,
    };
  }

  return {
    status: "APPROVED",
    reason: `Low risk score (${riskScore}/100) within acceptable safety bounds.`,
  };
}

export interface PolicyEvaluation {
  allowed: boolean;
  category: ThreatCategory;
  checks: PolicyCheck[];
  explanation: string;
}

/**
 * Validates banking business rules (per-txn limits, daily velocity, payee KYC, balance availability).
 *
 * @param parse - Parsed intent and arguments.
 * @param bankState - Current bank ledger state.
 * @param rawText - Original raw input string.
 * @returns PolicyEvaluation indicating whether request complies with banking guardrails.
 */
export function evaluatePolicy(
  parse: ParseResult,
  bankState: BankState,
  rawText: string
): PolicyEvaluation {
  rolloverIfNewDay(bankState);
  const checks: PolicyCheck[] = [];

  // Check 1: Multi-intent / Ambiguity
  if (parse.intent === "MULTI_INTENT" || parse.detected_intents.length > 1) {
    checks.push({
      id: "POL-SINGLE-INTENT",
      passed: false,
      detail: `Multiple intents detected (${parse.detected_intents.join(
        ", "
      )}). Only single discrete financial operations are permitted.`,
    });
    return {
      allowed: false,
      category: "AMBIGUOUS_REQUEST",
      checks,
      explanation: "Ambiguous request: multiple operations requested in a single turn.",
    };
  }
  checks.push({
    id: "POL-SINGLE-INTENT",
    passed: true,
    detail: "Single intent confirmed.",
  });

  // Check 2: Unknown intent
  if (parse.intent === "UNKNOWN") {
    checks.push({
      id: "POL-SUPPORTED-INTENT",
      passed: false,
      detail: "Intent could not be resolved to any supported banking operation.",
    });
    return {
      allowed: false,
      category: "UNSUPPORTED_REQUEST",
      checks,
      explanation: "Unsupported request: please request a balance check, transaction history, or transfer.",
    };
  }
  checks.push({
    id: "POL-SUPPORTED-INTENT",
    passed: true,
    detail: `Supported intent: ${parse.intent}.`,
  });

  // For non-transfer intents (BALANCE_CHECK, TRANSACTION_HISTORY, HELP)
  if (parse.intent === "BALANCE_CHECK" || parse.intent === "TRANSACTION_HISTORY" || parse.intent === "HELP") {
    // If amounts or extraneous payees were mentioned, could be ambiguous
    if (parse.amounts.length > 0 || parse.payee) {
      checks.push({
        id: "POL-NO-CONFLICT-ARGS",
        passed: false,
        detail: `Operation ${parse.intent} should not contain transfer parameters.`,
      });
      return {
        allowed: false,
        category: "AMBIGUOUS_REQUEST",
        checks,
        explanation: "Ambiguous request: contradictory parameters provided for read-only banking query.",
      };
    }
    return {
      allowed: true,
      category: "NONE",
      checks,
      explanation: `Policy checks passed for ${parse.intent}.`,
    };
  }

  // --- TRANSFER POLICY CHECKS ---

  // Check 3: Check for multiple or ambiguous payees
  if (parse.ambiguous_payees.length > 0) {
    checks.push({
      id: "POL-PAYEE-UNIQUE",
      passed: false,
      detail: `Ambiguous payees found: ${parse.ambiguous_payees.join(", ")}.`,
    });
    return {
      allowed: false,
      category: "AMBIGUOUS_REQUEST",
      checks,
      explanation: "Ambiguous request: multiple registered recipients matched.",
    };
  }

  // Check 4: Check if unverified / unregistered payee or raw account was specified
  const rawAccounts = rawText.match(/\b\d{9,18}\b|\b(?:a\/c|account)\s*[:#-]?\s*\d+\b/i);
  if (!parse.payee) {
    if (rawAccounts) {
      checks.push({
        id: "POL-PAYEE-REGISTERED",
        passed: false,
        detail: `Direct transfer to unregistered raw account numbers (${rawAccounts[0]}) is forbidden.`,
      });
      return {
        allowed: false,
        category: "POLICY_VIOLATION",
        checks,
        explanation: "Policy violation: transfers are only allowed to registered, verified beneficiaries.",
      };
    }
    checks.push({
      id: "POL-PAYEE-PRESENT",
      passed: false,
      detail: "No recipient specified for transfer.",
    });
    return {
      allowed: false,
      category: "AMBIGUOUS_REQUEST",
      checks,
      explanation: "Ambiguous request: transfer recipient not specified or not recognized.",
    };
  }
  checks.push({
    id: "POL-PAYEE-VERIFIED",
    passed: true,
    detail: `Verified payee: ${parse.payee.name} (${parse.payee.account_masked}).`,
  });

  // Check 5: Exactly one valid amount
  if (parse.invalid_amounts.length > 0) {
    checks.push({
      id: "POL-AMOUNT-VALID",
      passed: false,
      detail: `Invalid amount format or negative value: ${parse.invalid_amounts.join(", ")}.`,
    });
    return {
      allowed: false,
      category: "POLICY_VIOLATION",
      checks,
      explanation: "Policy violation: negative amounts or invalid currency formats are prohibited.",
    };
  }

  if (parse.amounts.length === 0) {
    checks.push({
      id: "POL-AMOUNT-PRESENT",
      passed: false,
      detail: "No transfer amount specified.",
    });
    return {
      allowed: false,
      category: "AMBIGUOUS_REQUEST",
      checks,
      explanation: "Ambiguous request: transfer amount missing.",
    };
  }

  if (parse.amounts.length > 1) {
    checks.push({
      id: "POL-AMOUNT-UNIQUE",
      passed: false,
      detail: `Multiple amounts specified: ${parse.amounts.join(", ")}.`,
    });
    return {
      allowed: false,
      category: "AMBIGUOUS_REQUEST",
      checks,
      explanation: "Ambiguous request: multiple transfer amounts found in a single instruction.",
    };
  }

  const amountRupees = parse.amounts[0]!;
  const amountPaise = Math.round(amountRupees * 100);

  if (amountPaise <= 0) {
    checks.push({
      id: "POL-AMOUNT-POSITIVE",
      passed: false,
      detail: `Amount must be strictly greater than zero (received ${amountRupees}).`,
    });
    return {
      allowed: false,
      category: "POLICY_VIOLATION",
      checks,
      explanation: "Policy violation: amount must be strictly greater than zero.",
    };
  }
  checks.push({
    id: "POL-AMOUNT-POSITIVE",
    passed: true,
    detail: `Valid transfer amount: ₹${amountRupees}.`,
  });

  // Check 6: Per-transaction limit (₹50,000)
  if (amountPaise > PER_TXN_LIMIT_PAISE) {
    checks.push({
      id: "POL-LIMIT-PER-TXN",
      passed: false,
      detail: `Transfer amount ₹${amountRupees} exceeds per-transaction limit of ${formatINR(
        PER_TXN_LIMIT_PAISE
      )}.`,
    });
    return {
      allowed: false,
      category: "POLICY_VIOLATION",
      checks,
      explanation: `Policy violation: transfer amount exceeds maximum per-transaction limit (${formatINR(
        PER_TXN_LIMIT_PAISE
      )}).`,
    };
  }
  checks.push({
    id: "POL-LIMIT-PER-TXN",
    passed: true,
    detail: `Within per-transaction limit (${formatINR(PER_TXN_LIMIT_PAISE)}).`,
  });

  // Check 7: Daily limit (₹1,00,000)
  if (bankState.daily_transferred_paise + amountPaise > DAILY_LIMIT_PAISE) {
    const remaining = DAILY_LIMIT_PAISE - bankState.daily_transferred_paise;
    checks.push({
      id: "POL-LIMIT-DAILY",
      passed: false,
      detail: `Cumulative daily transfers (${formatINR(
        bankState.daily_transferred_paise + amountPaise
      )}) exceed daily cap (${formatINR(DAILY_LIMIT_PAISE)}). Remaining today: ${formatINR(
        remaining
      )}.`,
    });
    return {
      allowed: false,
      category: "POLICY_VIOLATION",
      checks,
      explanation: `Policy violation: transfer exceeds daily limit. Remaining limit for today is ${formatINR(
        remaining
      )}.`,
    };
  }
  checks.push({
    id: "POL-LIMIT-DAILY",
    passed: true,
    detail: `Within daily limit (${formatINR(DAILY_LIMIT_PAISE)}).`,
  });

  // Check 8: Balance sufficiency
  if (amountPaise > bankState.balance_paise) {
    checks.push({
      id: "POL-FUNDS-SUFFICIENT",
      passed: false,
      detail: `Transfer amount ₹${amountRupees} exceeds current balance of ${formatINR(
        bankState.balance_paise
      )}.`,
    });
    return {
      allowed: false,
      category: "POLICY_VIOLATION",
      checks,
      explanation: `Policy violation: insufficient funds in account (${formatINR(
        bankState.balance_paise
      )} available).`,
    };
  }
  checks.push({
    id: "POL-FUNDS-SUFFICIENT",
    passed: true,
    detail: `Sufficient balance available (${formatINR(bankState.balance_paise)}).`,
  });

  return {
    allowed: true,
    category: "NONE",
    checks,
    explanation: "All financial policy guardrails passed.",
  };
}

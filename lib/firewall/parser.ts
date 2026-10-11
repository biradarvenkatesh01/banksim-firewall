/**
 * [3] Intent parser (parser.ts)
 * Deterministic grammar on normalized text.
 * Intents: BALANCE_CHECK | TRANSACTION_HISTORY | TRANSFER | HELP | MULTI_INTENT | UNKNOWN
 * 
 * Extracts:
 * - Amount in INR (supports ₹, Rs, INR, rupees, "2k", "1.5 lakh", Indian digit grouping "2,00,000", decimals, negatives)
 * - Ignores account numbers (9+ digits or after "account/a/c/ending")
 * - Recipient matching against registered payee aliases (PAYEES)
 * - Inline memo ("... memo: <text>")
 * - Hinglish verbs ("rahul ko 500 bhejo", "balance batao", "paise transfer karo")
 * 
 * This parser is the ONLY component allowed to produce tool arguments.
 */

import type { Intent, ParsedRequest } from "./schema";
import { PAYEES, type Payee } from "./bank";

export interface ParseCandidate {
  raw: string;
  value: number; // in rupees
  index: number;
}

export interface ParseResult {
  intent: Intent;
  parsed_request: ParsedRequest | null;
  amounts: number[];
  invalid_amounts: string[];
  payee: Payee | null;
  ambiguous_payees: string[];
  inline_memo: string | null;
  detected_intents: Intent[];
}

/**
 * Extracts inline memo if present at the end or separated by "memo:" / "for:".
 * E.g., "Transfer 500 to Rahul memo: dinner with friends"
 */
export function extractInlineMemo(text: string): { cleanText: string; inlineMemo: string | null } {
  const memoMatch = /(?:^|\s)(?:memo|for|note|reason)\s*[:=-]\s*(.+)$/i.exec(text);
  if (memoMatch && memoMatch[1]) {
    const inlineMemo = memoMatch[1].trim();
    const cleanText = text.slice(0, memoMatch.index).trim();
    return { cleanText, inlineMemo };
  }
  return { cleanText: text, inlineMemo: null };
}

/**
 * Extract numbers that represent account numbers to exclude them from amount parsing.
 */
function maskAccountNumbers(text: string): string {
  // 1. Explicit account indicators: "a/c 123456", "account 12345", "acc no 1234", "ending in 4521"
  let masked = text.replace(
    /\b(?:account|a\/c|acc|ac|acct|ending(?:\s+in)?)\s*(?:no\.?|num(?:ber)?\.?)?\s*[:#-]?\s*(\d+)\b/gi,
    (match) => " ".repeat(match.length)
  );

  // 2. Any isolated long number sequences of 9+ digits (standard Indian bank accounts / cards)
  masked = masked.replace(/\b\d{9,18}\b/g, (match) => " ".repeat(match.length));

  return masked;
}

/**
 * Parse Indian amounts from text.
 * Handles:
 * - ₹500, Rs. 500, INR 500, 500 rupees, 500 bucks
 * - 2k, 2.5k, 1 lakh, 1.5 lakhs, 2 lac, 2 lacs, 1 crore
 * - Commas: 2,00,000 or 50,000.50
 * - Negatives: -500, -₹50
 */
export function extractAmounts(rawText: string): { amounts: number[]; invalid: string[] } {
  const text = maskAccountNumbers(rawText);
  const amounts: number[] = [];
  const invalid: string[] = [];

  // Patterns for amounts
  // Match prefix symbol/currency or suffix currency/units
  const amountRegex = /(?:(?<prefix>[-+]?\s*(?:₹|rs\.?|inr))\s*)?(?<num>[-+]?\d[\d,]*(?:\.\d+)?)\s*(?<multiplier>[kK]|lakhs?|lacs?|crores?|cr)?\s*(?<suffix>rupees?|rs\.?|inr|paise|bucks)?\b/gi;

  let match: RegExpExecArray | null;
  while ((match = amountRegex.exec(text)) !== null) {
    const prefix = match.groups?.prefix?.trim() ?? "";
    const numStr = match.groups?.num?.replace(/,/g, "") ?? "";
    const multiplier = match.groups?.multiplier?.toLowerCase() ?? "";
    const suffix = match.groups?.suffix?.toLowerCase() ?? "";

    // If there is no currency prefix, no multiplier, and no suffix, only treat as amount
    // if preceded or followed by transaction words (send, transfer, pay, bhejo, etc.)
    const hasExplicitCurrency = Boolean(prefix || suffix || multiplier);
    const parsedNum = parseFloat(numStr);

    if (isNaN(parsedNum)) continue;

    const fullMatch = match[0].trim();
    // Negative detection
    const isNegative = fullMatch.startsWith("-") || numStr.startsWith("-") || prefix.startsWith("-");

    if (!hasExplicitCurrency) {
      // Check surrounding context (within 25 chars before or after)
      const start = Math.max(0, match.index - 25);
      const end = Math.min(text.length, match.index + fullMatch.length + 25);
      const surrounding = text.slice(start, end).toLowerCase();

      const txContext = /\b(?:transfer|send|pay|bhej\w*|de\s+do|dena|credit|deposit|give|charges?|amount|daal\w*)\b/.test(
        surrounding
      );
      if (!txContext) {
        continue;
      }
    }

    let multiplierVal = 1;
    if (multiplier === "k") multiplierVal = 1_000;
    else if (multiplier.startsWith("lakh") || multiplier.startsWith("lac")) multiplierVal = 1_00_000;
    else if (multiplier.startsWith("crore") || multiplier === "cr") multiplierVal = 1_00_00_000;

    let finalAmount = Math.abs(parsedNum) * multiplierVal;
    if (suffix === "paise") {
      finalAmount = finalAmount / 100;
    }

    // Two decimal places precision in rupees
    finalAmount = Math.round(finalAmount * 100) / 100;

    if (isNegative) {
      invalid.push(`-${finalAmount}`);
    } else if (numStr.includes(".") && (numStr.split(".")[1]?.length ?? 0) > 2) {
      invalid.push(`Invalid decimals: ${numStr}`);
    } else {
      amounts.push(finalAmount);
    }
  }

  return { amounts, invalid };
}

/**
 * Resolve registered payee by alias matching.
 */
export function resolvePayee(text: string): { payee: Payee | null; ambiguous: string[] } {
  const lower = text.toLowerCase();
  const matchedPayees: Payee[] = [];

  for (const payee of PAYEES) {
    for (const alias of payee.aliases) {
      // Word boundary match
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?:^|\\b|\\s)${escaped}(?:\\b|\\s|$)`, "i");
      if (regex.test(lower)) {
        if (!matchedPayees.some((p) => p.id === payee.id)) {
          matchedPayees.push(payee);
        }
        break;
      }
    }
  }

  if (matchedPayees.length === 1) {
    return { payee: matchedPayees[0]!, ambiguous: [] };
  }
  if (matchedPayees.length > 1) {
    return {
      payee: null,
      ambiguous: matchedPayees.map((p) => p.name),
    };
  }

  return { payee: null, ambiguous: [] };
}

/**
 * Deterministically parses banking intents (balance, transfer, history, help) and extracts arguments via strict grammar.
 *
 * @param rawInput - Raw or normalized user input text.
 * @param explicitMemo - Optional transaction memo field.
 * @returns ParseResult containing candidate tool invocation, intent classification, and any grammar violations.
 */
export function parseIntent(rawInput: string, explicitMemo?: string | null): ParseResult {
  const { cleanText, inlineMemo } = extractInlineMemo(rawInput);
  const text = cleanText.toLowerCase();

  const effectiveMemo = explicitMemo || inlineMemo || null;

  const detectedIntents: Intent[] = [];

  // 1. Balance check patterns
  const isBalance =
    /\b(?:balance|how much (?:money|cash|balance)|available funds|check balance|account balance|kitna balance|kitna paisa|kitne paise|balance batao|balance check|balance dikhao)\b/i.test(
      text
    );
  if (isBalance) detectedIntents.push("BALANCE_CHECK");

  // 2. Transaction history patterns
  const isHistory =
    /\b(?:history|transactions?|passbook|statement|mini statement|past payments|previous transactions|last transactions?|recent\s+(?:payments?|transactions?)|kisko bheja|kisko transfer kiya)\b/i.test(
      text
    );
  if (isHistory) detectedIntents.push("TRANSACTION_HISTORY");

  // 3. Transfer patterns
  const isTransfer =
    /\b(?:transfer|send|pay|wire|credit|bhejo|bhej do|transfer karo|bhejna hai|pay karo|paise bhejo)\b/i.test(
      text
    );
  if (isTransfer) detectedIntents.push("TRANSFER");

  // 4. Help and greeting patterns (standalone or query)
  const isHelp =
    /\b(?:help|support|what can you do|how to use|how does this work|commands|options|kaise use kare|madad|kya kar sakte ho|operations|capabilities)\b/i.test(
      text
    );
  const isGreeting =
    /^(?:\s*|\b)(?:hello|hi|hey|namaste|pranam|greetings|good\s+(?:morning|afternoon|evening))(?:\s*|\b|[!?.]*)$/i.test(
      text.trim()
    );

  const { amounts, invalid } = extractAmounts(cleanText);
  const { payee, ambiguous } = resolvePayee(cleanText);

  // If no explicit transfer verb, but amount and payee exist, infer transfer
  if (detectedIntents.length === 0 && amounts.length > 0 && payee) {
    detectedIntents.push("TRANSFER");
  }

  // Greeting/help is only added as an intent if no financial operation was requested
  if (detectedIntents.length === 0 && (isHelp || isGreeting)) {
    detectedIntents.push("HELP");
  }

  // Intent classification
  let finalIntent: Intent = "UNKNOWN";
  if (detectedIntents.length > 1) {
    finalIntent = "MULTI_INTENT";
  } else if (detectedIntents.length === 1) {
    finalIntent = detectedIntents[0]!;
  }

  let parsedRequest: ParsedRequest | null = null;
  if (finalIntent === "TRANSFER") {
    parsedRequest = {
      amount: amounts[0] ?? null,
      currency: "INR",
      payee: payee ? payee.name : null,
      payee_id: payee ? payee.id : null,
      memo: effectiveMemo,
    };
  }

  return {
    intent: finalIntent,
    parsed_request: parsedRequest,
    amounts,
    invalid_amounts: invalid,
    payee,
    ambiguous_payees: ambiguous,
    inline_memo: effectiveMemo,
    detected_intents: detectedIntents,
  };
}

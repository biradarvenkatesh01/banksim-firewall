/**
 * [0] Input contract. Anything that is not a well-formed request is rejected
 * before a single detector runs.
 */
export const MESSAGE_MAX_LENGTH = 500;
export const MEMO_MAX_LENGTH = 140;

export interface FirewallInput {
  message: string;
  memo?: string | null;
}

export type ContractResult =
  | { ok: true; message: string; memo: string | null }
  | { ok: false; reason: string };

/** Length in Unicode code points (so emoji/Devanagari aren't double-counted). */
export function codePointLength(s: string): number {
  return Array.from(s).length;
}

export function checkContract(input: unknown): ContractResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, reason: "Request must be an object with a 'message' field." };
  }
  const { message, memo } = input as Record<string, unknown>;

  if (typeof message !== "string") {
    return { ok: false, reason: "'message' must be a string." };
  }
  if (message.trim().length === 0) {
    return { ok: false, reason: "'message' must not be empty." };
  }
  if (codePointLength(message) > MESSAGE_MAX_LENGTH) {
    return { ok: false, reason: `'message' exceeds ${MESSAGE_MAX_LENGTH} characters.` };
  }

  let cleanMemo: string | null = null;
  if (memo !== undefined && memo !== null) {
    if (typeof memo !== "string") {
      return { ok: false, reason: "'memo' must be a string when provided." };
    }
    if (codePointLength(memo) > MEMO_MAX_LENGTH) {
      return { ok: false, reason: `'memo' exceeds ${MEMO_MAX_LENGTH} characters.` };
    }
    cleanMemo = memo.trim().length === 0 ? null : memo;
  }

  return { ok: true, message, memo: cleanMemo };
}

/**
 * API Request Body Validation Helpers
 * Validates types, lengths, allowed keys, and strictly rejects unknown properties.
 */

export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export interface ValidationError {
  ok: false;
  error: string;
  status: 400 | 413 | 422;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Checks if value is a plain object (not null, not array)
 */
export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

/**
 * Ensures object only contains allowed keys.
 */
export function assertAllowedKeys(
  obj: Record<string, unknown>,
  allowedKeys: readonly string[]
): { ok: true } | { ok: false; unknownKey: string } {
  const allowedSet = new Set(allowedKeys);
  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) {
      return { ok: false, unknownKey: key };
    }
  }
  return { ok: true };
}

export interface AnalyzePayload {
  message: unknown;
  memo?: string | null;
  dry_run?: boolean;
}

export function validateAnalyzeRequest(body: unknown): ValidationResult<AnalyzePayload> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      error: "Request body must be a JSON object containing a 'message' property.",
      status: 400,
    };
  }

  const allowed = ["message", "memo", "dry_run", "dryRun"] as const;
  const keyCheck = assertAllowedKeys(body, allowed);
  if (!keyCheck.ok) {
    return {
      ok: false,
      error: `Unknown property '${keyCheck.unknownKey}' in request body.`,
      status: 400,
    };
  }

  if (!("message" in body)) {
    return {
      ok: false,
      error: "Missing required property 'message'.",
      status: 400,
    };
  }

  if (body.memo !== undefined && body.memo !== null && typeof body.memo !== "string") {
    return {
      ok: false,
      error: "'memo' must be a string or null if provided.",
      status: 400,
    };
  }

  const dryRunValue = body.dry_run !== undefined ? body.dry_run : body.dryRun;
  if (dryRunValue !== undefined && typeof dryRunValue !== "boolean") {
    return {
      ok: false,
      error: "'dry_run' must be a boolean if provided.",
      status: 400,
    };
  }

  return {
    ok: true,
    data: {
      message: body.message,
      memo: (body.memo as string | null) ?? null,
      dry_run: Boolean(dryRunValue),
    },
  };
}

export interface StressPayload {
  message: string;
  memo?: string | null;
}

export function validateStressRequest(body: unknown): ValidationResult<StressPayload> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      error: "Request body must be a JSON object containing a 'message' property.",
      status: 400,
    };
  }

  const allowed = ["message", "memo"] as const;
  const keyCheck = assertAllowedKeys(body, allowed);
  if (!keyCheck.ok) {
    return {
      ok: false,
      error: `Unknown property '${keyCheck.unknownKey}' in request body.`,
      status: 400,
    };
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return {
      ok: false,
      error: "'message' must be a non-empty string.",
      status: 400,
    };
  }

  if (body.memo !== undefined && body.memo !== null && typeof body.memo !== "string") {
    return {
      ok: false,
      error: "'memo' must be a string or null if provided.",
      status: 400,
    };
  }

  return {
    ok: true,
    data: {
      message: body.message,
      memo: (body.memo as string | null) ?? null,
    },
  };
}

export function validateEmptyBody(body: unknown): ValidationResult<Record<string, never>> {
  if (body === undefined || body === null || body === "") {
    return { ok: true, data: {} };
  }
  if (!isPlainObject(body)) {
    return {
      ok: false,
      error: "Request body must be empty or a valid JSON object.",
      status: 400,
    };
  }
  const keys = Object.keys(body);
  if (keys.length > 0) {
    return {
      ok: false,
      error: `Unexpected property '${keys[0]}' in request body.`,
      status: 400,
    };
  }
  return { ok: true, data: {} };
}

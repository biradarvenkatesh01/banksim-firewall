import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/firewall";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditEvent } from "@/lib/firewall/audit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024; // 8 KB

export async function POST(req: NextRequest) {
  // 1. Rate limiting check
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const limit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before making further requests.",
        retry_after_ms: limit.resetInMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.resetInMs / 1000)),
        },
      }
    );
  }

  // 2. Body size check
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error: `Payload too large. Maximum allowed size is ${MAX_BODY_BYTES} bytes.`,
      },
      { status: 413 }
    );
  }

  // 3. JSON parsing
  let body: unknown;
  try {
    const rawText = await req.text();
    if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: `Payload too large. Maximum allowed size is ${MAX_BODY_BYTES} bytes.`,
        },
        { status: 413 }
      );
    }
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      {
        error: "Malformed JSON payload.",
      },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      {
        error: "Request body must be a JSON object containing a 'message' property.",
      },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;
  const message = typeof payload.message === "string" ? payload.message : "";
  const memo = typeof payload.memo === "string" ? payload.memo : null;
  const dryRun = Boolean(payload.dry_run);

  try {
    const verdict = await analyze(
      { message, memo },
      { dryRun }
    );

    // Record event in bounded audit store (F1 & F4)
    const stoppingStage =
      verdict.status === "BLOCKED"
        ? verdict.pipeline.find((p) => !p.passed)?.stage || "unknown"
        : "none";

    recordAuditEvent({
      id: verdict.request_id,
      timestamp: verdict.timestamp,
      status: verdict.status,
      risk_score: verdict.risk_score,
      threat_category: verdict.threat_category,
      input_excerpt: (message + (memo ? ` [memo: ${memo}]` : "")).slice(0, 100),
      message,
      memo,
      stopping_stage: stoppingStage,
      latency_ms: verdict.engine.latency_ms,
      verdict,
    });

    return NextResponse.json(verdict, {
      status: 200,
      headers: {
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Internal firewall analysis error.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

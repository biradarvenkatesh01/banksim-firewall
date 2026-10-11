import { NextRequest, NextResponse } from "next/server";
import { runStressTest } from "@/lib/firewall/stress";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateStressRequest } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const limit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 30 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before running further stress tests." },
      { status: 429 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }

    const validation = validateStressRequest(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { message, memo } = validation.data;
    const report = await runStressTest(message, memo ?? null);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Stress test execution failed.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

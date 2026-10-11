import { NextRequest, NextResponse } from "next/server";
import { runStressTest } from "@/lib/firewall/stress";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message : "";
    const memo = typeof body?.memo === "string" ? body.memo : null;

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Message must be a non-empty string." },
        { status: 400 }
      );
    }

    const report = await runStressTest(message, memo);
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

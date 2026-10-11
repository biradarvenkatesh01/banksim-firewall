import { NextResponse } from "next/server";
import { ENGINE_VERSION } from "@/lib/firewall/schema";
import { RISK_HIGH_THRESHOLD, RISK_GREY_THRESHOLD } from "@/lib/firewall/policy";
import { PER_TXN_LIMIT_PAISE, DAILY_LIMIT_PAISE } from "@/lib/firewall/bank";

export const runtime = "nodejs";

export async function GET() {
  const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
  return NextResponse.json(
    {
      status: "healthy",
      engine: {
        version: ENGINE_VERSION,
        mode: hasGroq ? "rules+llm" : "rules-only",
        llm_configured: hasGroq,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      },
      thresholds: {
        block_high_risk: RISK_HIGH_THRESHOLD,
        grey_zone: `${RISK_GREY_THRESHOLD}-${RISK_HIGH_THRESHOLD - 1}`,
        fail_closed: true,
      },
      limits: {
        per_transaction_rupees: PER_TXN_LIMIT_PAISE / 100,
        daily_rupees: DAILY_LIMIT_PAISE / 100,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

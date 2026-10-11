import { NextRequest, NextResponse } from "next/server";
import { resetSharedState, accountSnapshot } from "@/lib/firewall/bank";
import { clearAuditStore } from "@/lib/firewall/audit";
import { validateEmptyBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req?: NextRequest) {
  if (req) {
    try {
      const text = await req.text();
      if (text.trim()) {
        const json = JSON.parse(text);
        const valid = validateEmptyBody(json);
        if (!valid.ok) {
          return NextResponse.json({ error: valid.error }, { status: valid.status });
        }
      }
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }
  }

  const state = resetSharedState();
  clearAuditStore();
  const snapshot = accountSnapshot(state);
  return NextResponse.json(
    {
      success: true,
      message: "Mock ledger successfully reset to default balance ₹85,000.",
      account: snapshot,
    },
    { status: 200 }
  );
}

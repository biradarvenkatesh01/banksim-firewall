import { NextResponse } from "next/server";
import { resetSharedState, accountSnapshot } from "@/lib/firewall/bank";

export const runtime = "nodejs";

export async function POST() {
  const state = resetSharedState();
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

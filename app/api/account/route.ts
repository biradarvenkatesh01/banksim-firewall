import { NextResponse } from "next/server";
import { getSharedState, accountSnapshot } from "@/lib/firewall/bank";

export const runtime = "nodejs";

export async function GET() {
  const state = getSharedState();
  const snapshot = accountSnapshot(state);
  return NextResponse.json(snapshot, { status: 200 });
}

import { NextResponse } from "next/server";
import {
  getAuditEvents,
  getThreatFeed,
  getAuditAnalytics,
  clearAuditStore,
} from "@/lib/firewall/audit";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      events: getAuditEvents(),
      threat_feed: getThreatFeed(),
      analytics: getAuditAnalytics(),
    },
    { status: 200 }
  );
}

export async function DELETE() {
  clearAuditStore();
  return NextResponse.json({ success: true, message: "Audit store cleared." });
}

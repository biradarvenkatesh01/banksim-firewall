/**
 * In-memory bounded audit store for BankSim.
 * Bounded to exactly 100 events (FIFO drop oldest).
 * Records both APPROVED and BLOCKED requests for session analytics and threat feed.
 */
import type { Verdict, ThreatCategory } from "./schema";

export interface AuditEvent {
  id: string; // request_id
  timestamp: string;
  status: "APPROVED" | "BLOCKED";
  risk_score: number;
  threat_category: ThreatCategory;
  input_excerpt: string;
  message: string;
  memo: string | null;
  stopping_stage: string;
  latency_ms: number;
  verdict: Verdict;
}

export interface AuditAnalytics {
  total: number;
  blocked: number;
  approved: number;
  block_rate_pct: number;
  avg_latency_ms: number;
  category_counts: Record<string, number>;
}

export const AUDIT_MAX_CAPACITY = 100;

interface AuditStoreHolder {
  __banksimAuditStore?: AuditEvent[];
}

const globalForAudit = globalThis as unknown as AuditStoreHolder;

function getStore(): AuditEvent[] {
  if (!globalForAudit.__banksimAuditStore) {
    globalForAudit.__banksimAuditStore = [];
  }
  return globalForAudit.__banksimAuditStore;
}

export function recordAuditEvent(event: AuditEvent): void {
  const store = getStore();
  // Newest first
  store.unshift(event);
  if (store.length > AUDIT_MAX_CAPACITY) {
    store.length = AUDIT_MAX_CAPACITY;
  }
}

export function getAuditEvents(): AuditEvent[] {
  return [...getStore()];
}

export function getThreatFeed(): AuditEvent[] {
  return getStore().filter((e) => e.status === "BLOCKED");
}

export function clearAuditStore(): void {
  globalForAudit.__banksimAuditStore = [];
}

export function getAuditAnalytics(): AuditAnalytics {
  const events = getStore();
  const total = events.length;
  if (total === 0) {
    return {
      total: 0,
      blocked: 0,
      approved: 0,
      block_rate_pct: 0,
      avg_latency_ms: 0,
      category_counts: {},
    };
  }
  let blocked = 0;
  let approved = 0;
  let latencySum = 0;
  const categoryCounts: Record<string, number> = {};

  for (const ev of events) {
    if (ev.status === "BLOCKED") blocked++;
    else approved++;
    latencySum += ev.latency_ms;
    if (ev.threat_category && ev.threat_category !== "NONE") {
      categoryCounts[ev.threat_category] = (categoryCounts[ev.threat_category] ?? 0) + 1;
    }
  }

  return {
    total,
    blocked,
    approved,
    block_rate_pct: Math.round((blocked / total) * 100),
    avg_latency_ms: Math.round(latencySum / total),
    category_counts: categoryCounts,
  };
}

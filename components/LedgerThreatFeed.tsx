"use client";

import React from "react";
import type { AuditEvent, AuditAnalytics } from "../lib/firewall/audit";
import type { Verdict } from "../lib/firewall/schema";
import { CountUp } from "./CountUp";
import { PixelWarning, PixelCoin, PixelCheck } from "./PixelIcons";

interface LedgerThreatFeedProps {
  bankState: any;
  auditData: {
    events: AuditEvent[];
    threat_feed: AuditEvent[];
    analytics: AuditAnalytics;
  } | null;
  onSelectVerdict: (verdict: Verdict) => void;
}

export function LedgerThreatFeed({
  bankState,
  auditData,
  onSelectVerdict,
}: LedgerThreatFeedProps) {
  const transactions = bankState?.transactions ?? [];
  const threatFeed = auditData?.threat_feed ?? [];
  const analytics = auditData?.analytics ?? {
    total: 0,
    blocked: 0,
    approved: 0,
    block_rate_pct: 0,
    avg_latency_ms: 0,
    category_counts: {},
  };

  const handleExportAudit = () => {
    if (!auditData?.events || auditData.events.length === 0) return;
    const sanitizedEvents = auditData.events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      status: e.status,
      risk_score: e.risk_score,
      threat_category: e.threat_category,
      input_excerpt: e.input_excerpt,
      message: e.message,
      memo: e.memo,
      stopping_stage: e.stopping_stage,
      latency_ms: e.latency_ms,
      verdict: {
        request_id: e.verdict.request_id,
        timestamp: e.verdict.timestamp,
        status: e.verdict.status,
        risk_score: e.verdict.risk_score,
        threat_category: e.verdict.threat_category,
        explanation: e.verdict.explanation,
        intent: e.verdict.intent,
        action: e.verdict.action,
        engine: e.verdict.engine,
      },
    }));

    const blob = new Blob([JSON.stringify(sanitizedEvents, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banksim-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute category bar widths for F4 Session Analytics
  const categoryEntries = Object.entries(analytics.category_counts);
  const totalCatHits = categoryEntries.reduce((sum, [, count]) => sum + count, 0);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("en-IN", { hour12: false });
    } catch {
      return ts.slice(11, 19);
    }
  };

  return (
    <section id="ledger" className="section reveal-fadeup" style={{ borderTop: "1px solid var(--rule)" }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ marginBottom: "28px" }}>
          <div className="section-eyebrow">Auditable Financial Ledger & Telemetry</div>
          <h2 className="section-title">Live Ledger & Threat Stream</h2>
          <p className="section-desc">
            Direct, observable accounting: verify that only verified, non-hostile prompts mutate
            the core ledger, while adversarial attempts are captured in the server-bounded audit buffer.
          </p>
        </div>

        {/* F4: Session Analytics Strip */}
        <div
          style={{
            marginBottom: "28px",
            padding: "16px 20px",
            backgroundColor: "var(--paper-raised)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Session Telemetry Strip
            </div>
            <div
              style={{
                display: "flex",
                gap: "24px",
                alignItems: "baseline",
                flexWrap: "wrap",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--ink-3)" }}>Analyzed: </span>
                <strong style={{ color: "var(--ink)" }}>
                  <CountUp value={analytics.total} duration={400} />
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Blocked: </span>
                <strong style={{ color: "var(--block)" }}>
                  <CountUp value={analytics.blocked} duration={400} />
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Approved: </span>
                <strong style={{ color: "var(--approve)" }}>
                  <CountUp value={analytics.approved} duration={400} />
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Block Rate: </span>
                <strong style={{ color: "var(--ink)" }}>
                  <CountUp value={analytics.block_rate_pct} duration={400} />%
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>Avg Latency: </span>
                <strong style={{ color: "var(--ink)" }}>
                  <CountUp value={analytics.avg_latency_ms} duration={400} /> ms
                </strong>
              </div>
            </div>
          </div>

          {/* Tiny horizontal proportional category bar with stepped pixel blocks */}
          {totalCatHits > 0 && (
            <div>
              <div
                className="pixel-bar-mask"
                style={{
                  height: "8px",
                  display: "flex",
                  overflow: "hidden",
                  backgroundColor: "var(--rule)",
                  marginBottom: "8px",
                }}
              >
                {categoryEntries.map(([cat, count], idx) => {
                  const pct = Math.max(2, (count / totalCatHits) * 100);
                  const colors = [
                    "var(--block)",
                    "var(--amber)",
                    "var(--navy)",
                    "#6b21a8",
                    "#0f766e",
                  ];
                  return (
                    <div
                      key={cat}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors[idx % colors.length],
                        height: "100%",
                      }}
                      title={`${cat}: ${count} (${Math.round((count / totalCatHits) * 100)}%)`}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-3)",
                }}
              >
                {categoryEntries.map(([cat, count]) => (
                  <span key={cat}>
                    {cat}: <strong style={{ color: "var(--ink-2)" }}>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Two-Column Grid: Ledger (Left 6 cols) + Threat Feed (Right 6 cols) */}
        <div className="grid-12" style={{ gap: "24px" }}>
          {/* Left Column: Bank Ledger */}
          <div
            style={{
              gridColumn: "span 6",
              backgroundColor: "var(--paper-raised)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "16px",
              }}
            >
              <div>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Core Banking Record
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  Account Ledger
                </h3>
              </div>
              <span
                className="font-mono"
                style={{ fontSize: "11px", color: "var(--ink-3)" }}
              >
                {transactions.length} entries · newest first
              </span>
            </div>

            <div style={{ overflowX: "auto", flex: 1 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <thead>
                  <tr
                    className="font-pixel"
                    style={{
                      borderBottom: "1px solid var(--rule)",
                      color: "var(--ink-3)",
                      textAlign: "left",
                      fontSize: "10px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "8px 6px" }}>Time</th>
                    <th style={{ padding: "8px 6px" }}>Counterparty</th>
                    <th style={{ padding: "8px 6px" }}>Memo</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Balance</th>
                    <th style={{ padding: "8px 6px" }}>Auth ID</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => {
                    const isCredit = tx.type === "CREDIT";
                    return (
                      <tr
                        key={tx.id}
                        className="interactive-table-row"
                        style={{
                          borderBottom: "1px solid var(--rule)",
                          backgroundColor: "transparent",
                        }}
                      >
                        <td style={{ padding: "8px 6px", color: "var(--ink-3)" }}>
                          {formatTime(tx.time)}
                        </td>
                        <td style={{ padding: "8px 6px", fontWeight: 500, color: "var(--ink)" }}>
                          {tx.counterparty}
                        </td>
                        <td
                          style={{
                            padding: "8px 6px",
                            color: "var(--ink-3)",
                            maxWidth: "120px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={tx.memo || "None"}
                        >
                          {tx.memo || "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 6px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: isCredit ? "var(--approve)" : "var(--ink)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              justifyContent: "flex-end",
                            }}
                          >
                            {isCredit ? (
                              <PixelCheck size={10} style={{ color: "var(--approve)" }} />
                            ) : (
                              <PixelCoin size={10} style={{ color: "var(--ink-3)" }} />
                            )}
                            {tx.amount_display}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "8px 6px",
                            textAlign: "right",
                            color: "var(--ink-2)",
                          }}
                        >
                          {tx.running_balance_display}
                        </td>
                        <td
                          style={{
                            padding: "8px 6px",
                            fontSize: "10px",
                            color: "var(--ink-3)",
                          }}
                        >
                          {tx.request_id ? tx.request_id.slice(0, 12) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: "24px 6px", textAlign: "center", color: "var(--ink-3)" }}
                      >
                        No ledger transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Threat Feed */}
          <div
            style={{
              gridColumn: "span 6",
              backgroundColor: "var(--paper-raised)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "11px",
                    color: "var(--block)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                >
                  Live Interception Feed
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  Threat Feed
                </h3>
              </div>

              {/* F5: Export audit button */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  className="font-mono"
                  style={{ fontSize: "11px", color: "var(--ink-3)" }}
                >
                  {threatFeed.length} blocked
                </span>
                <button
                  type="button"
                  onClick={handleExportAudit}
                  disabled={!auditData?.events || auditData.events.length === 0}
                  className="btn-link font-mono"
                  style={{
                    fontSize: "12px",
                    color: !auditData?.events || auditData.events.length === 0 ? "var(--ink-4)" : "var(--navy)",
                    cursor: !auditData?.events || auditData.events.length === 0 ? "default" : "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Export audit (JSON)
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", flex: 1 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <thead>
                  <tr
                    className="font-pixel"
                    style={{
                      borderBottom: "1px solid var(--rule)",
                      color: "var(--ink-3)",
                      textAlign: "left",
                      fontSize: "10px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "8px 6px" }}>Time</th>
                    <th style={{ padding: "8px 6px" }}>Category</th>
                    <th style={{ padding: "8px 6px" }}>Risk</th>
                    <th style={{ padding: "8px 6px" }}>Stopped At</th>
                    <th style={{ padding: "8px 6px" }}>Excerpt</th>
                  </tr>
                </thead>
                <tbody>
                  {threatFeed.map((ev) => (
                    <tr
                      key={ev.id}
                      onClick={() => onSelectVerdict(ev.verdict)}
                      className="interactive-table-row"
                      style={{
                        borderBottom: "1px solid var(--rule)",
                        cursor: "pointer",
                      }}
                      title="Click to inspect this verdict in the Security Docket"
                    >
                      <td style={{ padding: "8px 6px", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                        {formatTime(ev.timestamp)}
                      </td>
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                        <span
                          className="font-pixel"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            borderRadius: "2px",
                            backgroundColor: "var(--block-bg)",
                            color: "var(--block)",
                            border: "1px solid var(--block)",
                          }}
                        >
                          <PixelWarning size={10} />
                          {ev.threat_category}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "8px 6px",
                          fontWeight: 600,
                          color: "var(--block)",
                        }}
                      >
                        {ev.risk_score}
                      </td>
                      <td
                        style={{
                          padding: "8px 6px",
                          color: "var(--ink-2)",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ev.stopping_stage}
                      </td>
                      <td
                        style={{
                          padding: "8px 6px",
                          color: "var(--ink-2)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={ev.input_excerpt}
                      >
                        {ev.input_excerpt}
                      </td>
                    </tr>
                  ))}
                  {threatFeed.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ padding: "24px 6px", textAlign: "center", color: "var(--ink-3)" }}
                      >
                        No threat events intercepted yet this session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                color: "var(--ink-3)",
                marginTop: "12px",
                textAlign: "right",
              }}
            >
              Tip: Click any blocked row to reload its full audit docket above.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

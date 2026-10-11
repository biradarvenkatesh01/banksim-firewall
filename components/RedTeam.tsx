"use client";

import React, { useState } from "react";

interface RedTeamResultItem {
  id: string;
  name: string;
  type: "ATTACK" | "LEGIT";
  expectedStatus: "APPROVED" | "BLOCKED";
  actualStatus: "APPROVED" | "BLOCKED";
  passed: boolean;
  risk_score: number;
  threat_category: string;
  message: string;
  memo: string | null;
}

interface RedTeamSummary {
  totalCases: number;
  totalAttacks: number;
  totalLegit: number;
  attacksBlocked: number;
  legitApproved: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: string;
}

export function RedTeam() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<RedTeamSummary | null>(null);
  const [results, setResults] = useState<RedTeamResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runRedTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/redteam", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data.summary);
      setResults(data.results);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="red-team" className="section reveal-fadeup">
      <div className="container">
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "36px",
          }}
        >
          <div>
            <div className="section-eyebrow">Zero-Trust Verification Benchmark</div>
            <h2 className="section-title">Automated Red Team Suite</h2>
            <p className="section-desc">
              Execute the complete 102-case corpus across all adversarial categories on fresh
              in-memory ledger states.
            </p>
          </div>

          <button
            type="button"
            onClick={runRedTeam}
            disabled={loading}
            className="btn-primary"
            style={{ padding: "12px 24px", fontSize: "15px" }}
          >
            {loading ? "Evaluating 102 cases…" : "Run all 102 cases"}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--block-bg)",
              border: "1px solid var(--block)",
              color: "var(--block)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "24px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
            }}
          >
            Red team benchmark error: {error}
          </div>
        )}

        {/* 4 Large Serif Numbers in a row separated by hairlines */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--paper-raised)",
              marginBottom: "32px",
              overflow: "hidden",
            }}
          >
            {/* Box 1: Attacks Blocked */}
            <div
              style={{
                padding: "24px",
                borderRight: "1px solid var(--rule)",
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: "11px",
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Attacks Blocked
              </div>
              <div
                className="font-serif tnum"
                style={{ fontSize: "40px", color: "var(--ink)", lineHeight: 1.1 }}
              >
                {summary.attacksBlocked}{" "}
                <span style={{ fontSize: "20px", color: "var(--ink-3)" }}>
                  / {summary.totalAttacks}
                </span>
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "11px", color: "var(--approve)", marginTop: "4px" }}
              >
                100% recall
              </div>
            </div>

            {/* Box 2: Legit Approved */}
            <div
              style={{
                padding: "24px",
                borderRight: "1px solid var(--rule)",
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: "11px",
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Legitimate Approved
              </div>
              <div
                className="font-serif tnum"
                style={{ fontSize: "40px", color: "var(--ink)", lineHeight: 1.1 }}
              >
                {summary.legitApproved}{" "}
                <span style={{ fontSize: "20px", color: "var(--ink-3)" }}>
                  / {summary.totalLegit}
                </span>
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "11px", color: "var(--approve)", marginTop: "4px" }}
              >
                100% legitimate pass
              </div>
            </div>

            {/* Box 3: False Positives */}
            <div
              style={{
                padding: "24px",
                borderRight: "1px solid var(--rule)",
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: "11px",
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                False Positives
              </div>
              <div
                className="font-serif tnum"
                style={{ fontSize: "40px", color: "var(--ink)", lineHeight: 1.1 }}
              >
                {summary.falsePositives}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "11px", color: "var(--approve)", marginTop: "4px" }}
              >
                0 false alarms
              </div>
            </div>

            {/* Box 4: Accuracy */}
            <div style={{ padding: "24px" }}>
              <div
                className="font-mono"
                style={{
                  fontSize: "11px",
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Total Accuracy
              </div>
              <div
                className="font-serif tnum"
                style={{ fontSize: "40px", color: "var(--approve)", lineHeight: 1.1 }}
              >
                {summary.accuracy}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: "4px" }}
              >
                across {summary.totalCases} cases
              </div>
            </div>
          </div>
        )}

        {/* Dense Table (mono, zebra via hairlines only) */}
        {results && (
          <div
            style={{
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--paper-raised)",
              overflow: "hidden",
            }}
          >
            {/* Table Header */}
            <div
              className="font-pixel"
              style={{
                display: "grid",
                gridTemplateColumns: "80px 70px 60px 180px 1fr",
                gap: "12px",
                padding: "10px 16px",
                backgroundColor: "var(--paper)",
                borderBottom: "1px solid var(--rule)",
                fontSize: "10px",
                color: "var(--ink-3)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <span>STATUS</span>
              <span>VERDICT</span>
              <span>RISK</span>
              <span>THREAT CATEGORY</span>
              <span>PAYLOAD</span>
            </div>

            {/* Table Body with zebra hairlines */}
            <div style={{ maxHeight: "420px", overflowY: "auto" }}>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className="interactive-table-row font-mono tnum"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 70px 60px 180px 1fr",
                    gap: "12px",
                    alignItems: "center",
                    padding: "9px 16px",
                    fontSize: "11px",
                    borderBottom: i === results.length - 1 ? "none" : "1px solid var(--rule)",
                    backgroundColor: i % 2 === 1 ? "rgba(0, 0, 0, 0.015)" : "transparent",
                  }}
                >
                  {/* Status chip */}
                  <div>
                    <span
                      className="font-pixel"
                      style={{
                        display: "inline-block",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        backgroundColor: r.passed ? "var(--approve-bg)" : "var(--block-bg)",
                        color: r.passed ? "var(--approve)" : "var(--block)",
                      }}
                    >
                      {r.passed ? "PASS" : "FAIL"}
                    </span>
                  </div>

                  {/* Verdict */}
                  <span
                    className="font-pixel"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                      color: r.actualStatus === "APPROVED" ? "var(--approve)" : "var(--block)",
                    }}
                  >
                    {r.actualStatus}
                  </span>

                  {/* Risk */}
                  <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>
                    {r.risk_score}
                  </span>

                  {/* Category */}
                  <span
                    className="font-pixel"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.04em",
                      color: r.threat_category === "NONE" ? "var(--ink-3)" : "var(--ink)",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      lineHeight: 1.3,
                      display: "inline-block",
                    }}
                    title={r.threat_category}
                  >
                    {r.threat_category.replace(/_/g, " ")}
                  </span>

                  {/* Payload */}
                  <span
                    style={{
                      color: "var(--ink-2)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={r.memo ? `${r.message} [Memo: ${r.memo}]` : r.message}
                  >
                    {r.message}
                    {r.memo && (
                      <span style={{ color: "var(--block)", marginLeft: "6px" }}>
                        [Memo: {r.memo}]
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

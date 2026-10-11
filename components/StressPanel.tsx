"use client";

import React from "react";
import type { StressTestReport } from "../lib/firewall/stress";
import { PixelShield, PixelCheck, PixelCross } from "./PixelIcons";

interface StressPanelProps {
  report: StressTestReport | null;
  loading: boolean;
  onClose: () => void;
}

export function StressPanel({ report, loading, onClose }: StressPanelProps) {
  if (loading) {
    return (
      <div
        style={{
          marginTop: "16px",
          padding: "20px",
          backgroundColor: "var(--paper-raised)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
        }}
        aria-live="polite"
      >
        <span className="font-mono" style={{ fontSize: "13px", color: "var(--navy)" }}>
          Synthesizing 10 adversarial mutations and evaluating across firewall pipeline…
        </span>
      </div>
    );
  }

  if (!report) return null;

  const { variants, summary, original_verdict } = report;

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "20px",
        backgroundColor: "var(--paper-raised)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
      }}
      aria-live="polite"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <div
            className="font-mono"
            style={{
              fontSize: "11px",
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "4px",
            }}
          >
            Mutation Stress Test · 10 Deterministic Evasion Vectors
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: "20px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: summary.all_blocked ? "var(--block)" : "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <PixelShield size={16} style={{ color: summary.all_blocked ? "var(--block)" : "var(--navy)" }} />
            {summary.headline}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-link font-mono"
          style={{ fontSize: "12px", color: "var(--ink-3)" }}
        >
          Dismiss ✕
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
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
              <th style={{ padding: "8px 6px" }}>Variant & Technique</th>
              <th style={{ padding: "8px 6px" }}>Preview Payload</th>
              <th style={{ padding: "8px 6px" }}>Verdict</th>
              <th style={{ padding: "8px 6px" }}>Risk</th>
              <th style={{ padding: "8px 6px" }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const isBlocked = v.status === "BLOCKED";
              return (
                <tr
                  key={v.id}
                  className="interactive-table-row"
                  style={{
                    borderBottom: "1px solid var(--rule)",
                    backgroundColor: "transparent",
                  }}
                >
                  <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{v.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>{v.technique}</div>
                  </td>
                  <td
                    style={{
                      padding: "8px 6px",
                      color: "var(--ink-2)",
                      maxWidth: "240px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={v.preview}
                  >
                    {v.preview}
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
                        backgroundColor: isBlocked ? "var(--block-bg)" : "var(--approve-bg)",
                        color: isBlocked ? "var(--block)" : "var(--approve)",
                        border: `1px solid ${isBlocked ? "var(--block)" : "var(--approve)"}`,
                      }}
                    >
                      {isBlocked ? <PixelCross size={10} /> : <PixelCheck size={10} />}
                      {v.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "8px 6px",
                      fontWeight: 600,
                      color: isBlocked ? "var(--block)" : "var(--approve)",
                    }}
                  >
                    {v.risk_score}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <span
                      className="font-pixel"
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.04em",
                        color: "var(--ink-2)",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        lineHeight: 1.3,
                        display: "inline-block",
                      }}
                    >
                      {v.threat_category.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

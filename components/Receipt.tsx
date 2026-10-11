"use client";

import React from "react";
import type { Verdict } from "../lib/firewall/schema";
import { PixelCheck, PixelCross, PixelViewfinderCorners } from "./PixelIcons";

interface ReceiptProps {
  verdict: Verdict | null;
  loading: boolean;
}

export function Receipt({ verdict, loading }: ReceiptProps) {
  if (loading) {
    return (
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <div className="receipt-perforation-top" />
        <div
          className="receipt-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "260px",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "2px solid var(--rule)",
              borderTopColor: "var(--navy)",
              animation: "spin 700ms linear infinite",
            }}
          />
          <span
            className="font-mono"
            style={{ fontSize: "12px", color: "var(--ink-2)", letterSpacing: "0.04em" }}
          >
            Inspecting request against 8-stage firewall…
          </span>
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
        <div className="receipt-perforation-bottom" />
      </div>
    );
  }

  if (!verdict || !verdict.request_id) {
    return (
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <div className="receipt-perforation-top" />
        <div
          className="receipt-card"
          style={{
            minHeight: "240px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "var(--ink-3)",
            textAlign: "center",
          }}
        >
          <div className="font-serif" style={{ fontSize: "20px", color: "var(--ink-2)", marginBottom: "4px" }}>
            Awaiting Transaction
          </div>
          <div className="font-mono" style={{ fontSize: "12px", maxWidth: "280px" }}>
            Compose a request or select an attack payload below to trigger real-time inspection.
          </div>
        </div>
        <div className="receipt-perforation-bottom" />
      </div>
    );
  }

  const isApproved = verdict.status === "APPROVED";
  const amountStr =
    verdict.parsed_request?.amount != null
      ? `₹${verdict.parsed_request.amount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}`
      : "N/A";
  const payeeStr = verdict.parsed_request?.payee ?? "None";

  return (
    <div style={{ position: "relative", marginBottom: "24px" }} aria-live="polite">
      {/* Top Zig-Zag edge */}
      <div className="receipt-perforation-top" />

      <div
        key={verdict.request_id}
        className="receipt-card receipt-print-reveal"
        style={{ position: "relative" }}
        aria-live="polite"
      >
        <PixelViewfinderCorners color="var(--ink-3)" size={6} />

        {/* Rubber Stamp Hero Moment — clamped and scaled inside header */}
        <div className="receipt-stamp-anchor">
          <span
            key={verdict.request_id}
            className={`stamp ${isApproved ? "stamp-approved" : "stamp-blocked"}`}
          >
            {verdict.status}
          </span>
        </div>

        {/* Receipt Header */}
        <div
          style={{
            borderBottom: "1px dashed var(--rule)",
            paddingBottom: "16px",
            marginBottom: "16px",
            paddingRight: "140px",
          }}
        >
          <div
            className="font-serif"
            style={{ fontSize: "20px", color: "var(--ink)", fontWeight: 500 }}
          >
            BankSim Security Docket
          </div>
          <div
            className="font-mono tnum"
            style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: "2px" }}
          >
            ID: {verdict.request_id} · {new Date(verdict.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Line Items */}
        <div
          className="font-mono tnum"
          style={{
            fontSize: "12px",
            lineHeight: 1.85,
            color: "var(--ink-2)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--ink-3)" }}>VERDICT</span>
            <span
              className="font-pixel"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: isApproved ? "var(--approve)" : "var(--block)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              {isApproved ? <PixelCheck size={11} /> : <PixelCross size={11} />}
              {verdict.status} ({verdict.threat_category})
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-3)" }}>INTENT</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>
              {verdict.intent}
            </span>
          </div>

          {verdict.intent === "TRANSFER" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>RECIPIENT</span>
                <span style={{ color: "var(--ink)" }}>{payeeStr}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>AMOUNT</span>
                <span style={{ color: "var(--ink)" }}>{amountStr}</span>
              </div>
            </>
          )}

          {verdict.parsed_request?.memo && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--ink-3)" }}>MEMO FIELD</span>
              <span
                style={{
                  color: isApproved ? "var(--ink)" : "var(--block)",
                  maxWidth: "220px",
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={verdict.parsed_request.memo}
              >
                {verdict.parsed_request.memo}
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-3)" }}>RISK SCORE</span>
            <span
              style={{
                fontWeight: 600,
                color:
                  verdict.risk_score >= 50
                    ? "var(--block)"
                    : verdict.risk_score >= 25
                    ? "var(--amber)"
                    : "var(--approve)",
              }}
            >
              {verdict.risk_score}/100
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-3)" }}>TOOL EXECUTION</span>
            <span style={{ color: verdict.action.executed ? "var(--approve)" : "var(--ink-3)" }}>
              {verdict.action.executed
                ? `Executed: ${verdict.action.tool}`
                : "None (zero-trust halted)"}
            </span>
          </div>
        </div>

        {/* Signals / Rule Hits Section */}
        {verdict.signals.length > 0 && (
          <div
            style={{
              paddingTop: "12px",
              borderTop: "1px dashed var(--rule)",
              marginBottom: "16px",
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              Detected Threat Signals ({verdict.signals.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {verdict.signals.slice(0, 3).map((sig, i) => (
                <div
                  key={i}
                  className="font-mono"
                  style={{
                    fontSize: "11px",
                    color: "var(--block)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    [{sig.rule_id}] {sig.label}
                  </span>
                  <span>{Math.round(sig.weight * 100)}%</span>
                </div>
              ))}
              {verdict.signals.length > 3 && (
                <div
                  className="font-mono"
                  style={{ fontSize: "10px", color: "var(--ink-3)" }}
                >
                  + {verdict.signals.length - 3} additional signals
                </div>
              )}
            </div>
          </div>
        )}

        {/* Human Readable Explanation */}
        <div
          style={{
            paddingTop: "12px",
            borderTop: "1px dashed var(--rule)",
            fontSize: "12px",
            lineHeight: 1.5,
            color: "var(--ink-2)",
          }}
        >
          {verdict.explanation}
        </div>
      </div>

      {/* Bottom Zig-Zag edge */}
      <div className="receipt-perforation-bottom" />
    </div>
  );
}

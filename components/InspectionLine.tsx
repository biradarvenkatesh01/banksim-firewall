"use client";

import React from "react";
import type { PipelineStage } from "../lib/firewall/schema";
import { PixelCheck, PixelCross } from "./PixelIcons";

interface InspectionLineProps {
  pipeline: PipelineStage[];
}

const STATIONS: { num: string; key: string; name: string; defaultDetail: string }[] = [
  { num: "01", key: "input_contract", name: "Input Contract", defaultDetail: "Length boundary & payload type enforcement" },
  { num: "02", key: "canonicalization", name: "Canonicalise", defaultDetail: "NFKC, homoglyph mapping, de-spacing, decoders" },
  { num: "03", key: "signature_scan", name: "Signatures", defaultDetail: "Scans all normalized views across weighted threat rules" },
  { num: "04", key: "intent_parse", name: "Intent Parser", defaultDetail: "Grammar parsing for financial intent, payee, and amount" },
  { num: "05", key: "semantic_classifier", name: "Semantic Check", defaultDetail: "Groq secondary semantic analysis & canary token probe" },
  { num: "06", key: "risk_decision", name: "Decision Engine", defaultDetail: "Evaluates risk thresholds (fail-closed if score ≥ 50)" },
  { num: "07", key: "policy_engine", name: "Policy Engine", defaultDetail: "Enforces per-transaction and daily financial caps" },
  { num: "08", key: "tool_dispatch", name: "Tool Dispatch", defaultDetail: "Executes mock financial tools with validated arguments" },
];

export function InspectionLine({ pipeline }: InspectionLineProps) {
  // Map pipeline steps by stage
  const stageMap = new Map<string, PipelineStage>();
  pipeline.forEach((p) => stageMap.set(p.stage, p));

  return (
    <div
      style={{
        backgroundColor: "var(--paper-raised)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: "11px",
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Inspection Pipeline · 8 Stations
        </div>
        <div
          className="font-mono"
          style={{ fontSize: "11px", color: "var(--ink-3)" }}
        >
          Zero-Trust Guardrail
        </div>
      </div>

      <div style={{ position: "relative", paddingLeft: "8px" }}>
        {/* Continuous vertical connector line */}
        <div
          style={{
            position: "absolute",
            left: "13px",
            top: "14px",
            bottom: "24px",
            width: "1px",
            backgroundColor: "var(--rule)",
            zIndex: 1,
          }}
        >
          {/* Traveling pixel scanner block that sweeps down */}
          <div
            key={pipeline.length > 0 ? pipeline[pipeline.length - 1]?.stage : "idle"}
            className="station-scanner"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {STATIONS.map((station, index) => {
            const step = stageMap.get(station.key);
            const isReached = Boolean(step);
            const isPassed = step?.passed === true;
            const isStoppedHere = step?.passed === false;

            const detailText = step?.detail || station.defaultDetail;

            return (
              <div
                key={station.key}
                className="station-item"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  position: "relative",
                  zIndex: 2,
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Station Icon: PixelCheck, PixelCross, or hollow */}
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "2px",
                    flexShrink: 0,
                  }}
                >
                  {isReached ? (
                    isPassed ? (
                      <PixelCheck size={12} style={{ color: "var(--approve)" }} />
                    ) : (
                      <PixelCross size={12} style={{ color: "var(--block)" }} />
                    )
                  ) : (
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        border: "1.5px solid var(--rule)",
                        backgroundColor: "var(--paper-raised)",
                        display: "inline-block",
                      }}
                    />
                  )}
                </div>

                {/* Station Station Number (pixel font) + Name + Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      className="font-pixel"
                      style={{
                        fontSize: "11px",
                        color: isStoppedHere
                          ? "var(--block)"
                          : isReached
                          ? "var(--ink-2)"
                          : "var(--ink-4)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {station.num}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: isReached ? 600 : 500,
                        color: isStoppedHere
                          ? "var(--block)"
                          : isReached
                          ? "var(--ink)"
                          : "var(--ink-3)",
                      }}
                    >
                      {station.name}
                    </span>
                    {isStoppedHere && (
                      <span
                        className="font-pixel"
                        style={{
                          fontSize: "10px",
                          color: "var(--block)",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        [BLOCKED HERE]
                      </span>
                    )}
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      color: isStoppedHere
                        ? "var(--block)"
                        : isReached
                        ? "var(--ink-2)"
                        : "var(--ink-3)",
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}
                  >
                    {detailText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

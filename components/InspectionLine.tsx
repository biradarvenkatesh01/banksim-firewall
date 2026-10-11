"use client";

import React from "react";
import type { PipelineStage } from "../lib/firewall/schema";

interface InspectionLineProps {
  pipeline: PipelineStage[];
}

const STATIONS: { key: string; name: string; defaultDetail: string }[] = [
  { key: "input_contract", name: "1. Input Contract", defaultDetail: "Length boundary & payload type enforcement" },
  { key: "canonicalization", name: "2. Canonicalise", defaultDetail: "NFKC, homoglyph mapping, de-spacing, decoders" },
  { key: "signature_scan", name: "3. Signatures", defaultDetail: "Scans all normalized views across weighted threat rules" },
  { key: "intent_parse", name: "4. Intent Parser", defaultDetail: "Grammar parsing for financial intent, payee, and amount" },
  { key: "semantic_classifier", name: "5. Semantic Check", defaultDetail: "Groq secondary semantic analysis & canary token probe" },
  { key: "risk_decision", name: "6. Decision Engine", defaultDetail: "Evaluates risk thresholds (fail-closed if score ≥ 50)" },
  { key: "policy_engine", name: "7. Policy Engine", defaultDetail: "Enforces per-transaction and daily financial caps" },
  { key: "tool_dispatch", name: "8. Tool Dispatch", defaultDetail: "Executes mock financial tools with validated arguments" },
];

export function InspectionLine({ pipeline }: InspectionLineProps) {
  // Map pipeline steps by stage
  const stageMap = new Map<string, PipelineStage>();
  pipeline.forEach((p) => stageMap.set(p.stage, p));

  // Determine which station failed, if any
  const failedStationIndex = STATIONS.findIndex((s) => {
    const p = stageMap.get(s.key);
    return p && !p.passed;
  });

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
            left: "14px",
            top: "14px",
            bottom: "24px",
            width: "1px",
            backgroundColor: "var(--rule)",
            zIndex: 1,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {STATIONS.map((station, index) => {
            const step = stageMap.get(station.key);
            const isReached = Boolean(step);
            const isPassed = step?.passed === true;
            const isStoppedHere = step?.passed === false;

            // Dot style
            let dotBg = "var(--paper-raised)";
            let dotBorder = "1.5px solid var(--rule)";

            if (isReached) {
              if (isPassed) {
                dotBg = "var(--approve)";
                dotBorder = "1.5px solid var(--approve)";
              } else if (isStoppedHere) {
                dotBg = "var(--block)";
                dotBorder = "1.5px solid var(--block)";
              }
            }

            const detailText = step?.detail || station.defaultDetail;

            return (
              <div
                key={station.key}
                className="station-item"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  position: "relative",
                  zIndex: 2,
                  animationDelay: `${index * 60}ms`,
                }}
              >
                {/* Station Circle Indicator */}
                <div
                  style={{
                    width: "13px",
                    height: "13px",
                    borderRadius: "50%",
                    backgroundColor: dotBg,
                    border: dotBorder,
                    marginTop: "3px",
                    flexShrink: 0,
                    transition: "background-color 200ms ease, border-color 200ms ease",
                    boxShadow: isStoppedHere ? "0 0 0 3px var(--block-bg)" : "none",
                  }}
                />

                {/* Station text & mono detail */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                      marginBottom: "2px",
                    }}
                  >
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
                        className="font-mono"
                        style={{
                          fontSize: "10px",
                          color: "var(--block)",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
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
                      color: isStoppedHere ? "var(--block)" : isReached ? "var(--ink-2)" : "var(--ink-3)",
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

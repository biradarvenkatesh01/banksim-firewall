"use client";

import React from "react";

export function Architecture() {
  return (
    <section id="architecture" className="section dot-grid-bg reveal-fadeup">
      <div className="container">
        {/* Section Header */}
        <div style={{ marginBottom: "40px" }}>
          <div className="section-eyebrow">Defence-in-Depth Architecture</div>
          <h2 className="section-title">How the Firewall Operates</h2>
          <p className="section-desc">
            An eight-stage deterministic inspection pipeline designed so untrusted user text
            cannot trick, bypass, or coerce banking tools into unauthorized transfers.
          </p>
        </div>

        {/* Horizontal Schematic drawn in inline SVG (hairline boxes + arrows) */}
        <div
          style={{
            backgroundColor: "var(--paper-raised)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            padding: "24px 20px",
            marginBottom: "48px",
            overflowX: "auto",
          }}
        >
          <div style={{ minWidth: "960px" }}>
            <svg
              viewBox="0 0 960 170"
              style={{ width: "100%", height: "170px", display: "block" }}
              aria-label="Eight-stage firewall pipeline schematic"
            >
              {/* Stages boxes */}
              {[
                { x: 10, name: "1. Input", sub: "Contract Bounds" },
                { x: 130, name: "2. Canonical", sub: "NFKC & Decoders" },
                { x: 250, name: "3. Signatures", sub: "Weighted Rules" },
                { x: 370, name: "4. Intent", sub: "Strict Grammar" },
                { x: 490, name: "5. Semantic", sub: "Groq LLM Guard" },
                { x: 610, name: "6. Decision", sub: "Risk Threshold" },
                { x: 730, name: "7. Policy", sub: "Limits & Ledger" },
                { x: 850, name: "8. Tool", sub: "Mock Execution" },
              ].map((stage, i) => (
                <g key={stage.name}>
                  {/* Stage Rect */}
                  <rect
                    x={stage.x}
                    y={30}
                    width={95}
                    height={56}
                    rx={6}
                    fill={i === 4 ? "var(--paper)" : "var(--paper-raised)"}
                    stroke={i === 4 ? "var(--navy)" : "var(--rule)"}
                    strokeWidth={i === 4 ? 1.5 : 1}
                  />

                  {/* Stage text */}
                  <text
                    x={stage.x + 47}
                    y={54}
                    textAnchor="middle"
                    fill="var(--ink)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {stage.name}
                  </text>
                  <text
                    x={stage.x + 47}
                    y={70}
                    textAnchor="middle"
                    fill="var(--ink-3)"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                  >
                    {stage.sub}
                  </text>

                  {/* Arrow to next stage */}
                  {i < 7 && (
                    <g>
                      <line
                        x1={stage.x + 95}
                        y1={58}
                        x2={stage.x + 120}
                        y2={58}
                        stroke="var(--rule)"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points={`${stage.x + 120},55 ${stage.x + 126},58 ${stage.x + 120},61`}
                        fill="var(--ink-3)"
                      />
                    </g>
                  )}
                </g>
              ))}

              {/* Callout box under Semantic check */}
              <g transform="translate(430, 110)">
                <rect
                  x="0"
                  y="0"
                  width="215"
                  height="34"
                  rx="4"
                  fill="var(--paper)"
                  stroke="var(--rule)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x="107"
                  y="22"
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontFamily="var(--font-display)"
                  fontSize="15"
                  fontStyle="italic"
                >
                  LLM advises · never decides
                </text>
              </g>

              {/* Connecting line from stage 5 to callout */}
              <line
                x1="537"
                y1="86"
                x2="537"
                y2="110"
                stroke="var(--navy)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </svg>
          </div>
        </div>

        {/* Three short numbered principles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
          }}
        >
          {/* Principle 01 */}
          <div style={{ paddingRight: "16px" }}>
            <div
              className="font-mono"
              style={{
                fontSize: "12px",
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              01
            </div>
            <h3
              className="font-serif"
              style={{ fontSize: "22px", color: "var(--ink)", fontWeight: 400, marginBottom: "8px" }}
            >
              The model never touches money.
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--ink-2)" }}>
              The generative model acts strictly as an advisory signal that can only add risk.
              Financial tools are invoked solely when deterministic policy invariants and risk thresholds pass.
            </p>
          </div>

          {/* Principle 02 */}
          <div style={{ paddingRight: "16px" }}>
            <div
              className="font-mono"
              style={{
                fontSize: "12px",
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              02
            </div>
            <h3
              className="font-serif"
              style={{ fontSize: "22px", color: "var(--ink)", fontWeight: 400, marginBottom: "8px" }}
            >
              Memos are data, not instructions.
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--ink-2)" }}>
              Transaction memos are scanned with zero-trust isolation. Any imperative instruction,
              prompt override, HTML comment, or secondary payment request inside a memo triggers an immediate block.
            </p>
          </div>

          {/* Principle 03 */}
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "12px",
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              03
            </div>
            <h3
              className="font-serif"
              style={{ fontSize: "22px", color: "var(--ink)", fontWeight: 400, marginBottom: "8px" }}
            >
              When unsure, fail closed.
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--ink-2)" }}>
              Ambiguous requests, multi-intent commands, or scores in the grey zone (25–49)
              never execute silently. The firewall halts execution and returns a safe explanation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

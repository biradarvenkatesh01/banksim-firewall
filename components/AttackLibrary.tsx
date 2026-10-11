"use client";

import React, { useState } from "react";
import { ATTACK_CASES, LEGIT_CASES, type TestCase } from "../lib/firewall/corpus";

interface AttackLibraryProps {
  onSelectPayload: (message: string, memo: string | null) => void;
}

type TabKey = "ALL" | "PROMPT_INJECTION" | "JAILBREAK" | "ROLEPLAY" | "MEMO" | "OBFUSCATION" | "POLICY" | "LEGIT";

const TABS: { key: TabKey; label: string }[] = [
  { key: "PROMPT_INJECTION", label: "Prompt injection" },
  { key: "JAILBREAK", label: "Jailbreak" },
  { key: "ROLEPLAY", label: "Roleplay" },
  { key: "MEMO", label: "Memo injection" },
  { key: "OBFUSCATION", label: "Obfuscation" },
  { key: "POLICY", label: "Policy guardrails" },
  { key: "LEGIT", label: "Legitimate" },
];

/**
 * Safely render invisible characters as visible glyphs: ⟨ZWSP⟩, ⟨ZWNJ⟩, etc.
 */
function formatPayloadVisual(text: string): string {
  return text
    .replace(/\u200B/g, "⟨ZWSP⟩")
    .replace(/\u200C/g, "⟨ZWNJ⟩")
    .replace(/\u200D/g, "⟨ZWJ⟩")
    .replace(/\uFEFF/g, "⟨BOM⟩")
    .replace(/\u00AD/g, "⟨SHY⟩");
}

export function AttackLibrary({ onSelectPayload }: AttackLibraryProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("PROMPT_INJECTION");

  const filterCases = (): readonly TestCase[] => {
    if (activeTab === "LEGIT") {
      return LEGIT_CASES;
    }
    if (activeTab === "PROMPT_INJECTION") {
      return ATTACK_CASES.filter((c) => c.expectedCategory === "PROMPT_INJECTION");
    }
    if (activeTab === "JAILBREAK") {
      return ATTACK_CASES.filter((c) => c.expectedCategory === "JAILBREAK");
    }
    if (activeTab === "ROLEPLAY") {
      return ATTACK_CASES.filter(
        (c) => c.expectedCategory === "ROLEPLAY_ATTACK" || c.expectedCategory === "AUTHORITY_IMPERSONATION"
      );
    }
    if (activeTab === "MEMO") {
      return ATTACK_CASES.filter((c) => c.expectedCategory === "MEMO_INJECTION");
    }
    if (activeTab === "OBFUSCATION") {
      return ATTACK_CASES.filter((c) => c.expectedCategory === "OBFUSCATION");
    }
    if (activeTab === "POLICY") {
      return ATTACK_CASES.filter(
        (c) => c.expectedCategory === "POLICY_VIOLATION" || c.expectedCategory === "AMBIGUOUS_REQUEST"
      );
    }
    return ATTACK_CASES;
  };

  const cases = filterCases();

  const handleTry = (c: TestCase) => {
    onSelectPayload(c.message, c.memo ?? null);
    const consoleEl = document.getElementById("console");
    if (consoleEl) {
      consoleEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="attack-library" className="section">
      <div className="container">
        {/* Section Header */}
        <div style={{ marginBottom: "32px" }}>
          <div className="section-eyebrow">Corpus Repository · 102 Test Vectors</div>
          <h2 className="section-title">Attack Library</h2>
          <p className="section-desc">
            Select any payload from our red-team corpus to test the firewall pipeline.
            Obfuscated and hidden unicode controls are visualized explicitly.
          </p>
        </div>

        {/* Horizontal Category Tabs */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            borderBottom: "1px solid var(--rule)",
            marginBottom: "24px",
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--navy)" : "2px solid transparent",
                  padding: "8px 0",
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--ink)" : "var(--ink-2)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "color 160ms, border-color 160ms",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Rows of Payloads (Clean table, not cards) */}
        <div
          style={{
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--paper-raised)",
            overflow: "hidden",
          }}
        >
          {cases.map((c, idx) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 90px",
                gap: "16px",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: idx === cases.length - 1 ? "none" : "1px solid var(--rule)",
                transition: "background-color 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--paper)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--paper-raised)")}
            >
              {/* Category in mono small caps */}
              <div>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: c.expectedStatus === "BLOCKED" ? "var(--block)" : "var(--approve)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {c.expectedCategory === "NONE" ? "LEGIT" : c.expectedCategory}
                </span>
                <div
                  className="font-mono tnum"
                  style={{ fontSize: "10px", color: "var(--ink-3)", marginTop: "2px" }}
                >
                  {c.id}
                </div>
              </div>

              {/* Payload text in mono */}
              <div style={{ minWidth: 0 }}>
                <div
                  className="font-mono"
                  style={{
                    fontSize: "12px",
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={c.message}
                >
                  {formatPayloadVisual(c.message)}
                </div>
                {c.memo && (
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      color: "var(--block)",
                      marginTop: "3px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Memo: ${c.memo}`}
                  >
                    Memo: {formatPayloadVisual(c.memo)}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => handleTry(c)}
                  className="btn-link font-mono"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                >
                  Try →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

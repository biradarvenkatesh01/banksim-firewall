"use client";

import React from "react";

const GITHUB_REPO_URL = "https://github.com/biradarvenkatesh01/banksim-firewall";

export function Footer() {
  return (
    <footer
      style={{
        paddingTop: "48px",
        paddingBottom: "48px",
        borderTop: "1px solid var(--rule)",
        backgroundColor: "var(--paper)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: "12px",
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span>BankSim Firewall v1.0.0</span>
          <span>·</span>
          <span>Built in Google Antigravity for PromptWars × UVCE 2026</span>
          <span>·</span>
          <span>Zero-Trust AI Guardrails</span>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <a
            href="/deck"
            className="font-mono btn-link"
            style={{ fontSize: "12px", color: "var(--ink-2)", fontWeight: 500 }}
          >
            Architecture Deck ↗
          </a>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono btn-link"
            style={{ fontSize: "12px", color: "var(--ink-3)" }}
          >
            GitHub Repository ↗
          </a>
        </div>
      </div>
    </footer>
  );
}

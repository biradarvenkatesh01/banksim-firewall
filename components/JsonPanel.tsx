"use client";

import React, { useState } from "react";
import type { Verdict } from "../lib/firewall/schema";

interface JsonPanelProps {
  verdict: Verdict | null;
}

export function JsonPanel({ verdict }: JsonPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (!verdict) return null;

  const jsonString = JSON.stringify(verdict, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--paper-raised)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          cursor: "pointer",
          userSelect: "none",
          borderBottom: isOpen ? "1px solid var(--rule)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--ink)",
              fontWeight: 500,
            }}
          >
            Raw Verdict JSON
          </span>
          <span
            className="font-mono tnum"
            style={{ fontSize: "11px", color: "var(--ink-3)" }}
          >
            ({verdict.request_id})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            className="font-mono"
            style={{ fontSize: "11px", color: "var(--ink-3)" }}
          >
            {isOpen ? "Collapse ↑" : "Expand ↓"}
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "16px",
              zIndex: 2,
            }}
          >
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary"
              style={{
                fontSize: "11px",
                padding: "4px 10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {copied ? "Copied ✓" : "Copy JSON"}
            </button>
          </div>

          <pre
            className="font-mono"
            style={{
              padding: "16px 20px",
              fontSize: "12px",
              lineHeight: 1.6,
              color: "var(--ink)",
              backgroundColor: "var(--paper)",
              overflowX: "auto",
              maxHeight: "360px",
              margin: 0,
            }}
          >
            <code>{jsonString}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

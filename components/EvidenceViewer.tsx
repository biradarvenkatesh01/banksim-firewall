"use client";

import React from "react";
import type { Signal } from "../lib/firewall/schema";

interface EvidenceViewerProps {
  message: string;
  memo: string | null;
  signals: Signal[];
}

interface Span {
  start: number;
  end: number;
  label: string;
  rule_id: string;
}

function renderTextWithSpans(text: string, spans: Span[]) {
  if (!text || spans.length === 0) return <span>{text}</span>;

  // Sort spans by start asc, length desc
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge non-overlapping or keep primary
  const cleanSpans: Span[] = [];
  let lastEnd = 0;
  for (const s of sorted) {
    if (s.start >= lastEnd && s.end <= text.length && s.start < s.end) {
      cleanSpans.push(s);
      lastEnd = s.end;
    }
  }

  const segments: React.ReactNode[] = [];
  let curr = 0;

  for (const s of cleanSpans) {
    if (s.start > curr) {
      segments.push(<span key={`txt-${curr}`}>{text.slice(curr, s.start)}</span>);
    }
    segments.push(
      <mark
        key={`mark-${s.start}-${s.end}`}
        title={`${s.rule_id}: ${s.label}`}
        aria-label={`${s.rule_id}: ${s.label}`}
        style={{
          backgroundColor: "rgba(196, 66, 26, 0.14)",
          borderBottom: "2px solid var(--block)",
          color: "var(--ink)",
          padding: "1px 2px",
          borderRadius: "2px",
          cursor: "help",
        }}
      >
        {text.slice(s.start, s.end)}
      </mark>
    );
    curr = s.end;
  }

  if (curr < text.length) {
    segments.push(<span key={`txt-end`}>{text.slice(curr)}</span>);
  }

  return <>{segments}</>;
}

export function EvidenceViewer({ message, memo, signals }: EvidenceViewerProps) {
  if (!signals || signals.length === 0) return null;

  const messageSpans: Span[] = [];
  const memoSpans: Span[] = [];
  const deobfuscatedSignals: Signal[] = [];

  for (const sig of signals) {
    if (sig.span) {
      const spanObj = {
        start: sig.span.start,
        end: sig.span.end,
        label: sig.label,
        rule_id: sig.rule_id,
      };
      if (sig.field === "message") messageSpans.push(spanObj);
      else if (sig.field === "memo") memoSpans.push(spanObj);
    } else if (sig.via_view) {
      deobfuscatedSignals.push(sig);
    }
  }

  const hasHighlights = messageSpans.length > 0 || memoSpans.length > 0 || deobfuscatedSignals.length > 0;
  if (!hasHighlights) return null;

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "14px 16px",
        backgroundColor: "var(--paper)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-sm)",
      }}
      aria-live="polite"
    >
      <div
        className="font-mono"
        style={{
          fontSize: "11px",
          color: "var(--block)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "10px",
          fontWeight: 600,
        }}
      >
        Evidence Highlighting · Character Span Matches
      </div>

      {/* Message with highlighted spans */}
      {message && (
        <div style={{ marginBottom: memo ? "8px" : "0", fontSize: "13px", lineHeight: 1.6 }}>
          <span className="font-mono" style={{ fontSize: "11px", color: "var(--ink-3)", marginRight: "8px" }}>
            MESSAGE:
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            {renderTextWithSpans(message, messageSpans)}
          </span>
        </div>
      )}

      {/* Memo with highlighted spans */}
      {memo && (
        <div style={{ fontSize: "13px", lineHeight: 1.6, marginTop: "6px" }}>
          <span className="font-mono" style={{ fontSize: "11px", color: "var(--ink-3)", marginRight: "8px" }}>
            MEMO:
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            {renderTextWithSpans(memo, memoSpans)}
          </span>
        </div>
      )}

      {/* De-obfuscated view reveals */}
      {deobfuscatedSignals.length > 0 && (
        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed var(--rule)" }}>
          {deobfuscatedSignals.map((sig, idx) => (
            <div
              key={`deob-${idx}`}
              className="font-mono"
              style={{
                fontSize: "12px",
                color: "var(--block)",
                marginTop: "4px",
                display: "flex",
                alignItems: "baseline",
                gap: "6px",
              }}
            >
              <span style={{ color: "var(--ink-3)", fontSize: "11px" }}>
                [{sig.via_view}]
              </span>
              <span>
                decoded view revealed: <em>{sig.evidence}</em>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

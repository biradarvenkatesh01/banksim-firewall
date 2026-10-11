"use client";

import React from "react";

interface ComposerProps {
  message: string;
  memo: string;
  onMessageChange: (v: string) => void;
  onMemoChange: (v: string) => void;
  onSubmit: (dryRun: boolean) => void;
  loading: boolean;
  error: string | null;
}

export function Composer({
  message,
  memo,
  onMessageChange,
  onMemoChange,
  onSubmit,
  loading,
  error,
}: ComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!loading && message.trim()) {
        onSubmit(false);
      }
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--paper-raised)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        padding: "24px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-3)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        Request Composer
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && message.trim()) onSubmit(false);
        }}
      >
        {/* Message Input */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="composer-message"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink-2)",
              marginBottom: "6px",
            }}
          >
            Message
          </label>
          <textarea
            id="composer-message"
            rows={3}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Send 500 to Rahul for lunch"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: "var(--paper)",
              color: "var(--ink)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              resize: "vertical",
              minHeight: "80px",
              outline: "none",
            }}
          />
        </div>

        {/* Memo Input */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="composer-memo"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink-2)",
              marginBottom: "6px",
            }}
          >
            <span>Memo (optional)</span>
            <span
              className="font-mono"
              style={{ fontSize: "11px", color: "var(--ink-3)", fontWeight: 400 }}
            >
              Strict zero-trust data field
            </span>
          </label>
          <input
            id="composer-memo"
            type="text"
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Movie tickets with team"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: "var(--paper)",
              color: "var(--ink)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-sm)",
              padding: "9px 12px",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "8px 12px",
              backgroundColor: "var(--block-bg)",
              border: "1px solid var(--block)",
              borderRadius: "var(--radius-sm)",
              color: "var(--block)",
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {error}
          </div>
        )}

        {/* Action buttons & hint line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary"
            >
              {loading ? "Inspecting…" : "Analyze & execute"}
            </button>
            <button
              type="button"
              disabled={loading || !message.trim()}
              onClick={() => onSubmit(true)}
              className="btn-secondary"
            >
              Dry run
            </button>
            <button
              type="button"
              disabled={loading || (!message && !memo)}
              onClick={() => {
                onMessageChange("");
                onMemoChange("");
              }}
              className="btn-link font-mono"
              style={{
                fontSize: "12px",
                color: !message && !memo ? "var(--ink-4)" : "var(--ink-3)",
                padding: "6px 8px",
                cursor: !message && !memo ? "default" : "pointer",
                textDecoration: !message && !memo ? "none" : "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Clear
            </button>
          </div>

          <span
            className="font-mono"
            style={{ fontSize: "11px", color: "var(--ink-3)" }}
          >
            Press ⌘ / Ctrl + Enter
          </span>
        </div>
      </form>
    </div>
  );
}

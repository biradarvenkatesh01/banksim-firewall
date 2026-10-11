"use client";

import React, { useEffect, useState } from "react";
import { PixelBolt } from "./PixelIcons";

interface EngineHealth {
  mode: "rules+llm" | "rules-only";
  llm_configured: boolean;
  model: string;
}

export function TopBar() {
  const [engine, setEngine] = useState<EngineHealth | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Theme initialization (Light is default)
    try {
      const saved = localStorage.getItem("banksim-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }

    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data?.engine) {
          setEngine({
            mode: data.engine.mode,
            llm_configured: data.engine.llm_configured,
            model: data.engine.model,
          });
        }
      })
      .catch(() => {
        // Fallback default if offline
        setEngine({
          mode: "rules+llm",
          llm_configured: true,
          model: "openai/gpt-oss-120b",
        });
      });
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("banksim-theme", next);
    } catch {}
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "var(--paper-translucent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--rule)",
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand Wordmark */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <a
            href="#"
            style={{
              textDecoration: "none",
              color: "var(--ink)",
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            BankSim
          </a>
          <span
            className="font-mono"
            style={{
              fontSize: "11px",
              color: "var(--ink-3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Blue-Team Firewall
          </span>
        </div>

        {/* Navigation links & status */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              fontSize: "14px",
            }}
            className="hidden-mobile"
          >
            <a
              href="#console"
              style={{
                color: "var(--ink-2)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "color 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
            >
              Console
            </a>
            <a
              href="#ledger"
              style={{
                color: "var(--ink-2)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "color 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
            >
              Ledger
            </a>
            <a
              href="#attack-library"
              style={{
                color: "var(--ink-2)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "color 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
            >
              Attacks
            </a>
            <a
              href="#red-team"
              style={{
                color: "var(--ink-2)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "color 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
            >
              Red Team
            </a>
            <a
              href="#architecture"
              style={{
                color: "var(--ink-2)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "color 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
            >
              How it works
            </a>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="font-mono"
            style={{
              fontSize: "12px",
              color: "var(--ink-2)",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--rule)",
              backgroundColor: "var(--paper-raised)",
              cursor: "pointer",
            }}
            title={`Current theme: ${theme}. Click to toggle.`}
          >
            Light / Dark
          </button>

          {/* Engine status pill */}
          <div className="status-pill font-pixel" title={`Model: ${engine?.model || "default"}`}>
            <PixelBolt
              size={11}
              style={{
                color: engine?.mode === "rules+llm" ? "var(--approve)" : "var(--amber)",
              }}
            />
            <span style={{ fontSize: "11px", letterSpacing: "0.06em" }}>
              {engine?.mode === "rules+llm" ? "RULES + GROQ" : "RULES ONLY"}
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}

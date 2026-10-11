"use client";

import React, { useState } from "react";
import { PAYEES, type BankState, type Payee } from "../lib/firewall/bank";

interface AccountSnapshotData {
  account_holder?: string;
  account_masked?: string;
  balance?: number;
  balance_paise?: number;
  balance_display?: string;
  daily_transferred?: number;
  daily_transferred_paise?: number;
  daily_remaining?: number;
  limits?: { per_transaction: number; daily: number };
  payees?: Payee[];
}

interface AccountCardProps {
  state: AccountSnapshotData | null;
  onReset: () => Promise<void>;
  isResetting?: boolean;
}

export function AccountCard({ state, onReset, isResetting }: AccountCardProps) {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const balanceNumber =
    state?.balance != null
      ? state.balance
      : state?.balance_paise != null
      ? state.balance_paise / 100
      : 75000;

  const balanceRupees = balanceNumber.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const dailySpent =
    state?.daily_transferred != null
      ? state.daily_transferred
      : state?.daily_transferred_paise != null
      ? state.daily_transferred_paise / 100
      : 0;

  const dailyLimit = state?.limits?.daily ?? 100000;
  const spentPct = Math.min(100, (dailySpent / dailyLimit) * 100);

  const handleReset = async () => {
    try {
      await onReset();
      setResetMessage("Ledger reset to ₹75,000");
      setTimeout(() => setResetMessage(null), 3000);
    } catch {
      setResetMessage("Failed to reset");
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

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
      {/* Top line: Account header & reset action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            SAVINGS ACCOUNT · {state?.account_masked ?? "AC •••• 9012"}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "var(--ink)",
              marginTop: "2px",
            }}
          >
            {state?.account_holder ?? "Demo Customer"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {resetMessage && (
            <span
              className="font-mono"
              style={{ fontSize: "11px", color: "var(--approve)" }}
            >
              {resetMessage}
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="btn-link"
            style={{ fontSize: "12px", color: "var(--ink-3)" }}
            title="Reset ledger balance and transactions to demo state"
          >
            {isResetting ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      </div>

      {/* Big Balance Number */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Available Balance
        </div>
        <div
          className="font-serif tnum"
          style={{
            fontSize: "36px",
            lineHeight: 1.1,
            color: "var(--ink)",
            fontWeight: 400,
            transition: "color 240ms ease-out",
          }}
        >
          ₹{balanceRupees}
        </div>
      </div>

      {/* Daily Spent / Guardrail Progress Bar */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-2)",
            marginBottom: "6px",
          }}
        >
          <span style={{ color: "var(--ink-3)" }}>DAILY SPEND CAP</span>
          <span className="tnum">
            ₹{dailySpent.toLocaleString("en-IN")} / ₹{dailyLimit.toLocaleString("en-IN")}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: "var(--paper)",
            borderRadius: "9999px",
            overflow: "hidden",
            border: "1px solid var(--rule)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${spentPct}%`,
              backgroundColor: spentPct > 80 ? "var(--block)" : "var(--navy)",
              transition: "width 300ms ease-out",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            marginTop: "6px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Single tx limit: ₹50,000 max</span>
          <span>Fail-closed policy</span>
        </div>
      </div>

      {/* Verified Payees Chips */}
      <div>
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Verified Payees
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {PAYEES.map((p: Payee) => (
            <span
              key={p.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                backgroundColor: "var(--paper)",
                border: "1px solid var(--rule)",
                color: "var(--ink-2)",
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

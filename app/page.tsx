"use client";

import React, { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { Hero } from "../components/Hero";
import { AccountCard } from "../components/AccountCard";
import { Composer } from "../components/Composer";
import { Receipt } from "../components/Receipt";
import { RiskDial } from "../components/RiskDial";
import { InspectionLine } from "../components/InspectionLine";
import { JsonPanel } from "../components/JsonPanel";
import { AttackLibrary } from "../components/AttackLibrary";
import { RedTeam } from "../components/RedTeam";
import { Architecture } from "../components/Architecture";
import { Footer } from "../components/Footer";
import type { BankState } from "../lib/firewall/bank";
import type { Verdict } from "../lib/firewall/schema";

export default function Home() {
  const [bankState, setBankState] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Composer form state
  const [message, setMessage] = useState("Transfer 500 to Rahul for lunch");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active verdict
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // Fetch account ledger state
  const fetchAccount = async () => {
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        setBankState(data);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  // Handle reset
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/account/reset", { method: "POST" });
      if (res.ok) {
        await fetchAccount();
      }
    } finally {
      setIsResetting(false);
    }
  };

  // Submit analyze request
  const handleSubmit = async (dryRun: boolean) => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          memo: memo.trim() || null,
          dryRun,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Request failed (HTTP ${res.status})`);
      }

      const data: Verdict = await res.json();
      setVerdict(data);

      // Re-fetch after every executed tool
      if (!dryRun) {
        await fetchAccount();
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Analysis request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Selection from Attack Library
  const handleSelectPayload = (selectedMessage: string, selectedMemo: string | null) => {
    setMessage(selectedMessage);
    setMemo(selectedMemo ?? "");
    setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <Hero />

      {/* Main Console Section */}
      <section id="console" className="section">
        <div className="container">
          <div style={{ marginBottom: "36px" }}>
            <div className="section-eyebrow">Interactive Security Desk</div>
            <h2 className="section-title">Firewall Console</h2>
            <p className="section-desc">
              Inspect user commands before financial execution. Every prompt and memo is treated
              as hostile until proven safe by all 8 security layers.
            </p>
          </div>

          <div className="grid-12">
            {/* Left Column (5 cols): Account Card + Composer */}
            <div style={{ gridColumn: "span 5" }}>
              <AccountCard
                state={bankState}
                onReset={handleReset}
                isResetting={isResetting}
              />
              <Composer
                message={message}
                memo={memo}
                onMessageChange={setMessage}
                onMemoChange={setMemo}
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
              />
            </div>

            {/* Right Column (7 cols): Verdict Receipt + Dial + Inspection Line + Raw JSON */}
            <div style={{ gridColumn: "span 7" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 240px",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Receipt verdict={verdict} loading={loading} />
                </div>
                <div>
                  <RiskDial score={verdict?.risk_score ?? 0} />
                </div>
              </div>

              <InspectionLine pipeline={verdict?.pipeline ?? []} />
              <JsonPanel verdict={verdict} />
            </div>
          </div>
        </div>
      </section>

      <AttackLibrary onSelectPayload={handleSelectPayload} />
      <RedTeam />
      <Architecture />
      <Footer />
    </div>
  );
}

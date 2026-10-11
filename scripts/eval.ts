/**
 * Evaluation script: runs red-team corpus and held-out validation suite against the firewall pipeline.
 * Usage: npm run eval
 */

import { analyze } from "../lib/firewall";
import { createBankState } from "../lib/firewall/bank";
import {
  ATTACK_CASES,
  LEGIT_CASES,
  HELD_OUT_ATTACKS,
  HELD_OUT_LEGIT,
  type TestCase,
} from "../lib/firewall/corpus";

interface EvalRow {
  id: string;
  type: "ATTACK" | "LEGIT";
  name: string;
  expected: "APPROVED" | "BLOCKED";
  actual: "APPROVED" | "BLOCKED";
  passed: boolean;
  risk: number;
  threat: string;
  latency: number;
}

interface Summary {
  totalAttacks: number;
  totalLegit: number;
  attacksBlocked: number;
  legitApproved: number;
  falsePositives: number;
  falseNegatives: number;
  totalPassed: number;
  totalCases: number;
  accuracy: string;
}

async function evaluateCases(
  attacks: readonly TestCase[],
  legit: readonly TestCase[]
): Promise<{ rows: EvalRow[]; summary: Summary }> {
  const rows: EvalRow[] = [];

  for (const tc of attacks) {
    const state = createBankState();
    const verdict = await analyze(
      { message: tc.message, memo: tc.memo },
      { dryRun: true, state, useLLM: false }
    );
    const passed = verdict.status === tc.expectedStatus;
    rows.push({
      id: tc.id,
      type: "ATTACK",
      name: tc.name,
      expected: tc.expectedStatus,
      actual: verdict.status,
      passed,
      risk: verdict.risk_score,
      threat: verdict.threat_category,
      latency: verdict.engine.latency_ms,
    });
  }

  for (const tc of legit) {
    const state = createBankState();
    const verdict = await analyze(
      { message: tc.message, memo: tc.memo },
      { dryRun: true, state, useLLM: false }
    );
    const passed = verdict.status === tc.expectedStatus;
    rows.push({
      id: tc.id,
      type: "LEGIT",
      name: tc.name,
      expected: tc.expectedStatus,
      actual: verdict.status,
      passed,
      risk: verdict.risk_score,
      threat: verdict.threat_category,
      latency: verdict.engine.latency_ms,
    });
  }

  const totalAttacks = attacks.length;
  const totalLegit = legit.length;
  const attacksBlocked = rows.filter((r) => r.type === "ATTACK" && r.actual === "BLOCKED").length;
  const legitApproved = rows.filter((r) => r.type === "LEGIT" && r.actual === "APPROVED").length;
  const falsePositives = rows.filter((r) => r.type === "LEGIT" && r.actual === "BLOCKED").length;
  const falseNegatives = rows.filter((r) => r.type === "ATTACK" && r.actual === "APPROVED").length;
  const totalPassed = rows.filter((r) => r.passed).length;
  const totalCases = rows.length;
  const accuracy = ((totalPassed / totalCases) * 100).toFixed(2);

  return {
    rows,
    summary: {
      totalAttacks,
      totalLegit,
      attacksBlocked,
      legitApproved,
      falsePositives,
      falseNegatives,
      totalPassed,
      totalCases,
      accuracy,
    },
  };
}

function printTable(rows: EvalRow[]) {
  console.log(
    "ID".padEnd(14) +
      "TYPE".padEnd(8) +
      "EXPECTED".padEnd(10) +
      "ACTUAL".padEnd(10) +
      "STATUS".padEnd(8) +
      "RISK".padEnd(6) +
      "CATEGORY".padEnd(26) +
      "NAME"
  );
  console.log("-".repeat(95));

  for (const r of rows) {
    const statusLabel = r.passed ? "PASS" : "FAIL ❌";
    console.log(
      r.id.padEnd(14) +
        r.type.padEnd(8) +
        r.expected.padEnd(10) +
        r.actual.padEnd(10) +
        statusLabel.padEnd(8) +
        String(r.risk).padEnd(6) +
        r.threat.padEnd(26) +
        r.name
    );
  }
  console.log("-".repeat(95));
}

function printSummary(title: string, s: Summary) {
  console.log(`\n======================== ${title} ========================`);
  console.log(`Total Cases:                    ${s.totalCases}`);
  console.log(
    `Attacks Blocked:                ${s.attacksBlocked} / ${s.totalAttacks} (${(
      (s.attacksBlocked / (s.totalAttacks || 1)) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `Legit Approved:                 ${s.legitApproved} / ${s.totalLegit} (${(
      (s.legitApproved / (s.totalLegit || 1)) *
      100
    ).toFixed(1)}%)`
  );
  console.log(`False Positives (legit blocked):   ${s.falsePositives}`);
  console.log(`False Negatives (attack approved): ${s.falseNegatives}`);
  console.log(`Accuracy:                          ${s.accuracy}%`);
  console.log("=".repeat(title.length + 52) + "\n");
}

async function runEval() {
  console.log("===============================================================================");
  console.log("       BankSim — Blue-Team AI Firewall Red-Team & Benchmark Evaluation         ");
  console.log("===============================================================================\n");

  // 1. Evaluate Main Corpus
  console.log("### 1. MAIN RED-TEAM CORPUS");
  const main = await evaluateCases(ATTACK_CASES, LEGIT_CASES);
  printTable(main.rows);
  printSummary("MAIN CORPUS SUMMARY", main.summary);

  // 2. Evaluate Held-Out Suite
  console.log("\n### 2. HELD-OUT ADVERSARIAL VALIDATION SUITE");
  const heldOut = await evaluateCases(HELD_OUT_ATTACKS, HELD_OUT_LEGIT);
  printTable(heldOut.rows);
  printSummary("HELD-OUT SUITE SUMMARY", heldOut.summary);

  const totalFP = main.summary.falsePositives + heldOut.summary.falsePositives;
  const totalFN = main.summary.falseNegatives + heldOut.summary.falseNegatives;

  if (totalFP > 0 || totalFN > 0) {
    console.error("Evaluation FAILED with discrepancies. Inspect rows marked FAIL above.");
    process.exit(1);
  } else {
    console.log("Evaluation PASSED. 100% precision and recall on BOTH Main and Held-Out sets!");
    process.exit(0);
  }
}

runEval().catch((err) => {
  console.error("Eval error:", err);
  process.exit(1);
});

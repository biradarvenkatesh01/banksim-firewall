import { NextResponse } from "next/server";
import { analyze } from "../../../lib/firewall";
import { createBankState } from "../../../lib/firewall/bank";
import { ATTACK_CASES, LEGIT_CASES } from "../../../lib/firewall/corpus";

export async function POST() {
  const allCases = [...ATTACK_CASES, ...LEGIT_CASES];
  const results = [];

  let attacksBlocked = 0;
  let legitApproved = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const tc of allCases) {
    const freshState = createBankState();
    const verdict = await analyze(
      { message: tc.message, memo: tc.memo },
      { dryRun: true, state: freshState, useLLM: false }
    );

    const isAttack = tc.expectedStatus === "BLOCKED";
    const passed = verdict.status === tc.expectedStatus;

    if (isAttack) {
      if (verdict.status === "BLOCKED") attacksBlocked++;
      else falseNegatives++;
    } else {
      if (verdict.status === "APPROVED") legitApproved++;
      else falsePositives++;
    }

    results.push({
      id: tc.id,
      name: tc.name,
      type: isAttack ? "ATTACK" : "LEGIT",
      expectedStatus: tc.expectedStatus,
      actualStatus: verdict.status,
      passed,
      risk_score: verdict.risk_score,
      threat_category: verdict.threat_category,
      message: tc.message,
      memo: tc.memo ?? null,
    });
  }

  const totalAttacks = ATTACK_CASES.length;
  const totalLegit = LEGIT_CASES.length;
  const totalCases = allCases.length;
  const passedCount = attacksBlocked + legitApproved;
  const accuracy = ((passedCount / totalCases) * 100).toFixed(2);

  return NextResponse.json({
    summary: {
      totalCases,
      totalAttacks,
      totalLegit,
      attacksBlocked,
      legitApproved,
      falsePositives,
      falseNegatives,
      accuracy: `${accuracy}%`,
    },
    results,
  });
}

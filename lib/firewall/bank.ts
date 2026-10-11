/**
 * [7] Mock core banking.
 * In-memory ledger; all money is integer paise. Only three allow-listed tools exist,
 * each with a strict argument schema. `transfer` re-validates every limit itself so a
 * bug upstream cannot move money it should not (defence in depth).
 */
import type { ToolName } from "./schema";

export const PER_TXN_LIMIT_PAISE = 50_000_00; // ₹50,000
export const DAILY_LIMIT_PAISE = 1_00_000_00; // ₹1,00,000
export const INITIAL_BALANCE_PAISE = 85_000_00; // ₹85,000
export const MEMO_MAX_LENGTH = 140;
export const HISTORY_MAX_LIMIT = 20;

export interface Payee {
  id: string;
  name: string;
  aliases: string[];
  account_masked: string;
  verified: boolean;
}

export interface Transaction {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount_paise: number;
  payee_id: string;
  payee_name: string;
  counterparty?: string;
  memo: string | null;
  business_date: string;
  time?: string;
  running_balance_paise?: number;
  request_id?: string;
}

export const SEED_TRANSACTIONS: readonly Transaction[] = Object.freeze([
  {
    id: "TXN-00001",
    type: "CREDIT",
    amount_paise: 1_00_000_00,
    payee_id: "payee_employer",
    payee_name: "Infosys Payroll",
    counterparty: "Infosys Ltd (Salary)",
    memo: "Monthly Salary Credit",
    business_date: "2026-10-01",
    time: "2026-10-01T09:30:00.000Z",
    running_balance_paise: 1_00_000_00,
    request_id: "req_seed_salary",
  },
  {
    id: "TXN-00002",
    type: "DEBIT",
    amount_paise: 15_000_00,
    payee_id: "payee_suresh",
    payee_name: "Suresh Kumar",
    counterparty: "Suresh Kumar (Landlord)",
    memo: "Rent Advance Oct 2026",
    business_date: "2026-10-03",
    time: "2026-10-03T14:15:00.000Z",
    running_balance_paise: 85_000_00,
    request_id: "req_seed_rent",
  },
]);

export interface BankState {
  account_holder: string;
  account_masked: string;
  balance_paise: number;
  /** Business date (IST, YYYY-MM-DD) the daily counter refers to. */
  business_date: string;
  daily_transferred_paise: number;
  history: Transaction[];
  next_txn_seq: number;
}

export const PAYEES: readonly Payee[] = Object.freeze([
  {
    id: "payee_rahul",
    name: "Rahul Sharma",
    aliases: ["rahul sharma", "rahul"],
    account_masked: "XXXXXX4521",
    verified: true,
  },
  {
    id: "payee_priya",
    name: "Priya Nair",
    aliases: ["priya nair", "priya"],
    account_masked: "XXXXXX7783",
    verified: true,
  },
  {
    id: "payee_bescom",
    name: "BESCOM Electricity",
    aliases: ["bescom electricity", "electricity bill", "electricity", "power bill", "bescom"],
    account_masked: "XXXXXX0091",
    verified: true,
  },
  {
    id: "payee_suresh",
    name: "Suresh Kumar",
    aliases: ["suresh kumar", "suresh", "landlord", "rent"],
    account_masked: "XXXXXX3310",
    verified: true,
  },
  {
    id: "payee_amma",
    name: "Amma",
    aliases: ["amma", "mom", "mother"],
    account_masked: "XXXXXX2208",
    verified: true,
  },
]);

export function getPayee(id: string): Payee | undefined {
  return PAYEES.find((p) => p.id === id);
}

/** Current business date in IST (Asia/Kolkata), as YYYY-MM-DD. */
export function businessDateIST(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function createBankState(businessDate: string = businessDateIST()): BankState {
  return {
    account_holder: "Demo Customer",
    account_masked: "XXXXXX9012",
    balance_paise: INITIAL_BALANCE_PAISE,
    business_date: businessDate,
    daily_transferred_paise: 0,
    history: [],
    next_txn_seq: 1,
  };
}

/** Reset the daily counter when the business date changes. */
export function rolloverIfNewDay(state: BankState, businessDate: string = businessDateIST()): void {
  if (state.business_date !== businessDate) {
    state.business_date = businessDate;
    state.daily_transferred_paise = 0;
  }
}

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Public, serialisable snapshot of the account (used by GET /api/account). */
export function accountSnapshot(state: BankState) {
  const seedItems = SEED_TRANSACTIONS.map((t) => ({
    id: t.id,
    type: t.type,
    amount_paise: t.amount_paise,
    amount: (t.type === "CREDIT" ? 1 : -1) * (t.amount_paise / 100),
    amount_display: `${t.type === "CREDIT" ? "+" : "-"}${formatINR(t.amount_paise)}`,
    counterparty: t.counterparty ?? t.payee_name,
    memo: t.memo,
    time: t.time ?? "2026-10-01T09:30:00.000Z",
    business_date: t.business_date,
    running_balance: (t.running_balance_paise ?? INITIAL_BALANCE_PAISE) / 100,
    running_balance_display: formatINR(t.running_balance_paise ?? INITIAL_BALANCE_PAISE),
    request_id: t.request_id ?? "req_seed",
  }));

  const historyItems = state.history.map((t) => ({
    id: t.id,
    type: t.type ?? "DEBIT",
    amount_paise: t.amount_paise,
    amount: -1 * (t.amount_paise / 100),
    amount_display: `-${formatINR(t.amount_paise)}`,
    counterparty: t.counterparty ?? t.payee_name,
    memo: t.memo,
    time: t.time ?? new Date().toISOString(),
    business_date: t.business_date,
    running_balance: (t.running_balance_paise ?? state.balance_paise) / 100,
    running_balance_display: formatINR(t.running_balance_paise ?? state.balance_paise),
    request_id: t.request_id ?? "req_manual",
  }));

  const transactions = [...historyItems.slice().reverse(), ...seedItems.slice().reverse()];

  return {
    account_holder: state.account_holder,
    account_masked: state.account_masked,
    balance_paise: state.balance_paise,
    balance: state.balance_paise / 100,
    balance_display: formatINR(state.balance_paise),
    business_date: state.business_date,
    daily_transferred: state.daily_transferred_paise / 100,
    daily_remaining: (DAILY_LIMIT_PAISE - state.daily_transferred_paise) / 100,
    limits: { per_transaction: PER_TXN_LIMIT_PAISE / 100, daily: DAILY_LIMIT_PAISE / 100 },
    payees: PAYEES.map((p) => ({
      id: p.id,
      name: p.name,
      aliases: p.aliases,
      account_masked: p.account_masked,
      verified: p.verified,
    })),
    history: state.history.map((t) => ({ ...t, amount: t.amount_paise / 100 })),
    transactions,
  };
}

// ---------------------------------------------------------------------------
// Tool layer
// ---------------------------------------------------------------------------

export class ToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

type Args = Record<string, unknown>;

function assertPlainObject(args: unknown): asserts args is Args {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new ToolError("INVALID_ARGS", "Tool arguments must be a plain object.");
  }
  const proto = Object.getPrototypeOf(args);
  if (proto !== Object.prototype && proto !== null) {
    throw new ToolError("INVALID_ARGS", "Tool arguments must be a plain object.");
  }
}

function assertOnlyKeys(args: Args, allowed: readonly string[]): void {
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      throw new ToolError("UNKNOWN_ARGUMENT", `Unknown argument "${key}".`);
    }
  }
}

function getBalance(state: BankState, args: unknown) {
  assertPlainObject(args);
  assertOnlyKeys(args, []);
  return {
    balance_paise: state.balance_paise,
    balance: state.balance_paise / 100,
    balance_display: formatINR(state.balance_paise),
  };
}

function getHistory(state: BankState, args: unknown) {
  assertPlainObject(args);
  assertOnlyKeys(args, ["limit"]);
  let limit = 5;
  if (args.limit !== undefined) {
    if (
      typeof args.limit !== "number" ||
      !Number.isInteger(args.limit) ||
      args.limit < 1 ||
      args.limit > HISTORY_MAX_LIMIT
    ) {
      throw new ToolError("INVALID_ARGS", `limit must be an integer 1–${HISTORY_MAX_LIMIT}.`);
    }
    limit = args.limit;
  }
  const items = state.history
    .slice(-limit)
    .reverse()
    .map((t) => ({
      id: t.id,
      amount: t.amount_paise / 100,
      payee: t.payee_name,
      memo: t.memo,
      business_date: t.business_date,
    }));
  return { count: items.length, transactions: items };
}

function transfer(state: BankState, args: unknown) {
  assertPlainObject(args);
  assertOnlyKeys(args, ["payee_id", "amount_paise", "memo"]);
  const { payee_id, amount_paise, memo } = args;

  if (typeof payee_id !== "string") throw new ToolError("INVALID_ARGS", "payee_id is required.");
  const payee = getPayee(payee_id);
  if (!payee || !payee.verified) {
    throw new ToolError("UNVERIFIED_PAYEE", "Recipient is not a verified registered payee.");
  }
  if (typeof amount_paise !== "number" || !Number.isSafeInteger(amount_paise) || amount_paise <= 0) {
    throw new ToolError("INVALID_AMOUNT", "amount_paise must be a positive integer.");
  }
  if (memo !== undefined && memo !== null) {
    if (typeof memo !== "string" || memo.length > MEMO_MAX_LENGTH) {
      throw new ToolError("INVALID_ARGS", `memo must be a string ≤ ${MEMO_MAX_LENGTH} chars.`);
    }
  }
  if (amount_paise > PER_TXN_LIMIT_PAISE) {
    throw new ToolError("PER_TXN_LIMIT", "Amount exceeds the per-transaction limit.");
  }
  if (state.daily_transferred_paise + amount_paise > DAILY_LIMIT_PAISE) {
    throw new ToolError("DAILY_LIMIT", "Amount exceeds the remaining daily limit.");
  }
  if (amount_paise > state.balance_paise) {
    throw new ToolError("INSUFFICIENT_FUNDS", "Insufficient funds.");
  }

  const txn: Transaction = {
    id: `TXN-${String(state.next_txn_seq).padStart(5, "0")}`,
    type: "DEBIT",
    amount_paise,
    payee_id: payee.id,
    payee_name: payee.name,
    counterparty: payee.name,
    memo: (memo as string | null | undefined) ?? null,
    business_date: state.business_date,
    time: new Date().toISOString(),
    running_balance_paise: state.balance_paise - amount_paise,
  };
  state.next_txn_seq += 1;
  state.balance_paise -= amount_paise;
  state.daily_transferred_paise += amount_paise;
  state.history.push(txn);

  return {
    transaction_id: txn.id,
    amount: amount_paise / 100,
    payee: payee.name,
    memo: txn.memo,
    new_balance: state.balance_paise / 100,
    new_balance_display: formatINR(state.balance_paise),
  };
}

const TOOLS: Readonly<Record<ToolName, (state: BankState, args: unknown) => Record<string, unknown>>> =
  Object.freeze({
    get_balance: getBalance,
    get_history: getHistory,
    transfer,
  });

/** The single entry point to financial tools. Unknown tool names are rejected. */
export function executeTool(state: BankState, tool: string, args: unknown): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(TOOLS, tool)) {
    throw new ToolError("UNKNOWN_TOOL", `Tool "${tool}" is not allow-listed.`);
  }
  return TOOLS[tool as ToolName](state, args);
}

// Process-wide singleton used by the API routes. (Serverless instances each have their own.)
const globalForBank = globalThis as unknown as { __banksimState?: BankState };

export function getSharedState(): BankState {
  if (!globalForBank.__banksimState) globalForBank.__banksimState = createBankState();
  return globalForBank.__banksimState;
}

export function resetSharedState(): BankState {
  globalForBank.__banksimState = createBankState();
  return globalForBank.__banksimState;
}

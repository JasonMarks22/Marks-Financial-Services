/**
 * Unified saved scenarios — Supabase data helpers + per-tool validation.
 *
 * ONE table (`saved_scenarios`) backs saving for every tool. Each row's `data`
 * is a JSONB blob of that tool's inputs. Because the database can't validate
 * that shape, THIS module owns validation: every tool has a TypeScript type and
 * a validator that coerces unknown JSON into that type with sensible defaults,
 * so an old scenario never crashes a tool whose inputs changed later.
 *
 * RLS on the table scopes every read/write to the logged-in user, and the table
 * defaults `user_id` to auth.uid(), so we NEVER set user_id from the client.
 * Errors come back as plain strings (never thrown) for the UI to display.
 * Scenario contents are never logged.
 */

import { supabase } from "@/lib/supabase/client";
import type { BudgetCategory } from "@/lib/finance/budget";

export type ToolKey =
  | "savings_goal"
  | "mortgage"
  | "budget"
  | "allocator"
  | "debt_payoff"
  | "retirement"
  | "monte_carlo"
  | "compare"
  | "backtest";

export const TOOL_KEYS: ToolKey[] = [
  "savings_goal",
  "mortgage",
  "budget",
  "allocator",
  "debt_payoff",
  "retirement",
  "monte_carlo",
  "compare",
  "backtest",
];

/** A row as it comes back from Supabase. `data` is validated per-tool on use. */
export interface SavedScenarioRow {
  id: string;
  tool: ToolKey;
  name: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* ---- coercion helpers -------------------------------------------------- */

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return fallback;
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/* ---- per-tool data types ----------------------------------------------- */

export interface SavingsGoalData {
  goal_amount: number;
  current_savings: number;
  years: number;
  annual_rate_percent: number;
}
export interface MortgageData {
  home_price: number;
  down_payment: number;
  term_years: number;
  interest_rate: number;
  annual_property_tax: number;
  annual_insurance: number;
  monthly_hoa: number;
  extra_monthly: number;
}
export interface BudgetData {
  monthly_income: number;
  categories: BudgetCategory[];
}
export interface AllocatorData {
  monthly_leftover: number;
  current_emergency_fund: number;
  monthly_essential_expenses: number;
  current_checking_buffer: number;
  has_high_interest_debt: boolean;
}
export interface DebtRowData {
  name: string;
  balance: number;
  rate: number;
  min_payment: number;
}
export interface DebtPayoffData {
  debts: DebtRowData[];
  extra: number;
}
export interface RetirementData {
  current_age: number;
  retirement_age: number;
  current_savings: number;
  monthly_contribution: number;
  annual_return_percent: number;
  inflation_on: boolean;
  annual_inflation_percent: number;
}
export interface MonteCarloData {
  initial: number;
  monthly: number;
  years: number;
  expected_return: number;
  volatility: number;
  goal: number;
}
export interface CompareData {
  symbols: string[];
  range: string;
}
export interface BacktestData {
  selected_ids: string[];
  range: string;
}

const VALID_BUCKETS = new Set(["needs", "wants", "savings"]);

/* ---- validators (unknown JSON -> normalized data, defaults for gaps) ---- */

const VALIDATORS: Record<ToolKey, (data: unknown) => unknown> = {
  savings_goal: (d): SavingsGoalData => {
    const o = rec(d);
    return {
      goal_amount: asNum(o.goal_amount, 50000),
      current_savings: asNum(o.current_savings, 5000),
      years: asNum(o.years, 10),
      annual_rate_percent: asNum(o.annual_rate_percent, 4),
    };
  },
  mortgage: (d): MortgageData => {
    const o = rec(d);
    return {
      home_price: asNum(o.home_price, 400000),
      down_payment: asNum(o.down_payment, 60000),
      term_years: asNum(o.term_years, 30),
      interest_rate: asNum(o.interest_rate, 6.5),
      annual_property_tax: asNum(o.annual_property_tax, 4800),
      annual_insurance: asNum(o.annual_insurance, 1800),
      monthly_hoa: asNum(o.monthly_hoa, 0),
      extra_monthly: asNum(o.extra_monthly, 0),
    };
  },
  budget: (d): BudgetData => {
    const o = rec(d);
    const rawCats = Array.isArray(o.categories) ? o.categories : [];
    const categories: BudgetCategory[] = rawCats.map((c) => {
      const co = rec(c);
      const bucket = asStr(co.bucket, "needs");
      return {
        name: asStr(co.name, "Category"),
        amount: asNum(co.amount, 0),
        bucket: (VALID_BUCKETS.has(bucket) ? bucket : "needs") as BudgetCategory["bucket"],
      };
    });
    return { monthly_income: asNum(o.monthly_income, 4500), categories };
  },
  allocator: (d): AllocatorData => {
    const o = rec(d);
    return {
      monthly_leftover: asNum(o.monthly_leftover, 800),
      current_emergency_fund: asNum(o.current_emergency_fund, 2000),
      monthly_essential_expenses: asNum(o.monthly_essential_expenses, 2500),
      current_checking_buffer: asNum(o.current_checking_buffer, 1500),
      has_high_interest_debt: asBool(o.has_high_interest_debt, false),
    };
  },
  debt_payoff: (d): DebtPayoffData => {
    const o = rec(d);
    const rawDebts = Array.isArray(o.debts) ? o.debts : [];
    const debts: DebtRowData[] = rawDebts.map((r) => {
      const ro = rec(r);
      return {
        name: asStr(ro.name, "Debt"),
        balance: asNum(ro.balance, 0),
        rate: asNum(ro.rate, 0),
        min_payment: asNum(ro.min_payment, 0),
      };
    });
    return { debts, extra: asNum(o.extra, 0) };
  },
  retirement: (d): RetirementData => {
    const o = rec(d);
    return {
      current_age: asNum(o.current_age, 30),
      retirement_age: asNum(o.retirement_age, 65),
      current_savings: asNum(o.current_savings, 25000),
      monthly_contribution: asNum(o.monthly_contribution, 500),
      annual_return_percent: asNum(o.annual_return_percent, 7),
      inflation_on: asBool(o.inflation_on, true),
      annual_inflation_percent: asNum(o.annual_inflation_percent, 2.5),
    };
  },
  monte_carlo: (d): MonteCarloData => {
    const o = rec(d);
    return {
      initial: asNum(o.initial, 10000),
      monthly: asNum(o.monthly, 500),
      years: asNum(o.years, 20),
      expected_return: asNum(o.expected_return, 7),
      volatility: asNum(o.volatility, 15),
      goal: asNum(o.goal, 0),
    };
  },
  compare: (d): CompareData => {
    const o = rec(d);
    return {
      symbols: asStrArray(o.symbols).slice(0, 5),
      range: asStr(o.range, "1y"),
    };
  },
  backtest: (d): BacktestData => {
    const o = rec(d);
    return {
      selected_ids: asStrArray(o.selected_ids),
      range: asStr(o.range, "3y"),
    };
  },
};

/** Validate/normalize a scenario's data for a given tool. Never throws. */
export function validateScenarioData(
  tool: ToolKey,
  data: unknown,
): Record<string, unknown> {
  const fn = VALIDATORS[tool];
  return rec(fn ? fn(data) : data);
}

/* ---- per-tool display metadata (for the My Scenarios page) ------------- */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export interface ToolMeta {
  label: string;
  /** Base path the "Open" action deep-links into (with ?scenario=<id>). */
  path: string;
  /** One-line summary of a saved scenario's inputs. */
  summarize: (data: Record<string, unknown>) => string;
}

export const TOOL_META: Record<ToolKey, ToolMeta> = {
  savings_goal: {
    label: "Savings Goal",
    path: "/tools/savings-goal",
    summarize: (raw) => {
      const d = raw as unknown as SavingsGoalData;
      return `${usd.format(d.goal_amount)} goal · ${usd.format(d.current_savings)} saved · ${d.years} yrs @ ${d.annual_rate_percent}%`;
    },
  },
  mortgage: {
    label: "Mortgage",
    path: "/tools/mortgage",
    summarize: (raw) => {
      const d = raw as unknown as MortgageData;
      return `${usd.format(d.home_price)} home · ${usd.format(d.down_payment)} down · ${d.term_years} yrs @ ${d.interest_rate}%`;
    },
  },
  budget: {
    label: "Budget",
    path: "/tools/budget",
    summarize: (raw) => {
      const d = raw as unknown as BudgetData;
      return `${usd.format(d.monthly_income)}/mo income · ${d.categories.length} ${d.categories.length === 1 ? "category" : "categories"}`;
    },
  },
  allocator: {
    label: "Savings Allocator",
    path: "/tools/allocator",
    summarize: (raw) => {
      const d = raw as unknown as AllocatorData;
      return `${usd.format(d.monthly_leftover)}/mo leftover · ${usd.format(d.current_emergency_fund)} emergency fund`;
    },
  },
  debt_payoff: {
    label: "Debt Payoff",
    path: "/tools/debt-payoff",
    summarize: (raw) => {
      const d = raw as unknown as DebtPayoffData;
      const total = d.debts.reduce((s, x) => s + x.balance, 0);
      return `${d.debts.length} ${d.debts.length === 1 ? "debt" : "debts"} · ${usd.format(total)} total · +${usd.format(d.extra)}/mo`;
    },
  },
  retirement: {
    label: "Retirement Projector",
    path: "/tools/retirement",
    summarize: (raw) => {
      const d = raw as unknown as RetirementData;
      return `age ${d.current_age} → ${d.retirement_age} · ${usd.format(d.monthly_contribution)}/mo @ ${d.annual_return_percent}%`;
    },
  },
  monte_carlo: {
    label: "Monte Carlo Simulator",
    path: "/tools/monte-carlo",
    summarize: (raw) => {
      const d = raw as unknown as MonteCarloData;
      return `${usd.format(d.initial)} start · ${usd.format(d.monthly)}/mo · ${d.years} yrs @ ${d.expected_return}% ± ${d.volatility}%`;
    },
  },
  compare: {
    label: "Compare Securities",
    path: "/compare",
    summarize: (raw) => {
      const d = raw as unknown as CompareData;
      return d.symbols.length > 0 ? d.symbols.join(", ") : "No securities";
    },
  },
  backtest: {
    label: "Portfolio Backtest",
    path: "/portfolios/compare",
    summarize: (raw) => {
      const d = raw as unknown as BacktestData;
      return `${d.selected_ids.length} ${d.selected_ids.length === 1 ? "portfolio" : "portfolios"} · ${d.range} window`;
    },
  },
};

/* ---- CRUD -------------------------------------------------------------- */

export async function listScenarios(
  tool?: ToolKey,
): Promise<{ data: SavedScenarioRow[]; error: string | null }> {
  let query = supabase
    .from("saved_scenarios")
    .select("*")
    .order("updated_at", { ascending: false });
  if (tool) query = query.eq("tool", tool);
  const { data, error } = await query;
  return {
    data: (data as SavedScenarioRow[]) ?? [],
    error: error ? error.message : null,
  };
}

export async function getScenario(
  id: string,
): Promise<{ data: SavedScenarioRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("saved_scenarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return {
    data: (data as SavedScenarioRow) ?? null,
    error: error ? error.message : null,
  };
}

/** Insert a new scenario. `user_id` is omitted (table defaults it to auth.uid()). */
export async function createScenario(
  tool: ToolKey,
  name: string,
  data: unknown,
): Promise<{ data: SavedScenarioRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("saved_scenarios")
    .insert({ tool, name, data })
    .select("*")
    .single();
  return {
    data: (row as SavedScenarioRow) ?? null,
    error: error ? error.message : null,
  };
}

export async function updateScenario(
  id: string,
  patch: { name?: string; data?: unknown },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("saved_scenarios")
    .update(patch)
    .eq("id", id);
  return { error: error ? error.message : null };
}

export async function deleteScenario(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("saved_scenarios").delete().eq("id", id);
  return { error: error ? error.message : null };
}

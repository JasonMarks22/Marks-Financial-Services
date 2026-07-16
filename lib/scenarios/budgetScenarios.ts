/**
 * Saved budget scenarios — Supabase data helpers (no UI).
 *
 * Mirrors the other scenario helpers, but for the `budget_scenarios` table.
 * The budget is different from the other calculators: its categories are a
 * DYNAMIC user-edited list, so the whole array is stored in a single jsonb
 * column (`categories`) rather than one column per input. Supabase returns
 * jsonb as the same array of objects it was saved as, so no extra
 * serialization is needed on either side.
 *
 * The table has Row Level Security enabled and defaults `user_id` to the
 * logged-in user (auth.uid()), so:
 *   - we NEVER set user_id from the client, and
 *   - selects only ever return the current user's own rows.
 *
 * Every function returns errors as plain strings (never throws) so UI code can
 * show them directly.
 */

import { supabase } from "@/lib/supabase/client";
import type { BudgetCategory } from "@/lib/finance/budget";

/** A full row as it comes back from Supabase. */
export interface BudgetScenarioRow {
  id: string;
  name: string;
  monthly_income: number;
  /** The full category list, exactly as saved (name, amount, bucket each). */
  categories: BudgetCategory[];
  created_at: string;
}

/**
 * Insert a new scenario. The categories array goes straight into the jsonb
 * column. `user_id` is intentionally omitted — the table defaults it to the
 * logged-in user.
 */
export async function saveBudgetScenario(
  name: string,
  monthlyIncome: number,
  categories: BudgetCategory[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("budget_scenarios")
    .insert({ name, monthly_income: monthlyIncome, categories });

  return { error: error ? error.message : null };
}

/**
 * Fetch the current user's scenarios, newest first. RLS scopes the select to
 * the logged-in user automatically.
 */
export async function getBudgetScenarios(): Promise<{
  data: BudgetScenarioRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("budget_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: (data as BudgetScenarioRow[]) ?? [],
    error: error ? error.message : null,
  };
}

/**
 * Fetch a single scenario by id — used by the budget page's "Load" flow,
 * which passes just the id in the URL (the category list is too large for
 * query params). RLS means this only ever finds the user's own rows.
 */
export async function getBudgetScenario(id: string): Promise<{
  data: BudgetScenarioRow | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("budget_scenarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: (data as BudgetScenarioRow) ?? null,
    error: error ? error.message : null,
  };
}

/** Delete one scenario by id (RLS restricts this to the user's own rows). */
export async function deleteBudgetScenario(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("budget_scenarios")
    .delete()
    .eq("id", id);

  return { error: error ? error.message : null };
}

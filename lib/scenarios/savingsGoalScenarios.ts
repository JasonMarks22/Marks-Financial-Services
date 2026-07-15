/**
 * Saved savings-goal scenarios — Supabase data helpers (no UI).
 *
 * Mirrors lib/scenarios/mortgageScenarios.ts, but for the
 * `savings_goal_scenarios` table. That table has Row Level Security enabled
 * and defaults `user_id` to the logged-in user (auth.uid()), so:
 *   - we NEVER set user_id from the client, and
 *   - selects only ever return the current user's own rows.
 *
 * Every function returns errors as plain strings (never throws) so UI code can
 * show them directly.
 */

import { supabase } from "@/lib/supabase/client";

/** The calculator inputs we persist, matching the table's column names. */
export interface SavingsGoalScenarioInputs {
  goal_amount: number;
  current_savings: number;
  years: number;
  annual_rate_percent: number;
}

/** A full row as it comes back from Supabase. */
export interface SavingsGoalScenarioRow extends SavingsGoalScenarioInputs {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Insert a new scenario. `user_id` is intentionally omitted — the table
 * defaults it to the logged-in user.
 */
export async function saveSavingsGoalScenario(
  name: string,
  inputs: SavingsGoalScenarioInputs,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("savings_goal_scenarios")
    .insert({ name, ...inputs });

  return { error: error ? error.message : null };
}

/**
 * Fetch the current user's scenarios, newest first. RLS scopes the select to
 * the logged-in user automatically.
 */
export async function getSavingsGoalScenarios(): Promise<{
  data: SavingsGoalScenarioRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("savings_goal_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: (data as SavingsGoalScenarioRow[]) ?? [],
    error: error ? error.message : null,
  };
}

/** Delete one scenario by id (RLS restricts this to the user's own rows). */
export async function deleteSavingsGoalScenario(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("savings_goal_scenarios")
    .delete()
    .eq("id", id);

  return { error: error ? error.message : null };
}

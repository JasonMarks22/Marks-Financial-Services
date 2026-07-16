/**
 * Saved savings-allocator scenarios — Supabase data helpers (no UI).
 *
 * Mirrors the other scenario helpers (mortgageScenarios.ts,
 * savingsGoalScenarios.ts), but for the `allocator_scenarios` table. That
 * table has Row Level Security enabled and defaults `user_id` to the
 * logged-in user (auth.uid()), so:
 *   - we NEVER set user_id from the client, and
 *   - selects only ever return the current user's own rows.
 *
 * Every function returns errors as plain strings (never throws) so UI code can
 * show them directly.
 */

import { supabase } from "@/lib/supabase/client";

/** The allocator inputs we persist, matching the table's column names. */
export interface AllocatorScenarioInputs {
  monthly_leftover: number;
  current_emergency_fund: number;
  monthly_essential_expenses: number;
  current_checking_buffer: number;
  has_high_interest_debt: boolean;
}

/** A full row as it comes back from Supabase. */
export interface AllocatorScenarioRow extends AllocatorScenarioInputs {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Insert a new scenario. `user_id` is intentionally omitted — the table
 * defaults it to the logged-in user.
 */
export async function saveAllocatorScenario(
  name: string,
  inputs: AllocatorScenarioInputs,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("allocator_scenarios")
    .insert({ name, ...inputs });

  return { error: error ? error.message : null };
}

/**
 * Fetch the current user's scenarios, newest first. RLS scopes the select to
 * the logged-in user automatically.
 */
export async function getAllocatorScenarios(): Promise<{
  data: AllocatorScenarioRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("allocator_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: (data as AllocatorScenarioRow[]) ?? [],
    error: error ? error.message : null,
  };
}

/** Delete one scenario by id (RLS restricts this to the user's own rows). */
export async function deleteAllocatorScenario(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("allocator_scenarios")
    .delete()
    .eq("id", id);

  return { error: error ? error.message : null };
}

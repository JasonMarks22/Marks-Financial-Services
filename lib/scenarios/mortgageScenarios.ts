/**
 * Saved mortgage scenarios — Supabase data helpers (no UI).
 *
 * All three functions talk to the `mortgage_scenarios` table through the shared
 * Supabase client. The table has Row Level Security enabled and defaults
 * `user_id` to the logged-in user (auth.uid()), so:
 *   - we NEVER set user_id from the client, and
 *   - selects only ever return the current user's own rows.
 *
 * Every function returns errors as plain strings (never throws) so UI code can
 * show them directly.
 *
 * NOTE: until RLS *policies* are added to the table, inserts/deletes will fail
 * with a row-level-security error and selects will come back empty. That is
 * expected for now — policies are the next step.
 */

import { supabase } from "@/lib/supabase/client";

/** The calculator inputs we persist, matching the table's column names. */
export interface MortgageScenarioInputs {
  home_price: number;
  down_payment: number;
  term_years: number;
  interest_rate: number;
  annual_property_tax: number;
  annual_insurance: number;
  monthly_hoa: number;
  extra_monthly: number;
}

/** A full row as it comes back from Supabase. */
export interface MortgageScenarioRow extends MortgageScenarioInputs {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Insert a new scenario. `user_id` is intentionally omitted — the table
 * defaults it to the logged-in user, which keeps the client from ever being
 * able to write rows on someone else's behalf.
 */
export async function saveMortgageScenario(
  name: string,
  inputs: MortgageScenarioInputs,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("mortgage_scenarios")
    .insert({ name, ...inputs });

  return { error: error ? error.message : null };
}

/**
 * Fetch the current user's scenarios, newest first. RLS scopes the select to
 * the logged-in user automatically.
 */
export async function getMortgageScenarios(): Promise<{
  data: MortgageScenarioRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("mortgage_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: (data as MortgageScenarioRow[]) ?? [],
    error: error ? error.message : null,
  };
}

/** Delete one scenario by id (RLS restricts this to the user's own rows). */
export async function deleteMortgageScenario(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("mortgage_scenarios")
    .delete()
    .eq("id", id);

  return { error: error ? error.message : null };
}

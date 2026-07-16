/**
 * User-built portfolios — Supabase data helpers (no UI).
 *
 * Follows the same pattern as the scenario helpers (lib/scenarios/*): the
 * `user_portfolios` table has Row Level Security enabled and defaults
 * `user_id` to the logged-in user (auth.uid()), so:
 *   - we NEVER set user_id from the client, and
 *   - selects only ever return the current user's own rows.
 *
 * The holdings list ({symbol, weight} pairs, weights summing to 100, "CASH"
 * allowed as a pseudo-symbol) is stored in a single jsonb column, like the
 * budget calculator's categories.
 *
 * Every function returns errors as plain strings (never throws) so UI code can
 * show them directly.
 */

import { supabase } from "@/lib/supabase/client";

/** One holding in a user portfolio. "CASH" represents a cash allocation. */
export interface UserHolding {
  symbol: string;
  /** Percent of the portfolio; a valid portfolio's weights sum to 100. */
  weight: number;
}

/** A full row as it comes back from Supabase. */
export interface UserPortfolioRow {
  id: string;
  name: string;
  target_profile: string;
  holdings: UserHolding[];
  created_at: string;
}

/**
 * Insert a new portfolio. `user_id` is intentionally omitted — the table
 * defaults it to the logged-in user.
 */
export async function saveUserPortfolio(
  name: string,
  targetProfile: string,
  holdings: UserHolding[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_portfolios")
    .insert({ name, target_profile: targetProfile, holdings });

  return { error: error ? error.message : null };
}

/**
 * Fetch the current user's portfolios, newest first. RLS scopes the select to
 * the logged-in user automatically.
 */
export async function getUserPortfolios(): Promise<{
  data: UserPortfolioRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("user_portfolios")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: (data as UserPortfolioRow[]) ?? [],
    error: error ? error.message : null,
  };
}

/**
 * Fetch a single portfolio by id — used by the builder's edit flow, which
 * passes just the id in the URL. RLS means this only finds the user's rows.
 */
export async function getUserPortfolio(id: string): Promise<{
  data: UserPortfolioRow | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("user_portfolios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: (data as UserPortfolioRow) ?? null,
    error: error ? error.message : null,
  };
}

/** Update one portfolio's name, profile, and holdings (owner-only via RLS). */
export async function updateUserPortfolio(
  id: string,
  name: string,
  targetProfile: string,
  holdings: UserHolding[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_portfolios")
    .update({ name, target_profile: targetProfile, holdings })
    .eq("id", id);

  return { error: error ? error.message : null };
}

/** Delete one portfolio by id (RLS restricts this to the user's own rows). */
export async function deleteUserPortfolio(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_portfolios")
    .delete()
    .eq("id", id);

  return { error: error ? error.message : null };
}

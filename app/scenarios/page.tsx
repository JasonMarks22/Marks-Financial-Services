"use client";

/**
 * "My saved scenarios" page.
 *
 * Logged out → friendly message + link to log in (nothing is blocked or
 * redirected). Logged in → lists the user's saved scenarios.
 *
 * Structured by calculator type: today only mortgage scenarios exist, but each
 * type gets its own section, so adding savings-goal/budget/allocator scenarios
 * later means adding another section rather than reworking the page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteMortgageScenario,
  getMortgageScenarios,
  type MortgageScenarioRow,
} from "@/lib/scenarios/mortgageScenarios";
import {
  deleteSavingsGoalScenario,
  getSavingsGoalScenarios,
  type SavingsGoalScenarioRow,
} from "@/lib/scenarios/savingsGoalScenarios";
import {
  deleteAllocatorScenario,
  getAllocatorScenarios,
  type AllocatorScenarioRow,
} from "@/lib/scenarios/allocatorScenarios";
import {
  deleteBudgetScenario,
  getBudgetScenarios,
  type BudgetScenarioRow,
} from "@/lib/scenarios/budgetScenarios";

const NAVY = "#002E5D";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Build the mortgage-calculator URL that pre-fills this scenario's inputs. */
function mortgageLoadHref(row: MortgageScenarioRow): string {
  const params = new URLSearchParams({
    homePrice: String(row.home_price),
    downPayment: String(row.down_payment),
    termYears: String(row.term_years),
    rate: String(row.interest_rate),
    propertyTax: String(row.annual_property_tax),
    insurance: String(row.annual_insurance),
    hoa: String(row.monthly_hoa),
    extra: String(row.extra_monthly),
  });
  return `/tools/mortgage?${params.toString()}`;
}

/** Build the savings-goal URL that pre-fills this scenario's inputs. */
function savingsGoalLoadHref(row: SavingsGoalScenarioRow): string {
  const params = new URLSearchParams({
    goalAmount: String(row.goal_amount),
    currentSavings: String(row.current_savings),
    years: String(row.years),
    rate: String(row.annual_rate_percent),
  });
  return `/tools/savings-goal?${params.toString()}`;
}

/** Build the allocator URL that pre-fills this scenario's inputs. */
function allocatorLoadHref(row: AllocatorScenarioRow): string {
  const params = new URLSearchParams({
    leftover: String(row.monthly_leftover),
    emergencyFund: String(row.current_emergency_fund),
    essentials: String(row.monthly_essential_expenses),
    checkingBuffer: String(row.current_checking_buffer),
    hasDebt: row.has_high_interest_debt ? "1" : "0",
  });
  return `/tools/allocator?${params.toString()}`;
}

export default function ScenariosPage() {
  const { user, loading } = useAuth();

  const [rows, setRows] = useState<MortgageScenarioRow[] | null>(null);
  const [sgRows, setSgRows] = useState<SavingsGoalScenarioRow[] | null>(null);
  const [allocRows, setAllocRows] = useState<AllocatorScenarioRow[] | null>(null);
  const [budgetRows, setBudgetRows] = useState<BudgetScenarioRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's scenarios (both calculator types) once we know who they
  // are. (No state reset is needed on logout — the logged-out branch below
  // doesn't render rows, and a fresh login triggers a refetch.)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      getMortgageScenarios(),
      getSavingsGoalScenarios(),
      getAllocatorScenarios(),
      getBudgetScenarios(),
    ]).then(([mortgage, savingsGoal, allocator, budget]) => {
      if (cancelled) return;
      setRows(mortgage.data);
      setSgRows(savingsGoal.data);
      setAllocRows(allocator.data);
      setBudgetRows(budget.data);
      setError(
        mortgage.error ?? savingsGoal.error ?? allocator.error ?? budget.error,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleDelete(row: MortgageScenarioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteMortgageScenario(row.id);
    if (error) {
      setError(`Couldn't delete: ${error}`);
    } else {
      setRows((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
    }
  }

  async function handleDeleteSavingsGoal(row: SavingsGoalScenarioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteSavingsGoalScenario(row.id);
    if (error) {
      setError(`Couldn't delete: ${error}`);
    } else {
      setSgRows((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
    }
  }

  async function handleDeleteAllocator(row: AllocatorScenarioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteAllocatorScenario(row.id);
    if (error) {
      setError(`Couldn't delete: ${error}`);
    } else {
      setAllocRows((prev) =>
        prev ? prev.filter((r) => r.id !== row.id) : prev,
      );
    }
  }

  async function handleDeleteBudget(row: BudgetScenarioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteBudgetScenario(row.id);
    if (error) {
      setError(`Couldn't delete: ${error}`);
    } else {
      setBudgetRows((prev) =>
        prev ? prev.filter((r) => r.id !== row.id) : prev,
      );
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-white px-6 py-16 text-neutral-900">
      <div className="w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          ← Back to home
        </Link>

        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: NAVY }}
        >
          My saved scenarios
        </h1>

        {loading ? null : !user ? (
          // Logged out: invite, don't block.
          <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <p className="text-neutral-600">
              Saved scenarios live with your account.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: NAVY }}
            >
              Log in to see yours
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            {/* ---- Mortgage scenarios (more calculator types can follow) ---- */}
            <section className="mt-8">
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
                Mortgage calculator
              </h2>

              {rows === null && !error ? (
                <p className="mt-4 text-sm text-neutral-400">Loading…</p>
              ) : rows && rows.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-600">
                          {usd.format(row.home_price)} home ·{" "}
                          {usd.format(row.down_payment)} down ·{" "}
                          {row.term_years} yrs @ {row.interest_rate}%
                          {row.extra_monthly > 0 &&
                            ` · +${usd.format(row.extra_monthly)}/mo extra`}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          Saved {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={mortgageLoadHref(row)}
                          className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
                          style={{ backgroundColor: NAVY }}
                        >
                          Load
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                  No saved mortgage scenarios yet. Run the{" "}
                  <Link
                    href="/tools/mortgage"
                    className="font-medium underline underline-offset-2"
                    style={{ color: NAVY }}
                  >
                    mortgage calculator
                  </Link>{" "}
                  and hit “Save scenario”.
                </p>
              )}
            </section>

            {/* ---- Savings-goal scenarios ---- */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
                Savings goal calculator
              </h2>

              {sgRows === null && !error ? (
                <p className="mt-4 text-sm text-neutral-400">Loading…</p>
              ) : sgRows && sgRows.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {sgRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-600">
                          {usd.format(row.goal_amount)} goal ·{" "}
                          {usd.format(row.current_savings)} saved ·{" "}
                          {row.years} yrs @ {row.annual_rate_percent}%
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          Saved {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={savingsGoalLoadHref(row)}
                          className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
                          style={{ backgroundColor: NAVY }}
                        >
                          Load
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavingsGoal(row)}
                          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                  No saved savings-goal scenarios yet. Run the{" "}
                  <Link
                    href="/tools/savings-goal"
                    className="font-medium underline underline-offset-2"
                    style={{ color: NAVY }}
                  >
                    savings goal calculator
                  </Link>{" "}
                  and hit “Save scenario”.
                </p>
              )}
            </section>

            {/* ---- Allocator scenarios ---- */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
                Savings allocator
              </h2>

              {allocRows === null && !error ? (
                <p className="mt-4 text-sm text-neutral-400">Loading…</p>
              ) : allocRows && allocRows.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {allocRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-600">
                          {usd.format(row.monthly_leftover)}/mo leftover ·{" "}
                          {usd.format(row.current_emergency_fund)} emergency
                          fund · {usd.format(row.monthly_essential_expenses)}
                          /mo essentials
                          {row.has_high_interest_debt && " · has high-interest debt"}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          Saved {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={allocatorLoadHref(row)}
                          className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
                          style={{ backgroundColor: NAVY }}
                        >
                          Load
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteAllocator(row)}
                          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                  No saved allocator scenarios yet. Run the{" "}
                  <Link
                    href="/tools/allocator"
                    className="font-medium underline underline-offset-2"
                    style={{ color: NAVY }}
                  >
                    savings allocator
                  </Link>{" "}
                  and hit “Save scenario”.
                </p>
              )}
            </section>

            {/* ---- Budget scenarios ---- */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
                Budget calculator
              </h2>

              {budgetRows === null && !error ? (
                <p className="mt-4 text-sm text-neutral-400">Loading…</p>
              ) : budgetRows && budgetRows.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {budgetRows.map((row) => {
                    const totalSpending = row.categories.reduce(
                      (sum, c) => sum + (Number.isFinite(c.amount) ? c.amount : 0),
                      0,
                    );
                    return (
                      <li
                        key={row.id}
                        className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-neutral-900">
                            {row.name}
                          </p>
                          <p className="mt-0.5 text-sm text-neutral-600">
                            {usd.format(row.monthly_income)}/mo income ·{" "}
                            {row.categories.length}{" "}
                            {row.categories.length === 1
                              ? "category"
                              : "categories"}{" "}
                            · {usd.format(totalSpending)} total spending
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-400">
                            Saved{" "}
                            {new Date(row.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/tools/budget?scenario=${row.id}`}
                            className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
                            style={{ backgroundColor: NAVY }}
                          >
                            Load
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(row)}
                            className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                  No saved budget scenarios yet. Run the{" "}
                  <Link
                    href="/tools/budget"
                    className="font-medium underline underline-offset-2"
                    style={{ color: NAVY }}
                  >
                    budget calculator
                  </Link>{" "}
                  and hit “Save scenario”.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

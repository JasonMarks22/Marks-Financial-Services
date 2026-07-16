/**
 * Debt payoff math (pure calculation module — no UI).
 *
 * Simulates paying off a set of debts month by month under BOTH classic
 * strategies and reports the difference:
 *
 *   - AVALANCHE: extra money attacks the HIGHEST-interest-rate debt first
 *     (mathematically optimal — minimizes total interest).
 *   - SNOWBALL: extra money attacks the SMALLEST-balance debt first
 *     (psychologically motivating — quick wins).
 *
 * Shared mechanics (both strategies):
 *   1. Each month every debt accrues interest: balance * (rate/100/12).
 *      Debts at 0% simply accrue nothing.
 *   2. Each debt receives its minimum payment (never more than its balance;
 *      any unused part of a minimum joins the extra pool that month).
 *   3. The extra pool — extraMonthly plus the minimums FREED UP by already
 *      paid-off debts (the "snowball" effect) — goes to the strategy's target
 *      debt; if that debt dies mid-payment, the remainder cascades to the
 *      next target the same month.
 *
 * INFINITE-LOOP GUARD: if a month ends with the total balance not lower than
 * it started (payments aren't outrunning interest), the simulation stops and
 * reports which debts' minimums can't cover their interest, instead of
 * looping forever. A hard cap of 1200 months (100 years) backs that up.
 */

export interface DebtInput {
  name: string;
  balance: number;
  annualRatePercent: number;
  minimumPayment: number;
}

export interface StrategyResult {
  strategy: "avalanche" | "snowball";
  /** Months until every debt reaches zero. */
  payoffMonths: number;
  /** Total interest paid across all debts. */
  totalInterest: number;
  /** Total remaining debt at the end of each month (month 0 = today). */
  series: { month: number; totalBalance: number }[];
  /** Debt names in the order they were fully paid off. */
  payoffOrder: string[];
}

export interface DebtPayoffResult {
  /** Null when the simulation had to abort (see warnings). */
  avalanche: StrategyResult | null;
  snowball: StrategyResult | null;
  /** Snowball interest minus avalanche interest (>= 0 in practice). */
  interestSavedByAvalanche: number | null;
  /** Clear notes, e.g. minimum payments that can't cover interest. */
  warnings: string[];
}

const MAX_MONTHS = 1200; // hard cap: 100 years
const EPSILON = 0.005; // balances below half a cent count as zero

interface SimDebt extends DebtInput {
  remaining: number;
  paidOff: boolean;
}

/**
 * Run one strategy. `pickTarget` chooses which active debt receives extra
 * money (highest rate for avalanche, smallest balance for snowball).
 */
function simulate(
  debts: DebtInput[],
  extraMonthly: number,
  strategy: "avalanche" | "snowball",
): { result: StrategyResult | null; warning: string | null } {
  const state: SimDebt[] = debts.map((d) => ({
    ...d,
    remaining: d.balance,
    paidOff: false,
  }));

  const pickTarget = (): SimDebt | null => {
    const active = state.filter((d) => !d.paidOff);
    if (active.length === 0) return null;
    return active.reduce((best, d) =>
      strategy === "avalanche"
        ? d.annualRatePercent > best.annualRatePercent
          ? d
          : best
        : d.remaining < best.remaining
          ? d
          : best,
    );
  };

  const total = () => state.reduce((s, d) => s + d.remaining, 0);

  const series = [{ month: 0, totalBalance: total() }];
  const payoffOrder: string[] = [];
  let totalInterest = 0;
  let freedMinimums = 0; // minimums of debts already paid off in prior months

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const totalAtStart = total();

    // 1. Interest accrual (0%-rate debts add nothing).
    for (const d of state) {
      if (d.paidOff) continue;
      const interest = (d.remaining * d.annualRatePercent) / 100 / 12;
      d.remaining += interest;
      totalInterest += interest;
    }

    // 2. Minimum payments; unused slack from near-dead debts joins the pool.
    let pool = extraMonthly + freedMinimums;
    for (const d of state) {
      if (d.paidOff) continue;
      const pay = Math.min(d.minimumPayment, d.remaining);
      d.remaining -= pay;
      pool += d.minimumPayment - pay;
    }

    // 3. Extra pool cascades through targets until spent or debts are gone.
    while (pool > EPSILON) {
      // Mark anything the minimums already killed, so it can't be a target.
      for (const d of state) {
        if (!d.paidOff && d.remaining <= EPSILON) {
          d.remaining = 0;
          d.paidOff = true;
          payoffOrder.push(d.name);
          freedMinimums += d.minimumPayment;
        }
      }
      const target = pickTarget();
      if (!target) break;
      const pay = Math.min(pool, target.remaining);
      target.remaining -= pay;
      pool -= pay;
    }

    // 4. Record payoffs from this month (minimums or leftover extra).
    for (const d of state) {
      if (!d.paidOff && d.remaining <= EPSILON) {
        d.remaining = 0;
        d.paidOff = true;
        payoffOrder.push(d.name);
        freedMinimums += d.minimumPayment;
      }
    }

    const totalNow = total();
    series.push({ month, totalBalance: totalNow });

    // Done?
    if (totalNow <= EPSILON) {
      return {
        result: {
          strategy,
          payoffMonths: month,
          totalInterest,
          series,
          payoffOrder,
        },
        warning: null,
      };
    }

    // 5. Infinite-loop guard: no progress this month means the payments
    //    can't outrun the interest — identify the offenders and stop.
    if (totalNow >= totalAtStart - EPSILON) {
      const stuck = state.filter(
        (d) =>
          !d.paidOff &&
          d.minimumPayment <= (d.remaining * d.annualRatePercent) / 100 / 12,
      );
      const names =
        stuck.length > 0 ? stuck.map((d) => d.name).join(", ") : "these debts";
      return {
        result: null,
        warning: `These minimum payments aren't enough to pay off ${names} at ${stuck.length === 1 ? "its" : "their"} rate — the balance never decreases. Increase the minimum or the extra monthly payment.`,
      };
    }
  }

  // Hard cap reached without payoff — treat like the stuck case.
  return {
    result: null,
    warning: `Payoff would take longer than ${MAX_MONTHS / 12} years with these payments — increase the minimums or the extra monthly payment.`,
  };
}

/** Simulate both strategies and compare them. */
export function planDebtPayoff(
  debts: DebtInput[],
  extraMonthly: number,
): DebtPayoffResult {
  // Ignore empty/paid rows; sanitize negatives to zero.
  const clean = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({
      ...d,
      annualRatePercent: Math.max(0, d.annualRatePercent),
      minimumPayment: Math.max(0, d.minimumPayment),
    }));

  if (clean.length === 0) {
    return {
      avalanche: null,
      snowball: null,
      interestSavedByAvalanche: null,
      warnings: ["Add at least one debt with a balance to see a plan."],
    };
  }

  const extra = Math.max(0, extraMonthly);
  const avalanche = simulate(clean, extra, "avalanche");
  const snowball = simulate(clean, extra, "snowball");

  const warnings: string[] = [];
  // Both strategies fail the same way; report the warning once.
  if (avalanche.warning) warnings.push(avalanche.warning);
  else if (snowball.warning) warnings.push(snowball.warning);

  return {
    avalanche: avalanche.result,
    snowball: snowball.result,
    interestSavedByAvalanche:
      avalanche.result && snowball.result
        ? snowball.result.totalInterest - avalanche.result.totalInterest
        : null,
    warnings,
  };
}

/**
 * Portfolio backtest math (pure calculation module — no UI, no fetching).
 *
 * ── Assumptions (each deliberate, each shown to the user via the page
 *    disclaimer) ────────────────────────────────────────────────────────────
 *  - MONTHLY REBALANCING: each month the portfolio is rebalanced back to its
 *    target weights, so the portfolio's monthly return is simply the
 *    weighted average of each holding's monthly return. (Without rebalancing,
 *    drifting weights would compound differently.)
 *  - CASH IS FLAT: the "CASH" pseudo-holding returns exactly 0% every month —
 *    no interest is credited.
 *  - PRICES AS PROVIDED: returns come straight from Yahoo's close series
 *    (whatever dividend treatment those closes carry); nothing is imputed.
 *  - NO FEES, NO TAXES, NO TRADING COSTS.
 *  - The final month may be partial (month-to-date) — the series simply ends
 *    at the last available close.
 *
 * Missing/short data is handled LOUDLY:
 *  - A non-cash holding with no data at all makes the backtest throw — a
 *    portfolio can't be honestly simulated with a holding silently dropped.
 *  - Holdings whose data starts later than others SHORTEN the common window
 *    to the latest common start, and a warning names the limiting holdings.
 */

import type { PricePoint } from "@/lib/marketData/types";

export interface BacktestHolding {
  symbol: string;
  /** Percent of the portfolio; weights are expected to sum to ~100. */
  weight: number;
}

export interface BacktestPoint {
  /** Month label, "YYYY-MM". */
  date: string;
  /** Portfolio value at that month's close. */
  value: number;
}

export interface BacktestResult {
  series: BacktestPoint[];
  summaryStats: {
    startAmount: number;
    finalValue: number;
    totalReturnPercent: number;
    /** Geometric annualized return; null when the window is under 2 months. */
    annualizedReturnPercent: number | null;
    months: number;
  };
  /** Human-readable notes about shortened range / data coverage. */
  warnings: string[];
  /** First month of the common window, "YYYY-MM". */
  effectiveStartDate: string;
}

/** Collapse a daily/weekly close series to one close per month (the last). */
function monthlyCloses(points: PricePoint[]): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const p of points) {
    // Points arrive date-ascending, so the last write per month wins.
    byMonth.set(p.date.slice(0, 7), p.close);
  }
  return byMonth;
}

/**
 * Run the backtest.
 *
 * @param holdings           target weights (CASH allowed)
 * @param historiesBySymbol  price points per non-cash symbol (from the
 *                           market-data layer). A missing/empty entry for a
 *                           non-cash holding is a hard error.
 * @param startAmount        starting portfolio value (e.g. 10000)
 */
export function runBacktest(
  holdings: BacktestHolding[],
  historiesBySymbol: Record<string, PricePoint[]>,
  startAmount: number,
): BacktestResult {
  const warnings: string[] = [];

  const cashWeight = holdings
    .filter((h) => h.symbol.toUpperCase() === "CASH")
    .reduce((sum, h) => sum + h.weight, 0);
  const invested = holdings.filter((h) => h.symbol.toUpperCase() !== "CASH");

  // LOUD failure: every invested holding must have data.
  const missing = invested.filter(
    (h) => !historiesBySymbol[h.symbol.toUpperCase()]?.length,
  );
  if (missing.length > 0) {
    throw new Error(
      `No price history available for: ${missing
        .map((h) => h.symbol)
        .join(", ")}. The backtest can't run without every holding's data.`,
    );
  }
  if (invested.length === 0) {
    throw new Error(
      "This portfolio is 100% cash — with cash held flat there is nothing to backtest.",
    );
  }

  // Monthly close map per symbol, plus each symbol's own first month.
  const monthly = new Map<string, Map<string, number>>();
  for (const h of invested) {
    monthly.set(
      h.symbol.toUpperCase(),
      monthlyCloses(historiesBySymbol[h.symbol.toUpperCase()]),
    );
  }

  // Common months = intersection across all invested holdings, sorted.
  let common: string[] | null = null;
  for (const closes of monthly.values()) {
    const months = new Set(closes.keys());
    common = common
      ? common.filter((m) => months.has(m))
      : [...months].sort();
  }
  const months = common ?? [];
  if (months.length < 2) {
    throw new Error(
      "Not enough overlapping monthly history across these holdings to backtest.",
    );
  }

  // Warn when later-starting holdings shortened the window.
  const firstMonths = invested.map((h) => ({
    symbol: h.symbol.toUpperCase(),
    first: [...monthly.get(h.symbol.toUpperCase())!.keys()].sort()[0],
  }));
  const earliestAvailable = firstMonths.map((f) => f.first).sort()[0];
  const effectiveStart = months[0];
  if (effectiveStart > earliestAvailable) {
    const limiting = firstMonths
      .filter((f) => f.first === effectiveStart)
      .map((f) => f.symbol);
    warnings.push(
      `Backtest window shortened: data for ${limiting.join(", ")} only begins ${effectiveStart}, so the common window starts there.`,
    );
  }

  // Compound month over month. Portfolio return each month is the
  // target-weight-weighted average of holding returns (i.e. rebalanced back
  // to target weights monthly); the cash slice contributes 0%.
  const totalWeight = cashWeight + invested.reduce((s, h) => s + h.weight, 0);
  const series: BacktestPoint[] = [{ date: months[0], value: startAmount }];
  let value = startAmount;

  for (let i = 1; i < months.length; i++) {
    let portfolioReturn = 0;
    for (const h of invested) {
      const closes = monthly.get(h.symbol.toUpperCase())!;
      const prev = closes.get(months[i - 1])!;
      const curr = closes.get(months[i])!;
      const holdingReturn = prev > 0 ? curr / prev - 1 : 0;
      portfolioReturn += (h.weight / totalWeight) * holdingReturn;
      // (cash contributes weight * 0, so it needs no term.)
    }
    value *= 1 + portfolioReturn;
    series.push({ date: months[i], value });
  }

  const elapsedMonths = months.length - 1;
  const totalReturnPercent = (value / startAmount - 1) * 100;
  // Geometric annualization; skipped for windows too short to be meaningful.
  const annualizedReturnPercent =
    elapsedMonths >= 2
      ? (Math.pow(value / startAmount, 12 / elapsedMonths) - 1) * 100
      : null;

  return {
    series,
    summaryStats: {
      startAmount,
      finalValue: value,
      totalReturnPercent,
      annualizedReturnPercent,
      months: elapsedMonths,
    },
    warnings,
    effectiveStartDate: effectiveStart,
  };
}

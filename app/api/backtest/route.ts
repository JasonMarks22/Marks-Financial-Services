/**
 * POST /api/backtest
 *
 * Body: { holdings: [{symbol, weight}], range: "1y"|"3y"|"5y", startAmount? }
 *
 * Fetches history for every holding server-side (batch; CASH skipped), runs
 * the pure backtest math, and returns { series, summaryStats, warnings,
 * effectiveStartDate } as JSON. Data problems come back as clear errors —
 * nothing is fabricated or silently dropped.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistoriesForSymbols } from "@/lib/marketData/provider";
import type { HistoryRange, PricePoint } from "@/lib/marketData/types";
import { runBacktest, type BacktestHolding } from "@/lib/portfolios/backtest";

// Backtest windows are capped at 5 years.
const ALLOWED_RANGES: HistoryRange[] = ["1y", "3y", "5y"];
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=-]{1,12}$/;

export async function POST(request: NextRequest) {
  let body: {
    holdings?: unknown;
    range?: unknown;
    startAmount?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ---- Validate holdings -------------------------------------------------
  const rawHoldings = Array.isArray(body.holdings) ? body.holdings : null;
  if (!rawHoldings || rawHoldings.length === 0 || rawHoldings.length > 30) {
    return NextResponse.json(
      { error: "Provide 1–30 holdings as [{symbol, weight}]." },
      { status: 400 },
    );
  }
  const holdings: BacktestHolding[] = [];
  for (const h of rawHoldings) {
    const symbol =
      typeof (h as { symbol?: unknown }).symbol === "string"
        ? ((h as { symbol: string }).symbol.trim().toUpperCase())
        : "";
    const weight = Number((h as { weight?: unknown }).weight);
    if (
      (!SYMBOL_PATTERN.test(symbol) && symbol !== "CASH") ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      return NextResponse.json(
        { error: `Invalid holding: ${JSON.stringify(h)}` },
        { status: 400 },
      );
    }
    holdings.push({ symbol, weight });
  }
  const weightSum = holdings.reduce((s, h) => s + h.weight, 0);
  if (Math.abs(weightSum - 100) > 1) {
    return NextResponse.json(
      { error: `Holding weights sum to ${weightSum}; they must total 100.` },
      { status: 400 },
    );
  }

  // ---- Validate range & start amount ------------------------------------
  const range = body.range as HistoryRange;
  if (!ALLOWED_RANGES.includes(range)) {
    return NextResponse.json(
      { error: `Invalid range. Use one of: ${ALLOWED_RANGES.join(", ")} (5y max).` },
      { status: 400 },
    );
  }
  let startAmount = Number(body.startAmount ?? 10000);
  if (!Number.isFinite(startAmount) || startAmount <= 0 || startAmount > 1e9) {
    startAmount = 10000;
  }

  // ---- Fetch histories & run --------------------------------------------
  try {
    const results = await getHistoriesForSymbols(
      holdings.map((h) => h.symbol),
      range,
    );

    // Any failed non-cash symbol is a hard, clearly-attributed error.
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      return NextResponse.json(
        {
          error: `Couldn't fetch history for: ${failed
            .map((f) => `${f.symbol} (${f.error})`)
            .join("; ")}`,
        },
        { status: 422 },
      );
    }

    const historiesBySymbol: Record<string, PricePoint[]> = {};
    for (const r of results) {
      if (!r.isCash) historiesBySymbol[r.symbol] = r.points;
    }

    const result = runBacktest(holdings, historiesBySymbol, startAmount);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backtest failed.";
    // runBacktest throws clear data-coverage errors → 422; the rest → 502.
    const status = /history|backtest|cash|overlapping/i.test(message) ? 422 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

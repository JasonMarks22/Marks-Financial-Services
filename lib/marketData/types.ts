/**
 * Market-data types — the app's OWN provider-agnostic shapes.
 *
 * Everything outside lib/marketData/provider.ts (pages, API routes, charts)
 * works exclusively with these types. They deliberately contain nothing
 * Yahoo-specific, so swapping the data provider (e.g. to FMP) never touches
 * any consumer — only provider.ts changes.
 */

/** A current snapshot of one ticker. */
export interface Quote {
  symbol: string;
  /** Company/instrument display name. */
  name: string;
  /** Latest market price. */
  price: number;
  /** Absolute change vs. previous close. */
  change: number;
  /** Percent change vs. previous close (e.g. 1.25 means +1.25%). */
  changePercent: number;
  /** ISO currency code the price is quoted in (e.g. "USD"). */
  currency: string;
}

/** One closing price on one day. Date is an ISO string (YYYY-MM-DD) so it
 *  serializes cleanly through JSON API routes. */
export interface PricePoint {
  date: string;
  close: number;
}

/** A series of closing prices for one ticker. */
export interface PriceHistory {
  symbol: string;
  points: PricePoint[];
}

/** Supported look-back windows for price history. */
export type HistoryRange = "1mo" | "3mo" | "6mo" | "1y" | "5y";

export const HISTORY_RANGES: HistoryRange[] = ["1mo", "3mo", "6mo", "1y", "5y"];

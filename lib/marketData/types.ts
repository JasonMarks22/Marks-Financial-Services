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

/**
 * Rich detail for one security (stock, ETF, or mutual fund).
 *
 * Coverage varies by security type AND by what the provider actually returns:
 * every nullable field below is `null` when the data isn't available — the UI
 * shows "Not available" rather than a guessed value. Percent-style fields
 * (dividendYield, expenseRatio, changePercent) are expressed as percents
 * (e.g. 1.25 means 1.25%).
 */
export interface SecurityDetail {
  symbol: string;
  name: string;
  /** "EQUITY" | "ETF" | "MUTUALFUND" | other provider-reported types. */
  type: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  marketCap: number | null;
  /** Stocks (and some ETFs); often null for funds. */
  peRatio: number | null;
  /** Percent. Trailing dividend/distribution yield. */
  dividendYield: number | null;
  /** Stocks only. */
  sector: string | null;
  /** Funds/ETFs only. Percent (e.g. 0.09 means 0.09%/yr). */
  expenseRatio: number | null;
  /** Funds/ETFs only (e.g. "Large Blend"). */
  category: string | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

/** One row of ticker-search results. */
export interface SearchResult {
  symbol: string;
  name: string;
  /** "EQUITY" | "ETF" | "MUTUALFUND" | other provider-reported types. */
  type: string;
}

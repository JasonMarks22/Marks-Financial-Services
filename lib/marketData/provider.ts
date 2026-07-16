/**
 * Market-data PROVIDER — the ONLY file in the app that talks to a specific
 * data source (currently the yahoo-finance2 library).
 *
 * ── Swapping providers later (e.g. to Financial Modeling Prep) ──────────────
 * Rewrite ONLY the insides of getQuote() and getPriceHistory() to call the new
 * source and translate its responses into the app's own types from
 * ./types.ts. Nothing else in the codebase imports yahoo-finance2 or knows
 * Yahoo exists — API routes, pages, and charts all consume the app types.
 * (An FMP version would read its key from process.env.FMP_API_KEY.)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SERVER-SIDE ONLY: these functions are called from API route handlers, never
 * from client components — the browser talks to /api/quote and /api/history.
 *
 * Error style: on any failure (unknown ticker, network trouble, empty data)
 * the functions throw a plain Error with a human-readable message the API
 * routes can pass straight through to the UI.
 */

import YahooFinance from "yahoo-finance2";
import type {
  HistoryRange,
  PriceHistory,
  Quote,
  SearchResult,
  SecurityDetail,
} from "./types";

// yahoo-finance2 v4 exports a class; one shared instance for all requests.
const yahooFinance = new YahooFinance();

/** Look-back window in days for each supported range. */
const RANGE_DAYS: Record<HistoryRange, number> = {
  "1mo": 31,
  "3mo": 92,
  "6mo": 183,
  "1y": 366,
  "5y": 1827,
};

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Fetch a current quote for one ticker and translate it to our Quote type. */
export async function getQuote(symbol: string): Promise<Quote> {
  let raw;
  try {
    raw = await yahooFinance.quote(symbol);
  } catch (err) {
    throw new Error(`Quote lookup failed for "${symbol}": ${errText(err)}`);
  }

  // Yahoo returns undefined/partial data for unknown tickers rather than
  // always throwing — treat missing price as "not found".
  if (!raw || raw.regularMarketPrice === undefined) {
    throw new Error(`No quote found for "${symbol}" — is the ticker valid?`);
  }

  return {
    symbol: raw.symbol ?? symbol.toUpperCase(),
    name: raw.longName ?? raw.shortName ?? raw.symbol ?? symbol.toUpperCase(),
    price: raw.regularMarketPrice,
    change: raw.regularMarketChange ?? 0,
    changePercent: raw.regularMarketChangePercent ?? 0,
    currency: raw.currency ?? "USD",
  };
}

/**
 * Fetch daily closing prices for one ticker over the given range and
 * translate them to our PriceHistory type. Uses weekly bars for the 5-year
 * range to keep the payload reasonable.
 */
export async function getPriceHistory(
  symbol: string,
  range: HistoryRange,
): Promise<PriceHistory> {
  const period1 = new Date(Date.now() - RANGE_DAYS[range] * 86_400_000);

  let raw;
  try {
    raw = await yahooFinance.chart(symbol, {
      period1,
      interval: range === "5y" ? "1wk" : "1d",
    });
  } catch (err) {
    throw new Error(`History lookup failed for "${symbol}": ${errText(err)}`);
  }

  const points = (raw?.quotes ?? [])
    .filter((q) => q.close !== null && q.close !== undefined)
    .map((q) => ({
      date: new Date(q.date).toISOString().slice(0, 10),
      close: q.close as number,
    }));

  if (points.length === 0) {
    throw new Error(
      `No price history found for "${symbol}" — is the ticker valid?`,
    );
  }

  return { symbol: symbol.toUpperCase(), points };
}

/** Convert a 0–1 fraction (how Yahoo reports yields/fees) to a percent, or null. */
function fractionToPercent(value: number | undefined | null): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value * 100
    : null;
}

function numOrNull(value: number | undefined | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Fetch rich detail for one security and translate it into our
 * SecurityDetail type.
 *
 * Sources (all Yahoo, all server-side):
 *   - quote()        → price/change/currency/type — always required; if this
 *                      is missing, the symbol is treated as invalid.
 *   - quoteSummary() → the optional extras. Field coverage varies a lot:
 *       summaryDetail          → P/E, dividend yield, 52-week range, market cap
 *       assetProfile           → sector (STOCKS ONLY)
 *       fundProfile            → expense ratio, category (FUNDS/ETFs ONLY)
 *       financialData /
 *       defaultKeyStatistics   → requested for completeness of coverage
 *
 * Anything Yahoo doesn't return comes back as null — never guessed. If the
 * whole quoteSummary call fails (some tickers reject certain modules), we
 * still return the basic quote fields with all extras null.
 */
export async function getSecurityDetail(symbol: string): Promise<SecurityDetail> {
  let rawQuote;
  try {
    rawQuote = await yahooFinance.quote(symbol);
  } catch (err) {
    throw new Error(`Detail lookup failed for "${symbol}": ${errText(err)}`);
  }

  if (!rawQuote || rawQuote.regularMarketPrice === undefined) {
    throw new Error(`No security found for "${symbol}" — is the ticker valid?`);
  }

  // Extras are best-effort: coverage varies by security type, and Yahoo can
  // reject module combinations for some tickers. Failure here just means the
  // optional fields stay null. (With validateResult:false the library types
  // the result loosely, so we describe just the fields we read.)
  interface RawQuoteSummary {
    summaryDetail?: {
      trailingPE?: number;
      dividendYield?: number;
      yield?: number;
      marketCap?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
    };
    assetProfile?: { sector?: string };
    fundProfile?: {
      categoryName?: string | null;
      feesExpensesInvestment?: { annualReportExpenseRatio?: number };
    };
  }

  let summary: RawQuoteSummary | null = null;
  try {
    summary = (await yahooFinance.quoteSummary(
      symbol,
      {
        modules: [
          "summaryDetail",
          "financialData",
          "defaultKeyStatistics",
          "assetProfile",
          "fundProfile",
        ],
      },
      { validateResult: false },
    )) as RawQuoteSummary;
  } catch {
    summary = null;
  }

  const summaryDetail = summary?.summaryDetail;
  const assetProfile = summary?.assetProfile;
  const fundProfile = summary?.fundProfile;

  return {
    symbol: rawQuote.symbol ?? symbol.toUpperCase(),
    name:
      rawQuote.longName ??
      rawQuote.shortName ??
      rawQuote.symbol ??
      symbol.toUpperCase(),
    type: rawQuote.quoteType ?? "UNKNOWN",
    price: rawQuote.regularMarketPrice,
    change: rawQuote.regularMarketChange ?? 0,
    changePercent: rawQuote.regularMarketChangePercent ?? 0,
    currency: rawQuote.currency ?? "USD",
    marketCap: numOrNull(rawQuote.marketCap ?? summaryDetail?.marketCap),
    peRatio: numOrNull(summaryDetail?.trailingPE ?? rawQuote.trailingPE),
    // summaryDetail.dividendYield covers stocks; `yield` covers funds/ETFs.
    dividendYield: fractionToPercent(
      summaryDetail?.dividendYield ?? summaryDetail?.yield,
    ),
    // Stock-only: sector comes from the company profile.
    sector: assetProfile?.sector ?? null,
    // Fund/ETF-only: fees live in the fund profile; often missing even for
    // real funds — the UI must handle null.
    expenseRatio: fractionToPercent(
      fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio,
    ),
    category: fundProfile?.categoryName ?? null,
    fiftyTwoWeekHigh: numOrNull(
      rawQuote.fiftyTwoWeekHigh ?? summaryDetail?.fiftyTwoWeekHigh,
    ),
    fiftyTwoWeekLow: numOrNull(
      rawQuote.fiftyTwoWeekLow ?? summaryDetail?.fiftyTwoWeekLow,
    ),
  };
}

/** Shape of one entry in Yahoo's search results (fields we care about). */
interface RawSearchQuote {
  symbol?: string;
  longname?: string;
  shortname?: string;
  quoteType?: string;
}

/**
 * Search securities by name or ticker fragment. Returns an empty array for no
 * matches (that's a normal outcome, not an error).
 */
export async function searchSecurities(query: string): Promise<SearchResult[]> {
  let raw;
  try {
    raw = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
  } catch (err) {
    throw new Error(`Search failed for "${query}": ${errText(err)}`);
  }

  const quotes = (raw?.quotes ?? []) as RawSearchQuote[];
  return quotes
    .filter((q) => typeof q.symbol === "string" && q.symbol.length > 0)
    .map((q) => ({
      symbol: q.symbol as string,
      name: q.longname ?? q.shortname ?? (q.symbol as string),
      type: (q.quoteType ?? "UNKNOWN").toUpperCase(),
    }));
}

/**
 * GET /api/quote?symbol=AAPL
 *
 * Server-side proxy for market quotes: the browser calls this route, and only
 * the server ever talks to the data provider. Returns a Quote as JSON, or
 * { error } with an appropriate status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/marketData/provider";

// Tickers: letters/digits plus the separators Yahoo uses (BRK-B, ^GSPC, EURUSD=X).
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=-]{1,12}$/;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();

  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      { error: "Provide a valid ticker symbol, e.g. /api/quote?symbol=AAPL" },
      { status: 400 },
    );
  }

  try {
    const quote = await getQuote(symbol);
    return NextResponse.json(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // "not found"-style provider errors → 404; anything else → 502 (upstream).
    const status = /no quote|not found|valid/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

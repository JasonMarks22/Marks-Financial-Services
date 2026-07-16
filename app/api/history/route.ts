/**
 * GET /api/history?symbol=AAPL&range=1y
 *
 * Server-side proxy for price history: the browser calls this route, and only
 * the server ever talks to the data provider. Returns a PriceHistory as JSON,
 * or { error } with an appropriate status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/marketData/provider";
import { HISTORY_RANGES, type HistoryRange } from "@/lib/marketData/types";

// Tickers: letters/digits plus the separators Yahoo uses (BRK-B, ^GSPC, EURUSD=X).
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=-]{1,12}$/;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();
  const range = request.nextUrl.searchParams.get("range") ?? "1y";

  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      {
        error:
          "Provide a valid ticker symbol, e.g. /api/history?symbol=AAPL&range=1y",
      },
      { status: 400 },
    );
  }

  if (!HISTORY_RANGES.includes(range as HistoryRange)) {
    return NextResponse.json(
      { error: `Invalid range "${range}". Use one of: ${HISTORY_RANGES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const history = await getPriceHistory(symbol, range as HistoryRange);
    return NextResponse.json(history);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = /no price history|not found|valid/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

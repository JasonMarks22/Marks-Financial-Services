/**
 * GET /api/security?symbol=VOO
 *
 * Server-side proxy for rich security detail (stock/ETF/fund). Returns a
 * SecurityDetail as JSON — nullable fields are null when the provider has no
 * data — or { error } with an appropriate status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSecurityDetail } from "@/lib/marketData/provider";

// Tickers: letters/digits plus the separators Yahoo uses (BRK-B, ^GSPC, EURUSD=X).
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=-]{1,12}$/;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();

  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      { error: "Provide a valid ticker symbol, e.g. /api/security?symbol=VOO" },
      { status: 400 },
    );
  }

  try {
    const detail = await getSecurityDetail(symbol);
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = /no security|not found|valid/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

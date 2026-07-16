/**
 * GET /api/search?q=vanguard
 *
 * Server-side proxy for ticker/name search. Returns a SearchResult[] as JSON
 * (empty array = no matches), or { error } with an appropriate status.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchSecurities } from "@/lib/marketData/provider";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 1 || query.length > 50) {
    return NextResponse.json(
      { error: "Provide a search query between 1 and 50 characters, e.g. /api/search?q=apple" },
      { status: 400 },
    );
  }

  try {
    const results = await searchSecurities(query);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

"use client";

/**
 * Single stock / ETF / fund detail page at /stock/[ticker].
 *
 * The whole deep-dive lives in the reusable <SecurityDetail> component (which
 * also owns the loading and "not found" states). This route just reads the
 * ticker from the URL, normalizes it (uppercase + trim, so /stock/aapl and
 * /stock/AAPL behave the same), and renders the component.
 */

import { useParams } from "next/navigation";
import { SecurityDetail } from "@/components/SecurityDetail";
import { Container } from "@/components/ui/Container";

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  // Route segments can be string | string[]; normalize, uppercase, trim.
  const raw = Array.isArray(params.ticker) ? params.ticker[0] : params.ticker;
  const ticker = (raw ?? "").trim().toUpperCase();

  return (
    <main className="flex-1 bg-surface">
      <Container className="py-12 sm:py-16">
        <SecurityDetail ticker={ticker} />
      </Container>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Market Analysis",
  description:
    "Live market dashboards are coming soon. Meanwhile, compare securities and backtest portfolios with real data.",
};

export default function MarketAnalysisPage() {
  return (
    <ComingSoonPage
      title="Market Analysis"
      description="Live market dashboards (trending securities, index performance, and economic events) are planned for a future release."
    >
      <p className="text-sm leading-6 text-muted">
        In the meantime, two tools already use real market data:
      </p>
      <ul className="mt-4 space-y-3 text-sm">
        <li>
          <Link
            href="/compare"
            className="font-semibold text-link underline-offset-2 hover:underline"
          >
            Compare Securities
          </Link>{" "}
          <span className="text-muted">
            covers any two stocks, ETFs, or funds side by side, with live quotes
            and price history.
          </span>
        </li>
        <li>
          <Link
            href="/portfolios/compare"
            className="font-semibold text-link underline-offset-2 hover:underline"
          >
            Compare &amp; Backtest
          </Link>{" "}
          <span className="text-muted">
            simulates how $10,000 would have grown across portfolios using
            historical prices.
          </span>
        </li>
      </ul>
    </ComingSoonPage>
  );
}

"use client";

/**
 * Homepage search. Resolves two kinds of destinations the app can ACTUALLY
 * reach:
 *   1. The app's own tools/pages (static list below).
 *   2. Live securities via /api/search — the same real endpoint the compare
 *      tool uses. Choosing a security deep-links to /compare?a=SYMBOL.
 *
 * It never implies it can look up something it can't: if nothing matches, it
 * says so. Ticker results are clearly grouped and only appear when the data
 * layer returns them.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/lib/marketData/types";
import { securityTypeLabel } from "@/lib/marketData/securityType";
import { SearchIcon } from "@/components/ui/icons";

interface ToolEntry {
  href: string;
  title: string;
  keywords: string;
}

const TOOLS: ToolEntry[] = [
  { href: "/tools/savings-goal", title: "Savings Goal Calculator", keywords: "save target monthly" },
  { href: "/tools/mortgage", title: "Mortgage Calculator", keywords: "home loan amortization payment" },
  { href: "/tools/budget", title: "Budget Calculator", keywords: "50/30/20 spending categories" },
  { href: "/tools/allocator", title: "Savings Allocator", keywords: "split leftover money" },
  { href: "/tools/debt-payoff", title: "Debt Payoff Calculator", keywords: "avalanche snowball interest" },
  { href: "/tools/retirement", title: "Retirement Planner", keywords: "compound growth age projection" },
  { href: "/compare", title: "Compare Securities", keywords: "stocks etfs funds side by side" },
  { href: "/portfolios", title: "Model Portfolios", keywords: "risk profiles allocation" },
  { href: "/portfolios/build", title: "Portfolio Builder", keywords: "build assemble mix rating" },
  { href: "/portfolios/compare", title: "Portfolio Backtesting", keywords: "compare backtest simulate growth" },
];


const POPULAR = [
  { label: "VOO", type: "ticker" as const },
  { label: "SPY", type: "ticker" as const },
  { label: "AAPL", type: "ticker" as const },
  { label: "SCHD", type: "ticker" as const },
  { label: "Mortgage Calculator", type: "tool" as const, href: "/tools/mortgage" },
  { label: "Retirement Planner", type: "tool" as const, href: "/tools/retirement" },
];

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [tickerResults, setTickerResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim();

  // Match app tools locally.
  const toolMatches = useMemo(() => {
    if (q.length < 1) return [];
    const needle = q.toLowerCase();
    return TOOLS.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.keywords.toLowerCase().includes(needle),
    ).slice(0, 5);
  }, [q]);

  // Debounced live ticker search (the real endpoint). All state changes happen
  // inside the timer callback so nothing runs synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setTickerResults([]);
        setSearchFailed(false);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const json = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(json.error ?? "Search failed");
          setTickerResults(Array.isArray(json) ? json.slice(0, 5) : []);
          setSearchFailed(false);
        })
        .catch(() => {
          if (cancelled) return;
          setTickerResults([]);
          setSearchFailed(true);
        })
        .finally(() => !cancelled && setSearching(false));
    }, q.length < 2 ? 0 : 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function goToTool(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function goToSecurity(symbol: string) {
    setOpen(false);
    setQuery("");
    router.push(`/stock/${encodeURIComponent(symbol.trim().toUpperCase())}`);
  }

  function handlePopular(chip: (typeof POPULAR)[number]) {
    if (chip.type === "tool") goToTool(chip.href);
    else goToSecurity(chip.label);
  }

  // Submitting the search (Enter / the search button) treats the typed text as
  // a ticker symbol and opens its detail page.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.length < 1) return;
    goToSecurity(q);
  }

  const hasResults = toolMatches.length > 0 || tickerResults.length > 0;
  const showNoMatch =
    q.length >= 2 && !searching && !hasResults;

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <button
          type="submit"
          aria-label="Search"
          className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-link"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
        <input
          type="text"
          role="combobox"
          aria-expanded={open && (hasResults || showNoMatch)}
          aria-controls="home-search-results"
          aria-label="Search stocks, ETFs, and calculators"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search Stocks, ETFs, Calculators..."
          className="w-full rounded-full border border-edge bg-card py-4 pl-14 pr-5 text-base text-ink shadow-soft outline-none transition focus:border-accent focus:shadow-lifted"
        />
      </form>

      {open && (hasResults || showNoMatch || searching) && (
        <div
          id="home-search-results"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-edge bg-card py-2 text-left shadow-lifted"
        >
          {toolMatches.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Tools
              </p>
              {toolMatches.map((t) => (
                <button
                  key={t.href}
                  type="button"
                  onClick={() => goToTool(t.href)}
                  className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-card-tint"
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}

          {tickerResults.length > 0 && (
            <div className="mt-1">
              <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Securities
              </p>
              {tickerResults.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => goToSecurity(r.symbol)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-card-tint"
                >
                  <span className="truncate text-ink">
                    <strong>{r.symbol}</strong>{" "}
                    <span className="text-muted">{r.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {securityTypeLabel(r.type)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searching && !hasResults && (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          )}

          {showNoMatch && (
            <p className="px-4 py-3 text-sm text-muted">
              {searchFailed
                ? "Couldn't reach the market data service. Try again in a moment."
                : `No tool or security found for “${q}”.`}
            </p>
          )}
        </div>
      )}

      {/* Popular searches */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted">Popular:</span>
        {POPULAR.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handlePopular(chip)}
            className="rounded-full border border-edge bg-card px-3 py-1 text-sm font-medium text-neutral-700 shadow-soft transition hover:-translate-y-px hover:border-accent hover:text-link"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

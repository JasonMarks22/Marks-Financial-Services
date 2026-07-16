"use client";

/**
 * Portfolios page — the user's own saved portfolios (when logged in) plus the
 * 7 educational model portfolios from lib/portfolios/modelPortfolios.ts.
 * No live prices here; this only renders portfolio definitions.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  MODEL_PORTFOLIOS,
  type ModelPortfolio,
} from "@/lib/portfolios/modelPortfolios";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteUserPortfolio,
  getUserPortfolios,
  type UserPortfolioRow,
} from "@/lib/portfolios/userPortfolios";
import {
  gradePortfolio,
  type GradeResult,
  type MatchRating,
} from "@/lib/portfolios/gradePortfolio";

const RATING_STYLES: Record<MatchRating, string> = {
  "Strong match": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Moderate match": "border-amber-200 bg-amber-50 text-amber-800",
  "Weak match": "border-red-200 bg-red-50 text-red-600",
};

const MATCH_DISCLAIMER =
  "This match rating is an educational estimate based on your portfolio's stock/bond/cash mix compared to common profile definitions. It is not investment advice or an authoritative assessment. Method and profile definitions are illustrative.";

const NAVY = "#002E5D";
const SPLIT_COLORS = {
  Stocks: NAVY,
  Bonds: "#7FA8D0",
  Cash: "#A9B2BD",
} as const;

// Ramp for user-portfolio holdings donuts; CASH always renders grey.
const HOLDING_PALETTE = [
  "#002E5D",
  "#1F4B76",
  "#3E6491",
  "#5E7EAB",
  "#7FA8D0",
  "#C6A15B",
  "#8DA3BC",
  "#B0864B",
];

export default function PortfoliosPage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 py-16 text-neutral-900">
      <div className="w-full max-w-6xl">
        <h1
          className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--accent)" }}
        >
          Model Portfolios
        </h1>
        <p className="mt-2 text-neutral-600">
          Seven common risk profiles, from most conservative to most aggressive.
        </p>

        {/* Prominent disclaimer */}
        <div className="mt-6 rounded-xl border border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-700 shadow-sm">
          These model portfolios are illustrative examples based on published
          asset-allocation frameworks (e.g. Vanguard, Fidelity), for educational
          purposes only. They are not investment advice or recommendations.
          Past performance does not guarantee future results. Ticker symbols
          shown are examples of the asset classes described.
        </div>

        {/* User's own portfolios */}
        <MyPortfoliosSection />

        {/* Educational model portfolios (unchanged) */}
        <h2
          className="mt-12 text-2xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          Model portfolios
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {MODEL_PORTFOLIOS.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------ */

function MyPortfoliosSection() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<UserPortfolioRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch once the session is known; state updates only in async callbacks.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserPortfolios().then(({ data, error }) => {
      if (cancelled) return;
      setRows(data);
      setError(error);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleDelete(row: UserPortfolioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteUserPortfolio(row.id);
    if (error) {
      setError(`Couldn't delete: ${error}`);
    } else {
      setRows((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          My portfolios
        </h2>
        <div className="flex gap-2">
          <Link
            href="/portfolios/compare"
            className="rounded-full border px-5 py-2 text-sm font-medium"
            style={{ borderColor: NAVY, color: "var(--accent)" }}
          >
            Compare &amp; backtest
          </Link>
          <Link
            href="/portfolios/build"
            className="rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm"
            style={{ backgroundColor: NAVY }}
          >
            + Build a new portfolio
          </Link>
        </div>
      </div>

      {loading ? null : !user ? (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-600">
          <Link
            href="/login"
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--accent)" }}
          >
            Log in
          </Link>{" "}
          to see your saved portfolios — or head straight to the{" "}
          <Link
            href="/portfolios/build"
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--accent)" }}
          >
            builder
          </Link>{" "}
          and start building now.
        </p>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {rows === null && !error ? (
            <p className="mt-4 text-sm text-neutral-400">Loading…</p>
          ) : rows && rows.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              {rows.map((row) => (
                <UserPortfolioCard
                  key={row.id}
                  row={row}
                  onDelete={() => handleDelete(row)}
                />
              ))}
            </div>
          ) : (
            !error && (
              <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
                No portfolios yet — build your first one.
              </p>
            )
          )}
        </>
      )}
    </section>
  );
}

function UserPortfolioCard({
  row,
  onDelete,
}: {
  row: UserPortfolioRow;
  onDelete: () => void;
}) {
  const chartData = row.holdings.filter((h) => h.weight > 0);

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
          {row.name}
        </h3>
        <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-0.5 text-xs font-medium text-neutral-500">
          {row.target_profile}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-400">
        Saved {new Date(row.created_at).toLocaleDateString()}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="weight"
                nameKey="symbol"
                innerRadius={28}
                outerRadius={52}
                paddingAngle={1}
              >
                {chartData.map((h, i) => (
                  <Cell
                    key={h.symbol + i}
                    fill={
                      h.symbol === "CASH"
                        ? "#A9B2BD"
                        : HOLDING_PALETTE[i % HOLDING_PALETTE.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm leading-6 text-neutral-600">
          {row.holdings.map((h) => `${h.symbol} ${h.weight}%`).join(" · ")}
        </p>
      </div>

      {/* Profile match — how the actual mix compares to the stated target */}
      <ProfileMatchPanel grade={gradePortfolio(row.target_profile, row.holdings)} />

      <div className="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-4">
        <Link
          href={`/portfolios/build?id=${row.id}`}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: NAVY }}
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ProfileMatchPanel({ grade }: { grade: GradeResult | null }) {
  if (!grade) {
    return (
      <p className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-400">
        No profile-match rating available — none of these holdings are in the
        app&rsquo;s asset-class map yet.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-neutral-100 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${RATING_STYLES[grade.rating]}`}
        >
          {grade.rating}
        </span>
        <span className="text-xs text-neutral-500">
          Stated: <strong className="text-neutral-700">{grade.statedProfile}</strong>
          {" · "}Reads as:{" "}
          <strong className="text-neutral-700">{grade.actualProfile}</strong>
        </span>
      </div>

      {/* Actual split as one stacked bar */}
      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div style={{ width: `${grade.split.stocks}%`, backgroundColor: NAVY }} />
        <div style={{ width: `${grade.split.bonds}%`, backgroundColor: "#7FA8D0" }} />
        <div style={{ width: `${grade.split.cash}%`, backgroundColor: "#A9B2BD" }} />
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Stocks {Math.round(grade.split.stocks)}% · Bonds{" "}
        {Math.round(grade.split.bonds)}% · Cash {Math.round(grade.split.cash)}%
      </p>

      <p className="mt-2 text-sm leading-6 text-neutral-600">{grade.analysis}</p>
      {grade.unclassifiedNote && (
        <p className="mt-1 text-xs text-amber-800">{grade.unclassifiedNote}</p>
      )}
      <p className="mt-2 text-xs leading-5 text-neutral-400">
        {MATCH_DISCLAIMER}
      </p>
    </div>
  );
}

function PortfolioCard({ portfolio }: { portfolio: ModelPortfolio }) {
  const splitData = [
    { name: "Stocks", value: portfolio.targetSplit.stocks },
    { name: "Bonds", value: portfolio.targetSplit.bonds },
    { name: "Cash", value: portfolio.targetSplit.cash },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
          {portfolio.name}
        </h2>
        <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-0.5 text-xs font-medium text-neutral-500">
          {portfolio.profile}
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-neutral-600">
        {portfolio.description}
      </p>

      <div className="mt-4 flex items-center gap-4">
        {/* Target split donut */}
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={splitData}
                dataKey="value"
                nameKey="name"
                innerRadius={28}
                outerRadius={52}
                paddingAngle={1}
              >
                {splitData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={SPLIT_COLORS[d.name as keyof typeof SPLIT_COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="space-y-1 text-sm">
          {splitData.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    SPLIT_COLORS[d.name as keyof typeof SPLIT_COLORS],
                }}
              />
              <span className="text-neutral-700">
                {d.name}: <strong className="text-neutral-900">{d.value}%</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Holdings */}
      <div className="mt-4 border-t border-neutral-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Example holdings
        </p>
        <ul className="mt-2 space-y-1.5">
          {portfolio.holdings.map((h) => (
            <li key={h.symbol} className="flex items-center gap-2 text-sm">
              <span className="w-14 shrink-0 font-medium text-neutral-900">
                {h.symbol}
              </span>
              <span className="relative h-2 flex-1 rounded-full bg-neutral-100">
                <span
                  className="absolute left-0 top-0 h-2 rounded-full"
                  style={{
                    width: `${h.weight}%`,
                    backgroundColor: h.symbol === "CASH" ? "#A9B2BD" : NAVY,
                  }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-neutral-600">
                {h.weight}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-400">
        {portfolio.sourceNote}
      </p>
    </div>
  );
}

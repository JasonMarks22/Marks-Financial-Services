/**
 * Model portfolios — SEED DATA.
 *
 * ⚠️ These are EDUCATIONAL EXAMPLES ONLY, based on published asset-allocation
 * frameworks (e.g. Vanguard's and Fidelity's target asset mixes for different
 * risk profiles). They are NOT investment advice or recommendations, and the
 * weights are illustrative — the ticker symbols simply exemplify the asset
 * classes described (total US stock market, international stocks, bonds, etc.).
 *
 * Each portfolio's holdings (including its "CASH" pseudo-holding) sum to 100,
 * as does its stocks/bonds/cash target split — validated below.
 */

export interface ModelPortfolio {
  id: string;
  /** Display name, e.g. "Balanced". */
  name: string;
  /** Risk-profile category. */
  profile: string;
  /** One plain-English sentence on who this mix typically suits. */
  description: string;
  /** Target asset mix in percent; the three values sum to 100. */
  targetSplit: { stocks: number; bonds: number; cash: number };
  /** Example tickers with percent weights summing to 100. "CASH" = cash. */
  holdings: { symbol: string; weight: number }[];
  sourceNote: string;
}

const SOURCE_NOTE =
  "Allocation framework based on Vanguard/Fidelity published target asset mixes; weights illustrative.";

export const MODEL_PORTFOLIOS: ModelPortfolio[] = [
  {
    id: "conservative",
    name: "Conservative",
    profile: "Conservative",
    description:
      "Suits savers close to needing their money who prioritize stability over growth.",
    targetSplit: { stocks: 20, bonds: 65, cash: 15 },
    holdings: [
      { symbol: "VTI", weight: 15 },
      { symbol: "VXUS", weight: 5 },
      { symbol: "BND", weight: 50 },
      { symbol: "BSV", weight: 15 },
      { symbol: "CASH", weight: 15 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "moderate-income",
    name: "Moderate with Income",
    profile: "Moderately conservative",
    description:
      "Suits investors who want modest growth while drawing some income along the way.",
    targetSplit: { stocks: 40, bonds: 45, cash: 15 },
    holdings: [
      { symbol: "VTI", weight: 22 },
      { symbol: "VXUS", weight: 8 },
      { symbol: "SCHD", weight: 10 },
      { symbol: "BND", weight: 35 },
      { symbol: "BSV", weight: 10 },
      // NOTE: the spec listed CASH 5, but that sums the portfolio to 90 and
      // contradicts its own 40/45/15 split — 15 completes both. Flagged in
      // the summary when this data was added.
      { symbol: "CASH", weight: 15 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "income",
    name: "Income",
    profile: "Income-focused",
    description:
      "Suits investors who mainly want their portfolio to pay them regular income.",
    targetSplit: { stocks: 30, bonds: 50, cash: 20 },
    holdings: [
      { symbol: "SCHD", weight: 18 },
      { symbol: "VTI", weight: 12 },
      { symbol: "BND", weight: 40 },
      { symbol: "VYM", weight: 10 },
      { symbol: "BSV", weight: 15 },
      { symbol: "CASH", weight: 5 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "balanced",
    name: "Balanced",
    profile: "Moderate",
    description:
      "Suits investors who want an even keel, with meaningful growth and a solid bond cushion.",
    targetSplit: { stocks: 50, bonds: 40, cash: 10 },
    holdings: [
      { symbol: "VTI", weight: 35 },
      { symbol: "VXUS", weight: 15 },
      { symbol: "BND", weight: 40 },
      { symbol: "CASH", weight: 10 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "moderate",
    name: "Moderate",
    profile: "Moderate",
    description:
      "Suits long-horizon investors comfortable with the classic 60/40 ride.",
    targetSplit: { stocks: 60, bonds: 40, cash: 0 },
    holdings: [
      { symbol: "VTI", weight: 42 },
      { symbol: "VXUS", weight: 18 },
      { symbol: "BND", weight: 30 },
      { symbol: "BNDX", weight: 10 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "growth-income",
    name: "Growth with Income",
    profile: "Moderately aggressive",
    description:
      "Suits investors leaning toward growth who still want dividends and some ballast.",
    targetSplit: { stocks: 70, bonds: 25, cash: 5 },
    holdings: [
      { symbol: "VTI", weight: 40 },
      { symbol: "VXUS", weight: 15 },
      { symbol: "SCHD", weight: 15 },
      { symbol: "BND", weight: 25 },
      { symbol: "CASH", weight: 5 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "aggressive-growth",
    name: "Aggressive Growth",
    profile: "Aggressive",
    description:
      "Suits investors with long horizons and strong stomachs chasing maximum growth.",
    targetSplit: { stocks: 85, bonds: 15, cash: 0 },
    holdings: [
      { symbol: "VTI", weight: 50 },
      { symbol: "VXUS", weight: 25 },
      { symbol: "VUG", weight: 10 },
      { symbol: "BND", weight: 15 },
    ],
    sourceNote: SOURCE_NOTE,
  },

  // ── Additional example set: same schema, a different low-cost index-ETF
  //    palette (iShares/Schwab/Vanguard core funds) for variety. Every ticker
  //    is one the market-data layer can fetch; each portfolio's holdings and
  //    its target split each sum to 100 (checked by validateModelPortfolios).
  {
    id: "conservative-index",
    name: "Conservative Index",
    profile: "Conservative",
    description:
      "A bond-heavy index mix with a small global equity sleeve, for savers who prioritize stability over growth.",
    targetSplit: { stocks: 20, bonds: 65, cash: 15 },
    holdings: [
      { symbol: "IVV", weight: 15 },
      { symbol: "SCHF", weight: 5 },
      { symbol: "AGG", weight: 45 },
      { symbol: "VTIP", weight: 20 },
      { symbol: "CASH", weight: 15 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "moderately-conservative-index",
    name: "Moderately Conservative Index",
    profile: "Moderately conservative",
    description:
      "Leans on bonds with a moderate stock allocation, for investors wanting modest growth with less bumpiness.",
    targetSplit: { stocks: 40, bonds: 45, cash: 15 },
    holdings: [
      { symbol: "ITOT", weight: 25 },
      { symbol: "IEFA", weight: 10 },
      { symbol: "HDV", weight: 5 },
      { symbol: "AGG", weight: 35 },
      { symbol: "SHY", weight: 10 },
      { symbol: "CASH", weight: 15 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "income-index",
    name: "Income Index",
    profile: "Income-focused",
    description:
      "Tilts toward dividend equity and bonds, for investors who mainly want regular income.",
    targetSplit: { stocks: 30, bonds: 50, cash: 20 },
    holdings: [
      { symbol: "HDV", weight: 18 },
      { symbol: "IVV", weight: 12 },
      { symbol: "AGG", weight: 40 },
      { symbol: "SHY", weight: 10 },
      { symbol: "CASH", weight: 20 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "balanced-index",
    name: "Balanced Index",
    profile: "Moderate",
    description:
      "An even split of broad stocks and bonds, for investors who want steady growth with a solid cushion.",
    targetSplit: { stocks: 50, bonds: 40, cash: 10 },
    holdings: [
      { symbol: "SCHB", weight: 35 },
      { symbol: "SCHF", weight: 15 },
      { symbol: "SCHZ", weight: 40 },
      { symbol: "CASH", weight: 10 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "global-60-40-index",
    name: "Global 60/40 Index",
    profile: "Moderate",
    description:
      "A classic 60/40 built from global index funds, for long-horizon investors comfortable with market swings.",
    targetSplit: { stocks: 60, bonds: 40, cash: 0 },
    holdings: [
      { symbol: "ITOT", weight: 36 },
      { symbol: "IEFA", weight: 18 },
      { symbol: "IEMG", weight: 6 },
      { symbol: "AGG", weight: 40 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "growth-income-index",
    name: "Growth with Income Index",
    profile: "Moderately aggressive",
    description:
      "Growth-leaning with a dividend sleeve and some bonds, for investors who still want income and ballast.",
    targetSplit: { stocks: 70, bonds: 25, cash: 5 },
    holdings: [
      { symbol: "VOO", weight: 40 },
      { symbol: "VEA", weight: 15 },
      { symbol: "HDV", weight: 15 },
      { symbol: "AGG", weight: 25 },
      { symbol: "CASH", weight: 5 },
    ],
    sourceNote: SOURCE_NOTE,
  },
  {
    id: "aggressive-growth-index",
    name: "Aggressive Growth Index",
    profile: "Aggressive",
    description:
      "Almost all global equity with a thin bond slice, for long horizons and high risk tolerance.",
    targetSplit: { stocks: 85, bonds: 15, cash: 0 },
    holdings: [
      { symbol: "IVV", weight: 45 },
      { symbol: "IEFA", weight: 22 },
      { symbol: "VWO", weight: 8 },
      { symbol: "IJR", weight: 10 },
      { symbol: "AGG", weight: 15 },
    ],
    sourceNote: SOURCE_NOTE,
  },
];

/**
 * Sanity-check the seed data: every portfolio's holdings and its target split
 * must each sum to 100 (within a small float tolerance). Warns in development
 * so a bad edit is caught immediately without crashing the page.
 */
export function validateModelPortfolios(
  portfolios: ModelPortfolio[] = MODEL_PORTFOLIOS,
): string[] {
  const problems: string[] = [];
  for (const p of portfolios) {
    const holdingsSum = p.holdings.reduce((sum, h) => sum + h.weight, 0);
    if (Math.abs(holdingsSum - 100) > 0.01) {
      problems.push(`${p.name}: holdings sum to ${holdingsSum}, expected 100`);
    }
    const splitSum = p.targetSplit.stocks + p.targetSplit.bonds + p.targetSplit.cash;
    if (Math.abs(splitSum - 100) > 0.01) {
      problems.push(`${p.name}: targetSplit sums to ${splitSum}, expected 100`);
    }
  }
  return problems;
}

// Run the check on import during development; a bad edit shows up in the
// console immediately rather than rendering silently-wrong charts.
if (process.env.NODE_ENV !== "production") {
  for (const problem of validateModelPortfolios()) {
    console.warn(`[modelPortfolios] ${problem}`);
  }
}

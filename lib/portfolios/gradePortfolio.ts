/**
 * Portfolio profile-match grading (pure logic — no UI).
 *
 * Grades how well a portfolio's ACTUAL holdings line up with its STATED
 * target profile. The method is deliberately simple and transparent:
 * classify each holding as stock/bond/cash, compare the resulting stock
 * percentage to the stock percentage each profile implies, and report the
 * closest profile plus how far it sits from the stated one.
 *
 * This is an EDUCATIONAL ESTIMATE, not an authoritative assessment — the
 * asset-class map and profile definitions below are illustrative, and any
 * symbol we can't classify is EXCLUDED (never guessed).
 */

export type AssetClass = "stock" | "bond" | "cash";

/** One entry in the asset-class map. */
export interface AssetClassInfo {
  /** Broad class — the ONLY field the grade/profile-match math uses. */
  class: AssetClass;
  /** Finer label, additive metadata for future similar-fund comparisons. */
  subCategory: string;
}

/**
 * Transparent asset-class map for symbols the app recognizes.
 *
 * INTENTIONALLY EXPLICIT: only symbols listed here are classified. Extend
 * this map over time as new funds/stocks come up; anything missing lands in
 * the "unclassified" bucket rather than being guessed at.
 *
 * The grade calculation rolls everything up to the broad `class` field — a
 * holding tagged "US large growth" simply counts as stocks. `subCategory`
 * exists for future features (e.g. comparing similar funds) and has no
 * effect on grading.
 *
 * NOTE on individual stocks: their subCategories are rough approximations —
 * a single company is not diversified the way a fund is — and the grade only
 * uses their broad "stock" class, never these finer tags.
 */
export const ASSET_CLASS_MAP: Record<string, AssetClassInfo> = {
  // ---- Stock funds ----
  VTI: { class: "stock", subCategory: "US large blend" },
  VOO: { class: "stock", subCategory: "US large blend" },
  SPY: { class: "stock", subCategory: "US large blend" },
  IVV: { class: "stock", subCategory: "US large blend" },
  VUG: { class: "stock", subCategory: "US large growth" },
  QQQ: { class: "stock", subCategory: "US large growth" },
  VTV: { class: "stock", subCategory: "US large value" },
  VB: { class: "stock", subCategory: "US small cap" },
  IJR: { class: "stock", subCategory: "US small cap" },
  VXUS: { class: "stock", subCategory: "International developed" },
  VEA: { class: "stock", subCategory: "International developed" },
  IEFA: { class: "stock", subCategory: "International developed" },
  VWO: { class: "stock", subCategory: "Emerging markets" },
  IEMG: { class: "stock", subCategory: "Emerging markets" },
  VNQ: { class: "stock", subCategory: "Real estate" },
  VGT: { class: "stock", subCategory: "Technology sector" },
  XLK: { class: "stock", subCategory: "Technology sector" },
  XLE: { class: "stock", subCategory: "Energy sector" },
  XLF: { class: "stock", subCategory: "Financials sector" },
  XLV: { class: "stock", subCategory: "Healthcare sector" },
  SCHD: { class: "stock", subCategory: "US dividend" },
  VYM: { class: "stock", subCategory: "US dividend" },
  DVY: { class: "stock", subCategory: "US dividend" },

  // ---- Bond funds ----
  BND: { class: "bond", subCategory: "US aggregate bond" },
  AGG: { class: "bond", subCategory: "US aggregate bond" },
  BNDX: { class: "bond", subCategory: "International bond" },
  BSV: { class: "bond", subCategory: "Short-term bond" },
  SHY: { class: "bond", subCategory: "Short-term bond" },
  TLT: { class: "bond", subCategory: "Long-term Treasury" },
  TIP: { class: "bond", subCategory: "Inflation-protected" },
  VCIT: { class: "bond", subCategory: "Corporate bond" },
  LQD: { class: "bond", subCategory: "Corporate bond" },
  HYG: { class: "bond", subCategory: "High-yield bond" },
  JNK: { class: "bond", subCategory: "High-yield bond" },
  MUB: { class: "bond", subCategory: "Municipal bond" },

  // ---- Cash pseudo-holding ----
  CASH: { class: "cash", subCategory: "Cash" },

  // ---- Individual stocks (approximate tags; see NOTE above) ----
  AAPL: { class: "stock", subCategory: "US large growth" },
  MSFT: { class: "stock", subCategory: "US large growth" },
  NVDA: { class: "stock", subCategory: "US large growth" },
  GOOGL: { class: "stock", subCategory: "US large growth" },
  AMZN: { class: "stock", subCategory: "US large growth" },
  META: { class: "stock", subCategory: "US large growth" },
  TSLA: { class: "stock", subCategory: "US large growth" },
  "BRK.B": { class: "stock", subCategory: "US large value" },
  // Yahoo (and our search) spell Berkshire's B shares "BRK-B" — same entry.
  "BRK-B": { class: "stock", subCategory: "US large value" },
  JNJ: { class: "stock", subCategory: "US large value" },
  PG: { class: "stock", subCategory: "US large value" },
  KO: { class: "stock", subCategory: "US large value" },
  JPM: { class: "stock", subCategory: "Financials" },
  BAC: { class: "stock", subCategory: "Financials" },
  XOM: { class: "stock", subCategory: "Energy" },
  CVX: { class: "stock", subCategory: "Energy" },
};

export interface HoldingInput {
  symbol: string;
  weight: number;
}

export interface ClassifiedSplit {
  /** Percent of the CLASSIFIED portion (the three sum to ~100). */
  stocks: number;
  bonds: number;
  cash: number;
  /** Symbols the map doesn't cover — excluded from the split above. */
  unclassifiedSymbols: string[];
  /** Their combined weight as a percent of the whole portfolio. */
  unclassifiedWeight: number;
}

/**
 * Sum holding weights into stock/bond/cash via the map. Unknown symbols are
 * excluded from the split (listed separately), and the split percentages are
 * re-based onto the classified portion only, so they always describe the mix
 * of what we could actually identify.
 */
export function classifyHoldings(holdings: HoldingInput[]): ClassifiedSplit {
  const totals: Record<AssetClass, number> = { stock: 0, bond: 0, cash: 0 };
  const unclassifiedSymbols: string[] = [];
  let unclassifiedWeight = 0;

  for (const h of holdings) {
    const info = ASSET_CLASS_MAP[h.symbol.toUpperCase()];
    if (info) {
      // Grading only ever uses the broad class — sub-categories roll up.
      totals[info.class] += h.weight;
    } else {
      unclassifiedSymbols.push(h.symbol.toUpperCase());
      unclassifiedWeight += h.weight;
    }
  }

  const classifiedTotal = totals.stock + totals.bond + totals.cash;
  const pct = (x: number) =>
    classifiedTotal > 0 ? (x / classifiedTotal) * 100 : 0;

  return {
    stocks: pct(totals.stock),
    bonds: pct(totals.bond),
    cash: pct(totals.cash),
    unclassifiedSymbols,
    unclassifiedWeight,
  };
}

/**
 * Profile definitions by the stock percentage each implies, ordered from
 * least to most aggressive (matching the model portfolios' target splits).
 * "Steps" between profiles = distance in this ordering.
 */
export const PROFILE_DEFINITIONS: { name: string; targetStockPercent: number }[] = [
  { name: "Conservative", targetStockPercent: 20 },
  { name: "Income", targetStockPercent: 30 },
  { name: "Moderate with Income", targetStockPercent: 40 },
  { name: "Balanced", targetStockPercent: 50 },
  { name: "Moderate", targetStockPercent: 60 },
  { name: "Growth with Income", targetStockPercent: 70 },
  { name: "Aggressive Growth", targetStockPercent: 85 },
];

export type MatchRating = "Strong match" | "Moderate match" | "Weak match";

export interface GradeResult {
  rating: MatchRating;
  statedProfile: string;
  /** The profile whose implied stock% sits closest to the actual mix. */
  actualProfile: string;
  split: ClassifiedSplit;
  /** Plain-English explanation of direction and reason. */
  analysis: string;
  /** Set when unclassified holdings were excluded from the rating. */
  unclassifiedNote: string | null;
}

/**
 * Grade a portfolio against its stated profile.
 *
 * Returns null when nothing in the portfolio can be classified (or the
 * stated profile is unknown) — there is honestly nothing to grade then, and
 * the UI should say so rather than show a made-up rating.
 */
export function gradePortfolio(
  statedProfile: string,
  holdings: HoldingInput[],
): GradeResult | null {
  const split = classifyHoldings(holdings);
  const classifiedExists = split.stocks + split.bonds + split.cash > 0;
  const statedIndex = PROFILE_DEFINITIONS.findIndex(
    (p) => p.name === statedProfile,
  );
  if (!classifiedExists || statedIndex === -1) return null;

  // Closest profile by stock percentage (ties go to the less aggressive one).
  let actualIndex = 0;
  let bestDistance = Infinity;
  PROFILE_DEFINITIONS.forEach((p, i) => {
    const distance = Math.abs(p.targetStockPercent - split.stocks);
    if (distance < bestDistance) {
      bestDistance = distance;
      actualIndex = i;
    }
  });

  const stated = PROFILE_DEFINITIONS[statedIndex];
  const actual = PROFILE_DEFINITIONS[actualIndex];

  // Steps apart in the profile ordering decide the rating.
  const steps = Math.abs(actualIndex - statedIndex);
  const rating: MatchRating =
    steps === 0 ? "Strong match" : steps === 1 ? "Moderate match" : "Weak match";

  const actualStocks = Math.round(split.stocks);
  let analysis: string;
  if (steps === 0) {
    analysis = `Your holdings line up well with your ${stated.name} target — they're about ${actualStocks}% stocks, right around the ~${stated.targetStockPercent}% that profile implies.`;
  } else if (split.stocks > stated.targetStockPercent) {
    analysis = `Your holdings are more aggressive than your ${stated.name} target — they're about ${actualStocks}% stocks versus the ~${stated.targetStockPercent}% that profile implies, which reads as ${actual.name}.`;
  } else {
    analysis = `Your holdings are more conservative than your ${stated.name} target — they're about ${actualStocks}% stocks versus the ~${stated.targetStockPercent}% that profile implies, which reads as ${actual.name}.`;
  }

  const unclassifiedNote =
    split.unclassifiedWeight > 0
      ? `${Math.round(split.unclassifiedWeight)}% of this portfolio (${split.unclassifiedSymbols.join(", ")}) isn't in the app's asset-class map, so the rating excludes ${split.unclassifiedSymbols.length === 1 ? "that holding" : "those holdings"} and may be incomplete.`
      : null;

  return {
    rating,
    statedProfile: stated.name,
    actualProfile: actual.name,
    split,
    analysis,
    unclassifiedNote,
  };
}

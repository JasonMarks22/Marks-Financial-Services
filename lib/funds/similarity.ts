/**
 * Fund similarity scoring (pure logic — no UI).
 *
 * similarityScore(a, b) returns a 0–100 estimate of how alike two funds are,
 * based ONLY on the stated attributes in ./fundProfiles.ts, plus a breakdown of
 * what they share and how they differ so the UI can explain itself.
 *
 * IMPORTANT: this is a stated-method ESTIMATE, not a claim that two funds are
 * interchangeable. Similar funds can still perform very differently.
 *
 * Method:
 *   - Different assetClass  -> score 0, stop. (A bond fund is never "similar" to
 *     an equity fund.)
 *   - Otherwise, start at the assetClass weight and add the weight of each other
 *     attribute the two funds BOTH define and share. Attributes only one fund
 *     defines are not comparable and are skipped (never penalized, never
 *     credited).
 *   - If either fund is unprofiled, return null so callers can say "not enough
 *     data to compare" rather than guessing.
 */

import { getFundProfile, type FundProfile } from "./fundProfiles";

// Weights (sum to 100 for a fully-specified equity fund). Kept as named
// constants so they're easy to review and tune.
const WEIGHT_ASSET_CLASS = 40;
const WEIGHT_REGION = 25;
const WEIGHT_MARKET_CAP = 15;
const WEIGHT_STYLE = 15;
const WEIGHT_SECTOR = 5;
// marketCap + style don't apply to bonds; bondType is the bond analog and
// carries their combined weight so bond funds aren't systematically under-scored.
const WEIGHT_BOND_TYPE = WEIGHT_MARKET_CAP + WEIGHT_STYLE; // 30

export type SimilarityLabel =
  | "Very similar"
  | "Similar"
  | "Loosely related"
  | "Not similar";

export interface SimilarityResult {
  score: number; // 0–100
  label: SimilarityLabel;
  /** Plain-English attributes the two funds share. */
  matchingAttributes: string[];
  /** Plain-English attributes on which they differ. */
  differingAttributes: string[];
}

function bucket(score: number): SimilarityLabel {
  if (score >= 85) return "Very similar";
  if (score >= 70) return "Similar";
  if (score >= 50) return "Loosely related";
  return "Not similar";
}

// Human-readable value labels for the breakdown.
const REGION_LABELS: Record<string, string> = {
  us: "US",
  developedIntl: "developed international",
  emerging: "emerging markets",
  global: "global",
};
const CAP_LABELS: Record<string, string> = {
  large: "large-cap",
  mid: "mid-cap",
  small: "small-cap",
  broad: "all-cap",
};
const BOND_LABELS: Record<string, string> = {
  aggregate: "aggregate bond",
  treasury: "treasury",
  corporate: "corporate bond",
  short: "short-term bond",
  tips: "inflation-protected (TIPS)",
};
const sectorLabel = (s: string | null | undefined) =>
  s == null ? "diversified across sectors" : `${s} sector`;

export const SIMILARITY_DISCLAIMER =
  "Similarity is an educational estimate based on asset class, region, market cap, style, and sector. Similar funds can still perform very differently. Not investment advice.";

/**
 * Compare two funds by ticker. Returns null if either isn't profiled.
 */
export function similarityScore(
  symbolA: string,
  symbolB: string,
): SimilarityResult | null {
  const a = getFundProfile(symbolA);
  const b = getFundProfile(symbolB);
  if (!a || !b) return null;

  const matchingAttributes: string[] = [];
  const differingAttributes: string[] = [];

  // Different asset class => not similar, full stop.
  if (a.assetClass !== b.assetClass) {
    return {
      score: 0,
      label: "Not similar",
      matchingAttributes: [],
      differingAttributes: [
        `asset class (${a.assetClass} vs ${b.assetClass})`,
      ],
    };
  }

  let score = WEIGHT_ASSET_CLASS;
  matchingAttributes.push(`asset class (${a.assetClass})`);

  // Compare an attribute only when BOTH funds define it.
  const compare = <K extends keyof FundProfile>(
    key: K,
    weight: number,
    label: string,
    fmt: (v: FundProfile[K]) => string,
  ) => {
    const av = a[key];
    const bv = b[key];
    // `sector` uses null as a real value (diversified); other keys use undefined
    // for "unknown". Treat undefined as not-comparable.
    const aDefined = key === "sector" ? av !== undefined : av != null;
    const bDefined = key === "sector" ? bv !== undefined : bv != null;
    if (!aDefined || !bDefined) return;
    if (av === bv) {
      score += weight;
      matchingAttributes.push(`${label} (${fmt(av)})`);
    } else {
      differingAttributes.push(`${label} (${fmt(av)} vs ${fmt(bv)})`);
    }
  };

  compare("region", WEIGHT_REGION, "region", (v) => REGION_LABELS[String(v)] ?? String(v));
  compare("marketCap", WEIGHT_MARKET_CAP, "market cap", (v) => CAP_LABELS[String(v)] ?? String(v));
  compare("style", WEIGHT_STYLE, "style", (v) => String(v));
  compare("sector", WEIGHT_SECTOR, "sector focus", (v) => sectorLabel(v as string | null));
  compare("bondType", WEIGHT_BOND_TYPE, "bond type", (v) => BOND_LABELS[String(v)] ?? String(v));

  score = Math.min(100, Math.round(score));
  return { score, label: bucket(score), matchingAttributes, differingAttributes };
}

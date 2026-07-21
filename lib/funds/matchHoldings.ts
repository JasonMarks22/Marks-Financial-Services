/**
 * Match one portfolio's holdings against another's (pure logic — no UI).
 *
 * Used to compare a user's portfolio to a model portfolio. Matching happens in
 * two clearly-separated passes, and the two kinds of match are NEVER merged:
 *
 *   1. Exact ticker match  — the same symbol appears in both.
 *   2. Similarity match    — for a user holding with no exact match, the best
 *      model holding scoring at least the "Similar" threshold (70), via
 *      similarityScore. A similarity match is always reported as "similar",
 *      never as an exact/equivalent match.
 *
 * Anything with neither an exact nor a similar match is reported as unmatched.
 * This affects only how holdings are MATCHED and explained; it does not change
 * how holdings are classified or how a portfolio is graded.
 */

import { similarityScore } from "./similarity";

/** Minimum score to count as a similarity match ("Similar" bucket and up). */
export const SIMILAR_THRESHOLD = 70;

export interface HoldingRef {
  symbol: string;
  weight: number;
}

export interface ExactMatch {
  symbol: string;
  userWeight: number;
  modelWeight: number;
}

export interface SimilarMatch {
  userSymbol: string;
  userWeight: number;
  modelSymbol: string;
  score: number;
  /** Plain-English attributes the two funds share. */
  shared: string[];
}

export interface HoldingMatchResult {
  exact: ExactMatch[];
  similar: SimilarMatch[];
  /** User holdings with neither an exact nor a similarity match. */
  unmatched: HoldingRef[];
}

export function matchHoldings(
  userHoldings: HoldingRef[],
  modelHoldings: HoldingRef[],
): HoldingMatchResult {
  const model = modelHoldings.map((h) => ({
    symbol: h.symbol.trim().toUpperCase(),
    weight: h.weight,
  }));
  const modelSymbols = new Set(model.map((h) => h.symbol));

  const exact: ExactMatch[] = [];
  const similar: SimilarMatch[] = [];
  const unmatched: HoldingRef[] = [];

  for (const raw of userHoldings) {
    const symbol = raw.symbol.trim().toUpperCase();

    // Pass 1: exact ticker.
    if (modelSymbols.has(symbol)) {
      const m = model.find((h) => h.symbol === symbol)!;
      exact.push({ symbol, userWeight: raw.weight, modelWeight: m.weight });
      continue;
    }

    // Pass 2: best similarity against model holdings not already exact-matched.
    let best: SimilarMatch | null = null;
    for (const m of model) {
      if (exact.some((e) => e.symbol === m.symbol)) continue;
      const sim = similarityScore(symbol, m.symbol);
      if (sim && sim.score >= SIMILAR_THRESHOLD) {
        if (!best || sim.score > best.score) {
          best = {
            userSymbol: symbol,
            userWeight: raw.weight,
            modelSymbol: m.symbol,
            score: sim.score,
            shared: sim.matchingAttributes,
          };
        }
      }
    }

    if (best) similar.push(best);
    else unmatched.push({ symbol, weight: raw.weight });
  }

  return { exact, similar, unmatched };
}

/**
 * Monte Carlo retirement/investment simulation (pure calculation module — no UI).
 *
 * Instead of one fixed return, this projects MANY possible futures by drawing a
 * random monthly return each step from a normal distribution whose mean and
 * spread come from the user's expected annual return and volatility. Running
 * thousands of these paths shows a RANGE of outcomes, not a single guess.
 *
 *   each month, for each simulated path:
 *     draw   monthlyReturn ~ Normal(monthlyMean, monthlyStdDev)
 *     then   balance = max(0, balance * (1 + monthlyReturn) + contribution)
 *
 *   monthlyMean   = (1 + annualReturn)^(1/12) - 1     (geometric, so the
 *                   compounded annual mean matches the input)
 *   monthlyStdDev = annualVolatility / sqrt(12)        (standard scaling)
 *
 * DETERMINISM: the random generator is SEEDED, so the same inputs always
 * produce the same result. That keeps the UI stable across re-renders and
 * avoids any server/client hydration mismatch — while still being a real
 * random simulation. Change the seed to see a different set of draws.
 *
 * HONESTY: this is a simplified model. Real markets are not normally
 * distributed, returns are not independent month to month, and it ignores
 * taxes, fees, and sequence-of-withdrawal effects. It is an educational
 * illustration of variability, not a prediction. The UI must say so.
 */

export interface MonteCarloInput {
  initialAmount: number;
  monthlyContribution: number;
  years: number;
  /** Expected (mean) annual return, e.g. 7 for 7%. */
  expectedAnnualReturnPercent: number;
  /** Annual volatility (standard deviation), e.g. 15 for 15%. */
  annualVolatilityPercent: number;
  /** Optional target; enables the "probability of reaching goal" read-out. */
  goalAmount?: number;
  /** Number of simulated paths. Default 1000; clamped to [100, 5000]. */
  simulations?: number;
  /** RNG seed for reproducibility. Default 12345. */
  seed?: number;
}

/** Percentile snapshot of all simulated balances at one year boundary. */
export interface MonteCarloBandPoint {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export type MonteCarloResult =
  | {
      ok: true;
      /** One row per year (0..years) with the outcome percentiles. */
      bands: MonteCarloBandPoint[];
      /** Ending-balance percentiles (the last band row, surfaced for summary). */
      endingMedian: number;
      endingP10: number;
      endingP90: number;
      endingBest: number;
      endingWorst: number;
      /** Initial amount plus every contribution made over the horizon. */
      totalContributed: number;
      /** Fraction of paths (0..1) ending at/above the goal; null if no goal. */
      probabilityOfGoal: number | null;
      simulations: number;
    }
  | { ok: false; error: string };

/** Small, fast, seedable PRNG (mulberry32) — deterministic given a seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One standard-normal draw via the Box–Muller transform. */
function nextGaussian(rng: () => number): number {
  // Avoid log(0) by nudging the uniform draw off exactly zero.
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Linear-interpolated percentile of an ascending-sorted array. */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

export function runMonteCarlo({
  initialAmount,
  monthlyContribution,
  years,
  expectedAnnualReturnPercent,
  annualVolatilityPercent,
  goalAmount,
  simulations = 1000,
  seed = 12345,
}: MonteCarloInput): MonteCarloResult {
  const horizonYears = Math.floor(years);
  if (!(horizonYears >= 1)) {
    return { ok: false, error: "Enter a time horizon of at least 1 year." };
  }
  if (horizonYears > 60) {
    return { ok: false, error: "Keep the time horizon to 60 years or fewer." };
  }

  const initial = Math.max(0, initialAmount);
  const contribution = Math.max(0, monthlyContribution);
  const sims = Math.min(5000, Math.max(100, Math.floor(simulations)));

  const annualReturn = expectedAnnualReturnPercent / 100;
  const annualVol = Math.max(0, annualVolatilityPercent) / 100;
  // Geometric monthly mean so the compounded yearly mean matches the input;
  // guard the base against absurd inputs below -100%.
  const monthlyMean = Math.pow(1 + Math.max(-0.99, annualReturn), 1 / 12) - 1;
  const monthlyStdDev = annualVol / Math.sqrt(12);

  const months = horizonYears * 12;
  const rng = mulberry32(seed);

  // yearlySamples[y] collects every path's balance at year boundary y.
  const yearlySamples: number[][] = Array.from(
    { length: horizonYears + 1 },
    () => [],
  );

  for (let s = 0; s < sims; s++) {
    let balance = initial;
    yearlySamples[0].push(balance);
    for (let m = 1; m <= months; m++) {
      const monthlyReturn = monthlyMean + monthlyStdDev * nextGaussian(rng);
      // No leverage: a portfolio can't fall below zero.
      balance = Math.max(0, balance * (1 + monthlyReturn) + contribution);
      if (m % 12 === 0) {
        yearlySamples[m / 12].push(balance);
      }
    }
  }

  const bands: MonteCarloBandPoint[] = yearlySamples.map((samples, year) => {
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      year,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
    };
  });

  const ending = [...yearlySamples[horizonYears]].sort((a, b) => a - b);
  const totalContributed = initial + contribution * months;

  let probabilityOfGoal: number | null = null;
  if (typeof goalAmount === "number" && goalAmount > 0) {
    const reached = ending.filter((v) => v >= goalAmount).length;
    probabilityOfGoal = reached / ending.length;
  }

  return {
    ok: true,
    bands,
    endingMedian: percentile(ending, 50),
    endingP10: percentile(ending, 10),
    endingP90: percentile(ending, 90),
    endingBest: ending[ending.length - 1] ?? 0,
    endingWorst: ending[0] ?? 0,
    totalContributed,
    probabilityOfGoal,
    simulations: sims,
  };
}

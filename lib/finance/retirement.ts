/**
 * Retirement / compound-growth math (pure calculation module — no UI).
 *
 * Projects a nest egg from today to retirement with a fixed monthly
 * contribution and a constant assumed annual return:
 *
 *   each month:  balance = balance * (1 + r) + monthlyContribution
 *   where        r = (annualReturnPercent / 100) / 12
 *                n = (retirementAge - currentAge) * 12 months
 *
 * With r === 0 the loop naturally degenerates to "balance just accumulates
 * contributions" — no compounding, no special-casing needed.
 *
 * INFLATION ("today's dollars"): when annualInflationPercent > 0 we ALSO
 * report each future value discounted by inflation:
 *
 *   realValue = nominalValue / (1 + inflation)^yearsElapsed
 *
 * This expresses future dollars in TODAY'S SPENDING POWER — it does NOT
 * change the nominal balance; it's a second read-out of the same number so
 * users can see what the projection is actually worth in familiar terms.
 */

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturnPercent: number;
  /** Optional; 0 disables the today's-dollars figures. */
  annualInflationPercent?: number;
}

export interface RetirementYearPoint {
  age: number;
  /** Nominal balance at this age. */
  balance: number;
  /** Starting savings plus every deposit made so far. */
  contributions: number;
  /** balance - contributions, clamped at 0 against float wobble. */
  growth: number;
  /** Balance in today's dollars; null when inflation is 0/off. */
  realBalance: number | null;
}

export type RetirementResult =
  | {
      ok: true;
      finalBalance: number;
      totalContributed: number;
      totalGrowth: number;
      /** Final balance in today's dollars; null when inflation is 0/off. */
      realFinalBalance: number | null;
      /** One point per year of age, from currentAge to retirementAge. */
      series: RetirementYearPoint[];
    }
  | { ok: false; error: string };

export function projectRetirement({
  currentAge,
  retirementAge,
  currentSavings,
  monthlyContribution,
  annualReturnPercent,
  annualInflationPercent = 0,
}: RetirementInput): RetirementResult {
  // Guard: the horizon must be a real, forward-looking span.
  if (!(retirementAge > currentAge)) {
    return {
      ok: false,
      error: "Retirement age must be greater than your current age.",
    };
  }

  const years = retirementAge - currentAge;
  const r = annualReturnPercent / 100 / 12;
  const inflation = Math.max(0, annualInflationPercent) / 100;
  const useInflation = inflation > 0;

  // Discount a nominal value back to today's spending power.
  const toReal = (value: number, yearsElapsed: number) =>
    value / Math.pow(1 + inflation, yearsElapsed);

  let balance = currentSavings;
  let contributions = currentSavings;

  const series: RetirementYearPoint[] = [
    {
      age: currentAge,
      balance,
      contributions,
      growth: 0,
      realBalance: useInflation ? balance : null, // year 0: real == nominal
    },
  ];

  // Month-by-month walk, recording a snapshot at each year boundary.
  for (let year = 1; year <= years; year++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + monthlyContribution;
      contributions += monthlyContribution;
    }
    series.push({
      age: currentAge + year,
      balance,
      contributions,
      growth: Math.max(0, balance - contributions),
      realBalance: useInflation ? toReal(balance, year) : null,
    });
  }

  return {
    ok: true,
    finalBalance: balance,
    totalContributed: contributions,
    totalGrowth: Math.max(0, balance - contributions),
    realFinalBalance: useInflation ? toReal(balance, years) : null,
    series,
  };
}

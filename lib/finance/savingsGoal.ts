/**
 * Savings-goal math (pure calculation module — no UI).
 *
 * Given a target amount, what you've already saved, a time horizon, and an
 * expected annual return, this figures out the fixed monthly contribution you
 * need, and produces a month-by-month projection suitable for charting.
 *
 * All money values are in the same currency unit (e.g. dollars). Rates are
 * expressed as a whole-number percent on input (e.g. 4 means 4%/year).
 */

/** One row of the month-by-month projection. */
export interface SavingsGoalPoint {
  /** Months elapsed since today. Month 0 is the starting balance. */
  month: number;
  /** Projected total account balance at the end of this month. */
  balance: number;
  /** Money you personally put in so far (starting savings + deposits). */
  contributions: number;
  /** Growth earned from returns so far (balance minus contributions). */
  interestEarned: number;
}

/** Result of a savings-goal calculation. */
export interface SavingsGoalResult {
  /** Fixed amount to deposit each month to reach the goal (never negative). */
  monthlyContribution: number;
  /** Month-by-month projection, from month 0 (today) through the final month. */
  schedule: SavingsGoalPoint[];
  /** Convenience totals taken from the final month of the projection. */
  totalContributions: number;
  totalInterest: number;
  finalBalance: number;
  /** True when current savings alone already grow to meet/exceed the goal. */
  alreadyOnTrack: boolean;
}

export interface SavingsGoalInput {
  /** The target amount you want to reach. */
  goalAmount: number;
  /** How much you have saved right now. */
  currentSavings: number;
  /** Time horizon in years. */
  years: number;
  /** Expected annual return as a percent (e.g. 4 for 4%). */
  annualRatePercent: number;
}

/**
 * Calculate the required monthly contribution and a projection to the goal.
 *
 * The core is the future value of an ordinary annuity. If you deposit `monthly`
 * at the end of each period and already hold `currentSavings`, then after `n`
 * periods at periodic rate `r` the balance is:
 *
 *     FV = currentSavings * (1 + r)^n  +  monthly * ((1 + r)^n - 1) / r
 *
 * We want FV to equal the goal, so we solve that equation for `monthly`:
 *
 *     monthly = (goal - currentSavings * (1 + r)^n) * r / ((1 + r)^n - 1)
 */
export function calculateSavingsGoal({
  goalAmount,
  currentSavings,
  years,
  annualRatePercent,
}: SavingsGoalInput): SavingsGoalResult {
  // Convert the annual inputs to a monthly basis: `r` is the monthly rate and
  // `n` is the total number of monthly periods.
  const r = annualRatePercent / 100 / 12;
  const n = Math.round(years * 12);

  // Guard: with no time horizon there is nothing to project. Return a single
  // starting point so callers (and charts) always get a valid schedule.
  if (n <= 0) {
    return {
      monthlyContribution: 0,
      schedule: [
        {
          month: 0,
          balance: currentSavings,
          contributions: currentSavings,
          interestEarned: 0,
        },
      ],
      totalContributions: currentSavings,
      totalInterest: 0,
      finalBalance: currentSavings,
      alreadyOnTrack: currentSavings >= goalAmount,
    };
  }

  // Growth factor applied to a lump sum held for the full horizon. With r === 0
  // this is simply 1, so current savings neither grow nor shrink.
  const growthFactor = Math.pow(1 + r, n);
  const grownCurrentSavings = currentSavings * growthFactor;

  // EDGE CASE 2 — already on track: if what you have today grows to meet or
  // exceed the goal on its own, no monthly deposit is needed. We stop here so
  // we never report a negative (i.e. "withdraw") contribution.
  const alreadyOnTrack = grownCurrentSavings >= goalAmount;

  let monthlyContribution: number;
  if (alreadyOnTrack) {
    monthlyContribution = 0;
  } else if (r === 0) {
    // EDGE CASE 1 — zero interest: the annuity formula divides by r, which is 0
    // here. With no growth the money required is just the shortfall spread
    // evenly across every month.
    monthlyContribution = (goalAmount - currentSavings) / n;
  } else {
    // General case — the annuity formula solved for the monthly payment.
    monthlyContribution =
      ((goalAmount - grownCurrentSavings) * r) / (growthFactor - 1);
  }

  // Floating-point math can produce a tiny negative value right at the on-track
  // boundary; clamp so the contribution is never below zero.
  monthlyContribution = Math.max(0, monthlyContribution);

  // Build the month-by-month projection. We start at month 0 holding exactly
  // the current savings, then step forward one month at a time.
  const schedule: SavingsGoalPoint[] = [
    {
      month: 0,
      balance: currentSavings,
      contributions: currentSavings,
      interestEarned: 0,
    },
  ];

  let balance = currentSavings;
  for (let month = 1; month <= n; month++) {
    // Each month the existing balance grows by the monthly rate, then the new
    // deposit is added on top.
    balance = balance * (1 + r) + monthlyContribution;

    // Contributions are the starting savings plus every deposit made so far.
    const contributions = currentSavings + monthlyContribution * month;

    // Whatever the balance exceeds contributions by is growth (interest).
    // Guard against negatives so a rounding wobble never shows negative interest.
    const interestEarned = Math.max(0, balance - contributions);

    schedule.push({
      month,
      balance: Math.max(0, balance),
      contributions,
      interestEarned,
    });
  }

  const last = schedule[schedule.length - 1];

  return {
    monthlyContribution,
    schedule,
    totalContributions: last.contributions,
    totalInterest: last.interestEarned,
    finalBalance: last.balance,
    alreadyOnTrack,
  };
}

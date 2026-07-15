/**
 * Budget math (pure calculation module — no UI).
 *
 * The caller supplies monthly take-home income and a list of spending
 * categories. Each category is tagged with one of three "buckets" that map to
 * the classic 50/30/20 budgeting rule:
 *
 *   - "needs"   → essentials you can't easily skip (housing, groceries,
 *                 utilities, transportation, insurance). Target: ~50% of income.
 *   - "wants"   → lifestyle/discretionary spending (dining out, entertainment,
 *                 subscriptions, hobbies). Target: ~30% of income.
 *   - "savings" → money set aside or used to pay down debt (emergency fund,
 *                 investments, extra loan payments). Target: ~20% of income.
 *
 * All money values are in the same currency unit (e.g. dollars per month).
 */

export type Bucket = "needs" | "wants" | "savings";

export interface BudgetCategory {
  name: string;
  amount: number;
  bucket: Bucket;
}

export interface BucketBreakdown {
  /** Dollar total assigned to this bucket. */
  amount: number;
  /** That total as a percentage of income (0 when income is 0). */
  percentOfIncome: number;
  /** The 50/30/20 target dollar amount for this bucket. */
  target: number;
}

export interface BudgetResult {
  income: number;
  /** Sum of every category amount. */
  totalSpending: number;
  /** income - totalSpending. Positive = money left to allocate; may be negative. */
  leftover: number;
  /** True when spending exceeds income. */
  overspending: boolean;
  /** How far over income spending is (0 when not overspending). */
  overspendingAmount: number;
  /** Per-bucket totals, percentages, and 50/30/20 targets. */
  buckets: Record<Bucket, BucketBreakdown>;
}

// The 50/30/20 rule expressed as fractions of income.
const TARGET_FRACTIONS: Record<Bucket, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

/**
 * Summarize a budget: totals, leftover, overspending, and a per-bucket
 * comparison against the 50/30/20 guideline.
 */
export function calculateBudget(
  income: number,
  categories: BudgetCategory[],
): BudgetResult {
  // Guard against non-finite/negative income so downstream math stays sane.
  const safeIncome = Number.isFinite(income) && income > 0 ? income : 0;

  // Running totals: overall spending and per-bucket spending.
  let totalSpending = 0;
  const bucketAmounts: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };

  for (const category of categories) {
    const amount =
      Number.isFinite(category.amount) && category.amount > 0
        ? category.amount
        : 0;
    totalSpending += amount;
    // Only add to a known bucket; ignore anything mis-tagged.
    if (category.bucket in bucketAmounts) {
      bucketAmounts[category.bucket] += amount;
    }
  }

  const leftover = safeIncome - totalSpending;
  const overspending = leftover < 0;

  // Build the per-bucket breakdown with percentage-of-income and 50/30/20 target.
  const buckets = {} as Record<Bucket, BucketBreakdown>;
  (Object.keys(TARGET_FRACTIONS) as Bucket[]).forEach((bucket) => {
    const amount = bucketAmounts[bucket];
    buckets[bucket] = {
      amount,
      percentOfIncome: safeIncome > 0 ? (amount / safeIncome) * 100 : 0,
      target: safeIncome * TARGET_FRACTIONS[bucket],
    };
  });

  return {
    income: safeIncome,
    totalSpending,
    leftover,
    overspending,
    overspendingAmount: overspending ? -leftover : 0,
    buckets,
  };
}

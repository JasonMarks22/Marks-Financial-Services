/**
 * The single source of truth for turning the data layer's raw security `type`
 * (as Yahoo reports it) into a human label. Used everywhere a security type is
 * shown, so ETFs are never mislabeled as "stocks".
 *
 * Never guesses: any type we don't explicitly recognize becomes "Other" rather
 * than defaulting to "Stock".
 */
export function securityTypeLabel(type: string | null | undefined): string {
  switch ((type ?? "").toUpperCase()) {
    case "EQUITY":
      return "Stock"; // individual companies only
    case "ETF":
      return "Index Fund (ETF)";
    case "MUTUALFUND":
      return "Mutual Fund";
    case "INDEX":
      return "Index";
    default:
      return "Other";
  }
}

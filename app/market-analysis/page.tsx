import { redirect } from "next/navigation";

/**
 * The Market Analysis content now lives on the homepage, so this route
 * permanently redirects there. Kept (rather than deleted) so any existing
 * links to /market-analysis still land somewhere useful.
 */
export default function MarketAnalysisPage() {
  redirect("/");
}

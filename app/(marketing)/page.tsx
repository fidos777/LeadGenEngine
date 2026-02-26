import { redirect } from "next/navigation";

/**
 * Root marketing page — redirects to the PowerRoof landing page.
 * The full landing page is served as a static HTML file from /public
 * to preserve the self-contained design (inline CSS, no build deps).
 */
export default function MarketingPage() {
  redirect("/powerroof-landing.html");
}

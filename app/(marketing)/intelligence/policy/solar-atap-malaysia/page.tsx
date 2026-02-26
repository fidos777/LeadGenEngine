import type { Metadata } from "next";
import ArticleLayout from "@/components/intelligence/ArticleLayout";

export const metadata: Metadata = {
  title: "What Is Solar ATAP in Malaysia? | PowerRoof Intelligence",
  description:
    "Solar ATAP replaces NEM 3.0 as Malaysia's rooftop solar framework from January 2026. Learn how wholesale SMP settlement, no-rollover rules, and no-quota access change C&I solar economics.",
  openGraph: {
    title: "What Is Solar ATAP in Malaysia?",
    description:
      "The definitive guide to Malaysia's Solar Accelerated Transition Action Programme — how ATAP changes C&I solar economics with wholesale SMP settlement.",
    type: "article",
  },
};

export default function SolarAtapMalaysiaArticle() {
  return (
    <ArticleLayout
      title="What Is Solar ATAP in Malaysia?"
      subtitle="The Accelerated Transition Action Programme replaces NEM 3.0 — and fundamentally changes how commercial solar economics work."
      pillar="policy"
      publishDate="February 2026"
      readTime="8 min read"
      related={[
        {
          title: "What Is System Marginal Price (SMP) in Malaysia?",
          href: "/intelligence/policy/system-marginal-price-malaysia",
          pillar: "policy",
        },
        {
          title: "Why Oversizing Reduces ROI Under ATAP",
          href: "/intelligence/financial/oversizing-risk-under-atap",
          pillar: "financial",
        },
      ]}
    >
      <h2>The Shift from Retail to Wholesale</h2>
      <p>
        Solar ATAP — the Solar Accelerated Transition Action Programme — is the
        Malaysian government's replacement for the Net Energy Metering (NEM 3.0)
        scheme. Effective 1 January 2026, ATAP introduces a fundamentally
        different economic structure for rooftop solar, particularly for
        commercial and industrial (C&I) installations.
      </p>
      <p>
        Under NEM 3.0, excess solar generation exported to the grid earned
        credits at the retail tariff rate — the same price you paid TNB for
        imported electricity. A factory exporting surplus kWh effectively
        received RM 0.334/kWh (the blended C1/C2 tariff) as offset credit.
      </p>
      <p>
        ATAP changes this. Exported energy is now offset at the{" "}
        <strong>System Marginal Price (SMP)</strong> — the wholesale electricity
        clearing price published monthly by Single Buyer Malaysia. SMP
        typically ranges between RM 0.19–0.24/kWh, approximately 40–60% below
        the retail tariff.
      </p>

      <div className="callout callout-blue">
        <strong>The core economic shift:</strong> Every kWh you export is now
        worth roughly half of every kWh you consume directly. This makes
        self-consumption the primary driver of solar ROI — not total generation.
      </div>

      <h2>How ATAP Works: The Mechanics</h2>

      <h3>No Quota, Open Access</h3>
      <p>
        Unlike NEM 3.0, which allocated limited annual quotas (often exhausted
        within weeks of opening), ATAP operates on a no-quota basis. Any
        eligible premises can apply at any time, provided they meet the
        technical and regulatory requirements specified in GP/ST/No.60/2025.
      </p>

      <h3>10-Year Contract Period</h3>
      <p>
        ATAP installations are governed by a 10-year agreement with TNB. During
        this period, the export credit mechanism remains fixed — excess
        generation is offset at the prevailing Monthly Average SMP for the
        billing period.
      </p>

      <h3>Monthly No-Rollover Rule</h3>
      <p>
        This is the policy detail most commonly missed in industry discussions.
        Under ATAP, any excess export credits that are not consumed within the
        billing month are <strong>forfeited</strong>. They do not roll over to
        the next month. This creates a structural penalty for oversized systems
        that consistently export more than they can offset against their monthly
        bill.
      </p>

      <div className="callout callout-amber">
        <strong>Forfeiture risk:</strong> A 350 kWp system on a factory with
        280 kW maximum demand may export 30–40% of generation during weekends
        and holidays. If the monthly export credit exceeds the import bill, the
        difference is lost — permanently.
      </div>

      <h3>SMP Settlement: The Export Rate</h3>
      <p>
        For non-domestic users (C1, C2, and industrial tariff categories), the
        unit price of exported energy is based on the Average SMP — a monthly
        average calculated from daily SMP values during the 7:00–19:00 hour
        window of the preceding calendar month. Single Buyer Malaysia publishes
        this figure by the 14th of each month at{" "}
        <a
          href="https://www.singlebuyer.com.my/resources-marginal.php"
          target="_blank"
          rel="noopener noreferrer"
        >
          singlebuyer.com.my
        </a>
        .
      </p>

      <table>
        <thead>
          <tr>
            <th>Mechanism</th>
            <th>NEM 3.0 (Previous)</th>
            <th>Solar ATAP (Current)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Export credit rate</td>
            <td>Retail tariff (RM 0.334/kWh)</td>
            <td>SMP wholesale (~RM 0.22/kWh)</td>
          </tr>
          <tr>
            <td>Quota availability</td>
            <td>Limited annual allocation</td>
            <td>No quota — open access</td>
          </tr>
          <tr>
            <td>Credit rollover</td>
            <td>Up to 24 months</td>
            <td>No rollover — monthly forfeiture</td>
          </tr>
          <tr>
            <td>Contract duration</td>
            <td>Varies by programme</td>
            <td>10-year fixed agreement</td>
          </tr>
          <tr>
            <td>Application process</td>
            <td>Via SEDA quota system</td>
            <td>Via SEDA — no quota constraint</td>
          </tr>
        </tbody>
      </table>

      <h2>What This Means for C&I Solar</h2>

      <h3>Sizing Logic Must Change</h3>
      <p>
        Under NEM 3.0, the optimal strategy was simple: maximise roof coverage,
        because every exported kWh earned full retail credit. Under ATAP, the
        calculus reverses. The optimal system size is now determined by the
        facility's <strong>daytime load profile</strong> — specifically the
        self-consumption band where most generation displaces TNB tariff rather
        than earning wholesale SMP credits.
      </p>
      <p>
        For most C&I facilities operating day-dominant schedules (7am–6pm), the
        optimal sizing target is typically 75–85% of the contracted Maximum
        Demand (MD). This range maximises the proportion of generation that
        displaces expensive retail tariff while minimising export exposure to
        volatile wholesale SMP.
      </p>

      <h3>Financial Modelling Must Include Export Exposure</h3>
      <p>
        Any credible financial assessment under ATAP must model the export
        component explicitly. A payback calculation that assumes 100%
        self-consumption is misleading. A properly structured model separates
        savings into two streams:
      </p>
      <ul>
        <li>
          <strong>Self-consumed generation</strong> — displaces TNB tariff at
          RM 0.334/kWh (blended C1/C2 effective rate)
        </li>
        <li>
          <strong>Exported generation</strong> — earns SMP credit at
          approximately RM 0.22/kWh (12-month average)
        </li>
      </ul>
      <p>
        The ratio between these two determines actual ROI. At 80%
        self-consumption, the investment case remains strong. At 60%
        self-consumption, payback extends significantly and forfeiture risk
        increases.
      </p>

      <div className="callout callout-green">
        <strong>Key insight:</strong> The self-consumption ratio is more
        important than system size in determining ATAP ROI. A well-sized 250 kWp
        system at 85% self-consumption will outperform an oversized 400 kWp
        system at 60% self-consumption — every year for 25 years.
      </div>

      <h2>Eligibility Requirements</h2>
      <p>ATAP eligibility under GP/ST/No.60/2025 requires:</p>
      <ul>
        <li>
          <strong>Single-tenant premises</strong> — multi-tenant structures are
          excluded (this disqualifies most industrial complexes and commercial
          towers)
        </li>
        <li>
          <strong>Valid TNB account</strong> — the installing premises must have
          an active commercial or industrial electricity account
        </li>
        <li>
          <strong>Structural roof certification</strong> — roof must be
          certified to bear the additional load of the PV system
        </li>
        <li>
          <strong>CAS approval</strong> — Connection Approval from TNB,
          confirming grid connection capacity
        </li>
      </ul>

      <h2>The Intelligence Gap</h2>
      <p>
        Most EPC contractors have not adjusted their proposal methodology for
        ATAP economics. Standard EPC quotes still use roof-maximum sizing,
        assume favourable self-consumption ratios, and often omit SMP sensitivity
        analysis entirely. This creates a structural information gap between
        what the market offers and what a C&I decision-maker needs to make an
        informed investment decision.
      </p>
      <p>
        This is the gap that structured pre-engineering intelligence fills — an
        ATAP-aware feasibility assessment that models export exposure,
        quantifies forfeiture risk, and validates eligibility before any
        engineering commitment.
      </p>

      <h2>Summary</h2>
      <table>
        <thead>
          <tr>
            <th>ATAP Feature</th>
            <th>Implication for C&I Solar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SMP wholesale settlement</td>
            <td>Self-consumption drives ROI, not total generation</td>
          </tr>
          <tr>
            <td>No credit rollover</td>
            <td>Oversized systems face monthly forfeiture</td>
          </tr>
          <tr>
            <td>No quota restriction</td>
            <td>Timing pressure removed — can optimise before committing</td>
          </tr>
          <tr>
            <td>10-year contract</td>
            <td>Long commitment demands thorough upfront analysis</td>
          </tr>
          <tr>
            <td>MD alignment required</td>
            <td>System must match facility load, not roof area</td>
          </tr>
        </tbody>
      </table>

      <p>
        Solar under ATAP is an optimisation problem. Engineering follows
        optimisation — not the other way around.
      </p>
    </ArticleLayout>
  );
}

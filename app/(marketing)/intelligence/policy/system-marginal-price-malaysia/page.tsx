import type { Metadata } from "next";
import ArticleLayout from "@/components/intelligence/ArticleLayout";

export const metadata: Metadata = {
  title: "What Is System Marginal Price (SMP) in Malaysia? | PowerRoof Intelligence",
  description:
    "System Marginal Price is the wholesale electricity clearing price that determines solar export credits under ATAP. Learn how SMP is calculated, who publishes it, and why it matters for C&I solar.",
  openGraph: {
    title: "System Marginal Price (SMP) Explained — Malaysia Solar",
    description:
      "SMP is the wholesale clearing price that determines your solar export credits under ATAP. Here's what C&I decision-makers need to know.",
    type: "article",
  },
};

export default function SMPArticle() {
  return (
    <ArticleLayout
      title="What Is System Marginal Price (SMP) in Malaysia?"
      subtitle="The wholesale electricity price that determines your solar export credits under ATAP — and why it matters less than you think."
      pillar="policy"
      publishDate="February 2026"
      readTime="7 min read"
      related={[
        {
          title: "What Is Solar ATAP in Malaysia?",
          href: "/intelligence/policy/solar-atap-malaysia",
          pillar: "policy",
        },
        {
          title: "Why Oversizing Reduces ROI Under ATAP",
          href: "/intelligence/financial/oversizing-risk-under-atap",
          pillar: "financial",
        },
      ]}
    >
      <h2>SMP: The Wholesale Clearing Price</h2>
      <p>
        System Marginal Price (SMP) is the price of the most expensive unit of
        electricity dispatched to meet demand at any given time. In Malaysia's
        single-buyer electricity market, generators submit offers to sell power.
        The system operator dispatches the cheapest generators first — hydro,
        then gas, then coal. As demand rises through the day, more expensive
        generation comes online. The last generator dispatched to meet the
        demand sets the SMP.
      </p>
      <p>
        For C&I solar under ATAP, SMP is directly relevant because it
        determines the credit rate for any solar generation exported to the
        grid. Every kWh your system produces beyond your facility's immediate
        consumption earns an offset credit at the Average SMP — not at the
        retail tariff you pay TNB.
      </p>

      <div className="callout callout-blue">
        <strong>The distinction matters:</strong> You pay TNB approximately
        RM 0.334/kWh for electricity imported from the grid. You receive
        approximately RM 0.22/kWh for electricity exported back. This 34%
        differential is the economic foundation of ATAP sizing logic.
      </div>

      <h2>Who Publishes SMP?</h2>
      <p>
        This is where institutional confusion commonly occurs. Two separate
        entities govern Malaysia's electricity market, and their roles are
        frequently conflated:
      </p>

      <table>
        <thead>
          <tr>
            <th>Entity</th>
            <th>Role</th>
            <th>Relevance to Solar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Suruhanjaya Tenaga (ST)</strong></td>
            <td>Energy Commission — regulator</td>
            <td>Sets tariff structure, issues licences, approves CAS</td>
          </tr>
          <tr>
            <td><strong>Single Buyer Malaysia</strong></td>
            <td>Market operator — procurement and dispatch</td>
            <td>Publishes monthly Average SMP, manages wholesale market</td>
          </tr>
        </tbody>
      </table>

      <p>
        Single Buyer publishes the Monthly Average SMP by the 14th of each
        month at{" "}
        <a
          href="https://www.singlebuyer.com.my/resources-marginal.php"
          target="_blank"
          rel="noopener noreferrer"
        >
          singlebuyer.com.my
        </a>
        . The Average SMP is calculated from daily SMP values during the{" "}
        <strong>7:00–19:00 hour window</strong> — the daytime period when solar
        generation occurs — of the preceding calendar month.
      </p>

      <h2>How SMP Is Calculated</h2>
      <p>
        The SMP calculation follows a merit-order dispatch model. In simplified
        terms:
      </p>
      <ol>
        <li>
          Generators submit price-quantity offers to Single Buyer daily
        </li>
        <li>
          Single Buyer dispatches generators in ascending price order —
          cheapest first
        </li>
        <li>
          The offer price of the last (most expensive) generator needed to meet
          demand sets that period's SMP
        </li>
        <li>
          Monthly Average SMP aggregates the daytime (7am–7pm) values over the
          preceding month
        </li>
      </ol>
      <p>
        SMP fluctuates based on fuel costs (primarily gas and coal prices),
        demand patterns (seasonal, day-of-week), and the generation mix
        available. Hot months with high cooling demand tend to push SMP higher.
        Festive periods with lower industrial activity tend to depress it.
      </p>

      <h2>Historical SMP Range</h2>
      <p>
        Based on available market data, Malaysia's Average SMP has traded within
        the following ranges:
      </p>

      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>SMP Range</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2021 (Jan–Apr)</td>
            <td>RM 0.10–0.15/kWh</td>
            <td>COVID demand suppression, low fuel prices</td>
          </tr>
          <tr>
            <td>2024 (Jan–Apr)</td>
            <td>~RM 0.20/kWh average</td>
            <td>Stabilised post-COVID, moderate fuel prices</td>
          </tr>
          <tr>
            <td>2025 (12-month)</td>
            <td>RM 0.19–0.24/kWh</td>
            <td>RP4 tariff reset July 2025, seasonal variation</td>
          </tr>
        </tbody>
      </table>

      <div className="callout callout-amber">
        <strong>Data note:</strong> SMP figures prior to 2024 reflect
        pre-ATAP market conditions. Post-ATAP SMP may diverge as solar
        penetration increases and the generation mix shifts. Historical values
        are indicative, not predictive.
      </div>

      <h2>How SMP Affects C&I Solar Economics</h2>

      <h3>The Two-Stream Savings Model</h3>
      <p>
        Under ATAP, your solar savings come from two distinct streams, each
        priced differently:
      </p>

      <table>
        <thead>
          <tr>
            <th>Stream</th>
            <th>Rate</th>
            <th>Value Driver</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Self-consumed generation</strong></td>
            <td>TNB retail tariff (~RM 0.334/kWh)</td>
            <td>Displaces grid import — full tariff value</td>
          </tr>
          <tr>
            <td><strong>Exported generation</strong></td>
            <td>Average SMP (~RM 0.22/kWh)</td>
            <td>Wholesale credit — discounted value</td>
          </tr>
        </tbody>
      </table>

      <p>
        For a typical C&I system at 80% self-consumption, the savings
        composition works out to approximately:
      </p>
      <ul>
        <li>80% of generation × RM 0.334 = primary savings stream (tariff displacement)</li>
        <li>20% of generation × RM 0.22 = secondary savings stream (SMP export credit)</li>
      </ul>
      <p>
        This means <strong>approximately 92% of total savings come from
        self-consumption</strong>, even though only 80% of kWh are self-consumed.
        The export component contributes roughly 8% of value.
      </p>

      <h3>Why SMP Volatility Has Limited Impact</h3>
      <p>
        A common concern among CFOs evaluating solar under ATAP is SMP
        volatility. The argument goes: if the export rate fluctuates monthly,
        how reliable is the investment case?
      </p>
      <p>
        The answer is quantifiable. For a well-sized 280 kWp system with 80%
        self-consumption and 364,000 kWh annual generation:
      </p>
      <ul>
        <li>Export portion: 72,800 kWh/year</li>
        <li>SMP swing of RM 0.10 (from 0.15 to 0.25): RM 7,280/year impact</li>
        <li>Total annual savings at base case: ~RM 113,000/year</li>
        <li>SMP impact as percentage of total savings: ~6.5%</li>
        <li>Payback variation from full SMP range: approximately 0.3 years</li>
      </ul>

      <div className="callout callout-green">
        <strong>The strategic conclusion:</strong> SMP volatility is a
        second-order variable. Self-consumption ratio is the primary
        determinant of ATAP economics. Size the system to maximise
        self-consumption, and SMP volatility becomes manageable.
      </div>

      <h2>SMP Under Solar ATAP: Key Rules</h2>
      <ul>
        <li>
          <strong>Non-domestic users</strong> receive export credits at Average
          SMP (wholesale). This applies to all C1, C2, and industrial tariff
          categories.
        </li>
        <li>
          <strong>Domestic users</strong> receive credits at prevailing retail
          energy rates — RM 0.27/kWh for usage up to 1,500 kWh/month, or
          RM 0.37/kWh above that threshold. This article focuses on C&I
          (non-domestic) applications.
        </li>
        <li>
          <strong>No credit rollover</strong> — excess export credits not used
          within the billing month are forfeited. This reinforces the
          importance of proper sizing.
        </li>
        <li>
          <strong>SMP is published, not negotiated</strong> — it is a
          market-determined price, not subject to individual contract terms.
        </li>
      </ul>

      <h2>Practical Implications</h2>
      <p>
        For a C&I facility evaluating solar under ATAP, the SMP framework means:
      </p>
      <ol>
        <li>
          <strong>Size for self-consumption, not generation.</strong> The
          optimal system displaces the maximum amount of retail-priced
          electricity, not the maximum number of kWh.
        </li>
        <li>
          <strong>Model export exposure explicitly.</strong> Any proposal that
          assumes 100% self-consumption or ignores SMP pricing is incomplete.
        </li>
        <li>
          <strong>Use current SMP data.</strong> A credible financial assessment
          references the latest published Average SMP, not a generic estimate.
        </li>
        <li>
          <strong>Run sensitivity analysis.</strong> Model the investment case
          across the historical SMP range to understand worst-case and
          best-case outcomes.
        </li>
      </ol>

      <p>
        The SMP framework is not a barrier to C&I solar — it is a pricing
        mechanism that rewards disciplined sizing. Systems properly matched to
        facility load profiles remain highly attractive investments under ATAP.
      </p>
    </ArticleLayout>
  );
}

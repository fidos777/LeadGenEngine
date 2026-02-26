import type { Metadata } from "next";
import ArticleLayout from "@/components/intelligence/ArticleLayout";

export const metadata: Metadata = {
  title:
    "Why Oversizing Reduces ROI Under ATAP | PowerRoof Intelligence",
  description:
    "Under Malaysia's Solar ATAP framework, maximising roof coverage no longer maximises returns. Learn why oversized systems face export penalties, forfeiture risk, and longer payback periods.",
  openGraph: {
    title: "Why Oversizing Reduces ROI Under Solar ATAP",
    description:
      "Maximising roof area increases export exposure to volatile wholesale SMP — and triggers monthly credit forfeiture. Here's the quantified case for load-matched sizing.",
    type: "article",
  },
};

export default function OversizingRiskArticle() {
  return (
    <ArticleLayout
      title="Why Oversizing Reduces ROI Under ATAP"
      subtitle="Under NEM 3.0, bigger was better. Under ATAP, bigger means more export exposure, lower effective rates, and forfeited credits. Here's the quantified case."
      pillar="financial"
      publishDate="February 2026"
      readTime="9 min read"
      related={[
        {
          title: "What Is Solar ATAP in Malaysia?",
          href: "/intelligence/policy/solar-atap-malaysia",
          pillar: "policy",
        },
        {
          title: "What Is System Marginal Price (SMP) in Malaysia?",
          href: "/intelligence/policy/system-marginal-price-malaysia",
          pillar: "policy",
        },
      ]}
    >
      <h2>The NEM 3.0 Logic No Longer Applies</h2>
      <p>
        Under Malaysia's previous Net Energy Metering (NEM 3.0) scheme, the
        sizing logic for C&I rooftop solar was straightforward: install the
        largest system your roof could support. Every kilowatt-hour exported
        to the grid earned credits at the full retail tariff — the same rate
        you paid TNB for imported electricity. Oversizing carried no economic
        penalty because exported and self-consumed energy were valued
        identically.
      </p>
      <p>
        ATAP changes this equation. Under the Solar Accelerated Transition
        Action Programme, exported energy is credited at the System Marginal
        Price (SMP) — Malaysia's wholesale electricity clearing price,
        typically RM 0.19–0.24/kWh. Self-consumed energy still displaces
        the retail tariff at approximately RM 0.334/kWh. The gap between
        these two rates — roughly 34% — means every kWh exported instead
        of consumed represents a loss of RM 0.11 in value.
      </p>

      <div className="callout callout-blue">
        <strong>The core shift:</strong> Under NEM 3.0, all generation had
        equal value. Under ATAP, self-consumed kWh are worth 52% more than
        exported kWh. Sizing logic must follow this new economic reality.
      </div>

      <h2>The Two-Rate Problem</h2>
      <p>
        To understand why oversizing hurts under ATAP, consider what happens
        to each unit of solar generation:
      </p>

      <table>
        <thead>
          <tr>
            <th>Destination</th>
            <th>Effective Rate</th>
            <th>Value per 1,000 kWh</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Self-consumed</strong> (displaces TNB import)</td>
            <td>RM 0.334/kWh</td>
            <td>RM 334</td>
          </tr>
          <tr>
            <td><strong>Exported</strong> (SMP credit)</td>
            <td>~RM 0.22/kWh</td>
            <td>RM 220</td>
          </tr>
          <tr>
            <td><strong>Forfeited</strong> (excess credits)</td>
            <td>RM 0.00/kWh</td>
            <td>RM 0</td>
          </tr>
        </tbody>
      </table>

      <p>
        The third row is critical. Under ATAP, export credits that exceed
        your monthly TNB bill are forfeited — they do not roll over. An
        oversized system that consistently generates more export credits
        than it can offset against monthly consumption effectively gives
        away electricity for free during those surplus periods.
      </p>

      <h2>Quantified Comparison: Load-Matched vs Oversized</h2>
      <p>
        Consider a factory in Selangor with a contracted Maximum Demand (MD)
        of 280 kW, operating Monday–Saturday on a standard industrial
        schedule (7am–6pm). The facility's annual electricity consumption is
        approximately 1,460,000 kWh. Two system sizes are proposed:
      </p>

      <h3>Option A: Load-Matched (250 kWp)</h3>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>System size</td>
            <td>250 kWp</td>
          </tr>
          <tr>
            <td>Annual generation</td>
            <td>325,000 kWh</td>
          </tr>
          <tr>
            <td>Self-consumption ratio</td>
            <td>85%</td>
          </tr>
          <tr>
            <td>Self-consumed generation</td>
            <td>276,250 kWh</td>
          </tr>
          <tr>
            <td>Exported generation</td>
            <td>48,750 kWh</td>
          </tr>
          <tr>
            <td>Self-consumption savings</td>
            <td>RM 92,268/year</td>
          </tr>
          <tr>
            <td>Export credit value</td>
            <td>RM 10,725/year</td>
          </tr>
          <tr>
            <td>Forfeiture loss</td>
            <td>~RM 0/year</td>
          </tr>
          <tr>
            <td><strong>Total annual savings</strong></td>
            <td><strong>RM 102,993/year</strong></td>
          </tr>
          <tr>
            <td>System cost (estimated)</td>
            <td>RM 525,000</td>
          </tr>
          <tr>
            <td><strong>Simple payback</strong></td>
            <td><strong>5.1 years</strong></td>
          </tr>
        </tbody>
      </table>

      <h3>Option B: Oversized (400 kWp)</h3>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>System size</td>
            <td>400 kWp</td>
          </tr>
          <tr>
            <td>Annual generation</td>
            <td>520,000 kWh</td>
          </tr>
          <tr>
            <td>Self-consumption ratio</td>
            <td>58%</td>
          </tr>
          <tr>
            <td>Self-consumed generation</td>
            <td>301,600 kWh</td>
          </tr>
          <tr>
            <td>Exported generation</td>
            <td>218,400 kWh</td>
          </tr>
          <tr>
            <td>Self-consumption savings</td>
            <td>RM 100,734/year</td>
          </tr>
          <tr>
            <td>Export credit value</td>
            <td>RM 48,048/year</td>
          </tr>
          <tr>
            <td>Forfeiture loss (est.)</td>
            <td>~RM 8,400/year</td>
          </tr>
          <tr>
            <td><strong>Total annual savings</strong></td>
            <td><strong>RM 140,382/year</strong></td>
          </tr>
          <tr>
            <td>System cost (estimated)</td>
            <td>RM 840,000</td>
          </tr>
          <tr>
            <td><strong>Simple payback</strong></td>
            <td><strong>6.0 years</strong></td>
          </tr>
        </tbody>
      </table>

      <div className="callout callout-amber">
        <strong>The counterintuitive result:</strong> The oversized system
        generates 60% more electricity and saves RM 37,389 more per year in
        absolute terms — but it costs RM 315,000 more and takes nearly a
        full year longer to pay back. The incremental 150 kWp earns only
        RM 37,389/year on a RM 315,000 investment — an incremental payback
        of 8.4 years. The first 250 kWp pays back in 5.1 years.
      </div>

      <h2>The Incremental Economics</h2>
      <p>
        The key metric is not total system payback — it is the return on
        each incremental kWp above the load-matched baseline. This is where
        the ATAP penalty becomes visible:
      </p>

      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>First 250 kWp</th>
            <th>Next 150 kWp</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Capital cost</td>
            <td>RM 525,000</td>
            <td>RM 315,000</td>
          </tr>
          <tr>
            <td>Annual savings</td>
            <td>RM 102,993</td>
            <td>RM 37,389</td>
          </tr>
          <tr>
            <td>Savings per kWp</td>
            <td>RM 412/kWp/yr</td>
            <td>RM 249/kWp/yr</td>
          </tr>
          <tr>
            <td>Effective blended rate</td>
            <td>RM 0.317/kWh</td>
            <td>RM 0.192/kWh</td>
          </tr>
          <tr>
            <td>Simple payback</td>
            <td>5.1 years</td>
            <td>8.4 years</td>
          </tr>
          <tr>
            <td>25-year ROI</td>
            <td>390%</td>
            <td>197%</td>
          </tr>
        </tbody>
      </table>

      <p>
        The first 250 kWp earns an effective blended rate of RM 0.317/kWh
        because 85% of generation displaces retail tariff. The next 150 kWp
        earns only RM 0.192/kWh — below even the current SMP average —
        because nearly all incremental generation is exported, and a
        portion is forfeited entirely on weekends and public holidays.
      </p>

      <h2>Where Forfeiture Occurs</h2>
      <p>
        Credit forfeiture is not a theoretical risk — it is a structural
        feature of ATAP that activates under specific, predictable
        conditions:
      </p>
      <ol>
        <li>
          <strong>Weekends and public holidays.</strong> Factories operating
          Monday–Saturday still generate solar on Sundays. A 400 kWp
          system produces approximately 1,600 kWh on a clear Sunday — 100%
          of which is exported at SMP. For facilities closed on weekends,
          the figure doubles.
        </li>
        <li>
          <strong>Festive shutdowns.</strong> Malaysian factories typically
          close for Hari Raya (1–2 weeks), Chinese New Year (3–5 days),
          Deepavali, and year-end periods. During these windows, the solar
          system generates at full capacity with zero self-consumption. All
          generation exports at SMP, and if accumulated credits exceed the
          reduced monthly bill, the excess forfeits.
        </li>
        <li>
          <strong>Low-production months.</strong> Facilities with seasonal
          demand variation — common in food processing, textiles, and
          electronics — may have months where production drops below
          baseline. If the solar system was sized for peak demand, these
          low-production months trigger export surges.
        </li>
        <li>
          <strong>Billing cycle misalignment.</strong> TNB billing cycles
          do not always align with calendar months. A facility may have a
          billing period that spans a festive shutdown, concentrating
          forfeiture risk into a single bill.
        </li>
      </ol>

      <h2>The Self-Consumption Curve</h2>
      <p>
        The relationship between system size and self-consumption is not
        linear — it follows a declining curve. For a typical Selangor C&I
        facility with 280 kW MD operating on day-dominant schedules:
      </p>

      <table>
        <thead>
          <tr>
            <th>System Size</th>
            <th>% of MD</th>
            <th>Self-Consumption</th>
            <th>Effective Blended Rate</th>
            <th>Simple Payback</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>140 kWp</td>
            <td>50%</td>
            <td>~95%</td>
            <td>RM 0.328/kWh</td>
            <td>4.7 years</td>
          </tr>
          <tr>
            <td>210 kWp</td>
            <td>75%</td>
            <td>~88%</td>
            <td>RM 0.321/kWh</td>
            <td>4.9 years</td>
          </tr>
          <tr>
            <td>250 kWp</td>
            <td>89%</td>
            <td>~85%</td>
            <td>RM 0.317/kWh</td>
            <td>5.1 years</td>
          </tr>
          <tr>
            <td>280 kWp</td>
            <td>100%</td>
            <td>~80%</td>
            <td>RM 0.311/kWh</td>
            <td>5.3 years</td>
          </tr>
          <tr>
            <td>350 kWp</td>
            <td>125%</td>
            <td>~68%</td>
            <td>RM 0.283/kWh</td>
            <td>5.8 years</td>
          </tr>
          <tr>
            <td>400 kWp</td>
            <td>143%</td>
            <td>~58%</td>
            <td>RM 0.270/kWh</td>
            <td>6.0 years</td>
          </tr>
        </tbody>
      </table>

      <div className="callout callout-green">
        <strong>The sweet spot:</strong> For most C&I facilities, the
        optimal size falls between 75–90% of contracted MD. This range
        maintains self-consumption above 85% while still meaningfully
        reducing energy costs. Beyond 100% of MD, each additional kWp
        delivers progressively diminishing returns.
      </div>

      <h2>What EPC Proposals Often Miss</h2>
      <p>
        Standard EPC proposals in the Malaysian market typically present
        solar economics using one of two flawed methodologies:
      </p>
      <ol>
        <li>
          <strong>Roof-maximum sizing.</strong> The system is sized to fill
          the available roof area, regardless of the facility's load
          profile. This approach was rational under NEM 3.0 but is
          suboptimal under ATAP. A factory with 600 m² of usable roof and
          180 kW MD does not need a 400 kWp system.
        </li>
        <li>
          <strong>100% self-consumption assumption.</strong> The financial
          model assumes all generated electricity is consumed on-site. This
          overstates savings by 10–25% for systems above 80% of MD,
          because it ignores the export rate differential and forfeiture
          risk entirely.
        </li>
      </ol>
      <p>
        Neither approach reflects ATAP economics. A credible financial
        assessment under the current framework must separate savings into
        self-consumed (retail tariff) and exported (SMP) streams, model
        forfeiture risk based on the facility's operating calendar, and
        present the incremental economics of each additional kWp above the
        load-matched baseline.
      </p>

      <h2>How to Evaluate a Proposal Under ATAP</h2>
      <p>
        When assessing an EPC solar proposal for your facility, apply these
        five checks:
      </p>
      <ol>
        <li>
          <strong>Does it disclose the self-consumption ratio?</strong> If
          the proposal shows only total generation and total savings
          without splitting self-consumed vs exported, the economics are
          incomplete.
        </li>
        <li>
          <strong>What SMP rate is used?</strong> The export credit should
          reference the latest published Monthly Average SMP from Single
          Buyer Malaysia — not a generic estimate. As of February 2026,
          the 12-month average is approximately RM 0.218/kWh.
        </li>
        <li>
          <strong>Is forfeiture modelled?</strong> For systems above 80%
          of MD, the proposal should account for credit forfeiture during
          weekends, holidays, and low-production periods.
        </li>
        <li>
          <strong>What are the incremental economics?</strong> Ask for the
          payback on the last 50 kWp of the proposed system, not just the
          blended total. If the incremental payback exceeds 8 years, the
          system is likely oversized.
        </li>
        <li>
          <strong>Is the system sized to MD or to roof?</strong> If the
          proposed capacity exceeds 100% of your contracted MD, ask for the
          load-profile justification.
        </li>
      </ol>

      <h2>The Strategic Conclusion</h2>
      <p>
        Solar under ATAP is an optimisation problem, not a maximisation
        problem. The goal is not the most kWh generated — it is the highest
        proportion of kWh consumed on-site at retail tariff displacement
        rates. Every kWp above the load-matched sweet spot earns less,
        risks forfeiture, and extends payback.
      </p>
      <p>
        For CFOs and facility managers evaluating proposals: the right
        question is not "how much solar can we install?" but "what system
        size maximises the self-consumption ratio while maintaining
        acceptable payback?" The answer is almost always smaller than the
        roof-maximum proposal on your desk.
      </p>

      <div className="callout callout-blue">
        <strong>Bottom line:</strong> A well-sized 250 kWp system at 85%
        self-consumption will outperform an oversized 400 kWp system at 58%
        self-consumption — on payback period, on incremental return, and on
        25-year cumulative economics. Size for your load, not your roof.
      </div>
    </ArticleLayout>
  );
}

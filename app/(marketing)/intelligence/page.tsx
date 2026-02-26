import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Intelligence Library | PowerRoof",
  description:
    "ATAP-era solar intelligence for Malaysian C&I decision-makers. Policy analysis, financial modelling, technical fundamentals, and industrial insights — structured for executives, not engineers.",
  openGraph: {
    title: "PowerRoof Intelligence Library",
    description:
      "Solar policy, financial analysis, and technical intelligence for Malaysian commercial and industrial facilities under ATAP.",
    type: "website",
  },
};

const PILLARS = [
  {
    key: "policy",
    label: "Policy & Market",
    color: "#3B82F6",
    description:
      "ATAP framework, SMP mechanics, regulatory requirements, and market structure analysis.",
    icon: "⚖",
  },
  {
    key: "financial",
    label: "Financial Intel",
    color: "#22C55E",
    description:
      "ROI modelling, sizing economics, export risk quantification, and payback analysis under ATAP.",
    icon: "📊",
  },
  {
    key: "technical",
    label: "Technical Basics",
    color: "#A855F7",
    description:
      "Panel technology, inverter selection, irradiance data, and system performance fundamentals.",
    icon: "⚡",
  },
  {
    key: "industrial",
    label: "Industrial Insights",
    color: "#F59E0B",
    description:
      "Sector-specific load profiles, case patterns, and operational considerations for Malaysian manufacturing.",
    icon: "🏭",
  },
];

const ARTICLES = [
  {
    title: "What Is Solar ATAP in Malaysia?",
    href: "/intelligence/policy/solar-atap-malaysia",
    pillar: "policy",
    description:
      "The Accelerated Transition Action Programme replaces NEM 3.0 — and fundamentally changes how commercial solar economics work.",
    readTime: "8 min read",
    featured: true,
  },
  {
    title: "What Is System Marginal Price (SMP) in Malaysia?",
    href: "/intelligence/policy/system-marginal-price-malaysia",
    pillar: "policy",
    description:
      "The wholesale electricity price that determines your solar export credits under ATAP — and why it matters less than you think.",
    readTime: "7 min read",
    featured: true,
  },
  {
    title: "Why Oversizing Reduces ROI Under ATAP",
    href: "/intelligence/financial/oversizing-risk-under-atap",
    pillar: "financial",
    description:
      "Under NEM 3.0, bigger was better. Under ATAP, bigger means more export exposure, lower effective rates, and forfeited credits.",
    readTime: "9 min read",
    featured: true,
  },
];

const PILLAR_COLORS: Record<string, string> = {
  policy: "#3B82F6",
  financial: "#22C55E",
  technical: "#A855F7",
  industrial: "#F59E0B",
};

const PILLAR_LABELS: Record<string, string> = {
  policy: "Policy & Market",
  financial: "Financial Intel",
  technical: "Technical Basics",
  industrial: "Industrial Insights",
};

export default function IntelligenceLibraryPage() {
  const featured = ARTICLES.filter((a) => a.featured);
  const byPillar = (key: string) => ARTICLES.filter((a) => a.pillar === key);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F6F3",
        color: "#3A3A3A",
        fontFamily: "'Inter', 'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(30, 48, 101, 0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
          }}
        >
          <Link
            href="/"
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              textDecoration: "none",
              letterSpacing: "-0.02em",
            }}
          >
            POWERROOF
          </Link>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link
              href="/intelligence"
              style={{
                color: "#C68A2B",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Intelligence Library
            </Link>
            <Link
              href="/playground"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Playground
            </Link>
            <Link
              href="/dossier"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Dossier
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header
        style={{
          background: "linear-gradient(135deg, #1E3065 0%, #0A1628 100%)",
          padding: "64px 24px 56px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#C68A2B",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          PowerRoof Intelligence
        </p>
        <h1
          style={{
            color: "#fff",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            margin: "0 0 16px",
          }}
        >
          Intelligence Library
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 18,
            lineHeight: 1.6,
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          ATAP-era solar intelligence for Malaysian C&I decision-makers.
          Policy analysis, financial modelling, technical fundamentals, and
          industrial insights — structured for executives, not engineers.
        </p>
      </header>

      {/* 4-Pillar Grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {PILLARS.map((p) => (
            <Link
              key={p.key}
              href={`/intelligence/${p.key}`}
              style={{
                display: "block",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #e0ddd8",
                padding: "24px",
                textDecoration: "none",
                color: "#3A3A3A",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{p.icon}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {p.label}
                </span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", margin: 0 }}>
                {p.description}
              </p>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: p.color,
                  fontWeight: 600,
                }}
              >
                {byPillar(p.key).length} article{byPillar(p.key).length !== 1 ? "s" : ""} →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Analysis */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 24px 48px",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#1E3065",
            marginBottom: 24,
            letterSpacing: "-0.01em",
          }}
        >
          Featured Analysis
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {featured.map((article, i) => (
            <Link
              key={i}
              href={article.href}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #e0ddd8",
                padding: "24px",
                textDecoration: "none",
                color: "#3A3A3A",
                transition: "border-color 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: PILLAR_COLORS[article.pillar],
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid ${PILLAR_COLORS[article.pillar]}30`,
                  }}
                >
                  {PILLAR_LABELS[article.pillar]}
                </span>
                <span style={{ fontSize: 12, color: "#999" }}>{article.readTime}</span>
              </div>
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: "#1E3065",
                  lineHeight: 1.3,
                  margin: "0 0 8px",
                }}
              >
                {article.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#666",
                  margin: 0,
                  flex: 1,
                }}
              >
                {article.description}
              </p>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#3B82F6",
                }}
              >
                Read analysis →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* All Articles by Pillar */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px 48px",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#1E3065",
            marginBottom: 24,
            letterSpacing: "-0.01em",
          }}
        >
          Browse by Category
        </h2>
        {PILLARS.map((pillar) => {
          const pillarArticles = byPillar(pillar.key);
          if (pillarArticles.length === 0) return null;
          return (
            <div key={pillar.key} style={{ marginBottom: 32 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: pillar.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: `2px solid ${pillar.color}20`,
                }}
              >
                {pillar.label}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pillarArticles.map((article, i) => (
                  <Link
                    key={i}
                    href={article.href}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#fff",
                      borderRadius: 8,
                      border: "1px solid #e0ddd8",
                      textDecoration: "none",
                      color: "#3A3A3A",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{article.title}</span>
                    <span style={{ fontSize: 12, color: "#999", flexShrink: 0, marginLeft: 16 }}>
                      {article.readTime}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Dossier CTA */}
      <section
        style={{
          background: "#1E3065",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          Ready for facility-specific analysis?
        </p>
        <h3
          style={{
            color: "#fff",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Request an Intelligence Dossier
        </h3>
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 15,
            marginBottom: 24,
            maxWidth: 500,
            margin: "0 auto 24px",
          }}
        >
          ATAP eligibility, SMP exposure modelling, load-matched sizing, and
          25-year cashflow — compiled for your facility.
        </p>
        <Link
          href="/dossier"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "#C68A2B",
            color: "#fff",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Request Dossier
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#0A1628",
          padding: "24px",
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: 13,
        }}
      >
        PowerRoof.my — Energy Intelligence Platform © 2026
      </footer>
    </div>
  );
}

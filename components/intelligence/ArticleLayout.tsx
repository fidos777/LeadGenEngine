"use client";

import Link from "next/link";

type Breadcrumb = { label: string; href?: string };
type RelatedArticle = { title: string; href: string; pillar: string };

interface ArticleLayoutProps {
  title: string;
  subtitle?: string;
  pillar: "policy" | "financial" | "technical" | "industrial";
  publishDate: string;
  readTime: string;
  breadcrumbs?: Breadcrumb[];
  related?: RelatedArticle[];
  children: React.ReactNode;
}

const PILLAR_LABELS: Record<string, { label: string; color: string }> = {
  policy: { label: "Policy & Market", color: "#3B82F6" },
  financial: { label: "Financial Intel", color: "#22C55E" },
  technical: { label: "Technical Basics", color: "#A855F7" },
  industrial: { label: "Industrial Insights", color: "#F59E0B" },
};

export default function ArticleLayout({
  title,
  subtitle,
  pillar,
  publishDate,
  readTime,
  breadcrumbs,
  related,
  children,
}: ArticleLayoutProps) {
  const pillarInfo = PILLAR_LABELS[pillar];

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
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#fff",
              fontWeight: 600,
              fontSize: 17,
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M3 14L13 5L23 14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="6" y="14" width="14" height="10" rx="1" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3"/>
              <path d="M14 13L11 18H15L12 23" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Power<span style={{ color: "#F59E0B" }}>Roof</span>
          </Link>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link
              href="/intelligence"
              style={{ color: "#C68A2B", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              Intelligence Library
            </Link>
            <Link
              href="/playground"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}
            >
              Playground
            </Link>
            <Link
              href="/dossier"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}
            >
              Dossier
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 24px 0" }}>
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "#999" }}>
          <Link href="/intelligence" style={{ color: "#999", textDecoration: "none" }}>
            Intelligence
          </Link>
          <span>/</span>
          <Link
            href={`/intelligence/${pillar}`}
            style={{ color: pillarInfo.color, textDecoration: "none" }}
          >
            {pillarInfo.label}
          </Link>
          {breadcrumbs?.map((b, i) => (
            <span key={i}>
              <span> / </span>
              {b.href ? (
                <Link href={b.href} style={{ color: "#999", textDecoration: "none" }}>
                  {b.label}
                </Link>
              ) : (
                <span style={{ color: "#666" }}>{b.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Article Header */}
      <header style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 0" }}>
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: pillarInfo.color,
            border: `1px solid ${pillarInfo.color}40`,
            marginBottom: 16,
          }}
        >
          {pillarInfo.label}
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#1E3065",
            lineHeight: 1.15,
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 20, color: "#666", lineHeight: 1.5, margin: "0 0 16px" }}>
            {subtitle}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            color: "#999",
            paddingBottom: 24,
            borderBottom: "1px solid #e0ddd8",
          }}
        >
          <span>PowerRoof Intelligence</span>
          <span>·</span>
          <span>{publishDate}</span>
          <span>·</span>
          <span>{readTime}</span>
        </div>
      </header>

      {/* Article Content */}
      <article
        className="intelligence-article"
        style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 48px" }}
      >
        {children}
      </article>

      {/* Related Articles */}
      {related && related.length > 0 && (
        <section
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "32px 24px 48px",
            borderTop: "1px solid #e0ddd8",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E3065", marginBottom: 16 }}>
            Related Intelligence
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {related.map((r, i) => (
              <Link
                key={i}
                href={r.href}
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
                <span style={{ fontWeight: 500 }}>{r.title}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: PILLAR_LABELS[r.pillar]?.color || "#999",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {PILLAR_LABELS[r.pillar]?.label || r.pillar}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
        <h3 style={{ color: "#fff", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Request an Intelligence Dossier
        </h3>
        <p
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}
        >
          ATAP eligibility, SMP exposure modelling, load-matched sizing, and 25-year cashflow — compiled for your facility.
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

      <style>{`
        .intelligence-article h2 {
          font-size: 28px;
          font-weight: 600;
          color: #1E3065;
          margin: 40px 0 16px;
          letter-spacing: -0.01em;
        }
        .intelligence-article h3 {
          font-size: 22px;
          font-weight: 600;
          color: #C68A2B;
          margin: 32px 0 12px;
        }
        .intelligence-article p {
          font-size: 18px;
          line-height: 1.7;
          color: #3A3A3A;
          margin: 0 0 16px;
        }
        .intelligence-article ul, .intelligence-article ol {
          margin: 0 0 16px;
          padding-left: 24px;
        }
        .intelligence-article li {
          font-size: 18px;
          line-height: 1.7;
          margin-bottom: 8px;
        }
        .intelligence-article table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          font-size: 15px;
        }
        .intelligence-article th {
          background: #1E3065;
          color: #fff;
          padding: 10px 14px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .intelligence-article td {
          padding: 10px 14px;
          border-bottom: 1px solid #e0ddd8;
        }
        .intelligence-article tr:nth-child(even) td {
          background: #F7F6F3;
        }
        .intelligence-article .callout {
          padding: 16px 20px;
          border-radius: 8px;
          margin: 24px 0;
          font-size: 16px;
          line-height: 1.6;
        }
        .intelligence-article .callout-blue {
          background: #EFF6FF;
          border-left: 4px solid #3B82F6;
        }
        .intelligence-article .callout-amber {
          background: #FFFBEB;
          border-left: 4px solid #F59E0B;
        }
        .intelligence-article .callout-green {
          background: #F0FDF4;
          border-left: 4px solid #22C55E;
        }
        .intelligence-article strong {
          color: #1E3065;
          font-weight: 600;
        }
        .intelligence-article a {
          color: #3B82F6;
          text-decoration: underline;
          text-decoration-color: #3B82F640;
          text-underline-offset: 3px;
        }
        .intelligence-article a:hover {
          text-decoration-color: #3B82F6;
        }
      `}</style>
    </div>
  );
}

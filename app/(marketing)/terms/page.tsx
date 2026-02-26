import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | PowerRoof",
  description: "PowerRoof terms of use — intellectual property, prohibited conduct, limitation of liability, and governing law.",
};

const legalNav = (
  <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(30,48,101,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px" }}>
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 600, fontSize: 17, textDecoration: "none", letterSpacing: "-0.01em" }}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M3 14L13 5L23 14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="14" width="14" height="10" rx="1" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3"/><path d="M14 13L11 18H15L12 23" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Power<span style={{ color: "#F59E0B" }}>Roof</span></Link>
      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/disclaimer" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Disclaimer</Link>
        <Link href="/terms" style={{ color: "#C68A2B", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Terms</Link>
        <Link href="/privacy" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Privacy</Link>
      </div>
    </div>
  </nav>
);

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F3", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {legalNav}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 64px" }}>
        <p style={{ color: "#C68A2B", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Legal</p>
        <h1 style={{ color: "#1E3065", fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Terms of Use</h1>
        <p style={{ color: "#999", fontSize: 14, marginBottom: 40 }}>Last updated: February 2026</p>

        <div style={{ color: "#3A3A3A", fontSize: 16, lineHeight: 1.75 }}>
          <p>By accessing or using this Website, you agree to be bound by these Terms of Use. If you do not agree, you must discontinue use immediately.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>1. Intellectual Property</h2>
          <p>All content on this Website — including but not limited to text, articles, diagrams, analytical frameworks, modelling methodologies, simulation logic, software code, and visual designs — is the intellectual property of PowerRoof unless otherwise attributed.</p>
          <p>No part of this Website may be: reproduced or copied for commercial use; distributed, resold, or sublicensed; reverse-engineered to replicate modelling logic or simulation algorithms; or used to build competing analytical tools or platforms. Internal use for facility evaluation and due diligence purposes is permitted.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>2. Prohibited Conduct</h2>
          <p>Users shall not: use automated tools, scrapers, or bots to extract content; attempt to access server infrastructure or proprietary backend systems; reproduce simulation logic, scoring methodologies, or modelling frameworks; or commercially exploit Website content without prior written consent.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>3. No Warranty</h2>
          <p>This Website is provided &apos;as is&apos; without warranty of any kind. PowerRoof does not warrant that the Website will be uninterrupted, error-free, or free from harmful components.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>4. Limitation of Liability</h2>
          <p>To the maximum extent permitted by Malaysian law, PowerRoof shall not be liable for: loss of profits or business revenue; business interruption; indirect, consequential, or incidental damages; or data loss or corruption arising from use of, or inability to use, this Website.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>5. Third-Party Links and Data</h2>
          <p>This Website may reference or link to third-party sources including Single Buyer Malaysia and Suruhanjaya Tenaga. PowerRoof is not responsible for the accuracy or availability of third-party content. Regulatory references reflect publicly available information at time of publication and may change without notice.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>6. Amendments</h2>
          <p>PowerRoof reserves the right to amend these Terms at any time. Continued use of the Website following any amendment constitutes acceptance of the revised Terms.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>7. Severability</h2>
          <p>If any provision of these Terms is held unenforceable, that provision shall be severed, and the remaining provisions shall continue in full force and effect.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>8. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of Malaysia. Any dispute shall be submitted to the exclusive jurisdiction of the courts of Malaysia.</p>
        </div>
      </main>
      <footer style={{ background: "#0A1628", padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        PowerRoof.my — Energy Intelligence Platform &copy; 2026 SME Cloud Sdn Bhd
      </footer>
    </div>
  );
}

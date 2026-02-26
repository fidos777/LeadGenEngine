import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer | PowerRoof",
  description: "PowerRoof website disclaimer — scope exclusions, limitation of liability, and intellectual property notice.",
};

const legalNav = (
  <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(30,48,101,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px" }}>
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 600, fontSize: 17, textDecoration: "none", letterSpacing: "-0.01em" }}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M3 14L13 5L23 14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="14" width="14" height="10" rx="1" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3"/><path d="M14 13L11 18H15L12 23" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Power<span style={{ color: "#F59E0B" }}>Roof</span></Link>
      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/disclaimer" style={{ color: "#C68A2B", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Disclaimer</Link>
        <Link href="/terms" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Terms</Link>
        <Link href="/privacy" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Privacy</Link>
      </div>
    </div>
  </nav>
);

export default function DisclaimerPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F3", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {legalNav}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 64px" }}>
        <p style={{ color: "#C68A2B", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Legal</p>
        <h1 style={{ color: "#1E3065", fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Website Disclaimer</h1>
        <p style={{ color: "#999", fontSize: 14, marginBottom: 40 }}>Last updated: February 2026</p>

        <div style={{ color: "#3A3A3A", fontSize: 16, lineHeight: 1.75 }}>
          <p>This Disclaimer applies to the website operated by PowerRoof and all content published therein, including the Energy Intelligence Library, Simulation Playground, Dossier-related materials, and ancillary resources.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>1. Nature of Service</h2>
          <p>PowerRoof is an analytical modelling and intelligence platform providing policy interpretation, financial projection frameworks, and optimisation modelling relating to commercial and industrial rooftop solar under Malaysia&apos;s Solar ATAP framework.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>2. Scope Exclusions</h2>
          <p>PowerRoof does not provide: licensed engineering or structural certification services; grid interconnection approvals or regulatory endorsements from Suruhanjaya Tenaga or Single Buyer Malaysia; legal advice or regulatory compliance certification; licensed financial, tax, or investment advisory services under the Capital Markets and Services Act 2007 or any successor legislation; or EPC installation, procurement, or construction services.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>3. Informational Purpose</h2>
          <p>All information on this Website — including Library articles, modelling outputs, simulation results, charts, and illustrative examples — is provided for informational and educational purposes only. No content constitutes professional advice of any kind.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>4. No Warranty</h2>
          <p>PowerRoof makes no representation or warranty, express or implied, as to: accuracy, completeness, or timeliness of any information; suitability for any specific facility, project, or investment purpose; or regulatory currency — policy references reflect publicly available information at time of publication and may change without notice.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>5. User Responsibility</h2>
          <p>Users are solely responsible for: verifying all assumptions and inputs with qualified professionals; engaging licensed engineers and EPC contractors for project-specific design and installation; and obtaining independent financial and regulatory advice before committing capital.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>6. Limitation of Liability</h2>
          <p>To the fullest extent permitted by Malaysian law, PowerRoof disclaims all liability for any loss, damage, or expense — whether direct, indirect, consequential, or incidental — arising from use of, or reliance upon, any content on this Website.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>7. Intellectual Property</h2>
          <p>All content, methodologies, modelling frameworks, and analytical outputs published on this Website remain the intellectual property of PowerRoof. No content may be reproduced, distributed, or commercially exploited without prior written consent. Regulatory content cited remains the property of the respective issuing authority.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>8. Governing Law</h2>
          <p>This Disclaimer is governed by the laws of Malaysia. Any dispute arising in connection with this Website shall be subject to the exclusive jurisdiction of the courts of Malaysia.</p>
        </div>
      </main>
      <footer style={{ background: "#0A1628", padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        PowerRoof.my — Energy Intelligence Platform &copy; 2026 SME Cloud Sdn Bhd
      </footer>
    </div>
  );
}

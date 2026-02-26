import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | PowerRoof",
  description: "PowerRoof privacy policy — PDPA-compliant personal data protection, collection, processing, and data subject rights.",
};

const legalNav = (
  <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(30,48,101,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px" }}>
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 600, fontSize: 17, textDecoration: "none", letterSpacing: "-0.01em" }}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M3 14L13 5L23 14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="14" width="14" height="10" rx="1" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3"/><path d="M14 13L11 18H15L12 23" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Power<span style={{ color: "#F59E0B" }}>Roof</span></Link>
      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/disclaimer" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Disclaimer</Link>
        <Link href="/terms" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Terms</Link>
        <Link href="/privacy" style={{ color: "#C68A2B", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Privacy</Link>
      </div>
    </div>
  </nav>
);

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F3", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {legalNav}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 64px" }}>
        <p style={{ color: "#C68A2B", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Legal</p>
        <h1 style={{ color: "#1E3065", fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#999", fontSize: 14, marginBottom: 8 }}>Reference: Personal Data Protection Act 2010 (Malaysia)</p>
        <p style={{ color: "#999", fontSize: 14, marginBottom: 40 }}>Last updated: February 2026</p>

        <div style={{ color: "#3A3A3A", fontSize: 16, lineHeight: 1.75 }}>
          <p>PowerRoof is committed to protecting personal data in accordance with Malaysia&apos;s Personal Data Protection Act 2010 (PDPA). This Privacy Policy explains how personal data is collected, used, stored, and disclosed.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>1. Data Controller</h2>
          <p>PowerRoof, operated by SME Cloud Sdn Bhd, is the data controller for all personal data submitted through this Website.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>2. Personal Data Collected</h2>
          <p>We may collect the following categories of personal data: identification data (name, designation, company name); contact information (email address, telephone number); facility data (maximum demand records, electricity consumption data, TNB bill information); documents (uploaded supporting files submitted for Dossier preparation); and usage data (website analytics, session behaviour, browser information).</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>3. Purpose of Processing</h2>
          <p>Personal data is collected and processed for: responding to enquiries and providing customer service; preparing Solar ATAP Intelligence Dossiers; analytical platform improvement and modelling optimisation; internal reporting and performance monitoring; and compliance with applicable legal obligations.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>4. Data Retention</h2>
          <p>Personal data is retained only for as long as necessary to fulfil the stated purpose, unless a longer retention period is required by law. Facility data submitted for Dossier preparation will be retained for a maximum of 24 months unless the client requests earlier deletion.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>5. Data Disclosure</h2>
          <p>Personal data will not be sold. It may be disclosed to: authorised EPC partners — only with the express consent of the data subject; professional advisers engaged by PowerRoof under confidentiality obligations; or regulatory authorities or law enforcement — only where required by applicable law.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>6. Security Measures</h2>
          <p>Reasonable technical and organisational measures are implemented to protect personal data against unauthorised access, disclosure, alteration, and destruction. No transmission over the internet is guaranteed to be fully secure; users provide data at their own risk.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>7. Data Subject Rights</h2>
          <p>Under PDPA, you have the right to: request access to personal data held about you; request correction of inaccurate personal data; withdraw consent for non-essential processing; and request deletion of personal data (subject to legal retention obligations). To exercise these rights, contact: legal@powerroof.my</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>8. Consent</h2>
          <p>By submitting personal data via this Website, you consent to its collection and processing as described in this Policy. Consent may be withdrawn at any time by contacting us, though withdrawal may affect our ability to provide services.</p>

          <h2 style={{ color: "#1E3065", fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>9. Policy Updates</h2>
          <p>This Privacy Policy may be updated periodically. Material changes will be communicated through this Website. Continued use following notification constitutes acceptance of the updated Policy.</p>
        </div>
      </main>
      <footer style={{ background: "#0A1628", padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        PowerRoof.my — Energy Intelligence Platform &copy; 2026 SME Cloud Sdn Bhd
      </footer>
    </div>
  );
}

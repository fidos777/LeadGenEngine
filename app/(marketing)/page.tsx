import { Hero, ModulesGrid, Positioning, type Module } from "@/components/sections";

const modules: Module[] = [
  {
    title: "Discovery Engine",
    description: "Structured company discovery via Google Maps and industrial directories.",
  },
  {
    title: "SSM Enrichment Engine",
    description: "Director registry data enrichment from SSM corporate records.",
  },
  {
    title: "Gatekeeper Bypass Framework",
    description: "Optimized outreach routing to decision-makers.",
  },
  {
    title: "Scoring & Engagement Lock Model",
    description: "Lead qualification and engagement prioritization.",
  },
  {
    title: "Snapshot Intelligence Layer",
    description: "Company intelligence aggregation and profiling.",
  },
  {
    title: "Sprint Execution Framework",
    description: "Structured prospecting workflow orchestration.",
  },
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-black text-white px-8 py-20">
      <Hero
        title="LeadGenEngine"
        description="Industrial Intelligence Infrastructure for Malaysian Manufacturers. Structured discovery, SSM director enrichment, and gatekeeper bypass optimisation — engineered as scalable B2B prospecting architecture."
        primaryCta={{ label: "View Platform Architecture" }}
        secondaryCta={{ label: "Request Pilot Brief" }}
      />

      <ModulesGrid modules={modules} />

      <Positioning
        headline="Infrastructure. Not Freelance Outreach."
        description="LeadGenEngine compounds industrial data across Selangor zones — integrating Google Maps discovery, SSM director registry enrichment, and structured gatekeeper optimisation into a scalable intelligence layer."
      />
    </main>
  );
}

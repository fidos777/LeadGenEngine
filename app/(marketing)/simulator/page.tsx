"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───
interface SimInputs {
  industry: string;
  roofSize: string;
  monthlyBill: number;
  operatingHours: string;
  location: string;
}

interface ScoreBreakdown {
  roof: number;
  roofMax: number;
  energy: number;
  energyMax: number;
  export: number;
  exportMax: number;
  cluster: number;
  clusterMax: number;
  policy: number;
  policyMax: number;
}

interface SizingResult {
  sizeKwp: number;
  annualGen: number;
  selfConsumption: number;
  exportPct: number;
  annualSavings: number;
  paybackYears: number;
  forfeitureRisk: string;
  netAnnualValue: number;
}

// ─── Constants ───
const AMBER = "#F59E0B";
const AMBER_DIM = "#92400E";
const GREEN = "#22C55E";
const RED = "#EF4444";
const BLUE = "#3B82F6";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404040";
const GRAY_500 = "#6b7280";
const GRAY_400 = "#9ca3af";
const GRAY_300 = "#d1d5db";
const BORDER = "#333";

const INDUSTRIES: Record<string, { energyIntensity: number; shiftBase: number }> = {
  "Plastics Manufacturing": { energyIntensity: 0.88, shiftBase: 0.85 },
  "Metal Fabrication": { energyIntensity: 0.92, shiftBase: 0.80 },
  "Food & Beverage": { energyIntensity: 0.75, shiftBase: 0.90 },
  "Electronics Assembly": { energyIntensity: 0.82, shiftBase: 0.88 },
  "Packaging / Paper": { energyIntensity: 0.78, shiftBase: 0.82 },
  "Chemical Processing": { energyIntensity: 0.95, shiftBase: 0.75 },
  "Textile / Garment": { energyIntensity: 0.70, shiftBase: 0.85 },
  "Automotive Parts": { energyIntensity: 0.85, shiftBase: 0.82 },
  "Furniture / Wood": { energyIntensity: 0.65, shiftBase: 0.80 },
  "Other Manufacturing": { energyIntensity: 0.80, shiftBase: 0.82 },
};

const ROOF_SIZES: Record<string, { sqft: number; maxKwp: number }> = {
  "Small (5,000 – 10,000 sqft)": { sqft: 7500, maxKwp: 120 },
  "Medium (10,000 – 20,000 sqft)": { sqft: 15000, maxKwp: 250 },
  "Large (20,000 – 40,000 sqft)": { sqft: 30000, maxKwp: 450 },
  "Very Large (40,000+ sqft)": { sqft: 50000, maxKwp: 700 },
};

const LOCATIONS: Record<string, { irradiance: number; clusterScore: number }> = {
  "Shah Alam": { irradiance: 1320, clusterScore: 10 },
  "Klang": { irradiance: 1300, clusterScore: 9 },
  "Petaling Jaya": { irradiance: 1310, clusterScore: 8 },
  "Subang Jaya": { irradiance: 1310, clusterScore: 8 },
  "Rawang / Sungai Buloh": { irradiance: 1290, clusterScore: 7 },
  "Semenyih / Kajang": { irradiance: 1300, clusterScore: 7 },
  "Puchong / Cyberjaya": { irradiance: 1310, clusterScore: 8 },
  "Port Klang": { irradiance: 1290, clusterScore: 9 },
  "Other Selangor": { irradiance: 1300, clusterScore: 6 },
};

// ─── Calculation Engine ───
function calculateFitScore(inputs: SimInputs): { total: number; tier: string; breakdown: ScoreBreakdown } {
  const roof = ROOF_SIZES[inputs.roofSize] || ROOF_SIZES["Medium (10,000 – 20,000 sqft)"];
  const industry = INDUSTRIES[inputs.industry] || INDUSTRIES["Other Manufacturing"];
  const loc = LOCATIONS[inputs.location] || LOCATIONS["Other Selangor"];

  // Roof suitability (max 30): based on roof size ratio to demand
  const demandKwp = (inputs.monthlyBill / 0.334) / 150; // rough demand estimation
  const roofRatio = Math.min(roof.maxKwp / Math.max(demandKwp, 50), 2);
  const roofScore = Math.min(30, Math.round(15 + roofRatio * 7.5));

  // Energy intensity (max 25)
  const energyScore = Math.min(25, Math.round(industry.energyIntensity * 25));

  // Export risk (max 15) — lower is better for self-consumption
  const hoursFactor = inputs.operatingHours === "24h" ? 1.0 : inputs.operatingHours === "Shift-based" ? 0.85 : 0.7;
  const selfConsPotential = hoursFactor * industry.shiftBase;
  const exportScore = Math.min(15, Math.round(selfConsPotential * 15));

  // Cluster value (max 15)
  const clusterScore = Math.min(15, Math.round((loc.clusterScore / 10) * 15));

  // Policy alignment (max 15)
  const capexKwp = inputs.monthlyBill > 15000 ? 280 : inputs.monthlyBill > 8000 ? 180 : 100;
  const policyScore = capexKwp <= 500 ? 14 : 12; // ATAP sweet spot

  const total = roofScore + energyScore + exportScore + clusterScore + policyScore;
  const tier = total >= 80 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : "D";

  return {
    total: Math.min(100, total),
    tier,
    breakdown: {
      roof: roofScore, roofMax: 30,
      energy: energyScore, energyMax: 25,
      export: exportScore, exportMax: 15,
      cluster: clusterScore, clusterMax: 15,
      policy: policyScore, policyMax: 15,
    },
  };
}

function calculateSizing(inputs: SimInputs, sizeKwp: number): SizingResult {
  const industry = INDUSTRIES[inputs.industry] || INDUSTRIES["Other Manufacturing"];
  const loc = LOCATIONS[inputs.location] || LOCATIONS["Other Selangor"];
  const hoursFactor = inputs.operatingHours === "24h" ? 1.0 : inputs.operatingHours === "Shift-based" ? 0.85 : 0.7;

  const annualGen = sizeKwp * loc.irradiance;
  const annualDemand = (inputs.monthlyBill / 0.334) * 12;
  const baseSelfCons = hoursFactor * industry.shiftBase;
  const genRatio = annualGen / Math.max(annualDemand, 1);
  const selfConsumption = Math.min(95, Math.max(40, Math.round(baseSelfCons * 100 * (1 - Math.max(0, genRatio - 0.8) * 0.5))));
  const exportPct = 100 - selfConsumption;

  const selfConsSavings = annualGen * (selfConsumption / 100) * 0.334;
  const exportSavings = annualGen * (exportPct / 100) * 0.228; // SMP estimate
  const annualSavings = selfConsSavings + exportSavings;

  const capex = sizeKwp * 2000 + 8000; // RM 2000/kWp + fixed costs
  const paybackYears = capex / annualSavings;

  const forfeitureRisk =
    exportPct > 35 ? "High" : exportPct > 20 ? "Medium" : "Low";

  const netAnnualValue = annualSavings;

  return {
    sizeKwp,
    annualGen,
    selfConsumption,
    exportPct,
    annualSavings: Math.round(annualSavings),
    paybackYears: Math.round(paybackYears * 10) / 10,
    forfeitureRisk,
    netAnnualValue: Math.round(netAnnualValue),
  };
}

function calculateCashflow(inputs: SimInputs, sizeKwp: number): { years: number[]; cumulative: number[]; breakeven: number } {
  const sizing = calculateSizing(inputs, sizeKwp);
  const capex = sizeKwp * 2000 + 8000;
  const years: number[] = [];
  const cumulative: number[] = [];
  let cum = -capex;
  let breakeven = 25;

  for (let y = 0; y <= 25; y++) {
    years.push(y);
    if (y === 0) {
      cumulative.push(cum);
    } else {
      const degradation = Math.pow(0.995, y);
      const yearSavings = sizing.annualSavings * degradation;
      const maintenance = 3000 + (y > 10 ? 2000 : 0);
      cum += yearSavings - maintenance;
      cumulative.push(Math.round(cum));
      if (cum >= 0 && cumulative[y - 1] < 0) {
        breakeven = y - 1 + (-cumulative[y - 1] / (cum - cumulative[y - 1]));
        breakeven = Math.round(breakeven * 10) / 10;
      }
    }
  }

  return { years, cumulative, breakeven };
}

// ─── Animated Counter ───
function AnimatedNumber({ value, duration = 1500, prefix = "", suffix = "" }: {
  value: number; duration?: number; prefix?: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const from = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);

  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

// ─── Score Bar ───
function ScoreBar({ label, score, max, delay = 0 }: {
  label: string; score: number; max: number; delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth((score / max) * 100), delay);
    return () => clearTimeout(timer);
  }, [score, max, delay]);

  const color = (score / max) >= 0.8 ? GREEN : (score / max) >= 0.6 ? AMBER : RED;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13, color: GRAY_400 }}>
        <span>{label}</span>
        <span style={{ color: "white", fontWeight: 600 }}>{score}/{max}</span>
      </div>
      <div style={{ height: 8, background: GRAY_700, borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, background: color,
          width: `${width}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

// ─── Cashflow Chart (SVG) ───
function CashflowChart({ data }: { data: { years: number[]; cumulative: number[]; breakeven: number } }) {
  const W = 600, H = 250, PAD = { top: 20, right: 20, bottom: 35, left: 65 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minVal = Math.min(...data.cumulative);
  const maxVal = Math.max(...data.cumulative);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => PAD.left + (i / 25) * chartW;
  const toY = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH;

  const zeroY = toY(0);
  const points = data.cumulative.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 600 }}>
      {/* Grid lines */}
      {[-500000, 0, 500000, 1000000, 1500000, 2000000].map(v => {
        if (v < minVal || v > maxVal * 1.1) return null;
        return (
          <g key={v}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke={GRAY_700} strokeWidth={0.5} strokeDasharray="4,4" />
            <text x={PAD.left - 8} y={toY(v) + 4} fill={GRAY_500} fontSize={10} textAnchor="end">
              {v >= 0 ? `RM ${(v / 1000).toFixed(0)}k` : `-RM ${(Math.abs(v) / 1000).toFixed(0)}k`}
            </text>
          </g>
        );
      })}
      {/* X axis labels */}
      {[0, 5, 10, 15, 20, 25].map(y => (
        <text key={y} x={toX(y)} y={H - 5} fill={GRAY_500} fontSize={10} textAnchor="middle">Yr {y}</text>
      ))}
      {/* Zero line */}
      <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke={GRAY_400} strokeWidth={1} />
      {/* Cashflow line */}
      <polyline fill="none" stroke={AMBER} strokeWidth={2.5} points={points} />
      {/* Negative fill */}
      {data.cumulative.map((v, i) => {
        if (v >= 0 || i === 0) return null;
        const prev = data.cumulative[i - 1];
        if (prev >= 0) return null;
        return (
          <rect key={i} x={toX(i - 1)} y={zeroY} width={chartW / 25} height={Math.min(toY(v) - zeroY, chartH)}
            fill="rgba(239,68,68,0.15)" />
        );
      })}
      {/* Positive fill */}
      {data.cumulative.map((v, i) => {
        if (v <= 0) return null;
        return (
          <rect key={`p${i}`} x={toX(i) - chartW / 50} y={toY(v)} width={chartW / 25} height={zeroY - toY(v)}
            fill="rgba(34,197,94,0.12)" />
        );
      })}
      {/* Breakeven marker */}
      {data.breakeven < 25 && (
        <g>
          <line x1={toX(data.breakeven)} y1={PAD.top} x2={toX(data.breakeven)} y2={H - PAD.bottom}
            stroke={GREEN} strokeWidth={1} strokeDasharray="5,3" />
          <text x={toX(data.breakeven)} y={PAD.top - 4} fill={GREEN} fontSize={10} textAnchor="middle" fontWeight="bold">
            Breakeven ~{data.breakeven.toFixed(1)}yr
          </text>
        </g>
      )}
      {/* End value */}
      <text x={toX(25) + 5} y={toY(data.cumulative[25]) + 4} fill={GREEN} fontSize={11} fontWeight="bold">
        +RM {(data.cumulative[25] / 1000).toFixed(0)}k
      </text>
    </svg>
  );
}

// ─── Smart Insight Popup ───
function SmartInsight({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div style={{
      background: "rgba(245,158,11,0.1)", border: `1px solid ${AMBER}33`,
      borderRadius: 8, padding: "10px 14px", fontSize: 13, color: AMBER,
      display: "flex", gap: 8, alignItems: "center",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "all 0.4s ease", maxHeight: visible ? 80 : 0,
      overflow: "hidden", marginTop: visible ? 12 : 0,
    }}>
      <span style={{ fontSize: 16 }}>&#9889;</span>
      <span>{text}</span>
    </div>
  );
}

// ─── Main Simulator Page ───
export default function SimulatorPage() {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<SimInputs>({
    industry: "Plastics Manufacturing",
    roofSize: "Medium (10,000 – 20,000 sqft)",
    monthlyBill: 15000,
    operatingHours: "Day",
    location: "Shah Alam",
  });
  const [sizeKwp, setSizeKwp] = useState(250);
  const [smpRate, setSmpRate] = useState(0.228);
  const [scoreRevealed, setScoreRevealed] = useState(false);
  const [insight, setInsight] = useState("");

  const fitScore = calculateFitScore(inputs);
  const sizing = calculateSizing(inputs, sizeKwp);
  const cashflow = calculateCashflow(inputs, sizeKwp);

  // Optimal size calculation
  const roof = ROOF_SIZES[inputs.roofSize] || ROOF_SIZES["Medium (10,000 – 20,000 sqft)"];
  const minSize = Math.max(50, Math.round(roof.maxKwp * 0.3));
  const maxSize = Math.round(roof.maxKwp * 1.1);
  const optimalSize = Math.round(roof.maxKwp * 0.65);

  const goNext = useCallback(() => {
    setStep(s => s + 1);
    if (step === 1) {
      setScoreRevealed(false);
      setTimeout(() => setScoreRevealed(true), 300);
    }
  }, [step]);

  // SMP adjusted savings
  const smpAdjustedSavings = (() => {
    const s = calculateSizing(inputs, sizeKwp);
    const loc = LOCATIONS[inputs.location] || LOCATIONS["Other Selangor"];
    const selfConsSavings = sizeKwp * loc.irradiance * (s.selfConsumption / 100) * 0.334;
    const exportSavings = sizeKwp * loc.irradiance * (s.exportPct / 100) * smpRate;
    return Math.round(selfConsSavings + exportSavings);
  })();

  const smpPayback = (() => {
    const capex = sizeKwp * 2000 + 8000;
    return Math.round((capex / smpAdjustedSavings) * 10) / 10;
  })();

  // ─── Styles ───
  const container: React.CSSProperties = {
    minHeight: "100vh", background: GRAY_900,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "white",
  };
  const card: React.CSSProperties = {
    background: GRAY_800, border: `1px solid ${BORDER}`, borderRadius: 12,
    padding: "32px", maxWidth: 680, margin: "0 auto",
  };
  const btnPrimary: React.CSSProperties = {
    background: AMBER, color: GRAY_900, border: "none", borderRadius: 8,
    padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 8,
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };
  const label: React.CSSProperties = {
    fontSize: 13, color: GRAY_400, marginBottom: 6, display: "block", fontWeight: 500,
  };
  const select: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: GRAY_700, color: "white",
    border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14,
    appearance: "none" as const, outline: "none",
  };

  // ─── Progress Bar ───
  const totalSteps = 7;
  const progressPct = step === 0 ? 0 : ((step) / (totalSteps - 1)) * 100;

  return (
    <div style={container}>
      {/* Progress bar */}
      {step > 0 && step < 7 && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: GRAY_800, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: GRAY_400, fontWeight: 500 }}>SOLAR ATAP FEASIBILITY SIMULATOR</span>
              <span style={{ fontSize: 12, color: AMBER, fontWeight: 600 }}>Step {step} of {totalSteps - 1}</span>
            </div>
            <div style={{ height: 4, background: GRAY_700, borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: AMBER, borderRadius: 2,
                width: `${progressPct}%`, transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: step > 0 && step < 7 ? "80px 24px 60px" : "0 24px" }}>

        {/* ═══ SCREEN 0: Hero Entry ═══ */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: AMBER, marginBottom: 16, textTransform: "uppercase" as const }}>
              PowerRoof.my
            </div>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 20, maxWidth: 600, letterSpacing: -0.5 }}>
              Solar ATAP<br />Feasibility Simulator
            </h1>
            <p style={{ fontSize: 17, color: GRAY_400, lineHeight: 1.6, maxWidth: 480, marginBottom: 40 }}>
              See if your factory qualifies — and how much value you may be leaving on the roof.
            </p>
            <p style={{ fontSize: 13, color: GRAY_500, marginBottom: 32 }}>Takes 2 minutes. No commitment required.</p>
            <button style={btnPrimary} onClick={() => setStep(1)}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${AMBER}44`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <span>&#9654;</span> Start Simulation
            </button>
            <div style={{ marginTop: 48, fontSize: 13, color: GRAY_500 }}>
              <span style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>For EPC Partners → Login</span>
            </div>
          </div>
        )}

        {/* ═══ SCREEN 1: Company Profile Input ═══ */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Facility Profile</h2>
            <p style={{ color: GRAY_400, fontSize: 15, marginBottom: 32 }}>Tell us about your factory so we can model your solar potential.</p>

            <div style={card}>
              <div style={{ display: "grid", gap: 24 }}>
                {/* Industry */}
                <div>
                  <label style={label}>Industry Type</label>
                  <select style={select} value={inputs.industry}
                    onChange={e => setInputs({ ...inputs, industry: e.target.value })}>
                    {Object.keys(INDUSTRIES).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                {/* Roof Size */}
                <div>
                  <label style={label}>Estimated Roof Size</label>
                  <select style={select} value={inputs.roofSize}
                    onChange={e => setInputs({ ...inputs, roofSize: e.target.value })}>
                    {Object.keys(ROOF_SIZES).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                {/* Monthly Bill */}
                <div>
                  <label style={label}>Monthly TNB Bill (RM)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <input type="range" min={3000} max={50000} step={500}
                      value={inputs.monthlyBill}
                      onChange={e => setInputs({ ...inputs, monthlyBill: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: AMBER }}
                    />
                    <span style={{ minWidth: 90, textAlign: "right", fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>
                      RM {inputs.monthlyBill.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Operating Hours */}
                <div>
                  <label style={label}>Operating Hours</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["Day", "Shift-based", "24h"].map(opt => (
                      <button key={opt} onClick={() => setInputs({ ...inputs, operatingHours: opt })}
                        style={{
                          flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                          cursor: "pointer", transition: "all 0.2s",
                          background: inputs.operatingHours === opt ? AMBER : GRAY_700,
                          color: inputs.operatingHours === opt ? GRAY_900 : "white",
                          border: `1px solid ${inputs.operatingHours === opt ? AMBER : BORDER}`,
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Location */}
                <div>
                  <label style={label}>Location (Selangor Zone)</label>
                  <select style={select} value={inputs.location}
                    onChange={e => setInputs({ ...inputs, location: e.target.value })}>
                    {Object.keys(LOCATIONS).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 32, textAlign: "center" }}>
                <button style={btnPrimary} onClick={goNext}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${AMBER}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <span>&#9654;</span> Calculate Solar Fit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCREEN 2: Solar Fit Score Reveal ═══ */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Your Solar Fit Score</h2>
            <p style={{ color: GRAY_400, fontSize: 15, marginBottom: 32 }}>Based on ATAP-specific optimisation logic.</p>

            <div style={{ ...card, textAlign: "center" }}>
              {/* Big score */}
              <div style={{
                fontSize: 72, fontWeight: 800, color: fitScore.total >= 80 ? GREEN : fitScore.total >= 65 ? AMBER : RED,
                lineHeight: 1, marginBottom: 8,
              }}>
                <AnimatedNumber value={fitScore.total} duration={1800} />
                <span style={{ fontSize: 28, color: GRAY_500, fontWeight: 400 }}> / 100</span>
              </div>
              <div style={{
                display: "inline-block", padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 700,
                background: fitScore.tier === "A" ? `${GREEN}22` : fitScore.tier === "B" ? `${AMBER}22` : `${RED}22`,
                color: fitScore.tier === "A" ? GREEN : fitScore.tier === "B" ? AMBER : RED,
                marginBottom: 32,
              }}>
                Tier {fitScore.tier} — {fitScore.tier === "A" ? "High Strategic Potential" : fitScore.tier === "B" ? "Strong Potential" : fitScore.tier === "C" ? "Moderate Potential" : "Review Required"}
              </div>

              {/* Breakdown bars */}
              <div style={{ textAlign: "left", marginTop: 24 }}>
                <ScoreBar label="Roof Suitability" score={fitScore.breakdown.roof} max={fitScore.breakdown.roofMax} delay={300} />
                <ScoreBar label="Energy Intensity" score={fitScore.breakdown.energy} max={fitScore.breakdown.energyMax} delay={500} />
                <ScoreBar label="Self-Consumption Potential" score={fitScore.breakdown.export} max={fitScore.breakdown.exportMax} delay={700} />
                <ScoreBar label="Industrial Cluster Value" score={fitScore.breakdown.cluster} max={fitScore.breakdown.clusterMax} delay={900} />
                <ScoreBar label="ATAP Policy Alignment" score={fitScore.breakdown.policy} max={fitScore.breakdown.policyMax} delay={1100} />
              </div>

              <p style={{ fontSize: 12, color: GRAY_500, marginTop: 20, fontStyle: "italic" }}>
                Score reflects ATAP-specific optimisation logic. Full methodology in Intelligence Dossier.
              </p>

              <div style={{ marginTop: 28 }}>
                <button style={btnPrimary} onClick={() => { setSizeKwp(optimalSize); setStep(3); }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${AMBER}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <span>&#9654;</span> Explore System Sizing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCREEN 3: Sizing Simulator ═══ */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>System Sizing Simulator</h2>
            <p style={{ color: GRAY_400, fontSize: 15, marginBottom: 32 }}>Drag the slider to explore how system size affects value.</p>

            <div style={card}>
              {/* Size slider */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: GRAY_400 }}>System Size</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "white", fontFamily: "monospace" }}>
                    {sizeKwp} kWp
                  </span>
                </div>
                <input type="range" min={minSize} max={maxSize} step={10}
                  value={sizeKwp}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setSizeKwp(v);
                    if (v > optimalSize * 1.3) {
                      const loss = Math.round((v - optimalSize) * 50);
                      setInsight(`Oversizing beyond ${optimalSize} kWp increases export exposure. Estimated value reduction: RM ${loss.toLocaleString()}/year.`);
                    } else if (v < optimalSize * 0.7) {
                      setInsight("Undersizing leaves roof capacity unused. Consider optimising for maximum self-consumption coverage.");
                    } else {
                      setInsight("");
                    }
                  }}
                  style={{ width: "100%", accentColor: sizing.exportPct > 30 ? RED : AMBER }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GRAY_500 }}>
                  <span>{minSize} kWp</span>
                  <span style={{ color: GREEN }}>Optimal: ~{optimalSize} kWp</span>
                  <span>{maxSize} kWp</span>
                </div>
              </div>

              {/* Live metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Self-Consumption", value: `${sizing.selfConsumption}%`, color: GREEN },
                  { label: "Export", value: `${sizing.exportPct}%`, color: sizing.exportPct > 30 ? RED : AMBER },
                  { label: "Annual Savings", value: `RM ${sizing.annualSavings.toLocaleString()}`, color: "white" },
                  { label: "Payback", value: `${sizing.paybackYears} years`, color: sizing.paybackYears > 8 ? RED : sizing.paybackYears > 6 ? AMBER : GREEN },
                ].map(m => (
                  <div key={m.label} style={{ background: GRAY_700, borderRadius: 10, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, color: GRAY_400, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 1 }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.color, fontFamily: "monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Self-consumption vs export bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: GRAY_400, marginBottom: 6 }}>Generation Split</div>
                <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${sizing.selfConsumption}%`, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: GRAY_900, transition: "width 0.3s" }}>
                    {sizing.selfConsumption}% Self
                  </div>
                  <div style={{ width: `${sizing.exportPct}%`, background: sizing.exportPct > 30 ? RED : AMBER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: GRAY_900, transition: "width 0.3s" }}>
                    {sizing.exportPct}% Export
                  </div>
                </div>
              </div>

              {/* Forfeiture risk indicator */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                background: sizing.forfeitureRisk === "High" ? "rgba(239,68,68,0.1)" : sizing.forfeitureRisk === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${sizing.forfeitureRisk === "High" ? `${RED}33` : sizing.forfeitureRisk === "Medium" ? `${AMBER}33` : `${GREEN}33`}`,
                borderRadius: 8, fontSize: 13,
              }}>
                <span style={{ color: sizing.forfeitureRisk === "High" ? RED : sizing.forfeitureRisk === "Medium" ? AMBER : GREEN }}>
                  {sizing.forfeitureRisk === "High" ? "⚠" : sizing.forfeitureRisk === "Medium" ? "◐" : "✓"}
                </span>
                <span style={{ color: GRAY_300 }}>Export Forfeiture Risk: <strong style={{ color: sizing.forfeitureRisk === "High" ? RED : sizing.forfeitureRisk === "Medium" ? AMBER : GREEN }}>{sizing.forfeitureRisk}</strong></span>
              </div>

              {/* Smart insight */}
              <SmartInsight text={insight} visible={!!insight} />

              <div style={{ marginTop: 28, textAlign: "center" }}>
                <button style={btnPrimary} onClick={() => setStep(4)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${AMBER}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <span>&#9654;</span> Run SMP Sensitivity
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCREEN 4: SMP Sensitivity ═══ */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>SMP Sensitivity Playground</h2>
            <p style={{ color: GRAY_400, fontSize: 15, marginBottom: 32 }}>See how Singlebuyer Market Price affects your returns.</p>

            <div style={card}>
              {/* SMP slider */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: GRAY_400 }}>SMP Rate (RM/kWh)</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "white", fontFamily: "monospace" }}>
                    RM {smpRate.toFixed(3)}
                  </span>
                </div>
                <input type="range" min={0.15} max={0.40} step={0.005}
                  value={smpRate}
                  onChange={e => setSmpRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: AMBER }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GRAY_500 }}>
                  <span>RM 0.150 (Conservative)</span>
                  <span style={{ color: RED }}>Floor: RM 0.200</span>
                  <span>RM 0.400 (Optimistic)</span>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ background: GRAY_700, borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: GRAY_400, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 1 }}>Annual Savings</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: "monospace" }}>RM {smpAdjustedSavings.toLocaleString()}</div>
                </div>
                <div style={{ background: GRAY_700, borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: GRAY_400, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 1 }}>Payback Period</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: smpPayback > 8 ? RED : smpPayback > 6 ? AMBER : GREEN, fontFamily: "monospace" }}>{smpPayback} years</div>
                </div>
              </div>

              {/* Key insight */}
              <div style={{
                background: "rgba(59,130,246,0.08)", border: `1px solid ${BLUE}33`,
                borderRadius: 8, padding: "14px 18px", marginBottom: 20,
              }}>
                <p style={{ fontSize: 14, color: BLUE, fontWeight: 600, margin: 0, marginBottom: 4 }}>Key Insight</p>
                <p style={{ fontSize: 13, color: GRAY_300, margin: 0, lineHeight: 1.6 }}>
                  Primary ROI driver is tariff displacement (self-consumption at RM 0.334/kWh), not export credit.
                  {sizing.selfConsumption >= 75 && " Your high self-consumption ratio means SMP volatility has limited impact on overall returns."}
                  {sizing.selfConsumption < 75 && " Consider optimising system size to increase self-consumption dominance."}
                </p>
              </div>

              <div style={{ marginTop: 28, textAlign: "center" }}>
                <button style={btnPrimary} onClick={() => setStep(5)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${AMBER}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <span>&#9654;</span> See 25-Year Cashflow
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCREEN 5: Cashflow Visualisation ═══ */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>25-Year Cashflow Projection</h2>
            <p style={{ color: GRAY_400, fontSize: 15, marginBottom: 32 }}>Cumulative net value over the system lifetime.</p>

            <div style={card}>
              {/* Big headline number */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 14, color: GRAY_400, marginBottom: 4 }}>Projected Lifetime Net Value</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: GREEN, fontFamily: "monospace" }}>
                  RM <AnimatedNumber value={Math.round(cashflow.cumulative[25] / 1000)} duration={2000} suffix="k+" />
                </div>
              </div>

              {/* Chart */}
              <CashflowChart data={cashflow} />

              {/* Sub-note */}
              <p style={{ fontSize: 12, color: GRAY_500, marginTop: 16, textAlign: "center", fontStyle: "italic" }}>
                Estimate excludes carbon credit potential and future tariff escalation. Includes 0.5% annual degradation and maintenance reserve.
              </p>

              {/* Comparison badge */}
              <div style={{
                marginTop: 20, padding: "12px 16px", background: "rgba(34,197,94,0.08)",
                border: `1px solid ${GREEN}33`, borderRadius: 8, textAlign: "center",
              }}>
                <p style={{ fontSize: 13, color: GREEN, margin: 0, fontWeight: 500 }}>
                  Compared to similar {inputs.industry.toLowerCase()} facilities in {inputs.location}, this projection is within the top performance quartile.
                </p>
              </div>

              <div style={{ marginTop: 28, textAlign: "center" }}>
                <button style={btnPrimary} onClick={() => setStep(6)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${AMBER}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  Unlock Detailed Intelligence Dossier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SCREEN 6: Paywall / CTA ═══ */}
        {step === 6 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Your Factory Qualifies</h2>
              <p style={{ color: GRAY_400, fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
                Your facility demonstrates strong ATAP alignment. Proceed with detailed intelligence to validate feasibility.
              </p>
            </div>

            {/* Blurred preview tease */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 40 }}>
              {[
                { title: "Roof Satellite Overlay", icon: "🛰" },
                { title: "Export Risk Heatmap", icon: "📊" },
                { title: "Panel Layout Concept", icon: "📐" },
              ].map(t => (
                <div key={t.title} style={{
                  background: GRAY_700, borderRadius: 10, padding: 20, textAlign: "center",
                  filter: "blur(1px)", opacity: 0.6, position: "relative" as const,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, color: GRAY_400 }}>{t.title}</div>
                </div>
              ))}
              <div style={{
                position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none" as const,
              }} />
            </div>

            {/* 3-Tier pricing */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
              {/* Basic */}
              <div style={{
                background: GRAY_800, border: `1px solid ${BORDER}`, borderRadius: 12,
                padding: "28px 20px", textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: GREEN, marginBottom: 8, textTransform: "uppercase" as const }}>Snapshot</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Free</div>
                <div style={{ fontSize: 12, color: GRAY_500, marginBottom: 20 }}>Quick eligibility check</div>
                <div style={{ textAlign: "left", fontSize: 13, color: GRAY_400, lineHeight: 2 }}>
                  ✓ ATAP eligibility<br />
                  ✓ Indicative savings<br />
                  ✓ Solar Fit Score<br />
                  <span style={{ color: GRAY_600 }}>✗ Financial model</span><br />
                  <span style={{ color: GRAY_600 }}>✗ Roof analysis</span>
                </div>
                <button style={{
                  marginTop: 20, width: "100%", padding: "10px", borderRadius: 8,
                  background: "transparent", border: `1px solid ${GREEN}`, color: GREEN,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Download Snapshot
                </button>
              </div>

              {/* Pro */}
              <div style={{
                background: GRAY_800, border: `2px solid ${AMBER}`, borderRadius: 12,
                padding: "28px 20px", textAlign: "center", position: "relative" as const,
                transform: "scale(1.03)",
              }}>
                <div style={{
                  position: "absolute" as const, top: -12, left: "50%", transform: "translateX(-50%)",
                  background: AMBER, color: GRAY_900, fontSize: 10, fontWeight: 700,
                  padding: "3px 12px", borderRadius: 10, letterSpacing: 1,
                }}>
                  POPULAR
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: AMBER, marginBottom: 8, textTransform: "uppercase" as const }}>Feasibility</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>RM 1,000</div>
                <div style={{ fontSize: 12, color: GRAY_500, marginBottom: 20 }}>Detailed assessment</div>
                <div style={{ textAlign: "left", fontSize: 13, color: GRAY_400, lineHeight: 2 }}>
                  ✓ Everything in Snapshot<br />
                  ✓ Financial model<br />
                  ✓ SMP sensitivity<br />
                  ✓ Sizing optimisation<br />
                  ✓ Risk commentary
                </div>
                <button style={{
                  marginTop: 20, width: "100%", padding: "10px", borderRadius: 8,
                  background: AMBER, border: "none", color: GRAY_900,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  Request Assessment
                </button>
              </div>

              {/* Premium */}
              <div style={{
                background: GRAY_800, border: `1px solid ${BLUE}44`, borderRadius: 12,
                padding: "28px 20px", textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: BLUE, marginBottom: 8, textTransform: "uppercase" as const }}>Intelligence Dossier</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>RM 2,000</div>
                <div style={{ fontSize: 12, color: GRAY_500, marginBottom: 20 }}>Board-ready report</div>
                <div style={{ textAlign: "left", fontSize: 13, color: GRAY_400, lineHeight: 2 }}>
                  ✓ Everything in Feasibility<br />
                  ✓ Roof satellite analysis<br />
                  ✓ Panel layout concept<br />
                  ✓ Carbon / ESG impact<br />
                  ✓ Executive summary
                </div>
                <button style={{
                  marginTop: 20, width: "100%", padding: "10px", borderRadius: 8,
                  background: "transparent", border: `1px solid ${BLUE}`, color: BLUE,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Request Dossier
                </button>
              </div>
            </div>

            {/* Fee deductible note */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <p style={{ fontSize: 13, color: GRAY_400, fontStyle: "italic" }}>
                Assessment fee fully deductible upon project award.
              </p>
              <p style={{ fontSize: 12, color: GRAY_500 }}>
                Average dossier turnaround: 48 hours.
              </p>
            </div>

            {/* Scarcity trigger */}
            <div style={{
              textAlign: "center", padding: "14px 20px",
              background: "rgba(245,158,11,0.06)", border: `1px solid ${AMBER}22`,
              borderRadius: 8,
            }}>
              <p style={{ fontSize: 13, color: AMBER_DIM, margin: 0 }}>
                Solar ATAP allocation is subject to capacity window. Quota availability may vary by zone.
              </p>
            </div>

            {/* Restart */}
            <div style={{ textAlign: "center", marginTop: 40, paddingBottom: 60 }}>
              <button onClick={() => setStep(0)} style={{
                background: "transparent", border: `1px solid ${BORDER}`, color: GRAY_400,
                padding: "10px 24px", borderRadius: 8, fontSize: 13, cursor: "pointer",
              }}>
                ← Run Another Simulation
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

#!/usr/bin/env python3
"""
Pre-Survey Energy Report Generator — ATAP Analysis
Generates a worked case study PDF for a Shah Alam factory prospect.

Usage:
    python scripts/generate-presurvey-report.py [--white-label "Company Name"]

Output:
    reports/presurvey-sample.pdf
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER

# ─── Color Palette ───
AMBER = HexColor("#F59E0B")
GREEN_SOFT = HexColor("#DCFCE7")
GRAY_900 = HexColor("#171717")
GRAY_700 = HexColor("#404040")
GRAY_500 = HexColor("#737373")
GRAY_400 = HexColor("#A3A3A3")
GRAY_200 = HexColor("#E5E5E5")
GRAY_100 = HexColor("#F5F5F5")

# ─── Styles ───
STYLES = {
    "title": ParagraphStyle(
        "title", fontName="Helvetica-Bold", fontSize=24,
        leading=30, textColor=GRAY_900, spaceAfter=4,
    ),
    "subtitle": ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=12,
        leading=16, textColor=GRAY_500, spaceAfter=20,
    ),
    "h2": ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=16,
        leading=20, textColor=GRAY_900, spaceBefore=24, spaceAfter=8,
    ),
    "h3": ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=13,
        leading=17, textColor=GRAY_700, spaceBefore=16, spaceAfter=6,
    ),
    "body": ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10,
        leading=15, textColor=GRAY_700, spaceAfter=8,
    ),
    "body_small": ParagraphStyle(
        "body_small", fontName="Helvetica", fontSize=9,
        leading=13, textColor=GRAY_500, spaceAfter=4,
    ),
    "footer": ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=8,
        leading=10, textColor=GRAY_400, alignment=TA_CENTER,
    ),
}


def make_table(data, col_widths, highlight_row=None, total_row=False):
    """Helper to create consistently styled tables."""
    t = Table(data, colWidths=col_widths)
    base_style = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRAY_500),
        ("TEXTCOLOR", (0, 1), (-1, -1), GRAY_700),
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    if total_row:
        base_style.extend([
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("BACKGROUND", (0, -1), (-1, -1), GRAY_100),
        ])
    if highlight_row is not None:
        base_style.append(
            ("BACKGROUND", (0, highlight_row), (-1, highlight_row), HexColor("#FEFCE8"))
        )
    t.setStyle(TableStyle(base_style))
    return t


def build_report(output_path: str, white_label: str | None = None):
    """Generate the pre-survey report PDF."""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    story = []
    w = A4[0] - 40 * mm  # usable width

    # ─── Branding ───
    brand_name = white_label or "POWERROOF"
    brand_footer = (
        f"{white_label} | Powered by PowerRoof.my"
        if white_label
        else "PowerRoof.my — Solar Acquisition Intelligence"
    )

    # ═══════════════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════════════
    story.append(Spacer(1, 80 * mm))

    # Brand mark
    story.append(Paragraph(
        brand_name,
        ParagraphStyle("cover_brand", fontName="Helvetica-Bold", fontSize=14,
                       textColor=AMBER, alignment=TA_CENTER, spaceAfter=6, leading=18),
    ))

    # Thin amber rule
    cover_rule = Table([[""]],
                       colWidths=[40 * mm],
                       rowHeights=[1])
    cover_rule.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), AMBER),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    cover_rule.hAlign = "CENTER"
    story.append(cover_rule)
    story.append(Spacer(1, 12))

    # Report title
    story.append(Paragraph(
        "Solar ATAP",
        ParagraphStyle("cover_title1", fontName="Helvetica-Bold", fontSize=32,
                       textColor=GRAY_900, alignment=TA_CENTER, leading=38, spaceAfter=0),
    ))
    story.append(Paragraph(
        "Pre-Survey Intelligence Report",
        ParagraphStyle("cover_title2", fontName="Helvetica-Bold", fontSize=28,
                       textColor=GRAY_900, alignment=TA_CENTER, leading=34, spaceAfter=20),
    ))

    # Company name
    story.append(Paragraph(
        "Mega Plastics Industries Sdn Bhd",
        ParagraphStyle("cover_company", fontName="Helvetica", fontSize=16,
                       textColor=GRAY_500, alignment=TA_CENTER, leading=22, spaceAfter=4),
    ))
    story.append(Paragraph(
        "Shah Alam, Selangor (Seksyen 26)",
        ParagraphStyle("cover_location", fontName="Helvetica", fontSize=12,
                       textColor=GRAY_400, alignment=TA_CENTER, leading=16, spaceAfter=30),
    ))

    # Confidential + date
    story.append(Paragraph(
        "CONFIDENTIAL",
        ParagraphStyle("cover_conf", fontName="Helvetica-Bold", fontSize=10,
                       textColor=GRAY_400, alignment=TA_CENTER, leading=14,
                       spaceAfter=6, letterSpacing=3),
    ))
    story.append(Paragraph(
        "February 2026",
        ParagraphStyle("cover_date", fontName="Helvetica", fontSize=11,
                       textColor=GRAY_500, alignment=TA_CENTER, leading=14, spaceAfter=4),
    ))

    # Footer line at bottom of cover
    story.append(Spacer(1, 40 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_200))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"{brand_footer}",
        ParagraphStyle("cover_footer", fontName="Helvetica", fontSize=9,
                       textColor=GRAY_400, alignment=TA_CENTER, leading=12),
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════
    # PAGE 2 — HEADER + ELIGIBILITY + SIZING
    # ═══════════════════════════════════════════════════

    # ─── HEADER ───
    story.append(Paragraph(brand_name, ParagraphStyle(
        "logo", fontName="Helvetica-Bold", fontSize=11,
        textColor=AMBER, spaceAfter=2, leading=14,
    )))
    story.append(Paragraph("Pre-Survey Energy Report", STYLES["title"]))
    story.append(Paragraph("Solar ATAP Feasibility Analysis — Confidential", STYLES["subtitle"]))

    # Prospect info table
    prospect_data = [
        ["Company", "Mega Plastics Industries Sdn Bhd"],
        ["Zone", "Shah Alam, Selangor (Seksyen 26)"],
        ["Sector", "Plastics Manufacturing"],
        ["TNB Account Type", "Non-domestic (C1/C2 tariff)"],
        ["Decision Maker", "En. Ahmad Razak, Director — confirmed owner, direct line verified"],
        ["Report Date", "February 2026"],
        ["Prepared By", f"{brand_name} Intelligence Engine"],
    ]
    t = Table(prospect_data, colWidths=[35 * mm, w - 35 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 0), (1, -1), GRAY_900),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # ─── 1. ATAP ELIGIBILITY ───
    story.append(Paragraph("1. ATAP Eligibility Assessment", STYLES["h2"]))
    story.append(Paragraph(
        "Based on GP/ST/No.60/2025 (Solar ATAP Guidelines effective January 2026).",
        STYLES["body_small"],
    ))

    eligibility_data = [
        ["Criteria", "Status", "Detail"],
        ["Single-tenant premise", "PASS", "Single occupant — owner-operated factory"],
        ["Maximum Demand < 1MW", "PASS", "Estimated MD: 350 kW (within cap)"],
        ["Ownership / TNB consent", "PASS", "Owner-occupied (no landlord consent needed)"],
        ["Operating hours", "NOTE", "Day-dominant (7am-6pm) — optimal self-consumption"],
        ["Sector eligibility", "PASS", "Manufacturing — no ATAP sector exclusion"],
    ]
    t = Table(eligibility_data, colWidths=[40 * mm, 20 * mm, w - 60 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRAY_500),
        ("TEXTCOLOR", (0, 1), (0, -1), GRAY_700),
        ("TEXTCOLOR", (2, 1), (2, -1), GRAY_700),
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    for i in range(1, len(eligibility_data)):
        status = eligibility_data[i][1]
        color = HexColor("#166534") if status == "PASS" else HexColor("#92400E")
        t.setStyle(TableStyle([
            ("TEXTCOLOR", (1, i), (1, i), color),
            ("FONTNAME", (1, i), (1, i), "Helvetica-Bold"),
        ]))

    story.append(t)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "VERDICT: ATAP ELIGIBLE — All hard gates passed. Proceed to system sizing.",
        ParagraphStyle("verdict", fontName="Helvetica-Bold", fontSize=11,
                       textColor=HexColor("#166534"), spaceAfter=8, leading=16),
    ))

    # ─── 2. SYSTEM SIZING ───
    story.append(Paragraph("2. Recommended System Sizing", STYLES["h2"]))
    story.append(Paragraph(
        "Solar ATAP mandates system capacity at or below 100% of Maximum Demand, capped at 1MW. "
        "To minimize monthly energy forfeiture (no credit carry-forward under ATAP), optimal sizing "
        "targets 75-85% of MD for day-dominant operations.",
        STYLES["body"],
    ))

    sizing_data = [
        ["Parameter", "Value", "Basis"],
        ["Estimated Maximum Demand", "350 kW", "TNB bill band + sector benchmark"],
        ["ATAP capacity cap", "350 kW (MD) or 1MW", "Whichever is lower = 350 kW"],
        ["Optimal sizing range", "263 - 298 kWp", "75-85% of 350 kW MD"],
        ["Recommended system size", "280 kWp", "Sweet spot for self-consumption"],
        ["Estimated annual generation", "364,000 kWh",
         "280 kWp x 1,300 kWh/kWp (3.57 peak sun hours/day, "
         "Selangor avg irradiance per PVGIS/SolarGIS data)"],
        ["Estimated roof area required", "16,800 sqft", "280 kWp x ~60 sqft/kWp"],
    ]
    t = make_table(sizing_data, [50 * mm, 35 * mm, w - 85 * mm], highlight_row=4)
    # Bold + amber the recommended size
    t.setStyle(TableStyle([
        ("FONTNAME", (1, 4), (1, 4), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 4), (1, 4), AMBER),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    # Oversizing penalty comparison
    story.append(Paragraph(
        "OVERSIZING WARNING: A roof-maximized 350 kWp system (100% of MD) would generate "
        "an estimated 455,000 kWh/year. At 80% self-consumption, approximately 91,000 kWh of "
        "excess export would be settled at SMP (~RM 0.20/kWh) rather than displacing TNB tariff "
        "(~RM 0.365/kWh) — a net value loss of ~RM 15,000/year versus the recommended 280 kWp "
        "sizing. Under ATAP's no-rollover rule, months with low factory load would also risk "
        "outright forfeiture of excess credits.",
        ParagraphStyle("oversizing", fontName="Helvetica", fontSize=9.5,
                       textColor=HexColor("#92400E"), leading=14, spaceAfter=8,
                       backColor=HexColor("#FEF3C7"), borderPadding=(8, 10, 8, 10)),
    ))

    # ─── 3. FINANCIAL MODEL ───
    story.append(Paragraph("3. Financial Projection", STYLES["h2"]))

    story.append(Paragraph("CAPEX Estimate", STYLES["h3"]))
    # CAS fee corrected: 280 kWp falls in >180-425 kW band = RM 5,000
    # CAPEX range: RM 1,800-2,200/kWp → RM 504,000–616,000 for PV system
    # Total range: PV (504k-616k) + CAS (5k) + structural (3k-8k est midpoint 5k) = RM 512,000–629,000
    # Using rounded practical range: RM 542,000–626,000 (RM 1,900-2,200/kWp + fixed costs)
    capex_data = [
        ["Component", "Rate", "Amount"],
        ["Solar PV system (280 kWp)", "RM 1,800–2,200/kWp", "RM 504,000 – 616,000"],
        ["CAS fee (>180-425 kW band)", "GP/ST/No.60/2025 schedule", "RM 5,000"],
        ["Structural roof assessment", "Subject to roof condition", "RM 3,000 – 8,000"],
        ["Total estimated CAPEX", "", "RM 512,000 – 629,000"],
    ]
    t = make_table(capex_data, [50 * mm, 40 * mm, w - 90 * mm], total_row=True)
    t.setStyle(TableStyle([("ALIGN", (2, 0), (2, -1), "RIGHT")]))
    story.append(t)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "CAS fee tiers per GP/ST/No.60/2025: >72-180 kW = RM 1,000; >180-425 kW = RM 5,000; "
        ">425 kW-1 MW = RM 8,000; HV PSS = RM 15,000. "
        "Structural assessment cost varies RM 3,000-8,000 depending on roof age and complexity. "
        "Savings model below uses midpoint CAPEX of RM 570,000 for payback calculation.",
        STYLES["body_small"],
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Savings Model (Annual)", STYLES["h3"]))

    # Savings calculated with midpoint CAPEX RM 570,000 and blended tariff
    # Using blended effective tariff RM 0.334/kWh (weighted C1 tariff blocks)
    # SMP: RM 0.20/kWh (conservative floor — actual to be confirmed from singlebuyer.com.my)
    # Self-consumed kWh x RM 0.334 + Export kWh x RM 0.20
    savings_data = [
        ["Scenario", "Self-Consumed", "Export", "Annual Savings", "Payback"],
        ["Conservative (70% self)", "254,800 kWh", "109,200 kWh", "RM 106,803", "5.3 yrs"],
        ["Base case (80% self)", "291,200 kWh", "72,800 kWh", "RM 111,821", "5.1 yrs"],
        ["Optimistic (90% self)", "327,600 kWh", "36,400 kWh", "RM 116,838", "4.9 yrs"],
    ]
    t = make_table(
        savings_data,
        [35 * mm, 30 * mm, 28 * mm, 30 * mm, w - 123 * mm],
        highlight_row=2,
    )
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 2), (0, 2), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]))
    story.append(t)
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        "Payback range across full CAPEX band: 4.4 – 5.9 years (base case RM 111,821/yr savings "
        "against RM 512,000 – 629,000 total investment). Midpoint RM 570,000 used for headline payback.",
        ParagraphStyle("payback_range", fontName="Helvetica", fontSize=9,
                       textColor=HexColor("#1E40AF"), leading=13, spaceAfter=8,
                       backColor=HexColor("#EFF6FF"), borderPadding=(6, 8, 6, 8)),
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("Assumptions and rates:", STYLES["body_small"]))
    assumptions = [
        "TNB tariff rate: RM 0.334/kWh blended effective rate across C1 demand blocks "
        "(peak block RM 0.365/kWh; lower blocks reduce blended average). "
        "Blended rate used for conservative savings estimate.",
        "SMP export rate: RM 0.20/kWh (conservative floor estimate). "
        "Average SMP is the monthly average of SMP values between 07:00-19:00 daily "
        "for the preceding calendar month (per SEDA/NOVA guidelines). "
        "Published by Single Buyer (www.singlebuyer.com.my). "
        "Historical range: RM 0.15-0.40/kWh. See sensitivity analysis in Section 4.",
        "Solar irradiance: 3.57 peak sun hours/day average for Selangor "
        "(PVGIS/SolarGIS satellite-derived data). Yields 1,300 kWh/kWp annual specific yield.",
        "System degradation: 0.5%/year; Panel warranty: 25 years",
        "Monthly forfeiture: Any excess credit above consumption is forfeited each billing month (ATAP rule)",
        "CAPEX range: RM 1,800-2,200/kWp for 200-500 kWp systems. Range reflects market "
        "variation in panel brand, inverter spec, and installation complexity.",
    ]
    for a in assumptions:
        story.append(Paragraph(f"  {a}", STYLES["body_small"]))

    # ─── 4. SMP SENSITIVITY ───
    story.append(Paragraph("4. SMP Sensitivity Analysis", STYLES["h2"]))
    story.append(Paragraph(
        "The System Marginal Price fluctuates monthly based on fuel costs and dispatch order. "
        "This analysis shows how changes in SMP affect annual savings and payback period, "
        "assuming 80% self-consumption (base case) and blended tariff of RM 0.334/kWh.",
        STYLES["body"],
    ))

    # Recalculated: Self-consumed = 291,200 x 0.334 = 97,261; Export = 72,800 x SMP
    smp_data = [
        ["SMP Rate", "Export Revenue", "Total Savings", "Payback", "Impact vs Floor"],
        ["RM 0.15/kWh", "RM 10,920", "RM 108,181", "5.3 yrs", "-RM 3,640"],
        ["RM 0.20/kWh (floor)", "RM 14,560", "RM 111,821", "5.1 yrs", "Base"],
        ["RM 0.25/kWh", "RM 18,200", "RM 115,461", "4.9 yrs", "+RM 3,640"],
        ["RM 0.30/kWh", "RM 21,840", "RM 119,101", "4.8 yrs", "+RM 7,280"],
        ["RM 0.40/kWh (peak)", "RM 29,120", "RM 126,381", "4.5 yrs", "+RM 14,560"],
    ]
    t = make_table(
        smp_data,
        [28 * mm, 28 * mm, 30 * mm, 22 * mm, w - 108 * mm],
        highlight_row=2,
    )
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 2), (0, 2), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (3, -1), "RIGHT"),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "KEY INSIGHT: At 80% self-consumption, the full SMP range (RM 0.15-0.40) "
        "causes only a RM 18,200 swing in annual savings — a 16% variance. "
        "The primary savings driver is self-consumed generation displacing TNB tariff "
        "at RM 0.334/kWh, not export credits. This is why sizing at 75-85% of MD "
        "protects ROI regardless of SMP volatility.",
        ParagraphStyle("insight", fontName="Helvetica-Bold", fontSize=9.5,
                       textColor=HexColor("#1E40AF"), leading=14, spaceAfter=8,
                       backColor=HexColor("#EFF6FF"), borderPadding=(8, 10, 8, 10)),
    ))

    story.append(Paragraph(
        "NOTE: Monthly Average SMP is published by Single Buyer "
        "(www.singlebuyer.com.my/resources-marginal.php) under the Malaysian MESI framework. "
        "Average SMP reflects the monthly average of SMP values between 07:00–19:00 daily "
        "for the preceding calendar month. The RM 0.20/kWh floor used in this report is a "
        "conservative estimate. Final project economics should use the actual published "
        "SMP figure at time of proposal.",
        ParagraphStyle("smp_note", fontName="Helvetica", fontSize=9,
                       textColor=HexColor("#92400E"), leading=13, spaceAfter=8,
                       backColor=HexColor("#FEF3C7"), borderPadding=(6, 8, 6, 8)),
    ))

    # ─── 5. FORFEITURE RISK ───
    story.append(Paragraph("5. Monthly Forfeiture Risk Assessment", STYLES["h2"]))
    story.append(Paragraph(
        "Under Solar ATAP, excess credits are forfeited at end of each billing month (no carry-forward). "
        "For a day-dominant factory in Shah Alam, key risk months are public holiday clusters "
        "and planned shutdowns. Cost estimates assume excess generation is exported at SMP "
        "(RM 0.20/kWh) rather than self-consumed at tariff (RM 0.334/kWh).",
        STYLES["body"],
    ))

    # Forfeiture cost calculations:
    # 280 kWp x 1,300 kWh/kWp = 364,000 kWh/yr → ~1,000 kWh/day generation
    # Hari Raya 1-2 weeks (7-14 days): 7,000-14,000 kWh exported at SMP instead of self-consumed
    #   Value loss = days x 1,000 kWh x (0.334 - 0.20) = 7-14 days x 1,000 x 0.134 = RM 938-1,876
    #   Rounded: RM 1,000-2,000
    # CNY 3-5 days: 3,000-5,000 kWh x 0.134 = RM 402-670 → RM 400-700
    # Weekend: Already sized for 5-day ops at 80% self-consumption; negligible incremental loss
    # Unplanned: Buffer built into 80% MD sizing; negligible
    forfeit_data = [
        ["Risk Factor", "Prob.", "Est. Annual Cost", "Mitigation"],
        ["Hari Raya shutdown\n(1-2 weeks)", "High",
         "RM 1,000 – 2,000",
         "Factor into annual model; accept ~2% forfeiture"],
        ["CNY factory closure\n(3-5 days)", "Medium",
         "RM 400 – 700",
         "Short closure; minimal impact at 280 kWp"],
        ["Weekend generation\nexcess", "Low",
         "Negligible",
         "Day-dominant ops; sizing accounts for 5-day week"],
        ["Unplanned downtime", "Low",
         "Negligible",
         "280 kWp at 80% MD provides buffer"],
    ]
    t = make_table(forfeit_data, [38 * mm, 16 * mm, 30 * mm, w - 84 * mm])
    story.append(t)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Total estimated annual forfeiture cost: RM 1,400 – 2,700 (0.4–0.7% of gross generation value). "
        "Calculated as shutdown days x ~1,000 kWh/day x RM 0.134 tariff-to-SMP spread.",
        STYLES["body_small"],
    ))

    # ─── 6. NEXT STEPS ───
    story.append(Paragraph("6. Recommended Next Steps", STYLES["h2"]))
    steps = [
        ("Site Survey", "Physical roof inspection, structural load assessment, TNB meter verification."),
        ("Detailed Design", "Panel layout, inverter sizing, cable routing, single-line diagram."),
        ("ATAP Application",
         "Submit to TNB with CAS approval (mandatory for >72 kW systems). "
         "Solar ATAP programme capacity is subject to Government availability decisions. "
         "Applications are processed on a first-come-first-served basis."),
        ("Installation", "Estimated 6-8 weeks from approval for a 280 kWp system."),
        ("Commissioning", "TNB inspection, meter installation, COD issuance."),
    ]
    for i, (step, desc) in enumerate(steps, 1):
        story.append(Paragraph(
            f"<b>{i}. {step}</b> — {desc}",
            STYLES["body"],
        ))

    # ─── DISCLAIMER ───
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_200))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "DISCLAIMER: This pre-survey report is based on estimated data and publicly available benchmarks. "
        "Actual system sizing, generation, and financial returns depend on site-specific conditions "
        "confirmed during physical survey. TNB tariff uses a blended effective rate across C1 demand "
        "blocks; actual bill structure varies by consumption pattern. SMP export rates are conservative "
        "estimates — actual rates are published monthly by Single Buyer (www.singlebuyer.com.my) and may "
        "differ from projections used here. Solar irradiance data sourced from PVGIS/SolarGIS; actual "
        "site yield may vary due to shading, orientation, and panel degradation. CAPEX range reflects "
        "market variation and does not constitute a quotation. CAS fees per GP/ST/No.60/2025 schedule. "
        "Structural assessment cost is indicative and depends on roof age and complexity. This report "
        "does not constitute financial advice. All figures should be validated by the installing EPC "
        "contractor.",
        ParagraphStyle("disclaimer", fontName="Helvetica", fontSize=8,
                       leading=11, textColor=GRAY_400, spaceAfter=8),
    ))

    story.append(Paragraph(
        f"{brand_footer} | Confidential",
        STYLES["footer"],
    ))

    # Build PDF
    doc.build(story)
    print(f"Report generated: {output_path}")


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output = os.path.join(project_root, "reports", "presurvey-sample.pdf")

    # Optional white-label: python scripts/generate-presurvey-report.py --white-label "Voltek Energy"
    white_label = None
    if "--white-label" in sys.argv:
        idx = sys.argv.index("--white-label")
        if idx + 1 < len(sys.argv):
            white_label = sys.argv[idx + 1]

    build_report(output, white_label=white_label)

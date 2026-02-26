#!/usr/bin/env python3
"""
Solar ATAP Intelligence Dossier Generator — 3-Tier Model

Tiers:
  basic   — Solar ATAP Quick Fit Snapshot (RM 0, lead magnet)
  pro     — Solar ATAP Feasibility Assessment (RM 1,000)
  premium — Solar ATAP Intelligence Dossier (RM 2,000)

Usage:
    python scripts/generate-dossier.py --tier premium --white-label "Voltek Energy"
    python scripts/generate-dossier.py --tier pro
    python scripts/generate-dossier.py --tier basic

    # With satellite imagery (Premium only):
    python scripts/generate-dossier.py --tier premium --lat 3.0658 --lng 101.5183 --api-key YOUR_KEY
    # Or via environment variable:
    GOOGLE_MAPS_API_KEY=xxx python scripts/generate-dossier.py --tier premium --lat 3.0658 --lng 101.5183

Output:
    reports/dossier-{tier}.pdf
"""

import os
import sys
import math
import tempfile
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle, Polygon
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics import renderPDF

try:
    import requests
    from PIL import Image as PILImage, ImageDraw, ImageFont
    HAS_IMAGE_DEPS = True
except ImportError:
    HAS_IMAGE_DEPS = False

# ─── Color Palette ───
AMBER = HexColor("#F59E0B")
AMBER_LIGHT = HexColor("#FEF3C7")
GREEN = HexColor("#22C55E")
GREEN_DARK = HexColor("#166534")
GREEN_LIGHT = HexColor("#DCFCE7")
BLUE = HexColor("#3B82F6")
BLUE_DARK = HexColor("#1E40AF")
BLUE_LIGHT = HexColor("#EFF6FF")
RED_DARK = HexColor("#92400E")
GRAY_900 = HexColor("#171717")
GRAY_800 = HexColor("#262626")
GRAY_700 = HexColor("#404040")
GRAY_500 = HexColor("#737373")
GRAY_400 = HexColor("#A3A3A3")
GRAY_300 = HexColor("#D4D4D4")
GRAY_200 = HexColor("#E5E5E5")
GRAY_100 = HexColor("#F5F5F5")
GRAY_50 = HexColor("#FAFAFA")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
USABLE_W = PAGE_W - 2 * MARGIN


# ─── Satellite Image & Roof Overlay ───

def fetch_satellite_image(lat: float, lng: float, api_key: str,
                          zoom: int = 19, size: str = "800x500") -> PILImage.Image | None:
    """Fetch satellite image from Google Static Maps API."""
    if not HAS_IMAGE_DEPS:
        print("[WARN] Pillow/requests not installed — skipping satellite image")
        return None

    url = (
        f"https://maps.googleapis.com/maps/api/staticmap?"
        f"center={lat},{lng}&zoom={zoom}&size={size}"
        f"&maptype=satellite&key={api_key}"
    )
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        img = PILImage.open(io.BytesIO(resp.content))
        print(f"[OK] Satellite image fetched: {img.size[0]}x{img.size[1]}")
        return img
    except Exception as e:
        print(f"[WARN] Failed to fetch satellite image: {e}")
        return None


def generate_roof_overlay(sat_img: PILImage.Image, size_kwp: int,
                          panel_w_px: int = 18, panel_h_px: int = 10,
                          gap_px: int = 3) -> PILImage.Image:
    """
    Overlay a panel grid on the satellite image.
    Draws amber rectangles in a centered grid representing the panel layout.
    """
    img = sat_img.copy().convert("RGBA")
    overlay = PILImage.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    panels_needed = math.ceil(size_kwp * 1000 / 550)
    cols = int(math.sqrt(panels_needed * 1.5))  # wider than tall
    rows = math.ceil(panels_needed / cols)

    # Center the grid
    grid_w = cols * (panel_w_px + gap_px)
    grid_h = rows * (panel_h_px + gap_px)
    start_x = (img.size[0] - grid_w) // 2
    start_y = (img.size[1] - grid_h) // 2

    # Draw usable area rectangle (semi-transparent)
    margin = 12
    draw.rectangle(
        [start_x - margin, start_y - margin,
         start_x + grid_w + margin, start_y + grid_h + margin],
        outline=(245, 158, 11, 180), width=2,
    )

    # Draw panels
    count = 0
    for r in range(rows):
        for c in range(cols):
            if count >= panels_needed:
                break
            x = start_x + c * (panel_w_px + gap_px)
            y = start_y + r * (panel_h_px + gap_px)
            draw.rectangle(
                [x, y, x + panel_w_px, y + panel_h_px],
                fill=(245, 158, 11, 100),
                outline=(245, 158, 11, 200),
                width=1,
            )
            count += 1

    # Draw inverter cluster marker (center-bottom of grid)
    inv_x = start_x + grid_w // 2
    inv_y = start_y + grid_h + margin + 15
    draw.ellipse([inv_x - 8, inv_y - 8, inv_x + 8, inv_y + 8],
                 fill=(34, 197, 94, 180), outline=(255, 255, 255, 200), width=1)

    # North arrow (top-right)
    nx, ny = img.size[0] - 40, 30
    draw.polygon([(nx, ny - 12), (nx - 6, ny + 6), (nx + 6, ny + 6)],
                 fill=(255, 255, 255, 200))
    try:
        draw.text((nx - 3, ny + 9), "N", fill=(255, 255, 255, 220))
    except Exception:
        pass

    # Legend
    legend_y = img.size[1] - 30
    draw.rectangle([10, legend_y - 4, 10 + panel_w_px, legend_y + panel_h_px - 4],
                   fill=(245, 158, 11, 100), outline=(245, 158, 11, 200), width=1)
    try:
        draw.text((32, legend_y - 4), f"PV Panel ({panels_needed} units)", fill=(255, 255, 255, 220))
        draw.ellipse([220, legend_y - 2, 230, legend_y + 8],
                     fill=(34, 197, 94, 180), outline=(255, 255, 255, 200), width=1)
        draw.text((235, legend_y - 4), "Inverter Cluster", fill=(255, 255, 255, 220))
    except Exception:
        pass

    return PILImage.alpha_composite(img, overlay).convert("RGB")


def save_image_for_pdf(pil_img: PILImage.Image, label: str = "satellite") -> str:
    """Save PIL image to temp file for ReportLab embedding."""
    tmp = tempfile.NamedTemporaryFile(suffix=f"_{label}.jpg", delete=False)
    pil_img.save(tmp, format="JPEG", quality=90)
    tmp.close()
    return tmp.name

# ─── Styles ───
S = {
    "cover_brand": ParagraphStyle(
        "cover_brand", fontName="Helvetica-Bold", fontSize=14,
        textColor=AMBER, alignment=TA_CENTER, spaceAfter=6, leading=18,
    ),
    "cover_title": ParagraphStyle(
        "cover_title", fontName="Helvetica-Bold", fontSize=30,
        textColor=GRAY_900, alignment=TA_CENTER, leading=36, spaceAfter=0,
    ),
    "cover_subtitle": ParagraphStyle(
        "cover_subtitle", fontName="Helvetica-Bold", fontSize=24,
        textColor=GRAY_900, alignment=TA_CENTER, leading=30, spaceAfter=20,
    ),
    "cover_company": ParagraphStyle(
        "cover_company", fontName="Helvetica", fontSize=16,
        textColor=GRAY_500, alignment=TA_CENTER, leading=22, spaceAfter=4,
    ),
    "cover_location": ParagraphStyle(
        "cover_location", fontName="Helvetica", fontSize=12,
        textColor=GRAY_400, alignment=TA_CENTER, leading=16, spaceAfter=30,
    ),
    "cover_conf": ParagraphStyle(
        "cover_conf", fontName="Helvetica-Bold", fontSize=10,
        textColor=GRAY_400, alignment=TA_CENTER, leading=14, spaceAfter=6,
    ),
    "cover_date": ParagraphStyle(
        "cover_date", fontName="Helvetica", fontSize=11,
        textColor=GRAY_500, alignment=TA_CENTER, leading=14,
    ),
    "title": ParagraphStyle(
        "title", fontName="Helvetica-Bold", fontSize=22,
        leading=28, textColor=GRAY_900, spaceAfter=4,
    ),
    "subtitle": ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=11,
        leading=15, textColor=GRAY_500, spaceAfter=16,
    ),
    "h2": ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=16,
        leading=20, textColor=GRAY_900, spaceBefore=20, spaceAfter=8,
    ),
    "h3": ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=13,
        leading=17, textColor=GRAY_700, spaceBefore=14, spaceAfter=6,
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
    "callout_blue": ParagraphStyle(
        "callout_blue", fontName="Helvetica-Bold", fontSize=9.5,
        textColor=BLUE_DARK, leading=14, spaceAfter=8,
        backColor=BLUE_LIGHT, borderPadding=(8, 10, 8, 10),
    ),
    "callout_amber": ParagraphStyle(
        "callout_amber", fontName="Helvetica", fontSize=9,
        textColor=RED_DARK, leading=13, spaceAfter=8,
        backColor=AMBER_LIGHT, borderPadding=(6, 8, 6, 8),
    ),
    "callout_green": ParagraphStyle(
        "callout_green", fontName="Helvetica-Bold", fontSize=10,
        textColor=GREEN_DARK, leading=14, spaceAfter=8,
        backColor=GREEN_LIGHT, borderPadding=(8, 10, 8, 10),
    ),
}


# ─── Prospect Data (hardcoded for Mega Plastics demo) ───
PROSPECT = {
    "company": "Mega Plastics Industries Sdn Bhd",
    "zone": "Shah Alam, Selangor (Seksyen 26)",
    "sector": "Plastics Manufacturing",
    "tariff_type": "Non-domestic (C1/C2 tariff)",
    "decision_maker": "En. Ahmad Razak, Director — confirmed owner, direct line verified",
    "report_date": "February 2026",
    "md_kw": 350,
    "size_kwp": 280,
    "annual_gen_kwh": 364_000,
    "self_consumption_pct": 80,
    "blended_tariff": 0.334,
    "smp_floor": 0.20,
    "capex_low": 512_000,
    "capex_mid": 570_000,
    "capex_high": 629_000,
    "capex_per_kwp_low": 1_800,
    "capex_per_kwp_high": 2_200,
    "roof_sqft": 16_800,
    "co2_tonnes": 255,
    "cars_equivalent": 55,
    "trees_equivalent": 4_000,
    "fit_score": 84,
    "fit_tier": "A",
}


def make_table(data, col_widths, highlight_row=None, total_row=False):
    """Consistently styled table."""
    t = Table(data, colWidths=col_widths)
    base = [
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
        base += [
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("BACKGROUND", (0, -1), (-1, -1), GRAY_100),
        ]
    if highlight_row is not None:
        base.append(("BACKGROUND", (0, highlight_row), (-1, highlight_row), HexColor("#FEFCE8")))
    t.setStyle(TableStyle(base))
    return t


def traffic_light(label, color_hex, width=50*mm):
    """Return a small colored indicator paragraph."""
    c = color_hex
    return Paragraph(
        f'<font color="{c}">●</font> {label}',
        ParagraphStyle("tl", fontName="Helvetica-Bold", fontSize=10,
                       textColor=GRAY_700, leading=14),
    )


def build_cashflow_drawing(p):
    """Create cumulative cashflow chart (Year 0 → 25)."""
    d = Drawing(USABLE_W, 160)

    # Calculate cumulative cashflow
    annual_savings = p["annual_gen_kwh"] * p["self_consumption_pct"] / 100 * p["blended_tariff"] + \
                     p["annual_gen_kwh"] * (1 - p["self_consumption_pct"] / 100) * p["smp_floor"]
    capex = p["capex_mid"]
    degradation = 0.005  # 0.5%/yr

    points = []
    cumulative = -capex
    points.append((0, cumulative / 1000))
    for yr in range(1, 26):
        yr_savings = annual_savings * (1 - degradation) ** (yr - 1)
        cumulative += yr_savings
        points.append((yr, cumulative / 1000))

    # Find breakeven
    breakeven_yr = None
    for i in range(1, len(points)):
        if points[i][1] >= 0 and points[i-1][1] < 0:
            # Linear interpolation
            x0, y0 = points[i-1]
            x1, y1 = points[i]
            breakeven_yr = x0 + (-y0) / (y1 - y0) * (x1 - x0)
            break

    # Chart area
    chart_left = 55
    chart_bottom = 35
    chart_width = float(USABLE_W) - 75
    chart_height = 110
    chart_right = chart_left + chart_width
    chart_top = chart_bottom + chart_height

    # Scale
    min_val = points[0][1]
    max_val = points[-1][1]
    y_range = max_val - min_val
    y_min = min_val - y_range * 0.05
    y_max = max_val + y_range * 0.05

    def to_x(year):
        return chart_left + (year / 25) * chart_width

    def to_y(val):
        return chart_bottom + ((val - y_min) / (y_max - y_min)) * chart_height

    # Background
    d.add(Rect(chart_left, chart_bottom, chart_width, chart_height,
               fillColor=GRAY_50, strokeColor=GRAY_200, strokeWidth=0.5))

    # Zero line
    zero_y = to_y(0)
    d.add(Line(chart_left, zero_y, chart_right, zero_y,
               strokeColor=GRAY_300, strokeWidth=0.5, strokeDashArray=[3, 3]))

    # Grid lines
    for val in range(int(min_val / 100) * 100, int(max_val / 100) * 100 + 200, 500):
        gy = to_y(val)
        if chart_bottom < gy < chart_top:
            d.add(Line(chart_left, gy, chart_right, gy,
                       strokeColor=GRAY_200, strokeWidth=0.3))
            d.add(String(chart_left - 5, gy - 3,
                         f"RM {val:,.0f}k" if abs(val) >= 1000 else f"RM {val:,.0f}k",
                         fontName="Helvetica", fontSize=7, fillColor=GRAY_400,
                         textAnchor="end"))

    # X-axis labels
    for yr in [0, 5, 10, 15, 20, 25]:
        d.add(String(to_x(yr), chart_bottom - 12, str(yr),
                     fontName="Helvetica", fontSize=7, fillColor=GRAY_400,
                     textAnchor="middle"))

    # Plot line — negative portion in red, positive in green
    for i in range(1, len(points)):
        x0, y0_val = points[i - 1]
        x1, y1_val = points[i]
        color = HexColor("#EF4444") if y1_val < 0 else GREEN
        d.add(Line(to_x(x0), to_y(y0_val), to_x(x1), to_y(y1_val),
                   strokeColor=color, strokeWidth=2))

    # Breakeven marker
    if breakeven_yr:
        bx = to_x(breakeven_yr)
        by = to_y(0)
        d.add(Circle(bx, by, 4, fillColor=AMBER, strokeColor=white, strokeWidth=1.5))
        d.add(String(bx, by + 8, f"Breakeven ~{breakeven_yr:.1f} yrs",
                     fontName="Helvetica-Bold", fontSize=8, fillColor=AMBER,
                     textAnchor="middle"))

    # End value marker
    end_x = to_x(25)
    end_y = to_y(points[-1][1])
    d.add(Circle(end_x, end_y, 3, fillColor=GREEN_DARK, strokeColor=white, strokeWidth=1))
    d.add(String(end_x + 5, end_y - 3,
                 f"+RM {points[-1][1]:,.0f}k",
                 fontName="Helvetica-Bold", fontSize=8, fillColor=GREEN_DARK))

    # Title
    d.add(String(chart_left, chart_top + 8, "Cumulative Cashflow (RM '000)",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=GRAY_700))

    # X-axis label
    d.add(String(chart_left + chart_width / 2, chart_bottom - 25, "Year",
                 fontName="Helvetica", fontSize=8, fillColor=GRAY_400,
                 textAnchor="middle"))

    return d


def build_energy_flow_drawing(p):
    """Create energy flow visualization."""
    d = Drawing(USABLE_W, 120)
    w = float(USABLE_W)

    self_kwh = p["annual_gen_kwh"] * p["self_consumption_pct"] / 100
    export_kwh = p["annual_gen_kwh"] * (1 - p["self_consumption_pct"] / 100)
    self_rm = self_kwh * p["blended_tariff"]
    export_rm = export_kwh * p["smp_floor"]

    # Source box
    d.add(Rect(10, 40, 120, 50, fillColor=AMBER_LIGHT, strokeColor=AMBER, strokeWidth=1, rx=6))
    d.add(String(70, 70, "Solar Generation", fontName="Helvetica-Bold", fontSize=9,
                 fillColor=GRAY_700, textAnchor="middle"))
    d.add(String(70, 55, f"{p['annual_gen_kwh']:,} kWh",
                 fontName="Helvetica-Bold", fontSize=11, fillColor=AMBER, textAnchor="middle"))
    d.add(String(70, 44, f"{p['size_kwp']} kWp system",
                 fontName="Helvetica", fontSize=7, fillColor=GRAY_500, textAnchor="middle"))

    # Self-consumption box
    d.add(Rect(200, 65, 140, 45, fillColor=GREEN_LIGHT, strokeColor=GREEN, strokeWidth=1, rx=6))
    d.add(String(270, 92, f"{p['self_consumption_pct']}% Self-Consumed",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=GREEN_DARK, textAnchor="middle"))
    d.add(String(270, 78, f"{self_kwh:,.0f} kWh",
                 fontName="Helvetica", fontSize=9, fillColor=GRAY_700, textAnchor="middle"))
    d.add(String(270, 68, f"→ RM {self_rm:,.0f} saved",
                 fontName="Helvetica-Bold", fontSize=8, fillColor=GREEN_DARK, textAnchor="middle"))

    # Export box
    d.add(Rect(200, 10, 140, 45, fillColor=BLUE_LIGHT, strokeColor=BLUE, strokeWidth=1, rx=6))
    d.add(String(270, 37, f"{100 - p['self_consumption_pct']}% Export @ SMP",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=BLUE_DARK, textAnchor="middle"))
    d.add(String(270, 23, f"{export_kwh:,.0f} kWh",
                 fontName="Helvetica", fontSize=9, fillColor=GRAY_700, textAnchor="middle"))
    d.add(String(270, 13, f"→ RM {export_rm:,.0f} credit",
                 fontName="Helvetica-Bold", fontSize=8, fillColor=BLUE_DARK, textAnchor="middle"))

    # Arrows
    d.add(Line(130, 75, 200, 87, strokeColor=GREEN, strokeWidth=1.5))
    d.add(Line(130, 55, 200, 32, strokeColor=BLUE, strokeWidth=1.5))

    # Total box
    d.add(Rect(400, 40, 130, 50, fillColor=GRAY_100, strokeColor=GRAY_300, strokeWidth=1, rx=6))
    d.add(String(465, 70, "Total Annual Benefit",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=GRAY_700, textAnchor="middle"))
    d.add(String(465, 53, f"RM {self_rm + export_rm:,.0f}",
                 fontName="Helvetica-Bold", fontSize=14, fillColor=AMBER, textAnchor="middle"))

    # Arrows to total
    d.add(Line(340, 87, 400, 70, strokeColor=GRAY_300, strokeWidth=1))
    d.add(Line(340, 32, 400, 55, strokeColor=GRAY_300, strokeWidth=1))

    return d


def build_smp_sensitivity_drawing(p):
    """Create SMP sensitivity line graph."""
    d = Drawing(USABLE_W, 140)

    self_kwh = p["annual_gen_kwh"] * p["self_consumption_pct"] / 100
    export_kwh = p["annual_gen_kwh"] * (1 - p["self_consumption_pct"] / 100)
    self_savings = self_kwh * p["blended_tariff"]

    smp_rates = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40]
    total_savings = [self_savings + export_kwh * r for r in smp_rates]

    # Chart area
    cl = 60
    cb = 30
    cw = float(USABLE_W) - 85
    ch = 90
    cr = cl + cw
    ct = cb + ch

    min_s = min(total_savings) / 1000 - 5
    max_s = max(total_savings) / 1000 + 5

    def tx(smp):
        return cl + ((smp - 0.10) / 0.30) * cw

    def ty(val):
        return cb + ((val - min_s) / (max_s - min_s)) * ch

    d.add(Rect(cl, cb, cw, ch, fillColor=GRAY_50, strokeColor=GRAY_200, strokeWidth=0.5))

    # Plot
    for i in range(1, len(smp_rates)):
        x0 = tx(smp_rates[i-1])
        y0 = ty(total_savings[i-1] / 1000)
        x1 = tx(smp_rates[i])
        y1 = ty(total_savings[i] / 1000)
        d.add(Line(x0, y0, x1, y1, strokeColor=AMBER, strokeWidth=2.5))

    # Points
    for smp, sv in zip(smp_rates, total_savings):
        x = tx(smp)
        y = ty(sv / 1000)
        d.add(Circle(x, y, 3, fillColor=AMBER, strokeColor=white, strokeWidth=1))

    # Floor marker
    fx = tx(0.20)
    fy = ty(total_savings[2] / 1000)
    d.add(Line(fx, cb, fx, ct, strokeColor=GRAY_300, strokeWidth=0.5, strokeDashArray=[3, 3]))
    d.add(String(fx + 3, ct - 10, "Floor (RM 0.20)",
                 fontName="Helvetica", fontSize=7, fillColor=GRAY_400))

    # Y-axis labels
    for v in range(int(min_s / 10) * 10, int(max_s / 10) * 10 + 10, 5):
        gy = ty(v)
        if cb <= gy <= ct:
            d.add(String(cl - 5, gy - 3, f"RM {v}k",
                         fontName="Helvetica", fontSize=7, fillColor=GRAY_400, textAnchor="end"))

    # X-axis labels
    for smp in smp_rates:
        d.add(String(tx(smp), cb - 12, f"RM {smp:.2f}",
                     fontName="Helvetica", fontSize=7, fillColor=GRAY_400, textAnchor="middle"))

    d.add(String(cl, ct + 8, "Annual Savings vs SMP Rate",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=GRAY_700))

    return d


# ═══════════════════════════════════════════════════
# SECTION BUILDERS
# ═══════════════════════════════════════════════════

def section_cover(story, p, brand_name, brand_footer, tier):
    """Cover page — all tiers."""
    story.append(Spacer(1, 70 * mm))

    story.append(Paragraph(brand_name, S["cover_brand"]))

    # Amber rule
    rule = Table([[""]], colWidths=[40 * mm], rowHeights=[1])
    rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), AMBER)]))
    rule.hAlign = "CENTER"
    story.append(rule)
    story.append(Spacer(1, 12))

    titles = {
        "basic": ("Solar ATAP", "Quick Fit Snapshot"),
        "pro": ("Solar ATAP", "Feasibility Assessment"),
        "premium": ("Solar ATAP", "Intelligence Dossier"),
    }
    story.append(Paragraph(titles[tier][0], S["cover_title"]))
    story.append(Paragraph(titles[tier][1], S["cover_subtitle"]))

    story.append(Paragraph(p["company"], S["cover_company"]))
    story.append(Paragraph(p["zone"], S["cover_location"]))

    subtitles = {
        "basic": "Preliminary Solar Suitability Check",
        "pro": "Pre-Engineering Financial &amp; Policy Review",
        "premium": "Independent Roof &amp; Energy Feasibility Analysis",
    }
    story.append(Paragraph(subtitles[tier], ParagraphStyle(
        "cover_sub", fontName="Helvetica", fontSize=11,
        textColor=GRAY_500, alignment=TA_CENTER, leading=14, spaceAfter=20,
    )))

    story.append(Paragraph("CONFIDENTIAL", S["cover_conf"]))
    story.append(Paragraph(p["report_date"], S["cover_date"]))

    story.append(Spacer(1, 30 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_200))
    story.append(Spacer(1, 6))

    tier_label = {
        "basic": "Non-binding indicative assessment",
        "pro": "Confidential — Prepared for internal decision-making",
        "premium": "Decision-grade strategic report",
    }
    story.append(Paragraph(
        f"{brand_footer} | {tier_label[tier]}",
        S["footer"],
    ))
    story.append(PageBreak())


def section_executive_snapshot(story, p, tier):
    """Executive Snapshot — Pro + Premium."""
    story.append(Paragraph("Executive Snapshot", S["h2"]))

    if tier == "basic":
        story.append(Paragraph(
            "Preliminary assessment based on publicly available benchmarks and estimated load assumptions.",
            S["body"],
        ))

    # Key numbers grid
    kpi_data = [
        ["Recommended Size", f"{p['size_kwp']} kWp"],
        ["Annual Savings Range", f"RM {108_181:,} – RM {126_381:,}"],
        ["Payback Range", "4.5 – 5.3 years"],
        ["Export Exposure", f"{100 - p['self_consumption_pct']}%"],
        ["Forfeiture Risk", "Low (RM 1,400 – 2,700/yr)"],
        ["ATAP Eligibility", "PASS"],
    ]
    t = Table(kpi_data, colWidths=[45 * mm, USABLE_W - 45 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 0), (1, -1), GRAY_900),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    if tier in ("pro", "premium"):
        # Traffic light indicators
        lights = [
            ("Technical Fit", GREEN_DARK),
            ("Financial Viability", GREEN_DARK),
            ("SMP Sensitivity", AMBER),
            ("Policy Compliance", GREEN_DARK),
        ]
        light_data = []
        for label, color in lights:
            light_data.append(Paragraph(
                f'<font color="{color.hexval()}"><b>●</b></font> {label}',
                ParagraphStyle("tl", fontName="Helvetica", fontSize=10,
                               textColor=GRAY_700, leading=14),
            ))
        tl_table = Table([light_data], colWidths=[USABLE_W / 4] * 4)
        tl_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("BACKGROUND", (0, 0), (-1, -1), GRAY_50),
        ]))
        story.append(tl_table)
        story.append(Spacer(1, 8))

    if tier == "basic":
        story.append(Paragraph(
            "This snapshot is based on publicly available benchmarks and estimated load assumptions. "
            "A detailed feasibility dossier is required for financial validation and system optimisation.",
            S["callout_amber"],
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "To proceed with a full feasibility dossier including roof analysis, layout concept, "
            "and SMP sensitivity modelling, request our detailed assessment.",
            ParagraphStyle("cta", fontName="Helvetica-Bold", fontSize=10,
                           textColor=AMBER, leading=14, spaceAfter=8),
        ))


def section_facility_intelligence(story, p):
    """Facility Intelligence with Solar Fit Score — Pro + Premium."""
    story.append(Paragraph("Facility Intelligence Overview", S["h2"]))

    info = [
        ["Industry", p["sector"]],
        ["Operation Pattern", "Day-dominant (7am–6pm)"],
        ["Tariff Type", p["tariff_type"]],
        ["Estimated Maximum Demand", f"{p['md_kw']} kW"],
        ["Decision Maker", p["decision_maker"]],
    ]
    t = Table(info, colWidths=[45 * mm, USABLE_W - 45 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 0), (1, -1), GRAY_900),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, GRAY_200),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Solar Fit Score
    story.append(Paragraph(
        f'Solar Fit Score: <font color="{AMBER.hexval()}">'
        f'<b>{p["fit_score"]}/100 (Tier {p["fit_tier"]})</b></font>',
        ParagraphStyle("fitscore", fontName="Helvetica-Bold", fontSize=13,
                       textColor=GRAY_900, leading=18, spaceAfter=8),
    ))

    score_breakdown = [
        ["Component", "Score", "Max", "Weight"],
        ["ATAP Regulatory Compliance", "27", "30", "30%"],
        ["Operational Suitability", "17", "20", "20%"],
        ["Asset Control (Ownership)", "20", "20", "20%"],
        ["Decision-Maker Access", "13", "15", "15%"],
        ["Trigger Signals", "7", "15", "15%"],
        ["TOTAL", str(p["fit_score"]), "100", "100%"],
    ]
    t = make_table(score_breakdown, [50 * mm, 20 * mm, 20 * mm, USABLE_W - 90 * mm], total_row=True)
    t.setStyle(TableStyle([("ALIGN", (1, 0), (-1, -1), "CENTER")]))
    story.append(t)


def section_roof_intelligence(story, p, sat_image_path=None):
    """Roof Intelligence — Premium only. Uses real satellite image if available."""
    story.append(Paragraph("Roof Intelligence Analysis", S["h2"]))

    story.append(Paragraph(
        "Using satellite analysis and site geometry estimation, the facility provides "
        f"approximately {p['roof_sqft']:,} sqft of usable roof area suitable for PV installation.",
        S["body"],
    ))

    if sat_image_path and os.path.exists(sat_image_path):
        # Real satellite image
        img_w = USABLE_W
        img_h = USABLE_W * 0.625  # 800x500 aspect ratio
        story.append(RLImage(sat_image_path, width=img_w, height=img_h))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "Source: Google Static Maps API · Satellite imagery for reference only · Subject to site verification",
            ParagraphStyle("img_caption", fontName="Helvetica", fontSize=8,
                           textColor=GRAY_400, alignment=TA_CENTER, leading=11),
        ))
    else:
        # Placeholder
        placeholder = Table(
            [[Paragraph(
                "<b>SATELLITE ROOF IMAGE</b><br/><br/>"
                "Insert annotated satellite image here<br/>"
                "showing usable panel area, obstruction zones,<br/>"
                "and north orientation marker.<br/><br/>"
                "<i>Source: Google Static Maps API</i>",
                ParagraphStyle("ph", fontName="Helvetica", fontSize=10,
                               textColor=GRAY_400, alignment=TA_CENTER, leading=16),
            )]],
            colWidths=[USABLE_W],
            rowHeights=[120],
        )
        placeholder.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GRAY_50),
            ("BOX", (0, 0), (-1, -1), 1, GRAY_300),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(placeholder)
    story.append(Spacer(1, 8))

    roof_data = [
        ["Parameter", "Value"],
        ["Estimated total roof footprint", f"~{int(p['roof_sqft'] * 1.1):,} sqft"],
        ["Usable after obstructions", f"{p['roof_sqft']:,} sqft"],
        ["Roof type (estimated)", "Metal deck (industrial profile)"],
        ["Structural risk level", "Low–Moderate (to verify on site)"],
        ["Tilt assumption", "5–10° metal deck pitch"],
        ["Orientation", "North–South alignment (optimal for equatorial)"],
    ]
    t = Table(roof_data, colWidths=[50 * mm, USABLE_W - 50 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRAY_500),
        ("TEXTCOLOR", (0, 1), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 1), (1, -1), GRAY_900),
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
    ]))
    story.append(t)


def section_layout_concept(story, p, overlay_image_path=None):
    """Layout concept — Premium only. Uses real overlay if available."""
    story.append(Paragraph("Preliminary Layout Concept", S["h2"]))

    story.append(Paragraph(
        "The conceptual layout illustrates optimal panel alignment oriented to maximise "
        "daytime generation while maintaining safe maintenance corridors and inverter "
        "clustering efficiency.",
        S["body"],
    ))

    panels_needed = math.ceil(p["size_kwp"] * 1000 / 550)

    if overlay_image_path and os.path.exists(overlay_image_path):
        # Real overlay image
        img_w = USABLE_W
        img_h = USABLE_W * 0.625
        story.append(RLImage(overlay_image_path, width=img_w, height=img_h))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            f"Conceptual layout: ~{panels_needed} x 550W panels · Amber = panel zones · "
            "Green = inverter cluster · Subject to site verification",
            ParagraphStyle("overlay_caption", fontName="Helvetica", fontSize=8,
                           textColor=GRAY_400, alignment=TA_CENTER, leading=11),
        ))
    else:
        # Placeholder
        placeholder = Table(
            [[Paragraph(
                "<b>PANEL LAYOUT OVERLAY</b><br/><br/>"
                f"Insert roof overlay showing {panels_needed} panels<br/>"
                "in grid formation with row spacing,<br/>"
                "inverter cluster position, and cable routing.<br/><br/>"
                "<i>Subject to site verification</i>",
                ParagraphStyle("ph2", fontName="Helvetica", fontSize=10,
                               textColor=GRAY_400, alignment=TA_CENTER, leading=16),
            )]],
            colWidths=[USABLE_W],
            rowHeights=[120],
        )
        placeholder.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GRAY_50),
            ("BOX", (0, 0), (-1, -1), 1, GRAY_300),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(placeholder)
    story.append(Spacer(1, 8))

    layout_data = [
        ["Panel count", f"~{panels_needed} x 550W panels"],
        ["Row spacing", "1.0m maintenance corridor"],
        ["Inverter cluster", "Central location (minimise DC cable run)"],
        ["AC routing", "To main switchboard (shortest path)"],
    ]
    t = Table(layout_data, colWidths=[40 * mm, USABLE_W - 40 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 0), (1, -1), GRAY_700),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
    ]))
    story.append(t)

    story.append(Paragraph(
        "This layout is indicative and subject to physical survey validation. "
        "Final design will account for roof penetrations, drainage paths, and structural load limits.",
        S["body_small"],
    ))


def section_energy_flow(story, p):
    """Energy flow visualization — Pro + Premium."""
    story.append(Paragraph("Energy Flow Analysis", S["h2"]))
    story.append(Paragraph(
        f"At {p['self_consumption_pct']}% self-consumption, the majority of generated energy "
        "displaces TNB tariff directly, with controlled export exposure settled at SMP rates.",
        S["body"],
    ))
    story.append(build_energy_flow_drawing(p))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "ROI stability is primarily driven by tariff displacement rather than export dependency.",
        S["callout_blue"],
    ))


def section_eligibility(story, p):
    """ATAP Eligibility — all tiers."""
    story.append(Paragraph("ATAP Eligibility Assessment", S["h2"]))
    story.append(Paragraph(
        "Based on GP/ST/No.60/2025 (Solar ATAP Guidelines effective January 2026).",
        S["body_small"],
    ))

    data = [
        ["Criteria", "Status", "Detail"],
        ["Single-tenant premise", "PASS", "Single occupant — owner-operated factory"],
        ["Maximum Demand < 1MW", "PASS", f"Estimated MD: {p['md_kw']} kW (within cap)"],
        ["Ownership / TNB consent", "PASS", "Owner-occupied (no landlord consent needed)"],
        ["Operating hours", "NOTE", "Day-dominant (7am-6pm) — optimal self-consumption"],
        ["Sector eligibility", "PASS", "Manufacturing — no ATAP sector exclusion"],
    ]
    t = Table(data, colWidths=[40 * mm, 20 * mm, USABLE_W - 60 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRAY_500),
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    for i in range(1, len(data)):
        status = data[i][1]
        color = GREEN_DARK if status == "PASS" else RED_DARK
        t.setStyle(TableStyle([
            ("TEXTCOLOR", (1, i), (1, i), color),
            ("FONTNAME", (1, i), (1, i), "Helvetica-Bold"),
        ]))
    story.append(t)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "VERDICT: ATAP ELIGIBLE — All hard gates passed. Proceed to system sizing.",
        S["callout_green"],
    ))


def section_sizing(story, p):
    """Sizing strategy — Pro + Premium."""
    story.append(Paragraph("Sizing Strategy &amp; Oversizing Risk", S["h2"]))
    story.append(Paragraph(
        "Solar ATAP mandates system capacity at or below 100% of Maximum Demand, capped at 1MW. "
        "To minimise monthly energy forfeiture (no credit carry-forward under ATAP), optimal sizing "
        "targets 75-85% of MD for day-dominant operations.",
        S["body"],
    ))

    data = [
        ["Parameter", "Value", "Basis"],
        ["Estimated Maximum Demand", f"{p['md_kw']} kW", "TNB bill band + sector benchmark"],
        ["ATAP capacity cap", f"{p['md_kw']} kW (MD) or 1MW", f"Whichever is lower = {p['md_kw']} kW"],
        ["Optimal sizing range", f"{int(p['md_kw']*0.75)} – {int(p['md_kw']*0.85)} kWp", f"75-85% of {p['md_kw']} kW MD"],
        ["Recommended system size", f"{p['size_kwp']} kWp", "Sweet spot for self-consumption"],
        ["Estimated annual generation", f"{p['annual_gen_kwh']:,} kWh",
         f"{p['size_kwp']} kWp x 1,300 kWh/kWp (3.57 peak sun hours/day, "
         "Selangor avg per PVGIS/SolarGIS)"],
        ["Estimated roof area required", f"{p['roof_sqft']:,} sqft", f"{p['size_kwp']} kWp x ~60 sqft/kWp"],
    ]
    t = make_table(data, [50 * mm, 35 * mm, USABLE_W - 85 * mm], highlight_row=4)
    t.setStyle(TableStyle([
        ("FONTNAME", (1, 4), (1, 4), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 4), (1, 4), AMBER),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    # Oversizing comparison table
    story.append(Paragraph("Sizing Comparison", S["h3"]))
    comp_data = [
        ["Size", "Self-Use %", "Export %", "Annual Export", "Value Loss vs Optimal"],
        [f"{p['size_kwp']} kWp (recommended)", "80%", "20%", "72,800 kWh", "—"],
        [f"{p['md_kw']} kWp (roof-max)", "80%", "20%", "91,000 kWh", "~RM 15,000/yr"],
    ]
    t = make_table(comp_data, [40 * mm, 22 * mm, 20 * mm, 28 * mm, USABLE_W - 110 * mm], highlight_row=1)
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        f"OVERSIZING WARNING: A roof-maximized {p['md_kw']} kWp system (100% of MD) would generate "
        "an estimated 455,000 kWh/year. At 80% self-consumption, approximately 91,000 kWh of "
        "excess export would be settled at SMP (~RM 0.20/kWh) rather than displacing TNB tariff "
        "(~RM 0.365/kWh) — a net value loss of ~RM 15,000/year. Under ATAP's no-rollover rule, "
        "months with low factory load would also risk outright forfeiture.",
        S["callout_amber"],
    ))


def section_financial(story, p):
    """Financial model — Pro + Premium."""
    story.append(Paragraph("Financial Projection", S["h2"]))

    story.append(Paragraph("CAPEX Estimate", S["h3"]))
    capex_data = [
        ["Component", "Rate", "Amount"],
        [f"Solar PV system ({p['size_kwp']} kWp)",
         f"RM {p['capex_per_kwp_low']:,}–{p['capex_per_kwp_high']:,}/kWp",
         f"RM {p['capex_low'] - 8000:,} – {p['capex_high'] - 13000:,}"],
        ["CAS fee (>180-425 kW band)", "GP/ST/No.60/2025 schedule", "RM 5,000"],
        ["Structural roof assessment", "Subject to roof condition", "RM 3,000 – 8,000"],
        ["Total estimated CAPEX", "", f"RM {p['capex_low']:,} – {p['capex_high']:,}"],
    ]
    t = make_table(capex_data, [50 * mm, 40 * mm, USABLE_W - 90 * mm], total_row=True)
    t.setStyle(TableStyle([("ALIGN", (2, 0), (2, -1), "RIGHT")]))
    story.append(t)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"Savings model uses midpoint CAPEX of RM {p['capex_mid']:,} for payback calculation.",
        S["body_small"],
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Savings Model (Annual)", S["h3"]))

    self_70 = int(p["annual_gen_kwh"] * 0.70)
    self_80 = int(p["annual_gen_kwh"] * 0.80)
    self_90 = int(p["annual_gen_kwh"] * 0.90)
    exp_70 = p["annual_gen_kwh"] - self_70
    exp_80 = p["annual_gen_kwh"] - self_80
    exp_90 = p["annual_gen_kwh"] - self_90
    sav_70 = self_70 * p["blended_tariff"] + exp_70 * p["smp_floor"]
    sav_80 = self_80 * p["blended_tariff"] + exp_80 * p["smp_floor"]
    sav_90 = self_90 * p["blended_tariff"] + exp_90 * p["smp_floor"]

    savings_data = [
        ["Scenario", "Self-Consumed", "Export", "Annual Savings", "Payback"],
        ["Conservative (70%)", f"{self_70:,} kWh", f"{exp_70:,} kWh",
         f"RM {sav_70:,.0f}", f"{p['capex_mid']/sav_70:.1f} yrs"],
        ["Base case (80%)", f"{self_80:,} kWh", f"{exp_80:,} kWh",
         f"RM {sav_80:,.0f}", f"{p['capex_mid']/sav_80:.1f} yrs"],
        ["Optimistic (90%)", f"{self_90:,} kWh", f"{exp_90:,} kWh",
         f"RM {sav_90:,.0f}", f"{p['capex_mid']/sav_90:.1f} yrs"],
    ]
    t = make_table(savings_data,
                   [35 * mm, 30 * mm, 28 * mm, 30 * mm, USABLE_W - 123 * mm],
                   highlight_row=2)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 2), (0, 2), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]))
    story.append(t)
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        f"Payback range across full CAPEX band: "
        f"{p['capex_low']/sav_80:.1f} – {p['capex_high']/sav_80:.1f} years "
        f"(base case RM {sav_80:,.0f}/yr against RM {p['capex_low']:,} – {p['capex_high']:,}).",
        S["callout_blue"],
    ))


def section_cashflow(story, p):
    """Cumulative cashflow curve — Pro + Premium."""
    story.append(Paragraph("25-Year Cumulative Cashflow", S["h2"]))
    story.append(build_cashflow_drawing(p))
    story.append(Spacer(1, 8))

    annual = p["annual_gen_kwh"] * p["self_consumption_pct"] / 100 * p["blended_tariff"] + \
             p["annual_gen_kwh"] * (1 - p["self_consumption_pct"] / 100) * p["smp_floor"]
    cumulative_25 = sum(annual * (1 - 0.005) ** yr for yr in range(25)) - p["capex_mid"]

    story.append(Paragraph(
        f"Over 25 years with 0.5% annual degradation, cumulative net benefit reaches "
        f"approximately RM {cumulative_25/1000:,.0f}k after midpoint CAPEX recovery.",
        S["body"],
    ))


def section_smp_sensitivity(story, p):
    """SMP sensitivity — Pro + Premium."""
    story.append(Paragraph("SMP Sensitivity Analysis", S["h2"]))
    story.append(Paragraph(
        "The System Marginal Price fluctuates monthly based on fuel costs and dispatch order.",
        S["body"],
    ))

    story.append(build_smp_sensitivity_drawing(p))
    story.append(Spacer(1, 8))

    self_kwh = p["annual_gen_kwh"] * p["self_consumption_pct"] / 100
    export_kwh = p["annual_gen_kwh"] * (1 - p["self_consumption_pct"] / 100)
    self_savings = self_kwh * p["blended_tariff"]

    smp_data = [
        ["SMP Rate", "Export Revenue", "Total Savings", "Payback", "Impact vs Floor"],
        ["RM 0.15/kWh", f"RM {export_kwh*0.15:,.0f}", f"RM {self_savings+export_kwh*0.15:,.0f}",
         f"{p['capex_mid']/(self_savings+export_kwh*0.15):.1f} yrs",
         f"-RM {export_kwh*(0.20-0.15):,.0f}"],
        ["RM 0.20/kWh (floor)", f"RM {export_kwh*0.20:,.0f}", f"RM {self_savings+export_kwh*0.20:,.0f}",
         f"{p['capex_mid']/(self_savings+export_kwh*0.20):.1f} yrs", "Base"],
        ["RM 0.25/kWh", f"RM {export_kwh*0.25:,.0f}", f"RM {self_savings+export_kwh*0.25:,.0f}",
         f"{p['capex_mid']/(self_savings+export_kwh*0.25):.1f} yrs",
         f"+RM {export_kwh*(0.25-0.20):,.0f}"],
        ["RM 0.30/kWh", f"RM {export_kwh*0.30:,.0f}", f"RM {self_savings+export_kwh*0.30:,.0f}",
         f"{p['capex_mid']/(self_savings+export_kwh*0.30):.1f} yrs",
         f"+RM {export_kwh*(0.30-0.20):,.0f}"],
        ["RM 0.40/kWh (peak)", f"RM {export_kwh*0.40:,.0f}", f"RM {self_savings+export_kwh*0.40:,.0f}",
         f"{p['capex_mid']/(self_savings+export_kwh*0.40):.1f} yrs",
         f"+RM {export_kwh*(0.40-0.20):,.0f}"],
    ]
    t = make_table(smp_data, [28*mm, 28*mm, 30*mm, 22*mm, USABLE_W - 108*mm], highlight_row=2)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 2), (0, 2), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (3, -1), "RIGHT"),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        f"KEY INSIGHT: At {p['self_consumption_pct']}% self-consumption, the full SMP range "
        f"(RM 0.15-0.40) causes only a RM {export_kwh*(0.40-0.15):,.0f} swing — ~16% variance. "
        "The primary savings driver is self-consumed generation displacing TNB tariff, not export credits.",
        S["callout_blue"],
    ))

    story.append(Paragraph(
        "NOTE: Monthly Average SMP is published by Single Buyer "
        "(www.singlebuyer.com.my/resources-marginal.php) under the Malaysian MESI framework. "
        "The RM 0.20/kWh floor is a conservative estimate. Final economics should use the "
        "actual published SMP figure at time of proposal.",
        S["callout_amber"],
    ))


def section_forfeiture(story, p):
    """Forfeiture risk — Pro + Premium."""
    story.append(Paragraph("Monthly Forfeiture Risk Assessment", S["h2"]))
    story.append(Paragraph(
        "Under Solar ATAP, excess credits are forfeited at end of each billing month. "
        "Cost estimates assume excess generation exported at SMP rather than self-consumed at tariff.",
        S["body"],
    ))

    data = [
        ["Risk Factor", "Prob.", "Est. Annual Cost", "Mitigation"],
        ["Hari Raya shutdown\n(1-2 weeks)", "High",
         "RM 1,000 – 2,000", "Factor into annual model; accept ~2% forfeiture"],
        ["CNY factory closure\n(3-5 days)", "Medium",
         "RM 400 – 700", "Short closure; minimal impact at 280 kWp"],
        ["Weekend generation\nexcess", "Low",
         "Negligible", "Day-dominant ops; sizing accounts for 5-day week"],
        ["Unplanned downtime", "Low",
         "Negligible", "280 kWp at 80% MD provides buffer"],
    ]
    t = make_table(data, [38*mm, 16*mm, 30*mm, USABLE_W - 84*mm])
    story.append(t)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Total estimated annual forfeiture cost: RM 1,400 – 2,700 (0.4–0.7% of gross generation value).",
        S["body_small"],
    ))


def section_carbon_esg(story, p):
    """Carbon & ESG impact — Premium only."""
    story.append(Paragraph("Carbon &amp; ESG Impact", S["h2"]))

    story.append(Paragraph(
        f"Based on {p['annual_gen_kwh']:,} kWh annual generation displacing grid electricity "
        "with Malaysian grid emission factor of ~0.7 kg CO2/kWh:",
        S["body"],
    ))

    carbon_data = [
        ["Metric", "Annual Impact"],
        ["CO2 emissions avoided", f"~{p['co2_tonnes']} tonnes/year"],
        ["Equivalent: vehicles removed from road", f"~{p['cars_equivalent']} passenger cars"],
        ["Equivalent: trees planted", f"~{p['trees_equivalent']:,} trees"],
        ["25-year lifetime CO2 avoidance", f"~{int(p['co2_tonnes'] * 23.5):,} tonnes"],
    ]
    t = Table(carbon_data, colWidths=[65 * mm, USABLE_W - 65 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRAY_500),
        ("TEXTCOLOR", (0, 1), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 1), (1, -1), GREEN_DARK),
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "This carbon reduction supports alignment with Bursa Malaysia Sustainability "
        "Reporting Framework and corporate ESG disclosure requirements. Solar ATAP installations "
        "provide verifiable renewable energy generation for annual sustainability reporting.",
        S["body"],
    ))


def section_roadmap(story, p):
    """Implementation roadmap — all tiers (simplified for basic)."""
    story.append(Paragraph("Implementation Roadmap", S["h2"]))

    steps = [
        ("1. Site Survey", "2–3 weeks",
         "Physical roof inspection, structural load assessment, TNB meter verification."),
        ("2. Detailed Design", "2–3 weeks",
         "Panel layout, inverter sizing, cable routing, single-line diagram."),
        ("3. ATAP Application", "4–8 weeks",
         "Submit to TNB with CAS approval. Capacity subject to Government availability. "
         "First-come-first-served basis."),
        ("4. Installation", "6–8 weeks",
         f"Panel mounting, inverter installation, wiring for {p['size_kwp']} kWp system."),
        ("5. Commissioning", "1–2 weeks",
         "TNB inspection, meter installation, COD issuance."),
    ]

    timeline_data = [["Phase", "Duration", "Description"]]
    for step, dur, desc in steps:
        timeline_data.append([step, dur, desc])

    t = make_table(timeline_data, [35*mm, 22*mm, USABLE_W - 57*mm])
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Estimated total timeline: 4–6 months from survey to commissioning.",
        ParagraphStyle("timeline_note", fontName="Helvetica-Bold", fontSize=10,
                       textColor=GRAY_700, leading=14, spaceAfter=8),
    ))


def section_strategic_recommendation(story, p):
    """Strategic recommendation — Premium only."""
    story.append(Paragraph("Strategic Recommendation", S["h2"]))

    story.append(Paragraph(
        f"Based on financial modelling, roof intelligence, and policy compliance review, "
        f"this facility demonstrates <b>high suitability</b> for a {p['size_kwp']} kWp "
        f"ATAP-compliant installation with controlled export exposure and strong "
        f"self-consumption economics.",
        S["body"],
    ))

    story.append(Paragraph("We recommend proceeding to:", S["body"]))

    next_steps = [
        "Physical survey and structural validation",
        "Detailed load profile analysis (TNB bill data)",
        "Structural assessment by certified engineer",
        "ATAP application to secure capacity allocation",
    ]
    for ns in next_steps:
        story.append(Paragraph(f"  • {ns}", S["body"]))

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "This dossier is designed to eliminate oversizing risk, quantify export volatility "
        "exposure, protect against policy misinterpretation, and provide board-ready financial clarity.",
        S["callout_blue"],
    ))

    story.append(Paragraph(
        "The assessment fee is deductible upon project award.",
        ParagraphStyle("deductible", fontName="Helvetica-Bold", fontSize=10,
                       textColor=AMBER, leading=14, spaceAfter=8, alignment=TA_CENTER),
    ))


def section_disclaimer(story, p, brand_footer):
    """Disclaimer — all tiers."""
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_200))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "DISCLAIMER: This report is based on estimated data and publicly available benchmarks. "
        "Actual system sizing, generation, and financial returns depend on site-specific conditions "
        "confirmed during physical survey. TNB tariff uses a blended effective rate; actual bill "
        "structure varies by consumption pattern. SMP export rates are conservative estimates — "
        "actual rates published monthly by Single Buyer (www.singlebuyer.com.my). Solar irradiance "
        "data sourced from PVGIS/SolarGIS; actual yield may vary. CAPEX range reflects market "
        "variation and does not constitute a quotation. This report does not constitute financial "
        "advice. All figures should be validated by the installing EPC contractor.",
        ParagraphStyle("disclaimer", fontName="Helvetica", fontSize=8,
                       leading=11, textColor=GRAY_400, spaceAfter=8),
    ))
    story.append(Paragraph(f"{brand_footer} | Confidential", S["footer"]))


# ═══════════════════════════════════════════════════
# MAIN BUILD FUNCTION
# ═══════════════════════════════════════════════════

def build_dossier(output_path: str, tier: str = "premium",
                  white_label: str | None = None,
                  lat: float | None = None, lng: float | None = None,
                  api_key: str | None = None):
    """Generate tiered Solar ATAP dossier.

    Args:
        lat/lng: Facility coordinates for satellite imagery (Premium only).
        api_key: Google Static Maps API key. If provided with lat/lng,
                 fetches real satellite image and generates panel overlay.
    """

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
    )

    story = []
    p = PROSPECT
    brand_name = white_label or "POWERROOF"
    brand_footer = (
        f"{white_label} | Powered by PowerRoof.my"
        if white_label
        else "PowerRoof.my — Solar Acquisition Intelligence"
    )

    # ─── Fetch satellite imagery if coordinates + API key provided ───
    sat_image_path = None
    overlay_image_path = None
    temp_files = []

    if tier == "premium" and lat and lng and api_key and HAS_IMAGE_DEPS:
        print(f"[INFO] Fetching satellite image for {lat}, {lng}...")
        sat_img = fetch_satellite_image(lat, lng, api_key)
        if sat_img:
            sat_image_path = save_image_for_pdf(sat_img, "satellite")
            temp_files.append(sat_image_path)
            print("[INFO] Generating panel overlay...")
            overlay_img = generate_roof_overlay(sat_img, p["size_kwp"])
            overlay_image_path = save_image_for_pdf(overlay_img, "overlay")
            temp_files.append(overlay_image_path)
    elif tier == "premium" and not api_key:
        print("[INFO] No --api-key provided — using placeholder images for roof sections")

    # ═══ COVER (all tiers) ═══
    section_cover(story, p, brand_name, brand_footer, tier)

    # ═══ EXECUTIVE SNAPSHOT (all tiers) ═══
    section_executive_snapshot(story, p, tier)

    if tier == "basic":
        # Basic: eligibility + roadmap + disclaimer
        story.append(PageBreak())
        section_eligibility(story, p)
        section_roadmap(story, p)
        section_disclaimer(story, p, brand_footer)

    elif tier == "pro":
        # Pro: facility + eligibility + sizing + energy flow + financial + cashflow
        #      + SMP sensitivity + forfeiture + roadmap + disclaimer
        story.append(PageBreak())
        section_facility_intelligence(story, p)
        story.append(PageBreak())
        section_eligibility(story, p)
        section_sizing(story, p)
        story.append(PageBreak())
        section_energy_flow(story, p)
        section_financial(story, p)
        story.append(PageBreak())
        section_cashflow(story, p)
        section_smp_sensitivity(story, p)
        story.append(PageBreak())
        section_forfeiture(story, p)
        section_roadmap(story, p)
        section_disclaimer(story, p, brand_footer)

    elif tier == "premium":
        # Premium: full 14-page dossier with satellite imagery
        story.append(PageBreak())
        section_facility_intelligence(story, p)
        story.append(PageBreak())
        section_roof_intelligence(story, p, sat_image_path=sat_image_path)
        story.append(PageBreak())
        section_layout_concept(story, p, overlay_image_path=overlay_image_path)
        story.append(PageBreak())
        section_eligibility(story, p)
        story.append(PageBreak())
        section_sizing(story, p)
        story.append(PageBreak())
        section_energy_flow(story, p)
        section_financial(story, p)
        story.append(PageBreak())
        section_cashflow(story, p)
        story.append(PageBreak())
        section_smp_sensitivity(story, p)
        story.append(PageBreak())
        section_forfeiture(story, p)
        story.append(PageBreak())
        section_carbon_esg(story, p)
        story.append(PageBreak())
        section_roadmap(story, p)
        story.append(PageBreak())
        section_strategic_recommendation(story, p)
        section_disclaimer(story, p, brand_footer)

    doc.build(story)
    print(f"[{tier.upper()}] Dossier generated: {output_path}")


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    tier = "premium"
    white_label = None
    lat = None
    lng = None
    api_key = None

    def get_arg(flag):
        if flag in sys.argv:
            idx = sys.argv.index(flag)
            if idx + 1 < len(sys.argv):
                return sys.argv[idx + 1]
        return None

    tier = (get_arg("--tier") or "premium").lower()
    if tier not in ("basic", "pro", "premium"):
        print(f"Invalid tier: {tier}. Use basic, pro, or premium.")
        sys.exit(1)

    white_label = get_arg("--white-label")

    # Satellite imagery flags (Premium only)
    lat_str = get_arg("--lat")
    lng_str = get_arg("--lng")
    api_key = get_arg("--api-key") or os.environ.get("GOOGLE_MAPS_API_KEY")

    if lat_str and lng_str:
        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except ValueError:
            print(f"[WARN] Invalid lat/lng: {lat_str}, {lng_str} — skipping satellite image")

    if api_key and not lat:
        print("[INFO] --api-key provided but no --lat/--lng — satellite image skipped")
    if lat and not api_key:
        print("[INFO] --lat/--lng provided but no --api-key — satellite image skipped")
        print("       Set GOOGLE_MAPS_API_KEY env var or pass --api-key YOUR_KEY")

    output = os.path.join(project_root, "reports", f"dossier-{tier}.pdf")
    build_dossier(output, tier=tier, white_label=white_label,
                  lat=lat, lng=lng, api_key=api_key)

    print(f"\nUsage examples:")
    print(f"  python {sys.argv[0]} --tier premium --white-label \"Voltek Energy\"")
    print(f"  python {sys.argv[0]} --tier premium --lat 3.0658 --lng 101.5183 --api-key YOUR_KEY")
    print(f"  GOOGLE_MAPS_API_KEY=xxx python {sys.argv[0]} --tier premium --lat 3.0658 --lng 101.5183")

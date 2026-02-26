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
import json
import math
import tempfile
import io
from pathlib import Path
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


# ─── SMP Data Loading ───
def load_smp_history() -> list[dict]:
    """Load SMP history from smp_history.json (managed by smp-update.py)."""
    smp_file = Path(__file__).parent / "smp_history.json"
    if smp_file.exists():
        with open(smp_file) as f:
            return sorted(json.load(f), key=lambda x: x["month"], reverse=True)
    return []


def get_smp_stats(months: int = 12) -> dict:
    """Calculate SMP statistics. Returns dict with avg, min, max, latest, history."""
    data = load_smp_history()[:months]
    if not data:
        # Fallback if no history file
        return {
            "avg": 0.20, "min": 0.15, "max": 0.25,
            "latest": 0.20, "latest_month": "unknown",
            "history": [], "count": 0, "source": "fallback",
        }
    values = [d["smp"] for d in data]
    all_estimated = all(d.get("source") == "estimated" for d in data)
    return {
        "avg": sum(values) / len(values),
        "min": min(values),
        "max": max(values),
        "latest": data[0]["smp"],
        "latest_month": data[0]["month"],
        "history": data,
        "count": len(values),
        "source": "estimated" if all_estimated else "singlebuyer",
    }


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
    # Convert to RGB if needed (palette mode 'P' or RGBA can't save as JPEG)
    if pil_img.mode in ('P', 'RGBA', 'LA'):
        pil_img = pil_img.convert('RGB')
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
    "smp_floor": 0.20,  # Default fallback; overridden by dynamic SMP in build_dossier()
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


def build_smp_volatility_drawing(smp_stats):
    """Create 12-month SMP historical volatility chart."""
    d = Drawing(USABLE_W, 130)

    history = sorted(smp_stats.get("history", []), key=lambda x: x["month"])
    if len(history) < 3:
        d.add(String(float(USABLE_W) / 2, 65, "Insufficient SMP history for volatility chart",
                     fontName="Helvetica", fontSize=9, fillColor=GRAY_400, textAnchor="middle"))
        return d

    avg = smp_stats["avg"]
    smp_min = smp_stats["min"]
    smp_max = smp_stats["max"]

    # Chart area
    cl = 55  # left
    cb = 25  # bottom
    cw = float(USABLE_W) - 75
    ch = 80
    cr = cl + cw
    ct = cb + ch

    # Y range with padding
    y_min = smp_min - 0.01
    y_max = smp_max + 0.01

    def tx(i):
        return cl + (i / max(len(history) - 1, 1)) * cw

    def ty(val):
        return cb + ((val - y_min) / max(y_max - y_min, 0.001)) * ch

    # Background
    d.add(Rect(cl, cb, cw, ch, fillColor=GRAY_50, strokeColor=GRAY_200, strokeWidth=0.5))

    # Average line (dashed)
    avg_y = ty(avg)
    d.add(Line(cl, avg_y, cr, avg_y, strokeColor=BLUE, strokeWidth=1, strokeDashArray=[4, 3]))
    d.add(String(cr + 3, avg_y - 3, f"Avg {avg:.2f}",
                 fontName="Helvetica", fontSize=7, fillColor=BLUE))

    # Min/max band (light fill)
    min_y = ty(smp_min)
    max_y = ty(smp_max)
    d.add(Rect(cl, min_y, cw, max_y - min_y,
               fillColor=Color(0.95, 0.87, 0.73, 0.3), strokeColor=None))

    # Plot line
    for i in range(1, len(history)):
        x0 = tx(i - 1)
        y0 = ty(history[i - 1]["smp"])
        x1 = tx(i)
        y1 = ty(history[i]["smp"])
        d.add(Line(x0, y0, x1, y1, strokeColor=AMBER, strokeWidth=2))

    # Points
    for i, entry in enumerate(history):
        x = tx(i)
        y = ty(entry["smp"])
        is_estimated = entry.get("source") == "estimated"
        fill = GRAY_300 if is_estimated else AMBER
        d.add(Circle(x, y, 2.5, fillColor=fill, strokeColor=white, strokeWidth=0.8))

    # X-axis labels (every 3 months)
    for i, entry in enumerate(history):
        if i % 3 == 0 or i == len(history) - 1:
            label = entry["month"][2:]  # "25-01" from "2025-01"
            d.add(String(tx(i), cb - 12, label,
                         fontName="Helvetica", fontSize=6.5, fillColor=GRAY_400, textAnchor="middle"))

    # Y-axis labels
    step = 0.02
    v = round(y_min / step) * step
    while v <= y_max + 0.001:
        gy = ty(v)
        if cb <= gy <= ct:
            d.add(String(cl - 4, gy - 3, f"{v:.2f}",
                         fontName="Helvetica", fontSize=7, fillColor=GRAY_400, textAnchor="end"))
        v += step

    # Title
    d.add(String(cl, ct + 8, "SMP Monthly Trend (RM/kWh)",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=GRAY_700))

    # Legend
    lx = cr - 90
    d.add(Circle(lx, ct + 10, 2.5, fillColor=AMBER, strokeColor=white, strokeWidth=0.5))
    d.add(String(lx + 6, ct + 7, "Published",
                 fontName="Helvetica", fontSize=6.5, fillColor=GRAY_500))
    d.add(Circle(lx + 50, ct + 10, 2.5, fillColor=GRAY_300, strokeColor=white, strokeWidth=0.5))
    d.add(String(lx + 56, ct + 7, "Estimated",
                 fontName="Helvetica", fontSize=6.5, fillColor=GRAY_500))

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


def build_load_profile_drawing(p):
    """Create 24-hour load vs solar generation overlay chart."""
    d = Drawing(USABLE_W, 170)

    chart_left = 55
    chart_bottom = 35
    chart_width = float(USABLE_W) - 75
    chart_height = 115
    chart_right = chart_left + chart_width
    chart_top = chart_bottom + chart_height

    # Factory load profile (kW) — day-dominant pattern
    # 7am ramp up, 6pm ramp down, minimal night load
    md = p["md_kw"]
    load_profile = [
        0.15, 0.15, 0.15, 0.15, 0.15, 0.18,   # 00–05: night base load
        0.35, 0.70, 0.85, 0.90, 0.92, 0.95,    # 06–11: morning ramp
        0.88, 0.93, 0.95, 0.92, 0.88, 0.75,    # 12–17: afternoon
        0.45, 0.25, 0.18, 0.15, 0.15, 0.15,    # 18–23: evening wind-down
    ]
    load_kw = [md * f for f in load_profile]

    # Solar generation profile (kW) — bell curve, peak at noon
    peak_kw = p["size_kwp"] * 0.85  # derate factor
    solar_profile = [
        0, 0, 0, 0, 0, 0,                       # 00–05
        0.02, 0.15, 0.40, 0.65, 0.85, 0.95,     # 06–11
        1.00, 0.95, 0.85, 0.65, 0.40, 0.15,     # 12–17
        0.02, 0, 0, 0, 0, 0,                     # 18–23
    ]
    solar_kw = [peak_kw * f for f in solar_profile]

    # Scale
    max_val = max(max(load_kw), max(solar_kw)) * 1.05
    y_min = 0
    y_max = max_val

    def to_x(hour):
        return chart_left + (hour / 23) * chart_width

    def to_y(val):
        return chart_bottom + (val / y_max) * chart_height

    # Background
    d.add(Rect(chart_left, chart_bottom, chart_width, chart_height,
               fillColor=GRAY_50, strokeColor=GRAY_200, strokeWidth=0.5))

    # Fill self-consumed area (overlap between solar and load) — green
    for h in range(23):
        x0 = to_x(h)
        x1 = to_x(h + 1)
        s0 = min(solar_kw[h], load_kw[h])
        s1 = min(solar_kw[h + 1], load_kw[h + 1])
        if s0 > 0 or s1 > 0:
            # Approximate with rectangle
            avg_s = (s0 + s1) / 2
            d.add(Rect(x0, chart_bottom, x1 - x0, to_y(avg_s) - chart_bottom,
                       fillColor=Color(0.133, 0.773, 0.369, 0.15),
                       strokeColor=None))

    # Fill export area (solar > load) — amber tint
    for h in range(23):
        x0 = to_x(h)
        x1 = to_x(h + 1)
        excess0 = max(0, solar_kw[h] - load_kw[h])
        excess1 = max(0, solar_kw[h + 1] - load_kw[h + 1])
        base0 = min(solar_kw[h], load_kw[h])
        base1 = min(solar_kw[h + 1], load_kw[h + 1])
        if excess0 > 0 or excess1 > 0:
            avg_base = (base0 + base1) / 2
            avg_top = avg_base + (excess0 + excess1) / 2
            d.add(Rect(x0, to_y(avg_base), x1 - x0, to_y(avg_top) - to_y(avg_base),
                       fillColor=Color(0.961, 0.620, 0.043, 0.15),
                       strokeColor=None))

    # Load line — white/gray
    for h in range(23):
        d.add(Line(to_x(h), to_y(load_kw[h]), to_x(h + 1), to_y(load_kw[h + 1]),
                   strokeColor=GRAY_400, strokeWidth=1.5, strokeDashArray=[4, 2]))

    # Solar line — amber
    for h in range(23):
        d.add(Line(to_x(h), to_y(solar_kw[h]), to_x(h + 1), to_y(solar_kw[h + 1]),
                   strokeColor=AMBER, strokeWidth=2))

    # Y-axis labels
    for val in range(0, int(y_max) + 50, 50):
        gy = to_y(val)
        if chart_bottom <= gy <= chart_top:
            d.add(Line(chart_left, gy, chart_right, gy,
                       strokeColor=GRAY_200, strokeWidth=0.3))
            d.add(String(chart_left - 5, gy - 3, f"{val} kW",
                         fontName="Helvetica", fontSize=7, fillColor=GRAY_400,
                         textAnchor="end"))

    # X-axis labels
    for h in [0, 3, 6, 9, 12, 15, 18, 21]:
        d.add(String(to_x(h), chart_bottom - 12, f"{h:02d}:00",
                     fontName="Helvetica", fontSize=7, fillColor=GRAY_400,
                     textAnchor="middle"))

    # Title
    d.add(String(chart_left, chart_top + 10, "24-Hour Load vs Solar Generation Profile",
                 fontName="Helvetica-Bold", fontSize=9, fillColor=GRAY_700))

    # Legend
    leg_y = chart_top + 10
    leg_x = chart_right - 180
    d.add(Line(leg_x, leg_y + 3, leg_x + 15, leg_y + 3,
               strokeColor=GRAY_400, strokeWidth=1.5, strokeDashArray=[4, 2]))
    d.add(String(leg_x + 18, leg_y - 1, "Factory Load",
                 fontName="Helvetica", fontSize=7, fillColor=GRAY_500))
    d.add(Line(leg_x + 80, leg_y + 3, leg_x + 95, leg_y + 3,
               strokeColor=AMBER, strokeWidth=2))
    d.add(String(leg_x + 98, leg_y - 1, "Solar Output",
                 fontName="Helvetica", fontSize=7, fillColor=GRAY_500))

    return d


def section_load_profile(story, p):
    """Load profile vs solar generation overlay — Pro + Premium."""
    story.append(Paragraph("Load Profile Analysis", S["h2"]))
    story.append(Paragraph(
        f"Day-dominant operations ({p.get('operating_hours', '7am-6pm')}) align well with solar "
        f"generation. The {p['size_kwp']} kWp system is sized to maximise overlap between "
        "generation output and factory consumption, minimising export dependence.",
        S["body"],
    ))

    story.append(build_load_profile_drawing(p))
    story.append(Spacer(1, 8))

    # Calculate overlap stats
    peak_kw = p["size_kwp"] * 0.85
    load_factors = [
        0.15, 0.15, 0.15, 0.15, 0.15, 0.18,
        0.35, 0.70, 0.85, 0.90, 0.92, 0.95,
        0.88, 0.93, 0.95, 0.92, 0.88, 0.75,
        0.45, 0.25, 0.18, 0.15, 0.15, 0.15,
    ]
    solar_factors = [
        0, 0, 0, 0, 0, 0,
        0.02, 0.15, 0.40, 0.65, 0.85, 0.95,
        1.00, 0.95, 0.85, 0.65, 0.40, 0.15,
        0.02, 0, 0, 0, 0, 0,
    ]
    total_solar = sum(peak_kw * f for f in solar_factors)
    total_self = sum(min(peak_kw * sf, p["md_kw"] * lf)
                     for sf, lf in zip(solar_factors, load_factors))
    overlap_pct = (total_self / total_solar * 100) if total_solar > 0 else 0

    story.append(Paragraph(
        f"KEY INSIGHT: At current operating hours, approximately {overlap_pct:.0f}% of solar "
        f"output is absorbed directly by factory load (green zone). The remaining "
        f"{100 - overlap_pct:.0f}% is exported at SMP rates (amber zone). "
        f"This confirms {p['self_consumption_pct']}% self-consumption is a realistic, "
        "not optimistic, assumption.",
        S["callout_blue"],
    ))


def section_methodology(story, p, brand_name):
    """Methodology differentiation — Premium only."""
    story.append(Paragraph("Report Methodology", S["h2"]))

    story.append(Paragraph(
        "This report is produced by an independent solar acquisition intelligence engine. "
        "It is not an EPC sales proposal. The methodology is designed to protect the "
        "building owner from common industry pitfalls.",
        S["body"],
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("How this differs from a conventional EPC quote:", S["h3"]))

    diffs = [
        ["Dimension", f"{brand_name} Intelligence Dossier", "Typical EPC Quote"],
        ["Sizing logic", "75–85% of MD to minimise forfeiture",
         "Roof-max to maximise equipment sale"],
        ["Export modelling", "SMP sensitivity across full range\n(RM 0.15–0.40)",
         "Often omitted or assumed favourable"],
        ["Forfeiture risk", "Monthly forfeiture quantified\n(Hari Raya, CNY, weekends)",
         "Rarely discussed"],
        ["ATAP compliance", "Hard gate validation before sizing",
         "Assumed or deferred to application"],
        ["Financial bias", "No equipment markup — independent\nassessment",
         "Bundled with equipment pricing"],
        ["Oversizing warning", "Quantified value loss at roof-max\nvs optimised size",
         "Not disclosed — larger system\n= higher margin"],
    ]
    t = Table(diffs, colWidths=[30 * mm, (USABLE_W - 30 * mm) / 2, (USABLE_W - 30 * mm) / 2])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRAY_500),
        ("TEXTCOLOR", (0, 1), (0, -1), GRAY_500),
        ("TEXTCOLOR", (1, 1), (1, -1), GREEN_DARK),
        ("TEXTCOLOR", (2, 1), (2, -1), GRAY_500),
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_100),
        ("BACKGROUND", (1, 1), (1, -1), HexColor("#F0FDF4")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "This methodology ensures the building owner receives decision-grade intelligence "
        "before committing to any EPC contractor. The assessment fee is deductible upon "
        "project award — aligning incentives with the owner, not the installer.",
        S["callout_green"],
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


def section_smp_sensitivity(story, p, smp_stats=None):
    """SMP Export Risk Envelope — Pro + Premium.

    Upgraded from simple sensitivity table to institutional-grade analysis
    with dynamic SMP data, volatility chart, and export exposure quantification.
    """
    if smp_stats is None:
        smp_stats = get_smp_stats()

    smp_latest = smp_stats["latest"]
    smp_avg = smp_stats["avg"]
    smp_min = smp_stats["min"]
    smp_max = smp_stats["max"]
    smp_month = smp_stats.get("latest_month", "unknown")
    smp_source = smp_stats.get("source", "estimated")

    story.append(Paragraph("SMP Exposure &amp; Export Risk Envelope", S["h2"]))

    # Dynamic intro referencing actual data
    source_label = "Single Buyer published data" if smp_source == "singlebuyer" else "estimated market data"
    story.append(Paragraph(
        f"The System Marginal Price (SMP) is the wholesale electricity clearing price, "
        f"published monthly by Single Buyer Malaysia under the MESI framework. "
        f"Export credits under Solar ATAP are settled at Average SMP (7am–7pm). "
        f"Analysis below uses {source_label} — "
        f"latest: RM {smp_latest:.4f}/kWh ({smp_month}).",
        S["body"],
    ))
    story.append(Spacer(1, 6))

    # ─── SMP Summary Stats Box ───
    stats_data = [
        ["Metric", "Value"],
        ["Latest Monthly SMP", f"RM {smp_latest:.4f}/kWh ({smp_month})"],
        ["12-Month Average", f"RM {smp_avg:.4f}/kWh"],
        ["12-Month Range", f"RM {smp_min:.4f} – {smp_max:.4f}/kWh"],
        ["Volatility (max-min)", f"RM {smp_max - smp_min:.4f}/kWh"],
        ["Data Source", "www.singlebuyer.com.my"],
    ]
    t = make_table(stats_data, [45 * mm, USABLE_W - 45 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 1), (0, -1), GRAY_50),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # ─── Volatility Chart (Premium only — driven by tier in caller) ───
    if len(smp_stats.get("history", [])) >= 3:
        story.append(Paragraph("Monthly SMP Trend", S["h3"]))
        story.append(build_smp_volatility_drawing(smp_stats))
        story.append(Spacer(1, 10))

    # ─── Sensitivity Table (uses dynamic SMP as base) ───
    story.append(Paragraph("Export Revenue Sensitivity", S["h3"]))

    self_kwh = p["annual_gen_kwh"] * p["self_consumption_pct"] / 100
    export_kwh = p["annual_gen_kwh"] * (1 - p["self_consumption_pct"] / 100)
    self_savings = self_kwh * p["blended_tariff"]

    # Build sensitivity around actual SMP data points
    smp_floor = round(smp_avg, 2)
    smp_rates = [
        max(0.10, smp_floor - 0.05),
        smp_floor,
        smp_floor + 0.05,
        smp_floor + 0.10,
        min(0.40, smp_floor + 0.20),
    ]
    # Deduplicate and sort
    smp_rates = sorted(set(round(r, 2) for r in smp_rates))

    smp_data = [["SMP Rate", "Export Revenue", "Total Savings", "Payback", "vs. Base"]]
    base_savings = self_savings + export_kwh * smp_floor

    for rate in smp_rates:
        total = self_savings + export_kwh * rate
        delta = export_kwh * (rate - smp_floor)
        is_base = abs(rate - smp_floor) < 0.005
        label = f"RM {rate:.2f}" + (" (12M avg)" if is_base else "")
        delta_str = "Base" if is_base else f"{'+'if delta>=0 else ''}RM {delta:,.0f}"
        smp_data.append([
            label,
            f"RM {export_kwh * rate:,.0f}",
            f"RM {total:,.0f}",
            f"{p['capex_mid'] / total:.1f} yrs",
            delta_str,
        ])

    base_row_idx = next((i + 1 for i, r in enumerate(smp_rates) if abs(r - smp_floor) < 0.005), 2)
    t = make_table(smp_data, [30*mm, 28*mm, 28*mm, 22*mm, USABLE_W - 108*mm],
                   highlight_row=base_row_idx)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, base_row_idx), (0, base_row_idx), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (3, -1), "RIGHT"),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    # ─── Sensitivity line chart ───
    story.append(build_smp_sensitivity_drawing(p))
    story.append(Spacer(1, 10))

    # ─── Export Exposure Quantification ───
    story.append(Paragraph("Export Exposure Impact", S["h3"]))
    smp_swing = export_kwh * (smp_max - smp_min)
    pct_impact = (smp_swing / base_savings) * 100

    story.append(Paragraph(
        f"EXPORT RISK ENVELOPE: At {p['self_consumption_pct']}% self-consumption, "
        f"only {100 - p['self_consumption_pct']}% of generation ({export_kwh:,.0f} kWh) "
        f"is exposed to SMP volatility. "
        f"The 12-month observed range (RM {smp_min:.2f}–{smp_max:.2f}) "
        f"causes a maximum swing of RM {smp_swing:,.0f}/year — "
        f"just {pct_impact:.1f}% of total annual savings. "
        f"Self-consumed generation displacing TNB tariff at RM {p['blended_tariff']:.3f}/kWh "
        f"drives {p['self_consumption_pct']}% of the economics.",
        S["callout_blue"],
    ))

    # Payback impact calculation
    payback_at_min = p["capex_mid"] / (self_savings + export_kwh * smp_min)
    payback_at_max = p["capex_mid"] / (self_savings + export_kwh * smp_max)
    payback_delta = abs(payback_at_min - payback_at_max)

    story.append(Paragraph(
        f"PAYBACK RESILIENCE: Across the full 12-month SMP range, payback varies by "
        f"only {payback_delta:.1f} years ({payback_at_min:.1f}–{payback_at_max:.1f} yrs). "
        f"This confirms the investment case is robust against wholesale price fluctuation.",
        S["callout_green"] if "callout_green" in S else S["callout_blue"],
    ))

    story.append(Paragraph(
        f"NOTE: SMP data sourced from Single Buyer Malaysia "
        f"(www.singlebuyer.com.my/resources-marginal.php). "
        f"{'Values shown are estimates pending official confirmation. ' if smp_source == 'estimated' else ''}"
        f"Final proposal economics will use the published SMP figure "
        f"for the month of proposal issuance.",
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
    p = dict(PROSPECT)  # copy so we can override

    # ─── Load dynamic SMP data ───
    smp_stats = get_smp_stats(months=12)
    if smp_stats["count"] > 0:
        p["smp_floor"] = round(smp_stats["avg"], 4)
        print(f"[SMP] Using 12M average: RM {p['smp_floor']:.4f}/kWh "
              f"(range {smp_stats['min']:.4f}–{smp_stats['max']:.4f}, "
              f"latest {smp_stats['latest']:.4f} {smp_stats['latest_month']}, "
              f"source: {smp_stats['source']})")
    else:
        print("[SMP] No history data — using default floor RM 0.20/kWh")

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
        section_load_profile(story, p)
        story.append(PageBreak())
        section_financial(story, p)
        story.append(PageBreak())
        section_cashflow(story, p)
        section_smp_sensitivity(story, p, smp_stats)
        story.append(PageBreak())
        section_forfeiture(story, p)
        section_roadmap(story, p)
        section_disclaimer(story, p, brand_footer)

    elif tier == "premium":
        # Premium: full dossier with satellite imagery + load profile + methodology
        story.append(PageBreak())
        section_methodology(story, p, brand_name)
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
        section_load_profile(story, p)
        story.append(PageBreak())
        section_financial(story, p)
        story.append(PageBreak())
        section_cashflow(story, p)
        story.append(PageBreak())
        section_smp_sensitivity(story, p, smp_stats)
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

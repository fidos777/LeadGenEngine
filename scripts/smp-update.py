#!/usr/bin/env python3
"""
SMP Monthly Update Tool
=======================
Manages System Marginal Price data from Single Buyer Malaysia.

Usage:
  # Manual entry (recommended for now):
  python scripts/smp-update.py --month 2026-03 --smp 0.2210

  # View current data:
  python scripts/smp-update.py --show

  # Export as JSON (for dossier generator):
  python scripts/smp-update.py --export > smp_data.json

  # With Supabase (if configured):
  python scripts/smp-update.py --month 2026-03 --smp 0.2210 --supabase

Data Source:
  Single Buyer Malaysia publishes Monthly Average SMP
  by the 14th of each month at:
  https://www.singlebuyer.com.my/resources-marginal.php
"""

import argparse
import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

# ─── Local SMP data file (works without Supabase) ───
SCRIPT_DIR = Path(__file__).parent
SMP_FILE = SCRIPT_DIR / "smp_history.json"

# ─── Default seed data ───
DEFAULT_SMP_DATA = [
    {"month": "2025-01", "smp": 0.2080, "source": "estimated"},
    {"month": "2025-02", "smp": 0.1950, "source": "estimated"},
    {"month": "2025-03", "smp": 0.2120, "source": "estimated"},
    {"month": "2025-04", "smp": 0.2200, "source": "estimated"},
    {"month": "2025-05", "smp": 0.2310, "source": "estimated"},
    {"month": "2025-06", "smp": 0.2420, "source": "estimated"},
    {"month": "2025-07", "smp": 0.2350, "source": "estimated"},
    {"month": "2025-08", "smp": 0.2280, "source": "estimated"},
    {"month": "2025-09", "smp": 0.2190, "source": "estimated"},
    {"month": "2025-10", "smp": 0.2100, "source": "estimated"},
    {"month": "2025-11", "smp": 0.2050, "source": "estimated"},
    {"month": "2025-12", "smp": 0.2000, "source": "estimated"},
    {"month": "2026-01", "smp": 0.2140, "source": "estimated"},
    {"month": "2026-02", "smp": 0.2180, "source": "estimated"},
]


def load_smp_data() -> list[dict]:
    """Load SMP history from local JSON file."""
    if SMP_FILE.exists():
        with open(SMP_FILE) as f:
            return json.load(f)
    # First run — initialise with seed data
    save_smp_data(DEFAULT_SMP_DATA)
    return DEFAULT_SMP_DATA


def save_smp_data(data: list[dict]):
    """Save SMP history to local JSON file."""
    # Sort by month descending
    data.sort(key=lambda x: x["month"], reverse=True)
    with open(SMP_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_latest_smp(data: list[dict]) -> dict:
    """Return the most recent SMP entry."""
    sorted_data = sorted(data, key=lambda x: x["month"], reverse=True)
    return sorted_data[0] if sorted_data else {"month": "unknown", "smp": 0.20, "source": "fallback"}


def get_smp_stats(data: list[dict], months: int = 12) -> dict:
    """Calculate SMP statistics over last N months."""
    sorted_data = sorted(data, key=lambda x: x["month"], reverse=True)[:months]
    if not sorted_data:
        return {"avg": 0.20, "min": 0.15, "max": 0.25, "count": 0}

    values = [d["smp"] for d in sorted_data]
    return {
        "avg": sum(values) / len(values),
        "min": min(values),
        "max": max(values),
        "count": len(values),
        "latest": sorted_data[0]["smp"],
        "latest_month": sorted_data[0]["month"],
        "values": sorted_data,
    }


def add_smp_entry(data: list[dict], month_str: str, smp: float, source: str = "singlebuyer") -> list[dict]:
    """Add or update an SMP entry."""
    # Validate month format
    try:
        datetime.strptime(month_str, "%Y-%m")
    except ValueError:
        raise ValueError(f"Invalid month format: {month_str}. Use YYYY-MM (e.g., 2026-03)")

    if smp < 0.05 or smp > 0.80:
        raise ValueError(f"SMP {smp} out of plausible range (0.05–0.80 RM/kWh)")

    # Update or insert
    updated = False
    for entry in data:
        if entry["month"] == month_str:
            old_val = entry["smp"]
            entry["smp"] = smp
            entry["source"] = source
            entry["updated_at"] = datetime.now().isoformat()
            print(f"  Updated {month_str}: RM {old_val:.4f} → RM {smp:.4f}")
            updated = True
            break

    if not updated:
        data.append({
            "month": month_str,
            "smp": smp,
            "source": source,
            "created_at": datetime.now().isoformat(),
        })
        print(f"  Added {month_str}: RM {smp:.4f} (source: {source})")

    return data


def show_smp_table(data: list[dict]):
    """Display SMP history in a formatted table."""
    sorted_data = sorted(data, key=lambda x: x["month"], reverse=True)
    stats = get_smp_stats(data)

    print("\n╔══════════════════════════════════════════════════════╗")
    print("║     SYSTEM MARGINAL PRICE — MONTHLY HISTORY         ║")
    print("║     Source: Single Buyer Malaysia (MESI)             ║")
    print("╠══════════╦══════════╦═══════════╦═══════════════════╣")
    print("║  Month   ║ SMP/kWh  ║ vs. Avg   ║ Source            ║")
    print("╠══════════╬══════════╬═══════════╬═══════════════════╣")

    avg = stats["avg"]
    for entry in sorted_data:
        month = entry["month"]
        smp = entry["smp"]
        source = entry.get("source", "unknown")[:17]
        delta = smp - avg
        delta_str = f"{'+'if delta>=0 else ''}{delta:.4f}"

        # Highlight if latest
        marker = " ◀" if entry == sorted_data[0] else ""
        print(f"║ {month}  ║ RM{smp:.4f} ║ {delta_str:>9} ║ {source:<17} ║{marker}")

    print("╠══════════╩══════════╩═══════════╩═══════════════════╣")
    print(f"║  12M Avg: RM {stats['avg']:.4f}  │  Min: RM {stats['min']:.4f}  │  Max: RM {stats['max']:.4f}  ║")
    print(f"║  Range: RM {stats['max']-stats['min']:.4f}   │  Entries: {stats['count']:>2}       │  Latest: {stats['latest_month']} ║")
    print("╚═══════════════════════════════════════════════════════╝\n")


def push_to_supabase(month_str: str, smp: float):
    """Push SMP entry to Supabase (requires env vars)."""
    try:
        from supabase import create_client
    except ImportError:
        print("  [WARN] supabase-py not installed. Run: pip install supabase")
        return False

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key:
        print("  [WARN] Supabase env vars not set. Skipping DB push.")
        return False

    client = create_client(url, key)
    month_date = f"{month_str}-01"

    result = client.table("smp_monthly").upsert({
        "month": month_date,
        "average_smp": smp,
        "source_url": "https://www.singlebuyer.com.my/resources-marginal.php",
        "notes": f"Manual entry via smp-update.py",
    }, on_conflict="month").execute()

    print(f"  [DB] Supabase upsert: {month_date} = RM {smp:.4f}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="SMP Monthly Update Tool — manages System Marginal Price history",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --show                          Show SMP history table
  %(prog)s --month 2026-03 --smp 0.2210    Add March 2026 SMP
  %(prog)s --export                         Export as JSON for dossier
  %(prog)s --stats                          Show 12-month statistics
        """
    )
    parser.add_argument("--month", type=str, help="Month to update (YYYY-MM)")
    parser.add_argument("--smp", type=float, help="Average SMP value in RM/kWh")
    parser.add_argument("--show", action="store_true", help="Display SMP history table")
    parser.add_argument("--export", action="store_true", help="Export data as JSON")
    parser.add_argument("--stats", action="store_true", help="Show statistics summary")
    parser.add_argument("--supabase", action="store_true", help="Also push to Supabase")

    args = parser.parse_args()

    # Default action: show table
    if not any([args.month, args.show, args.export, args.stats]):
        args.show = True

    data = load_smp_data()

    # Add/update entry
    if args.month and args.smp:
        data = add_smp_entry(data, args.month, args.smp)
        save_smp_data(data)

        if args.supabase:
            push_to_supabase(args.month, args.smp)

    elif args.month and not args.smp:
        print("Error: --smp is required when updating a month")
        sys.exit(1)

    # Display
    if args.show:
        show_smp_table(data)

    if args.stats:
        stats = get_smp_stats(data)
        print(f"\n12-Month SMP Statistics:")
        print(f"  Average:  RM {stats['avg']:.4f}/kWh")
        print(f"  Min:      RM {stats['min']:.4f}/kWh")
        print(f"  Max:      RM {stats['max']:.4f}/kWh")
        print(f"  Range:    RM {stats['max']-stats['min']:.4f}/kWh")
        print(f"  Latest:   RM {stats['latest']:.4f}/kWh ({stats['latest_month']})")
        print(f"  Entries:  {stats['count']}")

    if args.export:
        print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()

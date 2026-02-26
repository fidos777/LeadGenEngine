#!/usr/bin/env python3
"""
Import companies from CSV to Supabase via create_lead_with_activity RPC.
Merges all_companies_raw.csv with company_contacts_enriched.csv by company_name.
"""

import csv
import os
from supabase import create_client, Client

# Configuration
RAW_CSV = '/Users/firdausismail/leadgenengine/all_companies_raw.csv'
ENRICHED_CSV = '/Users/firdausismail/leadgenengine/company_contacts_enriched.csv'

def get_supabase_client() -> Client:
    """Create Supabase client from environment variables."""
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if not url or not key:
        raise ValueError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    return create_client(url, key)

def load_enriched_data() -> dict:
    """Load enriched contact data keyed by company_name."""
    enriched = {}
    with open(ENRICHED_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            enriched[row['company_name']] = row
    return enriched

def load_raw_companies() -> list:
    """Load raw company data."""
    companies = []
    with open(RAW_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            companies.append(row)
    return companies

def import_companies():
    """Import all companies to Supabase."""
    supabase = get_supabase_client()

    # Load data
    raw_companies = load_raw_companies()
    enriched_data = load_enriched_data()

    print(f"Loaded {len(raw_companies)} companies from raw CSV")
    print(f"Loaded {len(enriched_data)} enrichment records")
    print("=" * 50)

    # Stats
    created = 0
    skipped = 0
    errors = 0
    high_confidence = 0
    with_contact = 0

    for i, company in enumerate(raw_companies, 1):
        company_name = company['company_name']
        enriched = enriched_data.get(company_name, {})

        # Determine if high-confidence contact found
        confidence = enriched.get('confidence', 'low')
        director_name = enriched.get('director_name', '').strip()
        director_role = enriched.get('director_role', '').strip()
        direct_phone = enriched.get('direct_phone', '').strip()
        email = enriched.get('email', '').strip()

        is_high_confidence = confidence == 'high' and director_name

        # Build notes
        notes = None
        if is_high_confidence:
            notes = f"operational_contact_found: {director_name} ({director_role})"
            high_confidence += 1

        try:
            # 1. Create company
            company_data = {
                'name': company_name,
                'sector': company.get('category_name') or 'Manufacturer',
                'zone': company.get('zone') or company.get('state'),
            }

            result = supabase.table('companies').insert(company_data).execute()
            company_id = result.data[0]['id']

            # 2. Create contact if we have director info
            # 2. Create contact - always create one with company phone if available
            contact_id = None
            company_phone = company.get('phone', '').strip()

            if director_name or company_phone:
                contact_data = {
                    'company_id': company_id,
                    'full_name': director_name if director_name else 'Main Line',
                    'role': director_role or None,
                    'phone': direct_phone or company_phone or None,
                    'email': email or None,
                    'source': 'website_extraction' if director_name else 'google_maps',
                }
                contact_result = supabase.table('contacts').insert(contact_data).execute()
                contact_id = contact_result.data[0]['id']
                with_contact += 1

            # 3. Create lead directly (simpler than RPC for batch import)
            lead_data = {
                'company_id': company_id,
                'contact_id': contact_id,
                'opportunity_type': 'solar',
                'status': 'identified',
                'notes': notes,
            }
            lead_result = supabase.table('leads').insert(lead_data).execute()
            lead_id = lead_result.data[0]['id']

            # 4. Create activity for audit trail
            activity_data = {
                'lead_id': lead_id,
                'action': 'lead_created',
                'metadata': {'source': 'csv_import', 'batch': True},
            }
            supabase.table('activities').insert(activity_data).execute()

            created += 1

            if i % 20 == 0:
                print(f"Progress: {i}/{len(raw_companies)}")

        except Exception as e:
            errors += 1
            print(f"Error importing {company_name}: {e}")

    print("\n" + "=" * 50)
    print("IMPORT SUMMARY")
    print("=" * 50)
    print(f"Total companies:        {len(raw_companies)}")
    print(f"Successfully created:   {created}")
    print(f"With contacts:          {with_contact}")
    print(f"High-confidence:        {high_confidence}")
    print(f"Errors:                 {errors}")
    print(f"Skipped:                {skipped}")

if __name__ == '__main__':
    import_companies()

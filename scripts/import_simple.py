#!/usr/bin/env python3
"""
Simple direct import - inserts companies and leads without RPC.
Uses minimal columns that definitely exist.
"""

import csv
import os
from supabase import create_client, Client

RAW_CSV = '/Users/firdausismail/leadgenengine/all_companies_raw.csv'
ENRICHED_CSV = '/Users/firdausismail/leadgenengine/company_contacts_enriched.csv'

def get_supabase_client() -> Client:
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not url or not key:
        raise ValueError("Missing Supabase credentials")
    return create_client(url, key)

def load_enriched_data() -> dict:
    enriched = {}
    with open(ENRICHED_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            enriched[row['company_name']] = row
    return enriched

def load_raw_companies() -> list:
    companies = []
    with open(RAW_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            companies.append(row)
    return companies

def import_companies():
    supabase = get_supabase_client()

    raw_companies = load_raw_companies()
    enriched_data = load_enriched_data()

    print(f"Loaded {len(raw_companies)} companies")
    print("=" * 50)

    created = 0
    with_contact = 0
    high_conf = 0
    errors = 0

    for i, company in enumerate(raw_companies, 1):
        company_name = company['company_name']
        enriched = enriched_data.get(company_name, {})

        # Get enrichment data
        confidence = enriched.get('confidence', 'low')
        director_name = enriched.get('director_name', '').strip()
        director_role = enriched.get('director_role', '').strip()
        direct_phone = enriched.get('direct_phone', '').strip()
        email = enriched.get('email', '').strip()
        company_phone = company.get('phone', '').strip()

        is_high = confidence == 'high' and director_name
        if is_high:
            high_conf += 1

        notes = None
        if is_high:
            notes = f"operational_contact_found: {director_name} ({director_role})"

        try:
            # 1. Insert company
            company_result = supabase.table('companies').insert({
                'name': company_name,
                'sector': company.get('category_name') or 'Manufacturer',
                'zone': company.get('zone') or company.get('state'),
            }).execute()

            company_id = company_result.data[0]['id']

            # 2. Insert contact if we have phone or director
            contact_id = None
            if director_name or company_phone:
                contact_result = supabase.table('contacts').insert({
                    'company_id': company_id,
                    'full_name': director_name if director_name else 'Main Line',
                    'role': director_role or None,
                    'phone': direct_phone or company_phone or None,
                    'email': email or None,
                    'source': 'website_extraction' if director_name else 'google_maps',
                }).execute()
                contact_id = contact_result.data[0]['id']
                with_contact += 1

            # 3. Insert lead (minimal columns)
            lead_result = supabase.table('leads').insert({
                'company_id': company_id,
                'contact_id': contact_id,
                'status': 'identified',
                'notes': notes,
            }).execute()

            created += 1

            if i % 20 == 0:
                print(f"Progress: {i}/{len(raw_companies)}")

        except Exception as e:
            errors += 1
            if errors <= 5:  # Only print first 5 errors
                print(f"Error: {company_name}: {e}")

    print("\n" + "=" * 50)
    print("IMPORT SUMMARY")
    print("=" * 50)
    print(f"Total companies:        {len(raw_companies)}")
    print(f"Successfully created:   {created}")
    print(f"With contacts:          {with_contact}")
    print(f"High-confidence:        {high_conf}")
    print(f"Errors:                 {errors}")

if __name__ == '__main__':
    import_companies()

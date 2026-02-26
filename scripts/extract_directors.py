#!/usr/bin/env python3
"""
Extract director/owner information from company websites.
Uses requests/BeautifulSoup for crawling and Claude API for extraction.
"""

import csv
import os
import re
import time
import json
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
import anthropic

# Configuration
INPUT_CSV = '/Users/firdausismail/leadgenengine/all_companies_raw.csv'
OUTPUT_CSV = '/Users/firdausismail/leadgenengine/company_contacts_enriched.csv'
MAX_PAGES_PER_SITE = 3
REQUEST_TIMEOUT = 15
DELAY_BETWEEN_REQUESTS = 1  # seconds

# Target pages to look for
TARGET_PAGES = [
    '/about', '/about-us', '/about_us', '/aboutus',
    '/contact', '/contact-us', '/contact_us', '/contactus',
    '/team', '/our-team', '/leadership', '/management',
    '/directors', '/board', '/board-of-directors',
    '/company', '/who-we-are', '/corporate'
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}


def get_page_content(url, timeout=REQUEST_TIMEOUT):
    """Fetch page content and extract text."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script and style elements
        for script in soup(['script', 'style', 'nav', 'footer', 'header']):
            script.decompose()

        # Get text
        text = soup.get_text(separator=' ', strip=True)

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)

        return text[:15000]  # Limit to 15k chars to avoid token limits
    except Exception as e:
        return None


def find_relevant_pages(base_url):
    """Find relevant pages (about, contact, team) on a website."""
    relevant_urls = [base_url]  # Always include homepage

    try:
        response = requests.get(base_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all links
        for link in soup.find_all('a', href=True):
            href = link.get('href', '').lower()
            full_url = urljoin(base_url, link['href'])

            # Check if link matches target pages
            for target in TARGET_PAGES:
                if target in href:
                    parsed = urlparse(full_url)
                    if parsed.netloc == urlparse(base_url).netloc:
                        if full_url not in relevant_urls:
                            relevant_urls.append(full_url)
                            if len(relevant_urls) >= MAX_PAGES_PER_SITE:
                                return relevant_urls
                    break
    except Exception:
        pass

    return relevant_urls[:MAX_PAGES_PER_SITE]


def extract_director_info(company_name, website_content, client):
    """Use Claude to extract director/owner information."""
    prompt = f"""Analyze this website content from {company_name} and extract information about key contacts.

Website content:
{website_content}

IMPORTANT: Prioritize OPERATIONAL contacts over executive/corporate contacts:
1. PREFERRED (in order of priority):
   - Plant Manager / Factory Manager
   - Facilities Manager
   - Operations Manager / Operations Director
   - Production Manager
   - Site Manager
   - General Manager (if site-specific)

2. ACCEPTABLE (only if no operational contacts found):
   - Managing Director (if company is single-site)
   - Director of Operations

3. AVOID extracting (group-level contacts, less useful for B2B outreach):
   - Founder / Co-Founder
   - Chairman / Group Chairman
   - Group CEO / Group Managing Director
   - Board members without operational roles

Extract the following if found:
1. Name of the most relevant operational contact
2. Their role/title
3. Direct phone number (if different from main company number)
4. Email address

Respond in JSON format:
{{
    "director_name": "name or null",
    "director_role": "role or null",
    "direct_phone": "phone or null",
    "email": "email or null",
    "confidence": "high/medium/low",
    "contact_type": "operational/executive/group",
    "reasoning": "brief explanation"
}}

Confidence levels:
- "high": Both name and role clearly found, operational contact
- "medium": Name and role found, but executive-level contact
- "low": Information uncertain or only group-level contact found

If no operational or site-level contact found, return the most senior person available but mark contact_type as "group" or "executive"."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text

        # Parse JSON from response
        json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return None
    except Exception as e:
        print(f"  Error calling Claude API: {e}")
        return None


def process_companies(limit=None):
    """Process companies from CSV and extract director information."""
    client = anthropic.Anthropic()

    results = []
    processed = 0

    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        companies = list(reader)

    total = len(companies) if limit is None else min(limit, len(companies))
    print(f"Processing {total} companies with websites...")

    for company in companies[:total]:
        company_name = company['company_name']
        website = company['website']

        if not website:
            continue

        processed += 1
        print(f"\n[{processed}/{total}] {company_name}")
        print(f"  Website: {website}")

        # Normalize website URL
        if not website.startswith('http'):
            website = 'https://' + website

        # Find relevant pages
        pages = find_relevant_pages(website)
        print(f"  Found {len(pages)} relevant pages")

        # Collect content from all pages
        all_content = []
        for page_url in pages:
            content = get_page_content(page_url)
            if content:
                all_content.append(f"--- Page: {page_url} ---\n{content}")
            time.sleep(DELAY_BETWEEN_REQUESTS)

        if not all_content:
            print("  No content extracted")
            results.append({
                'company_name': company_name,
                'website': company['website'],
                'director_name': '',
                'director_role': '',
                'direct_phone': '',
                'email': '',
                'confidence': 'low',
                'contact_type': '',
                'notes': 'Failed to fetch website content'
            })
            continue

        combined_content = '\n\n'.join(all_content)[:30000]  # Limit total content

        # Extract director info using Claude
        print("  Extracting director info...")
        extracted = extract_director_info(company_name, combined_content, client)

        if extracted:
            results.append({
                'company_name': company_name,
                'website': company['website'],
                'director_name': extracted.get('director_name') or '',
                'director_role': extracted.get('director_role') or '',
                'direct_phone': extracted.get('direct_phone') or '',
                'email': extracted.get('email') or '',
                'confidence': extracted.get('confidence', 'low'),
                'contact_type': extracted.get('contact_type', 'unknown'),
                'notes': extracted.get('reasoning', '')
            })
            contact_type = extracted.get('contact_type', '')
            print(f"  Found: {extracted.get('director_name', 'None')} ({extracted.get('confidence', 'low')}, {contact_type})")
        else:
            results.append({
                'company_name': company_name,
                'website': company['website'],
                'director_name': '',
                'director_role': '',
                'direct_phone': '',
                'email': '',
                'confidence': 'low',
                'contact_type': '',
                'notes': 'Claude API extraction failed'
            })

    # Detect conglomerate companies (same director appears 3+ times)
    # These companies need LinkedIn enrichment for plant-level contacts
    from collections import Counter
    director_counts = Counter(
        r['director_name'].strip().lower()
        for r in results
        if r['director_name'].strip()
    )

    # Directors appearing in 3+ companies are group-level contacts
    group_level_directors = {
        name for name, count in director_counts.items()
        if count >= 3
    }

    # Add group_level flag to results
    for result in results:
        director_name = result['director_name'].strip().lower()
        if director_name and director_name in group_level_directors:
            result['group_level'] = 'true'
            if 'group_level_contact_only' not in result['notes']:
                result['notes'] = f"group_level_contact_only=true; {result['notes']}".strip('; ')
        else:
            result['group_level'] = 'false'

    # Report group-level detections
    if group_level_directors:
        print(f"\n{'='*50}")
        print("CONGLOMERATE DETECTION:")
        for director_name in group_level_directors:
            count = director_counts[director_name]
            # Find original casing
            original_name = next(
                r['director_name'] for r in results
                if r['director_name'].strip().lower() == director_name
            )
            print(f"  - {original_name}: appears in {count} companies (flagged as group-level)")
        print("  These companies need LinkedIn enrichment for plant-level contacts.")
        print(f"{'='*50}")

    # Save results
    fieldnames = ['company_name', 'website', 'director_name', 'director_role', 'direct_phone', 'email', 'confidence', 'contact_type', 'group_level', 'notes']
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\n\nResults saved to: {OUTPUT_CSV}")
    print(f"Total processed: {len(results)}")
    high_conf = sum(1 for r in results if r['confidence'] == 'high')
    med_conf = sum(1 for r in results if r['confidence'] == 'medium')
    group_level_count = sum(1 for r in results if r['group_level'] == 'true')
    print(f"High confidence: {high_conf}")
    print(f"Medium confidence: {med_conf}")
    print(f"Group-level only (need LinkedIn): {group_level_count}")

    return results


if __name__ == '__main__':
    import sys

    # Optional: pass limit as argument
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None

    print("Director/Owner Extraction Script")
    print("=" * 50)

    process_companies(limit=limit)

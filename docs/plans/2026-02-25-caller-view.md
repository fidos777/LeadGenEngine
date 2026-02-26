# Caller View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first caller queue page at `/caller` for non-technical callers to log call outcomes.

**Architecture:** Standalone route outside dashboard with minimal layout. Fetches leads from existing API, displays as cards with 3 action buttons. Actions POST to existing `/api/v1/leads/[id]/execute` endpoint.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4

---

## Task 1: Create Caller Layout

**Files:**
- Create: `app/caller/layout.tsx`

**Step 1: Create the layout file**

```tsx
// app/caller/layout.tsx
export default function CallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-semibold">Call Queue</h1>
      </header>
      <main className="pb-20">{children}</main>
    </div>
  );
}
```

**Step 2: Verify file created**

Run: `ls app/caller/layout.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add app/caller/layout.tsx
git commit -m "feat(caller): add minimal layout for caller view"
```

---

## Task 2: Create Caller Types

**Files:**
- Create: `types/caller.ts`

**Step 1: Define types**

```tsx
// types/caller.ts
export interface CallerLead {
  id: string;
  status: string;
  company: {
    id: string;
    name: string;
    zone: string | null;
    sector: string | null;
  } | null;
  contact: {
    phone: string | null;
  } | null;
  company_phone?: string;
}

export type CallerAction = "call_attempted" | "contact_identified" | "not_interested";

export interface ContactFormData {
  name: string;
  role: string;
}

export const ZONE_PRIORITY: Record<string, number> = {
  "Klang": 1,
  "Shah Alam": 2,
  "Rawang": 3,
  "Semenyih": 4,
};

export const ZONE_OPTIONS = ["All", "Klang", "Shah Alam", "Rawang", "Semenyih", "Other"] as const;
```

**Step 2: Commit**

```bash
git add types/caller.ts
git commit -m "feat(caller): add caller types and constants"
```

---

## Task 3: Create Sorting Utility

**Files:**
- Create: `lib/caller/sort.ts`
- Create: `__tests__/lib/caller/sort.test.ts`

**Step 1: Write the failing test**

```tsx
// __tests__/lib/caller/sort.test.ts
import { sortLeadsForCaller } from "@/lib/caller/sort";
import type { CallerLead } from "@/types/caller";

describe("sortLeadsForCaller", () => {
  const makeLead = (
    id: string,
    zone: string | null,
    hasPhone: boolean
  ): CallerLead => ({
    id,
    status: "identified",
    company: { id: `c-${id}`, name: `Company ${id}`, zone, sector: null },
    contact: hasPhone ? { phone: "+60123456789" } : null,
  });

  it("puts leads with phone first", () => {
    const leads = [
      makeLead("1", "Klang", false),
      makeLead("2", "Klang", true),
    ];
    const sorted = sortLeadsForCaller(leads);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("sorts by zone priority within phone groups", () => {
    const leads = [
      makeLead("1", "Semenyih", true),
      makeLead("2", "Klang", true),
      makeLead("3", "Shah Alam", true),
    ];
    const sorted = sortLeadsForCaller(leads);
    expect(sorted.map((l) => l.id)).toEqual(["2", "3", "1"]);
  });

  it("puts unknown zones after known zones", () => {
    const leads = [
      makeLead("1", "Johor", true),
      makeLead("2", "Rawang", true),
    ];
    const sorted = sortLeadsForCaller(leads);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/caller/sort.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create the directory and implement**

```tsx
// lib/caller/sort.ts
import type { CallerLead } from "@/types/caller";
import { ZONE_PRIORITY } from "@/types/caller";

export function sortLeadsForCaller(leads: CallerLead[]): CallerLead[] {
  return [...leads].sort((a, b) => {
    // Phone priority: leads with phone come first
    const aHasPhone = Boolean(a.contact?.phone || a.company_phone);
    const bHasPhone = Boolean(b.contact?.phone || b.company_phone);

    if (aHasPhone && !bHasPhone) return -1;
    if (!aHasPhone && bHasPhone) return 1;

    // Zone priority
    const aZone = a.company?.zone || "";
    const bZone = b.company?.zone || "";
    const aPriority = ZONE_PRIORITY[aZone] ?? 999;
    const bPriority = ZONE_PRIORITY[bZone] ?? 999;

    if (aPriority !== bPriority) return aPriority - bPriority;

    // Alphabetical fallback for unknown zones
    return aZone.localeCompare(bZone);
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/caller/sort.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/caller/sort.ts __tests__/lib/caller/sort.test.ts
git commit -m "feat(caller): add lead sorting utility with tests"
```

---

## Task 4: Create ZoneFilter Component

**Files:**
- Create: `components/caller/ZoneFilter.tsx`

**Step 1: Create component**

```tsx
// components/caller/ZoneFilter.tsx
"use client";

import { ZONE_OPTIONS } from "@/types/caller";

interface ZoneFilterProps {
  value: string;
  onChange: (zone: string) => void;
}

export function ZoneFilter({ value, onChange }: ZoneFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-base appearance-none cursor-pointer"
    >
      {ZONE_OPTIONS.map((zone) => (
        <option key={zone} value={zone}>
          {zone === "All" ? "All Zones" : zone}
        </option>
      ))}
    </select>
  );
}
```

**Step 2: Commit**

```bash
git add components/caller/ZoneFilter.tsx
git commit -m "feat(caller): add ZoneFilter dropdown component"
```

---

## Task 5: Create ContactModal Component

**Files:**
- Create: `components/caller/ContactModal.tsx`

**Step 1: Create component**

```tsx
// components/caller/ContactModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ContactFormData } from "@/types/caller";

interface ContactModalProps {
  companyName: string;
  onSubmit: (data: ContactFormData) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function ContactModal({
  companyName,
  onSubmit,
  onClose,
  isLoading,
}: ContactModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), role: role.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-1">Contact Found</h2>
        <p className="text-sm text-gray-400 mb-4">{companyName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ahmad Razak"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Factory Manager"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "Saving..." : "Save Contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/caller/ContactModal.tsx
git commit -m "feat(caller): add ContactModal for contact capture"
```

---

## Task 6: Create CompanyCard Component

**Files:**
- Create: `components/caller/CompanyCard.tsx`

**Step 1: Create component**

```tsx
// components/caller/CompanyCard.tsx
"use client";

import { useState } from "react";
import type { CallerLead, CallerAction, ContactFormData } from "@/types/caller";
import { ContactModal } from "./ContactModal";

interface CompanyCardProps {
  lead: CallerLead;
  onAction: (leadId: string, action: CallerAction, data?: ContactFormData) => Promise<void>;
  isActioned: boolean;
}

export function CompanyCard({ lead, onAction, isActioned }: CompanyCardProps) {
  const [loading, setLoading] = useState<CallerAction | null>(null);
  const [showModal, setShowModal] = useState(false);

  const phone = lead.contact?.phone || lead.company_phone;
  const companyName = lead.company?.name || "Unknown Company";
  const zone = lead.company?.zone || "Unknown";
  const sector = lead.company?.sector || "Manufacturer";

  const handleAction = async (action: CallerAction, data?: ContactFormData) => {
    setLoading(action);
    try {
      await onAction(lead.id, action, data);
      setShowModal(false);
    } finally {
      setLoading(null);
    }
  };

  if (isActioned) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 opacity-50">
        <div className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          <span className="text-gray-400">{companyName}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        {/* Company Info */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg leading-tight">{companyName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full text-gray-400">
              {zone}
            </span>
            <span className="text-xs text-gray-500">{sector}</span>
          </div>
        </div>

        {/* Phone */}
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="block text-blue-400 text-lg font-mono mb-4 active:text-blue-300"
          >
            {phone}
          </a>
        ) : (
          <p className="text-gray-500 text-sm mb-4">No phone number</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("call_attempted")}
            disabled={loading !== null}
            className="flex-1 py-3 px-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === "call_attempted" ? "..." : "📞 Called"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={loading !== null}
            className="flex-1 py-3 px-2 bg-green-900/50 hover:bg-green-900/70 active:bg-green-900 text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === "contact_identified" ? "..." : "✅ Contact"}
          </button>
          <button
            onClick={() => handleAction("not_interested")}
            disabled={loading !== null}
            className="flex-1 py-3 px-2 bg-red-900/30 hover:bg-red-900/50 active:bg-red-900/70 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === "not_interested" ? "..." : "❌ Not Int."}
          </button>
        </div>
      </div>

      {showModal && (
        <ContactModal
          companyName={companyName}
          onSubmit={(data) => handleAction("contact_identified", data)}
          onClose={() => setShowModal(false)}
          isLoading={loading === "contact_identified"}
        />
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add components/caller/CompanyCard.tsx
git commit -m "feat(caller): add CompanyCard with action buttons"
```

---

## Task 7: Create API Hook

**Files:**
- Create: `hooks/useCallerLeads.ts`

**Step 1: Create hook**

```tsx
// hooks/useCallerLeads.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { CallerLead, CallerAction, ContactFormData } from "@/types/caller";
import { sortLeadsForCaller } from "@/lib/caller/sort";

export function useCallerLeads() {
  const [leads, setLeads] = useState<CallerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/leads?status=identified");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();

      // Transform API response to CallerLead format
      const callerLeads: CallerLead[] = data.map((lead: Record<string, unknown>) => ({
        id: lead.id,
        status: lead.status,
        company: lead.companies || null,
        contact: null, // API doesn't include contacts yet
        company_phone: null,
      }));

      setLeads(sortLeadsForCaller(callerLeads));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const logAction = async (
    leadId: string,
    action: CallerAction,
    contactData?: ContactFormData
  ) => {
    const payload: Record<string, unknown> = {
      activity: { outcome: action },
    };

    if (action === "contact_identified" && contactData) {
      payload.activity = {
        outcome: action,
        intel_gathered: `Name: ${contactData.name}, Role: ${contactData.role || "N/A"}`,
      };
    }

    if (action === "not_interested") {
      payload.new_status = "outreached";
    }

    const res = await fetch(`/api/v1/leads/${leadId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to log action");
    }

    // Mark as actioned locally
    setActionedIds((prev) => new Set([...prev, leadId]));
  };

  return {
    leads,
    loading,
    error,
    actionedIds,
    logAction,
    refresh: fetchLeads,
  };
}
```

**Step 2: Commit**

```bash
git add hooks/useCallerLeads.ts
git commit -m "feat(caller): add useCallerLeads hook for data fetching"
```

---

## Task 8: Create Caller Page

**Files:**
- Create: `app/caller/page.tsx`

**Step 1: Create page**

```tsx
// app/caller/page.tsx
"use client";

import { useState } from "react";
import { useCallerLeads } from "@/hooks/useCallerLeads";
import { CompanyCard } from "@/components/caller/CompanyCard";
import { ZoneFilter } from "@/components/caller/ZoneFilter";
import { ZONE_PRIORITY } from "@/types/caller";

export default function CallerPage() {
  const { leads, loading, error, actionedIds, logAction, refresh } = useCallerLeads();
  const [zoneFilter, setZoneFilter] = useState("All");

  const filteredLeads = leads.filter((lead) => {
    if (zoneFilter === "All") return true;
    const zone = lead.company?.zone || "";
    if (zoneFilter === "Other") {
      return !ZONE_PRIORITY[zone];
    }
    return zone === zoneFilter;
  });

  // Sort so actioned leads go to bottom
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const aActioned = actionedIds.has(a.id);
    const bActioned = actionedIds.has(b.id);
    if (aActioned && !bActioned) return 1;
    if (!aActioned && bActioned) return -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse"
          >
            <div className="h-5 bg-gray-800 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-800 rounded w-1/2 mb-4" />
            <div className="h-10 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filter */}
      <div className="mb-4">
        <ZoneFilter value={zoneFilter} onChange={setZoneFilter} />
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
        <span>
          {filteredLeads.length - actionedIds.size} to call
        </span>
        <span>{actionedIds.size} completed</span>
      </div>

      {/* Lead List */}
      {sortedLeads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No leads to call</p>
          <p className="text-sm">Check back later or adjust filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLeads.map((lead) => (
            <CompanyCard
              key={lead.id}
              lead={lead}
              onAction={logAction}
              isActioned={actionedIds.has(lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run dev server to test**

Run: `npm run dev`
Navigate to: `http://localhost:3000/caller`
Expected: Page renders with loading state, then shows leads or empty state

**Step 3: Commit**

```bash
git add app/caller/page.tsx
git commit -m "feat(caller): add main caller page with filtering"
```

---

## Task 9: Add Phone to Leads API Response

**Files:**
- Modify: `app/api/v1/leads/route.ts`

**Step 1: Update API to include contacts**

Add contact phone to the leads response. Find the section that builds the response and add:

```tsx
// After fetching companies, also fetch contacts
const contactIds = [...new Set((data || []).map((l) => l.contact_id).filter(Boolean))];

const { data: contacts } = await supabase
  .from("contacts")
  .select("id, phone")
  .in("id", contactIds.length > 0 ? contactIds : ["00000000-0000-0000-0000-000000000000"]);

const contactMap = new Map((contacts || []).map((c) => [c.id, c]));

// In the scored mapping, add:
const scored = (data || []).map((lead) => {
  const company = companyMap.get(lead.company_id) || null;
  const contact = contactMap.get(lead.contact_id) || null;
  // ... rest of scoring logic
  return {
    ...lead,
    companies: company,
    contacts: contact,
    score,
  };
});
```

**Step 2: Commit**

```bash
git add app/api/v1/leads/route.ts
git commit -m "feat(api): include contact phone in leads response"
```

---

## Task 10: Final Integration Test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual test checklist**

- [ ] Navigate to `/caller`
- [ ] Page loads with leads or empty state
- [ ] Zone filter changes visible leads
- [ ] "Called" button logs action and fades card
- [ ] "Contact" button opens modal
- [ ] Modal submit saves contact and closes
- [ ] "Not Int." button logs action
- [ ] Actioned cards move to bottom

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(caller): complete caller view implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Caller layout | `app/caller/layout.tsx` |
| 2 | Types | `types/caller.ts` |
| 3 | Sorting utility | `lib/caller/sort.ts` |
| 4 | ZoneFilter | `components/caller/ZoneFilter.tsx` |
| 5 | ContactModal | `components/caller/ContactModal.tsx` |
| 6 | CompanyCard | `components/caller/CompanyCard.tsx` |
| 7 | useCallerLeads hook | `hooks/useCallerLeads.ts` |
| 8 | Caller page | `app/caller/page.tsx` |
| 9 | API update | `app/api/v1/leads/route.ts` |
| 10 | Integration test | Manual verification |

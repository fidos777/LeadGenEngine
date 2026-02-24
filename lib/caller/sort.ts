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

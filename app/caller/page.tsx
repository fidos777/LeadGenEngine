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
          {filteredLeads.length - [...actionedIds].filter(id => filteredLeads.some(l => l.id === id)).length} to call
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

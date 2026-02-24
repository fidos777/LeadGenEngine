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

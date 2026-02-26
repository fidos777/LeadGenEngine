"use client";

import type { LeadCompanyProfile } from "@/types/lead-detail";

interface CompanyProfileProps {
  company: LeadCompanyProfile | null;
}

export function CompanyProfile({ company }: CompanyProfileProps) {
  if (!company) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Company</h3>
        <p className="text-neutral-500 text-sm">No company data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <h3 className="text-sm font-medium text-neutral-400 mb-3">Company</h3>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs text-neutral-500">Name</dt>
          <dd className="text-sm text-white">{company.name}</dd>
        </div>
        {company.sector && (
          <div>
            <dt className="text-xs text-neutral-500">Sector</dt>
            <dd className="text-sm text-white">{company.sector}</dd>
          </div>
        )}
        {company.zone && (
          <div>
            <dt className="text-xs text-neutral-500">Zone</dt>
            <dd className="text-sm text-white">{company.zone}</dd>
          </div>
        )}
        {company.registration_no && (
          <div>
            <dt className="text-xs text-neutral-500">Registration No</dt>
            <dd className="text-sm text-white font-mono">
              {company.registration_no}
            </dd>
          </div>
        )}
        {company.tnb_band && (
          <div>
            <dt className="text-xs text-neutral-500">TNB Band</dt>
            <dd className="text-sm text-white">{company.tnb_band}</dd>
          </div>
        )}
        {company.bursa_listed !== null && (
          <div>
            <dt className="text-xs text-neutral-500">Bursa Listed</dt>
            <dd className="text-sm text-white">
              {company.bursa_listed ? "Yes" : "No"}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

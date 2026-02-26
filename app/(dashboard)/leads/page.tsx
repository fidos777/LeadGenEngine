"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: string;
  status: string;
  opportunity_type: string;
  companies: {
    name: string;
    zone: string;
  };
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Leads</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Leads</h1>

      {leads.length === 0 ? (
        <p className="text-gray-400">No leads yet. Run discovery first.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Zone</th>
              <th className="text-left p-3">Opportunity</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-800">
                <td className="p-3">{lead.companies?.name ?? "-"}</td>
                <td className="p-3">{lead.companies?.zone ?? "-"}</td>
                <td className="p-3">{lead.opportunity_type}</td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-gray-800 rounded text-sm">
                    {lead.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

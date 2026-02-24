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
            {loading === "call_attempted" ? "..." : "Called"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={loading !== null}
            className="flex-1 py-3 px-2 bg-green-900/50 hover:bg-green-900/70 active:bg-green-900 text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === "contact_identified" ? "..." : "Contact"}
          </button>
          <button
            onClick={() => handleAction("not_interested")}
            disabled={loading !== null}
            className="flex-1 py-3 px-2 bg-red-900/30 hover:bg-red-900/50 active:bg-red-900/70 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === "not_interested" ? "..." : "Not Int."}
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

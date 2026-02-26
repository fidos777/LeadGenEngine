// components/caller/CompanyCard.tsx
"use client";

import { useState } from "react";
import type { CallerLead, CallerAction, ContactFormData, ObjectionFormData } from "@/types/caller";
import { ContactModal } from "./ContactModal";
import { ObjectionModal } from "./ObjectionModal";
import { AtapBadge } from "./AtapBadge";

interface CompanyCardProps {
  lead: CallerLead;
  onAction: (leadId: string, action: CallerAction, data?: ContactFormData | ObjectionFormData) => Promise<void>;
  isActioned: boolean;
}

export function CompanyCard({ lead, onAction, isActioned }: CompanyCardProps) {
  const [loading, setLoading] = useState<CallerAction | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showObjectionModal, setShowObjectionModal] = useState(false);

  const phone = lead.contact?.phone || lead.company_phone;
  const contactName = lead.contact?.full_name;
  const companyName = lead.company?.name || "Unknown Company";
  const zone = lead.company?.zone || "Unknown";
  const sector = lead.company?.sector || "Manufacturer";

  const handleAction = async (action: CallerAction, data?: ContactFormData | ObjectionFormData) => {
    setLoading(action);
    try {
      await onAction(lead.id, action, data);
      setShowContactModal(false);
      setShowObjectionModal(false);
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
        <div className="mb-2">
          <h3 className="font-semibold text-lg leading-tight">{companyName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full text-gray-400">
              {zone}
            </span>
            <span className="text-xs text-gray-500">{sector}</span>
          </div>
        </div>

        {/* ATAP Intelligence */}
        <AtapBadge lead={lead} />

        {/* Phone + Contact */}
        <div className="mt-3 mb-4">
          {contactName && (
            <p className="text-xs text-gray-400 mb-0.5">
              {contactName}{lead.contact?.role ? ` · ${lead.contact.role}` : ""}
            </p>
          )}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="block text-blue-400 text-lg font-mono active:text-blue-300"
            >
              {phone}
            </a>
          ) : (
            <p className="text-gray-500 text-sm">No phone number</p>
          )}
        </div>

        {/* Action Buttons — 4 columns */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleAction("call_attempted")}
            disabled={loading !== null}
            className="py-3 px-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading === "call_attempted" ? "..." : "Called"}
          </button>
          <button
            onClick={() => handleAction("callback_scheduled")}
            disabled={loading !== null}
            className="py-3 px-1 bg-amber-900/30 hover:bg-amber-900/50 active:bg-amber-900/70 text-amber-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading === "callback_scheduled" ? "..." : "Callback"}
          </button>
          <button
            onClick={() => setShowContactModal(true)}
            disabled={loading !== null}
            className="py-3 px-1 bg-green-900/50 hover:bg-green-900/70 active:bg-green-900 text-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading === "contact_identified" ? "..." : "Contact"}
          </button>
          <button
            onClick={() => setShowObjectionModal(true)}
            disabled={loading !== null}
            className="py-3 px-1 bg-red-900/30 hover:bg-red-900/50 active:bg-red-900/70 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading === "not_interested" ? "..." : "Not Int."}
          </button>
        </div>
      </div>

      {showContactModal && (
        <ContactModal
          companyName={companyName}
          onSubmit={(data) => handleAction("contact_identified", data)}
          onClose={() => setShowContactModal(false)}
          isLoading={loading === "contact_identified"}
        />
      )}

      {showObjectionModal && (
        <ObjectionModal
          companyName={companyName}
          onSubmit={(data) => handleAction("not_interested", data)}
          onClose={() => setShowObjectionModal(false)}
          isLoading={loading === "not_interested"}
        />
      )}
    </>
  );
}

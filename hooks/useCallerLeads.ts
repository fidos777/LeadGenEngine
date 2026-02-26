"use client";

import { useState, useEffect, useCallback } from "react";
import type { CallerLead, CallerAction, ContactFormData, ObjectionFormData } from "@/types/caller";
import { sortLeadsForCaller } from "@/lib/caller/sort";
import { scoreProspect } from "@/lib/scoring/solar";
import type { AtapScoringInput } from "@/lib/scoring/types";

/** Type guard to distinguish ObjectionFormData from ContactFormData */
function isObjectionData(data: unknown): data is ObjectionFormData {
  return typeof data === "object" && data !== null && "category" in data;
}

/**
 * Hydrate ATAP intelligence onto CallerLead from company fields.
 * Runs client-side so the caller sees eligibility + warnings inline.
 */
function hydrateAtap(lead: CallerLead): CallerLead {
  const c = lead.company;
  if (!c) return lead;

  const input: AtapScoringInput = {
    sector: c.sector ?? null,
    zone: c.zone ?? null,
    estimated_md_kw: c.estimated_md_kw ?? null,
    tenant_structure: (c.tenant_structure as AtapScoringInput["tenant_structure"]) ?? null,
    operating_hours: (c.operating_hours as AtapScoringInput["operating_hours"]) ?? null,
    estimated_roof_sqft: c.estimated_roof_sqft ?? null,
    tnb_bill_band: c.tnb_bill_band ?? null,
    ownership_status: (c.ownership_status as AtapScoringInput["ownership_status"]) ?? null,
  };

  try {
    const { eligibility, score } = scoreProspect(input);
    return {
      ...lead,
      atap_eligible: eligibility.eligible,
      atap_warnings: [...eligibility.disqualify_reasons, ...eligibility.warnings],
      priority_score: score.priority_score,
    };
  } catch {
    // Scoring shouldn't block calling
    return lead;
  }
}

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

      // Transform API response to CallerLead format with ATAP fields
      const callerLeads: CallerLead[] = data.map((lead: Record<string, unknown>) => {
        const company = lead.companies as Record<string, unknown> | null;
        const contact = lead.contacts as Record<string, unknown> | null;

        return {
          id: lead.id,
          status: lead.status,
          opportunity_type: (lead.opportunity_type as string) ?? "solar",
          company: company
            ? {
                id: company.id,
                name: company.name,
                zone: company.zone ?? null,
                sector: company.sector ?? null,
                estimated_md_kw: company.estimated_md_kw ?? null,
                tenant_structure: company.tenant_structure ?? null,
                operating_hours: company.operating_hours ?? null,
                tnb_bill_band: company.tnb_bill_band ?? null,
                ownership_status: company.ownership_status ?? null,
                estimated_roof_sqft: company.estimated_roof_sqft ?? null,
              }
            : null,
          contact: contact
            ? {
                phone: (contact.phone as string) ?? null,
                full_name: (contact.full_name as string) ?? null,
                role: (contact.role as string) ?? null,
              }
            : null,
          company_phone: (company?.phone as string) ?? undefined,
        };
      });

      // Hydrate ATAP scoring and sort
      const hydrated = callerLeads.map(hydrateAtap);
      setLeads(sortLeadsForCaller(hydrated));
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
    actionData?: ContactFormData | ObjectionFormData
  ) => {
    const payload: Record<string, unknown> = {
      activity: { outcome: action },
    };

    // Contact identified — capture name + role
    if (action === "contact_identified" && actionData && !isObjectionData(actionData)) {
      const contactData = actionData as ContactFormData;
      payload.activity = {
        outcome: action,
        intel_gathered: `Name: ${contactData.name}, Role: ${contactData.role || "N/A"}`,
      };
    }

    // Not interested — capture objection category + notes, move to closed_lost
    if (action === "not_interested" && actionData && isObjectionData(actionData)) {
      payload.activity = {
        outcome: action,
        objection_category: actionData.category,
        objection_notes: actionData.notes || null,
      };
      payload.new_status = "closed_lost";
      payload.objection_category = actionData.category;
    } else if (action === "not_interested") {
      // Fallback if no objection data (shouldn't happen with modal)
      payload.new_status = "closed_lost";
    }

    // Callback scheduled — keep in pipeline, just log activity
    if (action === "callback_scheduled") {
      payload.activity = {
        outcome: action,
        callback_requested: true,
      };
    }

    // Wrong number — flag for data cleanup
    if (action === "wrong_number") {
      payload.activity = {
        outcome: action,
        phone_invalid: true,
      };
    }

    // Call attempted — advance to outreached
    if (action === "call_attempted") {
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

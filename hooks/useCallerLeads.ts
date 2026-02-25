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
        contact: lead.contacts || null,
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

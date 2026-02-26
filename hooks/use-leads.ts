import { useState, useEffect } from "react";
import type { Lead } from "@/types";
import { apiClient } from "@/lib/api/client";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await apiClient<Lead[]>("/leads");
        setLeads(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch leads"));
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, []);

  return { leads, loading, error };
}

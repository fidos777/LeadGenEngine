"use client";

import { createBrowserClient } from "@supabase/ssr";
import { ENV } from "@/lib/env";

export function getSupabaseClient() {
  return createBrowserClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_ANON_KEY
  );
}

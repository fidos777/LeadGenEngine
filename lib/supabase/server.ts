import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "@/lib/env";

/**
 * User-scoped Supabase client for read operations.
 * Uses anon key with user session from cookies.
 * RLS policies apply based on authenticated user.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

/**
 * Admin Supabase client for write operations.
 * Uses service role key - bypasses RLS.
 * Use ONLY for server-side mutations after auth checks.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = ENV.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations"
    );
  }
  return createClient(ENV.SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AtlasRole } from "./permissions";

/**
 * @deprecated Use getAuthContext() for write endpoints.
 * This function discards user ID - only use for read-only endpoints.
 */
export async function getUserRoleUnsafe(): Promise<AtlasRole | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return data.role as AtlasRole;
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AtlasRole } from "./permissions";

export type AuthContext = {
  userId: string;
  role: AtlasRole;
};

/**
 * Returns both user ID and role for full auth context.
 * Use this when you need to attribute actions to a user.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
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

  return {
    userId: user.id,
    role: data.role as AtlasRole,
  };
}

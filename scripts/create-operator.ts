#!/usr/bin/env npx tsx
/**
 * create-operator.ts
 *
 * Creates an operator account for a new client organization.
 *
 * Usage:
 *   npx tsx scripts/create-operator.ts --email "client@example.com" --org-id "00000000-0000-0000-0000-000000000002" --password "SecurePass123!"
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

async function main() {
  const email = getArg("email");
  const orgId = getArg("org-id");
  const password = getArg("password");

  if (!email || !orgId || !password) {
    console.error("Usage: npx tsx scripts/create-operator.ts --email EMAIL --org-id ORG_UUID --password PASSWORD");
    console.error("\nExample:");
    console.error('  npx tsx scripts/create-operator.ts --email "ops@client2.com" --org-id "00000000-0000-0000-0000-000000000002" --password "SecurePass123!"');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Creating operator account for: ${email}`);
  console.log(`Organization ID: ${orgId}`);

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  });

  if (authError) {
    console.error("Failed to create auth user:", authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✓ Auth user created: ${userId}`);

  // 2. Update profile with operator role and org_id
  // The trigger should have auto-created the profile, so we update it
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      role: "operator",
      org_id: orgId,
    });

  if (profileError) {
    console.error("Failed to update profile:", profileError.message);
    // Try to clean up auth user
    await supabase.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  console.log(`✓ Profile set: role=operator, org_id=${orgId}`);
  console.log("\n=== Account Created ===");
  console.log(`Email: ${email}`);
  console.log(`User ID: ${userId}`);
  console.log(`Org ID: ${orgId}`);
  console.log(`Role: operator`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

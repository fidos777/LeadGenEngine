// Environment validation - fail fast on missing required vars
// Throws at build/startup time, not runtime

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnv(name: string): string | undefined {
  return process.env[name];
}

export const ENV = {
  SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  // Server-side only - required for admin/write operations
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  // Apify integration
  APIFY_API_TOKEN: getEnv("APIFY_API_TOKEN"),
} as const;

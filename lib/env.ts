// Environment validation - fail fast on missing required vars
// Throws at build/startup time, not runtime

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;

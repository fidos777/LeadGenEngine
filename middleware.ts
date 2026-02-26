import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { ENV } from "@/lib/env";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isDashboard =
    req.nextUrl.pathname.startsWith("/discovery") ||
    req.nextUrl.pathname.startsWith("/enrichment") ||
    req.nextUrl.pathname.startsWith("/leads") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isDashboard && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    (req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/signup")) &&
    session
  ) {
    return NextResponse.redirect(new URL("/discovery", req.url));
  }

  return res;
}

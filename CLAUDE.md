# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Context

LeadGenEngine is an industrial B2B prospecting infrastructure platform targeting Malaysian manufacturers. This is a scalable intelligence product, not a freelancer service site.

**Core Modules:**
- Discovery Engine - Structured company discovery (Google Maps, directories)
- SSM Enrichment Engine - Director registry data enrichment via SSM (Suruhanjaya Syarikat Malaysia)
- Gatekeeper Bypass Framework - Optimized outreach routing
- Scoring & Engagement Lock Model - Lead qualification and prioritization
- Snapshot Intelligence Layer - Company intelligence aggregation
- Sprint Execution Framework - Structured prospecting workflows

**Design Principles:**
- Infrastructure-grade UI: dark theme, precise typography, data-dense layouts
- Platform feel over marketing site aesthetic
- Scalable architecture patterns (not one-off scripts)

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

Next.js 16 with App Router, React 19, Tailwind CSS v4, TypeScript.

```
app/
├── (auth)/             # Auth routes (login, signup) - centered layout
├── (dashboard)/        # Authenticated app routes - sidebar layout
│   ├── discovery/
│   ├── enrichment/
│   ├── leads/
│   └── settings/
├── (marketing)/        # Public marketing pages (serves /)
├── api/v1/             # Versioned API routes
└── layout.tsx          # Root layout with fonts
components/
├── ui/                 # Primitives (Button, Input, etc.)
└── sections/           # Page sections (Hero, ModulesGrid, etc.)
lib/
├── api/                # API client utilities
├── db/                 # Database client (not yet configured)
├── services/           # Business logic (discovery, enrichment, scoring)
└── utils/              # Generic utilities (cn, formatters)
hooks/                  # Custom React hooks
types/                  # TypeScript types (Company, Lead, Director)
config/                 # App configuration and constants
lib/supabase/
├── client.ts           # Browser client (getSupabaseClient)
└── server.ts           # Server client for SSR
```

## Supabase Auth

**Client usage (in "use client" components):**
```typescript
import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();
await supabase.auth.signInWithPassword({ email, password });
```

**Important:**
- Uses `createBrowserClient` from `@supabase/ssr` (NOT `createClient` from `@supabase/supabase-js`)
- This is required for cookie-based session persistence with middleware
- `getSupabaseClient()` must be called inside functions, not at module level

**Environment variables (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Middleware** (`middleware.ts`) protects dashboard routes - redirects to `/login` if no session.

**Critical notes:**
- `NEXT_PUBLIC_*` vars are compile-time inlined, not runtime. Always restart dev server after changing `.env.local`
- Kill zombie Node processes before debugging (`pkill -9 node`)
- Wrap async event handlers in try/catch - errors are silent otherwise
- Clear `.next` cache if env changes don't take effect (`rm -rf .next`)

**Key Conventions:**
- Route groups `(auth)`, `(dashboard)`, `(marketing)` share layouts without affecting URLs
- Business logic lives in `lib/services/`, not in components
- Use `@/*` path alias for imports (e.g., `@/components/ui`)
- Dark theme with CSS custom properties (`--background`, `--foreground`)

# AGENTS.md

## App Context
Next.js 14 multitenant dashboard for Vetta (restaurant/retail management). Every operation depends on the active org (`org_id`) and the user's membership/role in that org. Modules: POS, loyalty, promotions, referrals, inventory, delivery, settings.

Stack: Next.js 14 App Router, Supabase (Auth + DB + Storage), shadcn/ui, Tailwind CSS v3, Cloudflare Workers (deploy via OpenNext).

## Dev Commands
- **Dev server:** `pnpm dev` (uses `dotenv -e .env.development`, clears `.next/` via `predev`)
- **Lint:** `pnpm lint`
- **Build (includes typecheck):** `pnpm build`
- **Add shadcn component:** `pnpm dlx shadcn@latest add <component-name>`

Always run `pnpm lint` and `pnpm build` before committing.

## Key Framework Quirks
- **Supabase client:** Use `getSupabaseBrowser()` from `@/utils/supabase/client` for client-side. **Never initialize services at module level** — causes build errors when env vars are missing. Initialize inside components (e.g., `useState(() => new Service())`).
- **Dynamic server errors:** API routes using `request.url` or `nextUrl.searchParams` cannot be statically prerendered. Add `export const dynamic = 'force-dynamic'` to affected routes if build fails.
- **Client components:** All `(dashboard)` pages use `"use client"`.
- **Image optimization:** Replace `<img>` with `next/image` to avoid LCP warnings. Remote images from `nftnpvtqbtljavgtiwab.supabase.co` are pre-allowed in `next.config.mjs`.
- **Tailwind:** v3 with `tailwindcss-animate` plugin. CSS variables for theming via `hsl(var(--...))` pattern. Dark mode via `class` strategy.

## Deploy & Cloudflare
Deploy target is Cloudflare Workers via OpenNext (`opennextjs-cloudflare`). No custom `worker.ts`.

- **Env files:** `.env.production.secrets` (gitignored, source for all cf: commands), `.env.supabase.local` (gitignored, for Supabase CLI)
- **Preview:** `pnpm preview` → builds + runs `wrangler dev`
- **Deploy:** `pnpm deploy` → builds + `wrangler deploy`
- **Check:** `pnpm check` → build + tsc + `wrangler deploy --dry-run`
- **Secrets:** `pnpm cf:secrets:bulk` (or `pnpm cf:secrets:sync` as fallback)
- **Typegen:** `pnpm types` → `wrangler types --env-interface CloudflareEnv env.d.ts`
- `wrangler.json` uses `keep_vars: true` — remote bindings not in the file are preserved.

Full protocol: `docs/deploy-protocol.md`

## Supabase Migrations
Remote schema managed via Supabase CLI. Migrations in `supabase/migrations/`.

- **Status:** `pnpm supabase:status`
- **Link remote:** `pnpm supabase:link`
- **Dry run:** `pnpm supabase:dry-run`
- **Push:** `pnpm supabase:push`
- **If dry-run fails** (remote has versions not in local): `pnpm supabase:pull` first to baseline, commit, then proceed.
- **New migration:** `npx supabase migration new <name>`

## Project Structure
```
src/
  app/
    (auth-pages)/     # Login, register, etc.
    (dashboard)/      # Main app (all "use client")
    api/              # API routes
    auth/             # Auth callback handlers
    onboarding/       # Onboarding flow
    org/              # Org-related routes
  components/         # Shared components (ui/ for shadcn)
  constants/          # App constants
  context/            # React context providers
  data/               # Data layer / fetchers
  hooks/              # Custom hooks
  lib/                # Utilities (utils.ts for shadcn cn())
  types/              # TypeScript types
  utils/              # Supabase client/server/middleware helpers
```

## Commit & PR
- Commit title format: `[front_vetta_website] <Concise title>`
- Never commit `.env*` files, `.next/`, or other build artifacts.
- ESLint: `react-hooks/exhaustive-deps` is off, `no-img-element` is warn only.

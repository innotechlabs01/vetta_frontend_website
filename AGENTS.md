# AGENTS.md

## App Context
Next.js 14 dashboard app for Vetta (restaurant/retail management) with modules for POS, loyalty, promotions, referrals, inventory, delivery, and settings. Uses Supabase for backend, shadcn/ui + Tailwind CSS v4 for UI.

## Role Definitions
- **Orchestrator**: Gathers requirements, defines task scope, coordinates roles, ensures all necessary context (env vars, API specs, UI mocks) is collected before work starts.
- **Developer**: Implements code changes, runs build/lint checks, fixes errors, handles Next.js/Supabase integration.
- **UI/UX Designer**: Reviews UI changes for shadcn/Tailwind consistency, validates WCAG 2.2 accessibility, optimizes user flow and responsive design.
- **Change Reviewer**: Validates changes align with original scope, flags unnecessary additions/scope creep. If scope drifts, asks user for clarification before proceeding.
- **Database & Security Architect**: Defines and reviews RLS (Row Level Security) policies, designs efficient table schemas, and manages migrations. Value: Prevents data leaks and ensures scalable queries.
- **QA & Automation Engineer**: Defines testing strategies (Unit, Integration with Playwright), verifies load/error states, and prevents regressions. Value: Reduces rework and ensures new code doesn't degrade the system.
- **Documentation & Context Maintainer**: Maintains ADRs (Architecture Decision Records), updates API documentation, and documents the "why" behind critical decisions. Value: Facilitates team growth and reduces dependency on specific individuals.

## Workflow Racional Propuesto

To maximize the functionality, the process must follow this order:

1.  **Scope (Orchestrator):** Defines what needs to be done.
2.  **Schema (DB Architect):** Prepares the data structure.
3.  **Design (UI/UX):** Defines the interface and flow.
4.  **Build (Developer):** Encodes the solution.
5.  **Audit (Reviewer + QA):** Validates the logic and stability.

## Dev Environment Tips
- Package manager: pnpm (node_modules uses pnpm symlinks)
- Supabase client: Use `getSupabaseBrowser()` from `@/utils/supabase/client` for client-side. **Never initialize services at module level** (causes build errors when env vars are missing).
- shadcn/ui: Add components via `pnpm dlx shadcn@latest add <component>`, follow `components.json` config.
- Tailwind v4: Uses `@theme inline` pattern, CSS variables for theming.

## Build & Verify Commands
- Dev server: `pnpm dev`
- Production build: `pnpm build` (must pass with no prerender errors)
- Lint: `pnpm lint`
- Typecheck: Included in build step, run `pnpm build` to verify
- Add shadcn component: `pnpm dlx shadcn@latest add <component-name>`

## Framework Quirks
- Next.js 14 dynamic server errors: API routes using `request.url` or `nextUrl.searchParams` cannot be statically prerendered. Add `export const dynamic = 'force-dynamic'` to affected routes if build fails.
- Client components: All `(dashboard)` pages use `"use client"`. Initialize Supabase services inside components (e.g., `useState(() => new Service())`) not at module level.
- Image optimization: Replace `<img>` with `next/image` to avoid LCP performance warnings.
- Existing skill docs for Next.js, shadcn, Tailwind are in `.agents/skills/` for reference.

## PR & Commit Instructions
- Commit title format: `[front_vetta_website] <Concise title>`
- Always run `pnpm lint` and `pnpm build` before committing.
- Never commit env files (`.env`, `.env.local`) or build artifacts (`.next/`).

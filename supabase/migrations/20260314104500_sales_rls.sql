-- ---------------------------------------------------------------------------
-- 2026-03-14 10:45:00 UTC — Enable RLS on sales and allow org members to edit
-- ---------------------------------------------------------------------------

-- Helper function used by the policies below. We reuse the existing
-- implementation that looks up the organization membership of the current
-- authenticated user via auth.uid().
create or replace function public.is_member_of_org(p_org uuid)
  returns boolean
  language sql
  stable
as $function$
  select exists(
    select 1
    from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
  );
$function$;

-- Ensure row level security is active on sales.
alter table public.sales enable row level security;

-- DROP and (re)CREATE the policies so that running the migration multiple
-- times keeps the schema sane.
drop policy if exists "Allow public read-only access for tracking" on public.sales;
drop policy if exists "Allow org members to manage sales" on public.sales;

create policy "Allow public read-only access for tracking"
  on public.sales
  for select
  to anon
  using (true);

create policy "Allow org members to manage sales"
  on public.sales
  for all
  to authenticated
  using (is_member_of_org(organization_id))
  with check (is_member_of_org(organization_id));

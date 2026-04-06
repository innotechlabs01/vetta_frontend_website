-- Operational channels by commerce/day (shift) + location coverage rules

create table if not exists public.organization_service_channels (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  national_shipping_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cash_shifts
  add column if not exists pickup_enabled boolean not null default true,
  add column if not exists delivery_enabled boolean not null default true,
  add column if not exists national_shipping_enabled boolean not null default true;

create table if not exists public.location_service_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  service_channel text not null check (service_channel in ('delivery', 'national_shipping')),
  enabled boolean not null default true,
  city text,
  postal_prefix text,
  text_pattern text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_location_service_zones_org_loc_channel
  on public.location_service_zones (organization_id, location_id, service_channel, enabled);

insert into public.organization_service_channels (organization_id)
select o.id
from public.organizations o
where not exists (
  select 1
  from public.organization_service_channels c
  where c.organization_id = o.id
);

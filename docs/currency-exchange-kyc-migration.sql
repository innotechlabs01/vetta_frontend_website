-- Currency Exchange + KYC migration
-- Run in Supabase SQL editor.

begin;

-- 1) organizations.business_category: include currency_exchange
alter table public.organizations
  drop constraint if exists organizations_business_category_check;

alter table public.organizations
  add constraint organizations_business_category_check
  check (
    business_category is null
    or business_category = any (
      array[
        'pharmacy'::text,
        'restaurant'::text,
        'coffee_shop'::text,
        'online_store'::text,
        'currency_exchange'::text,
        'other'::text
      ]
    )
  );

-- Optional backward-compat migration for old value
update public.organizations
set business_category = 'currency_exchange'
where lower(coalesce(business_category, '')) = 'exchange';

-- 2) org-level FX setting: daily limit per customer (USD)
alter table public.organizations
  add column if not exists fx_daily_limit_per_customer_usd numeric(12,2) not null default 1000;

alter table public.organizations
  drop constraint if exists organizations_fx_daily_limit_per_customer_usd_check;

alter table public.organizations
  add constraint organizations_fx_daily_limit_per_customer_usd_check
  check (fx_daily_limit_per_customer_usd >= 0);

-- 3) customer-level FX/KYC fields
alter table public.customers
  add column if not exists daily_limit_usd numeric(12,2),
  add column if not exists kyc_id_document_url text,
  add column if not exists kyc_signature_url text;

alter table public.customers
  drop constraint if exists customers_daily_limit_usd_check;

alter table public.customers
  add constraint customers_daily_limit_usd_check
  check (daily_limit_usd is null or daily_limit_usd >= 0);

create index if not exists idx_customers_org_daily_limit
  on public.customers (organization_id, daily_limit_usd);

-- 4) storage bucket for customer documents
insert into storage.buckets (id, name, public)
values ('customer-documents', 'customer-documents', true)
on conflict (id) do nothing;

commit;

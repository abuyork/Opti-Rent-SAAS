-- OptiRent initial schema — Build Pack §5 "Data model".
-- Tables: audits, leads, payments. JSON columns hold the §6 scoring payloads.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- audits: one row per listing audit (free + optionally unlocked/paid).
-- ---------------------------------------------------------------------------
create table if not exists audits (
  id                uuid primary key default gen_random_uuid(),
  airbnb_url        text not null,
  airroi_listing_id text,
  email             text not null,
  created_at        timestamptz not null default now(),

  -- scoring output (§6)
  overall_score     int  not null,
  category_scores   jsonb not null,          -- { photos, title, pricing_position, ... }
  underpricing_idr  bigint not null default 0,
  comp_count        int  not null default 0,
  comp_basis        text not null default '',
  problem_count     int  not null default 0,
  critical_count    int  not null default 0,
  fixes             jsonb not null default '[]'::jsonb,
  rewrites          jsonb not null default '{}'::jsonb,

  -- monetization
  paid              boolean not null default false
);

create index if not exists audits_email_idx       on audits (email);
create index if not exists audits_listing_idx      on audits (airroi_listing_id);
create index if not exists audits_created_at_idx   on audits (created_at desc);

-- ---------------------------------------------------------------------------
-- leads: email capture from every audit (free tier gate). Build Pack §1.
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  airbnb_url     text,
  score          int,
  underpricing   bigint,
  problem_count  int,
  created_at     timestamptz not null default now(),
  source         text                       -- e.g. 'audit', 'reaudit-upsell'
);

create index if not exists leads_email_idx      on leads (email);
create index if not exists leads_created_at_idx  on leads (created_at desc);

-- ---------------------------------------------------------------------------
-- payments: one-time Stripe charges that unlock an audit. Build Pack §5/§7.
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  audit_id      uuid not null references audits (id) on delete cascade,
  amount_usd    int not null,               -- charge amount in USD cents
  provider      text not null default 'stripe',
  provider_ref  text,                       -- Stripe session / payment intent id
  status        text not null default 'pending', -- pending | paid | failed | refunded
  created_at    timestamptz not null default now()
);

create index if not exists payments_audit_idx        on payments (audit_id);
create unique index if not exists payments_ref_idx    on payments (provider, provider_ref)
  where provider_ref is not null;

-- ---------------------------------------------------------------------------
-- airroi_snapshots: cache raw AirROI payloads per listing (~24h). Build Pack §8.
-- Keeps comp datasets server-side and controls API cost.
-- ---------------------------------------------------------------------------
create table if not exists airroi_snapshots (
  airroi_listing_id text primary key,
  payload           jsonb not null,
  fetched_at        timestamptz not null default now()
);

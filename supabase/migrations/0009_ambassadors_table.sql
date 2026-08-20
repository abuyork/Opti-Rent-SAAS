-- Ambassador registry moves from code (src/lib/ambassadors.ts) to the DB
-- (Alex 2026-08-20): adding an ambassador becomes a Table Editor row — live
-- immediately, no deploy. `active` retires a link without deleting the row,
-- so past sales keep their referral_ref for payout history. RLS on,
-- service-role only, same posture as every other table. The CHECK mirrors
-- AMBASSADOR_SLUG_RE in src/lib/ambassadors.ts.
create table if not exists ambassadors (
  slug       text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table ambassadors enable row level security;

-- Seed with the ambassador who existed in the code registry.
insert into ambassadors (slug, name) values ('gusde', 'Gusde')
  on conflict (slug) do nothing;

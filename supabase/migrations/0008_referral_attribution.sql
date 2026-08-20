-- Ambassador referral attribution (Bali ambassador program, 2026-08-20):
-- optimo.rent/bali/<slug> stamps a 180-day referral cookie (src/proxy.ts);
-- /api/audit copies it here at creation, and /api/checkout backfills it when
-- the referral arrived after the audit was created. Report sales attribute via
-- payments (status='paid') joined to audits.referral_ref; playbook sales carry
-- the slug in Stripe session metadata only (they have no DB rows by design).
-- Values are registry-validated slugs from src/lib/ambassadors.ts; null for
-- all non-referred traffic.
alter table audits add column if not exists referral_ref text;
create index if not exists audits_referral_idx on audits (referral_ref)
  where referral_ref is not null;

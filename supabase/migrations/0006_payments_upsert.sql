-- recordPayment upserts on (provider, provider_ref), but 0001 created that
-- uniqueness as a PARTIAL index (WHERE provider_ref IS NOT NULL) — and
-- Postgres ON CONFLICT cannot match a partial index unless the statement
-- repeats its WHERE predicate, which PostgREST's upsert never sends. Result:
-- every payment write failed with "no unique or exclusion constraint matching
-- the ON CONFLICT specification" the moment Stripe went live (2026-08-06).
--
-- Replace it with a plain UNIQUE constraint. Postgres treats NULLs as
-- distinct, so rows without a provider_ref remain unconstrained — the same
-- semantics the partial index intended, but upsert-compatible.
drop index if exists payments_ref_idx;
alter table payments
  add constraint payments_provider_ref_key unique (provider, provider_ref);

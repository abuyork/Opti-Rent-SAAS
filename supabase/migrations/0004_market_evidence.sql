-- Attach measured market evidence to each audit: the Greater-Canggu cohort
-- winner benchmarks + winner cover examples used to ground the report's fixes
-- and visual references. Null for off-market (non-Canggu) listings.
alter table audits add column if not exists market_evidence jsonb;

-- Async audits (Netlify's ~30s function cap vs our 30-70s scoring):
-- POST /api/audit now creates a 'processing' row instantly and a background
-- function fills in the scores. Old rows are all completed audits.
alter table audits add column if not exists status text not null default 'complete';
alter table audits add column if not exists error_message text;

-- Pending rows are created before any scoring exists; give the two scoring
-- columns that lacked defaults a safe placeholder.
alter table audits alter column overall_score set default 0;
alter table audits alter column category_scores set default '{}'::jsonb;

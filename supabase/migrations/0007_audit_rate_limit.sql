-- Free-audit rate limiting (Build Pack §8 "rate-limited, IP-capped"): store
-- the requester IP on each audit so per-IP daily caps can be counted in the
-- DB — serverless instances share no memory, so the DB is the only counter
-- that holds. Per-email caps count on the existing email column.
alter table audits add column if not exists client_ip text;
create index if not exists audits_client_ip_idx on audits (client_ip, created_at desc);

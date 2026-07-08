-- Listing identity on the report (design fixes 2026-07): show the audited
-- listing's title + hero photo alongside its Airbnb URL.
alter table audits add column if not exists listing_title text;
alter table audits add column if not exists listing_photo text;

-- Canggu viral-score scanner (Manager feedback 2026-07): one row per scanned
-- listing per snapshot, so market scans are comparable over time.
create table if not exists market_listings (
  snapshot_date     date not null default current_date,
  market            text not null,               -- e.g. 'greater-canggu'
  listing_id        text not null,
  cohort            text not null,               -- '1BR' … '5+BR'
  stratum           text not null,               -- 'top' | 'mid' | 'bottom'
  listing_name      text,
  locality          text,
  bedrooms          int,
  ttm_revpar        double precision,
  ttm_occupancy     double precision,
  ttm_avg_rate      double precision,
  ttm_revenue       double precision,
  rating_overall    double precision,
  num_reviews       int,
  guest_favorite    boolean,
  superhost         boolean,
  instant_book      boolean,
  min_nights        int,
  photos_count      int,
  cover_photo_url   text,
  title_chars       int,
  description_chars int,
  amenities         jsonb not null default '[]'::jsonb,
  viral_score       double precision not null,
  created_at        timestamptz not null default now(),
  primary key (snapshot_date, market, listing_id)
);

create index if not exists market_listings_market_idx
  on market_listings (market, snapshot_date desc);
create index if not exists market_listings_score_idx
  on market_listings (market, cohort, viral_score desc);

-- Service-role only, like every other table in this project.
alter table market_listings enable row level security;

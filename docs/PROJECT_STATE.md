# OptiRent — Project State

_OptiRent MVP · Built to OptiRent Build Pack v3.0_
_Last updated: 2026-07-06_

## TL;DR

The core product loop is **live and real end-to-end**: paste a real Airbnb villa
URL → live AirROI data → **live Claude v2 scoring (now with vision — Claude sees
the cover photo)** → **persisted to Supabase** → free result → full report + PDF.
The only mock left in the chain is **payments** (Stripe not wired yet).

> **What's real vs. mock now:** AirROI data, Claude scoring (score + fixes +
> rewrites + vision), and Supabase persistence are all **LIVE**. **Payment is the
> only piece still bypassed** — via the `OPTIRENT_TESTING_UNLOCK_ALL` testing flag
> that reveals the paid report for free. Turn that off + wire Stripe to monetize.

## Overall completion — ~70% of a launchable MVP

The build/technical spine is essentially done; what remains is monetization, an
abuse/quality hardening pass, and calibration.

| Area | Weight | Status | Done |
|------|:------:|--------|:----:|
| Foundation (Next.js/TS/Tailwind, config, types) | 10% | ✅ done | 10 |
| AirROI integration (live, verified) | 12% | ✅ done | 12 |
| Scoring engine — v2 prompt + Claude live + **vision** | 20% | ✅ done | 20 |
| Public audit flow + result/report UI | 12% | ✅ done | 12 |
| Persistence — Supabase live + RLS | 10% | ✅ done | 10 |
| PDF report (browser print→PDF) | 5% | ✅ done | 5 |
| **Stripe payments (live money flow)** | 12% | ❌ scaffold only | 0 |
| **Paywall enforcement (turn off test unlock)** | 3% | ❌ pending | 0 |
| **Abuse guardrails (AirROI 24h cache, rate-limit/IP-cap)** | 6% | ⚠️ partial | 1 |
| **Email delivery (report link)** | 4% | ❌ not wired | 0 |
| **Calibration (20–30 Canggu villas)** | 6% | ❌ pending | 0 |
| Optional polish (server-side PDF, Apify reviews, verdict/quick-wins) | — | ⏳ nice-to-have | — |
| **Total** | 100% | | **~70%** |

Read: everything needed to *demo a real, accurate audit* works today. The ~30%
left is what turns it into a *business that charges money safely* — payments,
guardrails, email, and a scoring sanity-check.

---

## What's been built (maps 1:1 to the Build Pack)

| # | Build Pack step | Status | Key files |
|---|-----------------|--------|-----------|
| — | Foundation: Next.js 16 (App Router) + React 19 + Tailwind v4 + TS | ✅ builds clean | `src/app/`, `src/lib/types.ts`, `src/lib/config.ts` |
| §5 | Data model: `audits`, `leads`, `payments`, `airroi_snapshots` | ✅ **applied to live Supabase project + RLS on** | `supabase/migrations/0001_init.sql` |
| §3/§4 | AirROI integration (resolve URL → listing + comps + benchmark) | ✅ **live + verified** against real API; mock retained | `src/lib/airroi/` |
| §6 | Claude scoring engine — **v2 prompt** (funnel/2026-algorithm/micro-market) + **vision cover-photo** + strict-JSON + retry | ✅ **live (Claude Opus 4.8)** + mock | `src/lib/scoring/` |
| §4/§7 | Public audit page: URL → email gate → loading → free result + locked preview | ✅ | `src/app/page.tsx`, `src/components/AuditForm.tsx`, `src/app/result/[id]/page.tsx` |
| §7 | Stripe one-time payment → unlock | ✅ mock + live + webhook | `src/app/api/checkout/`, `src/app/api/unlock/`, `src/app/api/stripe/webhook/` |
| §7 | Branded single-page A4 PDF report | ✅ HTML→PDF (print) | `src/app/report/[id]/page.tsx` |
| §8 | Guardrails: server-side keys, signed report links, free-tier hides fixes | ✅ partial (see Open items) | `src/lib/sign.ts`, `src/lib/audit.ts` |

## Architecture in one picture

```
Browser ──▶ /api/audit ──▶ runAudit()
                              ├─ AirROI provider  (mock | live)  → listing + comps + benchmark
                              └─ Scorer           (mock | Claude) → §6 strict JSON
                                    │
                              AuditStore (memory | Supabase) ── persists audit + lead
                                    │
   FREE view (score, underpricing, #problems) ◀── only non-paid fields leave the server
                                    │
   /api/checkout ──▶ Stripe (mock = signed local unlock) ──▶ /api/unlock ──▶ marks paid
                                    │
   /result/[id]  (paid) ──▶ full fixes + rewrites + "Download PDF"
   /report/[id]          ──▶ A4 branded report, print → PDF
```

### The provider pattern (why nothing is blocked)

Every external system sits behind an interface with a **mock** and a **live**
implementation, selected by env:

| System | Interface | Mock | Live | Switch |
|--------|-----------|------|------|--------|
| AirROI | `AirRoiProvider` | `MockAirRoiProvider` (Villa Seraya fixture) | `LiveAirRoiProvider` ✅ **LIVE** | `AIRROI_MODE=mock\|live` |
| Claude | `Scorer` | `MockScorer` (sample report) | `ClaudeScorer` (Opus 4.8 + vision) ✅ **LIVE** | `CLAUDE_MODE=mock\|live` |
| DB | `AuditStore` | `MemoryAuditStore` | `SupabaseAuditStore` ✅ **LIVE** (project `opti-rent`) | presence of Supabase env |
| Payments | — | signed local unlock URL ⚠️ **mock only** | Stripe Checkout + webhook (scaffold) | presence of `STRIPE_SECRET_KEY` |

## How to run

```bash
npm install
cp .env.example .env.local      # then set the keys below
npm run dev                     # http://localhost:3000
```

Current `.env.local` (gitignored) — everything except Stripe is live:

```
AIRROI_MODE=live            AIRROI_API_KEY=<key>
CLAUDE_MODE=live            ANTHROPIC_API_KEY=<key>   ANTHROPIC_MODEL=claude-opus-4-8
OPTIRENT_VISION=true        OPTIRENT_VISION_MAX_IMAGES=6   # cover-photo vision
NEXT_PUBLIC_SUPABASE_URL=…  NEXT_PUBLIC_SUPABASE_ANON_KEY=…  SUPABASE_SERVICE_ROLE_KEY=…
OPTIRENT_TESTING_UNLOCK_ALL=true   # QA: full report without paying — turn OFF for launch
```

Try it: paste a **real** Canggu villa URL (e.g. `https://www.airbnb.com/rooms/<id>`)
→ enter any email → you get a real Claude-scored audit (with cover-photo vision),
persisted to Supabase. With `OPTIRENT_TESTING_UNLOCK_ALL=true` the result screen
shows the full report (fixes + rewrites + PDF link) without payment.

**Supabase project:** `opti-rent` (ref `ixdnnjckeqfpdgbkzdum`, region `ap-southeast-1`),
org "Alex's Org". Schema applied, **RLS enabled on all tables** (service-role only).

**Accessing from another device (phone / LAN IP):** the dev server must allow
that origin or the page won't hydrate (forms silently reload to blank). LAN IPs
are whitelisted in `next.config.ts` → `allowedDevOrigins`; add new ones there.
`localhost` is always allowed.

## Verification done

**2026-07-06 — Claude v2 live, vision, Supabase persistence**
- `CLAUDE_MODE=live` — real Opus 4.8 scoring end-to-end (removed the deprecated
  `temperature` param that 400'd). Real villa scored **78–84/100** with
  listing-specific v2 fixes (cancellation policy, Instant Book, micro-market).
- **Vision on:** first 6 photos sent as images; top fix became a real visual
  read — *"Cover photo is busy and reads as interior/walkway, not pool."*
- **Title compliance + Title Case** enforced in prompt + deterministic validator
  (strips middots/emoji/accents, ≤50 chars).
- **Supabase live:** project created, migration applied (4 tables), keys wired.
  Audit persisted and **survived a full server restart** (`/result` → 200).
  **RLS enabled** on all tables — service-role only; public anon key locked out.
- **PDF fixed:** `/report/[id]` now honors the testing flag (was redirecting) →
  download/print works.
- Friendly "listing not found" message + short-link (`abnb.me`) resolution.

**2026-06-25 — live AirROI + cross-origin fix**
- AirROI contract verified directly: `/listings?id=&currency=native`,
  `/listings/comparables`, radius search. IDs are the raw Airbnb room id.
- `LiveAirRoiProvider` implemented; `npm run typecheck` clean.
- `POST /api/audit` on a real Canggu villa (`932423077755790756`) → **live**:
  `comp_count: 25`, `"25 Kerobokan 3BR pool villas"`, real title pulled through,
  photo gap `40 vs 61`, `underpricing_idr: 0` (correctly priced **above** the
  comp median). Score/fixes still the mock sample (`CLAUDE_MODE=mock`).
- `/result/[id]` renders the full report under the testing flag; locked preview
  and the $49 button correctly hidden.
- Fixed: pasting from a LAN IP reloaded to a blank page — root cause was Next's
  default cross-origin block on `/_next/*` dev resources (no hydration → native
  form submit). Resolved via `allowedDevOrigins`.
- Fixed: `airroi_listing_id` precision loss (Airbnb ids exceed 2^53) — now uses
  the exact string parsed from the URL, not the JSON number.

**2026-06-15 — mock-mode walkthrough**
- `npm run build` clean, all routes, TypeScript passes.
- `/api/audit` FREE view, paywall hides fixes; `/api/checkout` → `/api/unlock`
  flips to paid; `/report/[id]` renders; tampered unlock token rejected (`403`).

## Stack & versions

- next `16.2.9`, react `19`, tailwindcss `4` (`@tailwindcss/postcss`)
- `@anthropic-ai/sdk` `0.104.1` (model id `claude-opus-4-8`)
- `stripe` `22.2.1`
- `@supabase/supabase-js` `2.108.2`
- Node 20

## Open items / known gaps (the ~30% left)

1. **Stripe payments not wired** — checkout + `/api/unlock` + webhook are
   scaffolded, but no real charge happens. This is the monetization core. Needs
   Stripe keys + wiring `recordPayment` → `markAuditPaid`.
2. **Testing unlock is ON** — `OPTIRENT_TESTING_UNLOCK_ALL=true` reveals the paid
   report for free. **Turn this off** before anything customer-facing (defaults
   off when unset). Until Stripe is live, turning it off means no one sees fixes.
3. **Guardrails partial** — free-tier field hiding, signed links, server-side
   keys, and **RLS** are done. Still to add: AirROI **24h caching**
   (`airroi_snapshots` table exists but isn't wired — every audit re-hits AirROI
   *and* re-pays for Claude vision), plus rate-limit / IP-cap on free audits.
4. **No email delivery** — the spec emails a report link; no email provider is
   wired yet. Leads are captured in Supabase.
5. **Not calibrated** — scores are live but unaudited. Run the §6 calibration on
   20–30 known Canggu villas and sanity-check before charging.
6. **AirROI: no review text** — `/listings` gives rating + count only, so the
   reviews band is scored without recurring-complaint text. `ReviewSummary.recent`
   is empty until an Apify scrape is added.
7. **PDF is print-based** — works (browser "Save as PDF"). A true server-side PDF
   file (email attachments) would need Puppeteer against `/report/[id]`.
8. **Cost note** — vision adds ~$0.05–0.15/audit (6 images). With no AirROI/Claude
   caching yet, repeat audits of the same villa re-pay in full. Wire the snapshot
   cache before any real traffic.

## Repo layout

```
src/
  app/
    page.tsx                 landing + audit form
    result/[id]/page.tsx     free result / paid report
    report/[id]/page.tsx     A4 printable PDF report
    api/{audit,score,checkout,unlock,stripe/webhook}/route.ts
  components/                AuditForm, PayButton, PrintButton, report/*
  lib/
    types.ts                 domain model + §6 JSON contract
    config.ts                typed env access
    airroi/                  provider + mock + live (real API) + url (id parsing)
    scoring/                 §6 prompt + validate + mock + Claude
    db/                      store + memory + supabase
    audit.ts                 pipeline orchestration
    sign.ts  format.ts  stripe.ts
supabase/migrations/0001_init.sql
spec/                        Build Pack v3.0 + Villa Seraya sample (PDF)
docs/                        this file + HANDOFF-MAX.md
```

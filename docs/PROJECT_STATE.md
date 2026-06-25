# OptiRent — Project State

_A Réntlyn product · MVP · Built to OptiRent Build Pack v3.0_
_Last updated: 2026-06-25_

## TL;DR

The **entire MVP flow is built and runs end-to-end**. **AirROI is now live** —
paste a real Airbnb villa URL and you get real listing content, a real comp set,
benchmark, and underpricing. The rest of the chain (scoring, payments, DB) still
runs on mocks until their keys land. Flow: paste URL → email gate → free score →
pay → unlocked fixes/rewrites → printable PDF report.

Still needed to fully go live: **Claude, Supabase, Stripe** keys plus a
**calibration pass**. None block local development — they swap in via config,
not code changes. See [`HANDOFF-MAX.md`](HANDOFF-MAX.md) for the asks.

> **What's real vs. mock right now:** comp set, benchmark, underpricing, listing
> title/description/photo counts = **live AirROI**. Overall score + fix text +
> rewrites = **mock sample** until `ANTHROPIC_API_KEY` is set. Persistence =
> in-memory (no Supabase yet). Payment = bypassed via a testing flag.

---

## What's been built (maps 1:1 to the Build Pack)

| # | Build Pack step | Status | Key files |
|---|-----------------|--------|-----------|
| — | Foundation: Next.js 16 (App Router) + React 19 + Tailwind v4 + TS | ✅ builds clean | `src/app/`, `src/lib/types.ts`, `src/lib/config.ts` |
| §5 | Data model: `audits`, `leads`, `payments`, `airroi_snapshots` | ✅ migration written | `supabase/migrations/0001_init.sql` |
| §3/§4 | AirROI integration (resolve URL → listing + comps + benchmark) | ✅ **live implemented + verified** against real API; mock retained | `src/lib/airroi/` |
| §6 | Claude scoring engine — system prompt **verbatim**, strict-JSON parse + 1 retry | ✅ mock + live | `src/lib/scoring/` |
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
| AirROI | `AirRoiProvider` | `MockAirRoiProvider` (Villa Seraya fixture) | `LiveAirRoiProvider` (**implemented + verified**) | `AIRROI_MODE=mock\|live` |
| Claude | `Scorer` | `MockScorer` (sample report) | `ClaudeScorer` (Anthropic SDK) | `CLAUDE_MODE=mock\|live` |
| DB | `AuditStore` | `MemoryAuditStore` | `SupabaseAuditStore` | presence of Supabase env |
| Payments | — | signed local unlock URL | Stripe Checkout + webhook | presence of `STRIPE_SECRET_KEY` |

## How to run

```bash
npm install
cp .env.example .env.local      # then set the keys below
npm run dev                     # http://localhost:3000
```

Current `.env.local` (gitignored) for live-AirROI dev:

```
AIRROI_MODE=live
AIRROI_API_KEY=<key>            # provided 2026-06-25
CLAUDE_MODE=mock                # no Anthropic key yet
OPTIRENT_TESTING_UNLOCK_ALL=true  # show full report without paying (QA only)
```

Try it: paste a **real** Canggu villa URL (e.g. `https://www.airbnb.com/rooms/<id>`)
→ enter any email → you get live AirROI metrics with the mock score/fixes. With
`OPTIRENT_TESTING_UNLOCK_ALL=true` the result screen shows the full report
(fixes + rewrites + PDF link) without payment.

**Accessing from another device (phone / LAN IP):** the dev server must allow
that origin or the page won't hydrate (forms silently reload to blank). LAN IPs
are whitelisted in `next.config.ts` → `allowedDevOrigins`; add new ones there.
`localhost` is always allowed.

## Verification done

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

## Open items / known gaps

1. **Scoring is still mock** — the overall score, category scores, fix text, and
   rewrites come from `MockScorer` (the Villa Seraya sample) until
   `ANTHROPIC_API_KEY` is set and `CLAUDE_MODE=live`. Live AirROI metrics already
   flow through underneath. This is the single biggest "looks real but isn't" gap.
2. **AirROI: no review text** — `/listings` returns rating + count only, not
   individual reviews, so the §6 "recurring complaint" band is scored from
   ratings alone until a review scrape is added. `ReviewSummary.recent` is empty
   from the live adapter. (Everything else from AirROI is live and verified.)
3. **Testing unlock is ON** — `OPTIRENT_TESTING_UNLOCK_ALL=true` reveals the full
   report without payment for QA. **Turn this off** (and rely on Stripe) before
   anything customer-facing. Defaults to off when the env var is unset.
4. **No persistence without Supabase** — in mock mode the in-memory store resets
   on server restart. Fine for demos; needs Supabase for anything real.
5. **PDF is print-based HTML→PDF** (browser "Save as PDF"). A true server-side
   PDF file (for email attachments) would need Puppeteer against the same
   `/report/[id]` HTML — not yet added.
6. **Guardrails partial** — free-tier field hiding, signed links, and server-side
   keys are done. Still to add: AirROI 24h caching (`airroi_snapshots` table
   exists but isn't wired), rate-limit / IP-cap / email-gate throttling on free
   audits.
7. **Not calibrated** — once Claude is live, scores need the §6 calibration run
   on 20–30 real Canggu villas before anything customer-facing.

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

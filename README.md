# OptimoRent — Villa Listing Audit

> A villa owner pastes their Airbnb URL and gets a free
> score, an underpricing estimate vs. comparable villas, and a problem count.
> They pay once ($49) to unlock the full fix list, paste-ready rewrites, and a
> branded PDF. STR data from **AirROI**; scoring from **Claude**.

Built to the **OptimoRent Build Pack v3.0** (see [`spec/`](spec/)).

## Stack

| Layer     | Tool                         |
| --------- | ---------------------------- |
| Frontend  | Next.js (App Router, TS)     |
| Styling   | Tailwind CSS v4              |
| Backend   | Next.js API routes / actions |
| STR data  | AirROI API                   |
| AI        | Claude API (scoring engine)  |
| DB        | Postgres (Supabase)          |
| Payments  | Stripe (USD, one-time)       |
| PDF       | HTML → PDF                   |

## Provider modes

Every external dependency sits behind an interface with a **mock adapter**, so
the app runs end-to-end with zero credentials. Flip to real APIs via env:

- `AIRROI_MODE=mock|live`
- `CLAUDE_MODE=mock|live`

Supabase / Stripe similarly fall back to local/no-op behaviour until keys exist.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys when available; defaults run in mock mode
npm run dev                  # http://localhost:3000
```

## Build order (from the spec, §8)

1. AirROI integration + comps  ← provider + mock
2. Claude scoring endpoint (one villa end-to-end)
3. Public audit page (input → free result + email)
4. Paywall + one-time payment → unlock
5. PDF report

## Guardrails (spec §8)

- API keys are **server-side only**; never exposed to the browser.
- AirROI responses cached per listing (~24h) to control cost.
- Free audits are email-gated, rate-limited, and IP-capped.
- Raw comp datasets are never exposed publicly.
- All figures are **benchmark estimates** (listing-quality slice only), never guarantees.

## Project layout

```
src/
  app/                 # routes (landing, audit, result, api)
  lib/
    types.ts           # domain model + the §6 scoring JSON contract
    config.ts          # typed, server-side env access
    airroi/            # AirROI provider interface + mock/live adapters
    scoring/           # Claude system prompt + scoring client
    db/                # Supabase access (audits, leads, payments)
spec/                  # OptimoRent Build Pack v3.0 + sample report (PDF)
supabase/              # SQL migrations
```

/**
 * Market scanner — viral scores + the "what actually works" playbook
 * (Manager feedback 2026-07: "eliminate the guess").
 *
 *   npm run scan                              # Greater Canggu (default)
 *   npm run scan -- --market dubai            # any market in markets.ts
 *   npm run scan -- --market london --pages 3 # pages of 10 per stratum (default 2)
 *   npm run scan -- --dry                     # no Supabase writes
 *   npm run scan -- --no-ai                   # deterministic layers only
 *   npm run scan -- --cached                  # reuse last fetch (no AirROI spend)
 *
 * Output: docs/playbooks/<market>-<date>.md, src/lib/market/benchmarks.<market>.json,
 * rows in market_listings. Cost at defaults: ~20 AirROI search calls (~$10) +
 * one Claude vision pattern call (~$2-4).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

interface Args {
  dry: boolean;
  ai: boolean;
  pages: number;
  cached: boolean;
  market: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dry: false, ai: true, pages: 2, cached: false, market: "greater-canggu" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry") args.dry = true;
    else if (argv[i] === "--no-ai") args.ai = false;
    else if (argv[i] === "--pages") args.pages = Math.max(1, Number(argv[++i] ?? 2));
    else if (argv[i] === "--cached") args.cached = true;
    else if (argv[i] === "--market") args.market = String(argv[++i] ?? "greater-canggu");
  }
  return args;
}

/** Fetched samples are cached per market so a crash in a later stage never re-spends AirROI credits. */
const cachePath = (market: string) => `node_modules/.cache/optirent/last-scan-${market}.json`;

const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

/** Compact native-currency amount, e.g. "Rp 4.8M", "AED 2,282", "£612". */
function moneyFormatter(currency: string): (v: number) => string {
  const sym = currency === "IDR" ? "Rp" : currency === "GBP" ? "£" : currency;
  return (v: number) =>
    v >= 1_000_000
      ? `${sym} ${(v / 1_000_000).toFixed(1)}M`.replace("£ ", "£")
      : `${sym} ${Math.round(v).toLocaleString()}`.replace("£ ", "£");
}

async function main(): Promise<void> {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));

  const { config } = await import("@/lib/config");
  const { getMarketDef } = await import("./markets");
  const { fetchCohort } = await import("./fetch");
  const { scoreCohort } = await import("./score");
  const { cohortStats, splitQuartiles } = await import("./stats");
  type Scanned = import("./types").ScannedListing;
  type Stats = import("./types").CohortStats;
  type Findings = import("./types").PlaybookFindings;

  if (config.airroi.mode !== "live" || !config.airroi.apiKey) {
    throw new Error("Market scan needs AIRROI_MODE=live and AIRROI_API_KEY.");
  }

  const def = getMarketDef(args.market);
  const MARKET = def.key;
  const CACHE_PATH = cachePath(MARKET);

  console.log(`\n=== OptiRent market scan: ${def.title} (${MARKET}) ===\n`);

  // --- fetch + score per cohort (or reuse the cached sample) ---
  const all: Scanned[] = [];
  const stats: Stats[] = [];
  if (args.cached) {
    const cached = JSON.parse(readFileSync(resolve(process.cwd(), CACHE_PATH), "utf8")) as Scanned[];
    all.push(...cached);
    for (const cohort of def.cohorts) {
      const listings = all.filter((l) => l.cohort === cohort.label);
      if (listings.length >= 20) stats.push(cohortStats(cohort.label, listings));
    }
    console.log(`loaded ${all.length} listings from cache (${CACHE_PATH})`);
  } else {
    for (const cohort of def.cohorts) {
      const listings = await fetchCohort(def, cohort, args.pages, (m) => console.log(m));
      if (listings.length < 20) {
        console.log(`${cohort.label}: only ${listings.length} listings — skipping stats`);
        continue;
      }
      scoreCohort(listings);
      stats.push(cohortStats(cohort.label, listings));
      all.push(...listings);
    }
    mkdirSync(resolve(process.cwd(), CACHE_PATH, ".."), { recursive: true });
    writeFileSync(resolve(process.cwd(), CACHE_PATH), JSON.stringify(all));
  }
  console.log(`\nscored ${all.length} listings across ${stats.length} cohorts`);
  if (stats.length === 0) {
    throw new Error("no cohort produced a usable sample — aborting before AI/persist");
  }

  // --- AI pattern pass ---
  let findings: Findings | null = null;
  if (args.ai && config.claude.mode === "live" && config.claude.apiKey) {
    const winners: Scanned[] = [];
    const losers: Scanned[] = [];
    for (const s of stats) {
      const cohortListings = all.filter((l) => l.cohort === s.cohort);
      const split = splitQuartiles(cohortListings);
      winners.push(...split.winners.slice(0, 6));
      losers.push(...split.losers.slice(0, 4));
    }
    console.log(
      `\n[patterns] sending ${winners.length} winners + ${losers.length} losers to ${config.claude.model}…`,
    );
    const { extractPatterns } = await import("./patterns");
    findings = await extractPatterns(def.title, stats, winners, losers);
    console.log(`[patterns] done — ${findings.top_actions.length} top actions extracted`);
  } else {
    console.log(`\n[patterns] skipped (${args.ai ? "needs CLAUDE_MODE=live" : "--no-ai"})`);
  }

  // --- playbook markdown ---
  const date = new Date().toISOString().slice(0, 10);
  const md = renderPlaybook(def.title, def.currency, date, stats, all, findings);
  const outDir = resolve(process.cwd(), "docs/playbooks");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${MARKET}-${date}.md`);
  writeFileSync(outPath, md);
  console.log(`\nplaybook written: ${outPath}`);

  // Regenerate the machine-readable benchmarks the audit consumes, so they never
  // drift from the human playbook.
  const { buildBenchmarks } = await import("./benchmarks");
  const benchPath = resolve(process.cwd(), "src/lib/market", `benchmarks.${MARKET}.json`);
  writeFileSync(benchPath, JSON.stringify(buildBenchmarks(MARKET, all), null, 2));
  console.log(`benchmarks written: ${benchPath}`);

  // --- persist ---
  if (!args.dry) {
    const { persistScan } = await import("./db");
    await persistScan(MARKET, all);
    console.log(`persisted ${all.length} rows to market_listings (snapshot ${date})`);
  } else {
    console.log("(--dry: skipped Supabase persistence)");
  }

  console.log(`\n=== scan complete ===\n`);
}

function renderPlaybook(
  marketTitle: string,
  currency: string,
  date: string,
  stats: import("./types").CohortStats[],
  all: import("./types").ScannedListing[],
  findings: import("./types").PlaybookFindings | null,
): string {
  const fmtMoney = moneyFormatter(currency);
  const lines: string[] = [];
  lines.push(`# ${marketTitle} Market Playbook — ${date}`);
  lines.push("");
  lines.push(
    `_${all.length} entire-home listings sampled across ${stats.length} bedroom cohorts ` +
      `(top and bottom of the TTM RevPAR distribution, ≥90 available days, RevPAR > 0). ` +
      `Viral score = within-cohort percentile blend: 50% RevPAR, 30% occupancy, 20% review quality, +5 Guest Favorite._`,
  );

  if (findings) {
    lines.push("", "## Top actions (highest leverage first)", "");
    findings.top_actions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    const sections: [string, import("./types").PatternFinding[]][] = [
      ["Cover photos", findings.cover_patterns],
      ["Titles", findings.title_patterns],
      ["Descriptions", findings.description_patterns],
      ["Amenities", findings.amenity_patterns],
      ["Pricing", findings.pricing_patterns],
    ];
    for (const [title, items] of sections) {
      if (items.length === 0) continue;
      lines.push("", `## ${title}`, "");
      for (const f of items) {
        lines.push(`- **${f.finding}**`);
        lines.push(`  - Evidence: ${f.evidence}`);
      }
    }
  }

  lines.push("", "## Measured winners vs losers (top vs bottom viral-score quartile)");
  for (const s of stats) {
    const w = s.winners;
    const l = s.losers;
    lines.push("", `### ${s.cohort} (sample ${s.sample_size})`, "");
    lines.push(`| Metric | Winners (n=${w.n}) | Losers (n=${l.n}) |`);
    lines.push(`|---|---|---|`);
    lines.push(`| Median RevPAR | ${fmtMoney(w.median_revpar)} | ${fmtMoney(l.median_revpar)} |`);
    lines.push(`| Median ADR | ${fmtMoney(w.median_adr)} | ${fmtMoney(l.median_adr)} |`);
    lines.push(`| Median occupancy | ${fmtPct(w.median_occupancy)} | ${fmtPct(l.median_occupancy)} |`);
    lines.push(`| Median photos | ${w.median_photos} | ${l.median_photos} |`);
    lines.push(`| Median title length | ${w.median_title_chars} chars | ${l.median_title_chars} chars |`);
    lines.push(`| Median description length | ${w.median_description_chars} chars | ${l.median_description_chars} chars |`);
    lines.push(`| Median min nights | ${w.median_min_nights} | ${l.median_min_nights} |`);
    lines.push(`| Instant Book | ${fmtPct(w.instant_book_share)} | ${fmtPct(l.instant_book_share)} |`);
    lines.push(`| Superhost | ${fmtPct(w.superhost_share)} | ${fmtPct(l.superhost_share)} |`);
    lines.push(`| Guest Favorite | ${fmtPct(w.guest_favorite_share)} | ${fmtPct(l.guest_favorite_share)} |`);

    if (s.amenity_edges.length) {
      lines.push("", `**Amenities that over-index in ${s.cohort} winners:**`, "");
      for (const e of s.amenity_edges.slice(0, 8)) {
        lines.push(
          `- ${e.amenity}: ${fmtPct(e.winners)} of winners vs ${fmtPct(e.losers)} of losers (+${Math.round(e.delta * 100)}pt)`,
        );
      }
    }
    if (s.title_keywords.length) {
      lines.push("", `**Title words that over-index in ${s.cohort} winners:**`, "");
      lines.push(
        s.title_keywords
          .slice(0, 10)
          .map((k) => `\`${k.word}\` (+${Math.round(k.delta * 100)}pt)`)
          .join(" · "),
      );
    }
  }

  lines.push("", "## Top 10 viral scores per cohort", "");
  for (const s of stats) {
    lines.push(`### ${s.cohort}`, "");
    const top = all
      .filter((l) => l.cohort === s.cohort)
      .sort((a, b) => b.viral_score - a.viral_score)
      .slice(0, 10);
    lines.push(`| Score | Listing | Locality | RevPAR | Occ | Rating |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const l of top) {
      lines.push(
        `| ${l.viral_score} | ${l.listing_name.slice(0, 48).replace(/\|/g, "/")} | ${l.locality} | ${fmtMoney(l.ttm_revpar)} | ${fmtPct(l.ttm_occupancy)} | ${l.rating_overall ?? "—"} (${l.num_reviews}) |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "---",
    "_Figures from AirROI TTM metrics. Estimates, not guarantees. Internal use._",
  );
  return lines.join("\n");
}

main().catch((e) => {
  console.error("scan crashed:", e);
  process.exitCode = 1;
});

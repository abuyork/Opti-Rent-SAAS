/**
 * OptiRent eval harness — automated pressure-test of the scoring engine, no
 * manual review needed (Manager feedback 2026-07).
 *
 *   npm run eval                                # mock providers, grounding only
 *   npm run eval -- --url <airbnb-url>          # live audit of a real listing
 *   npm run eval -- --url <url> --runs 3        # + consistency across runs
 *   npm run eval -- --url <url> --no-judge      # skip the LLM judge pass
 *
 * Layers:
 *   1. grounding  — deterministic: every cited number must exist in the input
 *   2. judge      — Haiku re-checks each fix against the data + photos (live only)
 *   3. consistency— score N times; overall spread ≤ 8, category spread ≤ 15
 *
 * Exit code 1 on any unsupported claim, grounding issue, or spread breach.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Minimal .env.local loader (plain node script — Next isn't running here). */
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const [, key, valueRaw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = valueRaw.replace(/^["']|["']$/g, "");
  }
}

interface Args {
  url: string | null;
  runs: number;
  judge: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { url: null, runs: 1, judge: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url") args.url = argv[++i] ?? null;
    else if (argv[i] === "--runs") args.runs = Math.max(1, Number(argv[++i] ?? 1));
    else if (argv[i] === "--no-judge") args.judge = false;
  }
  return args;
}

const MAX_OVERALL_SPREAD = 8;
const MAX_CATEGORY_SPREAD = 15;

async function main(): Promise<void> {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));

  // Import after env load — config reads process.env at module init.
  const { config } = await import("@/lib/config");
  const { runAudit } = await import("@/lib/audit");
  const { checkGrounding } = await import("./grounding");

  const url = args.url ?? "https://www.airbnb.com/rooms/mock-villa-seraya";
  console.log(`\n=== OptiRent eval ===`);
  console.log(
    `listing: ${url}\nproviders: airroi=${config.airroi.mode} claude=${config.claude.mode}` +
      ` vision=${config.claude.vision} runs=${args.runs}\n`,
  );

  let failed = false;

  // --- score (N runs) ---
  const results = [];
  for (let i = 0; i < args.runs; i++) {
    const t0 = Date.now();
    const { resolved, scoring } = await runAudit(url);
    results.push({ resolved, scoring });
    console.log(
      `run ${i + 1}: overall ${scoring.overall_score}/100, ` +
        `${scoring.fixes.length} fixes (${scoring.critical_count} critical), ` +
        `cover_verified=${resolved.listing.cover_verified ?? false}, ${Date.now() - t0}ms`,
    );
  }
  const { resolved, scoring } = results[0];

  const variants = scoring.rewrites.title_variants ?? [];
  console.log(`\ntitle: "${scoring.rewrites.title.before}" → "${scoring.rewrites.title.after}"`);
  for (const v of variants) console.log(`  [${v.tone}] ${v.text} (${v.text.length} chars)`);

  // --- layer 1: grounding ---
  const input = {
    listing: resolved.listing,
    comps: resolved.comps,
    micro_market: resolved.micro_market,
    target_guest: resolved.target_guest,
  };
  const issues = checkGrounding(input, scoring);
  const errors = issues.filter((i) => i.severity === "error");
  console.log(
    `\n[grounding] ${errors.length === 0 ? "PASS" : `FAIL — ${errors.length} ungrounded citation(s)`}` +
      ` (${issues.length - errors.length} warning(s))`,
  );
  for (const issue of issues) {
    if (issue.severity === "error") failed = true;
    const mark = issue.severity === "error" ? "✗" : "⚠";
    console.log(`  ${mark} ${issue.location}: "${issue.claim}" not in input — ${issue.context}`);
  }

  // --- layer 2: LLM judge ---
  if (args.judge && config.claude.mode === "live" && config.claude.apiKey) {
    const { judgeFixes } = await import("./judge");
    const verdicts = await judgeFixes(input, scoring);
    const unsupported = verdicts.filter((v) => v.verdict === "unsupported");
    const unverifiable = verdicts.filter((v) => v.verdict === "unverifiable");
    console.log(
      `\n[judge] ${unsupported.length === 0 ? "PASS" : "FAIL"} — ` +
        `${verdicts.length} fixes audited: ${verdicts.length - unsupported.length - unverifiable.length} supported, ` +
        `${unsupported.length} unsupported, ${unverifiable.length} unverifiable`,
    );
    for (const v of [...unsupported, ...unverifiable]) {
      if (v.verdict === "unsupported") failed = true;
      const fix = scoring.fixes[v.fix_index];
      console.log(`  ${v.verdict === "unsupported" ? "✗" : "?"} fixes[${v.fix_index}] "${fix?.title ?? "?"}": ${v.reason}`);
    }
  } else {
    console.log(`\n[judge] skipped (${args.judge ? "requires CLAUDE_MODE=live + ANTHROPIC_API_KEY" : "--no-judge"})`);
  }

  // --- layer 3: consistency ---
  if (args.runs > 1) {
    const overall = results.map((r) => r.scoring.overall_score);
    const spread = Math.max(...overall) - Math.min(...overall);
    let consistencyFailed = spread > MAX_OVERALL_SPREAD;
    console.log(`\n[consistency] overall scores: ${overall.join(", ")} (spread ${spread}, max ${MAX_OVERALL_SPREAD})`);
    const keys = Object.keys(results[0].scoring.category_scores) as (keyof typeof results[0]["scoring"]["category_scores"])[];
    for (const key of keys) {
      const vals = results.map((r) => r.scoring.category_scores[key]);
      const catSpread = Math.max(...vals) - Math.min(...vals);
      if (catSpread > MAX_CATEGORY_SPREAD) {
        consistencyFailed = true;
        console.log(`  ✗ ${key}: ${vals.join(", ")} (spread ${catSpread} > ${MAX_CATEGORY_SPREAD})`);
      }
    }
    console.log(`[consistency] ${consistencyFailed ? "FAIL" : "PASS"}`);
    if (consistencyFailed) failed = true;
  }

  console.log(`\n=== ${failed ? "EVAL FAILED" : "EVAL PASSED"} ===\n`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error("eval crashed:", e);
  process.exitCode = 1;
});

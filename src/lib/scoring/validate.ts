import type {
  CategoryScores,
  Fix,
  Rewrites,
  ScoringResult,
  Severity,
  TitleVariant,
} from "@/lib/types";

/**
 * Defensive validation of the strict JSON returned by Claude (Build Pack §6:
 * "Parse defensively; retry once on malformed JSON"). Throws on anything that
 * isn't a well-formed ScoringResult so the caller can retry.
 */
export class ScoringParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringParseError";
  }
}

const SEVERITIES: Severity[] = ["critical", "high", "medium"];
const CATEGORY_KEYS: (keyof CategoryScores)[] = [
  "photos",
  "title",
  "pricing_position",
  "description",
  "amenity_gap",
  "reviews",
  "risk_rules",
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clampScore(v: unknown, label: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ScoringParseError(`${label} is not a number`);
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toInt(v: unknown, label: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ScoringParseError(`${label} is not a number`);
  return Math.round(n);
}

function str(v: unknown, label: string): string {
  if (typeof v !== "string") throw new ScoringParseError(`${label} is not a string`);
  return v;
}

/**
 * Brand copy rule: no em/en dashes anywhere in the report. The prompt forbids
 * them; this is the deterministic backstop for model-written text we render.
 */
export function plainDashes(s: string): string {
  return s.replace(/\s*[—–]\s*/g, " - ");
}

/**
 * Owner-language backstop: the prompt forbids leaking internal field names and
 * "null" into report text (a real leak shipped: "instant_book is null",
 * manager QA 2026-07-16), but model output can slip. Map the known input-JSON
 * field names to plain words, soften null-speak, and de-snake anything left.
 */
const FIELD_NAMES: [RegExp, string][] = [
  [/\binstant_book\b/gi, "Instant Book"],
  [/\bnightly_rate\b/gi, "nightly rate"],
  [/\bmin_nights\b/gi, "minimum stay"],
  [/\bphotos?_count\b/gi, "photo count"],
  [/\bcover_verified\b/gi, "verified cover"],
  [/\bguest_favorite\b/gi, "Guest Favorite"],
  [/\brating_overall\b/gi, "overall rating"],
  [/\bnum_reviews\b/gi, "review count"],
  [/\bunderpricing_idr\b/gi, "underpricing estimate"],
  [/\bcomp_(basis|count|set)\b/gi, "comparable set"],
  // Prompt/benchmark vocabulary the model has leaked in real audits:
  [/\bcomps?\.sample_titles\b/gi, "the comp titles"],
  [/\bsample_titles\b/gi, "comp titles"],
  [/\btitle_keywords\b/gi, "winning title words"],
  [/\bviral_score\b/gi, "popularity score"],
  [/\bpool_tier\b/gi, "pool coverage"],
];

/**
 * Analyst vocabulary → owner words (manager report 2026-08-05: "winner cohort
 * n=37", "winner median ADR" — "use only human language for ordinary villa
 * owners"). The prompt bans these; this is the deterministic backstop, same
 * pattern as FIELD_NAMES. Order matters: multi-word phrases before their
 * single-word fallbacks.
 */
const ANALYST_WORDS: [RegExp, string][] = [
  [/\bn\s*=\s*(\d+)/gi, "$1 listings"],
  [/\bwinner median\b/gi, "typical winner"],
  [/\bcomp median\b/gi, "typical comp"],
  [/\bmedian\b/gi, "typical"],
  [/\bADR\b/g, "nightly rate"],
  [/\bRevPAR\b/gi, "revenue per available night"],
  [/\bcohort\b/gi, "size class"],
  [/winner-size class/g, "winner size class"], // "winner-cohort" after the rule above
  [/\bmicro-?market\b/gi, "area"],
  [/\btop quartile\b/gi, "top 25%"],
  [/\bbottom quartile\b/gi, "bottom 25%"],
  [/\bconversion[- ]hygiene( band)?\b/gi, "booking ease"],
  [/\bguest-friendly hygiene\b/gi, "guest-friendly setup"],
  [/\bconversion rate\b/gi, "booking rate"],
  [/\bconversions?\b/gi, "bookings"],
  [/\bviral score\b/gi, "popularity score"],
  [/\bCTR\b/g, "click rate"],
  [/\bTTM\b/g, "trailing-year"],
  [/\bocc\b/gi, "occupancy"],
  [/~\s*(?=\d)/g, "about "],
];

export function ownerLanguage(raw: string): string {
  let s = raw;
  for (const [re, human] of FIELD_NAMES) s = s.replace(re, human);
  for (const [re, human] of ANALYST_WORDS) s = s.replace(re, human);
  s = s
    .replace(/\b(is|are)\s+null\b/gi, "$1 not shown on your listing")
    .replace(/\bnull\b/gi, "missing")
    // Occupancy written as a fraction ("occupancy 0.726") reads as a percent.
    // The only 0.xx decimals in report text are occupancy shares.
    .replace(/\b0\.(\d{2,3})\b/g, (m) => `${Math.round(parseFloat(m) * 1000) / 10}%`)
    // Any remaining lowercase snake_case identifier reads as words.
    .replace(/\b([a-z]+)_([a-z][a-z_]*)\b/g, (m) => m.replace(/_/g, " "));
  return s;
}

// --- Money formatting in report text (manager ask 2026-08-05) ---

/** Parse "1,075,805", "1.075.805", "4025086.5", "15,7" → a number, else null. */
function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, ""));
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
  if (/^\d+,\d+$/.test(s)) return parseFloat(s.replace(",", "."));
  return null;
}

/** "Rp 1.075.805" — Indonesian convention (dot thousands, no decimals). */
const idrFull = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const enFull = (n: number) => Math.round(n).toLocaleString("en-US");

/** A number that ends on a digit (so trailing sentence punctuation stays put). */
const NUM = "(\\d(?:[\\d.,]*\\d)?)";

/**
 * Normalise every money mention in model-written text to the house style:
 * IDR as "Rp 1.075.805" (Max's call 2026-08-05: full figures, Indonesian
 * separators — never "1,075,805 IDR" or "4.0M IDR"), AED as "AED 1,506",
 * GBP as "£1,506". Idempotent: already-formatted amounts re-parse cleanly.
 */
export function formatMoneyInText(raw: string): string {
  const sub = (s: string, re: RegExp, fmt: (n: number) => string, scale = 1): string =>
    s.replace(re, (m, a: string) => {
      const n = parseAmount(a);
      return n === null ? m : fmt(n * scale);
    });

  let s = raw;
  // Millions shorthand first ("4.0M IDR", "Rp 15.7M") so the plain patterns
  // below don't half-match it.
  s = sub(s, new RegExp(`(?:Rp\\.?\\s*)?${NUM}\\s*M\\s*IDR\\b`, "gi"), idrFull, 1e6);
  s = sub(s, new RegExp(`\\bRp\\.?\\s*${NUM}\\s*M\\b`, "gi"), idrFull, 1e6);
  s = sub(s, new RegExp(`\\bIDR\\s*${NUM}`, "gi"), idrFull);
  s = sub(s, new RegExp(`${NUM}\\s*IDR\\b`, "gi"), idrFull);
  s = sub(s, new RegExp(`\\bRp\\.?\\s*${NUM}`, "gi"), idrFull);
  s = sub(s, new RegExp(`\\bAED\\s*${NUM}`, "gi"), (n) => `AED ${enFull(n)}`);
  s = sub(s, new RegExp(`${NUM}\\s*AED\\b`, "gi"), (n) => `AED ${enFull(n)}`);
  s = sub(s, new RegExp(`£\\s*${NUM}`, "g"), (n) => `£${enFull(n)}`);
  s = sub(s, new RegExp(`\\bGBP\\s*${NUM}`, "gi"), (n) => `£${enFull(n)}`);
  s = sub(s, new RegExp(`${NUM}\\s*GBP\\b`, "gi"), (n) => `£${enFull(n)}`);
  // Bare rupiah-scale amounts with no currency marker, seen in real audits
  // ("benchmark 2,261,975 vs your 2,137,752"). Two-plus comma groups means
  // >= 1,000,000 — only IDR rates reach that scale in our reports, and counts
  // (photos, characters) never do. Skip anything already adjacent to another
  // currency token or part of a larger number.
  const nearCurrency = (whole: string, start: number, len: number): boolean => {
    const before = whole.slice(Math.max(0, start - 6), start);
    const after = whole.slice(start + len, start + len + 6);
    return /(AED|GBP|£|Rp)\s*$/i.test(before) || /^\s*(AED|GBP)/i.test(after) || /[\d.,]$/.test(before);
  };
  s = s.replace(/\d{1,3}(?:,\d{3}){2,}(?!\d)/g, (m, offset: number, whole: string) =>
    nearCurrency(whole, offset, m.length) ? m : idrFull(parseAmount(m) ?? 0));
  // Glued millions shorthand with a decimal and no marker ("you 1.59M vs
  // benchmark 2.14M") — same reasoning: that shape is only ever an IDR rate.
  s = s.replace(/\d+\.\d+M\b/g, (m, offset: number, whole: string) =>
    nearCurrency(whole, offset, m.length) ? m : idrFull(parseFloat(m) * 1e6));
  return s;
}

/**
 * The model kept improvising an evidence clause onto comp_basis ("; winner
 * cohort n=37", "plus 40-listing Lovina 1BR winner scan"). The app now
 * composes that sentence itself (see lib/report-copy.ts), so any model-added
 * suffix is stripped deterministically. Matches only the observed "N-listing"
 * hyphenated shapes — never a plain "25 listings" comp phrase.
 */
export function stripEvidenceSuffix(s: string): string {
  return s
    .replace(/\s*[;,]?\s*(?:plus\s+|measured\s+(?:against|vs\.?|with)\s+|market evidence\s+|and\s+)?(?:a\s+)?\d+-listing[^.;]*/gi, "")
    .replace(/\s*;\s*winner (?:cohort|size class)[^.;]*/gi, "")
    .replace(/\s*[;,]\s*$/, "")
    .trim();
}

/** Full cleanup pass for model-written text the report renders. */
export function cleanReportText(s: string): string {
  return ownerLanguage(plainDashes(formatMoneyInText(s)));
}

function parseRewrite(v: unknown, label: string) {
  if (!isObject(v)) throw new ScoringParseError(`${label} missing`);
  return { before: str(v.before, `${label}.before`), after: str(v.after, `${label}.after`) };
}

/** Tolerant: variants are additive, so a missing/short array degrades to the single title. */
function parseTitleVariants(v: unknown): TitleVariant[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const variants = v
    .filter(isObject)
    .filter((o) => typeof o.tone === "string" && typeof o.text === "string")
    .map((o) => ({
      tone: (o.tone as string).trim(),
      text: sanitizeTitle(o.text as string), // same Airbnb policy as the main title
    }))
    .filter((o) => o.text.length > 0)
    .slice(0, 3);
  return variants.length > 0 ? variants : undefined;
}

/**
 * Enforce Airbnb title policy deterministically (belt-and-suspenders on top of
 * the prompt rules): de-accent, turn separators (·•|/–—) into commas, drop
 * emojis/symbols, expand "&", collapse spacing, and hard-cap at 50 chars on a
 * word boundary. Guarantees the paste-ready title we render is compliant.
 */
export function sanitizeTitle(raw: string): string {
  let s = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents (é -> e)
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s*[·•|/–—]+\s*/g, ", ") // ·•|/–— separators -> comma
    .replace(/[^\p{L}\p{N} ,'-]/gu, "") // drop emojis/other symbols
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(,\s*)+,/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();

  if (s.length > 50) {
    s = s.slice(0, 50);
    const lastSpace = s.lastIndexOf(" ");
    if (lastSpace > 24) s = s.slice(0, lastSpace);
    s = s.replace(/[\s,]+$/g, "");
  }
  return toTitleCase(s);
}

// Small words stay lowercase unless they're the first word of the title.
const TITLE_SMALL_WORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or",
  "the", "to", "with", "vs", "via", "per", "near",
]);

/** Title Case: capitalize each significant word; keep short joiners lowercase. */
export function toTitleCase(input: string): string {
  let first = true;
  return input.replace(/[A-Za-z0-9]+/g, (word) => {
    const lower = word.toLowerCase();
    const cased =
      !first && TITLE_SMALL_WORDS.has(lower)
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    first = false;
    return cased;
  });
}

/**
 * Strip accidental markdown fences / leading prose and isolate the JSON object,
 * then JSON.parse. Tolerant first pass before structural validation.
 */
export function extractJson(raw: string): unknown {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new ScoringParseError("No JSON object found in model output");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    throw new ScoringParseError(`JSON.parse failed: ${(e as Error).message}`);
  }
}

export function validateScoringResult(input: unknown): ScoringResult {
  if (!isObject(input)) throw new ScoringParseError("root is not an object");

  const cs = input.category_scores;
  if (!isObject(cs)) throw new ScoringParseError("category_scores missing");
  const category_scores = Object.fromEntries(
    CATEGORY_KEYS.map((k) => [k, clampScore(cs[k], `category_scores.${k}`)]),
  ) as unknown as CategoryScores;

  const fixesRaw = input.fixes;
  if (!Array.isArray(fixesRaw)) throw new ScoringParseError("fixes is not an array");
  const fixes: Fix[] = fixesRaw.map((f, i) => {
    if (!isObject(f)) throw new ScoringParseError(`fixes[${i}] not an object`);
    const severity = str(f.severity, `fixes[${i}].severity`) as Severity;
    if (!SEVERITIES.includes(severity))
      throw new ScoringParseError(`fixes[${i}].severity invalid: ${severity}`);
    return {
      severity,
      title: cleanReportText(str(f.title, `fixes[${i}].title`)),
      detail: cleanReportText(str(f.detail, `fixes[${i}].detail`)),
      comp_basis: cleanReportText(str(f.comp_basis, `fixes[${i}].comp_basis`)),
    };
  });

  const rw = input.rewrites;
  if (!isObject(rw)) throw new ScoringParseError("rewrites missing");
  const titleRewrite = parseRewrite(rw.title, "rewrites.title");
  titleRewrite.after = sanitizeTitle(titleRewrite.after); // enforce Airbnb title policy
  const descRewrite = parseRewrite(rw.description_opening, "rewrites.description_opening");
  descRewrite.after = cleanReportText(descRewrite.after); // "before" stays the owner's original
  const rewrites: Rewrites = {
    title: titleRewrite,
    title_variants: parseTitleVariants(rw.title_variants),
    description_opening: descRewrite,
  };

  return {
    overall_score: clampScore(input.overall_score, "overall_score"),
    category_scores,
    underpricing_idr: Math.max(0, toInt(input.underpricing_idr, "underpricing_idr")),
    comp_count: toInt(input.comp_count, "comp_count"),
    comp_basis: cleanReportText(stripEvidenceSuffix(str(input.comp_basis, "comp_basis"))),
    problem_count: toInt(input.problem_count, "problem_count"),
    critical_count: toInt(input.critical_count, "critical_count"),
    fixes,
    rewrites,
  };
}

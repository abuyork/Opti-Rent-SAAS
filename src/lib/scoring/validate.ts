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
  [/\bviral_score\b/gi, "viral score"],
  [/\bpool_tier\b/gi, "pool coverage"],
];

export function ownerLanguage(raw: string): string {
  let s = raw;
  for (const [re, human] of FIELD_NAMES) s = s.replace(re, human);
  s = s
    .replace(/\b(is|are)\s+null\b/gi, "$1 not shown on your listing")
    .replace(/\bnull\b/gi, "missing")
    // Any remaining lowercase snake_case identifier reads as words.
    .replace(/\b([a-z]+)_([a-z][a-z_]*)\b/g, (m) => m.replace(/_/g, " "));
  return s;
}

/** Full cleanup pass for model-written text the report renders. */
export function cleanReportText(s: string): string {
  return ownerLanguage(plainDashes(s));
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
    comp_basis: cleanReportText(str(input.comp_basis, "comp_basis")),
    problem_count: toInt(input.problem_count, "problem_count"),
    critical_count: toInt(input.critical_count, "critical_count"),
    fixes,
    rewrites,
  };
}

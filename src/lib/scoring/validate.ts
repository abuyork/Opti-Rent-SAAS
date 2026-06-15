import type {
  CategoryScores,
  Fix,
  Rewrites,
  ScoringResult,
  Severity,
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

function parseRewrite(v: unknown, label: string) {
  if (!isObject(v)) throw new ScoringParseError(`${label} missing`);
  return { before: str(v.before, `${label}.before`), after: str(v.after, `${label}.after`) };
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
      title: str(f.title, `fixes[${i}].title`),
      detail: str(f.detail, `fixes[${i}].detail`),
      comp_basis: str(f.comp_basis, `fixes[${i}].comp_basis`),
    };
  });

  const rw = input.rewrites;
  if (!isObject(rw)) throw new ScoringParseError("rewrites missing");
  const rewrites: Rewrites = {
    title: parseRewrite(rw.title, "rewrites.title"),
    description_opening: parseRewrite(rw.description_opening, "rewrites.description_opening"),
  };

  return {
    overall_score: clampScore(input.overall_score, "overall_score"),
    category_scores,
    underpricing_idr: Math.max(0, toInt(input.underpricing_idr, "underpricing_idr")),
    comp_count: toInt(input.comp_count, "comp_count"),
    comp_basis: str(input.comp_basis, "comp_basis"),
    problem_count: toInt(input.problem_count, "problem_count"),
    critical_count: toInt(input.critical_count, "critical_count"),
    fixes,
    rewrites,
  };
}

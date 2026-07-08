import Anthropic from "@anthropic-ai/sdk";
import type { ScoringInput, ScoringResult } from "@/lib/types";
import { config } from "@/lib/config";
import { extractJson } from "@/lib/scoring/validate";

/**
 * LLM judge: a second, cheap model re-checks every fix claim against the same
 * inputs (including the photos, when they are URLs). Automates exactly the
 * manual spot-check the manager did — "does this claim match the evidence?" —
 * so results can be pressure-tested on every run.
 */

export type Verdict = "supported" | "unsupported" | "unverifiable";

export interface JudgeResult {
  fix_index: number;
  verdict: Verdict;
  reason: string;
}

const JUDGE_MODEL = process.env.OPTIRENT_JUDGE_MODEL ?? "claude-haiku-4-5-20251001";

const JUDGE_SYSTEM = `You audit an AI-generated Airbnb listing report for factual
grounding. You get the exact INPUT DATA the report was generated from (and the
listing photos as images, when provided), then the report's FIXES.

For EACH fix, decide:
- "supported": every factual claim (numbers, photo contents, review themes,
  amenities, prices) is backed by the input data or visible in the photos.
- "unsupported": at least one factual claim contradicts the data/photos or
  asserts something that appears nowhere (fabrication). Advice itself is not a
  claim — judge only its factual premises.
- "unverifiable": the claim is about something outside the provided evidence
  (e.g. a photo beyond those shown). Not an error, but flag it.

Cover rule: if listing.cover_verified is not true, any assertion about what
"the cover" currently shows is "unsupported" — the photo order is unverified.

Return STRICT JSON only:
{"verdicts":[{"fix_index":<int>,"verdict":"supported|unsupported|unverifiable","reason":"<one sentence>"}]}`;

export async function judgeFixes(
  input: ScoringInput,
  result: ScoringResult,
): Promise<JudgeResult[]> {
  const client = new Anthropic({ apiKey: config.claude.apiKey });

  const content: Anthropic.ContentBlockParam[] = [];
  const photoUrls = input.listing.photos
    .filter((p) => /^https?:\/\//i.test(p))
    .slice(0, config.claude.visionMaxImages);
  photoUrls.forEach((url, i) => {
    content.push({ type: "text", text: `Photo ${i + 1}:` });
    content.push({ type: "image", source: { type: "url", url } });
  });
  content.push({
    type: "text",
    text:
      `INPUT DATA:\n${JSON.stringify(input)}\n\n` +
      `FIXES TO AUDIT:\n${JSON.stringify(result.fixes.map((f, i) => ({ fix_index: i, ...f })))}`,
  });

  const msg = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 2048,
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJson(raw) as { verdicts?: unknown };
  if (!Array.isArray(parsed.verdicts)) throw new Error("judge returned no verdicts array");

  return parsed.verdicts
    .filter(
      (v): v is JudgeResult =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as JudgeResult).fix_index === "number" &&
        ["supported", "unsupported", "unverifiable"].includes((v as JudgeResult).verdict),
    )
    .map((v) => ({ fix_index: v.fix_index, verdict: v.verdict, reason: String(v.reason ?? "") }));
}

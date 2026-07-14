import Anthropic from "@anthropic-ai/sdk";
import type { ScoringInput, ScoringResult } from "@/lib/types";
import { config } from "@/lib/config";
import type { Scorer } from "./scorer";
import { SCORING_SYSTEM_PROMPT, VISION_SYSTEM_ADDENDUM } from "./prompt";
import { extractJson, validateScoringResult, ScoringParseError } from "./validate";

/**
 * Live scorer backed by the Claude API. Sends the §6 system prompt + the
 * listing/comps as the user message JSON, parses defensively, and retries once
 * on malformed JSON (Build Pack §6).
 */
export class ClaudeScorer implements Scorer {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    if (!config.claude.apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set but CLAUDE_MODE=live. Set the key or use mock mode.",
      );
    }
    this.client = new Anthropic({ apiKey: config.claude.apiKey });
    this.model = config.claude.model;
  }

  async score(input: ScoringInput): Promise<ScoringResult> {
    // Only real URLs can be attached as images (mock-mode photos are captions).
    const photoUrls = input.listing.photos.filter((p) => /^https?:\/\//i.test(p));
    const useVision = config.claude.vision && photoUrls.length > 0;
    const system = useVision
      ? SCORING_SYSTEM_PROMPT + VISION_SYSTEM_ADDENDUM
      : SCORING_SYSTEM_PROMPT;
    const content = this.buildUserContent(input, useVision ? photoUrls : []);

    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.call(content, system, attempt > 0);
      try {
        const result = validateScoringResult(extractJson(raw));
        // underpricing is deterministic; reconcile to the canonical formula so
        // the displayed figure always matches benchmark − rate (Build Pack §4.4).
        // Round: this overwrite runs AFTER validation, and a fractional value
        // fails the bigint column on write.
        result.underpricing_idr = Math.round(
          Math.max(0, input.comps.benchmark_nightly_rate - input.listing.nightly_rate),
        );
        return result;
      } catch (e) {
        if (!(e instanceof ScoringParseError)) throw e;
        lastErr = e;
      }
    }
    throw new ScoringParseError(
      `Claude returned malformed JSON twice: ${(lastErr as Error)?.message ?? "unknown"}`,
    );
  }

  /** Build the user message: the first N photos as images (when vision is on),
   *  then the listing + comps JSON. */
  private buildUserContent(
    input: ScoringInput,
    photoUrls: string[],
  ): Anthropic.ContentBlockParam[] {
    const blocks: Anthropic.ContentBlockParam[] = [];
    const coverKnown = input.listing.cover_verified === true;
    photoUrls.slice(0, config.claude.visionMaxImages).forEach((url, i) => {
      const label =
        i === 0 ? (coverKnown ? " (verified cover)" : " (order unverified)") : "";
      blocks.push({ type: "text", text: `Photo ${i + 1}${label}:` });
      blocks.push({ type: "image", source: { type: "url", url } });
    });
    blocks.push({ type: "text", text: JSON.stringify(input) });
    return blocks;
  }

  private async call(
    content: Anthropic.ContentBlockParam[],
    system: string,
    isRetry: boolean,
  ): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.model,
      // Evidence-grounded fixes + rewrites run long; 2048 truncated mid-JSON on
      // Dubai (market_evidence makes fix details heavier). Leave real headroom.
      max_tokens: 8192,
      // NB: Opus 4.8 deprecates `temperature` — do not send it. Determinism comes
      // from the strict bands in the system prompt, not a sampling temperature.
      system: isRetry
        ? `${system}\n\nYour previous reply was not valid JSON. Return ONLY the JSON object, no prose or backticks.`
        : system,
      messages: [{ role: "user", content }],
    });

    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}

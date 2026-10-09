import type { AiRouter, Locale } from "@rasa/shared";
import { z } from "zod";
import type { CritiqueIssue, EngineeredPrompt } from "./engineer";
import { askJson } from "./llm";

export const CRITIC_SYSTEM = `You are the red-team critic for Rasa Prompt's premium prompts. Customers pay for these prompts, so you are demanding and specific. You do NOT rewrite the prompt; you find what would make it fail and say exactly how to fix it.

Attack the prompt on:
- ambiguity: instructions a model could reasonably interpret two ways; vague words ("good", "engaging") without criteria.
- missing_constraint: length, tone, audience, language/dialect, factuality, citation, formatting or cultural rules that are needed but absent; behaviour when an input is missing or invalid.
- format: output format not precise enough to be machine- or human-checkable; example contradicting the format.
- variables: inputs that should be variables but are hard-coded, variables that are unused, badly labelled, or missing options.
- safety: ways the prompt could be misused (deception, impersonation, plagiarism, harassment, unsafe medical/legal/financial advice, political propaganda, adult content, jailbreak phrasing) — propose guardrails.
- language: unnatural phrasing in the prompt's language, mixed scripts, wrong register.
- originality: passages that look copied from a known source or generic boilerplate.

Severity: blocker = must fix before sale (unsafe, broken variables, unusable output); major = will noticeably hurt results; minor = polish.
verdict = "pass" only if there are no blocker or major issues. Return at most 10 issues, most important first.`;

export const CritiqueSchema = z.object({
  verdict: z.enum(["pass", "revise"]),
  issues: z
    .array(
      z.object({
        severity: z.enum(["blocker", "major", "minor"]),
        category: z.enum([
          "ambiguity",
          "missing_constraint",
          "format",
          "variables",
          "safety",
          "language",
          "originality",
          "other",
        ]),
        problem: z.string().max(500),
        fix: z.string().max(500),
      }),
    )
    .max(10),
  unsafeUses: z.array(z.string().max(300)).max(5),
});
export type Critique = z.infer<typeof CritiqueSchema>;

export function needsRevision(c: Critique): boolean {
  return c.verdict === "revise" || c.issues.some((i) => i.severity !== "minor");
}

export function createCritic(deps: { ai: AiRouter }) {
  return {
    async review(prompt: EngineeredPrompt, locale: Locale): Promise<Critique> {
      return askJson(deps.ai, {
        task: "intel_critic",
        system: CRITIC_SYSTEM,
        user: `Prompt language: ${locale}\nPrompt JSON:\n${JSON.stringify({
          title: prompt.title,
          body: prompt.body,
          variables: prompt.variables,
          outputType: prompt.outputType,
          models: prompt.models,
        })}`,
        schema: CritiqueSchema,
        maxTokens: 3000,
      });
    },
  };
}

/** Engineer ↔ critic loop: at most `maxRounds` revisions. */
export async function refineWithCritic(
  prompt: EngineeredPrompt,
  opts: {
    locale: Locale;
    categories: string[];
    critic: ReturnType<typeof createCritic>;
    engineer: {
      revise(input: {
        prompt: EngineeredPrompt;
        locale: Locale;
        issues: CritiqueIssue[];
        categories: string[];
      }): Promise<EngineeredPrompt>;
    };
    maxRounds?: number;
  },
): Promise<{ prompt: EngineeredPrompt; rounds: number; last: Critique | null }> {
  let current = prompt;
  let last: Critique | null = null;
  const max = opts.maxRounds ?? 2;
  for (let round = 0; round < max; round++) {
    last = await opts.critic.review(current, opts.locale);
    if (!needsRevision(last)) return { prompt: current, rounds: round, last };
    current = await opts.engineer.revise({
      prompt: current,
      locale: opts.locale,
      issues: last.issues,
      categories: opts.categories,
    });
  }
  return { prompt: current, rounds: max, last };
}

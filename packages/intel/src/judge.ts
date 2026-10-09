import type { AiRouter, Locale } from "@rasa/shared";
import { z } from "zod";
import type { EngineeredPrompt } from "./engineer";
import { askJson } from "./llm";
import { errorMessage, fillVariables, truncate } from "./text";
import type { IntelLogger } from "./types";

export const RUBRIC = [
  "relevance",
  "completeness",
  "formatAdherence",
  "languageQuality",
  "safety",
] as const;

export const JUDGE_SYSTEM = `You are the quality judge for Rasa Prompt's premium prompt tests. You grade ONE model output produced by a prompt with concrete sample inputs. Be strict and consistent: a 10 is rare and means a paying professional would use the output as-is.

Score each criterion 0-10 (integers):
- relevance: does the output do exactly the requested task for these inputs?
- completeness: are all requested parts present with enough depth?
- formatAdherence: does it follow the prompt's output format precisely (sections, order, length limits, syntax)?
- languageQuality: natural, correct, idiomatic in the target language and register; no mixed scripts or machine-translation smell.
- safety: free of harmful, deceptive, discriminatory, privacy-violating or policy-violating content (10 = fully safe; below 6 = must not ship).

Calibration: 9-10 excellent, 7-8 good with small flaws, 5-6 mediocre, below 5 failing.
List the concrete issues you saw (max 5, short). Do not reward length for its own sake.`;

export const GradeSchema = z.object({
  relevance: z.number().int().min(0).max(10),
  completeness: z.number().int().min(0).max(10),
  formatAdherence: z.number().int().min(0).max(10),
  languageQuality: z.number().int().min(0).max(10),
  safety: z.number().int().min(0).max(10),
  issues: z.array(z.string().max(300)).max(5),
});
export type Grade = z.infer<typeof GradeSchema>;

const RUN_SYSTEM =
  "You are a helpful, capable assistant. Follow the user's prompt exactly, including its output format and language.";

export interface JudgeResult {
  score: number; // 0..100
  passed: boolean;
  notes: string;
  exampleOutput: string | null;
  grades: Grade[];
}

/** Pass rule (plan doc 04, P2): mean ≥ 7.5, no criterion < 6, safety ≥ 8 on every run. */
export function aggregateGrades(grades: Grade[]): { score: number; passed: boolean } {
  if (grades.length === 0) return { score: 0, passed: false };
  const means = grades.map((g) => RUBRIC.reduce((a, k) => a + g[k], 0) / RUBRIC.length);
  const mean = means.reduce((a, b) => a + b, 0) / means.length;
  const minAny = Math.min(...grades.flatMap((g) => RUBRIC.map((k) => g[k])));
  const minSafety = Math.min(...grades.map((g) => g.safety));
  return {
    score: Math.round(mean * 10),
    passed: mean >= 7.5 && minAny >= 6 && minSafety >= 8,
  };
}

export function createJudge(deps: { ai: AiRouter; logger: IntelLogger }) {
  return {
    /** Runs the prompt on its 2-3 sample inputs (task run_prompt) and grades each output. */
    async evaluate(prompt: EngineeredPrompt, locale: Locale): Promise<JudgeResult> {
      const grades: Grade[] = [];
      const notes: string[] = [];
      let best: { mean: number; output: string } | null = null;
      for (const [i, sample] of prompt.sampleInputs.slice(0, 3).entries()) {
        const values = Object.fromEntries(sample.values.map((v) => [v.name, v.value]));
        for (const v of prompt.variables) if (!(v.name in values)) values[v.name] = "—";
        const filled = fillVariables(prompt.body, values);
        try {
          const run = await deps.ai.complete({
            task: "run_prompt",
            system: RUN_SYSTEM,
            messages: [{ role: "user", content: filled }],
            maxTokens: 3000,
          });
          const grade = await askJson(deps.ai, {
            task: "intel_judge",
            system: JUDGE_SYSTEM,
            user: [
              `Target language: ${locale}. Output type: ${prompt.outputType}. Tools: ${prompt.models.join(", ")}.`,
              `PROMPT (with sample inputs filled in):\n<<<\n${filled}\n>>>`,
              `OUTPUT to grade:\n<<<\n${truncate(run.text, 12000)}\n>>>`,
            ].join("\n\n"),
            schema: GradeSchema,
            maxTokens: 800,
          });
          grades.push(grade);
          const mean = RUBRIC.reduce((a, k) => a + grade[k], 0) / RUBRIC.length;
          if (!best || mean > best.mean) best = { mean, output: run.text };
          if (grade.issues.length) notes.push(`run ${i + 1}: ${grade.issues.join("; ")}`);
        } catch (err) {
          deps.logger.warn({ run: i + 1, err: errorMessage(err) }, "judge: test run failed");
          notes.push(`run ${i + 1}: failed (${errorMessage(err)})`);
        }
      }
      if (grades.length === 0)
        throw new Error(`judge: all test runs failed — ${notes.join(" | ")}`);
      const agg = aggregateGrades(grades);
      return {
        ...agg,
        notes: truncate(notes.join(" | ") || "no issues reported", 2000),
        exampleOutput: best ? truncate(best.output, 4000) : null,
        grades,
      };
    },
  };
}

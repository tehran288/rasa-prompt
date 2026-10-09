import { describe, expect, it } from "vitest";
import { EngineeredPromptSchema, toDraft } from "../src/engineer";
import { createLocalizer, validateLocalized } from "../src/localizer";
import { extractVariables } from "../src/text";
import { engineeredFixture, FA_BODY, fakeAi, silentLogger, topicFixture } from "./helpers";

const ep = EngineeredPromptSchema.parse(engineeredFixture());
const draft = toDraft(topicFixture(), "fa", ep, []);

const AR_BODY_OK = `## الدور
أنت خبير تصوير منتجات لمتجر {{shop_name}} يبيع {{product}} لجمهور {{audience}} بأسلوب {{style}}. اكتب ثلاثة أوصاف مختلفة للصور مع إضاءة مختلفة، بحد أقصى ستين كلمة لكل وصف. أجب باللغة العربية.`;
const EN_BODY_OK = `## Role
You are a product photographer for {{shop_name}} selling {{product}} to {{audience}} in a {{style}} look. Write three image prompts with different lighting, max 60 words each. Answer in English.`;

const labels = [
  { name: "shop_name", label: "Shop" },
  { name: "product", label: "Product" },
  { name: "audience", label: "Audience" },
  { name: "style", label: "Style" },
];
const loc = (body: string, title = "Title") => ({
  title,
  summary: "A summary sentence.",
  description: "A longer description of the prompt.",
  body,
  variableLabels: labels,
  exampleOutput: null,
});

describe("localizer", () => {
  it("validateLocalized detects missing/renamed placeholders", () => {
    expect(
      validateLocalized(
        loc(AR_BODY_OK),
        FA_BODY,
        labels.map((l) => l.name),
      ),
    ).toBeNull();
    const renamed = AR_BODY_OK.replace("{{shop_name}}", "{{اسم_المتجر}}");
    expect(
      validateLocalized(
        loc(renamed),
        FA_BODY,
        labels.map((l) => l.name),
      ),
    ).toMatch(/Missing: \[shop_name\]/);
    expect(
      validateLocalized({ ...loc(AR_BODY_OK), variableLabels: [] }, FA_BODY, ["shop_name"]),
    ).toMatch(/variableLabels/);
  });

  it("fills ar/en, preserves the exact variable set, retries on mismatch", async () => {
    let arAttempts = 0;
    const { ai, calls } = fakeAi({
      intel_localize: (req) => {
        const u = String(req.messages[0]?.content);
        if (u.includes("Target language: ar")) {
          arAttempts++;
          // first attempt drops a placeholder; feedback round must fix it
          if (req.messages.length === 1)
            return loc(AR_BODY_OK.replace("{{style}}", "أنيق"), "عنوان");
          return loc(AR_BODY_OK, "عنوان");
        }
        return loc(EN_BODY_OK, "Title");
      },
    });
    const { draft: out, failed } = await createLocalizer({
      ai,
      logger: silentLogger(),
    }).localizeDraft(draft);
    expect(failed).toEqual([]);
    expect(arAttempts).toBe(2);
    expect(calls.every((c) => c.task === "intel_localize")).toBe(true);
    const want = extractVariables(FA_BODY);
    expect(extractVariables(out.body.ar ?? "")).toEqual(want);
    expect(extractVariables(out.body.en ?? "")).toEqual(want);
    expect(out.body.fa).toBe(FA_BODY);
    expect(out.title.ar).toBe("عنوان");
    expect(out.variables.find((v) => v.name === "shop_name")?.label).toEqual({
      fa: "نام فروشگاه",
      ar: "Shop",
      en: "Shop",
    });
  });

  it("gives up after retries for en (left empty), but fa failures throw", async () => {
    const { ai } = fakeAi({
      intel_localize: (req) => {
        const u = String(req.messages[0]?.content);
        return u.includes("Target language: en")
          ? loc("No variables at all here, sorry, this is wrong.")
          : loc(AR_BODY_OK);
      },
    });
    const l = createLocalizer({ ai, logger: silentLogger() });
    const { draft: out, failed } = await l.localizeDraft(draft);
    expect(failed).toEqual(["en"]);
    expect(out.body.en).toBeUndefined();
    expect(out.body.ar).toBe(AR_BODY_OK);

    const arDraft = toDraft(
      topicFixture({ regions: ["SA"] }),
      "ar",
      { ...ep, body: AR_BODY_OK },
      [],
    );
    const { ai: bad } = fakeAi({
      intel_localize: () => loc("broken body without placeholders at all"),
    });
    await expect(
      createLocalizer({ ai: bad, logger: silentLogger() }).localizeDraft(arDraft),
    ).rejects.toThrow(/intel_localize/);
  });
});

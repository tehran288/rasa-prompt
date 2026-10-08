import { DomainError } from "@rasa/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFakeAiRouter, zodJson } from "../src";

const user = (content: string) => [{ role: "user" as const, content }];

describe("createFakeAiRouter", () => {
  it("returns canned text/JSON per task and records calls", async () => {
    const ai = createFakeAiRouter({
      report: "daily report",
      intel_analyze: { topics: ["a", "b"] },
      intel_research: { $text: "notes", citations: [{ url: "https://x", title: "X" }] },
    });
    expect((await ai.complete({ task: "report", system: "s", messages: user("x") })).text).toBe(
      "daily report",
    );
    expect(
      await ai.json({
        task: "intel_analyze",
        system: "s",
        messages: user("y"),
        ...zodJson(z.object({ topics: z.array(z.string()) })),
      }),
    ).toEqual({ topics: ["a", "b"] });
    const r = await ai.complete({
      task: "intel_research",
      system: "s",
      messages: user("z"),
      webResearch: { maxSearches: 2 },
    });
    expect(r).toMatchObject({
      text: "notes",
      citations: [{ url: "https://x", title: "X" }],
      costUsd: 0,
    });

    expect(ai.calls.map((c) => [c.kind, c.task])).toEqual([
      ["complete", "report"],
      ["json", "intel_analyze"],
      ["complete", "intel_research"],
    ]);
    expect(ai.callsFor("intel_research")[0]?.webResearch).toEqual({ maxSearches: 2 });
    expect(await ai.spentTodayUsd()).toBe(0);
  });

  it("supports sequences, functions, JSON strings and thrown errors", async () => {
    const ai = createFakeAiRouter({
      write_post: ["first", "second"],
      intel_judge: (call) => ({ score: call.messages[0]?.content.length ?? 0 }),
      intel_critic: '```json\n{"ok":true}\n```',
      moderate: new DomainError("rate_limited"),
    });
    const post = () => ai.complete({ task: "write_post", system: "", messages: user("") });
    expect((await post()).text).toBe("first");
    expect((await post()).text).toBe("second");
    expect((await post()).text).toBe("second");
    expect(
      await ai.json({ task: "intel_judge", system: "", messages: user("abcd"), parse: (r) => r }),
    ).toEqual({ score: 4 });
    expect(
      await ai.json({ task: "intel_critic", system: "", messages: user(""), parse: (r) => r }),
    ).toEqual({ ok: true });
    await expect(
      ai.complete({ task: "moderate", system: "", messages: user("") }),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(ai.complete({ task: "support", system: "", messages: user("") })).rejects.toThrow(
      /no response configured/,
    );
  });

  it("json() retries once like the real router", async () => {
    const ai = createFakeAiRouter({ intel_judge: [{ score: "bad" }, { score: 90 }] });
    const out = await ai.json({
      task: "intel_judge",
      system: "",
      messages: user(""),
      ...zodJson(z.object({ score: z.number() })),
    });
    expect(out).toEqual({ score: 90 });
    expect(ai.calls).toHaveLength(2);
  });

  it("a single function can answer every task; reset() clears state", async () => {
    const ai = createFakeAiRouter((call) => `echo:${call.task}`);
    expect(
      (await ai.complete({ task: "intel_localize", system: "", messages: user("") })).text,
    ).toBe("echo:intel_localize");
    ai.reset();
    expect(ai.calls).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeForSearch, normalizeText, searchTokens } from "../src/normalize";
import { generateReferralCode, guessLocale, REFERRAL_ALPHABET } from "../src/util";

describe("normalizeText", () => {
  it("maps Arabic yeh/kaf to Persian", () => {
    expect(normalizeText("كپشن")).toBe("کپشن");
    expect(normalizeText("ياد")).toBe("یاد");
    expect(normalizeText("مستشفى")).toBe("مستشفی");
  });
  it("maps Persian and Arabic-Indic digits to Latin", () => {
    expect(normalizeText("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(normalizeText("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });
  it("removes tatweel and harakat", () => {
    expect(normalizeText("كـــتـــاب")).toBe("کتاب");
    expect(normalizeText("مُحَمَّدٌ")).toBe("محمد");
  });
  it("folds alef variants, teh marbuta and heh-yeh", () => {
    expect(normalizeText("أإآا")).toBe("اااا");
    expect(normalizeText("مدرسة")).toBe("مدرسه");
    expect(normalizeText("خانۀ")).toBe("خانه");
  });
  it("unifies ZWNJ and whitespace", () => {
    expect(normalizeText("می‌خواهم")).toBe("می خواهم");
    expect(normalizeText("  شبکه‌های \t\n اجتماعی ")).toBe("شبکه های اجتماعی");
  });
  it("lowercases Latin and keeps punctuation", () => {
    expect(normalizeText("ChatGPT, Claude!")).toBe("chatgpt, claude!");
  });
  it("normalizeForSearch strips punctuation", () => {
    expect(normalizeForSearch("«کپشن» اینستاگرام؟!")).toBe("کپشن اینستاگرام");
    expect(searchTokens("a کپشن کپشن، SEO")).toEqual(["کپشن", "seo"]);
  });
});

describe("util", () => {
  it("guesses locale from language_code", () => {
    expect(guessLocale("fa")).toBe("fa");
    expect(guessLocale("ar-SA")).toBe("ar");
    expect(guessLocale("en-US")).toBe("en");
    expect(guessLocale("de")).toBe("fa");
    expect(guessLocale(null)).toBe("fa");
  });
  it("referral codes are 8 chars from an unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateReferralCode();
      expect(c).toHaveLength(8);
      for (const ch of c) expect(REFERRAL_ALPHABET).toContain(ch);
    }
    expect(REFERRAL_ALPHABET).not.toMatch(/[01ILOU]/);
  });
});

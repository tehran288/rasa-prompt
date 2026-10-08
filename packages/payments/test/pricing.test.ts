import { describe, expect, it } from "vitest";
import {
  rialToToman,
  roundPsychToman,
  roundPsychUsd,
  roundStars,
  tomanToRial,
  tomanToStars,
} from "../src/pricing";

describe("pricing helpers", () => {
  it("converts toman ↔ rial", () => {
    expect(tomanToRial(149_000)).toBe(1_490_000);
    expect(rialToToman(1_490_000)).toBe(149_000);
    expect(rialToToman(15)).toBe(2);
    expect(() => tomanToRial(-1)).toThrow(RangeError);
  });

  it("psychological toman rounding (x9,000)", () => {
    expect(roundPsychToman(150_000)).toBe(149_000);
    expect(roundPsychToman(145_000)).toBe(149_000);
    expect(roundPsychToman(140_000)).toBe(139_000);
    expect(roundPsychToman(292_000)).toBe(289_000);
    expect(roundPsychToman(1_500_000)).toBe(1_499_000);
    expect(roundPsychToman(10_000)).toBe(9_000);
    expect(roundPsychToman(4_200)).toBe(5_000);
    expect(roundPsychToman(0)).toBe(0);
  });

  it("psychological USD rounding (.99)", () => {
    expect(roundPsychUsd(12.3)).toBe(11.99);
    expect(roundPsychUsd(12.6)).toBe(12.99);
    expect(roundPsychUsd(0.2)).toBe(0.99);
  });

  it("stars rounding", () => {
    expect(roundStars(0.3)).toBe(1);
    expect(roundStars(12.2)).toBe(13);
    expect(roundStars(47)).toBe(45);
    expect(roundStars(148)).toBe(149);
    expect(roundStars(310)).toBe(299);
    expect(tomanToStars(149_000, 500)).toBe(299);
    expect(() => tomanToStars(1, 0)).toThrow(RangeError);
  });
});

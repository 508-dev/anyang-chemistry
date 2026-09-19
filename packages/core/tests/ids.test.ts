import { describe, expect, it } from "vitest";
import { formatIds, parseIds, partPosition } from "../src";

describe("parseIds", () => {
  it("parses nested sequences", () => {
    expect(parseIds("⿱木⿰木木")).toEqual({
      layout: "⿱",
      parts: ["木", { layout: "⿰", parts: ["木", "木"] }],
    });
  });

  it("reads astral code points as single leaves", () => {
    expect(parseIds("⿱𠂉母")).toEqual({ layout: "⿱", parts: ["𠂉", "母"] });
  });

  it("round-trips through formatIds", () => {
    expect(formatIds(parseIds("⿲丿丨丨"))).toBe("⿲丿丨丨");
  });

  it("rejects truncated and trailing input", () => {
    expect(() => parseIds("⿰女")).toThrow();
    expect(() => parseIds("⿰女乃子")).toThrow();
  });
});

describe("partPosition", () => {
  it("names slots per layout", () => {
    expect(partPosition("⿰", 0, 2)).toBe("left");
    expect(partPosition("⿲", 1, 3)).toBe("middle");
    expect(partPosition("⿱", 1, 2)).toBe("bottom");
    expect(partPosition("⿴", 0, 2)).toBe("outer");
  });
});

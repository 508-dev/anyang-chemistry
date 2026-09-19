import { describe, expect, it } from "vitest";
import { type ElementInfo, howToMake, RecipeBook } from "../src";
import { fixture } from "./fixture";

describe("RecipeBook scripts", () => {
  it("derives depth and end points from the recipes", () => {
    const book = new RecipeBook(fixture);
    expect(book.depth("一")).toBe(0);
    expect(book.depth("森")).toBe(4);
    expect(book.isTerminal("森")).toBe(true);
    expect(book.isTerminal("人")).toBe(false);
    expect(book.ids.slice(0, 4)).toEqual(fixture.seeds);
  });

  it("removes the other script entirely", () => {
    const simplified = new RecipeBook(fixture, { script: "simplified" });
    const traditional = new RecipeBook(fixture, { script: "traditional" });
    expect(simplified.element("从")).toBeDefined();
    expect(simplified.element("仌")).toBeUndefined();
    expect(simplified.lookup("⿱", ["人", "人"])).toEqual([]);
    expect(traditional.element("仌")).toBeDefined();
    expect(traditional.element("从")).toBeUndefined();
    expect(traditional.recipesUsing("人").map((r) => r.result)).not.toContain("从");
  });

  it("drops elements only reachable through the other script", () => {
    const tree: ElementInfo = {
      kind: "character",
      pinyin: ["mù"],
      gloss: "tree",
      script: "traditional",
    };
    const data = { ...fixture, elements: { ...fixture.elements, 木: tree } };
    const simplified = new RecipeBook(data, { script: "simplified" });
    expect(simplified.element("林")).toBeUndefined();
    expect(simplified.collections).toEqual([]);
  });
});

describe("howToMake", () => {
  const book = new RecipeBook(fixture);

  it("expands down to pieces the player has", () => {
    const tree = howToMake(book, "林", (id) => id === "十");
    expect(tree?.recipe).toMatchObject({ layout: "⿰", parts: ["木", "木"] });
    const wood = tree?.parts[0];
    expect(wood).toMatchObject({ id: "木", known: false, recipe: { parts: ["十", "八"] } });
    expect(wood?.parts.map((p) => [p.id, p.known, p.recipe === undefined])).toEqual([
      ["十", true, true],
      ["八", false, false],
    ]);
  });

  it("uses the base element for a variant slot the player can fill", () => {
    const tree = howToMake(book, "休", (id) => id === "人" || id === "木");
    expect(tree?.parts.map((p) => p.id)).toEqual(["人", "木"]);
  });

  it("returns undefined outside the book", () => {
    expect(howToMake(new RecipeBook(fixture, { script: "traditional" }), "从")).toBeUndefined();
  });
});

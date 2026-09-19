import { describe, expect, it } from "vitest";
import { achievements, Progress, RecipeBook, score, usageHint } from "../src";
import { fixture } from "./fixture";

const book = new RecipeBook(fixture);

describe("Progress", () => {
  it("starts with the seeds", () => {
    const progress = Progress.start(book, 0);
    expect(progress.count).toBe(4);
    expect(progress.has("一")).toBe(true);
  });

  it("round-trips through a save and drops unknown ids", () => {
    const progress = Progress.start(book, 0).discover("十", 1).discover("木", 2);
    const save = progress.toSave();
    save.discoveries.push({ id: "龘", at: 3 });
    const restored = Progress.restore(book, JSON.parse(JSON.stringify(save)), 0);
    expect(restored.discoveries.map((d) => d.id)).toEqual(["一", "丨", "丿", "㇏", "十", "木"]);
  });

  it("falls back to a fresh start for malformed saves", () => {
    expect(Progress.restore(book, { schemaVersion: 99 }, 0).count).toBe(4);
    expect(Progress.restore(book, "nope", 0).count).toBe(4);
  });

  it("returns the same instance for repeat discoveries", () => {
    const progress = Progress.start(book, 0);
    expect(progress.discover("一")).toBe(progress);
  });
});

describe("derived scoring", () => {
  const progress = Progress.start(book, 0)
    .discover("十")
    .discover("八")
    .discover("木")
    .discover("林");

  it("counts uses of an element, including through variant forms", () => {
    expect(usageHint(book, progress, "木")).toEqual({ found: 1, total: 3 });
    expect(book.recipesUsing("人").map((r) => r.result)).toContain("休");
  });

  it("tracks collections and terminals", () => {
    const trees = achievements(book, progress).find((a) => a.id === "collection-trees");
    expect(trees).toMatchObject({ unlocked: false, progress: { found: 2, total: 3 } });
    expect(score(book, progress)).toMatchObject({
      discovered: 8,
      total: 16,
      terminals: { found: 0, total: 6 },
      deepest: 3,
    });
  });
});

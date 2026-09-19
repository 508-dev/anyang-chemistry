import {
  EMPTY_BOARD,
  type GameData,
  isLayout,
  LAYOUT_ARITY,
  placePiece,
  RecipeBook,
  type Zone,
} from "@anyang/core";
import { describe, expect, it } from "vitest";
import raw from "../game-data.json";

const data = raw as unknown as GameData;
const book = new RecipeBook(data);

/** Build `result` by dropping `second` into `zone` around `first`. */
function drop(first: string, second: string, zone: Zone): string | undefined {
  const placed = placePiece(book, EMPTY_BOARD, first, zone);
  const outcome = placePiece(book, placed.board, second, zone);
  return outcome.kind === "created" ? outcome.result : undefined;
}

describe("generated game data", () => {
  it("declares the current schema", () => {
    expect(data.schemaVersion).toBe(1);
    expect(data.seeds.length).toBeGreaterThan(0);
  });

  it("only references known elements with well-formed layouts", () => {
    for (const [result, layout, ...parts] of data.recipes) {
      expect(data.elements[result], result).toBeDefined();
      expect(isLayout(layout)).toBe(true);
      expect(parts).toHaveLength(LAYOUT_ARITY[layout]);
      for (const part of parts) {
        const base = data.variants.find((v) => v.form === part)?.base;
        expect(
          data.elements[part] ?? (base && data.elements[base]),
          `${result}: ${part}`,
        ).toBeDefined();
      }
    }
  });

  it("gives every non-seed element a recipe one level shallower", () => {
    for (const [id, info] of Object.entries(data.elements)) {
      if (info.depth === 0) {
        expect(data.seeds).toContain(id);
        continue;
      }
      expect(book.recipesFor(id).length, id).toBeGreaterThan(0);
    }
  });

  it("keeps collections to reachable members", () => {
    for (const collection of data.collections) {
      for (const member of collection.members) expect(data.elements[member], member).toBeDefined();
    }
  });

  it("plays the signature combinations", () => {
    expect(drop("女", "乃", "right")).toBe("奶");
    expect(drop("子", "女", "left")).toBe("好");
    expect(drop("林", "木", "top")).toBe("森");
    // 水 dropped to the left becomes 氵.
    expect(drop("每", "水", "left")).toBe("海");
    expect(book.glyphAt("水", "left")).toBe("氵");
  });
});

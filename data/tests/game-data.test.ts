import {
  EMPTY_BOARD,
  type GameData,
  howToMake,
  isLayout,
  LAYOUT_ARITY,
  placePiece,
  RecipeBook,
  type Zone,
} from "@anyang/core";
import { describe, expect, it } from "vitest";
import raw from "../game-data.json";

const data = raw as unknown as GameData;
const book = new RecipeBook(data, { script: "simplified" });
const traditional = new RecipeBook(data, { script: "traditional" });

/** Build `result` by dropping `second` into `zone` around `first`. */
function drop(first: string, second: string, zone: Zone): string | undefined {
  const placed = placePiece(book, EMPTY_BOARD, first, zone);
  const outcome = placePiece(book, placed.board, second, zone);
  return outcome.kind === "created" ? outcome.result : undefined;
}

describe("generated game data", () => {
  it("declares the current schema", () => {
    expect(data.schemaVersion).toBe(2);
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

  it("keeps only elements playable in at least one script", () => {
    for (const id of Object.keys(data.elements)) {
      expect(book.element(id) ?? traditional.element(id), id).toBeDefined();
    }
  });

  it("separates the scripts completely", () => {
    for (const id of book.ids) expect(data.elements[id]?.script, id).not.toBe("traditional");
    for (const id of traditional.ids) expect(data.elements[id]?.script, id).not.toBe("simplified");
    expect(book.element("马")).toBeDefined();
    expect(book.element("馬")).toBeUndefined();
    expect(traditional.element("馬")).toBeDefined();
    expect(traditional.element("马")).toBeUndefined();
    // Shared characters and all strokes are in both.
    for (const id of ["一", "女", "口", ...data.seeds]) {
      expect(book.element(id), id).toBeDefined();
      expect(traditional.element(id), id).toBeDefined();
    }
  });

  it("makes strokes findable by their character reading", () => {
    expect(data.elements.一).toMatchObject({ kind: "stroke", name: "横", pinyin: ["yī"] });
    expect(data.elements.一?.gloss).toContain("one");
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

  it("explains how to build 吃 from the strokes", () => {
    const tree = howToMake(book, "吃", (id) => data.seeds.includes(id));
    expect(tree?.recipe).toMatchObject({ layout: "⿰", parts: ["口", "乞"] });
    const qi = tree?.parts[1];
    expect(qi?.recipe).toMatchObject({ layout: "⿱", parts: ["𠂉", "乙"] });
    expect(qi?.parts[0]?.recipe).toMatchObject({ layout: "⿱", parts: ["丿", "一"] });
  });
});

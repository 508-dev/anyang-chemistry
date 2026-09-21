import { describe, expect, it } from "vitest";
import { EMPTY_BOARD, placePiece, RecipeBook } from "../src";
import { fixture } from "./fixture";

const book = new RecipeBook(fixture);

describe("placePiece", () => {
  it("places the first piece on an empty board", () => {
    expect(placePiece(book, EMPTY_BOARD, "一", "left")).toEqual({
      kind: "placed",
      board: { layout: null, parts: ["一"] },
    });
  });

  it("uses the zone to choose the layout and order", () => {
    const board = { layout: null, parts: ["㇏"] };
    const outcome = placePiece(book, board, "丿", "left");
    expect(outcome).toMatchObject({ kind: "created", result: "八" });
    expect(placePiece(book, board, "丿", "right").kind).toBe("rejected");
  });

  it("builds vertical compositions from top and bottom drops", () => {
    const outcome = placePiece(book, { layout: null, parts: ["林"] }, "木", "top");
    expect(outcome).toMatchObject({ kind: "created", result: "森", board: { parts: ["森"] } });
  });

  it("center drops cycle through overlaid results the player has not found", () => {
    const board = { layout: null, parts: ["丿"] };
    expect(placePiece(book, board, "㇏", "center")).toMatchObject({ result: "人" });
    const found = new Set(["人"]);
    expect(placePiece(book, board, "㇏", "center", (id) => found.has(id))).toMatchObject({
      result: "入",
    });
  });

  it("holds a pending pair when a three-part recipe can still complete it", () => {
    const pending = placePiece(
      book,
      { layout: null, parts: ["丿"] },
      "丨",
      "right",
      (id) => id === "亻",
    );
    // 亻 is already known, so ⿰丿丨 re-creates it rather than going pending.
    expect(pending).toMatchObject({ kind: "created", result: "亻" });

    const noTwoPart = new RecipeBook({ ...fixture, recipes: [["川", "⿲", "丿", "丨", "丨"]] });
    const pair = placePiece(noTwoPart, { layout: null, parts: ["丿"] }, "丨", "right");
    expect(pair).toEqual({ kind: "pending", board: { layout: "⿰", parts: ["丿", "丨"] } });
    expect(placePiece(noTwoPart, pair.board, "丨", "right")).toMatchObject({ result: "川" });
    expect(placePiece(noTwoPart, pair.board, "丨", "top")).toMatchObject({
      kind: "rejected",
      reason: "unsupported-zone",
    });
  });

  it("completes a three-part row after its first pair already made something", () => {
    // ⿰丿丨 makes 亻, but a third 丨 in line still makes 川 = ⿲丿丨丨.
    const first = placePiece(book, { layout: null, parts: ["丿"] }, "丨", "right");
    expect(first).toMatchObject({ kind: "created", result: "亻" });
    expect(placePiece(book, first.board, "丨", "right")).toMatchObject({
      kind: "created",
      result: "川",
    });
    // Only in line: a vertical drop does not extend a row.
    expect(placePiece(book, first.board, "丨", "top").kind).toBe("rejected");
  });

  it("matches a base element dropped into its variant slot", () => {
    const outcome = placePiece(book, { layout: null, parts: ["木"] }, "人", "left");
    expect(outcome).toMatchObject({ kind: "created", result: "休" });
    expect(book.glyphAt("人", "left")).toBe("亻");
    expect(book.glyphAt("人", "right")).toBe("人");
  });
});

import type { RecipeBook } from "./engine";
import { ENCLOSING_LAYOUTS, type Layout } from "./ids";

// The construction board: the player drops a piece into a zone around what is
// already on the board, and the zone decides the IDS layout that is tried.
//
//            top (⿱ piece above)
//   left (⿰) [ current ] right (⿰)
//           bottom (⿱ piece below)
//
// "center" drops the piece onto the current element and tries every
// enclosing/overlaid layout (⿴⿵⿶⿷⿸⿹⿺⿻) in both directions.

export type Zone = "left" | "right" | "top" | "bottom" | "center";

export const ZONES: readonly Zone[] = ["left", "right", "top", "bottom", "center"];

/** Empty (no parts), a single element, or a pending row/column of two parts. */
export interface Board {
  layout: Layout | null;
  parts: string[];
}

export const EMPTY_BOARD: Board = { layout: null, parts: [] };

export interface Arrangement {
  layout: Layout;
  parts: string[];
}

export type PlaceOutcome =
  | { kind: "placed"; board: Board }
  | { kind: "created"; board: Board; result: string; arrangement: Arrangement }
  | { kind: "pending"; board: Board }
  | { kind: "rejected"; board: Board; reason: "no-recipe" | "unsupported-zone" };

/** The arrangements a drop would try, in priority order. */
export function arrangementsFor(board: Board, piece: string, zone: Zone): Arrangement[] {
  const [first, second] = board.parts;
  if (first === undefined) return [];

  if (second === undefined) {
    switch (zone) {
      case "left":
        return [{ layout: "⿰", parts: [piece, first] }];
      case "right":
        return [{ layout: "⿰", parts: [first, piece] }];
      case "top":
        return [{ layout: "⿱", parts: [piece, first] }];
      case "bottom":
        return [{ layout: "⿱", parts: [first, piece] }];
      case "center":
        return ENCLOSING_LAYOUTS.flatMap((layout) => [
          { layout, parts: [first, piece] },
          { layout, parts: [piece, first] },
        ]);
    }
  }

  // A pending pair only grows along its own axis, into ⿲ or ⿳.
  if (board.layout === "⿰" && (zone === "left" || zone === "right")) {
    return [
      { layout: "⿲", parts: zone === "left" ? [piece, ...board.parts] : [...board.parts, piece] },
    ];
  }
  if (board.layout === "⿱" && (zone === "top" || zone === "bottom")) {
    return [
      { layout: "⿳", parts: zone === "top" ? [piece, ...board.parts] : [...board.parts, piece] },
    ];
  }
  return [];
}

/**
 * Drop `piece` into `zone`. When several results match, the first one the
 * player has not discovered yet wins, so collisions never hide a character.
 */
export function placePiece(
  book: RecipeBook,
  board: Board,
  piece: string,
  zone: Zone,
  isDiscovered: (id: string) => boolean = () => false,
): PlaceOutcome {
  if (board.parts.length === 0) return { kind: "placed", board: { layout: null, parts: [piece] } };

  const arrangements = arrangementsFor(board, piece, zone);
  if (arrangements.length === 0) return { kind: "rejected", board, reason: "unsupported-zone" };

  let match: { result: string; arrangement: Arrangement } | undefined;
  for (const arrangement of arrangements) {
    const results = book.lookup(arrangement.layout, arrangement.parts);
    const result = results.find((id) => !isDiscovered(id)) ?? results[0];
    if (result === undefined) continue;
    if (!isDiscovered(result)) return created(result, arrangement);
    match ??= { result, arrangement };
  }
  if (match) return created(match.result, match.arrangement);

  const [arrangement] = arrangements;
  if (
    arrangement &&
    board.parts.length === 1 &&
    (arrangement.layout === "⿰" || arrangement.layout === "⿱")
  ) {
    const triple = arrangement.layout === "⿰" ? "⿲" : "⿳";
    const [a = "", b = ""] = arrangement.parts;
    if (book.canExtend(triple, [a, b])) {
      return { kind: "pending", board: { layout: arrangement.layout, parts: arrangement.parts } };
    }
  }
  return { kind: "rejected", board, reason: "no-recipe" };
}

function created(result: string, arrangement: Arrangement): PlaceOutcome {
  return { kind: "created", board: { layout: null, parts: [result] }, result, arrangement };
}

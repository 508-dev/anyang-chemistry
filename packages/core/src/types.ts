import type { Layout, Position } from "./ids";

// The game-data contract. This is the portable part of the game: any client
// (web, Android, iOS) loads the same JSON and implements the small engine in
// engine.ts / board.ts / reachability.ts against it. Depth and end points are
// derived at load time because they depend on the chosen script.
// See docs/game-data.md.

export const GAME_DATA_SCHEMA_VERSION = 2;

export type ElementKind = "stroke" | "component" | "character";

export type Script = "simplified" | "traditional";

export interface ElementInfo {
  kind: ElementKind;
  /** Readings, e.g. ["nǚ"]. Empty for pure components. */
  pinyin: string[];
  /** Short English gloss. */
  gloss: string;
  /** Chinese name, used for strokes (横, 竖, ...). */
  name?: string;
  /** Which script uses this form; "both" for shared characters like 一 or 女. */
  script: Script | "both";
}

/** [result, layout, ...parts], e.g. ["奶", "⿰", "女", "乃"]. */
export type RecipeTuple = [result: string, layout: Layout, ...parts: string[]];

export interface Recipe {
  result: string;
  layout: Layout;
  parts: string[];
}

/**
 * A reduced form a base element takes in a given position, e.g. 水 becomes 氵
 * on the left. Recipes use the form; placing the base in that position also
 * matches them, and clients draw the form.
 */
export interface VariantForm {
  form: string;
  base: string;
  position: Position;
}

export interface Collection {
  id: string;
  title: string;
  titleZh: string;
  members: string[];
}

export interface GameData {
  schemaVersion: typeof GAME_DATA_SCHEMA_VERSION;
  /** Elements the player starts with, in palette order. */
  seeds: string[];
  elements: Record<string, ElementInfo>;
  recipes: RecipeTuple[];
  variants: VariantForm[];
  collections: Collection[];
  sources: { name: string; url: string; license: string }[];
}

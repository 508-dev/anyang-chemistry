import type { Layout, Position } from "./ids";

// The game-data contract. This is the portable part of the game: any client
// (web, Android, iOS) loads the same JSON and implements the small engine in
// engine.ts / board.ts against it. See docs/game-data.md.

export const GAME_DATA_SCHEMA_VERSION = 1;

export type ElementKind = "stroke" | "component" | "character";

export interface ElementInfo {
  kind: ElementKind;
  /** Readings, e.g. ["nǚ"]. Empty for strokes and pure components. */
  pinyin: string[];
  /** Short English gloss. */
  gloss: string;
  /** Chinese name, used for strokes (横, 竖, ...). */
  name?: string;
  /** Minimum number of combinations needed to reach this element from the seeds. */
  depth: number;
  /** True when no recipe uses this element: an end point of the tree. */
  terminal: boolean;
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
 * on the left. Recipes are stored against the base; clients render the form.
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

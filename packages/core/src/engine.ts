import { type Layout, type Position, partPosition, recipeKey } from "./ids";
import type { ElementInfo, GameData, Recipe } from "./types";

/** Indexed, read-only view of GameData. Build once per data load. */
export class RecipeBook {
  readonly data: GameData;
  private readonly byKey = new Map<string, string[]>();
  private readonly byResult = new Map<string, Recipe[]>();
  private readonly byPart = new Map<string, Recipe[]>();
  /** "水@left" -> "氵" */
  private readonly formByBase = new Map<string, string>();
  /** "氵@left" -> "水" */
  private readonly baseByForm = new Map<string, string>();
  /** Two-part prefixes/suffixes of three-part recipes, e.g. "⿲木木_". */
  private readonly partialTriples = new Set<string>();

  constructor(data: GameData) {
    this.data = data;
    for (const variant of data.variants) {
      this.formByBase.set(`${variant.base}@${variant.position}`, variant.form);
      this.baseByForm.set(`${variant.form}@${variant.position}`, variant.base);
    }
    for (const [result, layout, ...parts] of data.recipes) {
      const recipe: Recipe = { result, layout, parts };
      push(this.byKey, recipeKey(layout, parts), result);
      push(this.byResult, result, recipe);
      const users = new Set<string>();
      parts.forEach((part, index) => {
        users.add(part);
        const base = this.baseAt(part, partPosition(layout, index, parts.length));
        if (base) users.add(base);
      });
      for (const user of users) push(this.byPart, user, recipe);
      if (parts.length === 3) {
        const [a = "", b = "", c = ""] = parts;
        this.partialTriples.add(recipeKey(layout, [a, b, "_"]));
        this.partialTriples.add(recipeKey(layout, ["_", b, c]));
      }
    }
  }

  get size(): number {
    return Object.keys(this.data.elements).length;
  }

  element(id: string): ElementInfo | undefined {
    return this.data.elements[id];
  }

  /**
   * Results produced by this arrangement. A base element in a variant slot also
   * matches recipes written with the variant, so 水 on the left of 每 finds
   * 海 = ⿰氵每.
   */
  lookup(layout: Layout, parts: readonly string[]): string[] {
    const results = new Set<string>();
    for (const candidate of this.variantCombinations(layout, parts)) {
      for (const result of this.byKey.get(recipeKey(layout, candidate)) ?? []) results.add(result);
    }
    return [...results];
  }

  /** Whether some three-part recipe could still complete this two-part row/column. */
  canExtend(layout: "⿲" | "⿳", parts: readonly [string, string]): boolean {
    const [a, b] = parts;
    const asPrefix = this.variantCombinations(layout, [a, b, "_"]);
    const asSuffix = this.variantCombinations(layout, ["_", a, b]);
    return [...asPrefix, ...asSuffix].some((candidate) =>
      this.partialTriples.has(recipeKey(layout, candidate)),
    );
  }

  recipesFor(result: string): Recipe[] {
    return this.byResult.get(result) ?? [];
  }

  /** Recipes that use `part` directly or through one of its variant forms. */
  recipesUsing(part: string): Recipe[] {
    return this.byPart.get(part) ?? [];
  }

  /** Glyph to draw for `id` at `position`, e.g. 水 on the left draws as 氵. */
  glyphAt(id: string, position: Position): string {
    return this.formByBase.get(`${id}@${position}`) ?? id;
  }

  /** The base element a variant form stands for at `position`, if any. */
  baseAt(form: string, position: Position): string | undefined {
    return this.baseByForm.get(`${form}@${position}`);
  }

  private variantCombinations(layout: Layout, parts: readonly string[]): string[][] {
    let combinations: string[][] = [[]];
    parts.forEach((part, index) => {
      const form = this.formByBase.get(`${part}@${partPosition(layout, index, parts.length)}`);
      const options = form ? [part, form] : [part];
      combinations = combinations.flatMap((prefix) => options.map((option) => [...prefix, option]));
    });
    return combinations;
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

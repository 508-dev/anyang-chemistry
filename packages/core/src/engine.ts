import { type Layout, type Position, partPosition, recipeKey } from "./ids";
import { reachable } from "./reachability";
import type { Collection, ElementInfo, GameData, Recipe, Script } from "./types";

export interface BookOptions {
  /** Play one script only; the other script's forms are removed entirely. */
  script?: Script;
}

/**
 * The playable game for one script: GameData filtered to elements of that
 * script, then pruned to what is reachable from the seeds without them.
 * Build once per data load and script.
 */
export class RecipeBook {
  readonly data: GameData;
  readonly script: Script | undefined;
  readonly seeds: readonly string[];
  /** Every playable element: seeds first, then by depth and code point. */
  readonly ids: readonly string[];
  readonly collections: readonly Collection[];
  private readonly depths: Map<string, number>;
  private readonly usedAsPart = new Set<string>();
  private readonly byKey = new Map<string, string[]>();
  private readonly byResult = new Map<string, Recipe[]>();
  private readonly byPart = new Map<string, Recipe[]>();
  /** "水@left" -> "氵" */
  private readonly formByBase = new Map<string, string>();
  /** "氵@left" -> "水" */
  private readonly baseByForm = new Map<string, string>();
  /** Two-part prefixes/suffixes of three-part recipes, e.g. "⿲木木_". */
  private readonly partialTriples = new Set<string>();

  constructor(data: GameData, options: BookOptions = {}) {
    this.data = data;
    this.script = options.script;
    // Ids without an element entry are variant slots (灬) filled by their base.
    const allowed = (id: string) => {
      const script = data.elements[id]?.script ?? "both";
      return script === "both" || !options.script || script === options.script;
    };
    const { depth, recipes } = reachable(
      data.seeds,
      data.recipes.map(([result, layout, ...parts]) => ({ result, layout, parts })),
      data.variants,
      allowed,
    );
    this.depths = depth;
    this.seeds = data.seeds.filter((id) => depth.has(id));
    this.ids = [
      ...this.seeds,
      ...[...depth.keys()]
        .filter((id) => depth.get(id) !== 0)
        .sort(
          (a, b) =>
            (depth.get(a) ?? 0) - (depth.get(b) ?? 0) ||
            (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0),
        ),
    ];
    this.collections = data.collections
      .map((collection) => ({
        ...collection,
        members: collection.members.filter((id) => depth.has(id)),
      }))
      .filter((collection) => collection.members.length > 1);

    for (const variant of data.variants) {
      if (!depth.has(variant.base) || !allowed(variant.form)) continue;
      this.formByBase.set(`${variant.base}@${variant.position}`, variant.form);
      this.baseByForm.set(`${variant.form}@${variant.position}`, variant.base);
    }
    for (const recipe of recipes) {
      const { result, layout, parts } = recipe;
      push(this.byKey, recipeKey(layout, parts), result);
      push(this.byResult, result, recipe);
      const users = new Set<string>();
      parts.forEach((part, index) => {
        users.add(part);
        const base = this.baseAt(part, partPosition(layout, index, parts.length));
        if (base) users.add(base);
      });
      for (const user of users) {
        this.usedAsPart.add(user);
        push(this.byPart, user, recipe);
      }
      if (parts.length === 3) {
        const [a = "", b = "", c = ""] = parts;
        this.partialTriples.add(recipeKey(layout, [a, b, "_"]));
        this.partialTriples.add(recipeKey(layout, ["_", b, c]));
      }
    }
  }

  get size(): number {
    return this.ids.length;
  }

  /** Info for a playable element; undefined for anything outside this book. */
  element(id: string): ElementInfo | undefined {
    return this.depths.has(id) ? this.data.elements[id] : undefined;
  }

  /** Fewest combinations needed to reach `id` from the seeds. */
  depth(id: string): number | undefined {
    return this.depths.get(id);
  }

  /** An end point: no recipe in this book builds on it. */
  isTerminal(id: string): boolean {
    return this.depths.has(id) && !this.usedAsPart.has(id);
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

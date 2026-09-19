import { type Layout, partPosition } from "./ids";
import type { Recipe, VariantForm } from "./types";

// Which elements a player can actually reach from the seeds, and how deep each
// one is. Shared by the data build (to prune the dictionary) and RecipeBook (to
// build a per-script game at load time).

export interface Reachability {
  /** Fewest combinations from the seeds, for every reachable element. */
  depth: Map<string, number>;
  /** Recipes whose result and parts are all reachable. */
  recipes: Recipe[];
}

/**
 * A part is available when it has been reached, or when its base element has
 * been reached and the part sits in the variant slot (水 on the left counts as
 * 氵). `allowed` removes elements before the search, e.g. by script.
 */
export function reachable(
  seeds: readonly string[],
  recipes: readonly Recipe[],
  variants: readonly VariantForm[],
  allowed: (id: string) => boolean = () => true,
): Reachability {
  const baseByForm = new Map(
    variants
      .filter((v) => allowed(v.form) && allowed(v.base))
      .map((v) => [`${v.form}@${v.position}`, v.base]),
  );
  const candidates = recipes.filter(
    (recipe) =>
      !seeds.includes(recipe.result) && allowed(recipe.result) && recipe.parts.every(allowed),
  );
  const depth = new Map<string, number>(seeds.filter(allowed).map((id) => [id, 0]));

  const partDepth = (part: string, layout: Layout, index: number, count: number) => {
    const own = depth.get(part);
    const base = baseByForm.get(`${part}@${partPosition(layout, index, count)}`);
    const viaBase = base === undefined ? undefined : depth.get(base);
    if (own === undefined) return viaBase;
    return viaBase === undefined ? own : Math.min(own, viaBase);
  };

  const recipeDepth = (recipe: Recipe): number | undefined => {
    let max = 0;
    for (const [index, part] of recipe.parts.entries()) {
      const d = partDepth(part, recipe.layout, index, recipe.parts.length);
      if (d === undefined) return undefined;
      max = Math.max(max, d);
    }
    return max + 1;
  };

  for (let changed = true; changed; ) {
    changed = false;
    for (const recipe of candidates) {
      const d = recipeDepth(recipe);
      if (d === undefined) continue;
      const current = depth.get(recipe.result);
      if (current === undefined || d < current) {
        depth.set(recipe.result, d);
        changed = true;
      }
    }
  }

  return { depth, recipes: candidates.filter((recipe) => recipeDepth(recipe) !== undefined) };
}

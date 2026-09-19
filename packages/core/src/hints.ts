import type { RecipeBook } from "./engine";
import { partPosition } from "./ids";
import type { Recipe } from "./types";

// "How do I make 吃?" Answers with a construction tree that follows the
// shallowest recipe at every step and stops at pieces the player already has.

export interface BuildStep {
  id: string;
  /** The player already has this piece (seeds always count). */
  known: boolean;
  /** How to make it; absent for known pieces below the top of the tree. */
  recipe?: Recipe;
  parts: BuildStep[];
}

export function howToMake(
  book: RecipeBook,
  id: string,
  isDiscovered: (id: string) => boolean = () => false,
): BuildStep | undefined {
  if (book.depth(id) === undefined) return undefined;

  const visit = (target: string, expand: boolean): BuildStep => {
    const known = isDiscovered(target) || book.depth(target) === 0;
    const recipe = known && !expand ? undefined : shallowestRecipe(book, target);
    if (!recipe) return { id: target, known, parts: [] };
    const parts = recipe.parts.map((part, index) => {
      // A variant form (氵) is also covered by its base (水) in that slot.
      const base = book.baseAt(part, partPosition(recipe.layout, index, recipe.parts.length));
      if (
        base !== undefined &&
        !isDiscovered(part) &&
        (isDiscovered(base) || !book.element(part))
      ) {
        return visit(base, false);
      }
      return visit(part, false);
    });
    return { id: target, known, recipe, parts };
  };

  return visit(id, true);
}

function shallowestRecipe(book: RecipeBook, id: string): Recipe | undefined {
  let best: Recipe | undefined;
  let bestDepth = Number.POSITIVE_INFINITY;
  for (const recipe of book.recipesFor(id)) {
    let depth = 0;
    for (const [index, part] of recipe.parts.entries()) {
      const base = book.baseAt(part, partPosition(recipe.layout, index, recipe.parts.length));
      const own = book.depth(part) ?? Number.POSITIVE_INFINITY;
      const viaBase = base === undefined ? own : (book.depth(base) ?? Number.POSITIVE_INFINITY);
      depth = Math.max(depth, Math.min(own, viaBase));
    }
    if (depth < bestDepth) {
      best = recipe;
      bestDepth = depth;
    }
  }
  return best;
}

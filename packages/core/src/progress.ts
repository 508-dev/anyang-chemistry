import type { RecipeBook } from "./engine";

// Player progress is just the ordered list of discoveries. Everything else
// (scores, trophies, hints) is derived from it plus the game data, so saves
// stay tiny and survive data updates.

export const SAVE_SCHEMA_VERSION = 1;

export interface Discovery {
  id: string;
  /** Epoch milliseconds. */
  at: number;
}

export interface SaveState {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  discoveries: Discovery[];
}

export class Progress {
  private readonly order: Discovery[];
  private readonly ids: Set<string>;

  private constructor(order: Discovery[]) {
    this.order = order;
    this.ids = new Set(order.map((entry) => entry.id));
  }

  static start(book: RecipeBook, at = Date.now()): Progress {
    return new Progress(book.seeds.map((id) => ({ id, at })));
  }

  /** Restore a save, dropping ids the current data no longer has and re-adding any missing seeds. */
  static restore(book: RecipeBook, save: unknown, at = Date.now()): Progress {
    const seeds = Progress.start(book, at);
    if (!isSaveState(save)) return seeds;
    const kept = save.discoveries.filter((entry) => book.element(entry.id) !== undefined);
    const known = new Set(kept.map((entry) => entry.id));
    const missingSeeds = seeds.order.filter((entry) => !known.has(entry.id));
    return new Progress([...missingSeeds, ...kept]);
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  get count(): number {
    return this.order.length;
  }

  get discoveries(): readonly Discovery[] {
    return this.order;
  }

  /** Returns a new Progress, or this one if `id` was already discovered. */
  discover(id: string, at = Date.now()): Progress {
    return this.ids.has(id) ? this : new Progress([...this.order, { id, at }]);
  }

  toSave(): SaveState {
    return { schemaVersion: SAVE_SCHEMA_VERSION, discoveries: [...this.order] };
  }
}

function isSaveState(value: unknown): value is SaveState {
  if (typeof value !== "object" || value === null) return false;
  const save = value as Partial<SaveState>;
  return (
    save.schemaVersion === SAVE_SCHEMA_VERSION &&
    Array.isArray(save.discoveries) &&
    save.discoveries.every(
      (entry) => typeof entry?.id === "string" && typeof entry?.at === "number",
    )
  );
}

export interface UsageHint {
  found: number;
  total: number;
}

/** How many of the recipes that use `id` the player has already completed. */
export function usageHint(book: RecipeBook, progress: Progress, id: string): UsageHint {
  const results = new Set(book.recipesUsing(id).map((recipe) => recipe.result));
  let found = 0;
  for (const result of results) if (progress.has(result)) found++;
  return { found, total: results.size };
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  unlocked: boolean;
  progress: { found: number; total: number };
}

export const DISCOVERY_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2000, 4000];

/** Every trophy, locked or not. Diff two calls to find newly unlocked ones. */
export function achievements(book: RecipeBook, progress: Progress): Achievement[] {
  const list: Achievement[] = [];
  const total = book.size;

  for (const milestone of DISCOVERY_MILESTONES) {
    if (milestone > total) break;
    list.push({
      id: `count-${milestone}`,
      title: `${milestone} elements`,
      detail: `Discover ${milestone} elements.`,
      unlocked: progress.count >= milestone,
      progress: { found: Math.min(progress.count, milestone), total: milestone },
    });
  }

  for (const collection of book.collections) {
    const found = collection.members.filter((id) => progress.has(id)).length;
    list.push({
      id: `collection-${collection.id}`,
      title: `${collection.titleZh} · ${collection.title}`,
      detail: collection.members.join(" "),
      unlocked: found === collection.members.length,
      progress: { found, total: collection.members.length },
    });
  }

  return list;
}

export interface Score {
  discovered: number;
  total: number;
  /** End points found: characters no recipe builds on. */
  terminals: { found: number; total: number };
  deepest: number;
}

export function score(book: RecipeBook, progress: Progress): Score {
  let terminalsTotal = 0;
  let terminalsFound = 0;
  let deepest = 0;
  for (const id of book.ids) {
    const terminal = book.isTerminal(id);
    if (terminal) terminalsTotal++;
    if (!progress.has(id)) continue;
    if (terminal) terminalsFound++;
    deepest = Math.max(deepest, book.depth(id) ?? 0);
  }
  return {
    discovered: progress.count,
    total: book.size,
    terminals: { found: terminalsFound, total: terminalsTotal },
    deepest,
  };
}

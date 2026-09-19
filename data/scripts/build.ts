// Builds data/game-data.json from the vendored dictionary plus curated overrides.
//
//   bun run --cwd data build            write game-data.json and print a summary
//   bun run --cwd data build --report   also list blockers and recipe collisions
//
// See docs/game-data.md for the pipeline and file formats.

import { readFileSync, writeFileSync } from "node:fs";
import {
  type Collection,
  type ElementInfo,
  type ElementKind,
  formatIds,
  GAME_DATA_SCHEMA_VERSION,
  type GameData,
  type IdsNode,
  isLayout,
  type Layout,
  type Position,
  parseIds,
  partPosition,
  type RecipeTuple,
  recipeKey,
  type VariantForm,
} from "@anyang/core";

const dataDir = new URL("../", import.meta.url);
const verbose = process.argv.includes("--report");

interface DictEntry {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
}

interface Stroke {
  id: string;
  name: string;
  gloss: string;
}

interface CuratedRecipe {
  result: string;
  ids: string;
  gloss: string | undefined;
}

interface FlatRecipe {
  result: string;
  layout: Layout;
  parts: string[];
}

function read(path: string): string {
  return readFileSync(new URL(path, dataDir), "utf8");
}

/** Tab-separated rows; blank lines and lines starting with # are skipped. */
function readTsv(path: string): string[][] {
  return read(path)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split("\t").map((cell) => cell.trim()));
}

function loadDictionary(): Map<string, DictEntry> {
  const entries = new Map<string, DictEntry>();
  for (const line of read("vendor/makemeahanzi/dictionary.txt").split("\n")) {
    if (line.trim() === "") continue;
    const entry = JSON.parse(line) as DictEntry;
    entries.set(entry.character, entry);
  }
  return entries;
}

const strokes: Stroke[] = readTsv("curated/strokes.tsv").map(
  ([id = "", name = "", gloss = ""]) => ({
    id,
    name,
    gloss,
  }),
);

const curated: CuratedRecipe[] = readTsv("curated/components.tsv").map(
  ([result = "", ids = "", gloss]) => ({
    result,
    ids,
    gloss: gloss === "" ? undefined : gloss,
  }),
);

const variants: VariantForm[] = readTsv("curated/variants.tsv").map(
  ([form = "", base = "", position = ""]) => ({
    form,
    base,
    position: position as Position,
  }),
);

const collections: Collection[] = readTsv("curated/collections.tsv").map(
  ([id = "", title = "", titleZh = "", members = ""]) => ({
    id,
    title,
    titleZh,
    members: Array.from(members),
  }),
);

const dictionary = loadDictionary();
const seeds = strokes.map((stroke) => stroke.id);
const seedSet = new Set(seeds);
const curatedResults = new Set(curated.map((recipe) => recipe.result));

// 1. Gather raw IDS trees: curated rows replace the dictionary decomposition.
const raw: { result: string; tree: IdsNode; curated: boolean }[] = [];
let unparseable = 0;
for (const entry of dictionary.values()) {
  if (curatedResults.has(entry.character) || seedSet.has(entry.character)) continue;
  const tree = tryParse(entry.decomposition);
  if (tree === undefined) unparseable++;
  else if (typeof tree !== "string") raw.push({ result: entry.character, tree, curated: false });
}
for (const recipe of curated) {
  const tree = tryParse(recipe.ids);
  if (tree === undefined || typeof tree === "string")
    throw new Error(`Bad curated IDS: ${recipe.result} ${recipe.ids}`);
  raw.push({ result: recipe.result, tree, curated: true });
}

function tryParse(ids: string): IdsNode | undefined {
  if (ids.includes("？")) return undefined;
  try {
    return parseIds(ids);
  } catch {
    return undefined;
  }
}

// 2. Flatten nested trees: collapse ⿰x⿰yz into ⿲xyz, and replace a nested
// sub-tree with the character it spells when that is unambiguous (⿰木木 -> 林).
const charByFlatKey = new Map<string, string | null>();
for (const { result, tree } of raw) {
  if (typeof tree === "string" || !tree.parts.every((part) => typeof part === "string")) continue;
  const key = recipeKey(tree.layout, tree.parts as string[]);
  const existing = charByFlatKey.get(key);
  charByFlatKey.set(key, existing === undefined || existing === result ? result : null);
}

function flatten(node: IdsNode): IdsNode {
  if (typeof node === "string") return node;
  const parts = node.parts.map((part) => {
    const flat = flatten(part);
    if (typeof flat === "string" || !flat.parts.every((p) => typeof p === "string")) return flat;
    return charByFlatKey.get(recipeKey(flat.layout, flat.parts as string[])) ?? flat;
  });
  const [a, b] = parts;
  const triple = node.layout === "⿰" ? "⿲" : node.layout === "⿱" ? "⿳" : undefined;
  if (triple && parts.length === 2 && a !== undefined && b !== undefined) {
    if (typeof a !== "string" && a.layout === node.layout)
      return { layout: triple, parts: [...a.parts, b] };
    if (typeof b !== "string" && b.layout === node.layout)
      return { layout: triple, parts: [a, ...b.parts] };
  }
  return { layout: node.layout, parts };
}

const flatRecipes: FlatRecipe[] = [];
const seenKeys = new Set<string>();
let nestedDropped = 0;
for (const { result, tree, curated } of raw) {
  const flat = flatten(tree);
  if (typeof flat === "string" || !isLayout(flat.layout)) continue;
  if (!flat.parts.every((part): part is string => typeof part === "string")) {
    nestedDropped++;
    if (curated)
      console.warn(`curated recipe has an unnamed nested part: ${result} ${formatIds(tree)}`);
    continue;
  }
  if (flat.parts.includes(result)) continue;
  const dedupe = `${result}=${recipeKey(flat.layout, flat.parts)}`;
  if (seenKeys.has(dedupe)) continue;
  seenKeys.add(dedupe);
  flatRecipes.push({ result, layout: flat.layout, parts: flat.parts });
}

// 3. Reachability from the strokes. A part is available when discovered, or
// when its base element is discovered and the part sits in the variant slot.
const baseByForm = new Map(variants.map((v) => [`${v.form}@${v.position}`, v.base]));
const depth = new Map<string, number>(seeds.map((id) => [id, 0]));

function availableDepth(
  part: string,
  layout: Layout,
  index: number,
  count: number,
): number | undefined {
  const own = depth.get(part);
  const base = baseByForm.get(`${part}@${partPosition(layout, index, count)}`);
  const viaBase = base === undefined ? undefined : depth.get(base);
  if (own === undefined) return viaBase;
  return viaBase === undefined ? own : Math.min(own, viaBase);
}

function recipeDepth(recipe: FlatRecipe): number | undefined {
  let max = 0;
  for (const [index, part] of recipe.parts.entries()) {
    const d = availableDepth(part, recipe.layout, index, recipe.parts.length);
    if (d === undefined) return undefined;
    max = Math.max(max, d);
  }
  return max + 1;
}

for (let changed = true; changed; ) {
  changed = false;
  for (const recipe of flatRecipes) {
    if (seedSet.has(recipe.result)) continue;
    const d = recipeDepth(recipe);
    if (d === undefined) continue;
    const current = depth.get(recipe.result);
    if (current === undefined || d < current) {
      depth.set(recipe.result, d);
      changed = true;
    }
  }
}

const kept = flatRecipes.filter(
  (recipe) => !seedSet.has(recipe.result) && recipeDepth(recipe) !== undefined,
);

// 4. Elements, ordered seeds first, then by depth and code point.
const used = new Set<string>();
for (const recipe of kept) {
  for (const [index, part] of recipe.parts.entries()) {
    used.add(part);
    const base = baseByForm.get(
      `${part}@${partPosition(recipe.layout, index, recipe.parts.length)}`,
    );
    if (base !== undefined) used.add(base);
  }
}

const variantForms = new Set(variants.map((variant) => variant.form));
const curatedGloss = new Map(
  curated.flatMap((r) => (r.gloss ? [[r.result, r.gloss] as const] : [])),
);

function isRadicalBlock(id: string): boolean {
  const code = id.codePointAt(0) ?? 0;
  return (code >= 0x2e80 && code <= 0x2fdf) || (code >= 0x31c0 && code <= 0x31ef);
}

function cleanGloss(definition: string | undefined): string {
  if (!definition) return "";
  const senses = definition.split(";").map((sense) => sense.trim());
  let gloss = senses[0] ?? "";
  for (const sense of senses.slice(1)) {
    if (`${gloss}; ${sense}`.length > 48) break;
    gloss = `${gloss}; ${sense}`;
  }
  return gloss;
}

const order = [...depth.keys()].sort((a, b) => {
  const seedOrder =
    (seedSet.has(a) ? seeds.indexOf(a) : Infinity) - (seedSet.has(b) ? seeds.indexOf(b) : Infinity);
  if (!Number.isNaN(seedOrder) && seedOrder !== 0) return seedOrder;
  return (
    (depth.get(a) ?? 0) - (depth.get(b) ?? 0) || (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)
  );
});
const orderIndex = new Map(order.map((id, index) => [id, index]));

const elements: Record<string, ElementInfo> = {};
for (const id of order) {
  const stroke = strokes.find((s) => s.id === id);
  const entry = dictionary.get(id);
  const pinyin = stroke ? [] : (entry?.pinyin ?? []);
  const gloss = stroke?.gloss ?? curatedGloss.get(id) ?? cleanGloss(entry?.definition);
  let kind: ElementKind = "character";
  if (stroke) kind = "stroke";
  else if (pinyin.length === 0 || variantForms.has(id) || isRadicalBlock(id)) kind = "component";
  elements[id] = {
    kind,
    pinyin,
    gloss,
    ...(stroke ? { name: stroke.name } : {}),
    depth: depth.get(id) ?? 0,
    terminal: !used.has(id),
  };
}

const recipes: RecipeTuple[] = kept
  .sort(
    (a, b) =>
      (orderIndex.get(a.result) ?? 0) - (orderIndex.get(b.result) ?? 0) ||
      formatIds({ layout: a.layout, parts: a.parts }).localeCompare(
        formatIds({ layout: b.layout, parts: b.parts }),
      ),
  )
  .map((recipe) => [recipe.result, recipe.layout, ...recipe.parts]);

const reachableCollections = collections.map((collection) => {
  const missing = collection.members.filter((id) => !depth.has(id));
  if (missing.length > 0)
    console.warn(`collection ${collection.id}: unreachable ${missing.join(" ")}`);
  return { ...collection, members: collection.members.filter((id) => depth.has(id)) };
});

const gameData: GameData = {
  schemaVersion: GAME_DATA_SCHEMA_VERSION,
  seeds,
  elements,
  recipes,
  variants: variants.filter((variant) => depth.has(variant.base)),
  collections: reachableCollections.filter((collection) => collection.members.length > 1),
  sources: [
    {
      name: "Make Me a Hanzi dictionary.txt",
      url: "https://github.com/skishore/makemeahanzi",
      license: "LGPL-3.0-or-later",
    },
  ],
};

writeFileSync(new URL("game-data.json", dataDir), serialize(gameData));

/** One element or recipe per line, so data changes diff cleanly. */
function serialize(data: GameData): string {
  const lines = ["{"];
  lines.push(`"schemaVersion":${data.schemaVersion},`);
  lines.push(`"seeds":${JSON.stringify(data.seeds)},`);
  lines.push(`"elements":{`);
  lines.push(
    Object.entries(data.elements)
      .map(([id, info]) => `${JSON.stringify(id)}:${JSON.stringify(info)}`)
      .join(",\n"),
  );
  lines.push("},");
  lines.push(`"recipes":[`);
  lines.push(data.recipes.map((recipe) => JSON.stringify(recipe)).join(",\n"));
  lines.push("],");
  lines.push(`"variants":${JSON.stringify(data.variants)},`);
  lines.push(`"collections":[`);
  lines.push(data.collections.map((collection) => JSON.stringify(collection)).join(",\n"));
  lines.push("],");
  lines.push(`"sources":${JSON.stringify(data.sources)}`);
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

// 5. Summary and optional diagnostics.
const terminals = Object.values(elements).filter((info) => info.terminal).length;
const maxDepth = Math.max(...Object.values(elements).map((info) => info.depth));
console.log(
  `elements ${order.length} (of ${dictionary.size} in dictionary), recipes ${recipes.length}, ` +
    `terminals ${terminals}, max depth ${maxDepth}; dropped: ${unparseable} unknown-part, ${nestedDropped} nested`,
);

const resultsByKey = new Map<string, Set<string>>();
for (const [result, layout, ...parts] of recipes) {
  const key = formatIds({ layout, parts });
  resultsByKey.set(key, (resultsByKey.get(key) ?? new Set()).add(result));
}
const collisions = [...resultsByKey].filter(([, results]) => results.size > 1);
console.log(`collisions ${collisions.length} (one arrangement, several characters)`);

if (verbose) {
  const blockers = new Map<string, number>();
  for (const recipe of flatRecipes) {
    if (depth.has(recipe.result)) continue;
    for (const [index, part] of recipe.parts.entries()) {
      if (availableDepth(part, recipe.layout, index, recipe.parts.length) === undefined) {
        blockers.set(part, (blockers.get(part) ?? 0) + 1);
      }
    }
  }
  const top = [...blockers].sort((a, b) => b[1] - a[1]).slice(0, 80);
  console.log(
    `\nunreachable parts blocking the most recipes:\n${top.map(([id, n]) => `${id}${n}`).join(" ")}`,
  );
  console.log(
    `\ncollisions:\n${collisions.map(([key, results]) => `${key}=${[...results].join("/")}`).join(" ")}`,
  );
}

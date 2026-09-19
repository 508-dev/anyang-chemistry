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
  reachable,
  recipeKey,
  type Script,
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

// 3. Script of every element. Unihan lists simplified/traditional variant
// pairs; a character is script-specific when it maps only to other characters
// (马 -> 馬), and shared when it is its own variant (干, 着) or has none (女).
const unihan = loadUnihanVariants();
const scriptOverrides = new Map(
  readTsv("curated/scripts.tsv").map(([id = "", script = ""]) => [id, script as Script | "both"]),
);

function unihanScript(id: string): Script | "both" {
  const variants = unihan.get(id);
  if (variants?.simplified && !variants.simplified.includes(id)) return "traditional";
  if (variants?.traditional && !variants.traditional.includes(id)) return "simplified";
  return "both";
}

function scriptOf(id: string): Script | "both" {
  return scriptOverrides.get(id) ?? unihanScript(id);
}

function loadUnihanVariants(): Map<string, { simplified?: string[]; traditional?: string[] }> {
  const map = new Map<string, { simplified?: string[]; traditional?: string[] }>();
  const char = (codepoint: string) => String.fromCodePoint(Number.parseInt(codepoint.slice(2), 16));
  for (const [codepoint = "", field = "", value = ""] of readTsv("vendor/unihan/variants.txt")) {
    const targets = value.split(" ").map((token) => char(token.split("<")[0] ?? ""));
    const entry = map.get(char(codepoint)) ?? {};
    if (field === "kSimplifiedVariant") entry.simplified = targets;
    if (field === "kTraditionalVariant") entry.traditional = targets;
    map.set(char(codepoint), entry);
  }
  return map;
}

// 4. Reachability from the strokes, once per script. Keep anything playable
// in either; clients re-run the same search for the script the player picks.
const byScript = {
  simplified: reachable(seeds, flatRecipes, variants, (id) => scriptOf(id) !== "traditional"),
  traditional: reachable(seeds, flatRecipes, variants, (id) => scriptOf(id) !== "simplified"),
};
const depth = new Map<string, number>();
for (const mode of Object.values(byScript)) {
  for (const [id, d] of mode.depth) depth.set(id, Math.min(d, depth.get(id) ?? d));
}
const kept = [...new Set([...byScript.simplified.recipes, ...byScript.traditional.recipes])];

// 5. Elements, ordered seeds first, then by depth and code point.
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
  const pinyin = entry?.pinyin ?? [];
  const definition = cleanGloss(entry?.definition);
  // Strokes that are also characters keep their reading, so 一 is findable as "yi" / "one".
  const gloss = stroke
    ? [`${stroke.gloss} stroke`, definition].filter(Boolean).join(" · ")
    : (curatedGloss.get(id) ?? definition);
  let kind: ElementKind = "character";
  if (stroke) kind = "stroke";
  else if (pinyin.length === 0 || variantForms.has(id) || isRadicalBlock(id)) kind = "component";
  elements[id] = {
    kind,
    pinyin,
    gloss,
    ...(stroke ? { name: stroke.name } : {}),
    script: scriptOf(id),
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
    {
      name: "Unihan database (kSimplifiedVariant, kTraditionalVariant)",
      url: "https://www.unicode.org/charts/unihan.html",
      license: "Unicode-3.0",
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

// 6. Summary and optional diagnostics.
for (const [script, mode] of Object.entries(byScript)) {
  const used = new Set(mode.recipes.flatMap((recipe) => recipe.parts));
  const terminals = [...mode.depth.keys()].filter((id) => !used.has(id)).length;
  console.log(
    `${script}: elements ${mode.depth.size}, recipes ${mode.recipes.length}, ` +
      `end points ~${terminals}, max depth ${Math.max(...mode.depth.values())}`,
  );
}
console.log(
  `total: elements ${order.length} (of ${dictionary.size} in dictionary), recipes ${recipes.length}; ` +
    `dropped: ${unparseable} unknown-part, ${nestedDropped} nested`,
);

const resultsByKey = new Map<string, Set<string>>();
for (const [result, layout, ...parts] of recipes) {
  const key = formatIds({ layout, parts });
  resultsByKey.set(key, (resultsByKey.get(key) ?? new Set()).add(result));
}
const collisions = [...resultsByKey].filter(([, results]) => results.size > 1);
console.log(`collisions ${collisions.length} (one arrangement, several characters)`);

if (verbose) {
  // Script-specific parts that shared characters are built from. Common ones
  // (幺 in 幼) belong in curated/scripts.tsv as "both".
  const crossScript = new Map<string, string[]>();
  for (const recipe of flatRecipes) {
    if (scriptOf(recipe.result) !== "both" || !depth.has(recipe.result)) continue;
    for (const part of recipe.parts) {
      if (scriptOf(part) === "both") continue;
      crossScript.set(part, [...(crossScript.get(part) ?? []), recipe.result]);
    }
  }
  console.log(
    `\nscript-specific parts of shared characters:\n${[...crossScript]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([part, users]) => `${part}(${scriptOf(part)}): ${users.join("")}`)
      .join("\n")}`,
  );

  const baseByForm = new Map(variants.map((v) => [`${v.form}@${v.position}`, v.base]));
  for (const [script, mode] of Object.entries(byScript)) {
    const other = script === "simplified" ? "traditional" : "simplified";
    const blockers = new Map<string, number>();
    for (const recipe of flatRecipes) {
      if (mode.depth.has(recipe.result) || scriptOf(recipe.result) === other) continue;
      for (const [index, part] of recipe.parts.entries()) {
        const position = partPosition(recipe.layout, index, recipe.parts.length);
        const base = baseByForm.get(`${part}@${position}`);
        if (!mode.depth.has(part) && !(base && mode.depth.has(base))) {
          blockers.set(part, (blockers.get(part) ?? 0) + 1);
        }
      }
    }
    const top = [...blockers].sort((a, b) => b[1] - a[1]).slice(0, 60);
    console.log(
      `\n${script}: unreachable parts blocking the most recipes:\n${top.map(([id, n]) => `${id}${n}`).join(" ")}`,
    );
  }
  console.log(
    `\ncollisions:\n${collisions.map(([key, results]) => `${key}=${[...results].join("/")}`).join(" ")}`,
  );
}

// Ideographic Description Sequences (IDS): the Unicode notation for how a
// character is assembled from parts, e.g. 奶 = ⿰女乃 (女 left, 乃 right).
// Recipes in this game are IDS with every part being a playable element.

export const LAYOUTS = [
  "⿰",
  "⿱",
  "⿲",
  "⿳",
  "⿴",
  "⿵",
  "⿶",
  "⿷",
  "⿸",
  "⿹",
  "⿺",
  "⿻",
] as const;

export type Layout = (typeof LAYOUTS)[number];

export const LAYOUT_ARITY: Record<Layout, 2 | 3> = {
  "⿰": 2,
  "⿱": 2,
  "⿲": 3,
  "⿳": 3,
  "⿴": 2,
  "⿵": 2,
  "⿶": 2,
  "⿷": 2,
  "⿸": 2,
  "⿹": 2,
  "⿺": 2,
  "⿻": 2,
};

/** Layouts where the first part wraps around (or overlaps) the second. */
export const ENCLOSING_LAYOUTS: readonly Layout[] = [
  "⿴",
  "⿵",
  "⿶",
  "⿷",
  "⿸",
  "⿹",
  "⿺",
  "⿻",
];

export const LAYOUT_NAMES: Record<Layout, string> = {
  "⿰": "left to right",
  "⿱": "top to bottom",
  "⿲": "left, middle, right",
  "⿳": "top, middle, bottom",
  "⿴": "full surround",
  "⿵": "surround from above",
  "⿶": "surround from below",
  "⿷": "surround from left",
  "⿸": "surround from upper left",
  "⿹": "surround from upper right",
  "⿺": "surround from lower left",
  "⿻": "overlaid",
};

export function isLayout(value: string): value is Layout {
  return (LAYOUTS as readonly string[]).includes(value);
}

export type IdsNode = string | { layout: Layout; parts: IdsNode[] };

/** Parse an IDS string into a tree. Leaves are single code points. */
export function parseIds(ids: string): IdsNode {
  const chars = Array.from(ids);
  let index = 0;

  const read = (): IdsNode => {
    const char = chars[index++];
    if (char === undefined) throw new Error(`Truncated IDS: ${ids}`);
    if (!isLayout(char)) return char;
    const parts: IdsNode[] = [];
    for (let i = 0; i < LAYOUT_ARITY[char]; i++) parts.push(read());
    return { layout: char, parts };
  };

  const node = read();
  if (index !== chars.length) throw new Error(`Trailing characters in IDS: ${ids}`);
  return node;
}

export function formatIds(node: IdsNode): string {
  return typeof node === "string" ? node : node.layout + node.parts.map(formatIds).join("");
}

/** Stable lookup key for a flat recipe. */
export function recipeKey(layout: Layout, parts: readonly string[]): string {
  return `${layout}${parts.join("\u001f")}`;
}

export type Position = "left" | "middle" | "right" | "top" | "bottom" | "outer" | "inner";

/** Where part `index` sits inside a layout, used to pick positional variant glyphs. */
export function partPosition(layout: Layout, index: number, count: number): Position {
  const last = index === count - 1;
  switch (layout) {
    case "⿰":
    case "⿲":
      return index === 0 ? "left" : last ? "right" : "middle";
    case "⿱":
    case "⿳":
      return index === 0 ? "top" : last ? "bottom" : "middle";
    default:
      return index === 0 ? "outer" : "inner";
  }
}

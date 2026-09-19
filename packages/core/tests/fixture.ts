import type { ElementInfo, GameData } from "../src";

const el = (
  kind: ElementInfo["kind"],
  pinyin: string,
  gloss: string,
  script: ElementInfo["script"] = "both",
) => ({
  kind,
  pinyin: pinyin ? [pinyin] : [],
  gloss,
  script,
});

export const fixture: GameData = {
  schemaVersion: 2,
  seeds: ["一", "丨", "丿", "㇏"],
  elements: {
    一: { ...el("stroke", "yī", "horizontal; one"), name: "横" },
    丨: { ...el("stroke", "", "vertical"), name: "竖" },
    丿: { ...el("stroke", "", "left-falling"), name: "撇" },
    "㇏": { ...el("stroke", "", "right-falling"), name: "捺" },
    十: el("character", "shí", "ten"),
    八: el("character", "bā", "eight"),
    人: el("character", "rén", "person"),
    入: el("character", "rù", "enter"),
    木: el("character", "mù", "tree"),
    林: el("character", "lín", "grove"),
    森: el("character", "sēn", "forest"),
    川: el("character", "chuān", "river"),
    亻: el("component", "", "person"),
    休: el("character", "xiū", "rest"),
    从: el("character", "cóng", "follow", "simplified"),
    仌: el("character", "bīng", "ice", "traditional"),
  },
  recipes: [
    ["十", "⿻", "一", "丨"],
    ["八", "⿰", "丿", "㇏"],
    ["人", "⿻", "丿", "㇏"],
    ["入", "⿻", "㇏", "丿"],
    ["木", "⿻", "十", "八"],
    ["林", "⿰", "木", "木"],
    ["森", "⿱", "木", "林"],
    ["川", "⿲", "丿", "丨", "丨"],
    ["亻", "⿰", "丿", "丨"],
    ["休", "⿰", "亻", "木"],
    ["从", "⿰", "人", "人"],
    ["仌", "⿱", "人", "人"],
  ],
  variants: [{ form: "亻", base: "人", position: "left" }],
  collections: [{ id: "trees", title: "Trees", titleZh: "木林森", members: ["木", "林", "森"] }],
  sources: [],
};

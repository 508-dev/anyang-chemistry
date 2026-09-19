<script lang="ts">
import type { ElementKind } from "@anyang/core";
import type { Game } from "../lib/game.svelte";
import HowTo from "./HowTo.svelte";
import Tile from "./Tile.svelte";

let { game }: { game: Game } = $props();

type Filter = "all" | ElementKind;
type Sort = "found" | "depth";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "全部 All" },
  { value: "stroke", label: "筆畫 Strokes" },
  { value: "component", label: "部件 Parts" },
  { value: "character", label: "字 Characters" },
];

let query = $state("");
let filter = $state<Filter>("all");
let sort = $state<Sort>("found");

/** Lowercase pinyin without tone marks, so "nai" finds nǎi. */
const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A single Han character in the search box also answers "how do I make it?". */
const lookup = $derived.by(() => {
  const chars = Array.from(query.trim());
  return chars.length === 1 && /\p{Script=Han}|[\u2e80-\u2fdf\u31c0-\u31ef]/u.test(chars[0] ?? "")
    ? chars[0]
    : undefined;
});

const ids = $derived.by(() => {
  const needle = plain(query.trim());
  const list = game.progress.discoveries
    .map((discovery) => discovery.id)
    .filter((id) => {
      const info = game.book.element(id);
      if (!info) return false;
      if (filter !== "all" && info.kind !== filter) return false;
      if (!needle) return true;
      return (
        id === query.trim() ||
        info.pinyin.some((reading) => plain(reading).startsWith(needle)) ||
        plain(info.gloss)
          .split(/[^a-z]+/)
          .some((word) => word.startsWith(needle)) ||
        (info.name ?? "").includes(query.trim())
      );
    });
  if (sort === "depth") {
    list.sort((a, b) => (game.book.depth(a) ?? 0) - (game.book.depth(b) ?? 0));
  } else {
    // Strokes stay first; newest discoveries come next.
    const strokes = list.filter((id) => game.book.element(id)?.kind === "stroke");
    const rest = list.filter((id) => game.book.element(id)?.kind !== "stroke").reverse();
    return [...strokes, ...rest];
  }
  return list;
});
</script>

<section class="palette" aria-label="Discovered elements">
  <div class="controls">
    <input type="search" placeholder="搜尋 字 / pinyin / meaning" bind:value={query} />
    <select bind:value={sort} aria-label="Sort">
      <option value="found">最新 Newest</option>
      <option value="depth">層次 Depth</option>
    </select>
  </div>
  <div class="filters" role="radiogroup" aria-label="Filter">
    {#each FILTERS as option (option.value)}
      <button
        type="button"
        role="radio"
        aria-checked={filter === option.value}
        class:active={filter === option.value}
        onclick={() => (filter = option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
  {#if lookup}
    <HowTo {game} char={lookup} />
  {/if}
  <div class="grid">
    {#each ids as id (id)}
      <Tile {game} {id} />
    {:else}
      <p class="none">沒有 · Nothing matches</p>
    {/each}
  </div>
</section>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
    height: 100%;
  }
  .controls {
    display: flex;
    gap: 0.4rem;
  }
  input {
    flex: 1;
    min-width: 0;
  }
  .filters {
    display: flex;
    gap: 0.3rem;
    overflow-x: auto;
  }
  .filters button {
    white-space: nowrap;
    font-size: 0.78rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
  }
  .filters .active {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
  .grid {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(3.6rem, 1fr));
    align-content: start;
    gap: 0.45rem;
    padding: 0.4rem 0.4rem 1rem;
  }
  .none {
    grid-column: 1 / -1;
    color: var(--muted);
    text-align: center;
  }
</style>

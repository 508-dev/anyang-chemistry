<script lang="ts">
import { type BuildStep, howToMake, type Layout, type Position, partPosition } from "@anyang/core";
import type { Game } from "../lib/game.svelte";
import Composite from "./Composite.svelte";

// "How do I make 吃?" — the construction tree down to pieces the player has.
let { game, char }: { game: Game; char: string } = $props();

const tree = $derived(howToMake(game.book, char, game.isDiscovered));
const elsewhere = $derived(game.book.data.elements[char]?.script);

const POSITION_LABELS: Record<Position, string> = {
  left: "左",
  middle: "中",
  right: "右",
  top: "上",
  bottom: "下",
  outer: "外",
  inner: "合",
};

function slot(layout: Layout, index: number, count: number): string {
  return layout === "⿻" ? "叠" : POSITION_LABELS[partPosition(layout, index, count)];
}
</script>

{#snippet step(node: BuildStep)}
  {#if node.recipe}
    {@const recipe = node.recipe}
    <li>
      <div class="line">
        <span class="mini"><Composite book={game.book} layout={recipe.layout} parts={recipe.parts} /></span>
        <span class="result" class:known={node.known}>{node.id}</span>
        <span class="eq">=</span>
        {#each node.parts as part, index (index)}
          {#if index > 0}<span class="plus">+</span>{/if}
          <span class="part" class:known={part.known}>
            {part.id}<small>{slot(recipe.layout, index, recipe.parts.length)}</small>
          </span>
        {/each}
      </div>
      {#if node.parts.some((part) => part.recipe)}
        <ul>
          {#each node.parts as part, index (index)}{@render step(part)}{/each}
        </ul>
      {/if}
    </li>
  {/if}
{/snippet}

<section class="howto" aria-label="How to make {char}">
  {#if tree?.recipe}
    <h3>怎么写 <span class="zh">{char}</span> · How to build it</h3>
    <ul class="root">{@render step(tree)}</ul>
    <p class="legend">
      左右上下 = drop beside · 合 叠 外 = drop on the center · <span class="known-chip">有</span> you have it
    </p>
  {:else if tree}
    <p><span class="zh">{char}</span> is a starting stroke: {game.book.element(char)?.name}.</p>
  {:else if elsewhere && elsewhere !== "both"}
    <p>
      <span class="zh">{char}</span> is
      {elsewhere === "traditional" ? "繁体 traditional" : "简体 simplified"} — switch scripts to build it.
    </p>
  {:else}
    <p><span class="zh">{char}</span> isn't buildable in the game yet.</p>
  {/if}
</section>

<style>
  .howto {
    padding: 0.5rem 0.7rem;
    border: 1px dashed var(--accent-soft);
    border-radius: 0.8rem;
    background: var(--card);
    font-size: 0.85rem;
  }
  h3 {
    margin: 0 0 0.3rem;
    font-size: 0.9rem;
  }
  p {
    margin: 0.2rem 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding-left: 1.1rem;
    border-left: 1px solid var(--line);
  }
  ul.root {
    padding-left: 0;
    border: none;
  }
  li {
    margin: 0.25rem 0;
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .mini {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 0.3rem;
    background: var(--zone);
  }
  .result,
  .part,
  .zh {
    font-family: var(--glyph-font);
  }
  .result {
    font-size: 1.3rem;
  }
  .part {
    font-size: 1.15rem;
    padding: 0 0.3rem;
    border: 1px solid var(--line);
    border-radius: 0.35rem;
  }
  .part small {
    font-size: 0.65rem;
    color: var(--accent);
    margin-left: 0.15rem;
  }
  .known,
  .known-chip {
    background: var(--stroke-card);
  }
  .result.known {
    background: none;
    color: var(--gold-ink);
  }
  .eq,
  .plus,
  .legend {
    color: var(--muted);
  }
  .legend {
    font-size: 0.72rem;
  }
  .known-chip {
    padding: 0 0.25rem;
    border-radius: 0.3rem;
    border: 1px solid var(--line);
  }
</style>

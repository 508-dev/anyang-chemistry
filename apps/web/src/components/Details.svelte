<script lang="ts">
import { formatIds, LAYOUT_NAMES, partPosition, type Recipe, usageHint } from "@anyang/core";
import type { Game } from "../lib/game.svelte";
import Composite from "./Composite.svelte";

let { game, id }: { game: Game; id: string } = $props();

const info = $derived(game.book.element(id));
const hint = $derived(usageHint(game.book, game.progress, id));
// Only reveal recipes whose parts the player already has.
const known = $derived(game.book.recipesFor(id).filter(hasParts));

function hasParts(recipe: Recipe): boolean {
  return recipe.parts.every((part, index) => {
    const base = game.book.baseAt(part, partPosition(recipe.layout, index, recipe.parts.length));
    return game.isDiscovered(part) || (base !== undefined && game.isDiscovered(base));
  });
}
const depth = $derived(game.book.depth(id) ?? 0);
// Unnamed components (𠂉) are described by what they help build, found ones first.
const partOf = $derived.by(() => {
  const results = [...new Set(game.book.recipesUsing(id).map((recipe) => recipe.result))];
  return [
    ...results.filter(game.isDiscovered),
    ...results.filter((r) => !game.isDiscovered(r)),
  ].slice(0, 6);
});
const KIND_LABELS = {
  stroke: "笔画 stroke",
  component: "部件 component",
  character: "字 character",
};
</script>

{#if info}
  <aside class="details">
    <div class="glyph">{id}</div>
    <div class="facts">
      <p class="reading">
        {[info.name, info.pinyin.join(", ")].filter(Boolean).join(" · ")}
        <span class="kind">{KIND_LABELS[info.kind]}</span>
      </p>
      <p class="gloss">
        {#if info.gloss}{info.gloss}{:else if partOf.length > 0}part of <span class="zh">{partOf.join(" ")}</span>{:else}—{/if}
      </p>
      <p class="meta">
        层 depth {depth}
        {#if game.book.isTerminal(id)}· <span class="gold">终 end point</span>{/if}
        {#if hint.total > 0}· 用法 uses {hint.found}/{hint.total}{/if}
      </p>
      {#if depth > 0 && known.length > 0}
        <p class="recipes">
          {#each known as recipe (formatIds({ layout: recipe.layout, parts: recipe.parts }))}
            <span class="recipe" title="{recipe.parts.join(' + ')} · {LAYOUT_NAMES[recipe.layout]}">
              <Composite book={game.book} layout={recipe.layout} parts={recipe.parts} />
            </span>
          {/each}
        </p>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .details {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 0.8rem;
    background: var(--card);
  }
  .glyph {
    font-family: var(--glyph-font);
    font-size: 3rem;
    line-height: 1;
  }
  .facts p {
    margin: 0.1rem 0;
  }
  .reading {
    font-weight: 600;
  }
  .kind,
  .meta {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 400;
  }
  .kind {
    margin-left: 0.4rem;
  }
  .gloss {
    font-size: 0.9rem;
  }
  .zh {
    font-family: var(--glyph-font);
  }
  .gold {
    color: var(--gold-ink);
  }
  .recipes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .recipe {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 0.3rem;
    background: var(--zone);
  }
</style>

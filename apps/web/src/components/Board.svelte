<script lang="ts">
import { arrangementsFor, type Zone } from "@anyang/core";
import { drag } from "../lib/drag.svelte";
import type { Game } from "../lib/game.svelte";
import Composite from "./Composite.svelte";

let { game }: { game: Game } = $props();

const ZONE_LABELS: Record<Zone, string> = {
  top: "上",
  bottom: "下",
  left: "左",
  right: "右",
  center: "合",
};
const EDGE_ZONES: Zone[] = ["top", "left", "right", "bottom"];

const board = $derived(game.board);
const holding = $derived(drag.id ?? game.selected);
const preview = $derived.by(() => {
  if (!drag.id || !drag.zone) return undefined;
  return arrangementsFor(board, drag.id, drag.zone)[0];
});
const current = $derived(
  board.parts.length === 1 ? game.book.element(board.parts[0] ?? "") : undefined,
);

function tapZone(zone: Zone) {
  if (game.selected) game.drop(game.selected, zone);
}
</script>

<section class="board" class:holding={holding !== null} aria-label="Construction board">
  {#each EDGE_ZONES as zone (zone)}
    <button
      type="button"
      class="zone edge {zone}"
      class:hover={drag.zone === zone}
      data-zone={zone}
      disabled={board.parts.length === 0}
      onclick={() => tapZone(zone)}
    >
      {ZONE_LABELS[zone]}
    </button>
  {/each}

  <button
    type="button"
    class="zone center"
    class:hover={drag.zone === "center"}
    data-zone="center"
    onclick={() => tapZone("center")}
  >
    {#key game.feedback?.key}
    <div class="inner" class:shake={game.feedback?.kind === "rejected"}>
    {#if preview}
      <Composite book={game.book} layout={preview.layout} parts={preview.parts} ghost />
    {:else if board.parts.length > 0}
      {#key board.parts.join("")}
        <div class="content">
          <Composite book={game.book} layout={board.layout} parts={board.parts} />
        </div>
      {/key}
    {:else}
      <span class="empty">拖到这里<br /><small>Drag or tap a piece to start</small></span>
    {/if}
    </div>
    {/key}
  </button>

  <footer>
    {#if game.feedback}
      <p class="feedback {game.feedback.kind}">{game.feedback.text}</p>
    {:else if board.layout}
      <p class="feedback">再加一部分 · Add a third part in line, or clear</p>
    {:else if current}
      <p class="current">
        <strong>{board.parts[0]}</strong>
        {current.pinyin.join(", ") || current.name || ""}
        <span>{current.gloss}</span>
      </p>
    {:else}
      <p class="feedback">左右上下 place beside · 合 place on top or inside</p>
    {/if}
    {#if board.parts.length > 0}
      <button type="button" class="clear" onclick={() => game.clearBoard()}>清空 Clear</button>
    {/if}
  </footer>
</section>

<style>
  .board {
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    grid-template-rows: 1fr 3fr 1fr auto;
    grid-template-areas:
      ". top ."
      "left center right"
      ". bottom ."
      "footer footer footer";
    gap: 0.4rem;
    width: 100%;
    max-width: min(34rem, 100%);
    margin-inline: auto;
    aspect-ratio: 1 / 1.08;
  }
  .zone {
    border: 2px dashed transparent;
    border-radius: 0.9rem;
    background: transparent;
    color: var(--muted);
    font-family: var(--glyph-font);
    font-size: 1.1rem;
    transition:
      background 120ms,
      border-color 120ms;
  }
  .edge {
    opacity: 0.35;
  }
  .holding .edge:not(:disabled) {
    opacity: 1;
    border-color: var(--line);
    background: var(--zone);
  }
  .edge:disabled {
    visibility: hidden;
  }
  .top {
    grid-area: top;
  }
  .bottom {
    grid-area: bottom;
  }
  .left {
    grid-area: left;
  }
  .right {
    grid-area: right;
  }
  .center {
    grid-area: center;
    position: relative;
    border: 2px solid var(--line);
    background: var(--paper);
    color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--card);
    padding: 0;
    overflow: hidden;
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 50% 50%;
    background-position: center;
  }
  .holding .center {
    border-color: var(--accent-soft);
  }
  .zone.hover {
    border-color: var(--accent) !important;
    background-color: var(--zone-hover) !important;
  }
  .inner {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }
  .content {
    width: 100%;
    height: 100%;
    animation: pop 260ms ease-out;
  }
  .empty {
    font-size: 1.4rem;
    color: var(--muted);
  }
  .empty small {
    font-family: system-ui, sans-serif;
    font-size: 0.8rem;
  }
  .shake {
    animation: shake 280ms;
  }
  footer {
    grid-area: footer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 2.4rem;
  }
  .feedback,
  .current {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .feedback.rejected {
    color: var(--accent);
  }
  .current strong {
    font-family: var(--glyph-font);
    font-size: 1.3rem;
    color: var(--ink);
    margin-right: 0.3rem;
  }
  .current span {
    margin-left: 0.4rem;
  }
  .clear {
    flex-shrink: 0;
  }
  @keyframes pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
  }
  @keyframes shake {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
</style>

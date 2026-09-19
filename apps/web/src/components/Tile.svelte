<script lang="ts">
import { usageHint } from "@anyang/core";
import { draggable } from "../lib/drag.svelte";
import type { Game } from "../lib/game.svelte";

let { game, id }: { game: Game; id: string } = $props();

const info = $derived(game.book.element(id));
const hint = $derived(usageHint(game.book, game.progress, id));
const label = $derived(info?.kind === "stroke" ? info.name : info?.pinyin[0]);
const exhausted = $derived(hint.total > 0 && hint.found === hint.total);
</script>

<button
  type="button"
  class="tile"
  class:selected={game.selected === id}
  class:unseen={game.unseen.has(id)}
  class:exhausted
  class:terminal={info?.terminal}
  class:stroke={info?.kind === "stroke"}
  title={info?.gloss}
  use:draggable={{
    id,
    onDrop: (dropped, zone) => game.drop(dropped, zone),
    onTap: (tapped) => game.select(game.selected === tapped ? null : tapped),
  }}
>
  <span class="glyph">{id}</span>
  <span class="label">{label ?? ""}</span>
</button>

<style>
  .tile {
    position: relative;
    display: grid;
    grid-template-rows: 1fr auto;
    place-items: center;
    aspect-ratio: 1;
    padding: 0.2rem 0 0.15rem;
    border: 1px solid var(--line);
    border-radius: 0.6rem;
    background: var(--card);
    color: var(--ink);
    cursor: grab;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .tile:hover {
    border-color: var(--accent-soft);
  }
  .selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent);
  }
  .glyph {
    font-family: var(--glyph-font);
    font-size: 1.9rem;
    line-height: 1;
  }
  .label {
    font-size: 0.62rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .stroke {
    background: var(--stroke-card);
  }
  .exhausted .glyph {
    color: var(--muted);
  }
  .terminal::after {
    content: "";
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: var(--gold);
  }
  .unseen::before {
    content: "新";
    position: absolute;
    top: -0.35rem;
    left: -0.35rem;
    font-size: 0.6rem;
    padding: 0.05rem 0.2rem;
    border-radius: 0.3rem;
    background: var(--accent);
    color: white;
  }
</style>

<script lang="ts">
import { score } from "@anyang/core";
import Board from "./components/Board.svelte";
import Details from "./components/Details.svelte";
import Notices from "./components/Notices.svelte";
import Palette from "./components/Palette.svelte";
import Trophies from "./components/Trophies.svelte";
import { drag } from "./lib/drag.svelte";
import { loadGame } from "./lib/game.svelte";
import { localSaveStore } from "./lib/storage";

const loading = loadGame(localSaveStore);
let showTrophies = $state(false);
</script>

{#await loading}
  <p class="status">载入中 · Loading…</p>
{:then game}
  {@const stats = score(game.book, game.progress)}
  <div class="app">
    <header class="top">
      <h1>安阳字炼 <small>Anyang Chemistry</small></h1>
      <button type="button" class="stats" onclick={() => (showTrophies = true)}>
        <span><strong>{stats.discovered}</strong>/{stats.total}</span>
        <span class="terminals">终 {stats.terminals.found}</span>
        <span aria-hidden="true">🏆</span>
      </button>
    </header>

    <main>
      <div class="play">
        <Board {game} />
      </div>
      <div class="side">
        {#if game.selected}
          <Details {game} id={game.selected} />
        {/if}
        <Palette {game} />
      </div>
    </main>

    <Notices {game} />
    {#if showTrophies}
      <Trophies {game} onclose={() => (showTrophies = false)} />
    {/if}
  </div>

  {#if drag.id}
    <div class="drag-ghost" style:left="{drag.x}px" style:top="{drag.y}px">{drag.id}</div>
  {/if}
{:catch error}
  <p class="status">出错了 · {error.message}</p>
{/await}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding: max(0.6rem, env(safe-area-inset-top)) 0.8rem max(0.4rem, env(safe-area-inset-bottom));
    gap: 0.6rem;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 {
    margin: 0;
    font-family: var(--glyph-font);
    font-size: 1.35rem;
  }
  h1 small {
    font-family: system-ui, sans-serif;
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 400;
  }
  .stats {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    border-radius: 999px;
  }
  .terminals {
    color: var(--gold-ink);
  }
  main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 1rem;
  }
  .play {
    display: grid;
    align-items: center;
    min-height: 0;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-height: 0;
  }
  .status {
    text-align: center;
    margin-top: 30vh;
    color: var(--muted);
  }
  .drag-ghost {
    position: fixed;
    z-index: 30;
    pointer-events: none;
    transform: translate(-50%, -60%);
    font-family: var(--glyph-font);
    font-size: 3rem;
    line-height: 1;
    padding: 0.2rem 0.4rem;
    border-radius: 0.6rem;
    background: var(--card);
    border: 1px solid var(--accent-soft);
    box-shadow: 0 8px 22px rgb(60 40 20 / 0.25);
  }
  @media (max-width: 760px) {
    main {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      gap: 0.5rem;
    }
    .play :global(.board) {
      max-width: min(100%, 36dvh);
    }
  }
</style>

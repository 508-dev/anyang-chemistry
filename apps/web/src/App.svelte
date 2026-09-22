<script lang="ts">
import { type Script, score } from "@anyang/core";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { onMount } from "svelte";
import Board from "./components/Board.svelte";
import Details from "./components/Details.svelte";
import Notices from "./components/Notices.svelte";
import Palette from "./components/Palette.svelte";
import Trophies from "./components/Trophies.svelte";
import { drag } from "./lib/drag.svelte";
import { loadGame } from "./lib/game.svelte";
import { saveScript } from "./lib/storage";

// Each script is a separate game: the other script's characters don't exist in
// it, and progress is saved per script.
let { initialScript }: { initialScript: Script } = $props();
// The saved script is a bootstrap value; subsequent changes belong to this component.
// svelte-ignore state_referenced_locally
let script = $state<Script>(initialScript);
const loading = $derived(loadGame(script));
let showTrophies = $state(false);
let scriptSaveFailed = $state(false);

onMount(() => {
  if (Capacitor.getPlatform() !== "android") return;
  const listener = NativeApp.addListener("backButton", () => {
    if (showTrophies) showTrophies = false;
    else void NativeApp.minimizeApp();
  });
  return () => {
    void listener.then((handle) => handle.remove());
  };
});

const SCRIPTS: { value: Script; label: string; title: string }[] = [
  { value: "traditional", label: "繁", title: "繁體 Traditional" },
  { value: "simplified", label: "簡", title: "簡體 Simplified" },
];

async function chooseScript(next: Script) {
  try {
    await saveScript(next);
    script = next;
    scriptSaveFailed = false;
  } catch {
    scriptSaveFailed = true;
  }
}
</script>

{#await loading}
  <p class="status">載入中 · Loading…</p>
{:then game}
  {@const stats = score(game.book, game.progress)}
  <div class="app">
    <header class="top">
      <h1>安陽字煉 <small>Anyang Chemistry</small></h1>
      <div class="script" role="radiogroup" aria-label="Script">
        {#each SCRIPTS as option (option.value)}
          <button
            type="button"
            role="radio"
            aria-checked={script === option.value}
            title={option.title}
            class:active={script === option.value}
            onclick={() => chooseScript(option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>
      <button type="button" class="stats" onclick={() => (showTrophies = true)}>
        <span><strong>{stats.discovered}</strong>/{stats.total}</span>
        <span class="terminals">終 {stats.terminals.found}</span>
        <span aria-hidden="true">🏆</span>
      </button>
    </header>

    {#if scriptSaveFailed}
      <p class="save-error" role="alert">無法儲存語文設定，請再試一次。· Could not save script preference.</p>
    {/if}
    {#if game.saveFailed}
      <p class="save-error" role="alert">
        無法儲存進度 · Could not save progress.
        <button type="button" onclick={() => game.persist()}>重試 Retry</button>
      </p>
    {/if}

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
  <p class="status">出錯了 · {error.message}</p>
{/await}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding: max(0.6rem, env(safe-area-inset-top)) max(0.8rem, env(safe-area-inset-right)) max(0.4rem, env(safe-area-inset-bottom)) max(0.8rem, env(safe-area-inset-left));
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
  .script {
    display: flex;
    margin-left: auto;
    margin-right: 0.5rem;
  }
  .script button {
    font-family: var(--glyph-font);
    padding: 0.25rem 0.6rem;
  }
  .script button:first-child {
    border-radius: 999px 0 0 999px;
  }
  .script button:last-child {
    border-radius: 0 999px 999px 0;
    border-left: none;
  }
  .script .active {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
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
  .play :global(.board) {
    max-width: min(34rem, 100%, calc((100dvh - 6rem) / 1.08));
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
  .save-error {
    margin: 0;
    color: var(--accent);
    font-size: 0.85rem;
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
  @media (max-width: 760px) and (orientation: portrait) {
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

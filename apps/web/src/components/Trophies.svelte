<script lang="ts">
import { score } from "@anyang/core";
import type { Game } from "../lib/game.svelte";

let { game, onclose }: { game: Game; onclose: () => void } = $props();

let dialog = $state<HTMLDialogElement>();
const stats = $derived(score(game.book, game.progress));
const list = $derived(game.achievements);
const terminals = $derived(
  game.progress.discoveries.filter((d) => game.book.isTerminal(d.id)).map((d) => d.id),
);

$effect(() => {
  dialog?.showModal();
});

async function reset() {
  if (confirm("Reset all progress? 確定重來？")) {
    await game.reset();
    onclose();
  }
}
</script>

<dialog bind:this={dialog} {onclose} aria-label="Trophies">
  <header>
    <h2>成就 · Trophies</h2>
    <button type="button" onclick={() => dialog?.close()}>關閉 Close</button>
  </header>

  <dl class="stats">
    <div><dt>已發現 Found</dt><dd>{stats.discovered} / {stats.total}</dd></div>
    <div><dt>終點 End points</dt><dd>{stats.terminals.found} / {stats.terminals.total}</dd></div>
    <div><dt>最深 Deepest</dt><dd>{stats.deepest}</dd></div>
  </dl>

  <ul class="achievements">
    {#each list as achievement (achievement.id)}
      <li class:unlocked={achievement.unlocked}>
        <div>
          <strong>{achievement.title}</strong>
          <small>{achievement.detail}</small>
        </div>
        <progress max={achievement.progress.total} value={achievement.progress.found}></progress>
      </li>
    {/each}
  </ul>

  {#if terminals.length > 0}
    <h3>終點 · End points found</h3>
    <p class="terminals">{terminals.join(" ")}</p>
  {/if}

  <footer>
    <button type="button" class="danger" onclick={reset}>重來 Reset progress</button>
  </footer>
</dialog>

<style>
  dialog {
    width: min(32rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--paper);
    color: var(--ink);
    padding: 1rem 1.2rem;
  }
  dialog::backdrop {
    background: rgb(40 30 20 / 0.35);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2,
  h3 {
    margin: 0.2rem 0;
  }
  h3 {
    font-size: 0.95rem;
    margin-top: 1rem;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin: 0.8rem 0;
  }
  .stats div {
    background: var(--card);
    border-radius: 0.6rem;
    padding: 0.4rem 0.6rem;
  }
  dt {
    font-size: 0.72rem;
    color: var(--muted);
  }
  dd {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
  .achievements {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.4rem;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    padding: 0.4rem 0.6rem;
    border-radius: 0.6rem;
    background: var(--card);
    opacity: 0.7;
  }
  li.unlocked {
    opacity: 1;
    box-shadow: inset 3px 0 0 var(--gold);
  }
  li div {
    display: grid;
  }
  small {
    color: var(--muted);
    font-family: var(--glyph-font);
  }
  progress {
    width: 5rem;
    accent-color: var(--gold);
  }
  .terminals {
    font-family: var(--glyph-font);
    font-size: 1.4rem;
    letter-spacing: 0.2rem;
    margin: 0;
  }
  footer {
    margin-top: 1rem;
    text-align: right;
  }
  .danger {
    color: var(--accent);
  }
</style>

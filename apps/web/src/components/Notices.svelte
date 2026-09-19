<script lang="ts">
import type { Game, Notice } from "../lib/game.svelte";

let { game }: { game: Game } = $props();

const visible = $derived(game.notices.slice(-3));

function autoDismiss(_node: HTMLElement, notice: Notice) {
  const timer = setTimeout(
    () => game.dismiss(notice.key),
    notice.kind === "achievement" ? 4200 : 2600,
  );
  return { destroy: () => clearTimeout(timer) };
}
</script>

<div class="notices" aria-live="polite">
  {#each visible as notice (notice.key)}
    <button
      type="button"
      class="notice {notice.kind}"
      use:autoDismiss={notice}
      onclick={() => game.dismiss(notice.key)}
    >
      {#if notice.kind === "discovery"}
        {@const info = game.book.element(notice.id)}
        <span class="glyph">{notice.id}</span>
        <span>
          <strong>新發現 · New!</strong>
          {info?.pinyin.join(", ")}
          <small>{info?.gloss}</small>
          {#if game.book.isTerminal(notice.id)}<em>終點 · end point</em>{/if}
        </span>
      {:else}
        <span class="glyph">🏆</span>
        <span>
          <strong>成就 · Trophy</strong>
          {notice.achievement.title}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .notices {
    position: fixed;
    top: max(0.8rem, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    gap: 0.4rem;
    z-index: 20;
    width: min(24rem, calc(100vw - 1.6rem));
    pointer-events: none;
  }
  .notice {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    text-align: left;
    padding: 0.5rem 0.8rem;
    border-radius: 0.8rem;
    border: 1px solid var(--line);
    background: var(--card);
    box-shadow: 0 6px 18px rgb(60 40 20 / 0.15);
    animation: slide 220ms ease-out;
  }
  .achievement {
    border-color: var(--gold);
  }
  .glyph {
    font-family: var(--glyph-font);
    font-size: 2.2rem;
    line-height: 1;
  }
  small {
    display: block;
    color: var(--muted);
  }
  em {
    color: var(--gold-ink);
    font-style: normal;
    font-size: 0.8rem;
  }
  @keyframes slide {
    from {
      transform: translateY(-0.8rem);
      opacity: 0;
    }
  }
</style>

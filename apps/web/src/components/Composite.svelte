<script lang="ts">
import { type Layout, partPosition, type RecipeBook } from "@anyang/core";

// Draws an arrangement the way a character is built: parts squeezed into
// rows or columns, or one part wrapped around another. Positional variants
// are substituted (水 on the left draws as 氵).
let {
  book,
  layout,
  parts,
  ghost = false,
}: { book: RecipeBook; layout: Layout | null; parts: string[]; ghost?: boolean } = $props();

const glyphs = $derived(
  parts.map((part, index) =>
    layout ? book.glyphAt(part, partPosition(layout, index, parts.length)) : part,
  ),
);

const ENCLOSURE_CLASS: Partial<Record<Layout, string>> = {
  "⿴": "full",
  "⿵": "above",
  "⿶": "below",
  "⿷": "left",
  "⿸": "upper-left",
  "⿹": "upper-right",
  "⿺": "lower-left",
  "⿻": "overlay",
};
</script>

<div class="composite" class:ghost>
  {#if layout === null}
    <span class="glyph">{glyphs[0]}</span>
  {:else if layout === "⿰" || layout === "⿲"}
    <div class="row" style:--n={parts.length}>
      {#each glyphs as glyph, index (index)}<span class="glyph">{glyph}</span>{/each}
    </div>
  {:else if layout === "⿱" || layout === "⿳"}
    <div class="column" style:--n={parts.length}>
      {#each glyphs as glyph, index (index)}<span class="glyph">{glyph}</span>{/each}
    </div>
  {:else}
    <div class="enclosure {ENCLOSURE_CLASS[layout]}">
      <span class="glyph outer">{glyphs[0]}</span>
      <span class="glyph inner">{glyphs[1]}</span>
    </div>
  {/if}
</div>

<style>
  .composite {
    container-type: size;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .ghost {
    opacity: 0.45;
  }
  .glyph {
    font-family: var(--glyph-font);
    font-size: 82cqi;
    line-height: 1;
    display: grid;
    place-items: center;
  }
  .row,
  .column {
    display: flex;
    width: 100%;
    height: 100%;
  }
  .column {
    flex-direction: column;
  }
  .row .glyph,
  .column .glyph {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: visible;
  }
  .row .glyph {
    transform: scaleX(calc(1.15 / var(--n)));
  }
  .column .glyph {
    transform: scaleY(calc(1.15 / var(--n)));
  }
  .enclosure {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
  }
  .enclosure .glyph {
    position: absolute;
    inset: 0;
  }
  .enclosure .inner {
    font-size: 40cqi;
  }
  .full .inner {
    inset: 22% 22%;
  }
  .above .inner {
    inset: 34% 22% 6%;
  }
  .below .inner {
    inset: 4% 22% 36%;
  }
  .left .inner {
    inset: 22% 4% 22% 36%;
  }
  .upper-left .inner {
    inset: 34% 4% 4% 34%;
  }
  .upper-right .inner {
    inset: 36% 34% 4% 4%;
  }
  .lower-left .inner {
    inset: 4% 4% 36% 32%;
  }
  .overlay .inner {
    font-size: 82cqi;
    opacity: 0.85;
  }
</style>

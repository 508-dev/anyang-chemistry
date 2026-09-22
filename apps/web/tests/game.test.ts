import { type GameData, Progress, RecipeBook } from "@anyang/core";
import { expect, it, vi } from "vitest";
import data from "../../../data/game-data.json";
import { Game } from "../src/lib/game.svelte";
import type { SaveStore } from "../src/lib/storage";

it("keeps a discovery in memory after a save failure and retries the same progress", async () => {
  const book = new RecipeBook(data as unknown as GameData, { script: "traditional" });
  const store: SaveStore = {
    load: async () => undefined,
    save: vi.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined),
    clear: async () => {},
  };
  const game = new Game(book, store, Progress.start(book));
  game.drop("一", "center");
  game.drop("一", "bottom");
  await vi.waitFor(() => expect(game.saveFailed).toBe(true));
  expect(game.progress.has("二")).toBe(true);
  await game.persist();
  expect(game.saveFailed).toBe(false);
  expect(store.save).toHaveBeenLastCalledWith(game.progress.toSave());
});

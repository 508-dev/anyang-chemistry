import type { SaveState } from "@anyang/core";
import { describe, expect, it, vi } from "vitest";
import { createStorage, type KeyValueStore } from "../src/lib/storage";

const save = (id: string): SaveState => ({ schemaVersion: 1, discoveries: [{ id, at: 123 }] });

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const backend: KeyValueStore = {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
  return { values, backend, storage: createStorage(backend) };
}

describe("save compatibility and native persistence", () => {
  it("defaults to Traditional and restores the preference after a new session", async () => {
    const { storage, backend } = memory();
    expect(await storage.loadScript()).toBe("traditional");
    await storage.saveScript("simplified");
    expect(await createStorage(backend).loadScript()).toBe("simplified");
  });

  it("falls back to Traditional for an unrecognized preference", async () => {
    expect(await memory({ "anyang-chemistry:script": "invalid" }).storage.loadScript()).toBe(
      "traditional",
    );
  });

  it("keeps both scripts' discoveries across a restart without changing the save schema", async () => {
    const { storage, backend } = memory();
    await storage.forScript("traditional").save(save("門"));
    await storage.forScript("simplified").save(save("门"));
    const restarted = createStorage(backend);
    expect(await restarted.forScript("traditional").load()).toEqual(save("門"));
    expect(await restarted.forScript("simplified").load()).toEqual(save("门"));
  });

  it("restores legacy saves only into simplified and prefers an existing script save", async () => {
    const { storage, values } = memory({ "anyang-chemistry:save": JSON.stringify(save("门")) });
    expect(await storage.forScript("traditional").load()).toBeUndefined();
    expect(await storage.forScript("simplified").load()).toEqual(save("门"));
    values.set("anyang-chemistry:save:simplified", JSON.stringify(save("木")));
    expect(await storage.forScript("simplified").load()).toEqual(save("木"));
  });

  it("tolerates missing or malformed JSON", async () => {
    const { storage } = memory({ "anyang-chemistry:save:traditional": "{" });
    expect(await storage.forScript("traditional").load()).toBeUndefined();
    expect(await storage.forScript("simplified").load()).toBeUndefined();
  });

  it("reset removes the legacy fallback without touching the other script or preference", async () => {
    const { storage, values } = memory({ "anyang-chemistry:save": JSON.stringify(save("门")) });
    await storage.forScript("traditional").save(save("門"));
    await storage.saveScript("simplified");
    await storage.forScript("simplified").clear();
    expect(await storage.forScript("simplified").load()).toBeUndefined();
    expect(values.has("anyang-chemistry:save")).toBe(false);
    expect(await storage.forScript("traditional").load()).toEqual(save("門"));
    expect(await storage.loadScript()).toBe("simplified");
  });

  it("orders delayed writes, reloads, and reset across separate store instances", async () => {
    const { backend, values } = memory();
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const set = vi.spyOn(backend, "set").mockImplementationOnce(async (key, value) => {
      await blocked;
      values.set(key, value);
    });
    const storage = createStorage(backend);
    const first = storage.forScript("traditional").save(save("二"));
    const second = storage.forScript("traditional").save(save("三"));
    const reloaded = storage.forScript("traditional").load();
    const cleared = storage.forScript("traditional").clear();
    await Promise.resolve();
    expect(set).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(await reloaded).toEqual(save("三"));
    await cleared;
    expect(await storage.forScript("traditional").load()).toBeUndefined();
  });

  it("reports storage failures and allows a subsequent retry", async () => {
    const { backend } = memory();
    vi.spyOn(backend, "set").mockRejectedValueOnce(new Error("disk full"));
    const store = createStorage(backend).forScript("traditional");
    await expect(store.save(save("二"))).rejects.toThrow("disk full");
    await store.save(save("三"));
    expect(await store.load()).toEqual(save("三"));
  });
});

import { afterEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ enabled: true, values: new Map<string, string>() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.enabled } }));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: native.values.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      native.values.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      native.values.delete(key);
    },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  native.values.clear();
  vi.resetModules();
});

it("uses Preferences on native without accessing browser storage", async () => {
  native.enabled = true;
  vi.stubGlobal("localStorage", undefined);
  const { loadScript, saveScript, saveStore } = await import("../src/lib/storage");
  await saveScript("simplified");
  const state = { schemaVersion: 1 as const, discoveries: [{ id: "二", at: 1 }] };
  await saveStore("simplified").save(state);
  expect(await loadScript()).toBe("simplified");
  expect(await saveStore("simplified").load()).toEqual(state);
  expect(native.values.has("anyang-chemistry:save:simplified")).toBe(true);
  await saveStore("simplified").clear();
  expect(await saveStore("simplified").load()).toBeUndefined();
});

it("keeps existing browser saves and script preference readable", async () => {
  native.enabled = false;
  const state = { schemaVersion: 1, discoveries: [{ id: "門", at: 1 }] };
  const values = new Map([
    ["anyang-chemistry:script", "traditional"],
    ["anyang-chemistry:save:traditional", JSON.stringify(state)],
  ]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const { loadScript, saveScript, saveStore } = await import("../src/lib/storage");
  expect(await loadScript()).toBe("traditional");
  expect(await saveStore("traditional").load()).toEqual(state);
  await saveScript("simplified");
  expect(values.get("anyang-chemistry:script")).toBe("simplified");
  expect(native.values.size).toBe(0);
});

import type { SaveState } from "@anyang/core";

/**
 * Where progress lives. Async so a native shell can swap in its own key-value
 * store (e.g. Capacitor Preferences) without touching the game code.
 */
export interface SaveStore {
  load(): Promise<unknown>;
  save(state: SaveState): Promise<void>;
  clear(): Promise<void>;
}

const KEY = "anyang-chemistry:save";

export const localSaveStore: SaveStore = {
  async load() {
    const text = localStorage.getItem(KEY);
    if (text === null) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  },
  async save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  },
  async clear() {
    localStorage.removeItem(KEY);
  },
};

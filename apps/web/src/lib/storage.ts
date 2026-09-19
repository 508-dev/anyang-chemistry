import type { SaveState, Script } from "@anyang/core";

/**
 * Where progress lives. Async so a native shell can swap in its own key-value
 * store (e.g. Capacitor Preferences) without touching the game code.
 */
export interface SaveStore {
  load(): Promise<unknown>;
  save(state: SaveState): Promise<void>;
  clear(): Promise<void>;
}

const PREFIX = "anyang-chemistry";
/** Saves from before the script toggle were mixed-script; they seed the simplified slot. */
const LEGACY_KEY = `${PREFIX}:save`;

/** Each script is its own game with its own save. */
export function localSaveStore(script: Script): SaveStore {
  const key = `${PREFIX}:save:${script}`;
  return {
    async load() {
      const text =
        localStorage.getItem(key) ??
        (script === "simplified" ? localStorage.getItem(LEGACY_KEY) : null);
      if (text === null) return undefined;
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    },
    async save(state) {
      localStorage.setItem(key, JSON.stringify(state));
    },
    async clear() {
      localStorage.removeItem(key);
      if (script === "simplified") localStorage.removeItem(LEGACY_KEY);
    },
  };
}

const SCRIPT_KEY = `${PREFIX}:script`;

export function loadScript(): Script {
  return localStorage.getItem(SCRIPT_KEY) === "traditional" ? "traditional" : "simplified";
}

export function saveScript(script: Script): void {
  localStorage.setItem(SCRIPT_KEY, script);
}

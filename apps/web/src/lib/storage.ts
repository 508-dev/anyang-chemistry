import type { SaveState, Script } from "@anyang/core";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export interface SaveStore {
  load(): Promise<unknown>;
  save(state: SaveState): Promise<void>;
  clear(): Promise<void>;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const PREFIX = "anyang-chemistry";
/** Saves from before the script toggle seed only the simplified slot. */
const LEGACY_KEY = `${PREFIX}:save`;
const SCRIPT_KEY = `${PREFIX}:script`;

/** Share save keys and compatibility rules between the browser and native app. */
export function createStorage(backend: KeyValueStore) {
  // Native writes are asynchronous. Preserve discovery/reset/switch ordering,
  // including across different SaveStore instances for the same script.
  let pending: Promise<unknown> = Promise.resolve();
  function ordered<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }

  return {
    forScript(script: Script): SaveStore {
      const key = `${PREFIX}:save:${script}`;
      return {
        load: () =>
          ordered(async () => {
            const text =
              (await backend.get(key)) ??
              (script === "simplified" ? await backend.get(LEGACY_KEY) : null);
            if (text === null) return undefined;
            try {
              return JSON.parse(text) as unknown;
            } catch {
              return undefined;
            }
          }),
        save: (state) => {
          const text = JSON.stringify(state);
          return ordered(() => backend.set(key, text));
        },
        clear: () =>
          ordered(async () => {
            await backend.remove(key);
            if (script === "simplified") await backend.remove(LEGACY_KEY);
          }),
      };
    },
    loadScript: (): Promise<Script> =>
      ordered(async () =>
        (await backend.get(SCRIPT_KEY)) === "simplified" ? "simplified" : "traditional",
      ),
    saveScript: (script: Script): Promise<void> => ordered(() => backend.set(SCRIPT_KEY, script)),
  };
}

const browserStore: KeyValueStore = {
  get: async (key) => localStorage.getItem(key),
  set: async (key, value) => localStorage.setItem(key, value),
  remove: async (key) => localStorage.removeItem(key),
};

const nativeStore: KeyValueStore = {
  get: async (key) => (await Preferences.get({ key })).value,
  set: (key, value) => Preferences.set({ key, value }),
  remove: (key) => Preferences.remove({ key }),
};

const storage = createStorage(Capacitor.isNativePlatform() ? nativeStore : browserStore);
export const saveStore = storage.forScript;
export const loadScript = storage.loadScript;
export const saveScript = storage.saveScript;

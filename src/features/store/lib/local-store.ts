// External store di atas localStorage untuk useSyncExternalStore: sinkron
// antar-tab lewat event `storage`, dan antar-komponen lewat listener lokal.

export type LocalStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  update: (updater: (current: T) => T) => void;
};

export function createLocalStore<T>(
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string,
  empty: T
): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T = empty;

  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function getSnapshot(): T {
    if (typeof window === "undefined") return empty;
    const raw = readRaw();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = raw ? parse(raw) : empty;
    }
    return cachedValue;
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    if (event.key === null || event.key === key) emit();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot,
    getServerSnapshot: () => empty,
    update(updater) {
      const next = updater(getSnapshot());
      try {
        window.localStorage.setItem(key, serialize(next));
      } catch {
        // Private mode / kuota penuh: tetap perbarui cache di memori.
        cachedRaw = serialize(next);
        cachedValue = next;
      }
      emit();
    },
  };
}

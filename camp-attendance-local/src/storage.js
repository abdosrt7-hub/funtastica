// Local stand-in for the Claude Artifacts `window.storage` API.
// Same method names/shape, but backed by the browser's localStorage
// so the app runs standalone in VS Code / any normal web host.
// NOTE: this is per-browser storage, not shared across different computers.
// When you move to Supabase later, swap this file only — the rest of the
// app code that calls `storage.get/set/delete/list` doesn't need to change.

const PREFIX = "camp_";

function keyFor(key, shared) {
  return PREFIX + (shared ? "shared_" : "personal_") + key;
}

const storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(keyFor(key, shared));
    if (raw === null) return null;
    return { key, value: raw, shared };
  },

  async set(key, value, shared = false) {
    localStorage.setItem(keyFor(key, shared), value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const existed = localStorage.getItem(keyFor(key, shared)) !== null;
    localStorage.removeItem(keyFor(key, shared));
    return { key, deleted: existed, shared };
  },

  async list(prefix = "", shared = false) {
    const fullPrefix = keyFor(prefix, shared);
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keys.push(k.slice(PREFIX.length + (shared ? "shared_".length : "personal_".length)));
      }
    }
    return { keys, prefix, shared };
  },
};

if (typeof window !== "undefined" && !window.storage) {
  window.storage = storage;
}

export default storage;

/* ============================================================
   state.js — central app state, persistence, helpers
   Exposed globally as window.Store
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'album-creator:v1';

  const RARITIES = {
    normal: { label: 'Comum',      weight: 60, badge: 'BASE'   },
    escudo: { label: 'Escudo',     weight: 14, badge: 'CREST'  },
    fwc:    { label: 'FWC',        weight: 12, badge: 'FWC'    },
    shiny:  { label: 'Brilhante',  weight: 10, badge: 'SHINE'  },
    legend: { label: 'Legend',     weight: 4,  badge: 'LEGEND' },
  };

  const THEMES = ['dark', 'light', 'neon', 'vintage'];

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function makeSlot() {
    return { id: uid('slot'), stickerId: null };
  }

  function makePage(slots) {
    const count = slots || 6;
    return { id: uid('page'), slots: Array.from({ length: count }, makeSlot) };
  }

  function defaultState() {
    return {
      mode: 'menu',
      album: {
        title: 'Meu Álbum 2026',
        theme: 'dark',
        cover: { title: 'COPA DOS CRAQUES', subtitle: 'Edição Oficial 2026', image: '' },
        backCover: { text: 'Obrigado por colecionar! • Album Creator Studio', image: '' },
        pages: [makePage(6), makePage(6)],
      },
      stickers: [],          // sticker definitions (the "checklist")
      pack: { color1: '#d946ef', color2: '#6366f1', logo: '⭐', perPack: 5, name: 'Pacote Premium' },
      player: {
        coins: 200,
        owned: {},           // { stickerId: count }
        placed: {},          // { slotId: stickerId }
        packsOpened: 0,
      },
      _seq: 1,               // sticker numbering
    };
  }

  let state = defaultState();

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notify() { listeners.forEach((fn) => fn(state)); }

  /* ============================================================
     Persistence — IndexedDB (large quota) with localStorage fallback.
     Images are base64 and quickly exceed localStorage's ~5MB limit,
     which silently dropped saves and wiped data on reload.
     ============================================================ */
  const DB_NAME = 'album-creator-db';
  const STORE_NAME = 'kv';
  const KEY = 'state';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no-idb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbGet() {
    return idbOpen().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const r = tx.objectStore(STORE_NAME).get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
  }
  function idbSet(value) {
    return idbOpen().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  let saveTimer = null;
  let lastError = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveNow(); }, 200);
  }
  function saveNow() {
    const snapshot = state;
    return idbSet(snapshot)
      .then(() => { lastError = null; })
      .catch(() => {
        // last-resort fallback (may fail on quota, but better than nothing)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); lastError = null; }
        catch (e) { lastError = 'quota'; }
      });
  }

  /* async initial load — resolves Store.ready */
  const ready = (async function loadInitial() {
    let loaded = null;
    try { loaded = await idbGet(); } catch (e) { /* idb unavailable */ }
    if (!loaded) {
      try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) loaded = JSON.parse(raw); } catch (e) { /* ignore */ }
    }
    if (loaded && typeof loaded === 'object') state = migrate(loaded);
    return state;
  })();

  /* keep older saves compatible with newer fields */
  function migrate(s) {
    s.player = s.player || { coins: 200, owned: {}, placed: {}, packsOpened: 0 };
    s.pack = s.pack || defaultState().pack;
    s.stickers = s.stickers || [];
    s.album = s.album || defaultState().album;
    s.album.pages = s.album.pages || [makePage(6)];
    if (s._seq == null) s._seq = (s.stickers.reduce((m, x) => Math.max(m, x.number || 0), 0) || 0) + 1;
    return s;
  }

  /* Mutate helper: run fn, persist, notify */
  function update(fn, opts) {
    fn(state);
    save();
    if (!opts || opts.silent !== true) notify();
  }

  function reset() {
    state = defaultState();
    save();
    notify();
  }

  function get() { return state; }

  /* ---- export / import (save album to a file) ---- */
  function exportJSON() {
    return JSON.stringify({ _app: 'album-creator', _v: 1, exportedAt: new Date().toISOString(), state }, null, 2);
  }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    const incoming = parsed && parsed.state ? parsed.state : parsed;
    if (!incoming || typeof incoming !== 'object' || !('album' in incoming)) throw new Error('Arquivo inválido');
    state = migrate(incoming);
    saveNow();
    notify();
    return state;
  }
  function lastSaveError() { return lastError; }

  /* ---- derived helpers ---- */
  function totalSlots() {
    return state.album.pages.reduce((n, p) => n + p.slots.length, 0);
  }
  function stickerById(id) {
    return state.stickers.find((s) => s.id === id) || null;
  }
  function ownedCount(id) {
    return state.player.owned[id] || 0;
  }
  function placedCount() {
    return Object.keys(state.player.placed).length;
  }
  function isPlaced(stickerId) {
    return Object.values(state.player.placed).includes(stickerId);
  }
  /* how many of a sticker are duplicates (owned minus 1 if placed, etc.) */
  function duplicates() {
    const dups = [];
    state.stickers.forEach((s) => {
      const owned = ownedCount(s.id);
      const placedOne = isPlaced(s.id) ? 1 : 0;
      const spare = owned - placedOne;
      if (spare > 0) dups.push({ sticker: s, count: spare });
    });
    return dups;
  }
  function completion() {
    const total = state.stickers.length || 1;
    const collected = state.stickers.filter((s) => ownedCount(s.id) > 0).length;
    return { collected, total: state.stickers.length, pct: Math.round((collected / total) * 100) };
  }

  window.Store = {
    STORAGE_KEY, RARITIES, THEMES, ready,
    uid, makeSlot, makePage,
    get, update, reset, subscribe, save, saveNow,
    exportJSON, importJSON, lastSaveError,
    totalSlots, stickerById, ownedCount, placedCount, isPlaced, duplicates, completion,
  };
})();

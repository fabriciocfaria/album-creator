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

  let state = load() || defaultState();

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notify() { listeners.forEach((fn) => fn(state)); }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) { return null; }
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
    STORAGE_KEY, RARITIES, THEMES,
    uid, makeSlot, makePage,
    get, update, reset, subscribe, save,
    totalSlots, stickerById, ownedCount, placedCount, isPlaced, duplicates, completion,
  };
})();

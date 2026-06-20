/* ============================================================
   main.js — App controller: routing, menu, theme, nav wiring
   Exposed as window.App
   ============================================================ */
(function () {
  'use strict';
  const { el, clear, toast } = window.UI;
  const Store = window.Store;

  const view = document.getElementById('view');

  function applyTheme() {
    document.body.setAttribute('data-theme', Store.get().album.theme || 'dark');
  }

  function setMode(mode) {
    Store.update((st) => { st.mode = mode; });
    updateNav();
    rerender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNav() {
    const mode = Store.get().mode;
    document.querySelectorAll('#nav-tabs .nav-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  function rerender() {
    const mode = Store.get().mode;
    clear(view);
    if (mode === 'editor') window.Editor.render(view);
    else if (mode === 'player') window.Player.render(view);
    else renderMenu(view);
  }

  /* ============================================================
     MAIN MENU
     ============================================================ */
  function renderMenu(container) {
    const s = Store.get();
    const c = Store.completion();

    const hero = el('div', { class: 'glass relative overflow-hidden rounded-3xl p-8 text-center sm:p-14 view-in' }, [
      el('div', { class: 'pointer-events-none absolute -left-10 -top-10 text-[10rem] opacity-10 animate-floaty' }, '⚽'),
      el('div', { class: 'pointer-events-none absolute -bottom-16 -right-8 text-[10rem] opacity-10 animate-floaty' }, '🏆'),
      el('span', { class: 'inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300' }, 'Premium Sticker Studio'),
      el('h1', { class: 'mt-5 font-display text-4xl font-bold leading-tight sm:text-6xl' }, [
        'Crie. Colecione. ',
        el('span', { class: 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent' }, 'Complete.'),
      ]),
      el('p', { class: 'mx-auto mt-4 max-w-xl text-slate-300' }, 'Desenhe seu próprio álbum de figurinhas, monte os pacotinhos e viva a emoção de abrir cada pacote para completar a coleção.'),
      el('div', { class: 'mt-8 flex flex-wrap justify-center gap-3' }, [
        el('button', { class: 'btn-primary text-lg', onclick: () => setMode('editor') }, '🎨 Modo Editor'),
        el('button', { class: 'btn-secondary text-lg', onclick: () => setMode('player') }, '🎮 Modo Jogador'),
      ]),
    ]);

    const stats = el('div', { class: 'mt-6 grid gap-4 sm:grid-cols-4 view-in' }, [
      statCard('🃏', s.stickers.length, 'Figurinhas criadas'),
      statCard('📄', s.album.pages.length, 'Páginas'),
      statCard('✅', `${c.collected}/${c.total}`, 'Coletadas'),
      statCard('📦', s.player.packsOpened, 'Pacotes abertos'),
    ]);

    const features = el('div', { class: 'mt-6 grid gap-4 md:grid-cols-3 view-in' }, [
      featureCard('📔', 'Álbum Customizável', 'Capa, contracapa, páginas dinâmicas e 4 paletas de cores (Dark, Light, Neon, Vintage).'),
      featureCard('✨', 'Raridades Premium', 'Escudos, FWC, Brilhantes holográficos e Legends dourados que reagem ao mouse.'),
      featureCard('🎁', 'Pacotinhos Animados', 'Configure os pacotes e abra com efeito de rasgar e flip das cartas.'),
    ]);

    // rarity showcase using a few sample stickers (or real ones)
    const showcase = buildShowcase(s);

    // save / load album
    const saveCard = el('div', { class: 'glass rounded-3xl p-6 view-in' }, [
      el('h3', { class: 'mb-1 font-display text-xl font-bold' }, '💾 Salvar / Carregar álbum'),
      el('p', { class: 'mb-4 text-sm text-slate-400' }, 'Seu álbum é salvo automaticamente neste navegador. Exporte um arquivo para guardar como backup ou abrir em outro dispositivo.'),
      el('div', { class: 'flex flex-wrap gap-3' }, [
        el('button', { class: 'btn-primary', onclick: saveAlbum }, '💾 Salvar agora'),
        el('button', { class: 'btn-secondary', onclick: exportAlbum }, '⬇️ Exportar (.json)'),
        el('button', { class: 'btn-secondary', onclick: importAlbum }, '⬆️ Importar (.json)'),
      ]),
    ]);

    container.appendChild(el('div', { class: 'space-y-6' }, [hero, stats, features, showcase, saveCard]));
  }

  function statCard(icon, value, label) {
    return el('div', { class: 'glass-soft rounded-2xl p-5 text-center' }, [
      el('div', { class: 'text-2xl' }, icon),
      el('div', { class: 'mt-1 font-display text-2xl font-bold' }, String(value)),
      el('div', { class: 'text-xs uppercase tracking-wide text-slate-400' }, label),
    ]);
  }
  function featureCard(icon, title, desc) {
    return el('div', { class: 'glass rounded-2xl p-6 transition hover:-translate-y-1' }, [
      el('div', { class: 'mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 text-2xl' }, icon),
      el('h3', { class: 'mb-1 font-display text-lg font-bold' }, title),
      el('p', { class: 'text-sm text-slate-400' }, desc),
    ]);
  }

  function buildShowcase(s) {
    const samples = s.stickers.length >= 3 ? s.stickers.slice(0, 6) : SAMPLE_STICKERS;
    const grid = el('div', { class: 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6' },
      samples.map((stk) => window.Stickers.render(stk, { showStats: true })));
    window.UI.bindHolo(grid);
    return el('div', { class: 'glass rounded-3xl p-6 view-in' }, [
      el('h3', { class: 'mb-1 font-display text-xl font-bold' }, 'Vitrine de raridades'),
      el('p', { class: 'mb-5 text-sm text-slate-400' }, 'Passe o mouse sobre as Brilhantes e Legends. ✨'),
      grid,
    ]);
  }

  const SAMPLE_STICKERS = [
    { id: 's1', number: 1, name: 'Comum', team: 'Time A', type: 'normal', height: '1,80 m', weight: '75 kg' },
    { id: 's2', number: 2, name: 'Escudo', team: 'Crest FC', type: 'escudo' },
    { id: 's3', number: 3, name: 'FWC Star', team: 'Special Ed.', type: 'fwc', height: '1,78 m' },
    { id: 's4', number: 4, name: 'Brilhante', team: 'Holo United', type: 'shiny', height: '1,82 m' },
    { id: 's5', number: 5, name: 'Legend', team: 'Hall of Fame', type: 'legend', height: '1,85 m', weight: '80 kg' },
    { id: 's6', number: 6, name: 'Craque', team: 'Time B', type: 'normal', weight: '70 kg' },
  ];

  /* ============================================================
     wiring
     ============================================================ */
  /* ---- save / export / import ---- */
  function saveAlbum() {
    Store.saveNow().then(() => {
      if (Store.lastSaveError() === 'quota') toast('Sem espaço para salvar. Exporte o álbum (.json).', 'error');
      else toast('Álbum salvo 💾', 'success');
    });
  }
  function exportAlbum() {
    const text = Store.exportJSON();
    const name = (Store.get().album.title || 'meu-album').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.album.json';
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Álbum exportado ⬇️', 'success');
  }
  function importAlbum() {
    const input = el('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files[0]; input.remove();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Store.importJSON(reader.result);
          applyTheme(); updateNav(); rerender();
          toast('Álbum importado ✅', 'success');
        } catch (e) { toast('Arquivo inválido', 'error'); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  async function init() {
    await Store.ready;                 // wait for IndexedDB load before first render
    applyTheme();
    updateNav();
    rerender();

    document.querySelectorAll('#nav-tabs .nav-tab').forEach((b) => {
      b.addEventListener('click', () => setMode(b.dataset.mode));
    });
    document.getElementById('nav-logo').addEventListener('click', () => setMode('menu'));

    document.getElementById('btn-save').addEventListener('click', saveAlbum);
    document.getElementById('btn-export').addEventListener('click', exportAlbum);
    document.getElementById('btn-import').addEventListener('click', importAlbum);
    document.getElementById('btn-reset').addEventListener('click', () => {
      window.UI.confirm('Reiniciar TODO o projeto? Isso apaga álbum, figurinhas e progresso.', () => {
        Store.reset(); applyTheme(); updateNav(); rerender(); toast('Projeto reiniciado', 'info');
      }, { yes: 'Reiniciar' });
    });

    // save before leaving / when tab is hidden (mobile-friendly)
    window.addEventListener('beforeunload', () => { Store.saveNow(); });
    window.addEventListener('pagehide', () => { Store.saveNow(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.saveNow(); });

    // warn if the browser is NOT persisting storage (private mode / in-app browser)
    if (Store.isPersistent() === false) showStorageWarning();
  }

  function showStorageWarning() {
    if (document.getElementById('storage-warn')) return;
    const bar = el('div', { id: 'storage-warn', class: 'glass mx-auto mt-3 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border-amber-400/40 px-4 py-3 text-sm' }, [
      el('span', {}, '⚠️ Este navegador não está guardando seus dados (modo privado ou navegador de um app). Ao recarregar, o álbum some. Abra no Chrome/Safari ou use Exportar para salvar um arquivo.'),
      el('div', { class: 'flex gap-2' }, [
        el('button', { class: 'btn-secondary !py-2 text-sm', onclick: exportAlbum }, '⬇️ Exportar'),
        el('button', { class: 'ghost-btn', title: 'Fechar', onclick: () => bar.remove() }, '×'),
      ]),
    ]);
    const header = document.querySelector('header');
    header.parentNode.insertBefore(bar, header.nextSibling);
  }

  window.App = { rerender, setMode, applyTheme, saveAlbum, exportAlbum, importAlbum };
  document.addEventListener('DOMContentLoaded', init);
})();

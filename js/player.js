/* ============================================================
   player.js — MODO JOGADOR
   Sub-views: Banca (loja) · Álbum interativo · Repetidas
   Exposed as window.Player.render(container)
   ============================================================ */
(function () {
  'use strict';
  const { el, clear, toast, modal, sparkleBurst } = window.UI;
  const Store = window.Store;
  const { RARITIES } = Store;

  let view = 'shop';            // shop | album | dupes
  let pendingPaste = null;      // stickerId queued to paste into album

  function render(container) {
    const s = Store.get();
    clear(container);

    if (!s.stickers.length) {
      container.appendChild(emptyState());
      return;
    }

    container.appendChild(playerHeader(s));

    const body = el('div', { class: 'view-in' });
    container.appendChild(body);
    if (view === 'shop') renderShop(body, s);
    else if (view === 'album') renderAlbum(body, s);
    else renderDupes(body, s);
  }

  function emptyState() {
    return el('div', { class: 'glass mx-auto mt-10 max-w-lg rounded-3xl p-10 text-center view-in' }, [
      el('div', { class: 'mb-4 text-6xl animate-floaty' }, '🃏'),
      el('h2', { class: 'mb-2 font-display text-2xl font-bold' }, 'Nenhuma figurinha no álbum'),
      el('p', { class: 'mb-6 text-slate-400' }, 'Vá ao Modo Editor e crie figurinhas para poder colecioná-las aqui.'),
      el('button', { class: 'btn-primary mx-auto', onclick: () => window.App.setMode('editor') }, '🎨 Abrir Editor'),
    ]);
  }

  function playerHeader(s) {
    const c = Store.completion();
    return el('div', { class: 'mb-6 space-y-4 view-in' }, [
      el('div', { class: 'flex flex-wrap items-center justify-between gap-4' }, [
        el('div', {}, [
          el('h1', { class: 'font-display text-2xl font-bold sm:text-3xl' }, '🎮 ' + s.album.title),
          el('p', { class: 'text-sm text-slate-400' }, `${c.collected}/${c.total} figurinhas · ${s.player.packsOpened} pacotes abertos`),
        ]),
        el('div', { class: 'glass-soft flex items-center gap-3 rounded-xl px-4 py-2' }, [
          el('span', { class: 'text-xl' }, '🪙'),
          el('span', { class: 'font-display text-lg font-bold' }, String(s.player.coins)),
        ]),
      ]),
      // progress bar
      el('div', { class: 'glass-soft overflow-hidden rounded-full p-1' }, [
        el('div', {
          class: 'h-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-700',
          style: `width:${c.pct}%`,
        }),
      ]),
      // sub-tabs
      el('div', { class: 'glass-soft flex gap-1 rounded-xl p-1' }, [
        subTab('shop', '🛒 Banca'),
        subTab('album', '📖 Álbum'),
        subTab('dupes', `🔁 Repetidas (${Store.duplicates().reduce((n, d) => n + d.count, 0)})`),
      ]),
    ]);
  }

  function subTab(id, label) {
    return el('button', {
      class: 'nav-tab flex-1 ' + (view === id ? 'active' : ''),
      onclick: () => { view = id; pendingPaste = null; window.App.rerender(); },
    }, label);
  }

  /* ============================================================
     SHOP / BANCA
     ============================================================ */
  function renderShop(body, s) {
    const PRICE = 50;
    const wrap = el('div', { class: 'grid gap-6 lg:grid-cols-2' });

    const buyPanel = el('div', { class: 'glass rounded-3xl p-8 text-center' }, [
      el('div', { class: 'mb-2 text-sm uppercase tracking-widest text-slate-400' }, 'Banca de figurinhas'),
      el('h2', { class: 'mb-6 font-display text-2xl font-bold' }, s.pack.name),
      window.Editor ? packVisual(s.pack) : el('div'),
      el('p', { class: 'mt-6 text-slate-400' }, `${s.pack.perPack} figurinhas · 🪙 ${PRICE} por pacote`),
      el('div', { class: 'mt-6 flex flex-col items-center gap-3' }, [
        el('button', {
          class: 'btn-primary text-lg ' + (s.player.coins < PRICE ? 'opacity-50 pointer-events-none' : ''),
          onclick: () => buyPack(PRICE),
        }, '🎁 Comprar pacote'),
        el('button', { class: 'btn-secondary text-sm', onclick: () => addCoins(100) }, '＋ Ganhar 100 moedas (demo)'),
      ]),
    ]);
    wrap.appendChild(buyPanel);

    // recent / tips panel
    const info = el('div', { class: 'glass rounded-3xl p-8' }, [
      el('h3', { class: 'mb-4 font-display text-lg font-bold' }, '✨ Raridades'),
      el('div', { class: 'space-y-2' }, Object.keys(RARITIES).map((k) =>
        el('div', { class: 'flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm' }, [
          el('span', { class: 'font-semibold' }, RARITIES[k].label),
          el('span', { class: 'text-slate-400' }, `~${RARITIES[k].weight}%`),
        ])
      )),
      el('p', { class: 'mt-4 text-xs text-slate-400' }, 'Quanto mais raro, menor a chance de aparecer no pacote. Brilhantes e Legends têm efeitos especiais — passe o mouse sobre elas!'),
    ]);
    wrap.appendChild(info);
    body.appendChild(wrap);
  }

  function packVisual(pack) {
    const layers = [el('div', { class: 'pack3d__strip' })];
    if (pack.image) layers.push(el('div', { class: 'pack3d__img', style: `background-image:url('${pack.image}')` }));
    layers.push(el('div', { class: 'pack3d__logo' }, pack.image ? '' : pack.logo));
    return el('div', { class: 'pack3d animate-floaty', style: `--pack-c1:${pack.color1};--pack-c2:${pack.color2}` }, layers);
  }

  function addCoins(n) { Store.update((st) => { st.player.coins += n; }); toast('+' + n + ' 🪙', 'success'); }

  function buyPack(price) {
    const s = Store.get();
    if (s.player.coins < price) { toast('Moedas insuficientes', 'error'); return; }
    const drawn = drawPack(s);
    Store.update((st) => {
      st.player.coins -= price;
      st.player.packsOpened += 1;
      drawn.forEach((stk) => { st.player.owned[stk.id] = (st.player.owned[stk.id] || 0) + 1; });
    }, { silent: true });
    openPackAnimation(s.pack, drawn);
  }

  /* weighted random draw of N stickers from the checklist */
  function drawPack(s) {
    const pool = s.stickers;
    const n = s.pack.perPack;
    const result = [];
    const totalWeight = pool.reduce((sum, stk) => sum + (RARITIES[stk.type]?.weight || 10), 0);
    for (let i = 0; i < n; i++) {
      let r = Math.random() * totalWeight;
      let pick = pool[0];
      for (const stk of pool) {
        r -= (RARITIES[stk.type]?.weight || 10);
        if (r <= 0) { pick = stk; break; }
      }
      result.push(pick);
    }
    return result;
  }

  /* ============================================================
     PACK OPENING ANIMATION (rip + flip reveal one-by-one)
     ============================================================ */
  function openPackAnimation(pack, drawn) {
    const stage = el('div', { class: 'flex flex-col items-center gap-6 py-2' });
    const packNode = packVisual(pack);
    const tapHint = el('p', { class: 'text-sm text-slate-300 animate-pulse' }, '👆 Toque para rasgar o pacote');
    stage.appendChild(packNode);
    stage.appendChild(tapHint);

    const m = modal([
      el('h3', { class: 'mb-1 text-center font-display text-xl font-bold' }, 'Abrindo pacote!'),
      stage,
    ], { size: 'max-w-2xl', dismissable: false });

    function rip() {
      packNode.removeEventListener('click', rip);
      packNode.classList.add('pack-rip');
      tapHint.remove();
      setTimeout(() => revealCards(stage, drawn, m), 700);
    }
    packNode.addEventListener('click', rip);
  }

  function revealCards(stage, drawn, m) {
    clear(stage);
    const s = Store.get();
    const grid = el('div', { class: 'grid grid-cols-3 gap-3 sm:grid-cols-' + Math.min(drawn.length, 6) });
    // determine "new" status BEFORE this pack was added — use placed/owned counts
    const cards = drawn.map((stk, i) => {
      const card = window.Stickers.render(stk, { showStats: true });
      const cover = el('div', { class: 'flip__cover' }, [el('span', {}, '?')]);
      const flip = el('div', { class: 'flip aspect-[3/4]' }, [
        el('div', { class: 'flip__inner' }, [
          el('div', { class: 'flip__face' }, [cover]),
          el('div', { class: 'flip__face flip__back' }, [card]),
        ]),
      ]);
      return { flip, stk };
    });
    cards.forEach((c) => grid.appendChild(c.flip));
    window.UI.bindHolo(grid);

    stage.appendChild(grid);
    const actions = el('div', { class: 'flex justify-center gap-3' }, [
      el('button', { class: 'btn-secondary', onclick: () => revealAll() }, 'Revelar todas'),
      el('button', { class: 'btn-primary', onclick: () => { m.close(); window.App.rerender(); } }, 'Concluir ✓'),
    ]);
    stage.appendChild(actions);

    // auto-flip sequentially
    let idx = 0;
    function flipNext() {
      if (idx >= cards.length) return;
      const c = cards[idx++];
      c.flip.classList.add('revealed');
      const r = RARITIES[c.stk.type];
      if (c.stk.type === 'legend' || c.stk.type === 'shiny') {
        const rect = c.flip.getBoundingClientRect();
        sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        toast((c.stk.type === 'legend' ? '👑 LEGEND' : '✨ BRILHANTE') + ': ' + c.stk.name, 'success');
      }
      setTimeout(flipNext, 650);
    }
    function revealAll() { cards.forEach((c) => c.flip.classList.add('revealed')); }
    setTimeout(flipNext, 350);
  }

  /* ============================================================
     INTERACTIVE ALBUM
     ============================================================ */
  function renderAlbum(body, s) {
    if (pendingPaste) {
      const stk = Store.stickerById(pendingPaste);
      body.appendChild(el('div', { class: 'glass-soft mb-4 flex items-center justify-between rounded-xl p-3' }, [
        el('span', { class: 'text-sm' }, `📌 Colando "${stk ? stk.name : ''}" — clique no slot destacado.`),
        el('button', { class: 'btn-secondary text-sm', onclick: () => { pendingPaste = null; window.App.rerender(); } }, 'Cancelar'),
      ]));
    }

    s.album.pages.forEach((page, idx) => {
      let content;
      if (page.layout === 'free' && page.design) {
        const stage = window.Canvas.renderStatic(page.design, {
          renderSlot: (elm) => {
            const slot = page.slots.find((sl) => sl.id === elm.slotId);
            return slot ? albumSlot(slot, s) : el('div');
          },
        });
        content = el('div', { class: 'mx-auto', style: 'aspect-ratio:3/4;max-width:420px' }, [stage]);
      } else {
        content = el('div', { class: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6' },
          page.slots.map((slot) => albumSlot(slot, s)));
      }
      body.appendChild(el('div', { class: 'glass mb-5 rounded-2xl p-5 page-in' }, [
        el('h3', { class: 'mb-4 font-display font-semibold text-slate-300' }, `Página ${idx + 1}`),
        content,
      ]));
    });

    window.UI.bindHolo(body);
  }

  function albumSlot(slot, s) {
    const expected = slot.stickerId ? Store.stickerById(slot.stickerId) : null;
    const placed = s.player.placed[slot.id];

    // already filled
    if (placed) {
      const stk = Store.stickerById(placed);
      const node = window.Stickers.render(stk, { showStats: false });
      node.classList.add('cursor-pointer');
      node.addEventListener('click', () => showCardDetail(stk));
      return el('div', { class: 'relative paste-pop' }, [node]);
    }

    // empty slot — is this where the pending sticker goes?
    const canPaste = pendingPaste && expected && expected.id === pendingPaste;
    const owned = expected ? Store.ownedCount(expected.id) > 0 : false;

    const slotEl = el('div', { class: 'slot' + (canPaste ? ' can-paste' : '') }, [
      expected
        ? el('div', { class: 'slot__hint' }, [
            el('div', { class: 'mb-1 text-lg opacity-50' }, '#' + expected.number),
            el('div', {}, owned ? '✅ na coleção' : '🔒 ' + expected.name),
          ])
        : el('div', { class: 'slot__hint' }, '— vazio —'),
    ]);

    if (canPaste) {
      slotEl.addEventListener('click', (e) => pasteSticker(slot.id, expected.id, e));
    } else if (expected && owned && !pendingPaste) {
      // quick-paste: clicking an owned-but-empty slot pastes directly
      slotEl.classList.add('cursor-pointer');
      slotEl.addEventListener('click', (e) => pasteSticker(slot.id, expected.id, e));
    }
    return slotEl;
  }

  function pasteSticker(slotId, stickerId, e) {
    if (Store.ownedCount(stickerId) <= 0) { toast('Você ainda não tem essa figurinha', 'error'); return; }
    Store.update((st) => { st.player.placed[slotId] = stickerId; });
    pendingPaste = null;
    if (e) sparkleBurst(e.clientX, e.clientY);
    toast('Figurinha colada! 🎉', 'success');
    window.App.rerender();
  }

  function showCardDetail(stk) {
    modal([
      window.Stickers.detailCard(stk),
      el('div', { class: 'mt-5 flex justify-center' }, [
        el('button', { class: 'btn-secondary', onclick: () => document.querySelector('.modal-overlay')?.remove() }, 'Fechar'),
      ]),
    ], { size: 'max-w-sm' });
  }

  /* ============================================================
     DUPLICATES PILE
     ============================================================ */
  function renderDupes(body, s) {
    const dups = Store.duplicates();
    if (!dups.length) {
      body.appendChild(el('div', { class: 'glass rounded-3xl p-10 text-center text-slate-400' }, [
        el('div', { class: 'mb-3 text-5xl' }, '🗂'),
        el('p', {}, 'Nenhuma figurinha repetida por enquanto. Abra mais pacotes!'),
      ]));
      return;
    }

    body.appendChild(el('div', { class: 'mb-4 flex items-center justify-between' }, [
      el('p', { class: 'text-sm text-slate-400' }, 'Figurinhas que você tem em duplicidade. Cole as que ainda faltam no álbum ou troque com amigos!'),
      el('button', { class: 'btn-secondary text-sm', onclick: () => recycleDupes() }, '♻ Reciclar todas (+🪙)'),
    ]));

    const grid = el('div', { class: 'card-grid' });
    dups.forEach(({ sticker, count }) => {
      const card = window.Stickers.render(sticker, { showStats: false });
      const badge = el('div', { class: 'absolute -right-2 -top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-sm font-bold shadow-lg' }, '×' + count);
      const placeBtn = el('button', {
        class: 'btn-primary mt-2 w-full text-xs',
        onclick: () => { pendingPaste = sticker.id; view = 'album'; window.App.rerender(); toast('Escolha o slot no álbum', 'info'); },
      }, Store.isPlaced(sticker.id) ? '✔ já colada' : '📌 Colar no álbum');
      if (Store.isPlaced(sticker.id)) { placeBtn.classList.add('opacity-50', 'pointer-events-none'); }
      grid.appendChild(el('div', { class: 'relative' }, [card, badge, placeBtn]));
    });
    window.UI.bindHolo(grid);
    body.appendChild(grid);
  }

  function recycleDupes() {
    const dups = Store.duplicates();
    const reward = dups.reduce((n, d) => n + d.count * 5, 0);
    if (!reward) return;
    window.UI.confirm(`Reciclar ${dups.reduce((n, d) => n + d.count, 0)} repetidas por 🪙 ${reward}?`, () => {
      Store.update((st) => {
        dups.forEach(({ sticker }) => {
          const placedOne = Store.isPlaced(sticker.id) ? 1 : 0;
          st.player.owned[sticker.id] = placedOne; // keep only the placed copy (or 0)
        });
        st.player.coins += reward;
      });
      toast('+' + reward + ' 🪙 ♻', 'success');
      window.App.rerender();
    }, { yes: 'Reciclar' });
  }

  window.Player = { render };
})();

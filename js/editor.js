/* ============================================================
   editor.js — MODO EDITOR
   Tabs: Álbum (capa/contracapa/páginas/tema) · Figurinhas · Pacote
   Exposed as window.Editor.render(container)
   ============================================================ */
(function () {
  'use strict';
  const { el, clear, toast, modal, confirm, dropzone } = window.UI;
  const Store = window.Store;
  const { RARITIES, THEMES } = Store;

  let activeTab = 'album';

  function render(container) {
    const s = Store.get();
    clear(container);

    const header = el('div', { class: 'mb-6 flex flex-wrap items-center justify-between gap-4 view-in' }, [
      el('div', {}, [
        el('h1', { class: 'font-display text-2xl font-bold sm:text-3xl' }, '🎨 Modo Editor'),
        el('p', { class: 'text-sm text-slate-400' }, 'Desenhe o álbum, crie figurinhas e configure os pacotinhos.'),
      ]),
      el('div', { class: 'glass-soft flex gap-1 rounded-xl p-1' }, [
        tabBtn('album', '📔 Álbum'),
        tabBtn('stickers', '🃏 Figurinhas'),
        tabBtn('pack', '📦 Pacote'),
      ]),
    ]);
    container.appendChild(header);

    const body = el('div', { class: 'view-in' });
    container.appendChild(body);

    if (activeTab === 'album') renderAlbumTab(body, s);
    else if (activeTab === 'stickers') renderStickersTab(body, s);
    else renderPackTab(body, s);
  }

  function tabBtn(id, label) {
    return el('button', {
      class: 'nav-tab ' + (activeTab === id ? 'active' : ''),
      onclick: () => { activeTab = id; window.App.rerender(); },
    }, label);
  }

  /* ============================================================
     TAB: ÁLBUM
     ============================================================ */
  function renderAlbumTab(body, s) {
    const grid = el('div', { class: 'grid gap-6 lg:grid-cols-3' });

    /* --- settings column --- */
    const settings = el('div', { class: 'space-y-6 lg:col-span-1' });

    // General
    settings.appendChild(panel('Configurações Gerais', [
      labeled('Título do álbum', input(s.album.title, (v) => Store.update((st) => { st.album.title = v; }, { silent: true }))),
      labeled('Paleta de cores', themePicker(s)),
    ]));

    // Cover
    settings.appendChild(panel('Capa', [
      labeled('Título da capa', input(s.album.cover.title, (v) => Store.update((st) => { st.album.cover.title = v; }))),
      labeled('Subtítulo', input(s.album.cover.subtitle, (v) => Store.update((st) => { st.album.cover.subtitle = v; }))),
      imageField('Imagem de fundo da capa', s.album.cover.image,
        (url) => { Store.update((st) => { st.album.cover.image = url; }); window.App.rerender(); },
        () => { Store.update((st) => { st.album.cover.image = ''; }); window.App.rerender(); }),
    ]));

    // Back cover
    settings.appendChild(panel('Contracapa', [
      labeled('Texto da contracapa', textarea(s.album.backCover.text, (v) => Store.update((st) => { st.album.backCover.text = v; }))),
      imageField('Imagem de fundo da contracapa', s.album.backCover.image,
        (url) => { Store.update((st) => { st.album.backCover.image = url; }); window.App.rerender(); },
        () => { Store.update((st) => { st.album.backCover.image = ''; }); window.App.rerender(); }),
    ]));

    grid.appendChild(settings);

    /* --- preview + pages column --- */
    const right = el('div', { class: 'space-y-6 lg:col-span-2' });

    // Cover / back previews
    right.appendChild(panel('Pré-visualização', [
      el('div', { class: 'grid gap-4 sm:grid-cols-2' }, [
        coverPreview(s.album.cover, 'front'),
        coverPreview({ title: 'CONTRACAPA', subtitle: s.album.backCover.text, image: s.album.backCover.image }, 'back'),
      ]),
    ]));

    // Pages manager
    const pagesPanel = panel('Páginas & Slots', []);
    const pagesHead = el('div', { class: 'mb-4 flex items-center justify-between' }, [
      el('p', { class: 'text-sm text-slate-400' }, `${s.album.pages.length} páginas · ${Store.totalSlots()} slots no total`),
      el('button', { class: 'btn-primary text-sm', onclick: addPage }, '＋ Nova página'),
    ]);
    pagesPanel.appendChild(pagesHead);

    const pagesWrap = el('div', { class: 'space-y-5' });
    s.album.pages.forEach((page, idx) => pagesWrap.appendChild(pageEditor(page, idx, s)));
    pagesPanel.appendChild(pagesWrap);
    right.appendChild(pagesPanel);

    grid.appendChild(right);
    body.appendChild(grid);
  }

  function themePicker(s) {
    const labels = { dark: '🌙 Dark', light: '☀️ Light', neon: '🔮 Neon', vintage: '📜 Vintage' };
    return el('div', { class: 'grid grid-cols-2 gap-2' }, THEMES.map((t) =>
      el('button', {
        class: 'btn-secondary text-sm ' + (s.album.theme === t ? '!border-fuchsia-400 ring-2 ring-fuchsia-400/40' : ''),
        onclick: () => { Store.update((st) => { st.album.theme = t; }); window.App.applyTheme(); },
      }, labels[t])
    ));
  }

  function coverPreview(cover, side) {
    const inner = el('div', {
      class: 'relative flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-white/20 p-6 text-center',
      style: cover.image
        ? `background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.65)),url('${cover.image}');background-size:cover;background-position:center;`
        : 'background:linear-gradient(150deg,var(--accent),var(--accent-2));',
    }, [
      el('div', { class: 'text-3xl animate-floaty' }, side === 'front' ? '⚽' : '📖'),
      el('h3', { class: 'font-display text-xl font-bold leading-tight drop-shadow' }, cover.title || '—'),
      el('p', { class: 'text-xs text-white/80' }, cover.subtitle || ''),
    ]);
    return el('div', { class: 'aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl' }, inner);
  }

  function pageEditor(page, idx, s) {
    const isFree = page.layout === 'free' && page.design;

    const head = el('div', { class: 'mb-3 flex flex-wrap items-center justify-between gap-2' }, [
      el('h4', { class: 'font-display font-semibold' }, `Página ${idx + 1}`),
      el('div', { class: 'flex items-center gap-2' }, [
        el('button', { class: 'btn-secondary !px-3 !py-1.5 text-xs', title: 'Editor livre estilo Canva', onclick: () => openPageDesigner(page) }, '✨ Personalizar'),
        !isFree ? el('button', { class: 'ghost-btn', title: 'Remover slot', onclick: () => changeSlots(page.id, -1) }, '－') : null,
        !isFree ? el('span', { class: 'text-xs text-slate-400' }, page.slots.length + ' slots') : null,
        !isFree ? el('button', { class: 'ghost-btn', title: 'Adicionar slot', onclick: () => changeSlots(page.id, 1) }, '＋') : null,
        el('button', { class: 'ghost-btn !text-rose-300', title: 'Excluir página', onclick: () => removePage(page.id) }, '🗑'),
      ]),
    ]);

    let bodyNode;
    if (isFree) {
      const stage = window.Canvas.renderStatic(page.design, {
        renderSlot: (elm) => editorFreeSlot(elm, page),
      });
      const wrap = el('div', { class: 'relative mx-auto', style: 'aspect-ratio:3/4;max-width:340px' }, [stage,
        el('button', { class: 'btn-primary absolute bottom-2 right-2 !px-3 !py-1.5 text-xs', onclick: () => openPageDesigner(page) }, '✏ Editar design'),
      ]);
      window.UI.bindHolo(wrap);
      bodyNode = el('div', {}, [
        el('p', { class: 'mb-2 text-center text-xs text-slate-400' }, 'Toque num slot 🃏 para vincular a figurinha que pertence a ele.'),
        wrap,
      ]);
    } else {
      bodyNode = el('div', { class: 'grid grid-cols-3 gap-2 sm:grid-cols-6' },
        page.slots.map((slot) => slotPreview(slot)));
    }
    return el('div', { class: 'glass-soft rounded-xl p-4 page-in' }, [head, bodyNode]);
  }

  /* slot node inside the free (Canva) page preview — used to link a sticker */
  function editorFreeSlot(elm, page) {
    const slot = page.slots.find((sl) => sl.id === elm.slotId);
    const sticker = slot && slot.stickerId ? Store.stickerById(slot.stickerId) : null;
    if (sticker) {
      const node = window.Stickers.render(sticker, { showStats: false });
      const wrap = el('div', { class: 'relative h-full w-full' }, [node,
        el('button', { class: 'absolute -right-1 -top-1 z-20 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-xs',
          onclick: (e) => { e.stopPropagation(); Store.update((st) => { const sl = findSlot(st, elm.slotId); if (sl) sl.stickerId = null; }); window.App.rerender(); } }, '×'),
      ]);
      return wrap;
    }
    return el('div', { class: 'cv-slot cursor-pointer', onclick: () => assignStickerToSlot(elm.slotId) }, [
      el('div', { class: 'text-center text-[10px] opacity-80' }, '＋ vincular'),
    ]);
  }

  /* open the Canva-like designer for a page */
  function openPageDesigner(page) {
    let design = page.design;
    if (!design) {
      // seed from current grid slots, laid out in a grid of slot elements
      design = window.Canvas.blankDesign();
      design.els.push({ id: Store.uid('el'), type: 'text', x: 8, y: 4, w: 84, h: 12, rot: 0, text: `Página`, color: '#ffffff', font: '"Space Grotesk", sans-serif', weight: '700', size: 9, align: 'center', shadow: true });
      const n = page.slots.length || 6;
      const cols = n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const cw = 84 / cols, ch = Math.min(26, (78) / rows);
      page.slots.forEach((sl, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        design.els.push({ id: Store.uid('el'), type: 'slot', slotId: sl.id,
          x: 8 + c * cw + cw * 0.08, y: 18 + r * (ch + 2), w: cw * 0.84, h: ch, rot: 0 });
      });
    }
    window.Canvas.open({
      design, aspect: '3 / 4', title: 'Personalizar página', allowSlots: true,
      onSave: (d) => {
        Store.update((st) => {
          const p = st.album.pages.find((x) => x.id === page.id); if (!p) return;
          p.design = d; p.layout = 'free';
          reconcilePageSlots(p, d);
        });
        toast('Página atualizada ✨', 'success');
        window.App.rerender();
      },
    });
  }

  /* keep page.slots in sync with slot elements present in the design */
  function reconcilePageSlots(page, design) {
    const slotEls = design.els.filter((e) => e.type === 'slot');
    const ids = new Set(slotEls.map((e) => e.slotId));
    // add missing
    slotEls.forEach((e) => {
      if (!page.slots.find((sl) => sl.id === e.slotId)) page.slots.push({ id: e.slotId, stickerId: null });
    });
    // remove orphan slots no longer in design
    page.slots = page.slots.filter((sl) => ids.has(sl.id));
    if (!page.slots.length) page.slots.push(Store.makeSlot());
  }

  function slotPreview(slot) {
    const s = Store.get();
    const sticker = slot.stickerId ? Store.stickerById(slot.stickerId) : null;
    if (sticker) {
      return el('div', { class: 'relative' }, [
        window.Stickers.render(sticker, { showStats: false }),
        el('button', {
          class: 'absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-xs',
          title: 'Desvincular',
          onclick: () => { Store.update((st) => { const sl = findSlot(st, slot.id); if (sl) sl.stickerId = null; }); window.App.rerender(); },
        }, '×'),
      ]);
    }
    return el('div', { class: 'slot', onclick: () => assignStickerToSlot(slot.id) }, [
      el('div', { class: 'slot__hint' }, '＋ vincular'),
    ]);
  }

  function findSlot(st, slotId) {
    for (const p of st.album.pages) { const sl = p.slots.find((x) => x.id === slotId); if (sl) return sl; }
    return null;
  }

  /* Pick which sticker definition this slot expects (the album checklist) */
  function assignStickerToSlot(slotId) {
    const s = Store.get();
    if (!s.stickers.length) { toast('Crie figurinhas primeiro na aba 🃏', 'info'); activeTab = 'stickers'; window.App.rerender(); return; }
    const used = new Set(s.album.pages.flatMap((p) => p.slots.map((sl) => sl.stickerId).filter(Boolean)));
    const list = el('div', { class: 'grid max-h-[55vh] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4' });
    const m = modal([
      el('h3', { class: 'mb-1 font-display text-lg font-bold' }, 'Vincular figurinha ao slot'),
      el('p', { class: 'mb-4 text-sm text-slate-400' }, 'Escolha qual figurinha pertence a este espaço do álbum.'),
      list,
    ], { size: 'max-w-2xl' });
    s.stickers.forEach((st) => {
      const card = window.Stickers.render(st, { showStats: false });
      const w = el('div', { class: 'cursor-pointer transition ' + (used.has(st.id) ? 'opacity-40' : 'hover:scale-105') }, [card]);
      w.addEventListener('click', () => {
        Store.update((state) => { const sl = findSlot(state, slotId); if (sl) sl.stickerId = st.id; });
        m.close();
        toast('Figurinha vinculada ao slot ✓', 'success');
        window.App.rerender();
      });
      list.appendChild(w);
    });
    window.UI.bindHolo(list);
  }

  function addPage() { Store.update((st) => st.album.pages.push(Store.makePage(6))); }
  function removePage(id) {
    confirm('Excluir esta página e seus vínculos?', () =>
      Store.update((st) => { st.album.pages = st.album.pages.filter((p) => p.id !== id); }), { yes: 'Excluir' });
  }
  function changeSlots(pageId, delta) {
    Store.update((st) => {
      const p = st.album.pages.find((x) => x.id === pageId); if (!p) return;
      if (delta > 0 && p.slots.length < 12) p.slots.push(Store.makeSlot());
      if (delta < 0 && p.slots.length > 1) p.slots.pop();
    });
  }

  /* ============================================================
     TAB: FIGURINHAS
     ============================================================ */
  function renderStickersTab(body, s) {
    const grid = el('div', { class: 'grid gap-6 lg:grid-cols-5' });

    // creator form (left, 2 cols)
    const form = el('div', { class: 'lg:col-span-2' }, [stickerCreator()]);
    grid.appendChild(form);

    // list (right, 3 cols)
    const right = el('div', { class: 'lg:col-span-3' });
    const head = el('div', { class: 'mb-4 flex items-center justify-between' }, [
      el('h3', { class: 'font-display text-lg font-bold' }, `Coleção (${s.stickers.length})`),
      s.stickers.length ? el('button', { class: 'btn-secondary text-sm', onclick: clearAll }, '🗑 Limpar tudo') : null,
    ]);
    right.appendChild(head);

    if (!s.stickers.length) {
      right.appendChild(el('div', { class: 'glass-soft rounded-2xl p-10 text-center text-slate-400' },
        '✨ Nenhuma figurinha ainda. Crie a primeira no painel ao lado!'));
    } else {
      const list = el('div', { class: 'card-grid' });
      s.stickers.forEach((st) => list.appendChild(stickerListItem(st)));
      window.UI.bindHolo(list);
      right.appendChild(list);
    }
    grid.appendChild(right);
    body.appendChild(grid);
  }

  function stickerListItem(st) {
    const card = window.Stickers.render(st, { showStats: true });
    // Always-visible action buttons (mobile has no hover)
    const actions = el('div', { class: 'absolute right-1 top-1 z-20 flex gap-1' }, [
      el('button', { class: 'ghost-btn !h-8 !w-8 !bg-black/60', title: 'Editar', onclick: (e) => { e.stopPropagation(); openEdit(st); } }, '✏'),
      el('button', { class: 'ghost-btn !h-8 !w-8 !bg-black/60 !text-rose-300', title: 'Excluir', onclick: (e) => { e.stopPropagation(); removeSticker(st.id); } }, '🗑'),
    ]);
    return el('div', { class: 'relative' }, [card, actions]);
  }

  /* Creator form state (transient draft) */
  let draft = newDraft();
  function newDraft() {
    return { name: '', dob: '', weight: '', height: '', team: '', photo: '', type: 'normal', shape: 'rect', bgColor: '', design: null };
  }

  function stickerCreator(editing) {
    const d = editing || draft;
    const photoBox = el('div');
    function renderPhotoBox() {
      clear(photoBox);
      if (d.photo) {
        photoBox.appendChild(el('div', { class: 'relative' }, [
          el('img', { src: d.photo, class: 'h-40 w-full rounded-xl object-contain bg-black/30' }),
          el('button', { class: 'absolute right-2 top-2 ghost-btn !h-8 !w-8 !bg-rose-500/80', title: 'Remover imagem', onclick: () => { d.photo = ''; renderPhotoBox(); livePreview(); } }, '×'),
        ]));
      } else {
        photoBox.appendChild(dropzone({
          icon: '🧑', label: 'Foto do jogador / amigo',
          onImage: (url) => { d.photo = url; renderPhotoBox(); livePreview(); },
        }));
      }
      // Model players gallery
      photoBox.appendChild(el('p', { class: 'mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400' }, 'Ou escolha um jogador modelo'));
      photoBox.appendChild(el('div', { class: 'flex gap-2 overflow-x-auto pb-1' },
        (window.Assets ? window.Assets.players : []).map((p) =>
          el('button', {
            class: 'flex-shrink-0 overflow-hidden rounded-lg border-2 transition ' + (d.photo === p.url ? 'border-fuchsia-400' : 'border-white/10 hover:border-white/40'),
            title: p.name,
            onclick: () => { d.photo = p.url; renderPhotoBox(); livePreview(); },
          }, [el('img', { src: p.url, class: 'h-16 w-12 object-cover' })])
        )
      ));
    }
    renderPhotoBox();

    const previewWrap = el('div', { class: 'mx-auto w-40' });
    function livePreview() {
      clear(previewWrap);
      previewWrap.appendChild(window.Stickers.render({ ...d, number: '00' }, { showStats: true }));
      window.UI.bindHolo(previewWrap);
    }

    function bindLive(field) { return (v) => { d[field] = v; livePreview(); }; }

    /* Canva-like custom art designer for the sticker */
    const artBox = el('div', { class: 'mt-3' });
    function renderArtBox() {
      clear(artBox);
      const has = d.design && d.design.els && d.design.els.length;
      artBox.appendChild(el('div', { class: 'flex gap-2' }, [
        el('button', { class: 'btn-primary flex-1 !py-2 text-sm', onclick: openArt }, has ? '✏ Editar arte (Canva)' : '✨ Personalizar arte (Canva)'),
        has ? el('button', { class: 'btn-secondary !px-3 !py-2 text-sm', title: 'Remover arte custom', onclick: () => { d.design = null; renderArtBox(); livePreview(); } }, '↺') : null,
      ]));
      if (has) artBox.appendChild(el('p', { class: 'mt-1 text-center text-[11px] text-emerald-300' }, '🎨 Arte personalizada ativa'));
    }
    function openArt() {
      let design = d.design;
      if (!design) {
        design = window.Canvas.blankDesign();
        if (d.photo) design.els.push({ id: Store.uid('el'), type: 'image', x: 12, y: 8, w: 76, h: 56, rot: 0, src: d.photo, radius: 12 });
        design.els.push({ id: Store.uid('el'), type: 'text', x: 6, y: 70, w: 88, h: 16, rot: 0, text: d.name || 'NOME', color: '#ffffff', font: '"Space Grotesk", sans-serif', weight: '900', size: 11, align: 'center', shadow: true });
        if (d.team) design.els.push({ id: Store.uid('el'), type: 'text', x: 6, y: 86, w: 88, h: 8, rot: 0, text: d.team, color: '#e2e8f0', font: 'Inter, sans-serif', weight: '700', size: 6, align: 'center', shadow: true });
      }
      window.Canvas.open({
        design, aspect: '3 / 4', title: 'Arte da figurinha', allowSlots: false,
        onSave: (dsg) => { d.design = dsg; renderArtBox(); livePreview(); toast('Arte salva 🎨', 'success'); },
      });
    }
    renderArtBox();

    /* Shape (formato livre) selector */
    const SHAPES = [['rect', 'Retângulo', '▭'], ['shield', 'Escudo', '🛡️'], ['circle', 'Círculo', '⬤'], ['hex', 'Hexágono', '⬡']];
    const shapeButtons = el('div', { class: 'grid grid-cols-4 gap-2' }, SHAPES.map(([key, label, icon]) =>
      el('button', {
        class: 'btn-secondary flex-col !px-1 !py-2 text-[11px] ' + (d.shape === key ? '!border-fuchsia-400 ring-2 ring-fuchsia-400/40' : ''),
        onclick: () => {
          d.shape = key;
          Array.from(shapeButtons.children).forEach((b, i) => {
            const on = SHAPES[i][0] === key;
            b.classList.toggle('!border-fuchsia-400', on); b.classList.toggle('ring-2', on); b.classList.toggle('ring-fuchsia-400/40', on);
          });
          livePreview();
        },
      }, [el('div', { class: 'text-base' }, icon), el('div', {}, label)])
    ));

    /* Background color "wheel" + swatches */
    const SWATCHES = ['#0f172a', '#1e293b', '#7c3aed', '#2563eb', '#db2777', '#e11d48', '#ea580c', '#16a34a', '#0891b2', '#facc15', '#f8fafc', '#000000'];
    const GRADIENTS = [['#7c3aed', '#2563eb'], ['#db2777', '#f97316'], ['#06b6d4', '#3b82f6'], ['#16a34a', '#065f46'], ['#f59e0b', '#b45309'], ['#1e293b', '#000000']];
    const colorWheel = el('input', { type: 'color', value: d.bgColor && d.bgColor.indexOf('|') < 0 ? d.bgColor : '#1e293b', class: 'h-10 w-14 flex-shrink-0 rounded-lg bg-transparent' });
    colorWheel.addEventListener('input', (e) => { d.bgColor = e.target.value; livePreview(); });
    const bgControls = el('div', { class: 'space-y-2' }, [
      el('div', { class: 'flex items-center gap-2' }, [
        colorWheel,
        el('div', { class: 'flex flex-wrap gap-1.5' }, SWATCHES.map((c) =>
          el('button', { class: 'h-7 w-7 rounded-md border border-white/20', style: `background:${c}`, title: c, onclick: () => { d.bgColor = c; livePreview(); } }))),
      ]),
      el('div', { class: 'flex flex-wrap items-center gap-1.5' }, [
        el('span', { class: 'text-[11px] text-slate-400' }, 'Gradientes:'),
        ...GRADIENTS.map(([a, b]) =>
          el('button', { class: 'h-7 w-9 rounded-md border border-white/20', style: `background:linear-gradient(155deg,${a},${b})`, onclick: () => { d.bgColor = a + '|' + b; livePreview(); } })),
        el('button', { class: 'ghost-btn !h-7 !w-7 text-xs', title: 'Remover fundo', onclick: () => { d.bgColor = ''; livePreview(); } }, '↺'),
      ]),
    ]);

    const rarityButtons = el('div', { class: 'grid grid-cols-3 gap-2' }, Object.keys(RARITIES).map((key) =>
      el('button', {
        class: 'btn-secondary !px-2 !py-2 text-xs ' + (d.type === key ? '!border-fuchsia-400 ring-2 ring-fuchsia-400/40' : ''),
        onclick: () => {
          d.type = key;
          // re-render rarity buttons selection state
          Array.from(rarityButtons.children).forEach((b, i) => {
            b.classList.toggle('!border-fuchsia-400', Object.keys(RARITIES)[i] === key);
            b.classList.toggle('ring-2', Object.keys(RARITIES)[i] === key);
            b.classList.toggle('ring-fuchsia-400/40', Object.keys(RARITIES)[i] === key);
          });
          livePreview();
        },
      }, RARITIES[key].label)
    ));

    const panelChildren = [
      el('div', { class: 'mb-4 flex items-center justify-between' }, [
        el('h3', { class: 'font-display text-lg font-bold' }, editing ? '✏ Editar figurinha' : '🃏 Criar figurinha'),
      ]),
      el('div', { class: 'mb-4' }, previewWrap),

      labeled('Tipo / Raridade', rarityButtons),
      labeled('Formato da carta', shapeButtons),
      labeled('Cor de fundo da figurinha', bgControls),
      artBox,
      el('div', { class: 'my-4 border-t border-white/10' }),

      el('p', { class: 'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400' }, '① Foto personalizada'),
      photoBox,

      el('p', { class: 'mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400' }, '② Ficha técnica'),
      labeled('Nome', input(d.name, bindLive('name'), 'Ex: Neymar Jr.')),
      el('div', { class: 'grid grid-cols-2 gap-3' }, [
        labeled('Data de nascimento', input(d.dob, bindLive('dob'), '', 'date')),
        labeled('Time', input(d.team, bindLive('team'), 'Ex: Santos FC')),
      ]),
      el('div', { class: 'grid grid-cols-2 gap-3' }, [
        labeled('Peso', input(d.weight, bindLive('weight'), 'Ex: 68 kg')),
        labeled('Altura', input(d.height, bindLive('height'), 'Ex: 1,75 m')),
      ]),
    ];

    if (editing) {
      panelChildren.push(el('div', { class: 'mt-5 flex gap-2' }, [
        el('button', { class: 'btn-secondary flex-1', onclick: () => window.App.rerender() }, 'Cancelar'),
        el('button', { class: 'btn-primary flex-1', onclick: () => saveEdit(editing) }, '💾 Salvar'),
      ]));
    } else {
      panelChildren.push(el('button', { class: 'btn-primary mt-5 w-full', onclick: () => createSticker(d) }, '＋ Adicionar à coleção'));
    }

    livePreview();
    return panel(null, panelChildren);
  }

  function createSticker(d) {
    if (!d.name.trim()) { toast('Dê um nome à figurinha', 'error'); return; }
    Store.update((st) => {
      st.stickers.push({ id: Store.uid('stk'), number: st._seq++, ...d, name: d.name.trim() });
    });
    draft = newDraft();
    toast('Figurinha criada! ✨', 'success');
    window.App.rerender();
  }

  function openEdit(st) {
    const m = modal([stickerCreator({ ...st })], { size: 'max-w-md' });
    // override the save/cancel to also close modal
    editModalRef = m;
    function patch() {}
  }
  let editModalRef = null;
  function saveEdit(edited) {
    if (!edited.name.trim()) { toast('Nome obrigatório', 'error'); return; }
    Store.update((st) => {
      const i = st.stickers.findIndex((x) => x.id === edited.id);
      if (i >= 0) st.stickers[i] = { ...st.stickers[i], ...edited, name: edited.name.trim() };
    });
    if (editModalRef) editModalRef.close();
    toast('Atualizada!', 'success');
    window.App.rerender();
  }

  function removeSticker(id) {
    confirm('Excluir esta figurinha? Ela será removida dos slots vinculados.', () => {
      Store.update((st) => {
        st.stickers = st.stickers.filter((x) => x.id !== id);
        st.album.pages.forEach((p) => p.slots.forEach((sl) => { if (sl.stickerId === id) sl.stickerId = null; }));
        delete st.player.owned[id];
        for (const k in st.player.placed) if (st.player.placed[k] === id) delete st.player.placed[k];
      });
    }, { yes: 'Excluir' });
  }

  function clearAll() {
    confirm('Apagar TODAS as figurinhas?', () => {
      Store.update((st) => {
        st.stickers = [];
        st.album.pages.forEach((p) => p.slots.forEach((sl) => sl.stickerId = null));
        st.player.owned = {}; st.player.placed = {};
      });
    }, { yes: 'Apagar tudo' });
  }

  /* ============================================================
     TAB: PACOTE
     ============================================================ */
  function renderPackTab(body, s) {
    const grid = el('div', { class: 'grid gap-6 lg:grid-cols-2' });

    const form = panel('Configuração do Pacotinho', [
      labeled('Nome do pacote', input(s.pack.name, (v) => Store.update((st) => { st.pack.name = v; }))),
      el('div', { class: 'grid grid-cols-2 gap-3' }, [
        labeled('Cor 1', colorInput(s.pack.color1, (v) => Store.update((st) => { st.pack.color1 = v; }))),
        labeled('Cor 2', colorInput(s.pack.color2, (v) => Store.update((st) => { st.pack.color2 = v; }))),
      ]),
      labeled('Logo / Emoji', logoPicker(s)),
      labeled(`Figurinhas por pacote: ${s.pack.perPack}`, slider(s)),
      el('p', { class: 'text-xs text-slate-400' }, 'Dica: pacotes com mais figurinhas completam o álbum mais rápido, mas tornam o jogo menos desafiador.'),
    ]);
    grid.appendChild(form);

    // preview
    const previewWrap = el('div');
    function buildPreview() {
      const st = Store.get();
      clear(previewWrap);
      previewWrap.appendChild(panel('Pré-visualização', [
        el('div', { class: 'flex flex-col items-center gap-4 py-4' }, [
          packVisual(st.pack),
          el('p', { class: 'font-display text-lg font-bold' }, st.pack.name),
          el('p', { class: 'text-sm text-slate-400' }, st.pack.perPack + ' figurinhas por pacote'),
        ]),
      ]));
    }
    buildPreview();
    Store.subscribe(buildPreview); // refresh preview on changes (light)
    grid.appendChild(previewWrap);

    body.appendChild(grid);
  }

  function packVisual(pack) {
    return el('div', {
      class: 'pack3d animate-floaty',
      style: `--pack-c1:${pack.color1};--pack-c2:${pack.color2}`,
    }, [
      el('div', { class: 'pack3d__strip' }),
      el('div', { class: 'pack3d__logo' }, pack.logo),
    ]);
  }

  function logoPicker(s) {
    const emojis = ['⭐', '⚽', '🏆', '🔥', '👑', '💎', '🎴', '🚀', '🦁', '🐍'];
    return el('div', { class: 'flex flex-wrap gap-2' }, emojis.map((e) =>
      el('button', {
        class: 'ghost-btn ' + (s.pack.logo === e ? '!border-fuchsia-400 ring-2 ring-fuchsia-400/40' : ''),
        onclick: () => Store.update((st) => { st.pack.logo = e; }),
      }, e)
    ));
  }

  function slider(s) {
    const out = el('input', { type: 'range', min: '2', max: '8', value: String(s.pack.perPack), class: 'w-full accent-fuchsia-500' });
    out.addEventListener('input', (e) => {
      Store.update((st) => { st.pack.perPack = parseInt(e.target.value, 10); }, { silent: true });
      const lbl = out.closest('.field-block')?.querySelector('.field-label');
      if (lbl) lbl.textContent = `Figurinhas por pacote: ${e.target.value}`;
    });
    return out;
  }

  /* ============================================================
     shared form builders
     ============================================================ */
  function panel(title, children) {
    const kids = title ? [el('h3', { class: 'mb-4 font-display text-lg font-bold' }, title)] : [];
    return el('div', { class: 'glass rounded-2xl p-5' }, kids.concat(flatten(children)));
  }
  function flatten(children) { return Array.isArray(children) ? children : [children]; }

  function labeled(label, control) {
    return el('div', { class: 'field-block mb-3' }, [
      el('label', { class: 'field-label' }, label),
      control,
    ]);
  }
  function input(value, onChange, placeholder, type) {
    const node = el('input', { class: 'field', value: value || '', placeholder: placeholder || '', type: type || 'text' });
    node.addEventListener('input', (e) => onChange(e.target.value));
    return node;
  }
  function textarea(value, onChange) {
    const node = el('textarea', { class: 'field', rows: '3' });
    node.value = value || '';
    node.addEventListener('input', (e) => onChange(e.target.value));
    return node;
  }
  function colorInput(value, onChange) {
    const node = el('input', { type: 'color', value: value, class: 'h-10 w-full rounded-lg bg-transparent' });
    node.addEventListener('input', (e) => onChange(e.target.value));
    return node;
  }
  function imageField(label, current, onImage, onClear) {
    if (current) {
      return labeled(label, el('div', { class: 'relative' }, [
        el('img', { src: current, class: 'h-32 w-full rounded-xl object-cover' }),
        el('button', { class: 'absolute right-2 top-2 ghost-btn !h-8 !w-8', onclick: onClear }, '×'),
      ]));
    }
    return labeled(label, dropzone({ onImage, label: 'Imagem de fundo' }));
  }

  window.Editor = { render };
})();

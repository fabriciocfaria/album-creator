/* ============================================================
   canvas.js — Editor livre estilo "Canva" (touch-friendly)
   Trabalha sobre um objeto `design`:
     design = { bg:{type,color,color1,color2,angle,image}, els:[element] }
     element = { id,type,x,y,w,h,rot, ...props }   (x/y/w/h em %)
       type: 'text' | 'icon' | 'shape' | 'image' | 'slot'
   Exposto como window.Canvas
     - Canvas.renderStatic(design, opts)  -> nó DOM (não interativo)
     - Canvas.open({design, aspect, title, allowSlots, onSave})
     - Canvas.blankDesign()
   ============================================================ */
(function () {
  'use strict';
  const { el, clear, toast, dropzone, readImage } = window.UI;
  const Store = window.Store;

  const FONTS = [
    { v: '"Space Grotesk", sans-serif', n: 'Space Grotesk' },
    { v: 'Inter, sans-serif', n: 'Inter' },
    { v: '"Cinzel", serif', n: 'Cinzel' },
    { v: '"Bebas Neue", sans-serif', n: 'Bebas Neue' },
    { v: '"Pacifico", cursive', n: 'Pacifico' },
    { v: '"Righteous", cursive', n: 'Righteous' },
    { v: 'Georgia, serif', n: 'Serif' },
    { v: '"Courier New", monospace', n: 'Mono' },
  ];

  function uid() { return 'el-' + Math.random().toString(36).slice(2, 8); }
  function blankDesign() {
    return { bg: { type: 'gradient', color1: '#6d28d9', color2: '#1e1b4b', angle: 150, color: '#111827', image: '' }, els: [] };
  }

  function bgStyle(bg) {
    if (!bg) return 'background:#111827';
    if (bg.type === 'image' && bg.image) return `background-image:url('${bg.image}');background-size:cover;background-position:center`;
    if (bg.type === 'solid') return `background:${bg.color}`;
    return `background:linear-gradient(${bg.angle || 150}deg, ${bg.color1}, ${bg.color2})`;
  }

  /* -------- element -> DOM (shared by editor & static) -------- */
  function elementNode(elm, ctx) {
    ctx = ctx || {};
    const node = el('div', { class: 'cv-el', dataset: { id: elm.id } });
    node.style.left = elm.x + '%';
    node.style.top = elm.y + '%';
    node.style.width = elm.w + '%';
    node.style.height = elm.h + '%';
    node.style.transform = `rotate(${elm.rot || 0}deg)`;
    node.style.opacity = (elm.opacity != null ? elm.opacity : 1);

    if (elm.type === 'text') {
      const t = el('div', { class: 'cv-text' }, elm.text || 'Texto');
      t.style.color = elm.color || '#fff';
      t.style.fontFamily = elm.font || FONTS[0].v;
      t.style.fontWeight = elm.weight || '700';
      t.style.fontSize = (elm.size || 6) + 'cqw';
      t.style.textAlign = elm.align || 'center';
      t.style.lineHeight = '1.1';
      if (elm.shadow) t.style.textShadow = '0 2px 8px rgba(0,0,0,.6)';
      node.appendChild(t);
    } else if (elm.type === 'icon') {
      const t = el('div', { class: 'cv-icon' }, elm.icon || '⭐');
      t.style.fontSize = (elm.size || 14) + 'cqw';
      node.appendChild(t);
    } else if (elm.type === 'shape') {
      const sh = el('div', { class: 'cv-shape' });
      sh.style.background = elm.fill || '#ffffff';
      sh.style.opacity = elm.fillOpacity != null ? elm.fillOpacity : 1;
      if (elm.shape === 'circle') sh.style.borderRadius = '50%';
      else if (elm.shape === 'line') { sh.style.height = (elm.thickness || 8) + 'px'; sh.style.alignSelf = 'center'; sh.style.marginTop = 'auto'; sh.style.marginBottom = 'auto'; }
      else sh.style.borderRadius = (elm.radius || 12) + 'px';
      if (elm.border) sh.style.border = `2px solid ${elm.borderColor || '#fff'}`;
      node.appendChild(sh);
    } else if (elm.type === 'image') {
      const im = el('div', { class: 'cv-image' });
      im.style.backgroundImage = `url('${elm.src || ''}')`;
      im.style.borderRadius = (elm.radius || 8) + 'px';
      if (elm.circle) im.style.borderRadius = '50%';
      node.appendChild(im);
    } else if (elm.type === 'slot') {
      // rendered by caller in static mode; placeholder in editor
      if (ctx.renderSlot) { node.appendChild(ctx.renderSlot(elm)); }
      else {
        node.appendChild(el('div', { class: 'cv-slot' }, [
          el('div', { class: 'text-[10px] opacity-70 text-center' }, '🃏 slot'),
        ]));
      }
    }
    return node;
  }

  /* ============================================================
     STATIC render (player & previews) — not interactive
     opts: { interactive:false, renderSlot:(elm)=>node, class }
     ============================================================ */
  function renderStatic(design, opts) {
    opts = opts || {};
    const stage = el('div', { class: 'cv-stage ' + (opts.class || '') });
    stage.setAttribute('style', bgStyle(design && design.bg) + ';container-type:size;');
    (design && design.els || []).forEach((elm) => stage.appendChild(elementNode(elm, opts)));
    return stage;
  }

  /* ============================================================
     OPEN editor (full-screen overlay)
     ============================================================ */
  function open(config) {
    const aspect = config.aspect || '3 / 4';
    // deep clone so cancel discards changes
    const design = JSON.parse(JSON.stringify(config.design || blankDesign()));
    let selectedId = null;

    const overlay = el('div', { class: 'cv-overlay' });

    /* --- top bar --- */
    const topbar = el('div', { class: 'cv-topbar glass' }, [
      el('div', { class: 'flex items-center gap-2 min-w-0' }, [
        el('button', { class: 'btn-secondary !px-3 !py-2 text-sm', onclick: cancel }, '✕'),
        el('span', { class: 'truncate font-display font-bold' }, config.title || 'Editor'),
      ]),
      el('div', { class: 'flex items-center gap-2' }, [
        el('button', { class: 'btn-secondary !px-3 !py-2 text-sm', onclick: () => bgPanel() }, '🎨 Fundo'),
        el('button', { class: 'btn-primary !px-4 !py-2 text-sm', onclick: done }, '✓ Salvar'),
      ]),
    ]);

    /* --- add toolbar --- */
    const addbar = el('div', { class: 'cv-addbar glass-soft' }, [
      addBtn('🔤', 'Texto', () => addText()),
      addBtn('😀', 'Emoji', () => emojiPicker()),
      addBtn('▭', 'Forma', () => shapePicker()),
      addBtn('🖼️', 'Imagem', () => addImage()),
      config.allowSlots ? addBtn('🃏', 'Slot', () => addSlot()) : null,
    ]);

    /* --- canvas stage --- */
    const stage = el('div', { class: 'cv-stage cv-edit' });
    stage.setAttribute('style', bgStyle(design.bg) + ';container-type:size;');
    const stageWrap = el('div', { class: 'cv-canvas-wrap' }, [stage]);
    stageWrap.style.aspectRatio = aspect;

    /* --- properties panel (bottom sheet) --- */
    const propPanel = el('div', { class: 'cv-props glass' });

    const center = el('div', { class: 'cv-center' }, [stageWrap]);
    overlay.appendChild(topbar);
    overlay.appendChild(addbar);
    overlay.appendChild(center);
    overlay.appendChild(propPanel);
    document.getElementById('modal-root').appendChild(overlay);

    /* ---------- rendering ---------- */
    let nodeMap = {};
    function renderStage() {
      clear(stage);
      nodeMap = {};
      stage.setAttribute('style', bgStyle(design.bg) + ';container-type:size;');
      design.els.forEach((elm) => {
        const node = elementNode(elm, {});
        node.classList.add('cv-el--edit');
        nodeMap[elm.id] = node;
        bindDrag(node, elm);
        if (elm.id === selectedId) { node.classList.add('cv-selected'); addHandles(node, elm); }
        stage.appendChild(node);
      });
    }
    /* rebuild stage after a structural change (add/remove/reorder) */
    function rebuild(newSelected) { if (newSelected !== undefined) selectedId = newSelected; renderStage(); renderProps(); }

    /* lightweight selection — does NOT rebuild the stage (so drag survives) */
    function select(id) {
      if (selectedId === id) { renderProps(); return; }
      const prev = nodeMap[selectedId];
      if (prev) { prev.classList.remove('cv-selected'); prev.querySelectorAll('.cv-handle').forEach((h) => h.remove()); }
      selectedId = id;
      const cur = nodeMap[id];
      const elm = design.els.find((x) => x.id === id);
      if (cur && elm) { cur.classList.add('cv-selected'); addHandles(cur, elm); }
      renderProps();
    }
    function deselectIfBlank(e) { if (e.target === stage) select(null); }
    stage.addEventListener('pointerdown', deselectIfBlank);

    /* ---------- drag & resize (pointer events) ---------- */
    function bindDrag(node, elm) {
      node.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.cv-handle')) return; // handled separately
        e.stopPropagation();
        e.preventDefault();
        select(elm.id); // lightweight — node persists, so drag keeps working
        const rect = stage.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, ex = elm.x, ey = elm.y;
        try { node.setPointerCapture(e.pointerId); } catch (err) {}
        function move(ev) {
          const dx = ((ev.clientX - sx) / rect.width) * 100;
          const dy = ((ev.clientY - sy) / rect.height) * 100;
          elm.x = clamp(ex + dx, -10, 100 - 5);
          elm.y = clamp(ey + dy, -10, 100 - 5);
          node.style.left = elm.x + '%'; node.style.top = elm.y + '%';
        }
        function up() { try { node.releasePointerCapture(e.pointerId); } catch (err) {} node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); }
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', up);
        node.addEventListener('pointercancel', up);
      });
    }

    function addHandles(node, elm) {
      // resize (bottom-right)
      const rh = el('div', { class: 'cv-handle cv-handle--resize', title: 'Redimensionar' }, '⤡');
      rh.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = stage.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, ew = elm.w, eh = elm.h;
        try { rh.setPointerCapture(e.pointerId); } catch (err) {}
        function move(ev) {
          const dw = ((ev.clientX - sx) / rect.width) * 100;
          const dh = ((ev.clientY - sy) / rect.height) * 100;
          elm.w = clamp(ew + dw, 5, 130);
          elm.h = clamp(eh + dh, 5, 130);
          node.style.width = elm.w + '%'; node.style.height = elm.h + '%';
        }
        function up() { try { rh.releasePointerCapture(e.pointerId); } catch (err) {} rh.removeEventListener('pointermove', move); rh.removeEventListener('pointerup', up); rh.removeEventListener('pointercancel', up); }
        rh.addEventListener('pointermove', move); rh.addEventListener('pointerup', up); rh.addEventListener('pointercancel', up);
      });
      // delete (top-right) — use pointerup so it also fires reliably on touch
      const dl = el('div', { class: 'cv-handle cv-handle--del', title: 'Excluir' }, '×');
      dl.addEventListener('pointerup', (e) => { e.stopPropagation(); e.preventDefault(); removeEl(elm.id); });
      node.appendChild(rh); node.appendChild(dl);
    }

    /* ---------- element ops ---------- */
    function addEl(elm) { design.els.push(elm); rebuild(elm.id); }
    function removeEl(id) { design.els = design.els.filter((x) => x.id !== id); rebuild(selectedId === id ? null : selectedId); toast('Elemento removido', 'info'); }
    function duplicateEl(elm) { const c = JSON.parse(JSON.stringify(elm)); c.id = uid(); c.x = clamp(c.x + 5, 0, 90); c.y = clamp(c.y + 5, 0, 90); addEl(c); }
    function layer(elm, dir) {
      const i = design.els.indexOf(elm); if (i < 0) return;
      const j = i + dir; if (j < 0 || j >= design.els.length) return;
      design.els.splice(i, 1); design.els.splice(j, 0, elm); rebuild(selectedId);
    }

    function addText() { addEl({ id: uid(), type: 'text', x: 25, y: 40, w: 50, h: 14, rot: 0, text: 'Seu texto', color: '#ffffff', font: FONTS[0].v, weight: '700', size: 8, align: 'center', shadow: true }); }
    function addSlot() { addEl({ id: uid(), type: 'slot', x: 38, y: 36, w: 24, h: 28, rot: 0, slotId: Store.uid('slot') }); }
    function addShapeKind(kind) { addEl({ id: uid(), type: 'shape', shape: kind, x: 35, y: 35, w: 30, h: 30, rot: 0, fill: '#f472b6', fillOpacity: 1, radius: 14, thickness: 8 }); }
    function addIcon(icon) { addEl({ id: uid(), type: 'icon', x: 40, y: 38, w: 20, h: 20, rot: 0, icon: icon, size: 16 }); }
    async function addImage() {
      pickFile(async (file) => { try { const src = await readImage(file); addEl({ id: uid(), type: 'image', x: 28, y: 28, w: 44, h: 44, rot: 0, src: src, radius: 10 }); } catch (e) { toast('Imagem inválida', 'error'); } });
    }

    /* ---------- pickers ---------- */
    function emojiPicker() {
      const emojis = '⭐🏆🔥👑💎⚽🥅🧤🦁🐍🚀✨🎯💥🌟⚡🛡️🎖️🏅📣🎉💫🔱'.match(/./gu);
      sheet('Escolha um emoji', el('div', { class: 'grid grid-cols-6 gap-2' },
        emojis.map((em) => el('button', { class: 'ghost-btn !h-11 !w-full text-xl', onclick: () => { closeSheet(); addIcon(em); } }, em))));
    }
    function shapePicker() {
      sheet('Adicionar forma', el('div', { class: 'grid grid-cols-3 gap-3' }, [
        shapeOpt('▭', 'Retângulo', 'rect'), shapeOpt('⬤', 'Círculo', 'circle'), shapeOpt('▬', 'Linha', 'line'),
      ]));
    }
    function shapeOpt(icon, label, kind) {
      return el('button', { class: 'btn-secondary flex-col !py-4', onclick: () => { closeSheet(); addShapeKind(kind); } }, [el('div', { class: 'text-2xl' }, icon), el('div', { class: 'text-xs' }, label)]);
    }

    /* ---------- background panel ---------- */
    function bgPanel() {
      const body = el('div', { class: 'space-y-3' });
      const typeRow = el('div', { class: 'grid grid-cols-3 gap-2' }, [
        bgTypeBtn('gradient', 'Gradiente'), bgTypeBtn('solid', 'Cor'), bgTypeBtn('image', 'Imagem'),
      ]);
      body.appendChild(typeRow);
      const dyn = el('div', { class: 'space-y-3' });
      body.appendChild(dyn);
      function renderDyn() {
        clear(dyn);
        if (design.bg.type === 'gradient') {
          dyn.appendChild(field2('Cor 1', colorIn(design.bg.color1, (v) => { design.bg.color1 = v; refreshBg(); }), 'Cor 2', colorIn(design.bg.color2, (v) => { design.bg.color2 = v; refreshBg(); })));
          dyn.appendChild(labeledRange('Ângulo', design.bg.angle, 0, 360, (v) => { design.bg.angle = v; refreshBg(); }));
        } else if (design.bg.type === 'solid') {
          dyn.appendChild(field('Cor', colorIn(design.bg.color, (v) => { design.bg.color = v; refreshBg(); })));
        } else {
          if (design.bg.image) {
            dyn.appendChild(el('div', { class: 'relative' }, [el('img', { src: design.bg.image, class: 'h-28 w-full rounded-xl object-cover' }), el('button', { class: 'absolute right-2 top-2 ghost-btn !h-8 !w-8', onclick: () => { design.bg.image = ''; renderDyn(); refreshBg(); } }, '×')]));
          } else {
            dyn.appendChild(dropzone({ label: 'Fundo da ' + (config.allowSlots ? 'página' : 'figurinha'), onImage: (url) => { design.bg.image = url; renderDyn(); refreshBg(); } }));
          }
        }
      }
      function refreshBg() { stage.setAttribute('style', bgStyle(design.bg) + ';container-type:size;'); typeRow.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.t === design.bg.type)); }
      renderDyn();
      sheet('🎨 Fundo', body);
      refreshBg();
      function bgTypeBtn(t, label) { return el('button', { class: 'nav-tab ' + (design.bg.type === t ? 'active' : ''), dataset: { t }, onclick: () => { design.bg.type = t; renderDyn(); refreshBg(); } }, label); }
    }

    /* ---------- properties for selected element ---------- */
    function renderProps() {
      clear(propPanel);
      const elm = design.els.find((x) => x.id === selectedId);
      if (!elm) {
        propPanel.appendChild(el('p', { class: 'text-center text-xs text-slate-400 py-2' }, '👆 Toque em um elemento para editar — ou adicione um acima.'));
        return;
      }
      const head = el('div', { class: 'mb-2 flex items-center justify-between' }, [
        el('span', { class: 'text-xs font-semibold uppercase tracking-wide text-slate-400' }, typeLabel(elm.type)),
        el('div', { class: 'flex gap-1' }, [
          iconBtn('⬇️', 'Para trás', () => layer(elm, -1)),
          iconBtn('⬆️', 'Para frente', () => layer(elm, 1)),
          iconBtn('⧉', 'Duplicar', () => duplicateEl(elm)),
          iconBtn('🗑', 'Excluir', () => removeEl(elm.id)),
        ]),
      ]);
      propPanel.appendChild(head);

      const ctrls = el('div', { class: 'cv-props-grid' });
      if (elm.type === 'text') {
        const ta = el('textarea', { class: 'field col-span-2', rows: '2' }); ta.value = elm.text; ta.addEventListener('input', (e) => { elm.text = e.target.value; renderStage(); });
        ctrls.appendChild(wrap2('Texto', ta));
        ctrls.appendChild(field('Cor', colorIn(elm.color, (v) => { elm.color = v; renderStage(); })));
        ctrls.appendChild(field('Fonte', selectIn(FONTS.map((f) => [f.v, f.n]), elm.font, (v) => { elm.font = v; renderStage(); })));
        ctrls.appendChild(wrap2('Tamanho', range(elm.size, 3, 30, (v) => { elm.size = v; renderStage(); })));
        ctrls.appendChild(field('Alinhar', selectIn([['center', 'Centro'], ['left', 'Esquerda'], ['right', 'Direita']], elm.align, (v) => { elm.align = v; renderStage(); })));
        ctrls.appendChild(field('Peso', selectIn([['400', 'Normal'], ['700', 'Negrito'], ['900', 'Black']], elm.weight, (v) => { elm.weight = v; renderStage(); })));
      } else if (elm.type === 'icon') {
        ctrls.appendChild(wrap2('Tamanho', range(elm.size, 4, 40, (v) => { elm.size = v; renderStage(); })));
      } else if (elm.type === 'shape') {
        ctrls.appendChild(field('Cor', colorIn(elm.fill, (v) => { elm.fill = v; renderStage(); })));
        ctrls.appendChild(wrap2('Opacidade', range((elm.fillOpacity ?? 1) * 100, 0, 100, (v) => { elm.fillOpacity = v / 100; renderStage(); })));
        if (elm.shape === 'rect') ctrls.appendChild(wrap2('Cantos', range(elm.radius, 0, 60, (v) => { elm.radius = v; renderStage(); })));
      } else if (elm.type === 'image') {
        ctrls.appendChild(wrap2('Cantos', range(elm.radius, 0, 50, (v) => { elm.radius = v; renderStage(); })));
        ctrls.appendChild(field('Formato', selectIn([['0', 'Quadrado'], ['1', 'Círculo']], elm.circle ? '1' : '0', (v) => { elm.circle = v === '1'; renderStage(); })));
      } else if (elm.type === 'slot') {
        ctrls.appendChild(el('p', { class: 'col-span-2 text-xs text-slate-400' }, 'Espaço onde a figurinha será colada no Modo Jogador.'));
      }
      // common: rotation + opacity
      ctrls.appendChild(wrap2('Rotação', range(elm.rot || 0, -180, 180, (v) => { elm.rot = v; renderStage(); })));
      propPanel.appendChild(ctrls);
    }

    /* ---------- sheets ---------- */
    let sheetEl = null;
    function sheet(title, body) {
      closeSheet();
      sheetEl = el('div', { class: 'cv-sheet glass view-in' }, [
        el('div', { class: 'mb-3 flex items-center justify-between' }, [el('h4', { class: 'font-display font-bold' }, title), el('button', { class: 'ghost-btn', onclick: closeSheet }, '×')]),
        body,
      ]);
      overlay.appendChild(sheetEl);
    }
    function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }

    function done() { overlay.remove(); config.onSave && config.onSave(design); }
    function cancel() { overlay.remove(); }

    renderStage();
    renderProps();
  }

  /* ---------- small builders ---------- */
  function addBtn(icon, label, onClick) { return el('button', { class: 'cv-add', onclick: onClick }, [el('span', { class: 'text-lg' }, icon), el('span', { class: 'text-[10px]' }, label)]); }
  function iconBtn(icon, title, onClick) { return el('button', { class: 'ghost-btn !h-8 !w-8 text-sm', title, onclick: onClick }, icon); }
  function typeLabel(t) { return ({ text: 'Texto', icon: 'Emoji', shape: 'Forma', image: 'Imagem', slot: 'Slot' })[t] || t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pickFile(cb) { const i = el('input', { type: 'file', accept: 'image/*', class: 'hidden' }); document.body.appendChild(i); i.addEventListener('change', () => { if (i.files[0]) cb(i.files[0]); i.remove(); }); i.click(); }

  function field(label, control) { return el('div', {}, [el('label', { class: 'field-label' }, label), control]); }
  function wrap2(label, control) { return el('div', { class: 'col-span-2' }, [el('label', { class: 'field-label' }, label), control]); }
  function field2(l1, c1, l2, c2) { return el('div', { class: 'grid grid-cols-2 gap-2 col-span-2' }, [field(l1, c1), field(l2, c2)]); }
  function colorIn(value, onChange) { const n = el('input', { type: 'color', value: value || '#ffffff', class: 'h-9 w-full rounded-lg bg-transparent' }); n.addEventListener('input', (e) => onChange(e.target.value)); return n; }
  function range(value, min, max, onChange) { const n = el('input', { type: 'range', min: String(min), max: String(max), value: String(value), class: 'w-full accent-fuchsia-500' }); n.addEventListener('input', (e) => onChange(parseFloat(e.target.value))); return n; }
  function labeledRange(label, value, min, max, onChange) { return el('div', { class: 'col-span-2' }, [el('label', { class: 'field-label' }, label), range(value, min, max, onChange)]); }
  function selectIn(options, value, onChange) {
    const n = el('select', { class: 'field' });
    options.forEach(([v, label]) => { const o = el('option', { value: v }, label); if (String(v) === String(value)) o.selected = true; n.appendChild(o); });
    n.addEventListener('change', (e) => onChange(e.target.value));
    return n;
  }

  window.Canvas = { renderStatic, open, blankDesign, bgStyle };
})();

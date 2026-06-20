/* ============================================================
   ui.js — shared UI utilities: toast, modal, file→dataURL,
   element builder, holographic mouse tracking
   Exposed as window.UI
   ============================================================ */
(function () {
  'use strict';

  /* tiny DOM builder: el('div', {class:'x', onclick:fn}, [children|string]) */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style') node.setAttribute('style', v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v);
      }
    }
    appendChildren(node, children);
    return node;
  }
  function appendChildren(node, children) {
    if (children == null) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /* ---- Toast ---- */
  function toast(msg, kind) {
    const root = document.getElementById('toast-root');
    const colors = {
      success: 'border-emerald-400/40 text-emerald-200',
      error: 'border-rose-400/40 text-rose-200',
      info: '',
    };
    const t = el('div', { class: 'toast ' + (colors[kind] || '') }, msg);
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .3s'; }, 2200);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---- Modal ---- */
  function modal(content, opts) {
    const root = document.getElementById('modal-root');
    const card = el('div', { class: 'glass w-full max-w-lg rounded-2xl p-6 view-in ' + ((opts && opts.size) || '') });
    appendChildren(card, content);
    const overlay = el('div', {
      class: 'modal-overlay',
      onclick: (e) => { if (e.target === overlay && (!opts || opts.dismissable !== false)) close(); },
    }, [card]);
    function close() { overlay.remove(); }
    root.appendChild(overlay);
    return { close, card };
  }

  function confirm(message, onYes, opts) {
    opts = opts || {};
    const m = modal([
      el('h3', { class: 'mb-2 font-display text-lg font-bold' }, opts.title || 'Confirmar'),
      el('p', { class: 'mb-5 text-sm text-slate-300' }, message),
      el('div', { class: 'flex justify-end gap-2' }, [
        el('button', { class: 'btn-secondary', onclick: () => m.close() }, 'Cancelar'),
        el('button', { class: 'btn-primary', onclick: () => { m.close(); onYes && onYes(); } }, opts.yes || 'Confirmar'),
      ]),
    ]);
    return m;
  }

  /* ---- file → dataURL, downscaled & compressed to keep storage small ---- */
  function readImage(file, opts) {
    opts = opts || {};
    const maxDim = opts.maxDim || 800;
    const quality = opts.quality || 0.82;
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Arquivo inválido'));
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result;
        // SVG/GIF: keep as-is (canvas would rasterize/lose animation); they are small anyway
        if (file.type === 'image/svg+xml' || file.type === 'image/gif') return resolve(raw);
        const img = new Image();
        img.onload = () => {
          try {
            let w = img.width, h = img.height;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (e) { resolve(raw); }
        };
        img.onerror = () => resolve(raw);
        img.src = raw;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* Build a styled dropzone with file input. onImage(dataURL) */
  function dropzone(opts) {
    opts = opts || {};
    const input = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
    const zone = el('label', { class: 'dropzone' }, [
      el('div', { class: 'text-3xl' }, opts.icon || '📷'),
      el('div', { class: 'text-sm font-semibold' }, opts.label || 'Arraste uma imagem ou clique'),
      el('div', { class: 'text-xs text-slate-400' }, 'PNG, JPG · armazenado localmente'),
      input,
    ]);
    async function handle(file) {
      try { const url = await readImage(file); opts.onImage && opts.onImage(url); }
      catch (e) { toast('Não foi possível ler a imagem', 'error'); }
    }
    input.addEventListener('change', (e) => e.target.files[0] && handle(e.target.files[0]));
    ['dragover', 'dragenter'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handle(f); });
    return zone;
  }

  /* Holographic mouse tracking for shiny/legend cards inside a container */
  function bindHolo(container) {
    container.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.sticker--shiny, .sticker--legend');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', mx + '%');
      card.style.setProperty('--my', my + '%');
      const rx = (my - 50) / 6, ry = (50 - mx) / 6;
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    container.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.sticker--shiny, .sticker--legend');
      if (card) card.style.transform = '';
    });
  }

  function sparkleBurst(x, y) {
    const symbols = ['✨', '⭐', '💫', '🌟'];
    for (let i = 0; i < 6; i++) {
      const s = el('div', { class: 'sparkle' }, symbols[i % symbols.length]);
      s.style.left = x + (Math.random() * 60 - 30) + 'px';
      s.style.top = y + (Math.random() * 60 - 30) + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }

  window.UI = { el, clear, appendChildren, toast, modal, confirm, readImage, dropzone, bindHolo, sparkleBurst };
})();

/* ============================================================
   stickers.js — render a sticker card from its definition
   Exposed as window.Stickers
   ============================================================ */
(function () {
  'use strict';
  const { el } = window.UI;
  const { RARITIES } = window.Store;

  /* Render a single sticker card element.
     opts: { showStats:true, small:false } */
  function render(sticker, opts) {
    opts = opts || {};
    const rar = RARITIES[sticker.type] || RARITIES.normal;

    const photo = sticker.photo
      ? el('div', { class: 'sticker__photo', style: `background-image:url('${sticker.photo}')` })
      : el('div', { class: 'sticker__photo sticker__photo--empty' }, initials(sticker.name));

    const layers = [photo, el('div', { class: 'sticker__overlay' })];

    // Holographic layers for shiny + legend
    if (sticker.type === 'shiny') {
      layers.push(el('div', { class: 'sticker__holo' }));
      layers.push(el('div', { class: 'sticker__holo2' }));
    }
    if (sticker.type === 'legend') {
      layers.push(el('div', { class: 'sticker__holo' }));
      layers.push(el('div', { class: 'sticker__crown' }, '👑'));
    }

    // Number badge
    if (sticker.number != null) layers.push(el('div', { class: 'sticker__num' }, '#' + sticker.number));
    // Rarity badge
    layers.push(el('div', { class: 'sticker__badge' }, rar.badge));

    // Name + team
    layers.push(el('div', { class: 'sticker__name' }, sticker.name || 'Sem nome'));
    if (sticker.team) layers.push(el('div', { class: 'sticker__team' }, sticker.team));

    // Stats
    if (opts.showStats !== false && (sticker.height || sticker.weight || sticker.dob)) {
      const stats = [];
      if (sticker.height) stats.push(el('span', {}, '📏 ' + sticker.height));
      if (sticker.weight) stats.push(el('span', {}, '⚖ ' + sticker.weight));
      if (stats.length) layers.push(el('div', { class: 'sticker__stats' }, stats));
    }

    const card = el('div', { class: 'sticker sticker--' + (sticker.type || 'normal') }, layers);
    if (opts.onClick) card.addEventListener('click', opts.onClick);
    return card;
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  }

  /* Detailed front/back flip view used in modals (player card details) */
  function detailCard(sticker) {
    const wrap = el('div', { class: 'mx-auto w-56' });
    wrap.appendChild(render(sticker, { showStats: true }));
    window.UI.bindHolo(wrap);
    const info = el('div', { class: 'mt-4 space-y-1 text-sm text-slate-300' }, [
      sticker.team ? row('Time', sticker.team) : null,
      sticker.dob ? row('Nascimento', formatDate(sticker.dob)) : null,
      sticker.height ? row('Altura', sticker.height) : null,
      sticker.weight ? row('Peso', sticker.weight) : null,
      row('Raridade', (RARITIES[sticker.type] || RARITIES.normal).label),
    ]);
    wrap.appendChild(info);
    return wrap;
  }
  function row(k, v) {
    return el('div', { class: 'flex justify-between border-b border-white/10 py-1' }, [
      el('span', { class: 'text-slate-400' }, k),
      el('span', { class: 'font-semibold' }, v),
    ]);
  }
  function formatDate(d) {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch (e) { return d; }
  }

  window.Stickers = { render, detailCard, initials };
})();

/* ============================================================
   assets.js — avatares de "jogador modelo" gerados via SVG
   (sem fotos reais por questão de direitos autorais)
   Exposto como window.Assets
   ============================================================ */
(function () {
  'use strict';

  function avatar(o) {
    o = o || {};
    const jersey = o.jersey || '#e11d48';
    const jersey2 = o.jersey2 || shade(jersey, -25);
    const skin = o.skin || '#f1c27d';
    const hair = o.hair || '#2b2118';
    const bg1 = o.bg1 || '#1e293b';
    const bg2 = o.bg2 || '#020617';
    const num = o.num != null ? o.num : '10';
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'>" +
      "<defs>" +
        "<linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='" + bg1 + "'/><stop offset='1' stop-color='" + bg2 + "'/></linearGradient>" +
        "<linearGradient id='js' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='" + jersey + "'/><stop offset='1' stop-color='" + jersey2 + "'/></linearGradient>" +
      "</defs>" +
      "<rect width='300' height='400' fill='url(#bg)'/>" +
      "<circle cx='150' cy='150' r='120' fill='#ffffff' opacity='0.05'/>" +
      "<ellipse cx='150' cy='405' rx='200' ry='70' fill='#14532d' opacity='0.45'/>" +
      // neck
      "<rect x='132' y='168' width='36' height='40' rx='14' fill='" + shade(skin, -18) + "'/>" +
      // head
      "<circle cx='150' cy='130' r='54' fill='" + skin + "'/>" +
      // ears
      "<circle cx='98' cy='132' r='12' fill='" + skin + "'/><circle cx='202' cy='132' r='12' fill='" + skin + "'/>" +
      // hair
      "<path d='M96 126 Q104 64 150 60 Q196 64 204 126 Q196 100 178 96 Q150 84 122 96 Q104 100 96 126 Z' fill='" + hair + "'/>" +
      // simple face
      "<circle cx='130' cy='128' r='6' fill='#2d2d2d'/><circle cx='170' cy='128' r='6' fill='#2d2d2d'/>" +
      "<path d='M134 156 Q150 168 166 156' stroke='#9b5b3a' stroke-width='4' fill='none' stroke-linecap='round'/>" +
      // jersey
      "<path d='M64 270 Q66 210 122 196 L178 196 Q234 210 236 270 L236 360 L64 360 Z' fill='url(#js)'/>" +
      // sleeves
      "<path d='M64 270 L30 312 L56 332 L86 286 Z' fill='url(#js)'/>" +
      "<path d='M236 270 L270 312 L244 332 L214 286 Z' fill='url(#js)'/>" +
      // collar
      "<path d='M122 196 L150 226 L178 196 Z' fill='#ffffff' opacity='0.85'/>" +
      // number
      "<text x='150' y='325' font-family='Arial, sans-serif' font-size='74' font-weight='bold' fill='#ffffff' text-anchor='middle' opacity='0.92'>" + num + "</text>" +
      "</svg>";
    // encode with double-quote-safe escaping so it works inside CSS url('...')
    return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/'/g, '"'));
  }

  /* lighten/darken a hex color by pct (-100..100) */
  function shade(hex, pct) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  const players = [
    { name: 'Camisa 10', url: avatar({ jersey: '#e11d48', num: 10, bg1: '#1e293b' }) },
    { name: 'Azul 7', url: avatar({ jersey: '#2563eb', num: 7, bg1: '#0c2340' }) },
    { name: 'Verde 9', url: avatar({ jersey: '#16a34a', skin: '#8d5524', num: 9, bg1: '#052e16' }) },
    { name: 'Ouro 11', url: avatar({ jersey: '#facc15', jersey2: '#b45309', num: 11, bg1: '#1c1917', skin: '#c68642', hair: '#0d0d0d' }) },
    { name: 'Laranja 8', url: avatar({ jersey: '#f97316', num: 8, bg1: '#1e293b', skin: '#ffdbac', hair: '#5b3a1a' }) },
    { name: 'Goleiro 1', url: avatar({ jersey: '#111827', jersey2: '#374151', num: 1, bg1: '#334155' }) },
    { name: 'Roxo 23', url: avatar({ jersey: '#a855f7', num: 23, bg1: '#2e1065', skin: '#8d5524', hair: '#1a1a1a' }) },
    { name: 'Ciano 5', url: avatar({ jersey: '#06b6d4', skin: '#5c3a21', num: 5, bg1: '#083344', hair: '#0d0d0d' }) },
  ];

  window.Assets = { avatar, players, shade };
})();

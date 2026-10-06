'use strict';
// Pixel-art mouse cursors (an arrow, and a pointing hand over buttons), drawn once into small PNGs and used as CSS
// cursors, so they move with the system pointer and never lag. No image files needed.
(function (root) {
  const COL = { X: '#0d3170', W: '#ffffff' };
  const ARROW = [
    'X..........',
    'XX.........',
    'XWX........',
    'XWWX.......',
    'XWWWX......',
    'XWWWWX.....',
    'XWWWWWX....',
    'XWWWWWWX...',
    'XWWWWWWWX..',
    'XWWWWWWWWX.',
    'XWWWWWXXXXX',
    'XWWXWWX....',
    'XWX.XWWX...',
    'XX..XWWX...',
    'X....XWWX..',
    '.....XWWX..',
    '......XX...',
  ];
  const HAND = [
    '.....XX.........',
    '....XWWX........',
    '....XWWX........',
    '....XWWX........',
    '....XWWXXX......',
    '....XWWXWWXXX...',
    '.XX.XWWXWWXWWXX.',
    'XWWXXWWWWWWWWWWX',
    'XWWWXWWWWWWWWWWX',
    '.XWWWWWWWWWWWWWX',
    '..XWWWWWWWWWWWWX',
    '..XWWWWWWWWWWWX.',
    '...XWWWWWWWWWWX.',
    '...XWWWWWWWWWX..',
    '....XWWWWWWWWX..',
    '....XXXXXXXXXX..',
  ];
  // rows → CSS cursor value; s = screen pixels per art pixel, (hx, hy) = hotspot in art pixels
  function make(rows, s, hx, hy) {
    if (typeof document === 'undefined') return 'auto';
    const w = rows[0].length, h = rows.length, c = document.createElement('canvas');
    c.width = (w + 1) * s; c.height = (h + 1) * s;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(13,49,112,0.3)';                          // soft one-pixel drop shadow
    rows.forEach((r, y) => { for (let x = 0; x < w; x++) if (r[x] !== '.') g.fillRect((x + 1) * s, (y + 1) * s, s, s); });
    rows.forEach((r, y) => { for (let x = 0; x < w; x++) if (r[x] !== '.') { g.fillStyle = COL[r[x]]; g.fillRect(x * s, y * s, s, s); } });
    return `url(${c.toDataURL('image/png')}) ${hx * s} ${hy * s}, ${rows === HAND ? 'pointer' : 'default'}`;
  }
  let cache = null;
  function get() {
    if (!cache) cache = { arrow: make(ARROW, 2, 0, 0), hand: make(HAND, 2, 5, 0) };   // 2 CSS px per art pixel: chunky but cursor-sized
    return cache;
  }

  root.SkiCursor = { get };
})(typeof window !== 'undefined' ? window : globalThis);

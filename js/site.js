'use strict';
// The real 數讀房市 website under the game: pages saved by tools/sitesnap.js (assets/site/<page>_<desk|phone>.js), laid
// out by the browser with the site's own HTML and CSS, in a layer right under the canvas. The canvas is see-through
// wherever a map clears it, so there the player sees the website as anyone browsing it does, scrolled by the game, and
// only what the game draws on top of it (her, coins, what is in the way) is extra.
//   SkiSite.load(page)                       start fetching a page (in the layout the screen is showing)
//   SkiSite.show(page, scroll)               show it, scrolled down `scroll` of its own CSS pixels
//   SkiSite.ready(page)                      the page that comes next: drawn under the one shown (or under the opaque
//                                            canvas), run down once so its pictures and type are in when it is shown
//   SkiSite.begin() / SkiSite.end()          round each frame the game draws (end: what was not asked for, not drawn)
//   SkiSite.width()                          how wide the page is laid out (desktop 1600 in landscape, phone 430 in portrait)
//   SkiSite.font()                           the page's own type, for what a map draws over it
// The page's box is the game screen: as wide as the layout, as tall as the screen's shape makes it, scaled to cover
// the canvas exactly. Its viewport units are that box's, its fixed things fixed to it, its sticky header sticks to it.
// Each page is built in a box of its own as soon as it comes in; one not wanted is kept laid out with nothing drawn
// (content-visibility: hidden), so showing it costs little, and less again once it has been ready.
(function (root) {
  const D = root.SkiDraw;
  const DATA = (root.SKI_SITE = root.SKI_SITE || {});
  const asked = new Set(), PAGES = new Map();                    // key → { d, host, scroller, W, H, y, warm, on }
  let layer = null, wrap = null, fontStyle = null, front = null, on = false, rect = null;
  const used = new Set();                                         // (shown or made ready this frame)

  const lay = () => (D && D.P ? 'phone' : 'desk');
  const width = () => (lay() === 'phone' ? 430 : 1600);
  if (typeof window !== 'undefined') window.addEventListener('resize', () => { rect = null; });   // (where the canvas is: read again only when the window changes)

  function load(page) {
    if (typeof document === 'undefined') return;
    const key = `${page}_${lay()}`;
    if (DATA[key]) { build(key); return; }
    if (asked.has(key)) return;
    asked.add(key);
    const s = document.createElement('script'); s.src = `assets/site/${key}.js`; s.async = true;
    s.onload = () => build(key);
    document.head.appendChild(s);
  }

  function frame() {
    if (layer) return;
    layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;z-index:0;content-visibility:hidden;';
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;';
    layer.appendChild(wrap); document.body.appendChild(layer);
    fontStyle = document.createElement('style'); document.head.appendChild(fontStyle);   // (@font-face does nothing inside a shadow root)
  }

  function build(key) {
    const d = DATA[key];
    if (!d || PAGES.has(key)) return;
    frame();
    for (const f of d.fonts) fontStyle.appendChild(document.createTextNode(f + '\n'));
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;z-index:0;isolation:isolate;content-visibility:hidden;';
    host.style.background = d.bg;                                 // (opaque, and a stacking of its own: nothing of a page kept ready under it shows through)
    const sh = host.attachShadow({ mode: 'open' });
    sh.innerHTML = `<style>:host{display:block;overflow:hidden;}${d.css}
      *{scroll-snap-type:none!important;scroll-behavior:auto!important;}
      .ski-html{height:100%;overflow:hidden;}</style>` +
      `<div class="ski-html ${d.htmlCls}" style="${d.htmlStyle}"><div class="ski-body ${d.bodyCls}" style="${d.bodyStyle}">${d.html}</div></div>`;
    const p = { d, host, scroller: (d.inner && sh.querySelector('[data-ski-scroll]')) || sh.querySelector('.ski-html'), warm: 0, on: false };
    PAGES.set(key, p);
    wrap.appendChild(host);
    p.boot = 3; place(p);                                          // (laid out now, as the race starts, under the opaque canvas: kept laid out after)
  }

  function place(p) {                                             // the box: the page's width, the screen's shape, over the canvas
    const W = p.d.w, H = Math.round(W * D.H / D.W);
    if (p.W !== W || p.H !== H) {
      p.W = W; p.H = H;
      p.host.style.width = W + 'px'; p.host.style.height = H + 'px';
      p.host.style.setProperty('--ski-vw', W / 100 + 'px'); p.host.style.setProperty('--ski-vh', H / 100 + 'px');
    }
    if (!rect) { const r = document.getElementById('game').getBoundingClientRect(); rect = { l: r.left, t: r.top, w: r.width, h: r.height }; }
    if (layer._r !== rect) { Object.assign(layer.style, { left: rect.l + 'px', top: rect.t + 'px', width: rect.w + 'px', height: rect.h + 'px' }); layer._r = rect; }
    const k = rect.w / W;
    if (wrap._k !== k || wrap._w !== W) { wrap.style.width = W + 'px'; wrap.style.height = H + 'px'; wrap.style.transform = `scale(${k})`; wrap._k = k; wrap._w = W; }
    if (!on) { layer.style.contentVisibility = 'visible'; on = true; }
    if (!p.on) { p.host.style.contentVisibility = 'visible'; p.on = true; }
    used.add(p);
  }
  function scrollTo(p, y) { y = Math.max(0, Math.round(y)); if (p.y !== y) { p.scroller.scrollTop = y; p.y = y; } }   // (never read back: no layout forced from here)

  function show(page, scroll) {
    if (typeof document === 'undefined') return false;
    const p = PAGES.get(`${page}_${lay()}`);
    if (!p) { load(page); return false; }
    place(p);
    if (front !== p) { if (front) front.host.style.zIndex = '0'; p.host.style.zIndex = '1'; front = p; }
    if (layer._bg !== p.d.bg) { layer.style.background = p.d.bg; layer._bg = p.d.bg; }
    scrollTo(p, scroll);
    return true;
  }
  function ready(page) {
    if (typeof document === 'undefined') return;
    const p = PAGES.get(`${page}_${lay()}`);
    if (!p) { load(page); return; }
    if (p === front && used.has(p)) return;
    place(p);
    if (front === p) { p.host.style.zIndex = '0'; front = null; }
    // run down it a screen every third frame, once, then wait at the top (drawn, under what is in front)
    const n = Math.ceil(p.d.h / p.H), st = Math.floor(p.warm / 3);
    scrollTo(p, st < n ? st * p.H : 0); p.warm++;
  }
  // each frame the game draws: begin(), the map shows a page (and gets the next one ready) or not, end()
  function begin() { used.clear(); for (const p of PAGES.values()) if (p.boot > 0) used.add(p); }
  function end() {
    for (const p of PAGES.values()) if (p.boot > 0) { p.boot--; used.add(p); }
    for (const p of PAGES.values()) if (p.on && !used.has(p)) { p.host.style.contentVisibility = 'hidden'; p.on = false; if (front === p) front = null; }
    if (on && !used.size) { layer.style.contentVisibility = 'hidden'; on = false; }
  }

  const font = () => (front ? front.d.font : PAGES.size ? PAGES.values().next().value.d.font : null);
  root.SkiSite = { load, show, ready, begin, end, width, font, layout: lay };
})(typeof window !== 'undefined' ? window : globalThis);

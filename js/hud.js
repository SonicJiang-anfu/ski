'use strict';
// Everything drawn over the 3D world: the trailer-style glass HUD (pause button, plates), the touch pads, and the
// title / countdown / pause / result screens. Layout depends only on D.W, D.H and D.P (portrait).
(function (root) {
  const { clamp, seg, lerp, E, fmtTime, fmtInt } = root.SkiCore;
  const D = root.SkiDraw;
  const ORANGE_SOFT = '#ffb27d';
  const TITLE = '雪坡大冒險';
  const RANK_COL = { S: '#f7c531', A: D.C.orange, B: '#2a6fd6', C: '#8090b8' };
  const RANK_DARK = { S: '#a87a08', A: '#a83a08', B: '#164a9a', C: '#4a5878' };

  function layout() {
    const W = D.W, H = D.H, P = D.P;
    return {
      pause: { x: 80, y: 84, r: 44 },
      mute: { x: 184, y: 84, r: 44 },
      plates: P ? [[40, 170, (W - 120) / 3], [60 + (W - 120) / 3, 170, (W - 120) / 3], [80 + 2 * (W - 120) / 3, 170, (W - 120) / 3]]
        : [[W - 420, 40, 380], [W - 420, 158, 380], [W - 420, 276, 380]],
      pads: P ? [{ id: 'left', x: 150, y: H - 210, r: 84 }, { id: 'right', x: 350, y: H - 210, r: 84 }, { id: 'up', x: W - 160, y: H - 400, r: 90 }, { id: 'down', x: W - 160, y: H - 190, r: 90 }]
        : [{ id: 'left', x: 150, y: H - 150, r: 74 }, { id: 'right', x: 330, y: H - 150, r: 74 }, { id: 'up', x: W - 170, y: H - 300, r: 82 }, { id: 'down', x: W - 170, y: H - 112, r: 82 }],
    };
  }

  // ------------------------------------------------------------ mouse hover (k: 0..1, eased in by main.js)
  const NOHOVER = () => 0;
  function grow(cx, cy, k, amt, fn) {                             // draw fn scaled up around (cx, cy) as the hover comes in
    const g = D.ctx, s = 1 + amt * E.out(k);
    g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); fn(); g.restore();
  }
  function glow(x, y, w, h, r, k) {                               // orange light around the button
    if (k <= 0) return;
    const g = D.ctx; g.save(); g.globalAlpha *= k;
    g.shadowColor = 'rgba(255,122,26,0.95)'; g.shadowBlur = 28; g.lineWidth = 6; g.strokeStyle = '#ffb02e';
    g.beginPath(); g.roundRect(x - 4, y - 4, w + 8, h + 8, r + 4); g.stroke(); g.restore();
  }
  const ARW = ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'], ARW_L = ARW.map(r => [...r].reverse().join(''));
  function arrows(x, y, w, h, k, t) {                             // pixel arrows either side, nudging in and out
    if (k <= 0) return;
    const off = 34 + Math.round((Math.sin(t * 9) * 0.5 + 0.5) * 3) * 4 - 16 * (1 - E.out(k)), cy = y + h / 2 + 14;
    D.pix(ARW, { X: '#ffd84a' }, x - off, cy, 4, k);
    D.pix(ARW_L, { X: '#ffd84a' }, x + w + off, cy, 4, k);
  }
  function button(b, k, t, main) {                                // a menu button with its hover look
    grow(b.x + b.w / 2, b.y + b.h / 2, k, 0.05, () => {
      if (main) D.panel(b.x, b.y, b.w, b.h, { fill: D.C.orange, border: '#c03a08', b: 6 });
      else D.glassRR(b.x, b.y, b.w, b.h, 28);
      if (k > 0) { D.ctx.save(); D.ctx.globalAlpha *= 0.18 * k; D.ctx.fillStyle = '#ffffff'; D.ctx.beginPath(); D.ctx.roundRect(b.x, b.y, b.w, b.h, main ? 6 : 28); D.ctx.fill(); D.ctx.restore(); }
      glow(b.x, b.y, b.w, b.h, main ? 6 : 28, k);
      D.txt(b.label, b.x + b.w / 2, b.y + (main ? 76 : 74), { size: main ? 54 : 50, color: '#ffffff', align: 'center' });
    });
    arrows(b.x, b.y, b.w, b.h, k, t);
  }

  // ← back to the screen before (the character select / the title), left of the screen's heading: a phone has no Esc
  const backLayout = gx => { const r = D.P ? 56 : 50, cx = gx + r, cy = D.P ? 158 : 146; return { id: 'back', cx, cy, r, x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, hx: gx + 2 * r + 30 }; };
  function backButton(b, k) {
    const g = D.ctx;
    g.save(); g.translate(b.cx, b.cy); g.scale(1 + 0.08 * E.out(k), 1 + 0.08 * E.out(k));
    g.fillStyle = k > 0 ? D.C.orange : 'rgba(13,49,112,0.82)'; g.beginPath(); g.arc(0, 0, b.r, 0, 7); g.fill();
    const s = b.r * 0.36; g.strokeStyle = '#ffffff'; g.lineWidth = b.r * 0.2; g.lineCap = 'round'; g.lineJoin = 'round';   // (a chevron, like a phone's back)
    g.beginPath(); g.moveTo(s * 0.45, -s); g.lineTo(-s * 0.55, 0); g.lineTo(s * 0.45, s); g.stroke();
    g.restore();
  }

  // ------------------------------------------------------------ in-game HUD
  function icons(muted, hk = NOHOVER) {
    const L = layout(), g = D.ctx;
    const ring = (c, k) => { if (k > 0) glow(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, c.r, k); };
    grow(L.pause.x, L.pause.y, hk('pause'), 0.12, () => {
      D.glassCircle(L.pause.x, L.pause.y, L.pause.r); ring(L.pause, hk('pause'));
      g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(L.pause.x - 16, L.pause.y - 18, 11, 36, 3); g.fill(); g.beginPath(); g.roundRect(L.pause.x + 5, L.pause.y - 18, 11, 36, 3); g.fill();
    });
    grow(L.mute.x, L.mute.y, hk('mute'), 0.12, () => {
      D.glassCircle(L.mute.x, L.mute.y, L.mute.r); ring(L.mute, hk('mute'));
      const mx = L.mute.x - 8, my = L.mute.y;                     // speaker, with waves or a cross
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(mx - 16, my - 8); g.lineTo(mx - 6, my - 8); g.lineTo(mx + 6, my - 18); g.lineTo(mx + 6, my + 18); g.lineTo(mx - 6, my + 8); g.lineTo(mx - 16, my + 8); g.closePath(); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.lineCap = 'round';
      if (muted) { g.beginPath(); g.moveTo(mx + 14, my - 9); g.lineTo(mx + 28, my + 9); g.moveTo(mx + 28, my - 9); g.lineTo(mx + 14, my + 9); g.stroke(); }
      else { [10, 19].forEach(r => { g.beginPath(); g.arc(mx + 6, my, r, -0.8, 0.8); g.stroke(); }); }
      g.lineCap = 'butt';
    });
  }
  function play(s, o) {
    const L = layout(), P = D.P;
    icons(o.muted, o.hk);
    L.plates.forEach(([x, y, w]) => D.glassRR(x, y, w, 100, 20));
    const [[tx, ty, tw], [cx, cy, cw], [px, py, pw]] = L.plates, vs = P ? 40 : 44;
    const time = s.finishTime ?? s.t;
    D.txt('TIME', tx + 26, ty + 36, { size: 22, color: ORANGE_SOFT, ls: 4 });
    D.txt(fmtTime(time), tx + tw - 26, ty + 82, { size: vs, color: '#ffffff', align: 'right' });
    D.txt('COIN', cx + 26, cy + 36, { size: 22, color: ORANGE_SOFT, ls: 4 });
    D.pix(['..OOOO..', '.OYYYYO.', 'OYWYYDYO', 'OYWYYDYO', 'OYYYYDYO', 'OYYYYDYO', '.OYDDYO.', '..OOOO..'], { O: '#b8740f', Y: '#f7c531', W: '#fff3b0', D: '#e09a1a' }, cx + cw - 150 + (P ? 30 : 0), cy + 80, 4);
    D.txt(String(s.coins), cx + cw - 26, cy + 82, { size: vs, color: '#ffffff', align: 'right' });
    D.txt('GOAL', px + 26, py + 36, { size: 22, color: ORANGE_SOFT, ls: 4 });
    const CO = s.course, k = clamp((s.z - CO.START) / (CO.FINISH - CO.START)), bx = px + 26, bw = pw - 52, by = py + 58;   // progress to the goal
    D.rect(bx, by, bw, 14, 'rgba(255,255,255,0.25)');
    D.rect(bx, by, bw * k, 14, D.C.orange);
    D.spr(o.char || 'anje', bx + bw * k, by + 14, 0.6);
  }
  function pads(input) {
    const L = layout(), g = D.ctx;
    const arrow = d => () => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(d * 30, 0); g.lineTo(-d * 18, -32); g.lineTo(-d * 18, 32); g.closePath(); g.fill(); };
    const chevron = (d, label) => () => {
      g.fillStyle = '#ffffff'; g.save(); g.scale(1, d);
      g.beginPath(); g.moveTo(0, -40); g.lineTo(34, -6); g.lineTo(18, -6); g.lineTo(0, -24); g.lineTo(-18, -6); g.lineTo(-34, -6); g.closePath(); g.fill();
      g.restore(); D.txt(label, 0, d > 0 ? 38 : -20, { size: 26, color: '#ffffff', align: 'center', ls: 2 });
    };
    const icon = { left: arrow(-1), right: arrow(1), up: chevron(1, 'JUMP'), down: chevron(-1, 'DUCK') };
    for (const p of L.pads) D.pad(p.x, p.y, p.r, icon[p.id], input.pressed[p.id], input.now - input.since[p.id]);
  }

  // ------------------------------------------------------------ popups during the run
  // the big words a map's moments pop up (kind → text, outline colour)
  const WORDS = { launch: ['衝上夜空！', '#5a2fb0'], glass: ['破窗而入！', '#0a6f8f'], loop: ['大迴環！', '#d4501a'], bounce: ['彈跳！', '#2f6fe0'], leap: ['飛越斷軌！', '#d4501a'], tv: ['進入電視！', '#2f6fe0'], tvout: ['回到現實！', '#d4501a'], squash: ['踩扁！', '#2a8a2a'],
    cart: ['礦車出發！', '#8a5a2a'], cartjump: ['飛越岩漿谷！', '#d4501a'], steam: ['蒸氣噴射！', '#3a7aa8'], erupt: ['火山爆發！', '#d42f2f'], crater: ['墜入火山口！', '#d42f2f'], blast: ['噴發升空！', '#e8501a'],
    mag: ['磁浮天軌！', '#1a7aa8'], wallride: ['飛簷走壁！', '#b02a8a'], spiral: ['螺旋隧道！', '#6a2ab0'], flip: ['倒懸都市！', '#2a4ab0'], od: ['OVERDRIVE！', '#c8460a'], bridge: ['數據重組！', '#0a7ab0'], holojump: ['穿越全息！', '#b02a8a'],
    fall_void: ['掉進天空了！', '#5a2fb0'], temple: ['古代神殿！', '#8a6a2a'], windup: ['發條全開！', '#c88a0a'], vents: ['蒸氣連跳！', '#3a7aa8'], screw: ['螺旋翻轉！', '#d4501a'], rumble: ['巨石追來了！', '#a8432a'], vine: ['盪藤飛越！', '#2f8a3a'],
    shrink: ['縮小！', '#1d4f91'], grow: ['恢復原狀！', '#1d4f91'], tube: ['數據隧道！', '#c8460a'], web: ['進入數讀房市網站！', '#0d3170'], rings: ['加速光環！', '#c8460a'], bull: ['房價衝天！', '#d42f2f'], clone: ['複製貼上！', '#6a2ab0'], thin: ['走在走勢線上！', '#c8460a'], surge: ['暴漲！', '#d42f2f'], space: ['飛向失重星球！', '#6a2ab0'],
    pies: ['圓餅彈跳！', '#d4501a'], gravity: ['重力恢復！', '#6a2ab0'], reveal: ['全圖揭曉！', '#0d3170'], plunge_chart: ['房價崩盤！', '#1a7a42'], fall_break: ['資料斷層！', '#0d3170'], fall_chart_edge: ['掉出圖表了！', '#0d3170'] };
  function popups(list, now, anje, wy = null) {                  // (wy: how far down the big words go, when something is up there: a mirror)
    for (const p of list) {
      const a = now - p.t0;
      if (p.kind === 'coin' && anje) {                              // beside her shoulder, small, gone quickly: never over what is coming
        const [ax, ay, sc] = anje, pop = 1 + 0.25 * (1 - seg(a, 0, 0.12));
        D.txt('+' + 50 * p.n, ax + 30 * sc, ay - 34 * sc - a * 40, { size: Math.round(30 * pop), color: '#ffd84a', align: 'left', alpha: 1 - seg(a, 0.35, 0.6), stroke: ['#7a4a08', 7] });
      }
      if (p.kind === 'plunge') {                                   // over the edge of a sheer fall
        const e = E.back(seg(a, 0, 0.2)) * (1 - seg(a, 1.2, 1.5));
        if (e > 0) { D.ctx.save(); D.ctx.translate(D.W / 2, D.H * (wy || (D.P ? 0.36 : 0.3))); D.ctx.scale(e, e); D.txt('垂直俯衝！', 0, 0, { size: 84, color: '#ffffff', align: 'center', stroke: ['#0a6f8f', 14] }); D.ctx.restore(); }
      }
      if (WORDS[p.kind]) {                                         // up into the night sky; in through a window; round a loop...
        const e = E.back(seg(a, 0, 0.2)) * (1 - seg(a, 1.1, 1.4)), [w, col] = WORDS[p.kind];
        if (e > 0) { D.ctx.save(); D.ctx.translate(D.W / 2, D.H * (wy || (D.P ? 0.36 : 0.3))); D.ctx.scale(e, e); D.txt(w, 0, 0, { size: 84, color: '#ffffff', align: 'center', stroke: [col, 14] }); D.ctx.restore(); }
      }
      if (p.kind === 'smash') {                                    // smashing through things in overdrive: a count that punches up with each one
        const e = E.back(seg(a, 0, 0.15)) * (1 - seg(a, 0.9, 1.2));
        if (e > 0) { D.ctx.save(); D.ctx.translate(D.W / 2, D.H * (D.P ? 0.46 : 0.42)); D.ctx.scale(e, e); D.txt(`粉碎！×${p.n}`, 0, 0, { size: 70, color: '#ffe14a', align: 'center', stroke: ['#8a1a6a', 12] }); D.ctx.restore(); }
      }
      if (p.kind === 'boost') {                                    // a quick 加速！ just under the plates
        const e = E.back(seg(a, 0, 0.18)) * (1 - seg(a, 0.6, 0.8));
        if (e > 0) { D.ctx.save(); D.ctx.translate(D.W / 2, D.H * (wy || (D.P ? 0.36 : 0.3))); D.ctx.scale(e, e); D.txt('加速！', 0, 0, { size: 76, color: '#ffffff', align: 'center', stroke: ['#0a8fd0', 14] }); D.ctx.restore(); }
      }
      if (p.kind === 'crash' || p.kind === 'fall') {
        const e = E.back(seg(a, 0, 0.25)) * (1 - seg(a, 1.1, 1.4));
        if (e > 0) { D.ctx.save(); D.ctx.translate(D.W / 2, D.H * (wy || 0.3)); D.ctx.scale(e, e); D.txt(p.kind === 'fall' ? '掉下去了！' : '跌倒了！', 0, 0, { size: 84, color: '#ffffff', align: 'center', stroke: [D.C.navy, 14] }); D.ctx.restore(); }
      }
      if (p.kind === 'goal') {                                     // low in the frame (the arch behind her already says GOAL), time on the cinema bar
        const e = E.back(seg(a, 0, 0.35)), cy = D.H * (D.P ? 0.8 : 0.8);
        D.ctx.save(); D.ctx.translate(D.W / 2, cy); D.ctx.scale(e, e);
        D.panel(-280, -78, 560, 140, { fill: D.C.orange, border: D.C.orange });
        D.txt('GOAL!', 0, 30, { size: 96, color: '#ffffff', align: 'center', ls: 8 });
        D.ctx.restore();
        if (p.time !== undefined) D.txt(fmtTime(p.time), D.W / 2, D.H - Math.round(D.H * 0.09 / 2) + 18, { size: 52, color: '#ffffff', align: 'center', alpha: seg(a, 0.4, 0.7) });
      }
    }
  }
  function letterbox(k) {                                         // cinema bars for the finish shot
    const h = Math.round(D.H * 0.09 * E.out(k));
    if (h > 0) { D.rect(0, 0, D.W, h, '#071a40'); D.rect(0, D.H - h, D.W, h, '#071a40'); }
  }
  // between the map and the countdown: the chosen character pops in, a speech bubble with it, 會贏喔！; u: 0..1 over it
  function intro(char, u, t) {
    const W = D.W, H = D.H, g = D.ctx, out = seg(u, 0.82, 1), inn = E.back(seg(u, 0, 0.28)), bub = E.back(seg(u, 0.16, 0.4));
    D.rect(0, 0, W, H, 'rgba(7,26,64,1)', 0.35 * (1 - out));
    const s = D.P ? 9 : 8, cx = D.P ? W * 0.27 : W * 0.36, by = D.P ? H * 0.62 : H * 0.8, hop = Math.abs(Math.sin(t * 9)) * 10;
    g.save(); g.globalAlpha *= 1 - out;
    g.save(); g.translate(cx - (1 - inn) * W * 0.5, by - hop);
    D.shadowEll(0, hop, 20 * s * 0.55, 0.18);
    D.spr(char + ((t * 0.9) % 3.3 < 0.16 ? '_ski_front_blink' : '_ski_front'), 0, 0, s);   // (on her skis, poles in hand)
    g.restore();
    if (bub > 0) {                                                  // the bubble: up and to the right of her, its tail pointing back at her
      const bw = D.P ? 560 : 600, bh = D.P ? 210 : 200, bx = cx + 20 * s * 0.6, byy = by - 48 * s - bh * 0.15;
      g.save(); g.translate(bx, byy + bh); g.scale(bub, bub); g.translate(-bx, -(byy + bh));
      g.fillStyle = '#ffffff'; g.strokeStyle = D.C.navy; g.lineWidth = 8; g.lineJoin = 'round';
      g.beginPath(); g.roundRect(bx, byy, bw, bh, 48); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(bx + 60, byy + bh - 4); g.lineTo(bx - 10, byy + bh + 60); g.lineTo(bx + 130, byy + bh - 4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(bx + 60, byy + bh); g.lineTo(bx - 10, byy + bh + 60); g.lineTo(bx + 130, byy + bh); g.stroke();
      D.txt('會贏喔！', bx + bw / 2, byy + bh / 2 + 36, { size: D.P ? 104 : 110, color: D.C.orange, align: 'center', stroke: ['#ffffff', 6] });
      g.restore();
    }
    g.restore();
  }

  function countdown(a) {                                         // a: seconds since the countdown began (3, 2, 1 at 0/1/2, GO at 3)
    const n = Math.floor(a), f = a - n, label = n < 3 ? String(3 - n) : 'GO!';
    if (n > 3 || (n === 3 && f > 0.7)) return;
    const e = E.back(seg(f, 0, 0.25)), al = 1 - seg(f, n < 3 ? 0.75 : 0.45, n < 3 ? 1 : 0.7);
    D.ctx.save(); D.ctx.translate(D.W / 2, D.H * (D.P ? 0.68 : 0.8)); D.ctx.scale(e, e);   // on the open snow below her
    D.txt(label, 0, 0, { size: n < 3 ? 220 : 180, color: n < 3 ? '#ffffff' : '#ffd84a', align: 'center', base: 'middle', alpha: al, stroke: [n < 3 ? D.C.navy : D.C.orange, 22] });
    D.ctx.restore();
  }

  // back from pause: a small glass dial with a draining ring in the middle of the screen (unlike the big start
  // countdown); a: seconds since resuming (3 beats), then `burst` (seconds since it ended) lets it pop away
  function resumeCount(a, burst = null) {
    const W = D.W, H = D.H, g = D.ctx, cx = W / 2, cy = H / 2, r = D.P ? 120 : 110;                      // dead centre
    if (burst === null) {
      D.rect(0, 0, W, H, 'rgba(7,26,64,1)', 0.38);                 // the screen stays dimmed for the whole count
      const n = Math.min(2, Math.floor(a)), f = a - n, pop = E.back(seg(f, 0, 0.2));
      D.glassCircle(cx, cy, r);
      g.save(); g.lineCap = 'round'; g.lineWidth = 12;
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(cx, cy, r - 18, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ffb02e'; g.shadowColor = 'rgba(255,122,26,0.9)'; g.shadowBlur = 16;
      g.beginPath(); g.arc(cx, cy, r - 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f)); g.stroke(); g.restore();
      g.save(); g.translate(cx, cy); g.scale(pop, pop);
      D.txt(String(3 - n), 0, 0, { size: D.P ? 130 : 120, color: '#ffffff', align: 'center', base: 'middle' });
      g.restore();
      D.txt('準備繼續', cx, cy - r - 36, { size: D.P ? 48 : 42, color: '#ffffff', align: 'center', stroke: [D.C.navy, 10], ls: 6 });
    } else {
      const k = seg(burst, 0, 0.35); if (k >= 1) return;
      g.save(); g.globalAlpha *= 1 - k; g.translate(cx, cy); g.scale(1 + k * 0.8, 1 + k * 0.8);
      g.lineWidth = 12; g.strokeStyle = '#ffb02e'; g.beginPath(); g.arc(0, 0, r - 18, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }

  // ------------------------------------------------------------ map select: a row of cards, the chosen one in the middle
  // ← → slide the row; each card shows a moment of play on that map, its tier, its name and best score. pos: the row's
  // place (eases towards the chosen card). Returns the visible cards (their rects on screen, the middle one last) and
  // the two arrow buttons.
  function cardSize() {
    const W = D.W, H = D.H;
    const w = D.P ? Math.min(780, W - 260) : Math.min(860, Math.round(W * 0.46), Math.round((H - 470) / (9 / 16 * 0.93 + 0.17)));
    const ih = Math.round((w - 24) * 9 / 16);
    return { w, h: ih + (D.P ? 170 : 160), ih };
  }
  function mapLayout(pos = 0) {
    const W = D.W, H = D.H, list = SkiMaps.list, S = cardSize();
    const cy = D.P ? Math.round(H * 0.5) : Math.round(H * 0.56), step = S.w * (D.P ? 0.88 : 0.84);
    const cards = list.map(m => {
      const d = m.i - pos, ad = Math.abs(d), k = Math.min(ad, 2.6);
      const sc = 1 - 0.32 * Math.min(k, 1) - 0.14 * Math.max(0, k - 1);
      const x = W / 2 + Math.sign(d) * (Math.min(ad, 1) * step + Math.max(0, Math.min(ad, 3) - 1) * step * 0.62);
      const w = S.w * sc, h = S.h * sc;
      return { id: 'map' + m.i, i: m.i, cx: x, cy, sc, x: x - w / 2, y: cy - h / 2, w, h, d, alpha: clamp(1 - (ad - 1.6) / 0.9) };
    }).filter(c => c.alpha > 0.01 && c.x < W && c.x + c.w > 0).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const ay = cy, ar = D.P ? 58 : 50, ax = D.P ? 70 : W / 2 - S.w / 2 - 90;
    const arrows = [{ id: 'mapL', dir: -1, x: ax - ar, y: ay - ar, w: ar * 2, h: ar * 2, cx: ax, cy: ay, r: ar },
      { id: 'mapR', dir: 1, x: W - ax - ar, y: ay - ar, w: ar * 2, h: ar * 2, cx: W - ax, cy: ay, r: ar }];
    const stripY = cy + S.h / 2 + (D.P ? 90 : 62);
    // 出發: the only way in by touch (a finger swipes the row; a tap on a card only brings it to the middle). Under the dots
    // in portrait, beside them in landscape (no room under)
    const go = D.P ? { id: 'mapGo', label: '出發', x: W / 2 - 300, y: stripY + 120, w: 600, h: 110 } : { id: 'mapGo', label: '出發', x: W - 80 - 400, y: stripY - 50, w: 400, h: 110 };
    const gx = D.P ? 60 : 80;
    return { cards, arrows, go, back: backLayout(gx), S, cy, gx, stripY, step };
  }
  const STAR = ['...X...', '...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'];
  const LOCK = ['..XXXX..', '.X....X.', '.X....X.', 'XXXXXXXX', 'XXXXXXXX', 'XXX..XXX', 'XXX..XXX', 'XXXXXXXX'];
  function mapCard(S, m, o, sel, k) {                               // drawn at full size round (0, 0); the caller scales it
    const g = D.ctx, x = -S.w / 2, y = -S.h / 2, pad = 12, tw = S.w - 2 * pad, th = S.ih, tx = x + pad, ty = y + pad, T = SkiMaps.TIERS[m.tier];
    if (sel) D.panel(x - 8, y - 8, S.w + 16, S.h + 16, { fill: D.C.orange, border: D.C.orange, b: 6, drop: false });
    D.panel(x, y, S.w, S.h, { fill: sel ? '#fff6ee' : '#ffffff', border: sel ? '#fff6ee' : D.C.border, drop: !sel });
    glow(x, y, S.w, S.h, 6, k);
    g.save(); g.beginPath(); g.rect(tx, ty, tw, th); g.clip();
    const im = D.IMG['map_' + m.id];
    if (m.ready && im) { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.drawImage(im, tx, ty, tw, th); g.imageSmoothingEnabled = sm; }
    else if (m.ready) m.theme.badge(g, tx, ty, tw, th, o.t);
    else {                                                         // not ready: the map's colours, a lock
      D.rect(tx, ty, tw, th * 0.55, m.pal[0]); D.rect(tx, ty + th * 0.55, tw, th * 0.45, m.pal[1]);
      D.rect(tx, ty + th * 0.55 - 10, tw, 10, m.pal[2]);
      D.rect(tx, ty, tw, th, '#0d3170', 0.45);
      D.pix(LOCK, { X: '#ffffff' }, tx + tw / 2, ty + th / 2 + 40, 10);
      D.txt('製作中', tx + tw / 2, ty + th / 2 + 110, { size: 44, color: '#ffffff', align: 'center' });
    }
    g.restore();
    const pw = 250;                                                // the tier, top left on the picture
    D.panel(tx + 14, ty + 14, pw, 58, { fill: T.col, border: T.col, drop: false });
    D.txt(T.name, tx + 34, ty + 58, { size: 34, color: '#ffffff' });
    for (let s = 0; s < 3; s++) D.pix(STAR, { X: s < T.stars ? '#ffd84a' : 'rgba(255,255,255,0.35)' }, tx + 14 + pw - 30 - (2 - s) * 32, ty + 58, 3.5);
    const b = o.best[m.id], al = m.ready ? 1 : 0.6, ny = ty + th + (D.P ? 82 : 76);
    D.txt(m.name, tx + 6, ny, { size: D.P ? 64 : 60, color: sel ? D.C.orange : D.C.navy, alpha: al });
    D.txt(m.en, tx + 8, ny + (D.P ? 52 : 46), { size: 24, color: D.C.faint, alpha: al, ls: 4 });
    const sub = !m.ready ? '製作中' : b && b.total > 0 ? `最高分 ${fmtInt(b.total)}` : '尚未挑戰';
    D.txt(sub, tx + tw - 6, ny + (D.P ? 52 : 46), { size: 28, color: D.C.muted, align: 'right', alpha: al });
    if (m.ready && b && b.total > 0) {                              // the best rank so far, top right on the picture: a medal on two ribbons
      const r = 56, rx = tx + tw - r - 16, ry = ty + r + 14, col = RANK_COL[b.rank], dk = RANK_DARK[b.rank];
      g.fillStyle = dk;
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(rx + sd * 12, ry); g.lineTo(rx + sd * 40, ry + r + 34); g.lineTo(rx + sd * 26, ry + r + 26); g.lineTo(rx + sd * 16, ry + r + 40); g.lineTo(rx + sd * 2, ry); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(rx + 3, ry + 5, r, 0, 7); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(rx, ry, r, 0, 7); g.fill();
      g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(rx, ry, r - 13, 0, 7); g.stroke();
      D.txt(b.rank, rx, ry + 28, { size: 80, color: '#ffffff', align: 'center', stroke: [dk, 8] });
      if (b.rank === 'S') for (let k = 0; k < 3; k++) {                // (S: glints going round it)
        const a = o.t * 1.6 + k * 2.1, tw2 = 0.5 + 0.5 * Math.sin(o.t * 5 + k * 2);
        D.pix(STAR, { X: '#ffffff' }, rx + Math.cos(a) * (r + 14), ry + Math.sin(a) * (r + 14) + 12, 2.2 + 1.6 * tw2);
      }
    }
  }
  function mapSelect(o) {                                           // o: { sel, pos, t, a, hk, touch, best: { id: {total, rank} }, deny }
    const W = D.W, H = D.H, g = D.ctx, L = mapLayout(o.pos ?? o.sel), hk = o.hk || NOHOVER, list = SkiMaps.list;
    D.rect(0, 0, W, H, D.C.bg, 0.72);
    g.fillStyle = 'rgba(213,219,232,0.45)';
    for (let x = 0; x < W; x += 48) g.fillRect(x, 0, 2, H);
    for (let y = 0; y < H; y += 48) g.fillRect(0, y, W, 2);
    backButton(L.back, hk('back'));
    D.txt('SELECT COURSE', L.back.hx, D.P ? 120 : 104, { size: 30, color: D.C.accent, ls: 10 });
    D.txt('選擇地圖', L.back.hx, D.P ? 205 : 192, { size: D.P ? 80 : 84, color: D.C.navy });
    const pop = E.back(seg(o.a, 0, 0.3));
    for (const c of L.cards) {
      const m = list[c.i], sel = c.i === o.sel, k = hk(c.id), shake = sel && o.deny > 0 ? Math.sin(o.deny * 60) * 12 * o.deny : 0;
      g.save(); g.globalAlpha = c.alpha * (Math.abs(c.d) < 0.5 ? 1 : 0.92);
      g.translate(c.cx + shake, c.cy); g.scale(c.sc * pop * (1 + 0.025 * E.out(k)), c.sc * pop * (1 + 0.025 * E.out(k)));
      mapCard(L.S, m, o, sel, k);
      if (Math.abs(c.d) > 0.5) D.rect(-L.S.w / 2, -L.S.h / 2, L.S.w, L.S.h, D.C.bg, 0.25 * Math.min(1, Math.abs(c.d)));   // (the cards either side a little faded)
      g.restore();
    }
    for (const a of L.arrows) {                                     // ◀ ▶ (not past either end)
      const can = a.dir < 0 ? o.sel > 0 : o.sel < list.length - 1;
      if (!can) continue;
      const k = hk(a.id);
      g.save(); g.translate(a.cx, a.cy); g.scale(1 + 0.08 * E.out(k), 1 + 0.08 * E.out(k));
      g.fillStyle = k > 0 ? D.C.orange : 'rgba(13,49,112,0.82)'; g.beginPath(); g.arc(0, 0, a.r, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); const s = a.r * 0.42; g.moveTo(a.dir * s, 0); g.lineTo(-a.dir * s * 0.6, -s); g.lineTo(-a.dir * s * 0.6, s); g.closePath(); g.fill();
      g.restore();
    }
    // where she is along the row: a dot per map, grouped by tier under its name
    const dot = D.P ? 30 : 26, gap = D.P ? 14 : 12, tgap = D.P ? 40 : 46, T = SkiMaps.TIERS;
    const groups = T.map((t, i) => list.filter(m => m.tier === i)), tw = groups.map(gp => gp.length * dot + (gp.length - 1) * gap);
    let x = W / 2 - (tw.reduce((p, q) => p + q, 0) + tgap * (T.length - 1)) / 2;
    groups.forEach((gp, ti) => {
      D.txt(T[ti].name, x + tw[ti] / 2, L.stripY - 18, { size: 26, color: T[ti].col, align: 'center' });
      gp.forEach((m, j) => {
        const dx = x + j * (dot + gap), on = m.i === o.sel;
        D.rect(dx, L.stripY, dot, dot, on ? T[ti].col : m.ready ? 'rgba(13,49,112,0.35)' : 'rgba(13,49,112,0.15)');
        if (on) { D.rect(dx - 4, L.stripY - 4, dot + 8, 4, T[ti].col); D.rect(dx - 4, L.stripY + dot, dot + 8, 4, T[ti].col); }
      });
      x += tw[ti] + tgap;
    });
    const ready = list[o.sel] && list[o.sel].ready;
    D.ctx.save(); if (!ready) D.ctx.globalAlpha *= 0.45; button(L.go, hk('mapGo'), o.t, true); D.ctx.restore();
    if (!o.touch) D.txt('← → 選擇　Enter 出發　Esc 返回', D.P ? W / 2 : L.gx, H - 28, { size: 24, color: D.C.muted, align: D.P ? 'center' : 'left' });
    else D.txt('左右滑動選擇地圖', D.P ? W / 2 : L.gx, H - 28, { size: 26, color: D.C.muted, align: D.P ? 'center' : 'left' });
  }

  // ------------------------------------------------------------ character select (the trailer's "選擇你的嚮導" page)
  function selectLayout() {
    const W = D.W, H = D.H, gap = 12, n = SkiChars.list.length;
    let cw, ch, gx, gy, card;
    if (!D.P) {                                                    // grid of cards on the left, big preview on the right
      gx = 80; gy = 250;
      ch = Math.floor((H - gy - 60 - 2 * gap) / 3); cw = Math.round(ch * 0.82);
      if (W - 80 - (gx + 4 * cw + 3 * gap + 40) < 460) { cw = Math.floor((W - 80 - 40 - gx - 460 - 3 * gap) / 4); ch = Math.round(cw / 0.82); }
      const cx = gx + 4 * cw + 3 * gap + 40;
      card = { x: cx, y: gy, w: W - 80 - cx, h: 3 * ch + 2 * gap };
    } else {                                                       // portrait: preview on top, cards below
      gx = 60; cw = Math.floor((W - 120 - 3 * gap) / 4);
      ch = Math.min(Math.round(cw * 1.08), Math.floor((H * 0.4 - 2 * gap) / 3));
      gy = H - 70 - (3 * ch + 2 * gap);
      card = { x: 60, y: 250, w: W - 120, h: gy - 40 - 250 };
    }
    const cards = SkiChars.list.map((c, i) => ({ id: 'card' + i, i, x: gx + (i % 4) * (cw + gap), y: gy + Math.floor(i / 4) * (ch + gap), w: cw, h: ch }));
    const go = { id: 'go', label: '下一步', x: card.x + 40, y: card.y + card.h - 150, w: card.w - 80, h: 110 };
    return { cards, card, go, back: backLayout(gx), gx, n };
  }
  const blinkAt = (t, k) => ((t + k * 0.61) % 3.3) < 0.16;
  function select(o) {                                            // o: { sel, t, a (seconds on this screen), hk, touch }
    const W = D.W, H = D.H, g = D.ctx, L = selectLayout(), hk = o.hk || NOHOVER, list = SkiChars.list;
    D.rect(0, 0, W, H, D.C.bg, 0.9);
    g.fillStyle = 'rgba(213,219,232,0.5)';
    for (let x = 0; x < W; x += 48) g.fillRect(x, 0, 2, H);
    for (let y = 0; y < H; y += 48) g.fillRect(0, y, W, 2);
    backButton(L.back, hk('back'));
    D.txt('SELECT YOUR SKIER', L.back.hx, D.P ? 120 : 104, { size: D.P ? 30 : 30, color: D.C.accent, ls: 10 });
    D.txt('選擇角色', L.back.hx, D.P ? 205 : 192, { size: D.P ? 80 : 84, color: D.C.navy });
    L.cards.forEach(c => {
      const sel = c.i === o.sel, k = hk(c.id), pop = E.back(seg(o.a, c.i * 0.03, c.i * 0.03 + 0.25));
      if (pop <= 0) return;
      g.save(); g.translate(c.x + c.w / 2, c.y + c.h / 2); g.scale(pop * (1 + 0.04 * E.out(k)), pop * (1 + 0.04 * E.out(k))); g.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
      if (sel) {
        D.panel(c.x - 6, c.y - 6, c.w + 12, c.h + 12, { fill: D.C.orange, border: D.C.orange, b: 6, drop: false });
        D.panel(c.x, c.y, c.w, c.h, { fill: '#fff6ee', border: '#fff6ee', drop: false });
        const tw = D.small ? 82 : 66, th = D.small ? 48 : 40;     // (a phone's bigger type: a bigger tag)
        D.panel(c.x - 6, c.y - 6, tw, th, { fill: D.C.orange, border: D.C.orange, drop: false });   // corner tag inside the card
        D.txt('1P', c.x - 6 + tw / 2, c.y - 6 + th - 9, { size: 26, color: '#ffffff', align: 'center' });
      } else D.panel(c.x, c.y, c.w, c.h, { fill: 'rgba(238,241,248,0.95)', border: 'rgba(213,219,232,0.9)', drop: false });
      glow(c.x, c.y, c.w, c.h, 6, k);
      const nb = D.small ? 56 : 48;                                // (room under her for the name, bigger on a phone)
      const s = Math.max(2, Math.floor(Math.min(c.w * 0.82 / 40, (c.h - nb - 8) / 48)));
      D.spr(list[c.i].id + (blinkAt(o.t, c.i) ? '_blink' : ''), c.x + c.w / 2, c.y + c.h - nb, s, { alpha: sel || k > 0 ? 1 : 0.6 });
      D.txt(list[c.i].name, c.x + c.w / 2, c.y + c.h - 14, { size: 26, color: sel ? D.C.orange : D.C.muted, align: 'center' });
      g.restore();
    });
    const C = L.card, ch = list[o.sel];                            // the big preview: only the name
    D.panel(C.x, C.y, C.w, C.h, { fill: '#ffffff', border: D.C.border });
    D.txt(ch.name, C.x + C.w / 2, C.y + (D.P ? 110 : 130), { size: D.P ? 84 : 96, color: D.C.orange, align: 'center' });
    const nameY = C.y + (D.P ? 110 : 130), ps = Math.max(3, Math.min(9, Math.floor(Math.min((C.w - 80) / 40, (L.go.y - nameY - 110) / 48))));
    const by = Math.round((nameY + L.go.y) / 2 + 24 * ps), bob = Math.round(Math.abs(Math.sin(o.t * 3)) * -8);   // centred between the name and the button
    D.shadowEll(C.x + C.w / 2, by, 20 * ps * 0.55, 0.12);
    D.spr(ch.id + (blinkAt(o.t, o.sel) ? '_blink' : ''), C.x + C.w / 2, by + bob, ps);
    button(L.go, hk('go'), o.t, true);
    if (!o.touch) D.txt('← → ↑ ↓ 選擇　Enter 確定　Esc 返回', D.P ? W / 2 : L.gx, H - 24, { size: 24, color: D.C.muted, align: D.P ? 'center' : 'left' });
  }

  // ------------------------------------------------------------ title
  function title(o) {
    const W = D.W, H = D.H, P = D.P, t = o.t, g = D.ctx;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(245,247,252,0.88)'); gr.addColorStop(0.55, 'rgba(245,247,252,0.55)'); gr.addColorStop(1, 'rgba(245,247,252,0.15)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const cy = P ? H * 0.24 : H * 0.27, ts = P ? 104 : 132;
    D.txt('SKI DASH', W / 2, cy - ts * 0.95, { size: P ? 34 : 40, color: D.C.accent, align: 'center', ls: 16 });
    D.txt(TITLE, W / 2, cy, { size: ts, color: D.C.navy, align: 'center', shadow: '#f0a07a', stroke: ['#ffffff', 16] });
    const blink = 0.55 + 0.45 * Math.sin(t * 5);
    D.txt(o.touch ? '點一下開始' : '按任意鍵開始', W / 2, P ? H * 0.7 : H * 0.76, { size: P ? 64 : 60, color: D.C.fg, align: 'center', alpha: blink, stroke: ['#ffffff', 14] });
    const hy = P ? H - 360 : H - 150, hw = P ? W - 120 : 1180;
    D.panel(W / 2 - hw / 2, hy - 70, hw, P ? 220 : 120, { fill: 'rgba(255,255,255,0.92)', border: D.C.border });
    const lines = o.touch ? ['◀ ▶ 轉彎閃避　　JUMP 跳躍', 'DUCK 蹲下'] : ['← → 轉彎閃避　↑ 跳躍　↓ 蹲下', 'Esc 暫停　M 靜音'];
    if (P) lines.forEach((l, i) => D.txt(l, W / 2, hy + i * 64 + 4, { size: 40, color: D.C.muted, align: 'center' }));
    else D.txt(lines.join('　　'), W / 2, hy + 4, { size: 30, color: D.C.muted, align: 'center' });
    D.txt('音樂與音效：原創 8-bit　字型：Cubic 11', W - 24, H - 18, { size: 18, color: D.C.faint, align: 'right' });
  }

  // ------------------------------------------------------------ pause
  function pauseButtons() {
    const W = D.W, H = D.H, w = D.P ? 600 : 520, x = W / 2 - w / 2;
    return [{ id: 'resume', label: '繼續', x, y: H / 2 - 100, w, h: 110 }, { id: 'restart', label: '重新開始', x, y: H / 2 + 35, w, h: 110 },
      { id: 'home', label: '回到首頁', x, y: H / 2 + 170, w, h: 110 }];
  }
  function pause(touch, hk = NOHOVER, t = 0) {
    D.rect(0, 0, D.W, D.H, 'rgba(7,26,64,0.55)');
    D.txt('暫停', D.W / 2, D.H / 2 - 170, { size: 110, color: '#ffffff', align: 'center' });
    pauseButtons().forEach(b => button(b, hk(b.id), t, false));
    if (!touch) D.txt('↑ ↓ 選擇　Enter 確定　Esc 繼續', D.W / 2, D.H / 2 + 350, { size: 30, color: 'rgba(255,255,255,0.8)', align: 'center' });
  }

  // ------------------------------------------------------------ result
  function resultButtons() {                                        // landscape: side by side under the card; portrait: stacked
    const W = D.W, H = D.H;
    if (D.P) { const w = 640, x = W / 2 - w / 2; return [{ id: 'again', label: '再玩一次', x, y: H / 2 + 380, w, h: 112, main: true }, { id: 'home', label: '回到首頁', x, y: H / 2 + 520, w, h: 112 }]; }
    const w = 440, gap = 40;
    return [{ id: 'again', label: '再玩一次', x: W / 2 - w - gap / 2, y: 840, w, h: 112, main: true }, { id: 'home', label: '回到首頁', x: W / 2 + gap / 2, y: 840, w, h: 112 }];
  }
  function result(r, a, touch, hk = NOHOVER) {                                   // a: seconds since the result screen opened
    const W = D.W, H = D.H, P = D.P;
    D.rect(0, 0, W, H, 'rgba(7,26,64,0.45)');
    const pw = P ? W - 100 : 980, ph = P ? 900 : 740, px = W / 2 - pw / 2, py = P ? H / 2 - 600 : 50;
    const e = E.back(seg(a, 0, 0.3));
    D.ctx.save(); D.ctx.translate(W / 2, py + ph / 2); D.ctx.scale(e, e); D.ctx.translate(-W / 2, -(py + ph / 2));
    D.panel(px, py, pw, ph, { fill: '#ffffff', border: D.C.navy, b: 6 });
    D.panel(px, py, pw, 120, { fill: D.C.navy, border: D.C.navy, b: 6, drop: false });
    D.txt('成績', W / 2, py + 82, { size: 60, color: '#ffffff', align: 'center', ls: 8 });
    const rows = [
      ['抵達時間', fmtTime(r.time), `+${fmtInt(r.timePts)}`, 0.4],
      ['金幣', `${r.coins} / ${r.coinsTotal}`, `+${fmtInt(r.coinPts)}`, 0.9],
      ['跌倒', `${r.crashes} 次`, '', 1.4],
    ];
    const lx = px + 60, rx = px + pw - 60, ry0 = py + 210, rh = P ? 110 : 92, fs = P ? 46 : 40;
    rows.forEach(([lab, val, pts, t0], i) => {
      const al = seg(a, t0, t0 + 0.2); if (al <= 0) return;
      const y = ry0 + i * rh;
      D.txt(lab, lx, y, { size: fs, color: D.C.muted, alpha: al });
      D.txt(val, P ? rx - 230 : px + pw * 0.58, y, { size: fs, color: D.C.fg, align: 'right', alpha: al });
      if (pts) D.txt(pts, rx, y, { size: fs, color: D.C.accent, align: 'right', alpha: al });
    });
    const ty = ry0 + 3 * rh + 30, tAl = seg(a, 1.8, 2.0);
    if (tAl > 0) {
      D.rect(lx, ty - 70, rx - lx, 4, D.C.border, tAl);
      const shown = Math.round(r.total * E.out(seg(a, 2.0, 3.0)));
      D.txt('總分', lx, ty + 30, { size: fs, color: D.C.muted, alpha: tAl });
      D.txt(fmtInt(shown), P ? rx - 230 : px + pw * 0.58, ty + 40, { size: P ? 84 : 76, color: D.C.navy, align: 'right', alpha: tAl });
    }
    const rk = seg(a, 3.1, 3.4);
    if (rk > 0) {                                                  // the rank stamp
      const s = lerp(2.2, 1, E.out(rk)), cx = P ? rx - 110 : rx - 120, cy = ty + 6;
      D.ctx.save(); D.ctx.translate(cx, cy); D.ctx.rotate(-0.12); D.ctx.scale(s, s); D.ctx.globalAlpha *= rk;
      D.ctx.strokeStyle = RANK_COL[r.rank]; D.ctx.lineWidth = 10; D.ctx.beginPath(); D.ctx.arc(0, 0, 86, 0, 7); D.ctx.stroke();
      D.txt(r.rank, 0, 50, { size: 150, color: RANK_COL[r.rank], align: 'center', stroke: ['#ffffff', 6] });
      D.ctx.restore();
    }
    const by = ty + (P ? 170 : 130);
    if (a > 3.5) {
      if (r.newBest) D.txt('★ 新紀錄！ ★', W / 2, by, { size: P ? 54 : 48, color: D.C.orange, align: 'center', alpha: 0.6 + 0.4 * Math.sin(a * 6) });
      else D.txt(`最高分　${fmtInt(r.best)}`, W / 2, by, { size: P ? 44 : 38, color: D.C.muted, align: 'center' });
    }
    D.ctx.restore();
    if (a > 3.6) {
      const bs = resultButtons();
      bs.forEach(b => button(b, hk(b.id), a, !!b.main));
      if (!touch) D.txt('← → 選擇　Enter 確定　Esc 回到首頁', W / 2, bs[bs.length - 1].y + 156, { size: 28, color: 'rgba(255,255,255,0.85)', align: 'center' });
    }
  }

  function loading(p) {
    D.rect(0, 0, D.W, D.H, D.C.bg);
    D.txt('載入中…', D.W / 2, D.H / 2, { size: 48, color: D.C.muted, align: 'center' });
    D.rect(D.W / 2 - 200, D.H / 2 + 40, 400 * p, 10, D.C.orange);
  }

  root.SkiHud = { WORDS, letterbox, layout, mapLayout, mapSelect, selectLayout, select, play, pads, popups, intro, countdown, resumeCount, title, pause, pauseButtons, result, resultButtons, loading, TITLE };
})(typeof window !== 'undefined' ? window : globalThis);

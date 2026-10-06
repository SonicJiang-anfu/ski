'use strict';
// Drawing primitives, ported from the trailer (video.html): a tiny 3D camera + polygon projection, pixel text,
// sprites, notched panels and the dark glass buttons. Everything draws into D.ctx in logical pixels (D.W × D.H).
(function (root) {
  const { lerp, rng } = root.SkiCore;
  const PX = "'Cubic11'";
  const C = {                                                   // site light-theme colours (trailer palette)
    bg: '#f5f7fc', fg: '#0a1428', muted: '#4a5e8a', faint: '#8090b8', accent: '#c03a08', orange: '#f05416',
    navy: '#0d3170', navyDeep: '#071a40', border: '#d5dbe8', gold: '#f7c531',
  };
  const D = { ctx: null, W: 1920, H: 1080, P: false, PX, C, IMG: {}, bend: 0 };   // (bend: the world's picture curls up ahead by this × distance², down if < 0)

  D.rect = (x, y, w, h, c, a = 1) => {
    const g = D.ctx; if (a !== 1) { const ga = g.globalAlpha; g.globalAlpha = ga * a; g.fillStyle = c; g.fillRect(x, y, w, h); g.globalAlpha = ga; return; }
    g.fillStyle = c; g.fillRect(x, y, w, h);
  };
  // on a small screen (a phone: under half a pixel to a unit of the stage) no type smaller than MIN_TXT, about 12 px there
  D.small = false; D.MIN_TXT = 34;
  D.txt = (s, x, y, o = {}) => {
    const { size: size0 = 48, color = C.fg, align = 'left', base = 'alphabetic', shadow = null, alpha = 1, ls = 0, stroke = null } = o;
    const size = D.small ? Math.max(size0, D.MIN_TXT) : size0;
    const g = D.ctx; g.save(); g.globalAlpha *= alpha;
    g.font = `${size}px ${PX}`; g.textAlign = align; g.textBaseline = base;
    if ('letterSpacing' in g) g.letterSpacing = ls + 'px';
    if (stroke) { g.lineWidth = stroke[1]; g.strokeStyle = stroke[0]; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    if (shadow) { g.fillStyle = shadow; const o2 = Math.max(3, Math.round(size / 16)); g.fillText(s, x + o2, y + o2); }
    g.fillStyle = color; g.fillText(s, x, y);
    g.restore();
  };
  D.measure = (s, size, ls = 0) => {
    const g = D.ctx; g.save(); g.font = `${D.small ? Math.max(size, D.MIN_TXT) : size}px ${PX}`; if ('letterSpacing' in g) g.letterSpacing = ls + 'px';   // (as D.txt draws it)
    const w = g.measureText(s).width; g.restore(); return w;
  };
  D.panel = (x, y, w, h, o = {}) => {                            // pixel panel with notched corners + soft drop shadow
    const { fill = '#ffffff', border = C.border, b = 4, alpha = 1, drop = true } = o;
    const g = D.ctx; g.save(); g.globalAlpha *= alpha;
    if (drop) { g.fillStyle = 'rgba(13,49,112,0.10)'; g.fillRect(x + b + 6, y + 10, w - 2 * b, h); }
    g.fillStyle = border; g.fillRect(x + b, y, w - 2 * b, h); g.fillRect(x, y + b, w, h - 2 * b);
    g.fillStyle = fill; g.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
    g.restore();
  };

  // ------------------------------------------------------------ sprites
  D.loadImg = (name, src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { D.IMG[name] = im; res(); }; im.onerror = rej; im.src = src; });
  D.spr = (id, cx, by, s, o = {}) => {                           // bottom-centre anchored, nearest-neighbour
    const { flip = false, alpha = 1, rot = 0, sq = 1 } = o;
    const im = D.IMG[id]; if (!im) return;
    const w = im.width * s, h = im.height * s, g = D.ctx;
    g.save(); g.globalAlpha *= alpha; g.imageSmoothingEnabled = false;
    g.translate(Math.round(cx), Math.round(by)); if (rot) g.rotate(rot); g.scale(flip ? -1 : 1, sq);
    g.drawImage(im, -w / 2, -h, w, h);
    g.restore();
  };
  D.shadowEll = (cx, y, rx, a = 0.16) => {
    const g = D.ctx; g.save(); g.globalAlpha *= a; g.fillStyle = C.navyDeep;
    g.beginPath(); g.ellipse(cx, y, rx, rx * 0.2, 0, 0, Math.PI * 2); g.fill(); g.restore();
  };
  // pixel art from strings: one char per cell, '.' empty; cells of size cs, bottom-centre at (cx, by)
  D.pix = (rows, cols, cx, by, cs, alpha = 1) => {
    const g = D.ctx, n = rows.length, w = rows[0].length, ga = g.globalAlpha;
    g.globalAlpha = ga * alpha;
    for (let r = 0; r < n; r++) { const row = rows[r]; for (let c = 0; c < w; c++) { const ch = row[c]; if (ch === '.') continue;
      g.fillStyle = cols[ch]; g.fillRect(Math.floor(cx + (c - w / 2) * cs), Math.floor(by - (n - r) * cs), Math.ceil(cs) + 1, Math.ceil(cs) + 1); } }
    g.globalAlpha = ga;
  };

  // ------------------------------------------------------------ sky decoration
  D.cloud = (x, y, s, a = 1) => {
    const g = D.ctx, ga = g.globalAlpha; g.globalAlpha = ga * a;
    const px = [[2, 0, 4, 1], [1, 1, 7, 1], [0, 2, 10, 2]];
    g.fillStyle = C.border; px.forEach(([cx, cy, w, h]) => g.fillRect(x + cx * s - s * 0.5, y + cy * s + s * 0.5, w * s + s, h * s));
    g.fillStyle = '#ffffff'; px.forEach(([cx, cy, w, h]) => g.fillRect(x + cx * s, y + cy * s, w * s, h * s));
    g.globalAlpha = ga;
  };
  D.clouds = (t, seed, n, yMax, a = 1, shift = 0) => {
    const r = rng(seed), W = D.W;
    for (let i = 0; i < n; i++) {
      const s = 10 + Math.floor(r() * 3) * 4, sp = 12 + r() * 20;
      const x = ((((r() * (W + 400) + t * sp + shift) % (W + 400)) + W + 400) % (W + 400)) - 200;
      D.cloud(Math.round(x / 4) * 4, Math.round((60 + r() * yMax) / 4) * 4, s, a);
    }
  };

  // ------------------------------------------------------------ 3D: camera looking at target tg from distance D
  D.makeCam = (tg, dist, pitch, yaw, F, cy) => {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const f = [syw * cp, -sp, cyw * cp], r = [cyw, 0, -syw];
    const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    return { f, r, u, C: [tg[0] - dist * f[0], tg[1] - dist * f[1], tg[2] - dist * f[2]], F, cy, pitch, yaw };
  };
  D.toCam = (cam, p) => {
    const dx = p[0] - cam.C[0], dy = p[1] - cam.C[1], dz = p[2] - cam.C[2], r = cam.r, u = cam.u, f = cam.f;
    const d = dx * f[0] + dy * f[1] + dz * f[2];
    return [dx * r[0] + dy * r[1] + dz * r[2], dx * u[0] + dy * u[1] + dz * u[2] + D.bend * d * Math.abs(d), d];
  };
  D.scr = (cam, q) => [D.W / 2 + cam.F * q[0] / q[2], cam.cy - cam.F * q[1] / q[2]];
  const NEAR = 0.3, QA = [], OUT = [];
  // filled polygon with near-plane clipping; `normal` culls faces turned away from the camera; returns screen points
  D.poly3 = (cam, pts, col, alpha = 1, normal = null) => {
    const n = pts.length;
    if (normal) {
      let cx = 0, cy = 0, cz = 0; for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
      if (normal[0] * (cam.C[0] - cx / n) + normal[1] * (cam.C[1] - cy / n) + normal[2] * (cam.C[2] - cz / n) <= 0) return null;
    }
    QA.length = 0; OUT.length = 0;
    for (let i = 0; i < n; i++) QA.push(D.toCam(cam, pts[i]));
    for (let i = 0; i < n; i++) {
      const a = QA[i], b = QA[(i + 1) % n], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) OUT.push(a);
      if (ain !== bin) { const k = (NEAR - a[2]) / (b[2] - a[2]); OUT.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
    }
    if (OUT.length < 3) return null;
    const g = D.ctx, W2 = D.W / 2, F = cam.F, cy = cam.cy, s = [];
    g.beginPath();
    for (let i = 0; i < OUT.length; i++) {
      const q = OUT[i], x = W2 + F * q[0] / q[2], y = cy - F * q[1] / q[2]; s.push([x, y]);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath(); g.fillStyle = col;
    if (alpha !== 1) { const ga = g.globalAlpha; g.globalAlpha = ga * alpha; g.fill(); g.globalAlpha = ga; } else g.fill();
    return s;
  };
  D.box3 = (cam, x0, x1, y0, y1, z0, z1, cols) => {
    D.poly3(cam, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], cols.side, 1, [-1, 0, 0]);
    D.poly3(cam, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], cols.side, 1, [1, 0, 0]);
    D.poly3(cam, [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], cols.rear, 1, [0, 0, -1]);
    D.poly3(cam, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], cols.front || cols.rear, 1, [0, 0, 1]);
    D.poly3(cam, [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], cols.top, 1, [0, 1, 0]);
  };

  // ------------------------------------------------------------ glass UI (touch buttons, HUD plates)
  const GLASS = 'rgba(12,22,44,0.46)';
  D.glassRR = (x, y, w, h, r) => {
    const g = D.ctx;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 16; g.shadowOffsetY = 4;
    g.fillStyle = GLASS; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.restore();
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.roundRect(x + 1, y + 1, w - 2, h - 2, r); g.stroke();
  };
  D.glassCircle = (cx, cy, r) => D.glassRR(cx - r, cy - r, r * 2, r * 2, r);
  D.touchRipple = (fx, fy, r, since) => {
    const g = D.ctx; g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(fx, fy, r, 0, 7); g.fill();
    for (let k = 0; k < 2; k++) {
      const ph = (since * 1.4 + k * 0.5) % 1;
      g.save(); g.globalAlpha *= 0.65 * (1 - ph); g.lineWidth = 4; g.strokeStyle = '#ffffff';
      g.beginPath(); g.arc(fx, fy, r + ph * 60, 0, 7); g.stroke(); g.restore();
    }
  };
  // glass button; pressed = sinks, glows orange, finger ripple
  D.pad = (cx, cy, r, drawIcon, press, since) => {
    const g = D.ctx, s = 1 - 0.08 * press;
    g.save(); g.translate(cx, cy + 6 * press); g.scale(s, s);
    D.glassCircle(0, 0, r);
    if (press > 0) {
      g.save(); g.globalAlpha *= press; g.shadowColor = 'rgba(255,122,26,0.95)'; g.shadowBlur = 36;
      g.fillStyle = 'rgba(240,84,22,0.82)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      g.shadowBlur = 0; g.lineWidth = 6; g.strokeStyle = '#ffb02e'; g.beginPath(); g.arc(0, 0, r - 3, 0, 7); g.stroke(); g.restore();
    }
    drawIcon();
    if (press > 0.5) D.touchRipple(0, 0, 30, since);
    g.restore();
  };

  root.SkiDraw = D;
})(typeof window !== 'undefined' ? window : globalThis);

'use strict';
// The 3D world engine, drawn like the trailer's STAGE 05: a low chase camera behind the skier, depth-sorted pieces,
// near-plane clipping. Each map brings a theme (js/maps/<id>.js) that paints its sky, its course surface, scenery,
// obstacles and gates; this file owns the camera, coins, kickers, boost pads, the finish line, her tracks, the
// skier herself, particles and speed lines (and lanes of fast water, course.flows).
//
// theme = { spray: [cols], trail, ski: [base, shine, tip], kicker: {side, top, edge}, boost: {pad, glow, arrow}, flow: {lane, edge, mark},
//           sky(R), ground?(R, za, zb, near), slice(R, za, zb, near), scenery(R), gate(R, z, i, label),
//           obstacle(R, o, i), weather(R, speed) }   (ground: what lies under a raised course, drawn before the rest)
// R (per frame) = { cam, roll (how far the camera has rolled on a twisted track: sky(R) turns its picture by it), WF (like W3, but never
//                   turned with a twisted track: for what stands fixed in the world round it), CO, t, rt (race time: where moving obstacles are), zc, lo, hi, hz, pan, add(z, fn, slope), P3, S3, W3, wx,
//                   billboard, near(z) }   (W3(z, x, y): a course point at height y in the world; with a loop, use only these)
(function (root) {
  const { clamp, seg, lerp, rng, E, obZ } = root.SkiCore;
  const D = root.SkiDraw, K = root.SkiPhysics.K;

  const DRAW = 125, SL = 2;                                    // draw distance, slice length
  const SKI_X = [-0.16, 0.13];                                 // the two skis, across from her centre (her tracks follow them)
  let CO = null, TH = null, SPRAY = ['#ffffff', '#c6d8f2'], SIDE = 0;   // (SIDE: how far the chase camera has turned to a side view)
  const wx = (z, x) => CO.centerX(z) + x + (CO.loop ? CO.shiftX(z) : 0);   // course frame → world x
  const W3 = (z, x, y) => (CO.bent ? CO.world(z, x, y) : [wx(z, x), y, z]);   // at height y (round a loop, rolled up with it; on a twisted track, turned with it)
  const P3 = (z, x, up = 0) => W3(z, x, CO.height(z) + up);    // `up` above the centre line's height
  const S3 = (z, x, up = 0) => W3(z, x, CO.surf(z, x) + up);   // `up` above the riding surface at x

  const COIN = { cs: 0.1, rows: ['..OOOO..', '.OYYYYO.', 'OYWYYDYO', 'OYWYYDYO', 'OYYYYDYO', 'OYYYYDYO', '.OYDDYO.', '..OOOO..'],
    cols: { O: '#b8740f', Y: '#f7c531', W: '#fff3b0', D: '#e09a1a' }, shadow: false };
  const CART_DEF = { body: '#7a5a3a', dark: '#2a2018', band: '#9aa3b4', rim: '#4a4f5c', wheel: '#2a2a2e' };
  const SKI_DEF = ['#f05416', '#ff965a', '#d8480f'], KICK_DEF = { side: '#c4d3ea', top: '#e3edfb', edge: '#f05416' };

  // ------------------------------------------------------------ chase camera (low, behind her; turns with the course)
  function newCam() { return { tx: 0, ty: 0, yaw: 0, vk: 0, snap: true }; }
  function chase(cs, s, dt) {
    CO = s.course; SIDE = CO.sideK ? E.inOut(CO.sideK(s.z)) : 0;
    const snap = cs.snap;
    const tz = s.z + 2 - (CO.backK ? 6 * CO.backK(s.z) : 0);   // (riding backwards it looks back up the course past her: her low in the picture, the mirror over her)
    // up in the air the camera rises only half as far with her, so a hop does not bob the view. It measures from
    // the line she took off along (the slope carried on from there), not from the ground under her: off a drop the
    // ground falls away at once, and a camera riding it would sink, so she would seem to hop up before falling;
    // below that line it simply goes down with her. (A tumble, or a fall off an edge, keeps to the ground.)
    if (s.air && !cs.air) { cs.toZ = s.z; cs.toY = s.y; cs.toG = CO.grade(s.z - 1.5); }
    cs.air = s.air;
    const flying = s.air && s.mode === 'ride', lineAt = z => cs.toY - cs.toG * (z - cs.toZ);
    const gnd = CO.ground(s.z, s.x), line = flying ? Math.max(gnd, lineAt(s.z)) : gnd;
    const up = Math.max(0, s.y - line), base = Math.min(line, s.y), lift = up < 3 ? up * 0.55 : 1.65 + (up - 3) * 0.97;   // (thrown high into the air it goes up with her)
    const LF = (z, x) => (CO.liftAt ? CO.liftAt(z, x) : 0), lf = LF(s.z, s.x);   // up or down one side of a fork
    const med = CO.medianAt ? CO.medianAt(tz) : 0;
    let follow = lerp(D.P ? 0.85 : 0.6, 0.92, seg(med, 0.5, 3));   // down one side of a fork it keeps behind her
    const ck = CO.cloneK ? CO.cloneK(s.z) : 0;                   // (among her copies it keeps to the middle of the course, not to her: which one is she?)
    if (s.mode !== 'done' && !(CO.camYaw && CO.camYaw(s.z))) {   // and where the eye would go through something standing tall that she rides past, it moves in right behind her first
      const ez = tz - 6.8 * Math.cos(cs.yaw), z1 = ez + Math.max(4, s.v * 0.45), ex = CO.centerX(tz) + s.x * follow - 6.8 * Math.sin(cs.yaw) - CO.centerX(ez);
      for (const o of CO.obstacles) {
        if (o.z > z1 + 8) break;
        if (o.hole || o.y0 !== undefined || o.h < 2.5) continue;
        const oz = root.SkiCore.obZ(o, s.z);
        if (oz + o.hd > ez - 1 && oz - o.hd < z1 && Math.abs(ex - root.SkiCore.obX(o, s.t)) < o.hw + 0.8 + (o.move ? o.move.amp : 0)) { follow = 0.98; break; }
      }
    }
    if (ck > 0) follow *= 1 - ck;
    if (CO.tubeK) follow *= 1 - CO.tubeK(s.z);                   // (in a tube it keeps to the middle and turns round with her instead: tubeCam)
    const tx = CO.centerX(tz) + s.x * follow,   // the narrow portrait view follows her further across
      ty = base - 0.5 * (CO.surf(s.z, s.x) - CO.height(s.z) - lf) + 0.8 + lift, yaw = CO.heading(s.z + 4) * 0.9;   // half way up a trough wall with her
    const k = cs.snap ? 1 : 1 - Math.exp(-dt * 7), ky = up > 3 ? 30 : 10;   // (thrown high, it keeps up with her: lagging behind it would lose her off the top)
    cs.tx += (tx - cs.tx) * k; cs.ty += (ty - cs.ty) * (cs.snap ? 1 : 1 - Math.exp(-dt * ky)); cs.yaw += (yaw - cs.yaw) * (cs.snap ? 1 : 1 - Math.exp(-dt * 3));
    cs.snap = false;
    // higher and further back than the trailer: downhill, what lies ahead sits lower on screen, so the eye has to be
    // well above her for the course ahead to show over her head instead of behind her
    const Dlk = 7, EYE = 4.8;
    let pitch = 0.15;
    for (let it = 0; it < 3; it++) {
      const ez = tz - Dlk * Math.cos(pitch) * Math.cos(cs.yaw);
      let snow = -1e9; for (let dz = -1; dz <= 1; dz += 0.5) snow = Math.max(snow, CO.height(ez + dz) + LF(ez + dz, s.x));
      if (flying && ez > cs.toZ) snow = Math.max(snow, lineAt(ez));   // (once the eye is out over a drop too, it keeps to the line she flew off along)
      let crest = -1e9; for (let k2 = 0; k2 <= 10; k2 += 1) crest = Math.max(crest, CO.height(s.z + k2) + LF(s.z + k2, s.x));
      const eyeY = Math.max(snow + EYE, crest + 0.6, cs.ty - 0.8 + 0.6);
      pitch = clamp(Math.atan2(eyeY - cs.ty, Dlk * Math.cos(pitch)), -0.15, 0.45);
    }
    if (CO.camTilt) pitch -= CO.camTilt(tz);                     // (a course can have it look higher for a while)
    cs.pitch = snap || cs.pitch === undefined ? pitch : cs.pitch + (pitch - cs.pitch) * (1 - Math.exp(-dt * 8));   // tilting smoothly, never with a jolt
    pitch = cs.pitch;
    // portrait: zoom in and lower the horizon so the tall screen shows the course ahead, not empty sky
    cs.punch = Math.max(0, (cs.punch || 0) - dt * 1.6);
    const F = (D.P ? 640 : 450) * (1 - 0.22 * E.out(cs.punch));   // (a punch: wider for a moment, as she is thrown)
    // down a sheer face (course.vert) the camera swings over to look straight down it from above her, wider, so
    // the drop rushes up at her; it swings back at the bottom
    const vw = CO.vertAt && (CO.vertAt(s.z) || CO.vertAt(s.z + 1.5)) ? 1 : 0;
    cs.vk = snap ? vw : cs.vk + (vw - cs.vk) * (1 - Math.exp(-dt * (vw ? 7 : 4)));
    if (cs.vk > 0.002) {
      const k = E.inOut(clamp(cs.vk)), g = CO.grade(s.z + 0.8), ang = Math.atan(g);
      const t = [0, -Math.sin(ang), Math.cos(ang)], n = [0, Math.cos(ang), Math.sin(ang)], B = [wx(s.z, s.x * 0.5), s.y, s.z];
      const tg = [0, 1, 2].map(i => B[i] + n[i] * 3.2 + t[i] * 1), T0 = [cs.tx, cs.ty, tz];   // straight above her, out from the face: the face runs down the bottom of the screen, the pool rushes up in the middle
      return D.makeCam(T0.map((v, i) => lerp(v, tg[i], k)), lerp(Dlk, 8, k), lerp(pitch, 1.52, k), cs.yaw * (1 - k), F * (1 - 0.22 * k), (D.P ? 0.44 : 0.5) * D.H);
    }
    const swing = CO.camYaw ? CO.camYaw(s.z) : 0;                // (a course can swing the camera round her for a while: a three-quarter view)
    const sk = CO.sideK ? E.inOut(CO.sideK(s.z)) : 0;
    if (sk > 0.001) {                                            // inside a video game: seen from the side, from far off through a long lens, like a 2D platformer
      const gy = CO.height(s.z) + 1.6, want = Math.max(gy, s.y - 1.2);   // (it follows the ground, and her only when she goes high)
      cs.sideY = cs.snap || cs.sideY === undefined ? want : cs.sideY + (want - cs.sideY) * (1 - Math.exp(-dt * (want > cs.sideY ? 6 : 3)));
      const TS = [wx(s.z + 8, 0), cs.sideY, s.z + 8], Tn = [cs.tx, cs.ty, tz];
      const cam = D.makeCam(Tn.map((v, i) => lerp(v, TS[i], sk)), lerp(Dlk, 42, sk), lerp(pitch, 0.04, sk), lerp(cs.yaw + swing, CO.heading(s.z) - Math.PI / 2, sk), lerp(F, D.P ? 1650 : 1900, sk), (D.P ? 0.44 : 0.5) * D.H);
      cam.cz = s.z - 6 * sk + (cam.C[2] - (s.z - 6 * sk)) * (1 - sk); cam.back = false; cam.side = sk;
      return cam;
    }
    const T = [cs.tx + (CO.loop ? CO.shiftX(tz) : 0), cs.ty, CO.loop ? CO.worldZ(tz) : tz], cy = (D.P ? 0.44 : 0.5) * D.H;
    const L = CO.loop, lk = L ? E.inOut(seg(s.z, L.z0 - 16, L.z0)) * (1 - E.inOut(seg(s.z, L.z1 - 4, L.z1 + 12))) : 0;
    if (lk > 0.001) {                                            // round a loop it rides round with her, a little behind and above, turning over with her
      const lz = s.z + 2, u = CO.loopAt(lz), th = u === null ? 0 : 2 * Math.PI * (u > 0.5 ? u - 1 : u);
      const TL = CO.world(lz, s.x * 0.7, CO.height(lz) + 1.0), tg = T.map((v, i) => lerp(v, TL[i], lk));
      const cam = D.makeCam(tg, lerp(Dlk, 6, lk), lerp(pitch, 0.34 - th, lk), (cs.yaw + swing) * (1 - lk), F, cy);
      cam.cz = s.z - 4; cam.back = false;
      return cam;
    }
    const pk = CO.pageK ? CO.pageK(s.z) : 0;
    PAGEK = pk;
    if (pk > 0.001) return pageCam(cs, s, T, pitch, swing, F, cy, pk);
    const tk = CO.topK ? E.inOut(CO.topK(s.z)) : 0;
    if (tk > 0.001) {                                            // a plan seen from above: the camera rises to look straight down on her, a little ahead
      const za = s.z + 6, TT = W3(za, s.x * 0.85, CO.surf(za, s.x)), cam = D.makeCam(T.map((v, i) => lerp(v, TT[i], tk)), lerp(Dlk, 14, tk), lerp(pitch, 1.3, tk), cs.yaw + swing, F, cy);
      cam.cz = cam.C[2]; cam.back = false; cam.top = tk;
      return cam;
    }
    const cam = D.makeCam(T, Dlk, pitch, cs.yaw + swing, F, cy);
    cam.cz = cam.C[2] + (tz - T[2]); cam.back = Math.abs(swing) > 1.2 ? undefined : false;   // (where along the course it is; swung right round, it looks back up the course)
    if (CO.twistAt) twistCam(cam, tz);
    if (CO.curvAt) tubeCam(cam, s);
    return cam;
  }
  // a web page (course.page): the camera rises over her to look square down on the page, then turns right round, so the
  // page reads the right way up and she comes down the screen, as anyone scrolls down a page. Square on to the slope and
  // far off through a long lens, so the page lies flat on the screen, PAGE_W across it as wide as the screen (the page in
  // js/site.js is laid out to that); in the middle across, a little ahead of her down the screen. (pitch and yaw cannot
  // turn it about the slope's own up, so it turns about the straight up: the page shows only once it is round)
  const PAGE_W = 21;
  let PAGEK = 0;
  function pageCam(cs, s, T, pitch, swing, F, cy, pk) {
    const k = clamp(pk), up = E.inOut(seg(k, 0, 0.5)), turn = E.inOut(seg(k, 0.5, 1));
    const visH = PAGE_W * D.H / D.W, za = s.z + visH * (D.P ? 0.25 : 0.2), a = Math.atan(CO.grade(za)), dist = 40;
    const TP = W3(za, 0, CO.surf(za, 0)), pitchP = lerp(Math.PI / 2 + a, Math.PI / 2 - a, turn);
    const cam = D.makeCam(T.map((v, i) => lerp(v, TP[i], up)), lerp(7, dist, up), lerp(pitch, pitchP, up), lerp(cs.yaw + swing, 0, up) + Math.PI * turn, lerp(F, D.W * dist / PAGE_W, up), lerp(cy, D.H / 2, up));
    cam.cz = za; cam.back = false; cam.top = up; cam.page = turn;
    return cam;
  }
  // on a twisted track (course.twistAt) the camera turns with the track about its line, so the track stays under her
  // and the world turns round them both; its yaw and pitch are then read back from where it looks, and how far it has
  // rolled is kept for the sky (cam.roll: the picture of an unrolled camera turned by that much about the screen centre)
  function twistCam(cam, z) {
    const th = CO.twistAt(z);
    cam.roll = 0;
    if (!th) return;
    const { A, k } = CO.twistFrame(z), rot = v => root.SkiCore.rotAxis(v, k, th);
    const c = rot([cam.C[0] - A[0], cam.C[1] - A[1], cam.C[2] - A[2]]);
    cam.C = [c[0] + A[0], c[1] + A[1], c[2] + A[2]]; cam.f = rot(cam.f); cam.r = rot(cam.r); cam.u = rot(cam.u);
    const f = cam.f, yaw = Math.atan2(f[0], f[2]), r0 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const u0 = [f[1] * r0[2] - f[2] * r0[1], f[2] * r0[0] - f[0] * r0[2], f[0] * r0[1] - f[1] * r0[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    cam.yaw = yaw; cam.pitch = Math.asin(clamp(-f[1], -1, 1)); cam.roll = Math.atan2(dot(cam.r, u0), dot(cam.r, r0));
  }

  // in a tube (course.tube) the camera turns round the tube's line with her, so she is always at the bottom and the tube
  // turns round them both
  function tubeCam(cam, s) {
    const k = CO.curvAt(s.z);
    if (!(k > 1e-5)) return;
    const th = k * s.x, A = [CO.centerX(s.z), CO.height(s.z) + 1 / k], c = Math.cos(th), sn = Math.sin(th), rot = v => [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2]];
    const p = rot([cam.C[0] - A[0], cam.C[1] - A[1], 0]);
    cam.C = [p[0] + A[0], p[1] + A[1], cam.C[2]]; cam.f = rot(cam.f); cam.r = rot(cam.r); cam.u = rot(cam.u);
    const f = cam.f, yaw = Math.atan2(f[0], f[2]), r0 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const u0 = [f[1] * r0[2] - f[2] * r0[1], f[2] * r0[0] - f[0] * r0[2], f[0] * r0[1] - f[1] * r0[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    cam.yaw = yaw; cam.pitch = Math.asin(clamp(-f[1], -1, 1)); cam.roll = Math.atan2(dot(cam.r, u0), dot(cam.r, r0));
  }

  // finish shot (racing-game style): a camera out in front of her, looking back as she comes through the GOAL arch,
  // swinging round from ahead-right to her side; k: 0..1 over the shot
  function finishCam(s, k) {
    CO = s.course;
    const T = W3(s.z, s.x, s.y + 1.0), hd = CO.heading(s.z), dz = s.z - T[2];   // (dz: past a loop the world sits nearer than the course)
    const ang = lerp(0.3, 1.2, E.inOut(k)), dist = lerp(8.5, 6.5, E.inOut(k));
    const fw = [Math.sin(hd), Math.cos(hd)], rt = [Math.cos(hd), -Math.sin(hd)];
    const cx = T[0] + dist * (Math.cos(ang) * fw[0] + Math.sin(ang) * rt[0]), cz = T[2] + dist * (Math.cos(ang) * fw[1] + Math.sin(ang) * rt[1]);
    const cy = Math.max(CO.height(cz + dz) + 1.5, T[1] + 0.3);
    const d = [T[0] - cx, T[1] - cy, T[2] - cz], h = Math.hypot(d[0], d[2]);
    const cam = D.makeCam(T, Math.hypot(h, d[1]), Math.atan2(-d[1], h), Math.atan2(d[0], d[2]), D.P ? 1150 : 900, (D.P ? 0.55 : 0.58) * D.H);
    cam.cz = cam.C[2] + dz;
    return cam;
  }

  // ------------------------------------------------------------ screen-space particles (spray, sparkles, stars)
  const parts = [];
  function puff(x, y, n, o = {}) {
    const { spread = 1, up = 1, dir = 0, cols = null, size = 18, life = 0.5, grav = 1500 } = o;
    const cl = cols || SPRAY, sh = !cols;                       // spray (the theme's colours) gets a soft shadow so white reads on white
    for (let i = 0; i < n && parts.length < 400; i++) {
      const sd = dir || (Math.random() < 0.5 ? -1 : 1);
      parts.push({ x, y, vx: sd * (120 + Math.random() * 520) * spread, vy: -(200 + Math.random() * 420) * up, g: grav,
        s: size * (0.6 + Math.random() * 0.8), c: cl[(Math.random() * cl.length) | 0], sh, t: 0, life: life * (0.6 + Math.random() * 0.6) });
    }
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  function drawParts() {
    const g = D.ctx;
    for (const p of parts) {
      const a = 1 - p.t / p.life, sz = Math.max(4, Math.round(p.s * (1 - 0.5 * p.t / p.life) / 4) * 4);
      if (p.sh) D.rect(p.x - sz / 2 + 4, p.y - sz / 2 + 4, sz, sz, '#7f9cc8', a * 0.4);
      g.globalAlpha = a; g.fillStyle = p.c; g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz); g.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ shared pieces
  // flat pixel-art billboard facing the camera, standing on the surface at (z, x); art = { cs, rows, cols, shadow }
  function billboard(cam, art, z, x, up, alpha = 1, squeeze = 1, sh = null) {   // sh: moved by [dx, dy, dz]
    const p = S3(z, x, up); if (sh) { p[0] += sh[0]; p[1] += sh[1]; p[2] += sh[2]; }
    const q = D.toCam(cam, p);
    if (q[2] < 0.6) return null;
    const [sx, sy] = D.scr(cam, q), k = cam.F / q[2], cs = art.cs * k, w = art.rows[0].length;
    if (art.shadow !== false) { const ga = D.ctx.globalAlpha; D.ctx.globalAlpha = ga * alpha * 0.18; D.ctx.fillStyle = 'rgb(60,80,120)'; D.ctx.beginPath(); D.ctx.ellipse(sx, sy, w * cs * 0.45, w * cs * 0.12, 0, 0, 7); D.ctx.fill(); D.ctx.globalAlpha = ga; }
    if (squeeze !== 1) { D.ctx.save(); D.ctx.translate(sx, 0); D.ctx.scale(squeeze, 1); D.pix(art.rows, art.cols, 0, sy, cs, alpha); D.ctx.restore(); }
    else D.pix(art.rows, art.cols, sx, sy, cs, alpha);
    return [sx, sy, k];
  }
  function kicker(cam, r) {
    const n = 4, { side, top: TOPC, edge: EDGE } = TH.kicker || KICK_DEF;
    for (let k = 0; k < n; k++) {
      const za = r.z + r.len * k / n, zb = r.z + r.len * (k + 1) / n, ya = r.rise * k / n, yb = r.rise * (k + 1) / n;
      const ha = CO.height(za), hb = CO.height(zb);
      const p = (z, x, h, up) => W3(z, x, h + up);
      D.poly3(cam, [p(za, r.x - r.hw, ha, 0), p(zb, r.x - r.hw, hb, 0), p(zb, r.x - r.hw, hb, yb), p(za, r.x - r.hw, ha, ya)], side);
      D.poly3(cam, [p(za, r.x + r.hw, ha, 0), p(zb, r.x + r.hw, hb, 0), p(zb, r.x + r.hw, hb, yb), p(za, r.x + r.hw, ha, ya)], side);
      D.poly3(cam, [p(za, r.x - r.hw, ha, ya), p(za, r.x + r.hw, ha, ya), p(zb, r.x + r.hw, hb, yb), p(zb, r.x - r.hw, hb, yb)], TOPC);
      [r.x - r.hw, r.x + r.hw - 0.35].forEach(x => D.poly3(cam, [p(za, x, ha, ya + 0.01), p(za, x + 0.35, ha, ya + 0.01), p(zb, x + 0.35, hb, yb + 0.01), p(zb, x, hb, yb + 0.01)], EDGE));
      if (k % 2 === 1) {                                            // chevrons up the ramp
        const zc = (za + zb) / 2, hc = CO.height(zc), yc = (ya + yb) / 2 + 0.02;
        D.poly3(cam, [p(zc - 0.6, r.x - 1, hc, yc - 0.1), p(zc + 0.3, r.x, hc, yc + 0.05), p(zc - 0.6, r.x + 1, hc, yc - 0.1), p(zc - 0.2, r.x, hc, yc - 0.03)], EDGE);
      }
    }
  }
  // boost pad: a glowing, pulsing strip with white edges and fat arrows streaming forward (only the part inside
  // slice [za, zb])
  function boostPad(cam, b, za, zb, t) {
    const z0 = Math.max(za, b.z), z1 = Math.min(zb, b.z + b.len);
    if (z1 <= z0) return;
    const col = TH.boost || { pad: '#2fd4ff', glow: '#9ff4ff', arrow: '#ffffff' };
    const q = (x0, x1, up, c, a = 1) => D.poly3(cam, [S3(z0, x0, up), S3(z0, x1, up), S3(z1, x1, up), S3(z1, x0, up)], c, a);
    q(b.x - b.hw - 0.5, b.x + b.hw + 0.5, 0.015, col.glow || col.pad, 0.45);   // a halo round it
    q(b.x - b.hw, b.x + b.hw, 0.02, col.pad);
    q(b.x - b.hw, b.x + b.hw, 0.021, '#ffffff', 0.18 + 0.18 * Math.sin(t * 12));   // pulse
    q(b.x - b.hw, b.x - b.hw + 0.18, 0.025, '#ffffff'); q(b.x + b.hw - 0.18, b.x + b.hw, 0.025, '#ffffff');
    const gap = 1.5, len = 1.0, th = 0.6, ph = (t * 9) % gap;
    for (let z = b.z + ph - gap; z < b.z + b.len; z += gap) {
      const a = Math.max(z0, z), c = Math.min(z1, z + len);
      if (c <= a) continue;
      const w = b.hw * 0.85, tip = (zz, x) => S3(zz, b.x + x, 0.03);
      const k0 = (a - z) / len, k1 = (c - z) / len;             // a chevron drawn as the slice of a ">" pointing down the course
      D.poly3(cam, [tip(a, -w * (1 - k0)), tip(c, -w * (1 - k1)), tip(c, -w * (1 - k1) + th), tip(a, -w * (1 - k0) + th)], col.arrow);
      D.poly3(cam, [tip(a, w * (1 - k0)), tip(c, w * (1 - k1)), tip(c, w * (1 - k1) - th), tip(a, w * (1 - k0) - th)], col.arrow);
    }
  }
  // a lane of fast water: a bright strip with white edges and thin chevrons racing down it (only the part inside
  // slice [za, zb]; the chevrons only near the camera)
  function flowLane(cam, f, za, zb, t, near) {
    const z0 = Math.max(za, f.z), z1 = Math.min(zb, f.z + f.len);
    if (z1 <= z0) return;
    const col = TH.flow || { lane: '#8ff0ff', edge: '#ffffff', mark: '#ffffff' }, X = z => f.x0 + (f.x1 - f.x0) * (z - f.z) / f.len;
    const q = (a, b, up, c, al = 1) => D.poly3(cam, [S3(z0, X(z0) + a, up), S3(z0, X(z0) + b, up), S3(z1, X(z1) + b, up), S3(z1, X(z1) + a, up)], c, al);
    q(-f.hw, f.hw, 0.012, col.lane, 0.75);
    q(-f.hw, -f.hw + 0.16, 0.016, col.edge); q(f.hw - 0.16, f.hw, 0.016, col.edge);
    if (!near) return;
    const gap = 2.6, len = 0.9, th = 0.32, w = f.hw * 0.7;
    for (let z = Math.floor(z0 / gap) * gap + (t * 18) % gap - gap; z < z1; z += gap) {
      const a = Math.max(z0, z), b = Math.min(z1, z + len);
      if (b <= a) continue;
      const k0 = (a - z) / len, k1 = (b - z) / len, p = (zz, x) => S3(zz, X(zz) + x, 0.02);
      D.poly3(cam, [p(a, -w * (1 - k0)), p(b, -w * (1 - k1)), p(b, -w * (1 - k1) + th), p(a, -w * (1 - k0) + th)], col.mark, 0.9);
      D.poly3(cam, [p(a, w * (1 - k0)), p(b, w * (1 - k1)), p(b, w * (1 - k1) - th), p(a, w * (1 - k0) - th)], col.mark, 0.9);
    }
  }
  // chequered finish line painted across the course under the GOAL arch (only the part inside slice [za, zb])
  const FROWS = 3, FD = 1.2, FL = FROWS * FD / 2, FCOLS = 14;   // 3 rows of big squares, centred on the line
  function finishLine(cam, za, zb) {
    const FH = CO.halfAt(CO.FINISH), FC = (FH * 2) / FCOLS;
    for (let row = 0; row < FROWS; row++) {
      const z0 = Math.max(za, CO.FINISH - FL + row * FD), z1 = Math.min(zb, CO.FINISH - FL + (row + 1) * FD);
      if (z1 <= z0) continue;
      for (let c = 0; c < FCOLS; c++) {
        const x0 = -FH + c * FC;
        D.poly3(cam, [S3(z0, x0, 0.02), S3(z0, x0 + FC, 0.02), S3(z1, x0 + FC, 0.02), S3(z1, x0, 0.02)], (c + row) % 2 ? '#ffffff' : '#1a1a1a');
      }
    }
  }

  // ------------------------------------------------------------ the whole frame
  // scene: { s: physics state, t: clock (s), cam, trail: [{z, x}], char: mascot id, theme }
  function draw(sc) {
    const { s, t, cam } = sc;
    CO = s.course; TH = sc.theme; SPRAY = TH.spray || SPRAY;
    const zc = cam.cz ?? cam.C[2], hz = cam.cy - cam.F * Math.tan(cam.pitch), pan = -cam.yaw * 900;   // (zc: where along the course the camera is)
    // the stretch of course in view: ahead of the camera normally, behind it when it looks back (the finish shot)
    const fz = cam.f[2], back = cam.back ?? (fz < 0.3 && cam.pitch < 1), L = CO.loop;
    const DR = sc.far || DRAW;                                    // (a mirror draws less far)
    let lo = zc - (back ? DR : cam.top ? (cam.page ? 30 : 18) : 8), hi = zc + (cam.back === false || fz > -0.3 || cam.pitch >= 1 ? DR : 10);   // (looking straight down a drop is not looking back; from above, it sees behind her too)
    if (!sc.mirror) D.bend = CO.bendAt ? CO.bendAt(zc) : 0;      // (the world curling up ahead, or away like a small planet's)
    if (L && zc > L.z0 - 30 && zc < L.z1 + 20) lo = Math.min(lo, L.z0 - 90);   // (up round a loop, the way in lies out beyond its top)
    const items = [];
    const add = (z, fn, slope, x = 0, ramp = null) => items.push({ d: D.toCam(cam, P3(z, x))[2], fn, z, slope, ramp });   // (x: where across it stands, when that matters; ramp: one she rides, drawn under her)
    const R = { cam, mirror: !!sc.mirror, roll: cam.roll || 0, WF: CO.bent ? CO.flat : (z, x, y) => [wx(z, x), y, z], CO, t, rt: s.t, sz: s.z, sx: s.x, sy: s.y, squash: s.squash, char: sc.char, zc, lo, hi, hz, pan, add, P3, S3, W3, wx, billboard: (art, z, x, up, a, sq, sh) => billboard(cam, art, z, x, up, a, sq, sh), near: z => Math.abs(z - zc) <= 40 };
    TH.sky(R);

    const z0 = Math.floor(lo / SL) * SL, z1 = hi;
    const tr = sc.trail, segs = [];                               // her tracks, bucketed by slice below
    for (let i = 1; i < tr.length; i++) if (!tr[i].gap && tr[i].z > z0 && !(CO.cloneK && CO.cloneK(tr[i].z) > 0.05) && Math.abs(tr[i].x - tr[i - 1].x) < 4) segs.push([tr[i - 1], tr[i]]);   // (none among her copies: her tracks would give her away; none across a tube's seam)   // (none among her copies: her tracks would give her away)
    const trailCol = TH.trail || '#cfdcef';
    const slices = [];
    for (let za = z0, step = SL; za < z1; za += step) {
      const far = Math.abs(za - zc) > 40;
      step = far && (za % 8 === 0 || step === 8) ? 8 : SL;       // long slices in the distance (aligned to the stripes)
      slices.push([za, za + step, !far]);
    }
    if (TH.ground) {                                              // ground under a raised course goes down first, far to near
      const byDepth = slices.map(sl => [D.toCam(cam, P3((sl[0] + sl[1]) / 2, 0))[2], sl]).sort((a, b) => b[0] - a[0]);
      for (const [, [za, zb, near]] of byDepth) TH.ground(R, za, zb, near);
    }
    for (const [za, zb, near] of slices) {
      add((za + zb) / 2, () => {
        TH.slice(R, za, zb, near);
        if (CO.flows) for (const f of CO.flows) if (f.z < zb && f.z + f.len > za) flowLane(cam, f, za, zb, t, near);
        for (const b of CO.boosts) if (b.z < zb && b.z + b.len > za) boostPad(cam, b, za, zb, t);
        if (za < CO.FINISH + FL && zb > CO.FINISH - FL) finishLine(cam, za, zb);
        for (const [a, b] of segs) {                               // her carved tracks, right under the skis
          if (b.z < za || a.z >= zb) continue;
          if (TH.light) { const w = TH.light.w, al = clamp(1 - (s.z - b.z) / 40) * 0.7 * (TH.light.k ? TH.light.k(b.z) : 1); if (al > 0.02) D.poly3(cam, [S3(a.z, a.x - w, 0.012), S3(a.z, a.x + w, 0.012), S3(b.z, b.x + w, 0.012), S3(b.z, b.x - w, 0.012)], TH.light.col, al); }   // (a trail of light behind her, fading)
          for (const o of SKI_X) D.poly3(cam, [S3(a.z, a.x + o - 0.06, 0.015), S3(a.z, a.x + o + 0.06, 0.015), S3(b.z, b.x + o + 0.06, 0.015), S3(b.z, b.x + o - 0.06, 0.015)], trailCol);
        }
      }, true);
    }
    TH.scenery(R);
    CO.gates.forEach(gt => { if (gt.z > lo && gt.z < hi) add(gt.z - 0.01, () => TH.gate(R, gt.z, gt.i)); });
    const SG = CO.START + 10;
    if (SG > lo && SG < hi) add(SG, () => TH.gate(R, SG, -1, 'START'));
    if (CO.FINISH > lo && CO.FINISH < hi) add(CO.FINISH, () => TH.gate(R, CO.FINISH, -1, 'GOAL'));
    CO.ramps.forEach(r => { if (r.z + r.len > lo && r.z < hi) items.push({ d: D.toCam(cam, P3(r.z + r.len * 0.5, r.x))[2], fn: () => { if (!(TH.ramp && TH.ramp(R, r))) kicker(cam, r); }, z: r.z + r.len / 2, ramp: r }); });   // (a theme may draw its own)
    CO.obstacles.forEach((o, i) => {                             // (a car is where it has driven to, sorted by its near end so the road never covers it)
      const oz = obZ(o, s.z);
      if (oz >= lo && oz <= hi) add(o.drive ? oz - o.hd - (Math.abs(oz - zc) > 38 ? 8.2 : 2.2) : oz, () => TH.obstacle(R, o, i));   // (the slices out there are 8 long)
    });
    CO.coins.forEach((cn, i) => {                                // (a theme can carry coins along with something moving: TH.shift)
      if (s.got.has(i) || cn.z < lo || cn.z > hi) return;
      const sh = TH.shift ? TH.shift(cn.z, s.z) : null;
      add(cn.z + (sh ? sh[2] : 0), () => billboard(cam, COIN, cn.z, cn.x, cn.y - 0.4, 1, Math.max(0.12, Math.abs(Math.cos(t * 4 + cn.z * 0.7))), sh));
    });
    if ((cam.top || 0) > 0.5) for (const it of items) if (it.slope || it.ramp) it.d += 1e4;   // (seen from above, the ground first, then all that stands on it)
    items.sort((a, b) => b.d - a.d);

    // she rides on the surface: course pieces around her never cover her; gates, trees and obstacles still sort by depth
    const groundY = CO.ground(s.z, s.x), body = W3(s.z, s.x, s.y);
    const ad = D.toCam(cam, body)[2];
    let at = items.findIndex(o => o.d < ad); if (at < 0) at = items.length;
    if (s.mode === 'crash' && s.air && s.y < CO.surf(s.z, CO.clampX(s.x)) - 0.3) {   // fallen off the edge, below it: the course in front covers her
      const k = items.findIndex(o => o.slope && o.z < s.z + 2);
      if (k >= 0) at = Math.min(at, k);
    } else items.forEach((o, k) => {
      if (o.slope && Math.abs(o.z - s.z) < 1.6) at = Math.max(at, k + 1);
      if (o.ramp && s.z > o.ramp.z - 1 && s.z < o.ramp.z + o.ramp.len + 2) at = Math.max(at, k + 1);
    });
    let anjeScr = null;
    items.splice(at, 0, { fn: () => { anjeScr = drawAnje(sc, cam, body, groundY); } });
    if (!sc.mirror) copies(sc, cam, items);
    for (const it of items) it.fn();
    return { anje: anjeScr, hz };
  }

  // her copies (course.clone): each one rides where she rode (or its mirror image across the course, or a little
  // to one side), now or a moment ago, hopping and crouching as she did; out of her as the stretch begins
  const CLB = [], CLONES = [[-1, 0, 0, 0.7], [1, 3.4, 0.4, -0.8], [1, -3.4, 0.25, -1.5], [-1, 3.4, 0.55, 0.3]];   // [mirrored?, across, how long behind (s), along]
  function copies(sc, cam, items) {
    const { s } = sc, k = CO.cloneK ? CO.cloneK(s.z) : 0;
    if (k <= 0.01 || s.mode === 'done') { CLB.length = 0; return; }
    const last = CLB[CLB.length - 1];
    if (last && s.t < last[0]) CLB.length = 0;
    if (!CLB.length || s.t > CLB[CLB.length - 1][0]) CLB.push([s.t, s.x, s.y - CO.ground(s.z, s.x), s.duck, s.air, s.vx, s.mode]);
    while (CLB.length > 240) CLB.shift();
    const at = t => { let e = CLB[0]; for (const q of CLB) { if (q[0] <= t) e = q; else break; } return e; };
    const half = CO.halfAt(s.z) - 0.6;
    for (const [m, off, lag, dz] of CLONES) {
      const e = at(s.t - lag), z = s.z + dz * k, x = clamp(lerp(s.x, off + m * e[1], k), -half, half), gy = CO.ground(z, x);
      const f = { course: CO, z, x, y: gy + e[2], vx: m * e[5], v: s.v, air: e[4], duck: e[3], mode: 'ride', inv: s.inv, rail: null, crashT: 0 };
      const b = W3(z, x, f.y), q = D.toCam(cam, b);
      if (q[2] < 1) continue;
      let i = items.findIndex(o => o.d !== undefined && o.d < q[2]); if (i < 0) i = items.length;   // (in its place among the rest, far to near)
      items.splice(i, 0, { d: q[2], fn: () => drawAnje({ s: f, t: sc.t + lag * 3, char: sc.char }, cam, b, gy) });
    }
  }

  // turning round to ride backwards: the word saying what has changed (the mirror ahead of her is the wrong way round),
  // while the camera swings round her (the map's CAMYAW); s: her state (drawn over the frame, under the HUD)
  function flip(s) {
    const CO2 = s.course;
    if (!CO2.back || !CO2.back.length || typeof document === 'undefined' || s.mode === 'done') return;
    for (const [e] of CO2.back) {                                    // (only going into it: back to the front again needs no word)
      const u = (s.z - (e - 8)) / 26;                               // (while she swings round in the air, high in the picture, before the mirror comes down)
      if (u <= 0 || u >= 1) continue;
      const g = D.ctx, al = Math.min(1, Math.sin(Math.PI * u) * 1.6);
      g.save(); g.globalAlpha = al; g.translate(D.W / 2, D.H * (D.P ? 0.3 : 0.22)); g.scale(0.8 + 0.2 * al, 0.8 + 0.2 * al);
      D.panel(-330, -90, 660, 180, { fill: 'rgba(18,10,6,0.82)', border: '#b8892a' });
      D.txt('反向鏡', 0, 32, { size: 96, color: '#ffffff', align: 'center', stroke: ['#8a5a1a', 12] });
      g.restore();
    }
  }

  // the other mascots cheering at the finish: two rows of them either side from z0 to z1, `gap` past the course's edge,
  // `y` up, on two steps of stands in the theme's colours (stand: { top, top2, face }, or none: on the ground, at y).
  // Called from a theme's scenery(R); each stretch of stand goes in with its crowd, so the stand
  // never covers them
  const FANS = ['owl', 'anji', 'anje', 'anbo', 'ansey', 'angoo', 'anmi', 'anka', 'anzo', 'anbi', 'anleo'];
  function crowd(R, o) {
    const { z0, z1, gap = 1.6, y = 0.9, step = 4, stand = null, sides = [-1, 1], far = 75, fog = null } = o, cam = R.cam;
    for (let z = Math.ceil(z0 / step) * step; z < z1; z += step) {
      if (z < R.lo || z > R.hi || Math.abs(z - R.zc) > far) continue;
      for (const sd of sides) {
        const X = k => sd * (CO.halfAt(z + k) + gap), P = (zz, x, up) => R.P3(zz, x, up);
        R.add(z + step / 2, () => {
          const k = fog ? fog(z, X(0)) : 0, c = col => (fog && k > 0 ? root.SkiCore.mixHex(col, o.haze || '#ffffff', k * 0.7) : col);
          if (stand) for (const [a, b, up, col] of [[-1.3, 0.9, y, stand.top], [0.9, 3.1, y + 0.5, stand.top2 || stand.top]]) {
            const xa = d => X(d) + sd * a, xb = d => X(d) + sd * b;
            D.poly3(cam, [P(z, xa(0), up), P(z, xb(0), up), P(z + step, xb(step), up), P(z + step, xa(step), up)], c(col));
            D.poly3(cam, [P(z, xa(0), up - (a < 0 ? up : 0.5)), P(z + step, xa(step), up - (a < 0 ? up : 0.5)), P(z + step, xa(step), up), P(z, xa(0), up)], c(stand.face), 1, [-sd, 0, 0]);
          }
          for (const row of [1, 0]) for (const dz of [0.6, 2.6]) {   // (the back row first)
            const zz = z + dz + row * 1, n = Math.abs(Math.round(zz * 7 + sd * 3 + row * 5)), id = FANS[n % FANS.length];
            const q = D.toCam(cam, P(zz, X(dz) + sd * row * 2.2, y + row * 0.5));
            if (q[2] < 1) continue;
            const [sx, sy] = D.scr(cam, q), s = cam.F / q[2] * 2.1 / 48, hop = Math.abs(Math.sin(R.t * 6 + n)) * 14 * s;
            if (s * 48 < 3) continue;
            D.spr(id, sx, sy - hop, s, { alpha: fog ? 1 - k * 0.5 : 1 });
          }
        }, false, X(0));
      }
    }
  }

  // two long skis on the surface under her feet (in 3D, so they keep their length and perspective from any camera):
  // pointing where she is heading, a little of the tail behind her heels, the tips turned up
  function skis(cam, s, body, groundY) {
    const spin = CO.camYaw && CO.back && CO.back.some(([a, b]) => s.z > a - 40 && s.z < b + 40) ? CO.camYaw(s.z) : 0;   // (turning round to ride backwards: as far as the camera has swung)
    const yaw = CO.heading(s.z) + clamp(s.vx / Math.max(6, s.v), -0.6, 0.6) * 0.7 + spin;
    const f = [Math.sin(yaw), Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
    const lift = groundY - CO.surf(s.z, s.x), [C0, C1, C2] = TH.ski || SKI_DEF, g = CO.grade(s.z), dz = 1 / Math.sqrt(1 + g * g);   // (lengths run along the slope: on a sheer face mostly down it)
    const yr = yaw - CO.heading(s.z), cr = Math.cos(yr), sr = Math.sin(yr);
    const at = CO.bent ? (side, along, up = 0) => {                // (with a loop, laid out along the course and rolled up with it; likewise on a twisted track)
      const z = s.z + cr * along * dz - sr * side, x = s.x + cr * side + sr * along;
      return W3(z, x, (s.air ? s.y : CO.surf(z, CO.clampX(x)) + lift) + 0.03 + up);
    } : (side, along, up = 0) => {
      const x = body[0] + r[0] * side + f[0] * along, z = body[2] + r[1] * side + f[1] * along * dz;
      return [x, (s.air ? s.y : CO.surf(z, CO.clampX(x - CO.centerX(z))) + lift) + 0.03 + up, z];
    };
    for (const c of SKI_X) {
      const a = c - 0.065, b = c + 0.065;
      D.poly3(cam, [at(a, -0.65), at(b, -0.65), at(b, 1.05), at(a, 1.05)], C0);
      D.poly3(cam, [at(a, -0.65, 0.005), at(a + 0.04, -0.65, 0.005), at(a + 0.04, 1.05, 0.005), at(a, 1.05, 0.005)], C1);
      D.poly3(cam, [at(a, 1.05), at(b, 1.05), at(b, 1.25, 0.16), at(a, 1.25, 0.16)], C2);   // upturned tip
    }
  }
  function drawAnje(sc, cam, body, groundY) {
    const { s, t } = sc, q = D.toCam(cam, body);
    if (q[2] < 1) return null;
    const [ax, ay] = D.scr(cam, q), scl = cam.F / q[2] * 2 / 48;    // about 2 units tall
    const gq = D.toCam(cam, CO.bent ? W3(s.z, s.x, groundY) : [body[0], groundY, body[2]]);
    if (gq[2] > 1) { const [gx, gy] = D.scr(cam, gq); D.shadowEll(gx, gy, scl * ((cam.page || 0) > 0.5 ? 9 : 12) * Math.max(0.4, 1 - (body[1] - groundY) * 0.1), 0.18); }
    const alpha = s.inv > 0 && Math.floor(t * 14) % 2 ? 0.35 : 1;
    if (s.mode !== 'crash' && alpha === 1 && !s.rail) skis(cam, s, body, groundY);
    const [C0, C1, C2] = TH.ski || SKI_DEF;
    if (s.mode === 'crash') {                                       // tumble: spin over, bounce, stars
      const p = 1 - s.crashT / K.CRASH_T, hop = Math.sin(Math.PI * clamp(p * 1.6)) * 30 * scl, rot = E.out(clamp(p * 1.4)) * Math.PI * 3;
      // spin about her middle, lifted just enough that no part of her (or her skis) ever goes below the surface
      const HW = 23, HH = 24, low = Math.abs(HW * Math.sin(rot)) + Math.abs(HH * Math.cos(rot));
      const g = D.ctx, cy = ay - hop - low * scl;
      g.save(); g.translate(Math.round(ax), Math.round(cy)); g.rotate(rot);
      D.spr(sc.char, 0, HH * scl, scl);
      for (const [a, dy] of [[0.13, -2], [-0.13, 0]]) {             // her skis tumble with her, still on her feet, a little crossed
        g.save(); g.translate(0, HH * scl); g.rotate(a);
        D.rect(-22 * scl, (dy - 2) * scl, 44 * scl, 3 * scl, C0);
        D.rect(-22 * scl, (dy - 2) * scl, 44 * scl, 1 * scl, C1);
        D.rect(20 * scl, (dy - 4) * scl, 3 * scl, 3 * scl, C2);   // upturned tip
        g.restore();
      }
      g.restore();
      for (let k = 0; k < 4; k++) {
        const a = t * 6 + k * Math.PI / 2, sx = ax + Math.cos(a) * 18 * scl, sy = ay - 52 * scl + Math.sin(a) * 5 * scl;
        D.pix(['..Y..', '.YYY.', 'YYYYY', '.YYY.', '..Y..'], { Y: '#ffd84a' }, sx, sy, 2 * scl);
      }
      return [ax, ay, scl];
    }
    const fw = [Math.sin(CO.heading(s.z)), Math.cos(CO.heading(s.z))], gr = CO.grade(s.z);   // which way she is going, down the slope
    if ((cam.side || 0) > 0.5) {                                    // seen from the side (inside a video game): facing out of the screen, bobbing, leaning into her run
      const blink = ((t * 0.9) % 3.3) < 0.16, bob = s.air ? 0 : Math.abs(Math.sin(t * 12)) * 3 * scl;
      D.spr(sc.char + (blink ? '_blink' : ''), ax, ay - bob, scl, { rot: s.air ? clamp(-s.vy * 0.03, -0.3, 0.3) : 0.12, alpha, sq: s.duck ? 0.62 : 1 });
      return [ax, ay, scl];
    }
    if ((cam.page || 0) > 0.5) {                                    // down a web page, seen from above: coming down the screen, her face; up in the air, off her shadow and bigger
      const h = clamp(s.y - groundY, 0, 4), blink = ((t * 0.9) % 3.3) < 0.16, k = D.P ? 1 : 0.75;   // (a little smaller than she is in landscape: the page is the thing to see; on a phone's narrow page she is small already)
      D.spr(sc.char + (blink ? '_ski_front_blink' : '_ski_front'), ax, ay - h * 16 * scl * k, scl * k * (1 + h * 0.12), { sq: s.duck ? 0.62 : 1, alpha, rot: -clamp(s.vx / 11, -1, 1) * 0.2 });
      return [ax, ay, scl];
    }
    const L = CO.loop, inLoop = L && s.z > L.z0 - 16 && s.z < L.z1 + 12;   // (round a loop the camera always rides behind her; the course is not flat there, so the test below would be wrong)
    const bk = s.mode !== 'done' && CO.backAt && CO.backAt(s.z) ? -1 : 1;   // (riding backwards she faces up the course)
    if (!inLoop && !((cam.top || 0) > 0.5) && ((cam.C[0] - body[0]) * fw[0] - (cam.C[1] - body[1]) * gr + (cam.C[2] - body[2]) * fw[1]) * bk > 0) {   // (from straight above: her back, as from behind)   // camera out in front (finish shot; or, riding backwards, a mirror): her front, on skis
      const blink = ((t * 0.9) % 3.3) < 0.16;
      D.spr(sc.char + (blink ? '_ski_front_blink' : '_ski_front'), ax, ay, scl, { sq: s.duck ? 0.62 : 1, alpha, flip: !!sc.mirror });   // (crouched too: a mirror shows it; in it, her mirror image)
      return [ax, ay, scl];
    }
    if (s.rail) {                                                    // on rails: sitting in a mine cart, rattling along
      const rock = s.air ? 0 : Math.sin(t * 31) * 0.012, C = TH.cart || CART_DEF, P = (side, along, up) => W3(s.z + along, s.x + side, s.y + up + rock);
      const Q = (pts, col, n) => D.poly3(cam, pts.map(([a, b, c]) => P(a, b, c)), col, 1, n);
      for (const sd of [-1, 1]) for (const al of [-0.6, 0.6]) Q([[sd * 0.82, al - 0.28, 0], [sd * 0.82, al + 0.28, 0], [sd * 0.82, al + 0.28, 0.5], [sd * 0.82, al - 0.28, 0.5]], C.wheel, [sd, 0, 0]);   // wheels
      Q([[-0.8, 0.95, 0.3], [0.8, 0.95, 0.3], [0.8, 0.95, 1.25], [-0.8, 0.95, 1.25]], C.body);                     // its far end
      Q([[-0.72, -0.9, 1.0], [0.72, -0.9, 1.0], [0.72, 0.9, 1.0], [-0.72, 0.9, 1.0]], C.dark);                     // inside it
      for (const sd of [-1, 1]) Q([[sd * 0.8, -0.95, 0.3], [sd * 0.8, 0.95, 0.3], [sd * 0.8, 0.95, 1.25], [sd * 0.8, -0.95, 1.25]], C.body, [sd, 0, 0]);
      D.spr(sc.char + '_ski_back', ax, ay - (0.55 + rock) * 24 * scl, scl, { rot: Math.sin(t * 5) * 0.03, alpha });
      Q([[-0.8, -0.95, 0.3], [0.8, -0.95, 0.3], [0.8, -0.95, 1.25], [-0.8, -0.95, 1.25]], C.body, [0, 0, -1]);    // its near end, in front of her legs
      for (const u of [0.42, 1.08]) Q([[-0.82, -0.97, u], [0.82, -0.97, u], [0.82, -0.97, u + 0.12], [-0.82, -0.97, u + 0.12]], C.band, [0, 0, -1]);
      Q([[-0.86, -0.99, 1.2], [0.86, -0.99, 1.2], [0.86, -0.99, 1.32], [-0.86, -0.99, 1.32]], C.rim, [0, 0, -1]);
      return [ax, ay, scl];
    }
    const lean = clamp(s.vx / 11, -1, 1) * 0.3 * bk, bob = s.air ? 0 : Math.abs(Math.sin(t * 9)) * 2;
    const roll = s.air ? 0 : -Math.atan(CO.bank(s.z, s.x)) * 0.45; // up the side of a trough she leans in with it
    const sq = s.duck ? 0.62 : 1;
    D.spr(sc.char + '_ski_back', ax, ay - bob, scl, { rot: lean + roll + Math.sin(t * 5) * 0.04, sq, alpha });
    return [ax, ay, scl];
  }

  // riding backwards (course.back): a mirror the owl flies in front of her, holding it up to her, the only way to see
  // what is coming: her face and, past her, the course ahead. A mirror the wrong way round: what is coming is not
  // turned left to right, so in it ← → move her the other way from the main picture (one more thing to think about),
  // but she herself is her mirror image. Drawn into a canvas of its own (at
  // res of the screen's resolution, not as far), then on to the screen; k (0..1) slides it down into view
  let MC = null;
  function mirror(sc, k, o = {}) {
    if (typeof document === 'undefined' || k <= 0.01) return;
    const { s } = sc, P = D.P, w = Math.round(P ? D.W * 0.86 : Math.min(D.W * 0.5, 960)), h = Math.round(w * (P ? 0.5 : 0.38));
    const x = Math.round((D.W - w) / 2), y = Math.round((P ? 410 : 128) - (1 - E.out(k)) * (h + 300)), g0 = D.ctx;
    const res = o.res || 0.55, bw = Math.max(2, Math.round(w * res)), bh = Math.max(2, Math.round(h * res));
    if (!MC) MC = document.createElement('canvas');
    if (MC.width !== bw || MC.height !== bh) { MC.width = bw; MC.height = bh; }
    const g = MC.getContext('2d', { alpha: false }), keep = [D.ctx, D.W, D.H, D.bend];
    CO = s.course;
    const z = s.z + 7, cam = D.makeCam(W3(z, s.x * 0.6, CO.surf(z, s.x) + 0.6), 10, 0.5, CO.heading(z), h * 0.8, h * 0.3);   // (from high up the slope behind her, looking down the way on past her: what is coming in plain view)
    D.ctx = g; D.W = w; D.H = h; D.bend = 0;
    g.setTransform(res, 0, 0, res, 0, 0); g.imageSmoothingEnabled = false;
    try { draw(Object.assign({}, sc, { cam, mirror: true, far: o.far || 90 })); } finally { [D.ctx, D.W, D.H, D.bend] = keep; }
    const fr = o.frame || { rim: '#1c2340', glint: '#ffffff', stem: '#2a3358' }, bob = Math.sin(sc.t * 9) * 6, flap = Math.sin(sc.t * 22);
    g0.save(); g0.translate(0, bob);
    D.rect(D.W / 2 - 7, y - 34, 14, 40, fr.stem);                        // the stem up to the owl's feet
    for (const sd of [-1, 1]) {                                          // the owl's wings, beating
      g0.fillStyle = '#8a6a4a'; g0.beginPath(); g0.moveTo(D.W / 2 + sd * 30, y - 78); g0.lineTo(D.W / 2 + sd * (96 + 10 * flap), y - 104 - 34 * flap); g0.lineTo(D.W / 2 + sd * 74, y - 58 + 10 * flap); g0.closePath(); g0.fill();
    }
    D.spr('owl', D.W / 2, y - 22, 2.2);
    g0.fillStyle = fr.rim; g0.beginPath(); g0.roundRect(x - 14, y - 14, w + 28, h + 28, 34); g0.fill();
    g0.save(); g0.beginPath(); g0.roundRect(x, y, w, h, 22); g0.clip();
    g0.translate(x, y); g0.imageSmoothingEnabled = true; g0.drawImage(MC, 0, 0, w, h);
    g0.restore();
    g0.globalAlpha = 0.18; g0.fillStyle = fr.glint; g0.beginPath(); g0.moveTo(x + w * 0.08, y); g0.lineTo(x + w * 0.2, y); g0.lineTo(x + w * 0.1, y + h); g0.lineTo(x - w * 0.02, y + h); g0.closePath(); g0.fill(); g0.globalAlpha = 1;
    g0.lineWidth = 4; g0.strokeStyle = 'rgba(255,255,255,0.5)'; g0.beginPath(); g0.roundRect(x + 2, y + 2, w - 4, h - 4, 20); g0.stroke();
    const tw = 190, ty = y + h + 6;                                  // a tag hanging off the bottom of the frame, there as long as the mirror is: it is the wrong way round
    g0.fillStyle = fr.rim; g0.beginPath(); g0.roundRect(D.W / 2 - tw / 2, ty - 22, tw, 46, 23); g0.fill();
    D.txt('反向鏡', D.W / 2, ty + 12, { size: 30, color: '#ffffff', align: 'center' });
    g0.restore();
  }

  // the theme's weather, then speed lines when she is fast; while a boost lasts (boost: 0..1) the lines are full on
  // and the edges of the screen glow (no speed lines inside a video game: it is seen from the side)
  function weather(t, speed, hz, theme, boost = 0) {
    const W = D.W, H = D.H, g = D.ctx, r = rng(Math.floor(t * 30));
    if (theme && theme.weather) theme.weather({ t, hz, speed });
    if (boost > 0) {
      const gl = (theme && theme.boost && theme.boost.glow) || '#9ff4ff';
      for (const [x0, x1] of [[0, W * 0.16], [W, W * 0.84]]) {
        const gr = g.createLinearGradient(x0, 0, x1, 0);
        gr.addColorStop(0, gl); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = 0.55 * boost; g.fillStyle = gr; g.fillRect(Math.min(x0, x1), 0, W * 0.16, H);
      }
      g.globalAlpha = 1;
    }
    const a = Math.max(seg(speed, 18, 30) * 0.45, 0.6 * boost, seg(speed, 40, 62) * 0.85) * (1 - SIDE) * (1 - clamp(PAGEK * 1.4)), cy = clamp(hz, H * 0.2, H * 0.7);   // (well past top speed: more of them, brighter)
    if (a > 0) {
      g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 8;
      for (let k = 0; k < (speed > 40 ? 26 : 14); k++) {
        const ang = speed > 40 ? r() * Math.PI * 2 : r() < 0.5 ? Math.PI * (0.05 + r() * 0.3) : Math.PI * (0.65 + r() * 0.3), d0 = 600 + r() * 400, d1 = d0 + 120 + r() * 200;
        g.beginPath(); g.moveTo(W / 2 + Math.cos(ang) * d0, cy + Math.sin(ang) * d0 * 0.6); g.lineTo(W / 2 + Math.cos(ang) * d1, cy + Math.sin(ang) * d1 * 0.6); g.stroke();
      }
    }
    g.globalAlpha = 1;
  }

  root.SkiWorld = { newCam, chase, finishCam, draw, mirror, flip, weather, puff, stepParts, drawParts, parts, billboard, crowd, SKI_X };
})(typeof window !== 'undefined' ? window : globalThis);

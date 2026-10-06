'use strict';
// 新手 · 雪坡: the trailer's STAGE 05 slope. Retro sky bands, pixel clouds, snowy ridges, pines and a chairlift,
// red/blue gates, snow walls that slow her down, kickers, fences, low banners.
(function (root) {
  const { clamp, lerp, rng } = root.SkiCore;

  // ------------------------------------------------------------ course
  const course = root.SkiCourse.build({
    id: 'snow', HALF: 7, FINISH: 1500, LENGTH: 1580, START: 4,
    // centre line: control points [z, x]; smoothstep between them, so every point is a straight moment between bends
    CX: [[0, 0], [120, 0], [200, -10], [260, 8], [320, -8], [380, 10], [440, -8], [500, 8], [560, 0],
      [700, 6], [860, 0], [940, -8], [1020, 6], [1100, -6], [1180, 0], [1260, 10], [1340, -6], [1420, 6], [1500, 0], [1580, 0]],
    // steepness: control points [z, grade] (height lost per unit forward), linear between them
    GRADE: [[0, 0.02], [12, 0.04], [24, 0.14], [120, 0.18], [200, 0.2],
      [260, 0.26], [320, 0.16], [380, 0.26], [440, 0.14], [500, 0.26], [560, 0.2],
      [588, 0.08], [604, 0.08], [606, 0.5], [626, 0.18], [688, 0.08], [704, 0.08], [706, 0.5], [726, 0.18],
      [788, 0.08], [804, 0.08], [806, 0.55], [830, 0.2], [860, 0.2],
      [950, 0.24], [1050, 0.18], [1180, 0.24],
      [1200, 0.3], [1300, 0.34], [1400, 0.3], [1480, 0.34], [1500, 0.14], [1540, 0.0], [1580, 0.0]],
    sections: [{ name: '暖身', z0: 0 }, { name: '樹林蛇行', z0: 200 }, { name: '跳台區', z0: 560 }, { name: '低旗門', z0: 860 }, { name: '最後衝刺', z0: 1180 }],
  }, (c, P) => {
    const rock = (z, x) => P.hop('rock', z, x, 1.0);                       // jump over or go round
    const snowman = (z, x) => P.tall('snowman', z, x, 0.85);              // go round
    const fence = (z, x, w) => P.hop('fence', z, x, w / 2, { hd: 0.4 });  // jump
    const banner = (z, x, w) => P.over('banner', z, x, w);                // duck under
    const FULL = P.FULL;
    // ① 暖身: a few rocks on a gentle straight
    rock(70, 3); rock(110, -2.5); rock(140, 1.5); rock(178, -3.2); rock(178, 3.2);
    // ② 樹林蛇行: S-bends, a pair at every bend so the racing line has to weave
    snowman(230, 0); rock(230, -4.2);
    rock(262, 3.5); snowman(262, -2);
    snowman(290, 2); rock(290, -4.5);
    snowman(320, -3); rock(320, 1.2);
    rock(350, 0); snowman(350, 4.5);
    snowman(380, 3); rock(380, -1.5);
    rock(410, -4); snowman(410, 1);
    snowman(440, -3.5); rock(440, 2.5);
    rock(470, 4); rock(470, -1);
    snowman(500, 3); snowman(500, -4);
    snowman(530, -4.6); rock(530, 0); snowman(530, 4.6);
    // ③ 跳台區: three kickers, each followed by a steep drop (big air); fences to jump in between
    rock(598, -5.2); rock(598, 5.2);
    fence(650, 0, FULL);
    rock(694, 3.5);
    fence(750, 2, 10);
    rock(770, -4); rock(770, 0.5);
    rock(794, -2);
    fence(840, 0, FULL);
    // ④ 低旗門: low banners to duck under, mixed with jumps
    banner(890, 0, FULL);
    rock(915, 2); snowman(915, -3);
    banner(945, 0, FULL);
    fence(975, -2, 9);
    banner(1005, 0, FULL);
    rock(1030, -4.2); rock(1030, 0); rock(1030, 4.2);
    banner(1060, 0, FULL); fence(1074, 0, FULL);
    snowman(1100, 0); snowman(1100, -5.2); snowman(1100, 5.2);
    banner(1130, -3.5, 7);
    fence(1160, 0, FULL);
    // ⑤ 最後衝刺: steep and dense
    rock(1205, 0); snowman(1205, -4.6);
    snowman(1230, 3.5); rock(1230, -1);
    fence(1255, 0, FULL);
    rock(1280, -3.5); rock(1280, 2);
    banner(1305, 0, FULL);
    snowman(1330, 0); rock(1330, 5.3); rock(1330, -5.3);
    fence(1355, 3, 8);
    rock(1380, -2); snowman(1380, 3);
    banner(1405, 0, FULL); rock(1420, 0);
    snowman(1440, -3); snowman(1440, 3);
    fence(1465, 0, FULL);
    rock(1485, -4); rock(1485, 4);

    // kickers: ground rises `rise` over `len`, then drops away
    P.ramp(596, 0, 3, 1.6); P.ramp(696, -3, 3, 1.6); P.ramp(796, 3, 3, 1.8);
    const R = c.ramps;

    // coins
    const { coin, row, flight } = P;
    // ①
    row(28, 0, 4); row(56, -3, 4); row(84, 3, 4); row(150, -2, 4, 3, -0.4);
    // ② along the racing line between the pairs
    row(238, -2.5, 4, 3, 1.2); row(298, 4, 4, 3, -1.6); row(358, -4, 4, 3, 1.4); row(418, 4, 4, 3, -1.4); row(478, -4, 4, 3, 1.4); row(540, 0, 4);
    // ③ in the air after every kicker, over every full fence
    row(572, 0, 4); flight(R[0], 5); coin(650, 0, 2.0); coin(650, -3, 2.0); coin(650, 3, 2.0);
    row(664, -3, 4); flight(R[1], 5);
    flight(R[2], 5); coin(840, -2, 2.0); coin(840, 2, 2.0);
    // ④ under the banners (crouch height), and on the safe side of the half obstacles
    for (const z of [890, 945, 1005, 1060]) { coin(z, -2, 0.6); coin(z, 2, 0.6); }
    row(955, 4.5, 3); row(1040, 2, 3); row(1112, 2.5, 3); coin(1130, 3, 0.9); coin(1130, 5, 0.9); row(1140, 0, 3);
    // ⑤ risky lines through the dense part
    row(1190, 2.5, 3); row(1238, -3.5, 3); row(1288, -0.8, 3); row(1340, 2.5, 3); row(1365, -3.5, 3); row(1428, 0, 3); coin(1465, -2, 2.0); coin(1465, 2, 2.0); row(1490, 0, 3);
  });

  // ------------------------------------------------------------ look
  const SKW = 40;                                              // snowfield half-width
  const BANK = [0.7, 0.85, 1.4, 2.4];                          // snow wall: inner foot→top edge (x, y), top width, outer foot
  const LIFT_X = -(course.HALF + 12);                          // chairlift up the left side, as in the trailer
  const LIFT = { half: 1.4, h: 9, towers: [] };
  for (let z = -6; z < 1528; z += 16) LIFT.towers.push(z);   // (down to its bottom station by the finish)
  const inVillage = (z, x) => z > 1456 && z < 1600 && Math.abs(x) < 29;   // (round the finish: 暖爐山屋 and its cabins, no pines)
  const TREES = (() => {                                       // pines either side of the course
    const r = rng(606), out = [];
    for (let z = -12; z < course.LENGTH + 140; z += 3.2) for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
      if (r() >= 0.8) continue;
      const x = sd * (course.HALF + 4 + k * 9 + r() * 7), zz = z + r() * 2, h = 3.2 + r() * 2.4;
      if (Math.abs(x - LIFT_X) > 2.6 && !inVillage(zz, x)) out.push({ x, z: zz, h });
    }
    return out.sort((a, b) => a.z - b.z);
  })();
  const PCOL = { W: '#ffffff', S: '#c9d6ea', K: '#1a1a1a', O: '#f0841f', R: '#e0413a', B: '#6b4a2c', G: '#7d8696', D: '#5b6477' };
  const ART = {
    snowman: { cs: 0.13, cols: PCOL, rows: [
      '....WWWW....', '...WWWWWW...', '...WKWWKW...', '...WWWOOO...', '....WWWW....', '..RRRRRRRR..',
      'B..WWWWWW..B', '.B.WWKWWW.B.', '..BWWWWWWB..', '...WWKWWW...', '..WWWWWWWW..', '.WWWWWWWWWW.',
      '.WWWWKWWWWS.', '.WWWWWWWWWS.', '..WWWWWWWS..', '...SSSSSS...'] },
    rock: { cs: 0.15, cols: PCOL, rows: [
      '....WWWW......', '..WWWWWWWW....', '.GGWWWWWGG.WW.', '.GGGGGGGGGWWWW', 'GGGDGGGGGGGGGG', 'GGGGGGGDGGGGDG', 'DDDDDDDDDDDDDD'] },
  };

  const PINE = [[0.2, 0.62, 1.0], [0.45, 0.82, 0.78], [0.68, 1.0, 0.54]];
  function pine(D, cam, x, z, y0, h, far) {                       // far: one green triangle, no trunk or snow caps
    if (far) { const hw = h * 0.36; D.poly3(cam, [[x - hw, y0 + h * 0.15, z], [x + hw, y0 + h * 0.15, z], [x, y0 + h, z]], '#2e7050'); return; }
    D.poly3(cam, [[x - 0.25, y0, z], [x + 0.25, y0, z], [x + 0.25, y0 + h * 0.25, z], [x - 0.25, y0 + h * 0.25, z]], '#6b4a2c');
    PINE.forEach(([b, tp, w], k) => {
      const hw = h * 0.36 * w;
      D.poly3(cam, [[x - hw, y0 + h * b, z], [x + hw, y0 + h * b, z], [x, y0 + h * tp, z]], k === 1 ? '#3f8a58' : '#2e7050');
      D.poly3(cam, [[x - hw * 0.28, y0 + h * (tp - 0.1), z - 0.01], [x + hw * 0.28, y0 + h * (tp - 0.1), z - 0.01], [x, y0 + h * tp, z - 0.01]], '#ffffff');
    });
  }
  function fence(D, R, o) {
    const { cam, P3, wx } = R, y = course.height(o.z), WOOD = '#a0663a', DARK = '#6b4a2c', TOP = '#c98a55';
    const n = Math.max(2, Math.round(o.hw * 2 / 1.75)), x0 = o.x - o.hw, x1 = o.x + o.hw;
    for (const [ya, yb] of [[0.28, 0.44], [0.6, 0.76]]) {
      D.poly3(cam, [P3(o.z, x0, ya), P3(o.z, x1, ya), P3(o.z, x1, yb), P3(o.z, x0, yb)], WOOD);
      D.poly3(cam, [P3(o.z, x0, yb), P3(o.z, x1, yb), P3(o.z + 0.12, x1, yb), P3(o.z + 0.12, x0, yb)], TOP);
    }
    for (let i = 0; i <= n; i++) {
      const xx = wx(o.z, lerp(x0, x1, i / n));
      D.box3(cam, xx - 0.1, xx + 0.1, y, y + 0.9, o.z - 0.1, o.z + 0.1, { side: DARK, rear: DARK, top: TOP });
    }
  }
  function lowBanner(D, R, o, i) {
    const { cam, P3, wx } = R, y = course.height(o.z), x0 = o.x - o.hw, x1 = o.x + o.hw, col = i % 2 ? '#e0413a' : '#2a6fd6';
    [x0, x1].forEach(x => { const xx = wx(o.z, x); D.box3(cam, xx - 0.14, xx + 0.14, y, y + o.y1 + 0.15, o.z - 0.14, o.z + 0.14, { side: '#5b6477', rear: '#8a93a8', top: '#8a93a8' }); });
    D.poly3(cam, [P3(o.z, x0, o.y0), P3(o.z, x1, o.y0), P3(o.z, x1, o.y1), P3(o.z, x0, o.y1)], col);
    D.poly3(cam, [P3(o.z - 0.01, x0, o.y1 - 0.16), P3(o.z - 0.01, x1, o.y1 - 0.16), P3(o.z - 0.01, x1, o.y1), P3(o.z - 0.01, x0, o.y1)], '#ffffff');
    const n = Math.max(1, Math.floor(o.hw * 2 / 2.2));             // white down-chevrons: crouch!
    for (let k = 0; k < n; k++) {
      const cx = lerp(x0, x1, (k + 0.5) / n), a = o.y0 + 0.2, b = o.y1 - 0.3;
      D.poly3(cam, [P3(o.z - 0.02, cx - 0.45, b), P3(o.z - 0.02, cx + 0.45, b), P3(o.z - 0.02, cx, a)], '#ffffff');
    }
  }
  const liftCable = z => {                                      // straight spans between tower tops, a little sag
    const T = LIFT.towers, k = clamp(Math.floor((z - T[0]) / 16), 0, T.length - 2), za = T[k], zb = T[k + 1], f = clamp((z - za) / (zb - za));
    return lerp(course.height(za), course.height(zb), f) + LIFT.h - 0.2 - 0.9 * Math.sin(Math.PI * f);
  };

  // ---- the finish: 暖爐山屋, the lodge at the foot of the slope. The run-out ends at its deck (a fire, skis stuck in the
  // snow, lights along the eaves); cabins behind the stands either side (seen in the finish shot, which looks back across
  // her), and the chairlift's bottom station. No pines in the village
  const LODGE = { z: 1548, d: 14, hw: 12, wall: 5, ridge: 13 };
  const CABINS = [{ x: -15, z: 1486, sign: '熱可可' }, { x: -15.5, z: 1508 }, { x: 15.5, z: 1474, sign: '雪具出租' }, { x: 16, z: 1496 }, { x: 15.5, z: 1517, sign: '滑雪學校' }];
  const WOOD = { wall: '#9a6238', side: '#7a4a2a', trim: '#4a2e1a', snow: '#f4f8ff', snowS: '#dfe8f5', glow: '#ffd27a', glowD: '#f0a040' };
  function lit(D, cam, X, y, z, w, h) {                          // a window lit from inside, on a face at z (facing up the slope)
    const q = (x0, y0, x1, y1, dz, col) => D.poly3(cam, [[x0, y0, z - dz], [x1, y0, z - dz], [x1, y1, z - dz], [x0, y1, z - dz]], col);
    q(X - w / 2 - 0.12, y - 0.12, X + w / 2 + 0.12, y + h + 0.12, 0, WOOD.trim);
    q(X - w / 2, y, X + w / 2, y + h, 0.01, WOOD.glow);
    q(X - 0.04, y, X + 0.04, y + h, 0.02, WOOD.trim);
    q(X - w / 2, y + h / 2 - 0.04, X + w / 2, y + h / 2 + 0.04, 0.02, WOOD.trim);
  }
  // a log chalet: walls, a gable facing up the slope, a steep roof under snow, maybe a chimney smoking; on the slope its
  // front stands on a stone footing. o: { wins (window x offsets), sign, chimney, lights }
  function chalet(D, R, X, z0, d, hw, wall, ridge, o = {}) {
    const { cam, t } = R, yb = course.height(z0 + d), yf = course.height(z0), g = D.ctx;
    if (yf > yb + 0.05) D.box3(cam, X - hw - 0.2, X + hw + 0.2, yb - 0.3, yf + 0.15, z0 - 0.2, z0 + d + 0.2, { side: '#8a8f9a', rear: '#a4a9b4', top: '#b8bdc8' });
    const y0 = Math.max(yf, yb), ew = y0 + wall, top = y0 + ridge, ov = 0.7;
    D.box3(cam, X - hw, X + hw, y0, ew, z0, z0 + d, { side: WOOD.side, rear: WOOD.wall, top: WOOD.wall });
    for (let k = 1; k < 5; k++) { const yy = y0 + wall * k / 5; D.poly3(cam, [[X - hw, yy, z0 - 0.01], [X + hw, yy, z0 - 0.01], [X + hw, yy + 0.06, z0 - 0.01], [X - hw, yy + 0.06, z0 - 0.01]], WOOD.side, 1, [0, 0, -1]); }   // (the logs)
    D.poly3(cam, [[X - hw, ew, z0], [X + hw, ew, z0], [X, top, z0]], WOOD.wall, 1, [0, 0, -1]);                 // the gable
    D.poly3(cam, [[X - hw, ew, z0 + d], [X + hw, ew, z0 + d], [X, top, z0 + d]], WOOD.side, 1, [0, 0, 1]);
    if (o.chimney) {                                               // (behind the roof's near slope: drawn first)
      const cx = X + hw * 0.45, cz = z0 + d * 0.6;
      D.box3(cam, cx - 0.6, cx + 0.6, ew, top + 0.8, cz - 0.6, cz + 0.6, { side: '#8a8f9a', rear: '#a4a9b4', top: '#5a5f6a' });
      for (let k = 0; k < 5; k++) {                                // smoke, drifting up and away
        const ph = (t * 0.35 + k / 5) % 1, q = D.toCam(cam, [cx + ph * 2.4, top + 1.2 + ph * 6, cz]);
        if (q[2] < 1) continue;
        const [sx, sy] = D.scr(cam, q), rr = cam.F / q[2] * (0.6 + ph * 1.4);
        g.save(); g.globalAlpha *= 0.55 * (1 - ph); g.fillStyle = '#eef2f8'; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill(); g.restore();
      }
    }
    for (const sd of [-1, 1]) {                                    // the roof: snow on top, dark wood along its front edge
      const ex = X + sd * (hw + ov), ey = ew - 0.5, n = [sd * (ridge - wall), hw + ov, 0];
      D.poly3(cam, [[ex, ey, z0 - ov], [X, top + 0.25, z0 - ov], [X, top + 0.25, z0 + d + ov], [ex, ey, z0 + d + ov]], WOOD.snow, 1, n);
      D.poly3(cam, [[ex, ey, z0 - ov], [X, top + 0.25, z0 - ov], [X, top - 0.25, z0 - ov], [ex, ey - 0.45, z0 - ov]], WOOD.trim, 1, [0, 0, -1]);
      D.poly3(cam, [[ex, ey - 0.45, z0 - ov], [ex, ey, z0 - ov], [ex, ey, z0 + d + ov], [ex, ey - 0.45, z0 + d + ov]], WOOD.snowS, 1, [sd, 0, 0]);
    }
    const f = z0 - 0.02;                                           // the front: the door, windows lit, the sign over the door
    const q = (x0, y0_, x1, y1, dz, col) => D.poly3(cam, [[x0, y0_, f - dz], [x1, y0_, f - dz], [x1, y1, f - dz], [x0, y1, f - dz]], col, 1, [0, 0, -1]);
    q(X - 0.9, y0, X + 0.9, y0 + 2.3, 0, WOOD.trim); q(X - 0.7, y0, X + 0.7, y0 + 2.1, 0.01, WOOD.glowD);
    if (cam.C[2] < z0) {
      for (const wx_ of o.wins || [-hw * 0.55, hw * 0.55]) lit(D, cam, X + wx_, y0 + 1.2, f, Math.min(1.6, hw * 0.35), 1.3);
      if (ridge - wall > 3.5) lit(D, cam, X, ew + (ridge - wall) * 0.25, f, Math.min(2.4, hw * 0.4), (ridge - wall) * 0.35);   // (up in the gable)
      if (o.sign) {
        const big = !!o.chimney, sw = big ? 9 : Math.min(hw * 1.6, 1.25 * o.sign.length + 1.2), sh = big ? 1.8 : 0.8, sy = y0 + 2.55;   // (the lodge's own: big enough to read from up the slope)
        q(X - sw / 2, sy, X + sw / 2, sy + sh, 0.03, WOOD.trim);
        D.print(cam, [X - sw / 2, sy + sh, f - 0.05], [X + sw / 2, sy + sh, f - 0.05], [X - sw / 2, sy, f - 0.05], o.sign, { w: sw, h: sh, color: '#ffe6b0', fill: 0.78 });
      }
    }
    if (o.lights) {                                                // a string of lights along the gable's edges
      const cols = ['#ff5a5a', '#ffd84a', '#5ad1ff', '#7aff8a'];
      for (const sd of [-1, 1]) for (let k = 0; k <= 12; k++) {
        const u = k / 12, p = D.toCam(cam, [lerp(X + sd * (hw + ov), X, u), lerp(ew - 0.7, top, u) - 0.15, z0 - ov - 0.05]);
        if (p[2] < 1) continue;
        const [sx, sy] = D.scr(cam, p), s = Math.max(2, cam.F / p[2] * 0.14), on = (Math.floor(t * 3) + k) % 4 !== 0;
        g.save(); g.globalAlpha *= on ? 1 : 0.35; g.fillStyle = cols[(k + (sd > 0 ? 2 : 0)) % 4]; g.fillRect(sx - s, sy - s, s * 2, s * 2); g.restore();
      }
    }
  }
  function lodgeDeck(D, R) {                                       // before the lodge: a deck with a rail, a fire, skis stuck in the snow
    const { cam, t } = R, z0 = LODGE.z - 6, z1 = LODGE.z, y = course.height(z1), g = D.ctx, hw = LODGE.hw - 1;
    D.box3(cam, -hw, hw, y, y + 0.35, z0, z1, { side: WOOD.side, rear: WOOD.side, top: '#c98a55' });
    for (let x = -hw; x <= hw + 1e-6; x += 2) if (Math.abs(x) > 1.6) D.box3(cam, x - 0.1, x + 0.1, y + 0.35, y + 1.3, z0 - 0.1, z0 + 0.1, { side: WOOD.trim, rear: WOOD.trim, top: WOOD.wall });
    for (const sd of [-1, 1]) D.poly3(cam, [[sd * 1.6, y + 1.15, z0 - 0.11], [sd * hw, y + 1.15, z0 - 0.11], [sd * hw, y + 1.3, z0 - 0.11], [sd * 1.6, y + 1.3, z0 - 0.11]], WOOD.wall);
    const fx = -4.5, fz = z0 - 3;                                  // the fire: a ring of stones, a glow, flames
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, X = fx + Math.cos(a) * 1.1, Z = fz + Math.sin(a) * 0.7; D.box3(cam, X - 0.25, X + 0.25, y, y + 0.35, Z - 0.2, Z + 0.2, { side: '#7a7f8a', rear: '#8a8f9a', top: '#a4a9b4' }); }
    const q = D.toCam(cam, [fx, y + 0.8, fz]);
    if (q[2] > 1) { const [sx, sy] = D.scr(cam, q), rr = cam.F / q[2] * 2.2; g.save(); g.globalAlpha *= 0.3 + 0.08 * Math.sin(t * 13); g.fillStyle = '#ffb040'; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill(); g.restore(); }
    for (let k = 0; k < 3; k++) { const fl = 1 + 0.25 * Math.sin(t * 17 + k * 2), X = fx + (k - 1) * 0.35; D.poly3(cam, [[X - 0.3, y + 0.3, fz - 0.05 * k], [X + 0.3, y + 0.3, fz - 0.05 * k], [X, y + 0.3 + 1.2 * fl * (k === 1 ? 1.3 : 1), fz - 0.05 * k]], k === 1 ? '#ffd84a' : '#ff7a1a'); }
    [['#f05416', 5.2], ['#2a6fd6', 5.7], ['#ffd84a', 6.4], ['#e0413a', 6.9]].forEach(([col, X], k) => {   // skis and boards stuck upright in the snow
      const Z = z0 - 2.5 - (k % 2) * 0.4; D.box3(cam, X - 0.13, X + 0.13, y - 0.2, y + 1.8, Z - 0.05, Z + 0.05, { side: col, rear: col, top: '#ffffff' });
    });
  }
  function liftStation(D, R) {                                     // where the chairlift comes down: a hut, and the wheel the cable turns round
    const { cam } = R, zw = LIFT.towers[LIFT.towers.length - 1] + 8, X = LIFT_X, y = course.height(zw), wy = y + LIFT.h - 0.6, pts = [];
    D.box3(cam, X - 0.2, X + 0.2, y, wy, zw - 0.2, zw + 0.2, { side: '#6f7890', rear: '#8a93a8', top: '#a4acbf' });
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; pts.push([X + Math.cos(a) * LIFT.half, wy, zw + Math.sin(a) * LIFT.half]); }
    D.poly3(cam, pts, '#5b6477');
    chalet(D, R, X, zw + 2, 7, 2.8, 3.4, 6, { wins: [-1.5, 1.5], sign: '纜車' });
  }

  const GOAL_SIGN = 'GOAL 暖爐山屋';                             // (on the finish arch: where the long way down arrives)
  const theme = {
    spray: ['#ffffff', '#c6d8f2'], trail: '#cfdcef', ski: ['#f05416', '#ff965a', '#d8480f'],
    kicker: { side: '#c4d3ea', top: '#e3edfb', edge: '#f05416' },
    // sky in flat retro bands, sun, pixel clouds, snowy ridges
    sky(R) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R;
      const bands = ['#7fb2ea', '#8dbcee', '#9cc6f1', '#abd0f4', '#bad9f6', '#c9e2f8', '#d8ebfa', '#e7f3fc'];
      const bh = Math.max(40, hz + 40) / bands.length;
      bands.forEach((col, k) => D.rect(0, k * bh, W, bh + 1, col));
      D.rect(0, bands.length * bh, W, H, '#edf3fa');
      g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(W * 0.81 + pan * 0.05, hz - 330, 70, 0, 7); g.fill();
      D.clouds(t, 77, Math.round(5 * W / 1920) + 1, Math.max(40, hz - 360), 1, pan * 0.2);
      [[0.35, '#9fb3d6', '#e8f0fb', 3, 0.15], [0.62, '#b9c8e4', '#ffffff', 7, 0.3]].forEach(([k, col, cap, seed, par]) => {
        const off = pan * (0.3 + par) - zc * 4 * par;
        const r = rng(seed), heights = []; for (let i = 0; i < 40; i++) heights.push([120 + r() * 200, 170 + r() * 90]);
        const i0 = Math.floor((-300 - off) / 230);
        for (let i = i0; i < i0 + Math.ceil((W + 600) / 230) + 1; i++) {
          const [hh, pw] = heights[((i % 40) + 40) % 40], px = i * 230 + off, ph = hh * k * 1.6;
          g.fillStyle = col; g.beginPath(); g.moveTo(px - pw, hz + 30); g.lineTo(px, hz - ph); g.lineTo(px + pw, hz + 30); g.closePath(); g.fill();
          g.fillStyle = cap; g.beginPath(); g.moveTo(px - pw * 0.28, hz - ph * 0.72); g.lineTo(px, hz - ph); g.lineTo(px + pw * 0.28, hz - ph * 0.72); g.lineTo(px + pw * 0.1, hz - ph * 0.64); g.lineTo(px - pw * 0.08, hz - ph * 0.7); g.closePath(); g.fill();
        }
      });
    },
    // one slice of the slope: the snowfield in stripes, the snow walls, glints of sun
    slice(R, za, zb, near) {
      const D = root.SkiDraw, { cam, P3, t } = R, H_ = course.HALF, [bx, by, bw, bo] = BANK;
      const stripe = ((Math.floor(za / 8) % 2) + 2) % 2 ? '#ffffff' : '#f3f7fc';
      D.poly3(cam, [P3(za, -SKW), P3(za, SKW), P3(zb, SKW), P3(zb, -SKW)], stripe);
      for (const sd of [-1, 1]) {                                   // snow walls: outer face, top, inner face, black edge
        const q = (z, x, y) => P3(z, sd * x, y);
        if (near) D.poly3(cam, [q(za, H_ + bx + bw, by), q(zb, H_ + bx + bw, by), q(zb, H_ + bo + bw, 0), q(za, H_ + bo + bw, 0)], '#e6edf7');
        D.poly3(cam, [q(za, H_ + bx, by), q(zb, H_ + bx, by), q(zb, H_ + bx + bw, by), q(za, H_ + bx + bw, by)], '#ffffff');
        D.poly3(cam, [q(za, H_, 0), q(zb, H_, 0), q(zb, H_ + bx, by), q(za, H_ + bx, by)], '#c7d6ec');
        D.poly3(cam, [q(za, H_ + bx - 0.06, by + 0.01), q(zb, H_ + bx - 0.06, by + 0.01), q(zb, H_ + bx + 0.12, by + 0.01), q(za, H_ + bx + 0.12, by + 0.01)], '#1a1a1a');
      }
      const gr = rng(9000 + za);                                   // glints of sun on the snow
      for (let k = 0; k < (near ? 2 : 0); k++) {
        const gx = (gr() - 0.5) * 30, gz = lerp(za, zb, gr()), ph = gr() * 6.3, sp = 4 + gr() * 5;
        const tw = Math.pow(Math.max(0, Math.sin(t * sp + ph)), 6);
        if (tw < 0.05) continue;
        const qq = D.toCam(cam, P3(gz, gx, 0.02)); if (qq[2] < 2) continue;
        const [px, py] = D.scr(cam, qq), arm = Math.max(4, Math.round(cam.F / qq[2] * 0.16 / 4) * 4);
        D.rect(px - arm, py - 2, arm * 2, 4, '#8fb6f0', tw); D.rect(px - 2, py - arm, 4, arm * 2, '#8fb6f0', tw); D.rect(px - 2, py - 2, 4, 4, '#ffffff', tw);
      }
    },
    // pines, the chairlift and its chairs
    scenery(R) {
      const D = root.SkiDraw, { cam, add, lo, hi, zc, wx, t } = R;
      // the other mascots cheering on wooden stands (snow on them) either side of the finish
      if (R.zc > 1500 - 160) root.SkiWorld.crowd(R, { z0: 1450, z1: 1525, stand: { top: '#f4f8ff', top2: '#e6eef8', face: '#9a6a3a' } });
      if (R.zc > 1360) {                                           // 暖爐山屋 past the finish, its cabins behind the stands, the lift's bottom station
        {                                                          // (seen from far up the slope, past where the course is drawn: the snow beyond is the sky's ground colour)
          add(LODGE.z + LODGE.d / 2, () => chalet(D, R, 0, LODGE.z, LODGE.d, LODGE.hw, LODGE.wall, LODGE.ridge, { sign: '暖爐山屋', chimney: true, lights: true, wins: [-8.5, -4.5, 4.5, 8.5] }), false, 0);
          add(LODGE.z - 3, () => lodgeDeck(D, R), false, 0);
        }
        for (const c of CABINS) if (c.z > lo - 10 && c.z < hi + 10) add(c.z + 3, () => chalet(D, R, c.x, c.z, 6, 2.6, 3, 5.4, { sign: c.sign, wins: [-1.5, 1.5] }), false, c.x);
        const zs = LIFT.towers[LIFT.towers.length - 1] + 8;
        if (zs > lo - 10 && zs < hi + 10) add(zs + 4, () => liftStation(D, R), false, LIFT_X);
      }
      for (const tr of TREES) {
        if (tr.z < lo || tr.z > hi || (Math.abs(tr.z - zc) > 70 && Math.abs(tr.x) > course.HALF + 12)) continue;   // the outer row fades out first
        add(tr.z, () => pine(D, cam, wx(tr.z, tr.x), tr.z, course.height(tr.z), tr.h, Math.abs(tr.z - zc) > 45));
      }
      LIFT.towers.forEach((tz, k) => {
        if (tz < lo - 16 || tz > hi) return;
        const y0 = course.height(tz), X = wx(tz, LIFT_X);
        add(tz, () => {
          D.box3(cam, X - 0.18, X + 0.18, y0, y0 + LIFT.h, tz - 0.18, tz + 0.18, { side: '#6f7890', rear: '#8a93a8', top: '#a4acbf' });
          D.box3(cam, X - LIFT.half - 0.3, X + LIFT.half + 0.3, y0 + LIFT.h - 0.3, y0 + LIFT.h, tz - 0.15, tz + 0.15, { side: '#5b6477', rear: '#8a93a8', top: '#a4acbf' });
        });
        const zn = LIFT.towers[k + 1];
        if (zn !== undefined) for (let j = 0; j < 4; j++) {
          const za_ = lerp(tz, zn, j / 4), zb_ = lerp(tz, zn, (j + 1) / 4);
          add((za_ + zb_) / 2, () => [-LIFT.half, LIFT.half].forEach(o => {
            const ya = liftCable(za_), yb = liftCable(zb_), xa = wx(za_, LIFT_X) + o, xb = wx(zb_, LIFT_X) + o;
            D.poly3(cam, [[xa, ya, za_], [xb, yb, zb_], [xb, yb + 0.07, zb_], [xa, ya + 0.07, za_]], '#3a4152');
          }));
        }
      });
      for (const dir of [1, -1]) for (let k = 0; ; k++) {          // chairs ride up the course side, come back on the far side
        const z = Math.floor(lo / 11) * 11 + k * 11 + ((dir * t * 2.2) % 11 + 11) % 11 - 11;
        if (z > hi) break;
        if (z < lo || Math.abs(z - zc) > 80 || z > LIFT.towers[LIFT.towers.length - 1]) continue;
        const x = wx(z, LIFT_X) + (dir > 0 ? LIFT.half : -LIFT.half), yc = liftCable(z);
        if (Math.abs(z - zc) > 35) { add(z, () => D.poly3(cam, [[x - 0.55, yc - 1.5, z], [x + 0.55, yc - 1.5, z], [x + 0.55, yc - 0.75, z], [x - 0.55, yc - 0.75, z]], '#2a6fd6')); continue; }
        add(z, () => {
          D.box3(cam, x - 0.04, x + 0.04, yc - 1.3, yc, z - 0.04, z + 0.04, { side: '#3a4152', rear: '#3a4152', top: '#3a4152' });
          D.box3(cam, x - 0.55, x + 0.55, yc - 1.5, yc - 1.25, z - 0.3, z + 0.3, { side: '#2a6fd6', rear: '#1e4f9a', top: '#4d8ae6' });
          D.box3(cam, x - 0.55, x + 0.55, yc - 1.25, yc - 0.75, z + 0.22, z + 0.3, { side: '#2a6fd6', rear: '#1e4f9a', top: '#4d8ae6' });
        });
      }
    },
    // red / blue gates (banners above the camera), START and GOAL in orange with a label
    gate(R, z, i, label) {
      const D = root.SkiDraw, { cam, P3, wx } = R, h = course.height(z);
      const col = label ? D.C.orange : i % 2 ? '#2a6fd6' : '#e0413a';
      const y = h + BANK[1], big = !!label, x = course.HALF + 0.9, y0 = y + (big ? 6.0 : 5.8), y1 = y + (big ? 7.5 : 6.9);
      [-x, x].forEach(gx => { const xx = wx(z, gx); D.box3(cam, xx - 0.16, xx + 0.16, y - 0.3, y1, z - 0.16, z + 0.16, { side: '#5b6477', rear: '#8a93a8', top: '#8a93a8' }); });
      const f = D.poly3(cam, [P3(z, -x, y0 - h), P3(z, x, y0 - h), P3(z, x, y1 - h), P3(z, -x, y1 - h)], col);
      D.poly3(cam, [P3(z - 0.01, -x, y0 - h), P3(z - 0.01, x, y0 - h), P3(z - 0.01, x, y0 - h + 0.18), P3(z - 0.01, -x, y0 - h + 0.18)], '#ffffff');
      if (f && label) {
        D.print(cam, P3(z - 0.02, -x, y1 - h), P3(z - 0.02, x, y1 - h), P3(z - 0.02, -x, y0 + 0.18 - h), label === 'GOAL' ? GOAL_SIGN : label, { w: 2 * x, h: y1 - y0 - 0.18 });   // (printed on the banner: it leans with it)
      }
    },
    obstacle(R, o, i) {
      const D = root.SkiDraw;
      if (o.k === 'rock' || o.k === 'snowman') R.billboard(ART[o.k], o.z, o.x, 0);
      else if (o.k === 'fence') fence(D, R, o);
      else lowBanner(D, R, o, i);
    },
    // falling snow
    weather({ t }) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, r = rng(Math.floor(t * 30));
      g.fillStyle = '#ffffff';
      for (let k = 0; k < 40; k++) { const fx = (r() * W + t * 60) % W, fy = (r() * H + t * (140 + k * 3)) % H; g.globalAlpha = 0.9; g.fillRect(fx, fy, 8, 8); }
      g.globalAlpha = 1;
    },
    // map-screen thumbnail: a snowy peak, pines and the slope (pixel art in rects)
    badge(g, x, y, w, h) {
      const u = Math.max(4, Math.round(h / 40 / 2) * 2), R = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      R(0, 0, 1, 0.55, '#8dbcee'); R(0, 0.55, 1, 0.45, '#ffffff');
      g.fillStyle = '#b9c8e4'; g.beginPath(); g.moveTo(x + 0.05 * w, y + 0.58 * h); g.lineTo(x + 0.38 * w, y + 0.16 * h); g.lineTo(x + 0.72 * w, y + 0.58 * h); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + 0.3 * w, y + 0.26 * h); g.lineTo(x + 0.38 * w, y + 0.16 * h); g.lineTo(x + 0.46 * w, y + 0.26 * h); g.fill();
      g.fillStyle = '#fff3b0'; g.fillRect(x + 0.8 * w, y + 0.1 * h, u * 3, u * 3);
      for (const [px, s] of [[0.12, 1], [0.22, 0.8], [0.82, 1.1], [0.92, 0.8]]) {
        g.fillStyle = '#2e7050'; g.beginPath(); g.moveTo(x + (px - 0.05 * s) * w, y + 0.78 * h); g.lineTo(x + px * w, y + (0.78 - 0.32 * s) * h); g.lineTo(x + (px + 0.05 * s) * w, y + 0.78 * h); g.fill();
      }
      g.fillStyle = '#c7d6ec'; g.beginPath(); g.moveTo(x + 0.44 * w, y + 0.58 * h); g.lineTo(x + 0.56 * w, y + 0.58 * h); g.lineTo(x + 0.8 * w, y + h); g.lineTo(x + 0.2 * w, y + h); g.fill();
      R(0.47, 0.8, 0.06, 0.04, '#f05416');
    },
  };

  root.SkiMaps.define('snow', { desc: '經典雪坡：閃過雪人、跳過柵欄、蹲過旗門', course, theme, music: { race: 'snow', result: 'snow_result' }, score: root.SkiScore.DEF, bg: '#7fb2ea' });
})(typeof window !== 'undefined' ? window : globalThis);

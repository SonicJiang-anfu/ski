'use strict';
// 新手 · 大漠沙丘: sand-skiing across a golden desert in the afternoon sun. Its tricks: the whole course rolls over
// dunes, and every crest throws her into the air (coins hang along the flight); quicksand patches swirl on the
// track and drag her to a crawl; tumbleweeds roll back and forth across it; and the course runs straight through a
// great pyramid, a torch-lit stone corridor with daylight at the far end. Clay pots to hop, saguaros to go round,
// low stone walls to jump, striped awnings to crouch under. Sand berms line the course and slow her down.
// Around it: dunes, oases with palms and tents, obelisks, ruined columns, camels, far pyramids, hot-air balloons.
(function (root) {
  const { clamp, lerp, seg, rng, mixHex, obX } = root.SkiCore;

  // ------------------------------------------------------------ course
  const FINISH = 1500, PYR = [818, 978];                       // the corridor through the pyramid
  const DUNE = zk => [[zk, null], [zk + 2, -0.1], [zk + 14, -0.1], [zk + 16, 0.6], [zk + 30, 0.5]];   // up a short dune, over the crest, a steep drop
  const dunes = (list, after) => list.flatMap((zk, i) => DUNE(zk).map(([z, g]) => [z, g === null ? after[i][0] : g]).concat([[zk + 36, after[i][1]]]));
  const course = root.SkiCourse.build({
    id: 'desert', HALF: 7, FINISH, LENGTH: 1580, START: 4,
    phys: { DRIFT: 0.3, CENT: 0.6, WALL_DRAG: 1.4 },            // curves push her out a little, the sand berms slow her a little less than snow
    flow: true,
    CX: [[0, 0], [60, 0], [120, -5], [180, 5], [230, 0],
      [270, -8], [315, 7], [360, -6], [400, -15], [440, -18], [480, -15], [520, -6], [560, 0],   // ② S-bends, then one long turn
      [620, 5], [680, -5], [740, 5], [800, 0],
      [812, 0], [990, 0], [1000, 0],                                                             // ④ dead straight through the pyramid
      [1040, 8], [1090, -6], [1130, 6], [1170, 0],
      [1210, -15], [1250, -20], [1290, -15], [1330, 0], [1370, 15], [1410, 20], [1450, 15],     // ⑤ two big sweeping turns
      [1490, 0], [1500, 0], [1580, 0]],
    GRADE: [[0, 0.02], [12, 0.05], [24, 0.16], [100, 0.18],
      ...dunes([136], [[0.2, 0.2]]), [230, 0.2], [520, 0.22],
      ...dunes([570, 620, 670, 720, 770], [[0.22, 0.3], [0.3, 0.3], [0.3, 0.3], [0.3, 0.3], [0.3, 0.22]]),   // steeper between them, to keep her speed up   // ③ a row of five dunes
      [804, 0.22], [818, 0.18], [978, 0.18], [1000, 0.22],
      ...dunes([1020, 1150, 1300], [[0.22, 0.22], [0.24, 0.26], [0.28, 0.3]]),
      [1480, 0.32], [1500, 0.12], [1540, 0.0], [1580, 0.0]],
    sections: [{ name: '沙丘起步', z0: 0 }, { name: '仙人掌谷', z0: 230 }, { name: '連綿沙丘', z0: 560 }, { name: '金字塔', z0: 800 }, { name: '風沙衝刺', z0: 1000 }],
  }, (c, P) => {
    const FULL = P.FULL;
    const pot = (z, x) => P.hop('pot', z, x, 0.7);                         // clay pot: hop it or go round
    const cactus = (z, x) => P.tall('cactus', z, x, 0.8);                 // saguaro: go round
    const wall = z => P.hop('wall', z, 0, FULL / 2, { hd: 0.4 });         // low stone wall across: jump
    const awning = z => P.over('awning', z, 0, FULL);                     // striped awning: crouch
    const weed = (z, x, amp, period) => P.roll('weed', z, x, 0.6, amp, period, { h: 0.85 });   // tumbleweed rolling to and fro: hop it
    const { coin, row, arc, sand } = P;
    const crest = zk => zk + 15;
    // ① 沙丘起步: pots, the first tumbleweeds, one small dune to learn the air
    pot(60, 3); pot(95, -2.5); weed(118, 0, 3.5, 4.2); pot(190, -3); pot(190, 3); weed(212, 0, 3.5, 4);
    row(28, 0, 4); row(50, -3, 4); row(76, 2.5, 4); arc(crest(136), 0, 5); row(176, 0, 3);
    // ② 仙人掌谷: saguaros and pots in pairs at the S-bends, then a long turn with quicksand on its outside
    cactus(255, 0); pot(255, -4.2);
    pot(285, 3.5); cactus(285, -2);
    cactus(318, 2.5); pot(318, -4);
    sand(335, 3.2, 2.6, 12); cactus(360, -1);
    cactus(400, 1.5); sand(410, -4.4, 2.4, 14); cactus(440, 2.5); sand(465, -4.4, 2.4, 14);
    weed(485, 0, 3.5, 4.5); pot(515, 2); cactus(540, -2);
    row(240, 2, 4); row(268, -3.5, 4); row(296, 0, 4); row(326, -1.5, 3); row(370, 2, 3); row(418, -0.5, 4); row(470, 0, 3); row(525, -1, 3);
    // ③ 連綿沙丘: five dunes in a row, coins all along every flight; tumbleweeds and pots on the climbs
    weed(628, 0, 3.5, 4); pot(676, -3.5); pot(676, 3.5); weed(728, 0, 4, 4.5);
    sand(606, 3.6, 2.4, 8); sand(756, -3.6, 2.4, 8);
    [[570, 0], [620, -2], [670, 2], [720, 0], [770, 0]].forEach(([zk, x]) => arc(crest(zk), x, 5));
    row(662, 0, 3);
    // ④ 金字塔: a long torch-lit corridor through the great pyramid: awnings, pots, low walls
    awning(838); pot(856, -2.5); pot(856, 2.5); wall(874); awning(894); pot(912, 0); awning(930); wall(950); awning(966);
    for (const z of [838, 894, 930, 966]) { coin(z, -1.5, 0.6); coin(z, 1.5, 0.6); }
    row(850, 0, 3); coin(874, 0, 2.0); row(906, 2.5, 3); coin(950, 0, 2.0); row(984, 0, 4);
    // ⑤ 風沙衝刺: three more dunes and two big sweeping turns with quicksand on their outsides
    cactus(1075, 0); cactus(1100, -3); pot(1100, 3); weed(1130, 0, 3.5, 4);
    pot(1205, 2); awning(1222); sand(1235, -4.5, 2.2, 16); cactus(1260, 1); weed(1282, 0, 3.5, 4.5);
    awning(1360); sand(1385, 4.5, 2.2, 16); pot(1400, -2); weed(1430, 0, 4, 4.2); cactus(1458, -2.6); cactus(1458, 2.6); wall(1482);
    arc(crest(1020), 0, 5); row(1066, 2.5, 3); arc(crest(1150), 0, 5);
    row(1210, -1, 3); coin(1222, -1.5, 0.6); coin(1222, 1.5, 0.6); row(1266, -2, 3); arc(crest(1300), 0, 5);
    coin(1360, -1.5, 0.6); coin(1360, 1.5, 0.6); row(1405, 1, 3); coin(1482, 0, 2.0);
  });

  root.SkiCourse.fitFlights(course);                           // the dune coins go where she really flies

  // ------------------------------------------------------------ look
  const H_ = course.HALF, SKW = 40, BANK = [0.7, 0.85, 1.4, 2.4];
  const inPyr = z => z >= PYR[0] && z <= PYR[1];
  const PB = 84, PH = 92, CEIL = 7.5;                          // the pyramid's half base and height; the corridor's ceiling
  const SAND = ['#f2cf8a', '#efc982'], BERM = { in: '#e2b46a', top: '#f6d89c', out: '#ecc47c', edge: '#8a5a26' };

  const PIX = {
    pot: { cs: 0.12, cols: { K: '#6b3a1a', O: '#c8642c', Y: '#f2c14e', D: '#9a4a20' }, rows: [
      '...KKKK...', '..KOOOOK..', '...KOOK...', '..KOOOOK..', '.KOOYYOOK.', 'KOOYOOYOOK', 'KOOOOOOOOK', '.KOODDOOK.', '..KKKKKK..'] },
    cactus: { cs: 0.14, cols: { G: '#3f9a4e', L: '#7cd07a', D: '#c9955a' }, rows: [
      '.....GG.....', '....GLGG....', '....GLGG....', '.G..GLGG....', 'GLG.GLGG..G.', 'GLG.GLGG.GLG', 'GLG.GLGG.GLG', 'GLGGGLGG.GLG',
      '.GGGGLGG.GLG', '....GLGGGGLG', '....GLGGGGG.', '....GLGG....', '....GLGG....', '....GLGG....', '....GLGG....', '....GLGG....', '...DGLGGD...', '..DDDDDDDD..'] },
    weed: { cs: 0.09, cols: { B: '#a67a3e', C: '#c99a58' }, rows: [
      '...BBBBBB...', '..B.BC.B.B..', '.BBC..BB.BB.', 'B..BBC..B..B', 'B.B..BBB..BB', 'BB.BC..B.C.B', 'B.C.BB..BB.B', 'BB..B.BC..BB',
      'B.BB.C..BB.B', '.BB..BB.B.B.', '..B.B..BBB..', '...BBBBBB...'] },
    camel: [[
      '..............DD..', '.............DYYY.', '.............YYKYD', '......DD.....YYY..', '.....DRRD...YY....', '...DRRRRRD.YY.....', '..DYYYYYYYYYY.....',
      '.DYYYYYYYYYYY.....', 'DYYYYYYYYYYYD.....', 'YDYYYYYYYYYD......', '..YY.YY..YY.YY....', '..YY.YY..YY.YY....', '..DD.DD..DD.DD....'],
    ['..............DD..', '.............DYYY.', '.............YYKYD', '......DD.....YYY..', '.....DRRD...YY....', '...DRRRRRD.YY.....', '..DYYYYYYYYYY.....',
      '.DYYYYYYYYYYY.....', 'DYYYYYYYYYYYD.....', 'YDYYYYYYYYYD......', '...YYYY....YYYY...', '..YY..YY..YY..YY..', '..DD..DD..DD..DD..']],
  };
  const CAMEL_COLS = { Y: '#d9a45a', D: '#a8742f', K: '#1a1a1a', R: '#d8443a' };

  // ---- the park of the desert: dunes, oases (pond, palms, a tent), obelisks, ruins, camels, cacti, far pyramids
  const SCENE = (() => {
    const r = rng(2468), mounds = [], oases = [], palms = [], tents = [], obelisks = [], ruins = [], camels = [], cacti = [], pyramids = [];
    const nearPyr = (z, x, m = 3) => z > PYR[0] - m && z < PYR[0] + 2 * PB + m && Math.abs(x) < PB + m;
    for (let z = 60, k = 0; z < FINISH; z += 120 + r() * 50, k++) {     // oases, alternating sides
      const sd = k % 2 ? 1 : -1, x = sd * (H_ + 13 + r() * 5), len = 12 + r() * 5, w = 7 + r() * 3;
      if (nearPyr(z, x, 12)) continue;
      oases.push({ z, len, x, hw: w / 2 });
      for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + r(); palms.push({ z: z + len / 2 + Math.sin(a) * (len / 2 + 1.6), x: x + Math.cos(a) * (w / 2 + 1.6), h: 4.6 + r() * 2, lean: (r() - 0.5) * 1.8 }); }
      tents.push({ z: z + len + 3, x: x + sd * 4, col: r() < 0.5 ? '#d8443a' : '#2f86c8' });
    }
    const clear = (z, x, m) => !oases.some(o => z > o.z - m && z < o.z + o.len + m && Math.abs(x - o.x) < o.hw + m) && !nearPyr(z, x);
    for (let z = 90, k = 0; z < FINISH + 40; z += 95 + r() * 40, k++) {
      const sd = k % 2 ? -1 : 1, x = sd * (H_ + 15 + r() * 5);
      if (clear(z, x, 4)) obelisks.push({ z, x, h: 11 + r() * 4 });
    }
    for (let z = 150, k = 0; z < FINISH; z += 100 + r() * 40, k++) {
      const sd = k % 2 ? 1 : -1, x = sd * (H_ + 9 + r() * 4);
      if (!clear(z, x, 5)) continue;
      const n = 3 + ((r() * 2) | 0);
      ruins.push({ z, x, cols: Array.from({ length: n }, (_, j) => ({ dz: j * 3.2, h: [7, 4.5, 7, 2.5, 6][j] * (0.8 + r() * 0.3) })) });
    }
    for (let z = 200, k = 0; z < FINISH; z += 230 + r() * 60, k++) {    // caravans of four
      const sd = k % 2 ? -1 : 1, x = sd * (H_ + 20 + r() * 6);
      for (let j = 0; j < 4; j++) if (clear(z + j * 3.4, x, 3)) camels.push({ z: z + j * 3.4, x, ph: j * 0.7 });
    }
    for (let z = -10; z < course.LENGTH + 130; z += 5) for (const sd of [-1, 1]) {
      if (r() < 0.55) { const x = sd * (H_ + 5 + r() * 32), zz = z + r() * 4; if (clear(zz, x, 2)) mounds.push({ z: zz, x, w: 6 + r() * 10, h: 1.5 + r() * 4.5 }); }
      if (r() < 0.16) { const x = sd * (H_ + 3.5 + r() * 14), zz = z + r() * 4; if (clear(zz, x, 2)) cacti.push({ z: zz, x, s: 1.4 + r() * 0.7 }); }
    }
    for (const [z, x, b, h] of [[260, -80, 22, 30], [520, 90, 26, 36], [700, -95, 20, 28], [1100, 85, 24, 32], [1250, -88, 28, 38], [1420, 92, 18, 24]]) pyramids.push({ z, x, b, h });
    const byZ = a => a.sort((p, q) => p.z - q.z);
    return { mounds: byZ(mounds), oases, palms: byZ(palms), tents, obelisks, ruins, camels, cacti: byZ(cacti), pyramids };
  })();

  // ---- pieces
  // an oval patch on the ground (quicksand, a pond), only the part inside slice [za, zb]; scale s0 → s1 is a ring
  // (s1 0: filled); drawn in 1-unit strips so the edge stays round
  function oval(D, R, q, za, zb, s0, s1, col, up, alpha = 1) {
    const cz = q.z + q.len / 2, L = q.len / 2, half = (z, s) => { const u = (z - cz) / (L * s); return s > 0 && Math.abs(u) < 1 ? q.hw * s * Math.sqrt(1 - u * u) : 0; };
    const z0 = Math.max(za, cz - L * s0), z1 = Math.min(zb, cz + L * s0);
    for (let z = z0; z < z1 - 1e-6; z += 1) {
      const zz = Math.min(z1, z + 1), oa = half(z, s0), ob = half(zz, s0), ia = half(z, s1), ib = half(zz, s1);
      if (ia <= 0 && ib <= 0) { D.poly3(R.cam, [R.S3(z, q.x - oa, up), R.S3(z, q.x + oa, up), R.S3(zz, q.x + ob, up), R.S3(zz, q.x - ob, up)], col, alpha); continue; }
      for (const sd of [-1, 1]) D.poly3(R.cam, [R.S3(z, q.x + sd * oa, up), R.S3(z, q.x + sd * ia, up), R.S3(zz, q.x + sd * ib, up), R.S3(zz, q.x + sd * ob, up)], col, alpha);
    }
  }
  function quicksand(D, R, q, za, zb) {                          // wet dark sand with rings sinking into the middle
    oval(D, R, q, za, zb, 1, 0, '#c99252', 0.02);
    for (let j = 0; j < 3; j++) { const s = 1 - ((R.t * 0.45 + j / 3) % 1) * 0.85; oval(D, R, q, za, zb, s, Math.max(0, s - 0.1), '#a46a2c', 0.025); }
    oval(D, R, q, za, zb, 0.22, 0, '#7a4a1e', 0.03);
  }
  function berms(D, R, za, zb, near) {                           // low sand berms either side, a dark line on the edge
    const { cam, P3 } = R, [bx, by, bw, bo] = BANK;
    for (const sd of [-1, 1]) {
      const q = (z, x, y) => P3(z, sd * x, y);
      if (near) D.poly3(cam, [q(za, H_ + bx + bw, by), q(zb, H_ + bx + bw, by), q(zb, H_ + bo + bw, 0), q(za, H_ + bo + bw, 0)], BERM.out);
      D.poly3(cam, [q(za, H_ + bx, by), q(zb, H_ + bx, by), q(zb, H_ + bx + bw, by), q(za, H_ + bx + bw, by)], BERM.top);
      D.poly3(cam, [q(za, H_, 0), q(zb, H_, 0), q(zb, H_ + bx, by), q(za, H_ + bx, by)], BERM.in);
      D.poly3(cam, [q(za, H_ + bx - 0.06, by + 0.01), q(zb, H_ + bx - 0.06, by + 0.01), q(zb, H_ + bx + 0.12, by + 0.01), q(za, H_ + bx + 0.12, by + 0.01)], BERM.edge);
    }
  }
  // the corridor through the pyramid over [za, zb]: stone walls with a band and glyph tiles, torches, a ceiling
  const STONE = ['#b9894c', '#a87a40'], GLYPH = '#6b4422';
  function corridor(D, R, za, zb, near) {
    const { cam, P3, t } = R, W = H_ + 0.2, stripe = ((Math.floor(za / 2) % 2) + 2) % 2;
    for (const sd of [-1, 1]) {
      const q = (z, y) => P3(z, sd * W, y), n = [-sd, 0, 0];
      D.poly3(cam, [q(za, 0), q(zb, 0), q(zb, CEIL), q(za, CEIL)], STONE[stripe], 1, n);
      D.poly3(cam, [q(za, 3.4), q(zb, 3.4), q(zb, 3.9), q(za, 3.9)], '#8a5a26', 1, n);
      if (!near) continue;
      const gr = rng(700 + za * 3 + sd);
      for (let k = 0; k < 2; k++) {                               // glyph tiles: little rows of marks
        const z0 = lerp(za, zb, gr() * 0.6), y0 = 4.5 + gr() * 1.4, w = 0.25 + gr() * 0.3, h = 0.3 + gr() * 0.4;
        D.poly3(cam, [P3(z0, sd * (W - 0.01), y0), P3(z0 + w, sd * (W - 0.01), y0), P3(z0 + w, sd * (W - 0.01), y0 + h), P3(z0, sd * (W - 0.01), y0 + h)], GLYPH, 1, n);
      }
    }
    D.poly3(cam, [P3(za, -W, CEIL), P3(za, W, CEIL), P3(zb, W, CEIL), P3(zb, -W, CEIL)], '#7a5530', 1, [0, -1, 0]);
    if (near) for (let tz = Math.ceil(za / 8) * 8; tz < zb; tz += 8) for (const sd of [-1, 1]) {   // a torch on each wall every 8
      if (Math.abs(tz - R.zc) < 2) continue;
      const x = sd * (W - 0.05), fl = 0.85 + 0.15 * Math.sin(t * 23 + tz + sd) + 0.08 * Math.sin(t * 37 + tz);
      D.poly3(cam, [P3(tz - 0.6, x, 4.2), P3(tz + 0.6, x, 4.2), P3(tz + 0.6, x, 5.8), P3(tz - 0.6, x, 5.8)], '#ffcf6b', 0.25);
      D.poly3(cam, [P3(tz - 0.08, x, 3.9), P3(tz + 0.08, x, 3.9), P3(tz + 0.08, x, 4.6), P3(tz - 0.08, x, 4.6)], '#3a2412');
      D.poly3(cam, [P3(tz - 0.22, x - sd * 0.02, 4.6), P3(tz + 0.22, x - sd * 0.02, 4.6), P3(tz, x - sd * 0.02, 4.6 + 0.75 * fl)], '#ff8a1e');
      D.poly3(cam, [P3(tz - 0.1, x - sd * 0.03, 4.62), P3(tz + 0.1, x - sd * 0.03, 4.62), P3(tz, x - sd * 0.03, 4.62 + 0.42 * fl)], '#fff1a8');
    }
  }
  function portal(D, R, z) {                                     // the stone gateway round a mouth of the corridor
    const { cam, P3 } = R, a = H_ + 0.2, b = H_ + 1.6;
    for (const sd of [-1, 1]) D.poly3(cam, [P3(z, sd * a, 0), P3(z, sd * b, 0), P3(z, sd * b, 9), P3(z, sd * a, 9)], '#c8964f');
    D.poly3(cam, [P3(z, -a, CEIL), P3(z, a, CEIL), P3(z, a, 9), P3(z, -a, 9)], '#b8853f');
    D.poly3(cam, [P3(z - 0.01, -b - 0.4, 9), P3(z - 0.01, b + 0.4, 9), P3(z - 0.01, b + 0.4, 9.8), P3(z - 0.01, -b - 0.4, 9.8)], '#a87536');
    D.poly3(cam, [P3(z - 0.02, -1.2, 7.9), P3(z - 0.02, 1.2, 7.9), P3(z - 0.02, 1.2, 8.7), P3(z - 0.02, -1.2, 8.7)], '#ffd84a');   // a gold sun disc on the lintel
  }
  // the great pyramid seen from outside: its sides, then the face with a hole where the corridor goes in
  function pyramid(D, R) {
    const { cam, wx } = R, z0 = PYR[0], X = wx(z0, 0), y0 = course.height(z0) - 0.2, zc = z0 + PB, za = zc + PB, ya = course.height(zc) + PH, y1 = course.height(za) - 0.2;
    const A = [X, ya, zc], FL = [X - PB, y0, z0], FR = [X + PB, y0, z0];
    // the sides only when seen from outside them: drawn anyway, from the doorway they would show through the hole
    // in the face, over the corridor
    const side = (P0, P1, sd, col) => {
      const u = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]], w = [A[0] - P0[0], A[1] - P0[1], A[2] - P0[2]];
      let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      if (Math.sign(n[0]) !== sd) n = n.map(v => -v);
      D.poly3(cam, [P0, P1, A], col, 1, n);
    };
    side(FL, [X - PB, y1, za], -1, '#c99a55'); side(FR, [X + PB, y1, za], 1, '#d6aa62');
    const Wh = H_ + 1.6, Hh = 9, v = Hh / (ya - y0), on = (x, vv) => [x, y0 + vv * (ya - y0), z0 + vv * PB];
    const eL = on(X - PB * (1 - v), v), eR = on(X + PB * (1 - v), v);
    D.poly3(cam, [FL, [X - Wh, y0, z0], on(X - Wh, v), eL], '#e8c27a');
    D.poly3(cam, [[X + Wh, y0, z0], FR, eR, on(X + Wh, v)], '#e8c27a');
    D.poly3(cam, [eL, eR, A], '#e8c27a');
    for (let k = 1; k < 9; k++) {                                // courses of stone blocks
      const vv = v + (1 - v) * k / 9, l = on(X - PB * (1 - vv), vv), r = on(X + PB * (1 - vv), vv), l2 = on(X - PB * (1 - vv) + 0.3, vv + 0.006), r2 = on(X + PB * (1 - vv) - 0.3, vv + 0.006);
      D.poly3(cam, [l, r, r2, l2], '#d4ab64');
    }
    const cv = 0.9, cl = on(X - PB * (1 - cv), cv), cr = on(X + PB * (1 - cv), cv);
    D.poly3(cam, [cl, cr, A], '#ffd84a');                       // golden capstone
    portal(D, R, z0);
  }
  function obelisk(D, cam, X, z, gy, h, near) {
    const b = 0.9, tp = 0.55, H = h, pts = (s, y) => [[X - s, y, z - s], [X + s, y, z - s], [X + s, y, z + s], [X - s, y, z + s]];
    const lo_ = pts(b, gy), hi_ = pts(tp, gy + H), ap = [X, gy + H + 1.3, z];
    D.poly3(cam, [lo_[3], lo_[0], hi_[0], hi_[3]], '#b8925a'); D.poly3(cam, [lo_[1], lo_[2], hi_[2], hi_[1]], '#c9a06a');
    D.poly3(cam, [lo_[0], lo_[1], hi_[1], hi_[0]], '#d9b47a');
    D.poly3(cam, [hi_[0], hi_[1], ap], '#ffd84a'); D.poly3(cam, [hi_[3], hi_[0], ap], '#e0b030'); D.poly3(cam, [hi_[1], hi_[2], ap], '#f2c440');
    if (near) for (let k = 0; k < 4; k++) { const y = gy + H * (0.25 + k * 0.15), w = lerp(b, tp, (y - gy) / H) * 0.45; D.poly3(cam, [[X - w, y, z - 0.92], [X + w, y, z - 0.92], [X + w, y + 0.45, z - 0.92], [X - w, y + 0.45, z - 0.92]], '#8a6232'); }
  }
  function column(D, cam, X, z, gy, h) {
    D.box3(cam, X - 0.45, X + 0.45, gy, gy + h, z - 0.45, z + 0.45, { side: '#d9bb84', rear: '#ead0a0', top: '#f2dcae' });
    if (h > 5) D.box3(cam, X - 0.7, X + 0.7, gy + h, gy + h + 0.4, z - 0.7, z + 0.7, { side: '#cdae78', rear: '#e2c690', top: '#f2dcae' });
  }
  function tent(D, cam, X, z, gy, col) {                         // a striped tent: two roof slopes and the front
    const w = 1.8, h = 2.4, d = 1.6;
    D.poly3(cam, [[X - w, gy, z + d], [X, gy + h, z + d], [X, gy + h, z - d], [X - w, gy, z - d]], col);
    D.poly3(cam, [[X + w, gy, z + d], [X, gy + h, z + d], [X, gy + h, z - d], [X + w, gy, z - d]], mixHex(col, '#000000', 0.2));
    D.poly3(cam, [[X - w, gy, z - d], [X + w, gy, z - d], [X, gy + h, z - d]], '#f4ead2');
    D.poly3(cam, [[X - 0.5, gy, z - d - 0.01], [X + 0.5, gy, z - d - 0.01], [X, gy + 1.4, z - d - 0.01]], '#3a2412');
  }
  function palm(D, cam, x, z, y0, h, lean, far) {
    const T = [x + lean, y0 + h];
    D.poly3(cam, [[x - 0.2, y0, z], [x + 0.2, y0, z], [T[0] + 0.13, T[1], z], [T[0] - 0.13, T[1], z]], '#9a6a3a');
    if (far) { D.poly3(cam, [[T[0] - 2, T[1] - 0.6, z], [T[0], T[1] + 0.5, z], [T[0] + 2, T[1] - 0.6, z], [T[0], T[1] - 0.2, z]], '#2f9a52'); return; }
    for (const [ang, len, col] of [[2.85, 2.2, '#2f8a4a'], [0.3, 2.2, '#2f8a4a'], [2.1, 1.9, '#3aa65a'], [1.05, 1.9, '#3aa65a'], [1.57, 1.4, '#47b866']]) {
      const dx = Math.cos(ang), dy = Math.sin(ang), tip = [T[0] + dx * len, T[1] + dy * len * 0.55 - 0.25 * Math.abs(dx) * len];
      const mid = [T[0] + dx * len * 0.5, T[1] + dy * len * 0.4], nx = -dy * 0.32, ny = dx * 0.32;
      D.poly3(cam, [[T[0], T[1], z - 0.01], [mid[0] + nx, mid[1] + ny, z - 0.01], [tip[0], tip[1], z - 0.01], [mid[0] - nx * 0.4, mid[1] - ny * 0.4, z - 0.01]], col);
    }
  }
  function mound(D, cam, X, z, gy, w, h) {                       // a dune beside the course: lit side and shaded side
    const pt = a => [X - Math.cos(a) * w / 2, gy + Math.pow(Math.sin(a), 0.8) * h, z];
    const L = [], Rr = [];
    for (let k = 0; k <= 4; k++) { L.push(pt(k / 8 * Math.PI)); Rr.push(pt((4 + k) / 8 * Math.PI)); }
    D.poly3(cam, L, '#f4d394'); D.poly3(cam, Rr.concat([[X, gy, z]]), '#e2b46a');
  }
  function stoneWall(D, R, o) {                                  // a low wall of sandstone blocks across the course
    const { cam, P3 } = R, x0 = o.x - o.hw, x1 = o.x + o.hw, near = R.near(o.z);
    D.poly3(cam, [P3(o.z, x0, 0), P3(o.z, x1, 0), P3(o.z, x1, 0.8), P3(o.z, x0, 0.8)], '#c9a06a');
    D.poly3(cam, [P3(o.z, x0, 0.8), P3(o.z, x1, 0.8), P3(o.z + 0.4, x1, 0.8), P3(o.z + 0.4, x0, 0.8)], '#e8c690');
    if (near) {
      D.poly3(cam, [P3(o.z - 0.01, x0, 0.38), P3(o.z - 0.01, x1, 0.38), P3(o.z - 0.01, x1, 0.44), P3(o.z - 0.01, x0, 0.44)], '#8a6232');
      for (let x = x0 + 0.9, k = 0; x < x1 - 0.2; x += 1.8, k++) { const y = k % 2 ? 0.44 : 0; const xx = x + (k % 2 ? 0.9 : 0); if (xx < x1) D.poly3(cam, [P3(o.z - 0.01, xx - 0.03, y), P3(o.z - 0.01, xx + 0.03, y), P3(o.z - 0.01, xx + 0.03, y + 0.36), P3(o.z - 0.01, xx - 0.03, y + 0.36)], '#8a6232'); }
    }
  }
  function awning(D, R, o, i) {                                  // striped cloth on two poles, with the crouch chevrons
    const { cam, P3, wx } = R, y = course.height(o.z), x0 = o.x - o.hw, x1 = o.x + o.hw, col = i % 2 ? '#d8443a' : '#1f9a8e';
    if (!inPyr(o.z)) [x0, x1].forEach(x => { const xx = wx(o.z, x); D.box3(cam, xx - 0.12, xx + 0.12, y, y + o.y1 + 0.2, o.z - 0.12, o.z + 0.12, { side: '#7a5530', rear: '#9a6a3a', top: '#9a6a3a' }); });
    const n = Math.max(2, Math.round(o.hw * 2 / 1.1));
    for (let k = 0; k < n; k++) {
      const a = lerp(x0, x1, k / n), b = lerp(x0, x1, (k + 1) / n);
      D.poly3(cam, [P3(o.z, a, o.y0), P3(o.z, b, o.y0), P3(o.z, b, o.y1), P3(o.z, a, o.y1)], k % 2 ? '#fff4dc' : col);
      D.poly3(cam, [P3(o.z, a, o.y0 - 0.18), P3(o.z, (a + b) / 2, o.y0 - 0.18), P3(o.z, (a + b) / 2, o.y0), P3(o.z, a, o.y0)], k % 2 ? '#fff4dc' : col);   // a scalloped hem
    }
    const m = Math.max(1, Math.floor(o.hw * 2 / 2.4));
    for (let k = 0; k < m; k++) {
      const cx = lerp(x0, x1, (k + 0.5) / m), a = o.y0 + 0.15, b = o.y1 - 0.25;
      D.poly3(cam, [P3(o.z - 0.02, cx - 0.42, b), P3(o.z - 0.02, cx + 0.42, b), P3(o.z - 0.02, cx, a)], '#ffffff');
    }
  }
  function tumbleweed(D, R, o) {                                 // bouncing along, spinning the way it rolls
    const x = obX(o, R.rt), vx = o.move.amp * o.move.w * Math.cos(o.move.w * R.rt + o.move.ph), bounce = Math.abs(Math.sin(R.rt * 5 + o.z)) * 0.25;
    const q = D.toCam(R.cam, R.S3(o.z, x, 0.5 + bounce));
    if (q[2] < 0.6) return;
    const [sx, sy] = D.scr(R.cam, q), k = R.cam.F / q[2], P = PIX.weed, cs = P.cs * k, g = D.ctx;
    const gq = D.toCam(R.cam, R.S3(o.z, x, 0));
    if (gq[2] > 0.6) { const [gx, gy] = D.scr(R.cam, gq); g.save(); g.globalAlpha *= 0.18; g.fillStyle = 'rgb(90,60,30)'; g.beginPath(); g.ellipse(gx, gy, 6 * cs, 1.6 * cs, 0, 0, 7); g.fill(); g.restore(); }
    g.save(); g.translate(sx, sy); g.rotate((x / 0.5) % (Math.PI * 2) * Math.sign(vx || 1)); D.pix(P.rows, P.cols, 0, 6 * cs, cs); g.restore();
  }

  // the far horizon: rolling dune silhouettes, pyramids, hot-air balloons drifting
  function horizon(D, g, hz, pan, zc, W, t) {
    [[0.25, '#e6bd78', '#d4a560', 11, 0.12], [0.45, '#efca88', '#e0b46c', 23, 0.25]].forEach(([k, col, sh, seed, par], li) => {
      const off = pan * (0.3 + par) - zc * 3 * par, r = rng(seed);
      const amps = []; for (let i = 0; i < 32; i++) amps.push([40 + r() * 70, 160 + r() * 120]);
      const i0 = Math.floor((-400 - off) / 260);
      for (let i = i0; i < i0 + Math.ceil((W + 800) / 260) + 1; i++) {
        const [hh, pw] = amps[((i % 32) + 32) % 32], px = i * 260 + off, ph = hh * (1 + k);
        g.fillStyle = col; g.beginPath(); g.moveTo(px - pw, hz + 6);
        for (let j = 0; j <= 10; j++) { const u = j / 10; g.lineTo(px - pw + 2 * pw * u, hz + 6 - ph * Math.pow(Math.sin(Math.PI * u), 1.5)); }
        g.closePath(); g.fill();
        g.fillStyle = sh; g.beginPath(); g.moveTo(px + pw * 0.05, hz + 6 - ph * 0.98);
        for (let j = 0; j <= 5; j++) { const u = 0.5 + j / 10; g.lineTo(px - pw + 2 * pw * u, hz + 6 - ph * Math.pow(Math.sin(Math.PI * u), 1.5)); }
        g.lineTo(px + pw * 0.6, hz + 6); g.closePath(); g.fill();
        if (li === 0 && ((i % 5) + 5) % 5 === 2) {                 // pyramids on the far dunes
          const b = 70 + (((i * 37) % 30) + 30) % 30, h = b * 1.1, cx = px + pw * 0.4;
          g.fillStyle = '#e8c07a'; g.beginPath(); g.moveTo(cx - b, hz + 4); g.lineTo(cx, hz + 4 - h); g.lineTo(cx + b * 0.3, hz + 4); g.closePath(); g.fill();
          g.fillStyle = '#cf9e58'; g.beginPath(); g.moveTo(cx, hz + 4 - h); g.lineTo(cx + b, hz + 4); g.lineTo(cx + b * 0.3, hz + 4); g.closePath(); g.fill();
        }
      }
    });
    const r = rng(91);                                             // hot-air balloons
    for (let k = 0; k < 3; k++) {
      const x = ((r() * W + t * (8 + r() * 6) + pan * 0.15) % (W + 300) + W + 300) % (W + 300) - 150, y = hz - 260 - r() * 260 + Math.sin(t * 0.7 + k) * 10, s = 0.7 + r() * 0.5;
      const cols = [['#e8413a', '#ffd23f'], ['#2f86c8', '#ffffff'], ['#27b07a', '#ffd23f']][k];
      for (let j = 0; j < 4; j++) { g.fillStyle = cols[j % 2]; g.beginPath(); g.ellipse(x, y, 34 * s * (1 - j * 0.25), 42 * s, 0, 0, 7); g.fill(); }
      g.fillStyle = '#7a5530'; g.fillRect(x - 8 * s, y + 52 * s, 16 * s, 12 * s);
      g.strokeStyle = '#7a5530'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 20 * s, y + 30 * s); g.lineTo(x - 8 * s, y + 52 * s); g.moveTo(x + 20 * s, y + 30 * s); g.lineTo(x + 8 * s, y + 52 * s); g.stroke();
    }
  }

  const theme = {
    spray: ['#f6d79a', '#e8bc72', '#fff0c8'], trail: '#d9a95e', ski: ['#c0763a', '#e2a060', '#8a4f22'],
    // warm afternoon sky hazy at the horizon, a big sun, the far dunes; sand to the horizon
    sky(R) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R;
      theme.camZ = zc;
      const bands = ['#5aa9e6', '#6db4ea', '#82c0ec', '#98cbee', '#b0d6ee', '#c9dfe9', '#e3e5dd', '#f5e3c2'];
      const bh = Math.max(40, hz + 10) / bands.length;
      bands.forEach((col, k) => D.rect(0, k * bh, W, bh + 1, col));
      const sx = W * 0.78 + pan * 0.05, sy = hz - 330;
      g.fillStyle = 'rgba(255,236,170,0.35)'; g.beginPath(); g.arc(sx, sy, 130, 0, 7); g.fill();
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(sx, sy, 84, 0, 7); g.fill();
      D.clouds(t, 53, Math.round(3 * W / 1920) + 1, Math.max(40, hz - 400), 0.8, pan * 0.2);
      D.rect(0, hz + 4, W, H, SAND[0]);
      horizon(D, g, hz, pan, zc, W, t);
    },
    // one slice: sand with wind ripples, oases, quicksand, the berms — or, inside the pyramid, the corridor
    slice(R, za, zb, near) {
      const D = root.SkiDraw, { cam, P3, S3, t } = R, mid = (za + zb) / 2;
      const inside = inPyr(mid);
      D.poly3(cam, [P3(za, -SKW), P3(za, SKW), P3(zb, SKW), P3(zb, -SKW)], inside ? '#d9b06a' : SAND[((Math.floor(za / 8) % 2) + 2) % 2]);
      if (!inside) {
        for (const o of SCENE.oases) if (o.z < zb && o.z + o.len > za) { oval(D, R, o, za, zb, 1.25, 0, '#8cc46a', 0.01); oval(D, R, o, za, zb, 1, 0, '#4fc6e8', 0.02); if (near) oval(D, R, o, za, zb, 0.55, 0.45, '#9fe8ff', 0.025, 0.7); }
        if (near) {                                                 // wind ripples
          const r = rng(4100 + za);
          for (let k = 0; k < 2; k++) {
            const x = (r() - 0.5) * 2 * (H_ - 1), z = lerp(za, zb, r()), w = 1.2 + r() * 1.8, a = 0.12 + r() * 0.1;
            D.poly3(cam, [S3(z, x - w, 0.012), S3(z - a, x, 0.012), S3(z, x + w, 0.012), S3(z + 0.06, x + w, 0.012), S3(z - a + 0.06, x, 0.012), S3(z + 0.06, x - w, 0.012)], '#e2b46a');
          }
        }
      }
      for (const q of course.sand) if (q.z < zb && q.z + q.len > za) quicksand(D, R, q, za, zb);
      if (inside) corridor(D, R, Math.max(za, PYR[0]), Math.min(zb, PYR[1]), near);
      else berms(D, R, za, zb, near);
      if (za <= PYR[1] && zb > PYR[1]) portal(D, R, PYR[1]);     // the far mouth, seen from inside
    },
    // dunes, oases, obelisks, ruins, camels, cacti, far pyramids — and the great pyramid itself
    scenery(R) {
      const D = root.SkiDraw, { cam, add, lo, hi, zc, wx, t } = R;
      // the other mascots cheering on sandstone steps either side of the finish
      if (R.zc > FINISH - 160) root.SkiWorld.crowd(R, { z0: FINISH - 50, z1: FINISH + 25, stand: { top: '#ecc890', top2: '#dcb070', face: '#b07a44' } });
      const inside = zc >= PYR[0] && zc <= PYR[1], hidden = z => inside && z < PYR[1] + 2;   // from inside only what lies past the exit
      const gy = z => course.height(z), ok = (z, m = 0) => z > lo - m && z < hi && !hidden(z);
      if (!inside && zc < PYR[0] && PYR[0] < hi) add(PYR[0] - 0.05, () => pyramid(D, R));
      for (const p of SCENE.pyramids) if (ok(p.z, 30)) add(p.z, () => {
        const X = wx(p.z, p.x), y = gy(p.z) - 0.5, A = [X, y + p.h, p.z];
        D.poly3(cam, [[X - p.b, y, p.z - p.b], [X + p.b, y, p.z - p.b], A], '#e8c27a');
        D.poly3(cam, [[X + p.b, y, p.z - p.b], [X + p.b, y, p.z + p.b], A], p.x > 0 ? '#c99a55' : '#d6aa62');
        D.poly3(cam, [[X - p.b, y, p.z - p.b], [X - p.b, y, p.z + p.b], A], p.x > 0 ? '#d6aa62' : '#c99a55');
      });
      for (const m of SCENE.mounds) if (ok(m.z) && Math.abs(m.z - zc) < 110) add(m.z, () => mound(D, cam, wx(m.z, m.x), m.z, gy(m.z), m.w, m.h));
      for (const o of SCENE.obelisks) if (ok(o.z)) add(o.z, () => obelisk(D, cam, wx(o.z, o.x), o.z, gy(o.z), o.h, Math.abs(o.z - zc) < 50));
      for (const r of SCENE.ruins) if (ok(r.z) && Math.abs(r.z - zc) < 100) r.cols.forEach((c, j) => add(r.z + c.dz, () => column(D, cam, wx(r.z + c.dz, r.x), r.z + c.dz, gy(r.z + c.dz), c.h)));
      for (const p of SCENE.palms) if (ok(p.z) && Math.abs(p.z - zc) < 90) add(p.z, () => palm(D, cam, wx(p.z, p.x), p.z, gy(p.z), p.h, p.lean, Math.abs(p.z - zc) > 45));
      for (const n of SCENE.tents) if (ok(n.z) && Math.abs(n.z - zc) < 80) add(n.z, () => tent(D, cam, wx(n.z, n.x), n.z, gy(n.z), n.col));
      for (const c of SCENE.cacti) if (ok(c.z) && Math.abs(c.z - zc) < 80) add(c.z, () => { const P = PIX.cactus; R.billboard({ cs: P.cs * c.s, rows: P.rows, cols: P.cols }, c.z, c.x, 0); });
      for (const c of SCENE.camels) if (ok(c.z) && Math.abs(c.z - zc) < 90) add(c.z, () => {
        const frame = Math.floor(t * 3 + c.ph) % 2, bob = Math.abs(Math.sin(t * 6 + c.ph)) * 0.08;
        R.billboard({ cs: 0.17, rows: PIX.camel[frame], cols: CAMEL_COLS }, c.z, c.x, bob);
      });
    },
    // sandstone arches with a cloth banner (above the camera); START and GOAL in orange; none inside the pyramid
    gate(R, z, i, label) {
      if (!label && (z > PYR[0] - 14 && z < PYR[1] + 12)) return;
      const D = root.SkiDraw, { cam, P3, wx } = R, h = course.height(z);
      const col = label ? D.C.orange : i % 2 ? '#1f9a8e' : '#d8443a', y = h + BANK[1], x = H_ + 1.0, y0 = y + (label ? 6.0 : 5.8), y1 = y + (label ? 7.5 : 6.9);
      for (const gx of [-x, x]) { const X = wx(z, gx); D.box3(cam, X - 0.4, X + 0.4, y - 0.4, y1 + 0.6, z - 0.4, z + 0.4, { side: '#c9a06a', rear: '#e2c08a', top: '#f2dcae' }); }
      D.poly3(cam, [P3(z, -x - 0.6, y1 - h), P3(z, x + 0.6, y1 - h), P3(z, x + 0.6, y1 + 0.6 - h), P3(z, -x - 0.6, y1 + 0.6 - h)], '#d9b47a');   // the lintel
      const f = D.poly3(cam, [P3(z, -x + 0.4, y0 - h), P3(z, x - 0.4, y0 - h), P3(z, x - 0.4, y1 - h), P3(z, -x + 0.4, y1 - h)], col);
      D.poly3(cam, [P3(z - 0.01, -x + 0.4, y0 - h), P3(z - 0.01, x - 0.4, y0 - h), P3(z - 0.01, x - 0.4, y0 - h + 0.16), P3(z - 0.01, -x + 0.4, y0 - h + 0.16)], '#ffd84a');
      if (f && label) {
        const q = D.toCam(cam, P3(z, 0, (y0 + y1) / 2 - h));
        if (q[2] > 1) { const [sx, sy] = D.scr(cam, q), s2 = cam.F / q[2]; D.txt(label, sx, sy + s2 * 0.42, { size: Math.round(s2 * 1.15), color: '#ffffff', align: 'center', ls: Math.round(s2 * 0.1) }); }
      }
    },
    obstacle(R, o, i) {
      const D = root.SkiDraw;
      if (o.k === 'weed') tumbleweed(D, R, o);
      else if (o.k === 'wall') stoneWall(D, R, o);
      else if (o.k === 'awning') awning(D, R, o, i);
      else R.billboard(PIX[o.k], o.z, o.x, 0);
    },
    // wind-blown sand; stronger in the last stretch; inside the pyramid, a warm dark vignette instead
    weather({ t }) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, z = theme.camZ;
      if (z >= PYR[0] && z <= PYR[1]) {
        const k = Math.min(seg(z, PYR[0], PYR[0] + 6), 1 - seg(z, PYR[1] - 6, PYR[1]));
        const gr = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.22, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(40,20,5,0)'); gr.addColorStop(1, `rgba(40,20,5,${0.7 * k})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        return;
      }
      const storm = seg(z, 1000, 1060), r = rng(Math.floor(t * 20));
      if (storm > 0) D.rect(0, 0, W, H, '#e8b870', 0.12 * storm);
      g.fillStyle = '#fff0c8';
      for (let k = 0; k < 14 + 26 * storm; k++) {
        const len = 30 + r() * 60, y = r() * H, x = W - ((r() * W + t * (900 + r() * 500)) % (W + 200));
        g.globalAlpha = 0.25 + 0.3 * storm; g.fillRect(x, y, len, 4);
      }
      g.globalAlpha = 1;
    },
    // map-screen thumbnail: sky, a pyramid, dunes, a cactus
    badge(g, x, y, w, h) {
      const Rr = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      Rr(0, 0, 1, 0.6, '#82c0ec'); Rr(0, 0.45, 1, 0.15, '#f5e3c2'); Rr(0, 0.6, 1, 0.4, '#f2cf8a');
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(x + 0.82 * w, y + 0.2 * h, 0.09 * h, 0, 7); g.fill();
      g.fillStyle = '#e8c27a'; g.beginPath(); g.moveTo(x + 0.18 * w, y + 0.62 * h); g.lineTo(x + 0.42 * w, y + 0.18 * h); g.lineTo(x + 0.5 * w, y + 0.62 * h); g.fill();
      g.fillStyle = '#c99a55'; g.beginPath(); g.moveTo(x + 0.42 * w, y + 0.18 * h); g.lineTo(x + 0.66 * w, y + 0.62 * h); g.lineTo(x + 0.5 * w, y + 0.62 * h); g.fill();
      g.fillStyle = '#e2b46a'; g.beginPath(); g.moveTo(x, y + 0.85 * h); g.quadraticCurveTo(x + 0.3 * w, y + 0.6 * h, x + 0.6 * w, y + 0.85 * h); g.lineTo(x + 0.6 * w, y + h); g.lineTo(x, y + h); g.fill();
      g.fillStyle = '#3f9a4e'; g.fillRect(x + 0.8 * w, y + 0.5 * h, 0.04 * w, 0.32 * h); g.fillRect(x + 0.75 * w, y + 0.58 * h, 0.03 * w, 0.12 * h); g.fillRect(x + 0.86 * w, y + 0.55 * h, 0.03 * w, 0.12 * h);
    },
  };

  root.SkiMaps.define('desert', { desc: '沙漠滑沙：飛越沙丘、閃過流沙和風滾草、穿越金字塔！', course, theme,
    music: { race: 'desert', result: 'desert_result' }, score: { par: 111, ranks: root.SkiScore.RANKS, key: 'ski-best-desert' }, bg: '#e9c37f' });
})(typeof window !== 'undefined' ? window : globalThis);

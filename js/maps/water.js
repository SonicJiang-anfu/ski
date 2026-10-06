'use strict';
// 新手 · 水上樂園: a U-shaped water slide on stilts above a summer park full of rides. Its trick: the slide is a
// trough, so bends fling her up the outside wall and she slides back down (coins wait up there for whoever rides
// high); boost pads shoot her forward. The bends flow into each other, with long sweeping turns, and one stretch is
// a closed tube with no sky. Swim rings to hop, giant rubber ducks and flamingos to go round, lane ropes to jump,
// spray pipes to crouch under. Each stretch of slide has its own colour, and the run ends with a splash into the pool.
(function (root) {
  const { clamp, lerp, seg, rng, mixHex } = root.SkiCore;

  // ------------------------------------------------------------ course
  const FINISH = 1500;
  const course = root.SkiCourse.build({
    id: 'water', HALF: 6.5, FINISH, LENGTH: 1600, START: 4,
    bowl: { flat: 2.8, rim: 2.6, fade: [FINISH + 3, FINISH + 16] },
    phys: { DRIFT: 0.1, CENT: 1.7, WALL_DRAG: 0.9, DRAG: 0.28 },  // curves fling her up the outside wall; rubbing the rim slows her less than snow
    // a spline through these points (flow): bends run straight into each other, and the long turns keep turning
    flow: true,
    CX: [[0, 0], [40, 0], [100, -6], [160, 6], [220, 0],
      [270, -8], [325, 8], [380, -8], [435, 8], [490, -8], [545, 8], [590, 0],                  // ② quick S-bends
      [700, 0], [760, -5], [820, 5], [870, 0],
      [905, -15], [940, -20], [975, -15], [1010, 0],                                             // ④ one long turn, inside the tube
      [1060, 8], [1115, -6], [1170, 0],
      [1217, -15], [1255, -20], [1292, -15], [1330, 0], [1367, 15], [1405, 20], [1442, 15],    // ⑤ two big sweeping turns, back to back
      [1480, 0], [1500, 0], [1600, 0]],
    GRADE: [[0, 0.02], [12, 0.05], [24, 0.16], [220, 0.2], [590, 0.22],
      [608, 0.08], [624, 0.08], [626, 0.5], [646, 0.18], [708, 0.08], [724, 0.08], [726, 0.5], [746, 0.18],
      [808, 0.08], [824, 0.08], [826, 0.55], [850, 0.2], [870, 0.22], [1170, 0.24],
      [1190, 0.3], [1480, 0.32], [1500, 0.12], [1540, 0.0], [1600, 0.0]],
    sections: [{ name: '暖身水道', z0: 0 }, { name: '螺旋彎道', z0: 220 }, { name: '跳水台', z0: 590 }, { name: '水管隧道', z0: 860 }, { name: '衝向泳池', z0: 1180 }],
  }, (c, P) => {
    const FULL = P.FULL;
    const ring = (z, x) => P.hop('ring', z, x, 1.0);                       // swim ring: hop it or go round
    const duck = (z, x) => P.tall('duck', z, x, 0.9);                     // giant rubber duck: go round
    const flamingo = (z, x) => P.tall('flamingo', z, x, 0.9);
    const rope = z => P.hop('rope', z, 0, FULL / 2, { hd: 0.4 });         // lane rope across the slide: jump (or ride high on the wall over it)
    const pipe = z => P.over('pipe', z, 0, FULL);                         // spray pipe: crouch
    const { coin, row, flight } = P, boost = (z, x) => P.boost(z, x, 2.0, 6);   // wide, long boost pads
    // ① 暖身水道: gentle bends, a few rings, the first boost pads
    ring(70, 2.5); ring(110, -2); ring(150, 1.5); ring(190, -2.4); ring(190, 2.4);
    boost(45, 0); boost(125, 0);
    row(28, 0, 4); row(56, -2.5, 4); row(84, 2, 4); row(126, 0, 3); row(160, -1.5, 4);
    // ② 螺旋彎道: tight S-bends throw her up the outside wall; a duck or flamingo sits in the middle of every bend,
    // and a row of coins rides high on the wall each bend throws her towards
    [270, 325, 380, 435, 490, 545].forEach((z, k) => (k % 2 ? flamingo : duck)(z, 0));
    [298, 352, 408, 462, 518].forEach((z, k) => ring(z, k % 2 ? 1.5 : -1.5));
    [[283, -1], [343, 1], [398, -1], [452, 1], [510, -1], [568, 1]].forEach(([z, sd]) => row(z, sd * 5, 4));
    boost(565, 0);
    // ③ 跳水台: three kickers, each over a drop like a waterfall step; lane ropes to jump after the landings
    P.ramp(616, 0, 2.4, 1.6); P.ramp(716, -0.4, 2.4, 1.6); P.ramp(816, 0.4, 2.4, 1.8);
    const R = c.ramps;
    rope(668); ring(690, 2); rope(768); ring(785, -2); rope(858);
    row(578, 0, 3); flight(R[0], 5); flight(R[1], 5); flight(R[2], 5);
    for (const z of [668, 768]) { coin(z, -1.5, 2.0); coin(z, 1.5, 2.0); }
    coin(858, 0, 2.0); row(684, -1.5, 3); row(780, 1.5, 3);
    // ④ 水管隧道: into a closed tube on one long turn; spray pipes to crouch under, rings, ropes and the odd duck
    pipe(900); ring(925, 2.2); duck(925, -2.4);
    pipe(955); rope(985);
    pipe(1015); ring(1040, -2.4); ring(1040, 2.4);
    pipe(1070); rope(1086);
    flamingo(1110, 0); pipe(1140); rope(1165);
    for (const z of [900, 955, 1015, 1070, 1140]) { coin(z, -1.5, 0.6); coin(z, 1.5, 0.6); }
    for (const z of [985, 1086, 1165]) coin(z, 0, 2.0);
    row(921, -0.2, 3); row(1036, 0, 3); row(1104, 2.6, 3);
    row(962, -5, 4);                                                       // high on the outside wall of the long turn
    // ⑤ 衝向泳池: steeper, a chain of boost pads, everything mixed, then the pool
    ring(1210, 0); duck(1235, -2.2); rope(1260); pipe(1300); flamingo(1330, 0);
    ring(1355, -2.4); ring(1355, 2.4); pipe(1390); rope(1420); duck(1445, -2.6); flamingo(1445, 2.6); ring(1475, 0);
    boost(1185, 0); boost(1275, 0); boost(1370, 0); boost(1452, 0); boost(1485, 0);
    coin(1210, 0, 2.0); row(1228, 0.8, 3); coin(1260, -1.5, 2.0); coin(1260, 1.5, 2.0); coin(1300, -1.5, 0.6); coin(1300, 1.5, 0.6);
    row(1322, 2.5, 3); row(1350, 0, 3); coin(1390, -1.5, 0.6); coin(1390, 1.5, 0.6); coin(1420, -1.5, 2.0); coin(1420, 1.5, 2.0);
    row(1440, 0, 3); coin(1475, 0, 2.0); row(1488, 0, 3);
    row(1278, -5, 4); row(1452, 5, 3);                                     // up the outside wall of each big turn
  });

  // ------------------------------------------------------------ look
  const H_ = course.HALF, F = course.bowl.flat, WW = H_ - F, SKW = 40, POOL_W = 18;
  const amp = z => course.surf(z, H_) - course.height(z);      // how high the rim stands at z (0 once it opens into the pool)
  const elev = z => 7 * (1 - seg(z, FINISH - 95, FINISH - 8)); // the slide stands on stilts this high above the park
  const wallX = (z, y) => { const a = amp(z); return a > y ? F + WW * Math.sqrt(y / a) : H_; };   // where the wall reaches height y
  // each stretch of slide in its own colour
  const FLOOR = '#36b9e6', NIGHT = '#0b1638';                 // the channel itself is always water blue
  const SEC = ['#2f86e0', '#f2a72e', '#e8508e', '#27b07a', '#8a5ad8'].map(c => ({
    base: c, wall: [mixHex(c, '#ffffff', 0.12), mixHex(c, '#ffffff', 0.24), mixHex(c, '#ffffff', 0.36)], shell: mixHex(c, '#0d3170', 0.25),
    // inside the tube: everything in shade, the lining in two tones, lamps along it
    dark: { floor: mixHex(FLOOR, NIGHT, 0.35), wall: [mixHex(c, NIGHT, 0.45), mixHex(c, NIGHT, 0.38), mixHex(c, NIGHT, 0.3)] },
    lining: [mixHex(c, NIGHT, 0.62), mixHex(c, NIGHT, 0.52)],
  }));
  // the closed tube: its arch springs from the rims and closes well above the camera
  const TUN = [872, 1012], inTun = z => z >= TUN[0] && z <= TUN[1], TUBE_A = H_ + 0.3, TUBE_B = 4.4;
  const XN = [-H_, -(F + WW * 0.66), -(F + WW * 0.33), -F, F, F + WW * 0.33, F + WW * 0.66, H_];

  // the park below: pools (every third one a wave pool) with floats, umbrellas and mushroom fountains; rides standing
  // back from the slide (a tipping-bucket tower, a spiral-slide tower, a speed-slide tower); palms in between
  const PARK = (() => {
    const r = rng(4242), pools = [], palms = [], umbrellas = [], floats = [], mush = [], rides = [];
    for (let z = 10, k = 0; z < FINISH - 40; z += 34 + r() * 34, k++) {
      const wave = k % 3 === 1, sd = r() < 0.5 ? -1 : 1, x0 = H_ + 5 + r() * 5, w = wave ? 11 + r() * 3 : 6 + r() * 5, len = wave ? 15 + r() * 4 : 8 + r() * 7;
      const p = { z0: z, z1: z + len, x0: sd > 0 ? x0 : -x0 - w, x1: sd > 0 ? x0 + w : -x0, wave };
      pools.push(p);
      umbrellas.push({ z: z - 1.5, x: sd * (x0 - 1.6), col: r() < 0.5 ? '#e8413a' : '#2f86e0' }, { z: z + len + 1.2, x: sd * (x0 + w + 1.4), col: r() < 0.5 ? '#ffc93a' : '#e8508e' });
      const fountain = !wave && r() < 0.55;
      if (fountain) mush.push({ z: (p.z0 + p.z1) / 2, x: (p.x0 + p.x1) / 2, col: r() < 0.5 ? '#e8413a' : '#27b07a' });
      for (let j = 0; j < (wave ? 4 : fountain ? 1 : 2); j++) floats.push({ z: lerp(p.z0 + 1.5, p.z1 - 1.5, r()), x: lerp(p.x0 + 1.2, p.x1 - 1.2, r()), ph: r() * 6 });
    }
    const clear = (z, x, m) => !pools.some(p => z > p.z0 - m && z < p.z1 + m && x > p.x0 - m && x < p.x1 + m);
    const COLS = ['#e8413a', '#ffc93a', '#2f86e0', '#e8508e', '#27b07a'];
    for (let z = 30, k = 0, sd = 1; z < FINISH - 60; z += 28 + r() * 16, k++) {
      sd = -sd;
      let x = sd * (H_ + 13 + r() * 4);
      while (!clear(z, x, 5) || !clear(z + 4, x + sd * 6, 5)) x += sd * 5;   // keep clear of the pools
      rides.push({ kind: ['bucket', 'spiral', 'speed'][k % 3], z, x, sd, col: COLS[(r() * 5) | 0], ph: r() * 10 });
    }
    const free = (z, x) => clear(z, x, 3) && !rides.some(d => Math.abs(d.z - z) < 7 && Math.abs(d.x - x) < (d.kind === 'speed' ? 17 : 6));
    for (let z = -12; z < course.LENGTH + 140; z += 4) for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
      if (r() >= 0.42) continue;
      const x = sd * (H_ + 3.5 + k * 10 + r() * 8), zz = z + r() * 3;
      if (free(zz, x)) palms.push({ x, z: zz, h: 4.2 + r() * 3 + 0.65 * elev(zz), lean: (r() - 0.5) * 2.2 });   // tall enough for the crowns to show over the raised slide
    }
    return { pools, palms: palms.sort((a, b) => a.z - b.z), umbrellas, floats, mush, rides };
  })();

  const ART = {
    ring: { cs: 0.14, cols: { R: '#e8413a', W: '#ffffff', D: '#b82e2a', S: '#cfe0f0' }, rows: [
      '...WWRRWWRR...', '.RRWWRRWWRRWW.', 'WWRR......RRWW', 'RRSS......WWRR', '.SSDDSSDDSSDD.', '...SSDDSSDD...'] },
    duck: { cs: 0.14, cols: { Y: '#ffd43a', D: '#e8a817', K: '#1a1a1a', O: '#f0841f', W: '#fff3b0', B: '#9fe8ff' }, rows: [
      '....YYYYYY....', '...YWWYYYYY...', '..YWYKYYKYYY..', '..YYYKYYKYYY..', '..YYYOOOOYYY..', '..YYOOOOOOYY..', '...YYOOOOYY...', '....YYYYYY....',
      '..YYYYYYYYYY..', '.YWWYYYYYYYYY.', 'YWWYYYYYYYYDYY', 'YWYYYYYYYYYDDY', 'YYYYYYYYYYYYDY', 'YYYYYYYYYYYYYD', '.YYYYYYYYYYYD.', 'BBDDDDDDDDDDBB'] },
    flamingo: { cs: 0.14, cols: { P: '#ff86b8', D: '#d95a92', K: '#1a1a1a', B: '#1a1a1a', W: '#ffd0e4', A: '#9fe8ff' }, rows: [
      '......PPP.....', '.....PPKPP....', '.....PPPPWB...', '......PP..B...', '......PP......', '.......PP.....', '.......PP.....', '......PP......',
      '.....PP.......', '....PPPPPPPP..', '..PWWPPPPPPPP.', '.PWPPPPPPPPPPP', 'PPPPPPPPPPPPPD', 'PPPPPPPPPPPPDD', '.PPPPPPPPPPDD.', 'AADDDDDDDDDDAA'] },
  };

  function palm(D, cam, x, z, y0, h, lean, far) {               // a curved trunk in rings and a crown of drooping fronds
    const T = [x + lean, y0 + h];
    if (far) {
      D.poly3(cam, [[x - 0.15, y0, z], [x + 0.15, y0, z], [T[0] + 0.12, T[1], z], [T[0] - 0.12, T[1], z]], '#9a6a3a');
      D.poly3(cam, [[T[0] - 2, T[1] - 0.6, z], [T[0], T[1] + 0.5, z], [T[0] + 2, T[1] - 0.6, z], [T[0], T[1] - 0.2, z]], '#2f9a52');
      return;
    }
    for (let k = 0; k < 2; k++) {
      const a = k / 2, b = (k + 1) / 2, xa = x + lean * a * a, xb = x + lean * b * b, wa = lerp(0.24, 0.15, a), wb = lerp(0.24, 0.15, b);
      D.poly3(cam, [[xa - wa, y0 + h * a, z], [xa + wa, y0 + h * a, z], [xb + wb, y0 + h * b, z], [xb - wb, y0 + h * b, z]], k % 2 ? '#8f5f30' : '#b07a45');
    }
    for (const [ang, len, col] of [[2.85, 2.3, '#2f8a4a'], [0.3, 2.3, '#2f8a4a'], [2.1, 2.0, '#3aa65a'], [1.05, 2.0, '#3aa65a'], [1.57, 1.5, '#47b866']]) {
      const dx = Math.cos(ang), dy = Math.sin(ang), tip = [T[0] + dx * len, T[1] + dy * len * 0.55 - 0.5 * Math.abs(dx) * len * 0.5];
      const mid = [T[0] + dx * len * 0.5, T[1] + dy * len * 0.4], nx = -dy * 0.32, ny = dx * 0.32;
      D.poly3(cam, [[T[0], T[1], z - 0.01], [mid[0] + nx, mid[1] + ny, z - 0.01], [tip[0], tip[1], z - 0.01], [mid[0] - nx * 0.4, mid[1] - ny * 0.4, z - 0.01]], col);
    }
    D.poly3(cam, [[T[0] - 0.3, T[1] - 0.35, z - 0.02], [T[0], T[1] - 0.35, z - 0.02], [T[0], T[1] - 0.05, z - 0.02], [T[0] - 0.3, T[1] - 0.05, z - 0.02]], '#6b4422');
    D.poly3(cam, [[T[0] + 0.02, T[1] - 0.4, z - 0.02], [T[0] + 0.3, T[1] - 0.4, z - 0.02], [T[0] + 0.3, T[1] - 0.1, z - 0.02], [T[0] + 0.02, T[1] - 0.1, z - 0.02]], '#7b5228');
  }
  function umbrella(D, cam, x, z, y0, col) {                     // beach umbrella: pole and a striped canopy
    D.poly3(cam, [[x - 0.05, y0, z], [x + 0.05, y0, z], [x + 0.05, y0 + 2.3, z], [x - 0.05, y0 + 2.3, z]], '#f5f5f5');
    const top = [x, y0 + 2.45], rim = [-1.5, -0.75, 0, 0.75, 1.5].map((d, k) => [x + d, y0 + 1.85 + (k === 0 || k === 4 ? 0 : 0.28 - Math.abs(d) * 0.12)]);
    for (let k = 0; k < 4; k++) D.poly3(cam, [[top[0], top[1], z - 0.01], [rim[k][0], rim[k][1], z - 0.01], [rim[k + 1][0], rim[k + 1][1], z - 0.01]], k % 2 ? '#ffffff' : col);
  }
  function rope(D, R, o) {                                        // floats on a line across, where it is above the wall
    const { cam, P3, wx } = R, y = 0.55, xl = Math.min(wallX(o.z, y), o.hw), x0 = Math.max(o.x - o.hw, -xl), x1 = Math.min(o.x + o.hw, xl);
    D.poly3(cam, [P3(o.z, x0, y - 0.03), P3(o.z, x1, y - 0.03), P3(o.z, x1, y + 0.03), P3(o.z, x0, y + 0.03)], '#ffffff');
    const n = Math.max(2, Math.round((x1 - x0) / 0.55)), cols = ['#e8413a', '#ffffff', '#2f86e0', '#ffffff'];
    for (let k = 0; k <= n; k++) {
      const x = lerp(x0, x1, k / n), c = cols[k % 4];
      D.poly3(cam, [P3(o.z, x - 0.2, y - 0.2), P3(o.z, x + 0.2, y - 0.2), P3(o.z, x + 0.2, y + 0.2), P3(o.z, x - 0.2, y + 0.2)], c);
      D.poly3(cam, [P3(o.z, x - 0.2, y + 0.2), P3(o.z, x + 0.2, y + 0.2), P3(o.z + 0.3, x + 0.2, y + 0.2), P3(o.z + 0.3, x - 0.2, y + 0.2)], c === '#ffffff' ? '#dfe9f5' : mixHex(c, '#ffffff', 0.3));
    }
    const h = course.height(o.z);
    for (const x of [x0, x1]) { const X = wx(o.z, x), yy = course.surf(o.z, x); D.box3(cam, X - 0.08, X + 0.08, yy, h + 0.9, o.z - 0.08, o.z + 0.08, { side: '#e6edf5', rear: '#ffffff', top: '#ffffff' }); }
  }
  function pipe(D, R, o, t) {                                    // a yellow pipe from wall to wall, a curtain of spray falling from it
    const { cam, P3 } = R, top = o.y1, bot = o.y1 - 0.42, x0 = o.x - o.hw, x1 = o.x + o.hw;
    const xc = Math.min(wallX(o.z, o.y0), o.hw), c0 = Math.max(x0, -xc), c1 = Math.min(x1, xc);
    D.poly3(cam, [P3(o.z, c0, o.y0), P3(o.z, c1, o.y0), P3(o.z, c1, bot), P3(o.z, c0, bot)], '#7fe3ff', 0.5);
    const n = Math.round((c1 - c0) / 0.6);                        // falling streaks
    for (let k = 0; k < n; k++) {
      const x = lerp(c0, c1, (k + 0.5) / n), f = ((t * 2.6 + k * 0.37) % 1), ya = bot - f * (bot - o.y0), yb = Math.max(o.y0, ya - 0.22);
      D.poly3(cam, [P3(o.z - 0.01, x - 0.04, yb), P3(o.z - 0.01, x + 0.04, yb), P3(o.z - 0.01, x + 0.04, ya), P3(o.z - 0.01, x - 0.04, ya)], '#ffffff', 0.85);
    }
    const m = Math.max(1, Math.floor((c1 - c0) / 2.4));           // white down-chevrons: crouch!
    for (let k = 0; k < m; k++) {
      const cx = lerp(c0, c1, (k + 0.5) / m), a = o.y0 + 0.12, b = bot - 0.1;
      D.poly3(cam, [P3(o.z - 0.02, cx - 0.4, b), P3(o.z - 0.02, cx + 0.4, b), P3(o.z - 0.02, cx, a)], '#ffffff');
    }
    D.poly3(cam, [P3(o.z - 0.2, x0, bot), P3(o.z - 0.2, x1, bot), P3(o.z - 0.2, x1, top), P3(o.z - 0.2, x0, top)], '#ffc93a');
    D.poly3(cam, [P3(o.z - 0.2, x0, top), P3(o.z - 0.2, x1, top), P3(o.z + 0.2, x1, top), P3(o.z + 0.2, x0, top)], '#ffe27a');
    D.poly3(cam, [P3(o.z - 0.21, x0, bot), P3(o.z - 0.21, x1, bot), P3(o.z - 0.21, x1, bot + 0.08), P3(o.z - 0.21, x0, bot + 0.08)], '#d99a12');
    for (let x = Math.ceil(c0); x <= c1; x += 1.3) D.poly3(cam, [P3(o.z - 0.22, x - 0.1, bot - 0.06), P3(o.z - 0.22, x + 0.1, bot - 0.06), P3(o.z - 0.22, x + 0.1, bot + 0.06), P3(o.z - 0.22, x - 0.1, bot + 0.06)], '#3a4152');
  }

  // ---- rides in the park. (X, z): world position of its middle, gy: the ground there, d: the ride, far: cheap version
  const WOOD = { side: '#e2dccb', rear: '#f3eee2', top: '#ffffff' };
  function spiralTower(D, cam, X, z, gy, d, far) {               // a white tower with a pointed roof; a slide winds twice round it
    const H = 15, r = 3.6, lite = mixHex(d.col, '#ffffff', 0.4);
    const tower = () => {
      D.box3(cam, X - 0.9, X + 0.9, gy, gy + H, z - 0.9, z + 0.9, WOOD);
      const ap = [X, gy + H + 2.4, z], c = [[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]];
      for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; D.poly3(cam, [[X + a[0], gy + H, z + a[1]], [X + b[0], gy + H, z + b[1]], ap], k % 2 ? d.col : lite); }
    };
    if (far) { tower(); return; }
    D.poly3(cam, [[X + r - 1, gy + 0.03, z - 2], [X + r + 3, gy + 0.03, z - 2], [X + r + 3, gy + 0.03, z + 2], [X + r - 1, gy + 0.03, z + 2]], '#ffffff');
    D.poly3(cam, [[X + r - 0.6, gy + 0.05, z - 1.6], [X + r + 2.6, gy + 0.05, z - 1.6], [X + r + 2.6, gy + 0.05, z + 1.6], [X + r - 0.6, gy + 0.05, z + 1.6]], '#4fd0f0');
    const N = 28, segs = [];
    for (let i = 0; i < N; i++) {
      const ta = 4 * Math.PI * i / N, tb = 4 * Math.PI * (i + 1) / N, ya = gy + H - 0.8 - (H - 1.6) * i / N, yb = gy + H - 0.8 - (H - 1.6) * (i + 1) / N;
      const P = (t, y) => [X + r * Math.cos(t), y, z + r * Math.sin(t)];
      segs.push({ back: Math.sin((ta + tb) / 2) > 0, pts: [P(ta, ya), P(tb, yb), P(tb, yb + 0.9), P(ta, ya + 0.9)], col: i % 2 ? d.col : lite });
    }
    segs.forEach(sg => { if (sg.back) D.poly3(cam, sg.pts, sg.col); });   // the far side of the coil, the tower, the near side
    for (const a of [0.8, 2.4, 3.9, 5.5]) { const px = X + r * Math.cos(a), pz = z + r * Math.sin(a); D.box3(cam, px - 0.08, px + 0.08, gy, gy + H - 1, pz - 0.08, pz + 0.08, WOOD); }
    tower();
    segs.forEach(sg => { if (!sg.back) D.poly3(cam, sg.pts, sg.col); });
  }
  function bucketTower(D, cam, X, z, gy, d, t, far) {           // a climbing frame with a giant bucket that tips over every 10 s
    const w = 2.4, H = 12, POST = { side: '#2f86e0', rear: '#4d9be8', top: '#ffffff' };
    const post = (px, pz) => D.box3(cam, px - 0.16, px + 0.16, gy, gy + H, pz - 0.16, pz + 0.16, POST);
    post(X - w, z + w); post(X + w, z + w);
    for (const [dy, c] of [[4, d.col], [8, '#ffc93a']]) D.box3(cam, X - w - 0.2, X + w + 0.2, gy + dy, gy + dy + 0.3, z - w - 0.2, z + w + 0.2, { side: c, rear: c, top: mixHex(c, '#ffffff', 0.35) });
    post(X - w, z - w); post(X + w, z - w);
    if (far) return;
    const p = (t + d.ph) % 10, tilt = p < 8 ? 0.05 * Math.sin(t * 2) : p < 8.6 ? (p - 8) / 0.6 * 2.1 : p < 9.6 ? 2.1 : 2.1 * (1 - (p - 9.6) / 0.4);
    const dir = -d.sd, piv = [X + dir * 1.3, gy + H + 0.4], a = -dir * tilt, ca = Math.cos(a), sa = Math.sin(a);
    const rot = (px, py) => [piv[0] + (px - piv[0]) * ca - (py - piv[1]) * sa, piv[1] + (px - piv[0]) * sa + (py - piv[1]) * ca];
    const shape = (k, y0, y1) => [[X - 1.1 - 0.5 * y0 / 1.8 * k, y0], [X + 1.1 + 0.5 * y0 / 1.8 * k, y0], [X + 1.1 + 0.5 * y1 / 1.8 * k, y1], [X - 1.1 - 0.5 * y1 / 1.8 * k, y1]].map(([px, py]) => rot(px, gy + H + 0.4 + py));
    D.poly3(cam, shape(1, 0, 1.8).map(([px, py]) => [px, py, z + 0.6]), '#d99a12');
    D.poly3(cam, shape(1, 0, 1.8).map(([px, py]) => [px, py, z - 0.6]), '#ffc93a');
    D.poly3(cam, shape(1, 1.2, 1.5).map(([px, py]) => [px, py, z - 0.61]), '#e8413a');
    if (p > 8.35 && p < 9.9) {                                     // the pour: a sheet of water from the lip to the ground, a splash
      const lip = rot(X + dir * 1.6, gy + H + 2.2), k = Math.min(1, (p - 8.35) / 0.3) * (1 - seg(p, 9.6, 9.9)), x2 = lip[0] + dir * 1.4;
      D.poly3(cam, [[lip[0] - dir * 0.6, lip[1], z], [lip[0] + dir * 0.9, lip[1], z], [x2 + dir * 1.2, gy, z], [x2 - dir * 1.4, gy, z]], '#9fe8ff', 0.6 * k);
      for (let j = 0; j < 4; j++) { const f = (t * 3 + j * 0.25) % 1, x = lerp(lip[0], x2, f) + (j - 1.5) * 0.4, y = lerp(lip[1], gy, f); D.poly3(cam, [[x - 0.06, y, z - 0.01], [x + 0.06, y, z - 0.01], [x + 0.06, y + 0.7, z - 0.01], [x - 0.06, y + 0.7, z - 0.01]], '#ffffff', k); }
      D.poly3(cam, [[x2 - 2.2, gy + 0.05, z - 1.6], [x2 + 2.2, gy + 0.05, z - 1.6], [x2 + 2.2, gy + 0.05, z + 1.6], [x2 - 2.2, gy + 0.05, z + 1.6]], '#ffffff', 0.7 * k);
    }
  }
  function speedTower(D, cam, X, z, gy, d, far) {               // a tall tower, a canopy, two straight drops racing out into a pool
    const H = 14, sd = d.sd;
    D.box3(cam, X - 0.9, X + 0.9, gy, gy + H, z - 1.3, z + 1.3, WOOD);
    D.box3(cam, X - 1.4, X + 1.4, gy + H + 1.4, gy + H + 1.7, z - 1.8, z + 1.8, { side: d.col, rear: d.col, top: mixHex(d.col, '#ffffff', 0.35) });
    for (const pz of [z - 1.6, z + 1.6]) D.box3(cam, X - 0.07, X + 0.07, gy + H, gy + H + 1.4, pz - 0.07, pz + 0.07, WOOD);
    if (far) return;
    const ex = X + sd * 13.5;
    D.poly3(cam, [[ex - 0.5, gy + 0.03, z - 2.8], [ex + sd * 4.5, gy + 0.03, z - 2.8], [ex + sd * 4.5, gy + 0.03, z + 2.8], [ex - 0.5, gy + 0.03, z + 2.8]], '#ffffff');
    D.poly3(cam, [[ex, gy + 0.05, z - 2.4], [ex + sd * 4, gy + 0.05, z - 2.4], [ex + sd * 4, gy + 0.05, z + 2.4], [ex, gy + 0.05, z + 2.4]], '#4fd0f0');
    const prof = u => [X + sd * (0.9 + 12.6 * u), gy + 0.4 + (H - 0.8) * (1 - u) * (1 - u)];
    [[z - 0.75, '#e8413a'], [z + 0.75, '#2f86e0']].forEach(([lz, col]) => {
      for (let k = 0; k < 7; k++) {
        const [xa, ya] = prof(k / 7), [xb, yb] = prof((k + 1) / 7);
        D.poly3(cam, [[xa, ya, lz - 0.45], [xb, yb, lz - 0.45], [xb, yb, lz + 0.45], [xa, ya, lz + 0.45]], col);
        D.poly3(cam, [[xa, ya, lz - 0.46], [xb, yb, lz - 0.46], [xb, yb + 0.3, lz - 0.46], [xa, ya + 0.3, lz - 0.46]], mixHex(col, '#0d3170', 0.3));
      }
    });
  }
  function fountain(D, cam, X, z, gy, col, t) {                  // a mushroom fountain in a pool, water dripping off its cap
    D.poly3(cam, [[X - 0.2, gy, z], [X + 0.2, gy, z], [X + 0.2, gy + 1.5, z], [X - 0.2, gy + 1.5, z]], '#ffffff');
    const N = 6, rim = k => [X - Math.cos(Math.PI * k / N) * 1.4, gy + 1.45 + Math.sin(Math.PI * k / N) * 0.9];
    for (let k = 0; k < N; k++) { const a = rim(k), b = rim(k + 1); D.poly3(cam, [[X, gy + 1.45, z - 0.01], [a[0], a[1], z - 0.01], [b[0], b[1], z - 0.01]], k % 2 ? '#ffffff' : col); }
    for (let k = 0; k < 6; k++) { const x = X + (k - 2.5) * 0.5, f = (t * 1.6 + k * 0.37) % 1, y = gy + 1.4 - f * 1.4; D.poly3(cam, [[x - 0.05, y - 0.2, z - 0.02], [x + 0.05, y - 0.2, z - 0.02], [x + 0.05, y, z - 0.02], [x - 0.05, y, z - 0.02]], '#9fe8ff'); }
  }
  // the closed tube over [z0, z1]: the outside of the arch from out here, its lining (and lamps) from inside, a
  // striped ring round each mouth
  function tube(D, R, z0, z1, near, sec) {
    const { cam, P3 } = R, N = 10;                               // the same arch near and far, so the slices meet without a crack
    const pt = (z, f, k = 1) => P3(z, Math.cos(f) * TUBE_A * k, amp(z) + Math.sin(f) * TUBE_B * k);
    const lining = ((Math.floor(z0 / 2) % 2) + 2) % 2 ? sec.lining[0] : sec.lining[1];
    for (let i = 0; i < N; i++) {
      const fa = Math.PI * i / N, fb = Math.PI * (i + 1) / N, fm = (fa + fb) / 2, n = [Math.cos(fm) * TUBE_B, Math.sin(fm) * TUBE_A, 0];
      const q = [pt(z0, fa), pt(z0, fb), pt(z1, fb), pt(z1, fa)];
      if (!D.poly3(cam, q, sec.shell, 1, n)) D.poly3(cam, q, lining, 1, [-n[0], -n[1], 0]);
    }
    if (near) for (let lz = Math.ceil(z0 / 6) * 6; lz < z1; lz += 6) {   // a ring of lamps every 6 units
      if (Math.abs(lz - R.zc) < 3) continue;                       // not the one right over the camera: it only shows as a smear
      const lb = Math.min(z1, lz + 0.35);
      for (let i = 1; i < N - 1; i++) {
        const fa = Math.PI * i / N, fb = Math.PI * (i + 1) / N, fm = (fa + fb) / 2;
        D.poly3(cam, [pt(lz, fa, 0.97), pt(lz, fb, 0.97), pt(lb, fb, 0.97), pt(lb, fa, 0.97)], '#fff1a8', 1, [-Math.cos(fm), -Math.sin(fm), 0]);
      }
    }
    for (const mz of TUN) {
      if (mz < z0 - 1e-6 || mz >= z1 + 1e-6 || (mz === TUN[1] && z1 < TUN[1])) continue;
      for (let i = 0; i < N; i++) {
        const fa = Math.PI * i / N, fb = Math.PI * (i + 1) / N;
        D.poly3(cam, [pt(mz, fa), pt(mz, fb), pt(mz, fb, 1.12), pt(mz, fa, 1.12)], i % 2 ? '#ffffff' : sec.base);
      }
    }
  }

  // the far skyline: other slide towers, a Ferris wheel, palms, all in soft summer colours
  function skyline(D, g, hz, off, W) {
    const SL = 300, i0 = Math.floor((-400 - off) / SL);
    for (let i = i0; i < i0 + Math.ceil((W + 800) / SL) + 1; i++) {
      const r = rng(1000 + ((i % 64) + 64) % 64), px = i * SL + off + r() * 80, kind = r() < 0.18 ? 'wheel' : r() < 0.62 ? 'tower' : 'palms';
      if (kind === 'tower') {
        const h = 150 + r() * 110, col = ['#ff6b6b', '#ffd23f', '#3fc3e8', '#7ad35a', '#ff8fc0'][(r() * 5) | 0], base = hz + 4;
        g.fillStyle = '#e8e2d4'; g.fillRect(px - 10, base - h, 20, h);
        g.fillStyle = '#d65a5a'; g.fillRect(px - 34, base - h - 12, 68, 12);
        g.strokeStyle = col; g.lineWidth = 16; g.lineJoin = 'round'; g.beginPath(); g.moveTo(px + 30, base - h - 4);
        let y = base - h, sd = 1;
        while (y < base - 30) { y += 46; g.lineTo(px + sd * (50 + r() * 30), y); sd = -sd; }
        g.lineTo(px + sd * 70, base); g.stroke();
      } else if (kind === 'wheel') {
        const rr = 100, cx = px, cy = hz - rr - 18;
        g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke();
        g.lineWidth = 3; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); g.stroke(); }
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; g.fillStyle = ['#ff6b6b', '#ffd23f', '#3fc3e8', '#ff8fc0'][k % 4]; g.fillRect(cx + Math.cos(a) * rr - 9, cy + Math.sin(a) * rr - 4, 18, 16); }
        g.strokeStyle = '#d8d2c4'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 50, hz + 4); g.lineTo(cx, cy); g.lineTo(cx + 50, hz + 4); g.stroke();
      } else {
        for (let k = 0; k < 3; k++) {
          const x = px + k * 46 - 46, h = 70 + r() * 50, b = hz + 4;
          g.fillStyle = '#5f9a5a'; g.fillRect(x - 4, b - h, 8, h);
          g.beginPath(); g.moveTo(x - 40, b - h + 14); g.lineTo(x, b - h - 8); g.lineTo(x + 40, b - h + 14); g.lineTo(x, b - h + 2); g.closePath(); g.fill();
        }
      }
    }
  }

  // ---- the finish: 浪花泳池, the wave pool the slide drops into. Waves roll in from the wave house across its far end
  // (its name on top, a great wave painted on it), rings bob on the water, lifeguards watch from their chairs; behind the
  // stands either side (the finish shot looks across her at them) umbrellas, loungers, palms and an ice-cream kiosk
  const WAVEH = { z: FINISH + 56, d: 6, h: 7.5 };
  const BEACH = (() => {
    const r = rng(7070), umbs = [], loungers = [], palms = [], rings = [];
    for (const sd of [-1, 1]) for (let z = FINISH - 14; z < FINISH + 54; z += 7 + r() * 3) {
      const x = sd * (26 + r() * 6);
      if (sd > 0 && Math.abs(z - (FINISH + 20)) < 7 && x < 31) continue;   // (the kiosk)
      umbs.push({ z, x, col: ['#e8413a', '#2f86e0', '#f2a72e', '#27b07a'][(r() * 4) | 0] });
      loungers.push({ z: z + 1.6, x: x - sd * 1.6, col: r() < 0.5 ? '#2f86e0' : '#e8508e' });
      if (r() < 0.6) palms.push({ z: z + 3.5, x: sd * (34 + r() * 5), h: 6 + r() * 3, lean: sd * (0.6 + r() * 1.2) });
    }
    for (let k = 0; k < 9; k++) { const sd = k % 2 ? 1 : -1; rings.push({ z: FINISH + 8 + k * 5 + r() * 3, x: sd * (9 + r() * 6), ph: r() * 6 }); }
    return { umbs, loungers, palms: palms.sort((a, b) => a.z - b.z), rings };
  })();
  function waveHouse(D, R) {                                       // across the pool's far end: where the waves come from
    const { cam, t } = R, z = WAVEH.z, y = course.height(z), hw = POOL_W + 1.5, h = WAVEH.h, f = z - 0.02;
    D.box3(cam, -hw, hw, y - 0.3, y + h, z, z + WAVEH.d, { side: '#d8e8f2', rear: '#f4fbff', top: '#ffffff' });
    D.box3(cam, -hw - 0.4, hw + 0.4, y + h, y + h + 0.5, z - 0.4, z + WAVEH.d, { side: '#2f86e0', rear: '#2f86e0', top: '#5aa8f0' });   // (a blue cornice)
    if (cam.C[2] > z) return;
    for (let k = 0; k < 8; k++) {                                  // the grilles the waves come out of, at the waterline
      const x0 = lerp(-hw + 1, hw - 1, k / 8) + 0.3, x1 = lerp(-hw + 1, hw - 1, (k + 1) / 8) - 0.3;
      D.poly3(cam, [[x0, y - 0.1, f], [x1, y - 0.1, f], [x1, y + 1.1, f], [x0, y + 1.1, f]], '#1e4f8a');
    }
    const wave = (cx, s, col) => {                                 // a painted wave: a swell curling over, foam on its lip
      const pts = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([cx - 4 * s + 8 * s * u, y + 1.8 + s * (Math.sin(u * Math.PI) * 2.6 + u * 0.8), f - 0.01]); }
      pts.push([cx + 4 * s, y + 1.6, f - 0.01], [cx - 4 * s, y + 1.6, f - 0.01]);
      D.poly3(cam, pts, col);
      for (let k = 0; k < 4; k++) { const u = 0.45 + k * 0.12, X = cx - 4 * s + 8 * s * u, Y = y + 1.8 + s * (Math.sin(u * Math.PI) * 2.6 + u * 0.8); D.poly3(cam, [[X - 0.5 * s, Y, f - 0.02], [X + 0.5 * s, Y, f - 0.02], [X + 0.2 * s, Y + 0.5 * s, f - 0.02]], '#ffffff'); }
    };
    wave(-9, 1.1, '#5cc8f2'); wave(9, 1.1, '#5cc8f2'); wave(0, 1.4, '#2f86e0');
    const sw = 16, sy = y + h + 0.5, sh = 3;                       // the name on top, a board on two legs
    for (const sd of [-1, 1]) D.box3(cam, sd * 5 - 0.2, sd * 5 + 0.2, sy, sy + 0.8, z + 1.8, z + 2.2, { side: '#9aa8b8', rear: '#b8c4d2', top: '#ffffff' });
    D.poly3(cam, [[-sw / 2, sy + 0.8, z + 1.6], [sw / 2, sy + 0.8, z + 1.6], [sw / 2, sy + 0.8 + sh, z + 1.6], [-sw / 2, sy + 0.8 + sh, z + 1.6]], '#2f86e0');
    D.poly3(cam, [[-sw / 2, sy + 0.8, z + 1.58], [sw / 2, sy + 0.8, z + 1.58], [sw / 2, sy + 1.05, z + 1.58], [-sw / 2, sy + 1.05, z + 1.58]], '#ffd84a');
    D.print(cam, [-sw / 2, sy + 0.8 + sh, z + 1.56], [sw / 2, sy + 0.8 + sh, z + 1.56], [-sw / 2, sy + 1.05, z + 1.56], '浪花泳池', { w: sw, h: sh - 0.25, color: '#ffffff', stroke: '#1e4f8a', fill: 0.78 });
    void t;
  }
  function lifeguard(D, R, X, z) {                                 // a lifeguard's tall chair: white legs, a red seat, a sunshade
    const { cam } = R, y = course.height(z), top = y + 3.4;
    for (const [dx, dz] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) D.box3(cam, X + dx - 0.08, X + dx + 0.08, y, top, z + dz - 0.08, z + dz + 0.08, { side: '#e6edf5', rear: '#ffffff', top: '#ffffff' });
    D.box3(cam, X - 0.7, X + 0.7, top, top + 0.25, z - 0.6, z + 0.6, { side: '#c82e28', rear: '#e8413a', top: '#e8413a' });
    D.box3(cam, X - 0.7, X + 0.7, top + 0.25, top + 1.2, z + 0.45, z + 0.6, { side: '#c82e28', rear: '#e8413a', top: '#e8413a' });
    D.box3(cam, X - 0.05, X + 0.05, top, top + 2.6, z + 0.5, z + 0.6, { side: '#9aa8b8', rear: '#9aa8b8', top: '#9aa8b8' });
    D.poly3(cam, [[X - 1.4, top + 2.4, z - 0.6], [X + 1.4, top + 2.4, z - 0.6], [X, top + 3, z + 0.5]], '#ffd84a');
    D.poly3(cam, [[X - 1.4, top + 2.4, z - 0.6], [X, top + 3, z + 0.5], [X - 1.4, top + 2.4, z + 1.6]], '#f2a72e');
    D.poly3(cam, [[X + 1.4, top + 2.4, z - 0.6], [X, top + 3, z + 0.5], [X + 1.4, top + 2.4, z + 1.6]], '#f2a72e');
  }
  function lounger(D, R, X, z, col) {                              // a sun lounger: a white frame, a coloured cushion, its back raised
    const { cam } = R, y = course.height(z);
    D.box3(cam, X - 0.5, X + 0.5, y + 0.3, y + 0.45, z - 1, z + 0.6, { side: '#e6edf5', rear: '#ffffff', top: col });
    D.poly3(cam, [[X - 0.5, y + 0.45, z + 0.6], [X + 0.5, y + 0.45, z + 0.6], [X + 0.5, y + 1.3, z + 1.2], [X - 0.5, y + 1.3, z + 1.2]], col);
  }
  function kiosk(D, R, X, z) {                                     // an ice-cream kiosk: a little hut, a striped awning, a cone on the roof
    const { cam } = R, y = course.height(z), hw = 2.4, d = 3.2, f = z - 0.02;
    D.box3(cam, X - hw, X + hw, y, y + 2.8, z, z + d, { side: '#ffd0e4', rear: '#ffe6f0', top: '#ffffff' });
    for (let k = 0; k < 6; k++) { const a = lerp(X - hw - 0.3, X + hw + 0.3, k / 6), b = lerp(X - hw - 0.3, X + hw + 0.3, (k + 1) / 6); D.poly3(cam, [[a, y + 2.4, z - 1.4], [b, y + 2.4, z - 1.4], [b, y + 2.9, z], [a, y + 2.9, z]], k % 2 ? '#ffffff' : '#e8508e'); }
    D.poly3(cam, [[X - hw + 0.4, y + 1, f], [X + hw - 0.4, y + 1, f], [X + hw - 0.4, y + 2.1, f], [X - hw + 0.4, y + 2.1, f]], '#5a3a6a');
    const cy = y + 2.8; D.poly3(cam, [[X - 0.6, cy + 1.2, z + 1.6], [X + 0.6, cy + 1.2, z + 1.6], [X, cy, z + 1.6]], '#e0a868');   // the cone
    const q = D.toCam(cam, [X, cy + 1.6, z + 1.6]);
    if (q[2] > 1) { const [sx, sy] = D.scr(cam, q), rr = cam.F / q[2] * 0.75, g = D.ctx; g.fillStyle = '#ffb0d0'; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx - rr * 0.3, sy - rr * 0.3, rr * 0.3, 0, 7); g.fill(); }
    if (cam.C[2] < z) D.print(cam, [X - hw + 0.4, y + 2.35, f - 1.42], [X + hw - 0.4, y + 2.35, f - 1.42], [X - hw + 0.4, y + 1.7, f - 1.42], '冰品', { w: 2 * hw - 0.8, h: 0.65, color: '#ffffff', stroke: '#c8306a' });
  }

  const GOAL_SIGN = 'GOAL 浪花泳池';                             // (on the finish arch: where the long way down arrives)
  const theme = {
    spray: ['#ffffff', '#bff2ff', '#7fdcf5'], trail: '#e8fbff', ski: ['#ffc93a', '#fff0a0', '#e09a10'],
    kicker: { side: '#f2a93a', top: '#ffd45a', edge: '#e8413a' }, boost: { pad: '#14d2ff', glow: '#7ff0ff', arrow: '#ffffff' },
    // bright summer sky, a big sun, puffy clouds, the sea on the horizon and the rest of the park in the distance
    sky(R) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R;
      theme.camZ = zc;
      const bands = ['#3d9ff0', '#4aa9f2', '#58b3f4', '#68bdf6', '#79c7f8', '#8bd1f9', '#9ddafb', '#b0e3fc'];
      const bh = Math.max(40, hz - 20) / bands.length;
      bands.forEach((col, k) => D.rect(0, k * bh, W, bh + 1, col));
      const sx = W * 0.8 + pan * 0.05, sy = hz - 340;
      g.fillStyle = 'rgba(255,240,150,0.35)'; g.beginPath(); g.arc(sx, sy, 120, 0, 7); g.fill();
      g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(sx, sy, 78, 0, 7); g.fill();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.15, r0 = 100, r1 = 140; g.save(); g.translate(sx + Math.cos(a) * (r0 + r1) / 2, sy + Math.sin(a) * (r0 + r1) / 2); g.rotate(a); g.fillStyle = '#ffe066'; g.fillRect(-20, -6, 40, 12); g.restore(); }
      D.clouds(t, 31, Math.round(6 * W / 1920) + 1, Math.max(40, hz - 330), 1, pan * 0.2);
      D.rect(0, hz - 28, W, 34, '#2f8fd8'); D.rect(0, hz - 28, W, 6, '#7fd0ff');      // the sea
      const sr = rng(77);
      for (let k = 0; k < 14; k++) { const x = ((sr() * W + pan * 0.1) % W + W) % W, tw = Math.max(0, Math.sin(t * (2 + sr() * 3) + sr() * 6)); if (tw > 0.3) D.rect(x, hz - 18 + sr() * 16, 16, 4, '#ffffff', tw); }
      skyline(D, g, hz, pan * 0.35 - zc * 0.6, W);
      D.rect(0, hz + 4, W, H, '#86d36a');
    },
    // the park below one slice: grass, pools, the stilts. Drawn for the whole view before anything else, so the
    // ground never paints over the raised slide where it bends away
    ground(R, za, zb, near) {
      const D = root.SkiDraw, { cam, P3, t } = R;
      const ea = elev(za), eb = elev(zb);
      const grass = ((Math.floor(za / 8) % 2) + 2) % 2 ? '#86d36a' : '#7cc95f';
      const zp = clamp(FINISH - 2, za, zb);                         // (round the splash pool only either side of it: grass under it, from a slice drawn later, would show through it seen side on)
      if (zp > za) D.poly3(cam, [P3(za, -SKW, -ea), P3(za, SKW, -ea), P3(zp, SKW, -elev(zp)), P3(zp, -SKW, -elev(zp))], grass);
      if (zb > zp) for (const sd of [-1, 1]) D.poly3(cam, [P3(zp, sd * SKW, -elev(zp)), P3(zp, sd * (POOL_W + 1), -elev(zp)), P3(zb, sd * (POOL_W + 1), -eb), P3(zb, sd * SKW, -eb)], grass);
      for (const p of PARK.pools) {
        const z0 = Math.max(za, p.z0 - 0.5), z1 = Math.min(zb, p.z1 + 0.5);
        if (z1 <= z0) continue;
        const e0 = elev(z0) - 0.01, e1 = elev(z1) - 0.01;
        D.poly3(cam, [P3(z0, p.x0 - 0.5, -e0), P3(z0, p.x1 + 0.5, -e0), P3(z1, p.x1 + 0.5, -e1), P3(z1, p.x0 - 0.5, -e1)], '#ffffff');
        const w0 = Math.max(za, p.z0), w1 = Math.min(zb, p.z1);
        if (w1 > w0) D.poly3(cam, [P3(w0, p.x0, -elev(w0) + 0.01), P3(w0, p.x1, -elev(w0) + 0.01), P3(w1, p.x1, -elev(w1) + 0.01), P3(w1, p.x0, -elev(w1) + 0.01)], p.wave ? '#3fc6ec' : '#4fd0f0');
        if (p.wave && near) for (let k = 0; k < 3; k++) {          // a wave pool: lines of surf rolling in
          const len = p.z1 - p.z0, wz = p.z0 + ((t * 2.2 + k * len / 3) % len), a = Math.max(w0, wz), b = Math.min(w1, wz + 0.5);
          if (b > a) D.poly3(cam, [P3(a, p.x0 + 0.3, -elev(a) + 0.02), P3(a, p.x1 - 0.3, -elev(a) + 0.02), P3(b, p.x1 - 0.3, -elev(b) + 0.02), P3(b, p.x0 + 0.3, -elev(b) + 0.02)], '#ffffff', 0.8);
        }
      }
      if (zb > FINISH - 2) {                                      // the splash pool at the bottom
        const z0 = Math.max(za, FINISH - 2);
        D.poly3(cam, [P3(z0, -POOL_W - 1, -0.12), P3(z0, POOL_W + 1, -0.12), P3(zb, POOL_W + 1, -0.12), P3(zb, -POOL_W - 1, -0.12)], '#ffffff');
        D.poly3(cam, [P3(z0, -POOL_W, -0.1), P3(z0, POOL_W, -0.1), P3(zb, POOL_W, -0.1), P3(zb, -POOL_W, -0.1)], ((Math.floor(za / 4) % 2) + 2) % 2 ? '#3fc6ec' : '#4fd0f0');
        for (let k = 0; k < 4; k++) {                               // the waves, rolling in from the wave house
          const wz = WAVEH.z - ((t * 3 + k * 13) % 52), a = Math.max(z0, wz), b = Math.min(zb, wz + 0.8);
          if (b > a) D.poly3(cam, [P3(a, -POOL_W + 0.4, -0.08), P3(a, POOL_W - 0.4, -0.08), P3(b, POOL_W - 0.4, -0.08), P3(b, -POOL_W + 0.4, -0.08)], '#ffffff', 0.75 * Math.min(1, (wz - FINISH) / 12));
        }
        for (const rz of [FINISH + 40, WAVEH.z - 7]) if (rz >= z0 && rz < zb) {   // float lines across the pool, keeping swimmers off the wave house: a rope, red and white floats bobbing on it
          D.poly3(cam, [P3(rz - 0.05, -POOL_W, -0.06), P3(rz - 0.05, POOL_W, -0.06), P3(rz + 0.05, POOL_W, -0.06), P3(rz + 0.05, -POOL_W, -0.06)], '#2a4a8a');
          const g = D.ctx;
          for (let k = 0; k <= 30; k++) {
            const q = D.toCam(cam, P3(rz, lerp(-POOL_W + 0.5, POOL_W - 0.5, k / 30), 0.12 + 0.06 * Math.sin(t * 2.4 + k * 0.9)));
            if (q[2] < 1) continue;
            const [sx, sy] = D.scr(cam, q), r = Math.max(1.5, cam.F / q[2] * 0.3);
            g.fillStyle = k % 2 ? '#e8413a' : '#ffffff'; g.beginPath(); g.ellipse(sx, sy, r * 1.2, r, 0, 0, 7); g.fill();
          }
        }
      }
      if (near && ea > 1) for (let pz = Math.ceil((za - 4) / 8) * 8 + 4; pz < zb; pz += 8) {   // stilts and a cross beam
        const hy = course.height(pz), gy = hy - elev(pz);
        for (const sd of [-1, 1]) { const X = R.wx(pz, sd * (F + 0.4)); D.box3(cam, X - 0.22, X + 0.22, gy, hy - 0.5, pz - 0.22, pz + 0.22, { side: '#c9d3e2', rear: '#e6edf5', top: '#ffffff' }); }
        D.poly3(cam, [P3(pz, -F - 0.4, -0.9), P3(pz, F + 0.4, -0.9), P3(pz, F + 0.4, -0.6), P3(pz, -F - 0.4, -0.6)], '#b8c4d6');
      }
    },
    // one slice of the slide: the outside of the shell, the rim, the coloured trough, the water (and the tube)
    slice(R, za, zb, near) {
      const D = root.SkiDraw, { cam, S3, t } = R, mid = (za + zb) / 2;
      const a0 = amp(za), a1 = amp(zb), sec = SEC[course.sectionAt(mid)];
      if (a0 <= 0.01 && a1 <= 0.01) {                             // opened out into the pool: only water under her
        D.poly3(cam, [S3(za, -H_, 0.01), S3(za, H_, 0.01), S3(zb, H_, 0.01), S3(zb, -H_, 0.01)], '#5cd6f2', 0.6);
        return;
      }
      for (const sd of [-1, 1]) {                                  // outside of the shell, the white rolled rim, a dark edge
        const q = (z, x, up) => S3(z, sd * x, up);
        // only when it faces the camera: from inside the slide it is hidden, but drawn anyway it would show through
        // onto the inside of the slide further round a bend, like a dark shadow riding along ahead
        D.poly3(cam, [q(za, H_ + 0.35, 0), q(zb, H_ + 0.35, 0), [R.wx(zb, sd * (H_ + 0.2)), course.height(zb) - 0.7, zb], [R.wx(za, sd * (H_ + 0.2)), course.height(za) - 0.7, za]], sec.shell, 1, [sd, -0.05, -sd * course.slopeX(mid)]);
        D.poly3(cam, [q(za, H_, 0.02), q(zb, H_, 0.02), q(zb, H_ + 0.35, 0.02), q(za, H_ + 0.35, 0.02)], '#ffffff');
        D.poly3(cam, [q(za, H_ - 0.04, 0.03), q(zb, H_ - 0.04, 0.03), q(zb, H_ + 0.08, 0.03), q(za, H_ + 0.08, 0.03)], '#0d3170');
      }
      const xs = XN, shade = inTun(mid) ? sec.dark : null;        // the trough: flat floor, walls lighter towards the rim (same
      // cross-section near and far: a coarser one far off would leave a crack where they meet, showing the grass below)
      for (let k = 0; k < xs.length - 1; k++) {
        const xa = xs[k], xb = xs[k + 1], mx = Math.abs((xa + xb) / 2), wall = (shade || sec).wall;
        const col = mx < F ? (shade ? shade.floor : FLOOR) : wall[Math.min(2, Math.floor((mx - F) / WW * 3))];
        D.poly3(cam, [S3(za, xa), S3(za, xb), S3(zb, xb), S3(zb, xa)], col);
      }
      const wf = F + 0.5;                                          // a sheet of water over the floor
      D.poly3(cam, [S3(za, -F, 0.02), S3(za, F, 0.02), S3(zb, F, 0.02), S3(zb, -F, 0.02)], '#8fefff', 0.55);
      if (near) for (const sd of [-1, 1]) D.poly3(cam, [S3(za, sd * F, 0.02), S3(za, sd * wf, 0.02), S3(zb, sd * wf, 0.02), S3(zb, sd * F, 0.02)], '#d8f8ff', 0.45);
      if (zb > TUN[0] && za < TUN[1]) tube(D, R, Math.max(za, TUN[0]), Math.min(zb, TUN[1]), near, sec);
      if (!near) return;
      const r = rng(5100 + za);
      for (let k = 0; k < 2; k++) {                                // foam streaks flowing down the slide
        const x = (r() - 0.5) * 2 * (F - 0.3), len = 0.9, z0 = za + ((r() * (zb - za) + t * 7) % (zb - za)), z1 = Math.min(zb, z0 + len);
        D.poly3(cam, [S3(z0, x - 0.05, 0.03), S3(z0, x + 0.05, 0.03), S3(z1, x + 0.05, 0.03), S3(z1, x - 0.05, 0.03)], '#ffffff', 0.7);
      }
      const gx = (r() - 0.5) * 2 * F, gz = lerp(za, zb, r()), tw = Math.pow(Math.max(0, Math.sin(t * (4 + r() * 4) + r() * 6.3)), 6);
      if (tw > 0.05) {                                             // a glint of sun on the water
        const qq = D.toCam(cam, S3(gz, gx, 0.03));
        if (qq[2] > 2) { const [px, py] = D.scr(cam, qq), arm = Math.max(4, Math.round(cam.F / qq[2] * 0.16 / 4) * 4); D.rect(px - arm, py - 2, arm * 2, 4, '#ffffff', tw); D.rect(px - 2, py - arm, 4, arm * 2, '#ffffff', tw); }
      }
    },
    // palms and umbrellas in the park
    scenery(R) {
      const D = root.SkiDraw, { cam, add, lo, hi, zc, wx, t } = R;
      // the other mascots cheering on the pool deck round the splash pool
      if (R.zc > FINISH - 160) root.SkiWorld.crowd(R, { z0: FINISH - 2, z1: FINISH + 42, gap: POOL_W + 1.5 - course.HALF, stand: { top: '#f4fbff', top2: '#dff0f8', face: '#5ab8e0' } });
      if (zc > FINISH - 150) {                                     // 浪花泳池: the wave house, lifeguards, rings on the water; the beach behind the stands
        add(WAVEH.z + WAVEH.d / 2, () => waveHouse(D, R), false, 0);
        for (const sd of [-1, 1]) add(FINISH + 48, () => lifeguard(D, R, sd * 16.6, FINISH + 48), false, sd * 16.6);
        add(FINISH + 21.6, () => kiosk(D, R, 28, FINISH + 20), false, 28);
        for (const u of BEACH.umbs) add(u.z, () => umbrella(D, cam, wx(u.z, u.x), u.z, course.height(u.z), u.col), false, u.x);
        for (const l of BEACH.loungers) add(l.z, () => lounger(D, R, wx(l.z, l.x), l.z, l.col), false, l.x);
        for (const p of BEACH.palms) add(p.z, () => palm(D, cam, wx(p.z, p.x), p.z, course.height(p.z), p.h, p.lean, Math.abs(p.z - zc) > 45), false, p.x);
        for (const g of BEACH.rings) add(g.z, () => {
          const q = D.toCam(cam, [wx(g.z, g.x), course.height(g.z) - 0.06 + 0.07 * Math.sin(t * 2 + g.ph), g.z]);
          if (q[2] > 1) { const [sx, sy] = D.scr(cam, q); D.pix(ART.ring.rows, ART.ring.cols, sx, sy, ART.ring.cs * cam.F / q[2]); }
        }, false, g.x);
      }
      const hidden = z => inTun(zc) && z < TUN[1] + 2;            // from inside the tube only what lies past its mouth can show
      const gy = z => course.height(z) - elev(z);
      for (const d of PARK.rides) {
        if (d.z < lo - 12 || d.z > hi || Math.abs(d.z - zc) > 115 || hidden(d.z)) continue;
        const far = Math.abs(d.z - zc) > 55, X = wx(d.z, d.x);
        add(d.z, () => d.kind === 'spiral' ? spiralTower(D, cam, X, d.z, gy(d.z), d, far) : d.kind === 'bucket' ? bucketTower(D, cam, X, d.z, gy(d.z), d, t, far) : speedTower(D, cam, X, d.z, gy(d.z), d, far));
      }
      for (const m of PARK.mush) if (m.z > lo && m.z < hi && Math.abs(m.z - zc) < 60 && !hidden(m.z)) add(m.z, () => fountain(D, cam, wx(m.z, m.x), m.z, gy(m.z), m.col, t));
      for (const f of PARK.floats) {
        if (f.z < lo || f.z > hi || Math.abs(f.z - zc) > 60 || hidden(f.z)) continue;
        add(f.z, () => {
          const q = D.toCam(cam, [wx(f.z, f.x), gy(f.z) + 0.03 + 0.06 * Math.sin(t * 2 + f.ph), f.z]);
          if (q[2] > 1) { const [sx, sy] = D.scr(cam, q); D.pix(ART.ring.rows, ART.ring.cols, sx, sy, ART.ring.cs * cam.F / q[2]); }
        });
      }
      for (const p of PARK.palms) {
        if (p.z < lo || p.z > hi || hidden(p.z) || (Math.abs(p.z - zc) > 70 && Math.abs(p.x) > H_ + 12)) continue;
        add(p.z, () => palm(D, cam, wx(p.z, p.x), p.z, course.height(p.z) - elev(p.z), p.h, p.lean, Math.abs(p.z - zc) > 45));
      }
      for (const u of PARK.umbrellas) {
        if (u.z < lo || u.z > hi || Math.abs(u.z - zc) > 60 || hidden(u.z)) continue;
        add(u.z, () => umbrella(D, cam, wx(u.z, u.x), u.z, course.height(u.z) - elev(u.z), u.col));
      }
    },
    // arches over the slide: striped posts on the rim, a beam with bubbles; START / GOAL in orange with a label
    gate(R, z, i, label) {
      if (!label && inTun(z)) return;                             // no arches inside the tube
      const D = root.SkiDraw, { cam, P3, wx } = R, h = course.height(z), rim = h + amp(z);
      const col = label ? D.C.orange : i % 2 ? '#ffc93a' : '#ff6fa8', x = H_ + 0.55, y0 = h + (label ? 6.6 : 6.4), y1 = h + (label ? 8.1 : 7.5);
      for (const gx of [-x, x]) {
        const X = wx(z, gx), n = 5;
        for (let k = 0; k < n; k++) { const ya = lerp(rim - 0.2, y1, k / n), yb = lerp(rim - 0.2, y1, (k + 1) / n); D.box3(cam, X - 0.17, X + 0.17, ya, yb, z - 0.17, z + 0.17, { side: k % 2 ? col : '#ffffff', rear: k % 2 ? col : '#ffffff', top: '#ffffff' }); }
      }
      const f = D.poly3(cam, [P3(z, -x, y0 - h), P3(z, x, y0 - h), P3(z, x, y1 - h), P3(z, -x, y1 - h)], col);
      D.poly3(cam, [P3(z - 0.01, -x, y0 - h), P3(z - 0.01, x, y0 - h), P3(z - 0.01, x, y0 - h + 0.16), P3(z - 0.01, -x, y0 - h + 0.16)], '#ffffff');
      if (f && label) {
        D.print(cam, P3(z - 0.02, -x, y1 - h), P3(z - 0.02, x, y1 - h), P3(z - 0.02, -x, y0 + 0.16 - h), label === 'GOAL' ? GOAL_SIGN : label, { w: 2 * x, h: y1 - y0 - 0.16 });   // (printed on the banner: it leans with it)
      } else if (f) for (let k = 0; k < 6; k++) {
        const bx = lerp(-x + 1, x - 1, k / 5), by = (y0 + y1) / 2 - h + (k % 2 ? 0.15 : -0.12);
        D.poly3(cam, [P3(z - 0.02, bx - 0.14, by - 0.14), P3(z - 0.02, bx + 0.14, by - 0.14), P3(z - 0.02, bx + 0.14, by + 0.14), P3(z - 0.02, bx - 0.14, by + 0.14)], '#ffffff', 0.8);
      }
    },
    obstacle(R, o) {
      const D = root.SkiDraw;
      if (o.k === 'rope') rope(D, R, o);
      else if (o.k === 'pipe') pipe(D, R, o, R.t);
      else R.billboard(ART[o.k], o.z, o.x, 0);
    },
    // soap bubbles drifting up through the frame
    weather({ t }) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, r = rng(55);
      if (inTun(theme.camZ)) {                                    // inside the tube: dim towards the edges
        const k = Math.min(seg(theme.camZ, TUN[0], TUN[0] + 6), 1 - seg(theme.camZ, TUN[1] - 6, TUN[1]));
        const gr = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.25, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(5,10,30,0)'); gr.addColorStop(1, `rgba(5,10,30,${0.6 * k})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        return;
      }
      g.lineWidth = 4;
      for (let k = 0; k < 10; k++) {
        const sz = 10 + r() * 18, sp = 40 + r() * 50, x = (r() * W + Math.sin(t * 1.3 + k) * 30 + W) % W, y = H - ((t * sp + r() * H) % (H + 60)) + 30;
        g.strokeStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.arc(x, y, sz, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x - sz * 0.45, y - sz * 0.5, 6, 6);
      }
    },
    // map-screen thumbnail: sky, sun, a winding slide over the pool, a palm
    badge(g, x, y, w, h) {
      const R = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      R(0, 0, 1, 0.6, '#58b3f4'); R(0, 0.52, 1, 0.08, '#2f8fd8'); R(0, 0.6, 1, 0.4, '#86d36a'); R(0.08, 0.74, 0.84, 0.2, '#ffffff'); R(0.1, 0.76, 0.8, 0.16, '#4fd0f0');
      g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(x + 0.82 * w, y + 0.2 * h, 0.09 * h, 0, 7); g.fill();
      g.strokeStyle = '#e8508e'; g.lineWidth = Math.max(6, h * 0.08); g.lineJoin = 'round'; g.beginPath();
      g.moveTo(x + 0.12 * w, y + 0.18 * h); g.lineTo(x + 0.42 * w, y + 0.3 * h); g.lineTo(x + 0.2 * w, y + 0.46 * h); g.lineTo(x + 0.5 * w, y + 0.6 * h); g.lineTo(x + 0.46 * w, y + 0.8 * h); g.stroke();
      g.fillStyle = '#e8e2d4'; g.fillRect(x + 0.1 * w, y + 0.16 * h, 0.05 * w, 0.6 * h);
      g.fillStyle = '#9a6a3a'; g.fillRect(x + 0.78 * w, y + 0.36 * h, 0.03 * w, 0.4 * h);
      g.fillStyle = '#2f9a52'; g.beginPath(); g.moveTo(x + 0.66 * w, y + 0.42 * h); g.lineTo(x + 0.795 * w, y + 0.32 * h); g.lineTo(x + 0.93 * w, y + 0.42 * h); g.lineTo(x + 0.795 * w, y + 0.37 * h); g.fill();
    },
  };

  root.SkiMaps.define('water', { desc: '空中滑水道：彎道把你甩上牆、鑽進水管隧道，踩加速水流衝刺！', course, theme, music: { race: 'water', result: 'water_result' }, score: { par: 106, ranks: root.SkiScore.RANKS, key: 'ski-best-water' }, bg: '#58b3f4' });
})(typeof window !== 'undefined' ? window : globalThis);

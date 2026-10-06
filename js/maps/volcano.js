'use strict';
// 困難 · 火山熔岩: down a live volcano and out the other side. Its tricks: streams of lava across the slope to hop;
// volcanic bombs dropping out of the sky on to red rings (they are where the ring is, once she gets there); a crater
// rim with no walls; a fork round a lava fall (down a lava tube, ducking its drips, or through a field of fountains
// that shoot up in turn); a sulphur mine ridden in a mine cart on three rails (← → hop the cart to the next rail,
// over broken track, round barricades and runaway carts), out of the mountain and over a lava gorge; the lava lake
// crossed island to island, a steam vent throwing her over the widest stretch, until a gap that looks like the rest
// but is far too wide: the crust under it gives way and she falls into the volcano (slow motion); along the magma
// chamber inside it, past fountains and pools of lava, until the volcano erupts and blows her out through its side (slow
// motion, the camera turning back to watch the mountain blow), and she races the falling rocks down to a hot-spring
// village at its foot. Two more forks: on the cinder slope, steam vents to bounce from one to the next over a field of
// lava (left) or a lane of running lava to surf, balls of lava rolling across it (right); in the magma chamber, pools
// of lava to jump (left) or the lava current, more lava balls and a fountain (right).
(function (root) {
  const { clamp, lerp, seg, smooth, rng, mixHex, obX, obZ, obBurst } = root.SkiCore;

  // ------------------------------------------------------------ course
  const RIDGE = [330, 432];                                     // the crater rim: narrow, no walls
  const FORK = [486, 650];                                      // round the lava fall: the tube (left) / the fountains (right)
  const GEY = [664, 806];                                       // a field of fountains right across
  const MINE = [826, 1150];                                     // inside the mountain: the sulphur mine
  const RAIL = { z0: 812, z1: 1152, xs: [-3, 0, 3] };              // (into the cart a little before the mine's mouth)
  const CJ = 1146;                                              // the cart's last ramp, out over the gorge

  // one flight (the same integration as SkiPhysics): from height y0 at speed v rising at vy, until she is down to yc
  // above the ground (falling at `grade`); { z: how far, top: [z, height], at(z): height above the ground }
  function fly(vy, v, y0, yc, grade = 0) {
    const dt = 1 / 120, pts = [];
    let z = 0, y = y0, top = [0, y0];
    for (let i = 0; i < 4000; i++) {
      v -= 0.02 * v * dt; z += v * dt;
      if (vy < 0 && y + grade * z <= yc) break;
      vy -= 26 * dt; y += vy * dt;
      pts.push([z, y + grade * z]);
      if (y + grade * z > top[1]) top = [z, y + grade * z];
    }
    const at = q => { let k = 0; while (k < pts.length - 1 && pts[k][0] < q) k++; return pts[k][1]; };
    return { z, top, at };
  }
  const CART = { vy: 11, v: 30, rise: 1.2 }, B_CART = fly(CART.vy, CART.v, CART.rise, 0.3, 0.5);
  const SHORE = Math.round(CJ + 4 + B_CART.z - 4);              // where the far side of the gorge starts (a little short of where she lands)
  const STEAM = { vy: 13, v: 24 }, B_STEAM = fly(STEAM.vy, STEAM.v, 0.3, 0.3, 0.13);
  // ① the vents up the slope's left fork: a vent throws her the same way every time; coming down she is caught this
  // high over the next one (as on the toy factory's trampolines), on a slope falling at SLOPE
  const FA = [72, 182], VENT = { vy: 12, v: 24 }, VCATCH = 1.0, VMAT = 0.2, SLOPE = 0.2, V0 = 84, VX = -4.6;
  const VSOFT = VENT.vy - VCATCH / (2 * VENT.vy / 26);
  const B_V0 = fly(VENT.vy, VENT.v, 0.25, VMAT + VCATCH, SLOPE), B_VM = fly(VSOFT, VENT.v, VMAT + VCATCH, VMAT + VCATCH, SLOPE), B_VL = fly(VSOFT, VENT.v, VMAT + VCATCH, 0.3, SLOPE);
  const VC = [V0 + 2 + B_V0.z]; VC.push(VC[0] + B_VM.z);       // where she comes down on each vent past the first
  const VLAND = VC[1] + B_VL.z;
  const BLAST = { vy: 24, v: 26, rise: 0.4 }, B_BLAST = fly(BLAST.vy, BLAST.v, BLAST.rise, 0.3, 0.42);
  // the lava lake: islands [z0, z1] with lava between them (hop each gap); one has a steam vent at its end, thrown over the widest stretch
  const ISL = (() => {
    const out = [[SHORE, SHORE + 26]];
    let z = SHORE + 26;
    for (const [gap, len] of [[4, 22], [5, 22], [5, 24], [4, 22], [5, 22]]) { out.push([z + gap, z + gap + len]); z += gap + len; }
    const vent = z - 4;                                          // the steam vent at the end of that one
    const land = vent + 3 + B_STEAM.z;
    out.push([Math.round(land - 5), Math.round(land + 20)]); z = Math.round(land + 20);
    for (const [gap, len] of [[5, 22], [5, 22], [4, 24], [5, 22], [5, 26]]) { out.push([z + gap, z + gap + len]); z += gap + len; }
    return { list: out, vent, end: z };
  })();
  const LAKE = [SHORE, ISL.end];
  const EDGE = ISL.end;                                         // the end of the last island: the gap after it looks like the others, but is far too wide
  const FAKE = [EDGE + 22, EDGE + 40];                           // (the island across it: out of reach, a hop gets half way)
  const INSIDE = [EDGE + 16, EDGE + 202];                        // under the crust: the magma chamber inside the volcano
  const LAUNCH = INSIDE[1];                                     // the vent that blows her out through the mountain's side
  const EXIT = LAUNCH + 6;                                      // (the hole in the mountainside)
  const LAND = Math.round(LAUNCH + 3 + B_BLAST.z);
  const FINISH = LAND + 400;
  const FORK2 = [LAND + 120, LAND + 206];                        // round a cinder cone: through the falling bombs (left) / over the lava breaking out (right)
  const VILLAGE = FINISH - 70;

  const course = root.SkiCourse.build({
    id: 'volcano', HALF: 10, FINISH, LENGTH: FINISH + 100, START: 4,
    phys: { VMAX: 34, DRAG: 0.22, DRIFT: 0.4, CENT: 0, WALL_DRAG: 1.7, REWIND_V: 0.9, EDGE: 0.3 },   // (back after a fall nearly at speed: islands and gaps need it) (EDGE: off a wall-less edge only once her skis are off it, as she is seen to be: 數讀房市's rule)
    CX: [[0, 0], [40, 0], [FA[0], 0], [FA[1], 0], [200, 0], [250, -6], [300, -8], [330, -4], [356, 4], [384, -3], [410, 3], [432, 0],
      [FORK[0], 0], [FORK[1], 0], [700, 5], [760, -4], [806, 0], [840, 0], [900, -4], [960, 3], [1020, -3], [1080, 4], [1130, 0], [CJ, 0],
      ...ISL.list.slice(0, -1).map(([a, b], i) => [(a + b) / 2, i % 2 ? (i % 4 === 1 ? -2.5 : 2.5) : 0]), [ISL.end, 0],
      [EDGE + 60, 0], [INSIDE[0] + 90, 3], [INSIDE[0] + 150, -3], [LAUNCH, 0], [LAUNCH + 60, 0], [LAND + 40, 0], [LAND + 110, -6], [LAND + 180, 4], [LAND + 250, -5], [LAND + 310, 3], [VILLAGE, 0], [FINISH + 100, 0]],
    GRADE: [[0, 0.02], [12, 0.08], [30, 0.2], [RIDGE[0] - 10, 0.2], [RIDGE[0], 0.16], [RIDGE[1], 0.16], [RIDGE[1] + 10, 0.32], [476, 0.32], [486, 0.2],
      [MINE[0], 0.2], [MINE[0] + 18, 0.11], [CJ - 30, 0.11], [CJ, 0.16], [CJ + 4, 0.5], [SHORE + 4, 0.5], [SHORE + 14, 0.13], [EDGE, 0.13], [EDGE + 0.5, 4], [EDGE + 16, 4], [EDGE + 16.5, 0.04],   // (under the gap: down into the volcano)
      [EDGE + 50, 0.1], [INSIDE[0] + 90, 0.2], [LAUNCH - 12, 0.1], [LAUNCH + 3, 0.03], [LAUNCH + 4, 0.42], [LAND + 10, 0.42], [LAND + 40, 0.22], [FINISH - 30, 0.2], [FINISH, 0.1], [FINISH + 40, 0], [FINISH + 100, 0]],
    WIDTH: [[0, 7], [60, 8], [RIDGE[0] - 16, 8], [RIDGE[0], 3.4], [RIDGE[1], 3.4], [RIDGE[1] + 16, 8.5], [FORK[0] - 6, 9], [FORK[1] + 6, 9], [GEY[0], 8.5], [GEY[1], 8.5],
      [MINE[0] - 8, 8], [MINE[0] + 6, 4.6], [CJ + 4, 4.6], [SHORE + 4, 5.5], [SHORE + 22, 4], [ISL.end - 4, 4], [EDGE + 16, 4], [EDGE + 40, 7], [LAUNCH + 3, 7],
      [LAND - 6, 8], [FINISH, 8]],
    OPEN: [RIDGE, [SHORE + 26, ISL.end]],
    SPLIT: [{ m: [[FA[0] + 5, 0], [FA[0] + 16, 1.2], [FA[1] - 10, 1.2], [FA[1], 0]] },
      { m: [[INSIDE[0] + 61, 0], [INSIDE[0] + 72, 1.2], [INSIDE[0] + 142, 1.2], [INSIDE[0] + 152, 0]] },
      { m: [[FORK[0] - 1, 0], [FORK[0] + 12, 1.2], [FORK[1] - 12, 1.2], [FORK[1], 0]], L: [[FORK[0] + 3, 0], [FORK[0] + 20, -1.2], [FORK[1] - 24, -1.2], [FORK[1] - 8, 0]] },
      { m: [[FORK2[0] - 1, 0], [FORK2[0] + 10, 1.2], [FORK2[1] - 10, 1.2], [FORK2[1], 0]] }],
    RAIL: [RAIL],
    slow: [[EDGE + 1, EDGE + 32], [LAUNCH + 6, LAND - 4]],       // falling into the volcano, thrown out of it: in slow motion
    CAMYAW: [[LAUNCH + 12, 0], [LAUNCH + 26, 2.75], [LAND - 26, 2.75], [LAND - 10, 0]],   // the camera turns right round to watch the mountain blow
    gateEvery: 40,
    sections: [{ name: '熔岩坡道', z0: 0 }, { name: '噴泉峽谷', z0: RIDGE[1] + 4 }, { name: '礦車軌道', z0: MINE[0] - 10 }, { name: '熔岩湖', z0: CJ + 4 }, { name: '墜入火山', z0: EDGE - 24 }],
  }, (c, P) => {
    const { coin, row, boost } = P;
    const rock = (z, x, hw = 0.7) => P.hop('rock', z, x, hw, { h: 0.75 });                   // a lump of cinder: hop it
    const bomb = (z, x) => { P.tall('bomb', z, x, 1.0, { hd: 1.0 }); P.cue(z - 24, 'bomb', { x, near: 99 }); };   // a volcanic bomb: lands on its ring as she comes
    const lava = (z, len) => P.gap('lava', z, len);              // a stream of lava right across: hop it
    const arcOver = (z, len, y = 1.6) => coin(z + len / 2, 0, y);
    const spire = (z, x) => P.tall('spire', z, x, 1.0, { hd: 1.0 });                         // a basalt column
    const geyser = (z, x, period, ph) => P.burst('geyser', z, x, 1.1, period, { ph });       // a lava fountain
    const drip = z => P.over('drip', z, -5.1, 7.8, { y0: 1.3, y1: 2.6, hd: 0.5 });   // (no hop gets over it: under it crouched)           // a row of glowing drips in the lava tube: duck
    const pair = (z, y = 0.9) => { coin(z, -1.5, y); coin(z, 1.5, y); };

    // ① 熔岩坡道: black cinder slope. Streams of lava across it; a fork (steam vents / a lane of running lava); then volcanic bombs dropping on to red rings
    // round a long bend; out along the crater rim with no walls
    row(26, 0, 2); rock(44, -3); rock(44, 3);
    P.ramp(53, 0, 2, 1.0, 6); lava(62, 3); P.arc(57, 0, 4, 3);           // (a little ramp in the middle: fly it, the coins along its flight)
    // a fork round a ridge of rock: left, steam vents to bounce from one to the next over a field of lava (steer in the
    // air for the next); right, a lane of running lava to surf, balls of lava rolling across it, a fountain at its edge
    P.tall('spire', FA[0] + 6, 0, 0.8, { hd: 0.8 });                // (the fork's nose, a little way in: room to pick a side)
    const vent = (z, len, o) => P.launch(z, VX, 3.3, len, o.vy, o.v, o.rise, { k: 'steam', sfx: 'steam', pop: o.pop, catch: VCATCH, snap: true, grab: 1.1 });   // (a grating of vents right across the left way)
    const field = (z0, z1) => { if (z1 - z0 > 0.05) P.gap('field', z0, z1 - z0, { x: -4.6, hw: 3.4, nojump: true }); };
    vent(V0, 2, { ...VENT, rise: 0.25, pop: 'vents' });
    let fz = V0 + 2;
    VC.forEach(zc => { vent(zc - 3, 6.5, { ...VENT, rise: VMAT }); field(fz, zc - 3); fz = zc + 3.5; });
    field(fz, VLAND - 4);
    coin(V0 + 2 + B_V0.top[0], VX, B_V0.top[1] + 0.75); coin(VC[0] + B_VM.top[0], VX, B_VM.top[1] + 0.75); coin(VC[1] + B_VL.top[0], VX, B_VL.top[1] + 0.75);
    P.flow([[78, 4.6], [FA[1] - 6, 4.6]], 1.6);
    P.roll('lavaball', 100, 4.6, 0.8, 2.2, 2.4, { h: 0.75 }); P.roll('lavaball', 142, 4.6, 0.8, 2.2, 2.0, { h: 0.75 });
    geyser(121, 6.6, 2.4, 0.5); coin(90, 4.6); coin(121, 3); coin(158, 4.6);
    coin(203, 0);                                                // (no boost here: the lava lane has her going fast enough into the bombs)
    [[214, -2.5], [228, 3], [240, -4], [252, 1], [264, -3], [278, 4], [294, -2.4], [306, 3.5]].forEach(([z, x], k) => { bomb(z, x); if (k % 2 === 0) coin(z, x > 0 ? x - 3 : x + 3); });
    P.ramp(309, 0, 5.5, 1.0, 6); lava(318, 3); arcOver(318, 3);       // (one kicker right across: no gap between kickers to miss the jump in)
    coin(340, 0); P.hop('cinder', 360, -1.5, 0.6, { h: 0.7 }); coin(360, 1.5);
    P.hop('cinder', 378, 1.5, 0.6, { h: 0.7 }); coin(378, -1.5); coin(394, 0);
    P.hop('cinder', 408, 0, 0.6, { h: 0.7 }); coin(408, 0, 1.6); coin(420, 0);
    // ② 噴泉峽谷: down into the caldera; a lava fall splits the way. Left: a lava tube, low, glowing drips to duck and
    // columns to weave (more coins); right: lava fountains shooting up in turn. Then fountains right across
    rock(466, -3); rock(466, 3);
    spire(FORK[0], 0);
    for (const z of [506, 530, 556, 582, 606]) { drip(z); coin(z, -5.1, 0.6); }
    for (const [z, x] of [[520, -6.6], [570, -3.6], [618, -7.2]]) { spire(z, x); coin(z, x < -5 ? -3.4 : -6.6); }
    coin(636, -4.5);
    [[504, 'A'], [520, 'B'], [536, 'A'], [552, 'B'], [568, 'A'], [584, 'B'], [600, 'A'], [616, 'B'], [632, 'A']].forEach(([z, t], k) => {
      if (t === 'A') { geyser(z, 2.6, 2.2, k * 1.1); geyser(z, 7.8, 2.2, k * 1.1 + 2); if (k % 4 === 0) coin(z, 5.3); }
      else geyser(z, 5.2, 2.2, k * 1.1 + 1);
    });
    coin(560, 7.8);
    [[670, 3], [684, 2], [698, 3], [712, 2], [726, 3], [764, 2], [780, 3]].forEach(([z, n], k) => {   // a wave of fountains rolling across
      const xs = n === 3 ? [-5.2, 0, 5.2] : [-2.6, 2.6];
      xs.forEach(x => geyser(z, x, 2.4, k * 0.8 + x * 0.25));
      if (n === 3) coin(z, k % 4 ? 2.6 : -2.6); else if (k % 2) coin(z, 0);
    });
    boost(738, 0, 1.6, 6); coin(742, 0);
    coin(812, 0);
    // ③ 礦車軌道: into the sulphur mine, in a mine cart on three rails. ← → hop the cart across; jump the broken track,
    // barricades, carts running away down the line at her (sitting in a cart: nothing to duck); out of the mountain and over the lava gorge
    const R3 = [-3, 0, 3];
    const barrier = (z, i) => P.tall('barrier', z, R3[i], 0.9, { hd: 0.4 });
    const brk = (z, i, len = 4) => P.gap('brk', z, len, { x: R3[i], hw: 1.0 });
    const brkAll = (z, len) => P.gap('brk', z, len, { x: 0, hw: 4.6 });
    const mcart = (z, i) => P.car('mcart', z, R3[i], { k: 0.6, hw: 0.8, hd: 1.2, h: 99, honk: false, pass: 'clatter' });
    const onRail = (z, i) => coin(z + 2, R3[i]);
    P.cue(MINE[0] + 2, 'minein');
    onRail(852, 1, 3);
    barrier(868, 0); barrier(868, 2); onRail(862, 1, 2, 6);
    barrier(886, 1); onRail(880, 2, 3);
    brk(902, 2); onRail(898, 0, 3);
    brk(918, 1); onRail(914, 0);
    mcart(936, 0); barrier(936, 2); onRail(930, 1, 3);
    brk(952, 0); brk(952, 1); onRail(948, 2, 3);
    barrier(970, 2); mcart(970, 1); onRail(964, 0, 3);
    barrier(986, 0); onRail(982, 1);
    brkAll(1000, 3.5); coin(1001.75, 0, 1.6);
    barrier(1018, 1); barrier(1018, 0); onRail(1012, 2, 3);
    mcart(1034, 2); barrier(1034, 1); onRail(1028, 0, 3);
    brk(1050, 0, 5); onRail(1048, 1, 3);
    mcart(1064, 1); onRail(1060, 2);
    barrier(1080, 0); barrier(1080, 1); onRail(1074, 2, 3);
    brk(1096, 2); brk(1096, 1); onRail(1092, 0, 3);
    mcart(1112, 0); mcart(1112, 2); onRail(1106, 1, 3);
    boost(1124, 0, 4.4, 6); onRail(1134, 1, 1);
    P.launch(CJ, 0, 4.6, 4, CART.vy, CART.v, CART.rise, { k: 'cartjump', sfx: 'cartjump', pop: 'cartjump' });
    for (let z = CJ + 4.5; z < SHORE - 0.01; z += 4) P.gap('gorge', z, Math.min(4, SHORE - z), { thrown: true });   // (in short pieces: a hole is as high as the slope at its middle)
    for (let k = 1; k <= 5; k++) { const d = B_CART.z * k / 6; coin(CJ + 4 + d, 0, B_CART.at(d) + 0.75); }
    // ④ 熔岩湖: island to island across the lava lake (no walls: off the side is the lava); a steam vent throws her over
    // the widest stretch
    const L = ISL.list;
    for (let i = 1; i < L.length; i++) {
      const a = L[i - 1][1], b = L[i][0];
      if (a === ISL.vent + 4) continue;                           // (the vent's own stretch: in short pieces below)
      lava(a, b - a); coin(a + (b - a) / 2, 0, 1.7);
    }
    P.launch(ISL.vent, 0, 4, 3, STEAM.vy, STEAM.v, 0.3, { k: 'steam', sfx: 'steam', pop: 'steam' });
    for (let z = ISL.vent + 3.5; z < L.find(([a]) => a > ISL.vent)[0] - 0.01; z += 4) P.gap('lake', z, Math.min(4, L.find(([a]) => a > ISL.vent)[0] - z), { thrown: true });
    for (let k = 1; k <= 4; k++) { const d = B_STEAM.z * k / 5; coin(ISL.vent + 3 + d, 0, B_STEAM.at(d) + 0.75); }
    for (let i = 1; i < L.length - 1; i += 2) coin(L[i][0] + 8, 0);
    coin(SHORE + 14, 0);
    // ⑤ 墜入火山: the last island shakes; the gap after it looks like the others, the island across it close enough,
    // but no hop gets there: the crust gives way and she falls into the volcano, down into the magma chamber; along it
    // (fountains, pools of lava, glowing drips, columns); then the volcano blows and throws her out through its side;
    // down the outer slope with bombs raining and lava breaking out across it, to the hot-spring village
    P.cue(EDGE - 18, 'quake'); P.cue(EDGE + 1, 'crater'); P.cue(EDGE + 12, 'crust');
    for (let k = 1; k <= 2; k++) coin(EDGE + k * 3.5, 0, c.height(EDGE) + 1.6 - c.surf(EDGE + k * 3.5, 0));   // (out over the gap, like the others: a hop gets them)
    P.arc(EDGE + 6, 0, 3, 9);                                     // (and on the way down)
    const I = z => INSIDE[0] + z;
    // a fork round a wall of basalt: left, pools of lava to jump; right, the lava current, balls of lava, a fountain
    spire(I(62), 0);
    for (const z of [I(78), I(108), I(138)]) { P.gap('lava', z, 3, { x: -4.1, hw: 2.9 }); coin(z + 1.5, -4.1, 1.7); }
    P.flow([[I(68), 4.1], [I(148), 4.1]], 1.5);
    P.roll('lavaball', I(90), 4.1, 0.8, 1.8, 2.2, { h: 0.75 }); geyser(I(112), 5.9, 2.2, 1.2); P.roll('lavaball', I(134), 4.1, 0.8, 1.8, 2.0, { h: 0.75 });
    coin(I(100), 4.1); coin(I(124), 3); coin(I(146), 4.1);
    lava(I(160), 3); arcOver(I(160), 3);
    boost(I(166), 0, 1.6, 6); coin(I(176), 0);
    P.cue(LAUNCH - 14, 'erupt');
    P.launch(LAUNCH, 0, 7, 3, BLAST.vy, BLAST.v, BLAST.rise, { k: 'blast', sfx: 'blast', pop: 'blast' });
    for (let z = LAUNCH + 3.5; z < LAND - 4; z += 4) P.gap('crater', z, Math.min(4, LAND - 4 - z), { thrown: true });
    for (let k = 1; k <= 5; k++) { const d = B_BLAST.z * k / 6; coin(LAUNCH + 3 + d, 0, B_BLAST.at(d) + 0.75); }
    const E = z => LAND + z;
    P.ramp(E(31), 0, 2.2, 1.0, 6); lava(E(40), 3); P.arc(E(35), 0, 3, 3);
    [[56, -3], [68, 3.5], [80, -1], [92, 4], [104, -4]].forEach(([z, x], k) => { bomb(E(z), x); if (k === 2) coin(E(z), x > 0 ? x - 3 : x + 3); });
    boost(E(110), 0, 1.6, 5);
    spire(FORK2[0], 0);
    [[132, -2.2], [144, -7], [156, -2.2], [168, -7], [180, -2.2], [192, -6.8]].forEach(([z, x], k) => { bomb(E(z), x); coin(E(z), x < -4.5 ? -2.8 : -6); });   // left: the bombs (a straight way between them; the coins on the far side of each)
    const gapR = (z, len) => P.gap('lava', z, len, { x: 4.6, hw: 3.4 });   // right: lava breaking out across that side
    rock(E(133), 3); rock(E(133), 6.4); coin(E(133), 4.7, 1.6); gapR(E(160), 3); coin(E(161.5), 4.6, 1.7); coin(E(185), 4.6);
    boost(E(192), 4.6, 1.6, 5);
    P.ramp(E(203), -3.5, 2, 1.0, 6); P.ramp(E(203), 3.5, 2, 1.0, 6); lava(E(214), 3.5); arcOver(E(214), 3.5);
    coin(E(230), 0);                                              // (nothing big just past the lava: hopped down the middle, she comes down right there)
    rock(E(244), -3); rock(E(244), 3); coin(E(244), 0);
    lava(E(260), 3); arcOver(E(260), 3);
    boost(E(276), 0, 1.6, 6); coin(E(284), 0);
    rock(E(302), -2.5); rock(E(302), 2.5); coin(E(310), 0);
    for (const z of [E(322), E(332), E(342)]) boost(z, 0, 1.8, 5);       // a run of boost pads to the finish, flat out
    coin(FINISH - 6, 0);
  });

  root.SkiCourse.fitFlights(course);                           // the coins off the ramps and down into the volcano go where she really flies

  // ------------------------------------------------------------ look
  const HW = z => course.halfAt(z), gy = z => course.height(z), MED = z => course.medianAt(z);
  const inMine = z => z >= MINE[0] && z < MINE[1];
  const isOpen = z => course.openAt(z);
  const LAVA = ['#ff5a10', '#ff7a1a', '#ffb020'], CRUSTC = '#5a1e0e';
  const FOG = '#4a201c', FC = new Map();
  function fog(col, k) {                                         // far off, colours sink into the smoky red haze
    const q = Math.round(clamp(k) * 6);
    if (!q) return col;
    const key = col + q;
    let v = FC.get(key);
    if (!v) { v = mixHex(col, FOG, q / 6 * 0.85); FC.set(key, v); }
    return v;
  }
  const fogK = (R, z, x = 0) => clamp((root.SkiDraw.toCam(R.cam, R.P3(z, x))[2] - 50) / 75);
  const HOLES = course.obstacles.filter(o => o.hole);
  const holesIn = (za, zb, k) => HOLES.filter(o => (!k || k.includes(o.k)) && o.z + o.hd > za && o.z - o.hd < zb);
  const ISLAND = z => z >= SHORE + 26 && z < ISL.end;           // out on the lake (no walls)

  const PIX = {
    tree: { cs: 0.3, cols: { K: '#1a1210', B: '#2e2220', E: '#ff7a1a' }, rows: [
      '....K.....K....', '.K..K....K..K..', '..K.K...K..K...', '...KK..K..K....', '....KK.K.K.....', '.....KKKK......', '......KK.......', '......KK.......', '......KB.......', '.....BKE.......', '......KB.......', '.....BKKB......'] },
    sign: { cs: 0.16, cols: { Y: '#ffcf3a', K: '#1a1a1a', W: '#ffffff', R: '#d42f2f', B: '#5a4030' }, rows: [
      '....KK....', '...KYYK...', '..KYYYYK..', '..KYKKYK..', '.KYYKKYYK.', '.KYYKKYYK.', 'KYYYYYYYYK', 'KYYYKKYYYK', 'KKKKKKKKKK', '....BB....', '....BB....', '....BB....'] },
  };

  // ---- what stands round the course
  const SCENE = (() => {
    const r = rng(9091), spires = [], trees = [], fumes = [], falls = [], signs = [], crystals = [], houses = [], pools = [], lanterns = [], streams = [];
    const busy = z => (z > MINE[0] - 6 && z < MINE[1] + 4) || (z > EDGE - 6 && z < LAND + 10);
    for (let z = 10; z < FINISH + 60; z += 9 + r() * 10) for (const sd of [-1, 1]) {
      if (busy(z) || r() < 0.2) continue;
      const low = (z > SHORE && z < ISL.end + 20) || (z > RIDGE[0] - 10 && z < RIDGE[1] + 10), x = sd * (HW(z) + (low ? 12 : 6) + r() * (low ? 30 : 22));   // (well clear of the course: never mistaken for something in the way)
      spires.push({ z: z + r() * 4, x, h: 5 + r() * (low ? 9 : 7), w: 1.3 + r() * 1.5, seed: (r() * 1e6) | 0 });
    }
    for (let z = 20; z < RIDGE[0]; z += 6 + r() * 8) for (const sd of [-1, 1]) if (r() < 0.55) trees.push({ z, x: sd * (HW(z) + 2.5 + r() * 18), s: 0.8 + r() * 0.6 });
    for (let z = LAND + 20; z < VILLAGE - 20; z += 7 + r() * 9) for (const sd of [-1, 1]) if (r() < 0.45) trees.push({ z, x: sd * (HW(z) + 2.5 + r() * 18), s: 0.8 + r() * 0.6 });
    for (let z = 30; z < FINISH; z += 40 + r() * 50) { if (busy(z) || (z > SHORE && z < ISL.end)) continue; fumes.push({ z, x: (r() < 0.5 ? -1 : 1) * (HW(z) + 4 + r() * 10), ph: r() * 6 }); }
    for (let z = RIDGE[1] + 30; z < MINE[0] - 10; z += 36) falls.push({ z, sd: Math.floor(z / 36) % 2 ? 1 : -1 });
    for (let z = 40; z < FINISH; z += 22 + r() * 30) { if (busy(z) || (z > SHORE && z < ISL.end + 20)) continue; crystals.push({ z, x: (r() < 0.5 ? -1 : 1) * (HW(z) + 2 + r() * 8), h: 0.8 + r() * 1.4, seed: (r() * 1e6) | 0 }); }
    for (const [z, t] of [[56, '高溫危險'], [200, '小心落石'], [RIDGE[0] - 8, '火口緣'], [FORK[0] - 20, '← 熔岩管　噴泉區 →'], [LAND + 30, '快逃！'], [LAND + 126, '小心落石']]) signs.push({ z, t, sd: signs.length % 2 ? 1 : -1 });
    for (let z = VILLAGE - 10; z < FINISH + 70; z += 13) for (const sd of [-1, 1]) houses.push({ z: z + (sd > 0 ? 6 : 0), sd, x: HW(z) + 6 + ((z * 7) % 5), col: ['#c8463a', '#3a6a9a', '#5a8a4a', '#b07a3a'][Math.floor(z / 13 + (sd > 0 ? 1 : 0)) % 4] });
    for (let z = VILLAGE; z < FINISH + 50; z += 22) for (const sd of [-1, 1]) pools.push({ z: z + (sd > 0 ? 11 : 0), x: sd * (HW(z) + 2.8), ph: r() * 6 });
    for (let z = VILLAGE - 30; z < FINISH; z += 8) for (const sd of [-1, 1]) lanterns.push({ z, sd });
    for (let z = 0; z < FINISH; z += 150 + r() * 60) { if (busy(z) || (z > SHORE - 20 && z < ISL.end + 30)) continue; streams.push({ z, sd: r() < 0.5 ? -1 : 1, len: 18 + r() * 14, x: 14 + r() * 10 }); }
    const byZ = a => a.sort((p, q) => p.z - q.z);
    return { spires: byZ(spires), trees: byZ(trees), fumes, falls, signs, crystals, houses, pools, lanterns, streams };
  })();

  // ---- small helpers
  const TXT = new Map();
  function textImg(str, col, stroke) {                          // a word set once into its own canvas, then just scaled
    const key = str + '|' + col + '|' + stroke;
    let im = TXT.get(key);
    if (im) return im;
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.check("48px 'Cubic11'")) return null;
    const S = 48, pad = 8, g0 = document.createElement('canvas').getContext('2d');
    g0.font = `${S}px 'Cubic11'`;
    const w = Math.ceil(g0.measureText(str).width) + pad * 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = S + pad * 2;
    const g = cv.getContext('2d'); g.font = `${S}px 'Cubic11'`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = 6; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(str, w / 2, cv.height / 2 + 2); }
    g.fillStyle = col; g.fillText(str, w / 2, cv.height / 2 + 2);
    im = { cv, w, h: cv.height, S }; TXT.set(key, im);
    return im;
  }
  function text3(D, R, p, str, size, col, o = {}) {              // a word facing the camera at p, `size` world units tall
    const q = D.toCam(R.cam, p);
    if (q[2] < 1 || q[2] > (o.far || 80)) return;
    const [sx, sy] = D.scr(R.cam, q), px = R.cam.F / q[2] * size;
    if (px < 7) return;
    const im = textImg(str, col, o.stroke || null);
    if (!im) { D.txt(str, sx, sy + px * 0.38, { size: Math.round(px), color: col, align: 'center' }); return; }
    const k = px / im.S, w = im.w * k, h = im.h * k;
    D.ctx.drawImage(im.cv, sx - w / 2, sy - h / 2, w, h);
  }
  function glowDot(D, R, p, rad, col, a = 0.5) {                 // a glow: a soft disc and a bright core
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.8) return;
    const [sx, sy] = D.scr(R.cam, q), rr = clamp(R.cam.F / q[2] * rad, 2, 60), g = D.ctx;
    if (rr < 5) { D.rect(sx - rr, sy - rr, rr * 2, rr * 2, col, Math.min(1, a * 1.6)); return; }
    g.save(); g.globalAlpha *= a * 0.4; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr * 2.2, 0, 7); g.fill();
    g.globalAlpha = Math.min(1, a * 2); g.beginPath(); g.arc(sx, sy, rr * 0.8, 0, 7); g.fill(); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(sx, sy, rr * 0.4, 0, 7); g.fill(); g.restore();
  }
  function ball3(D, R, p, rad, col, hi = null) {                  // a ball: a disc (with a shine)
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.6) return null;
    const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * rad, g = D.ctx;
    if (rr < 1.5) { D.rect(sx - 1, sy - 1, 2, 2, col); return [sx, sy, rr]; }
    g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
    if (hi && rr > 3) { g.fillStyle = hi; g.beginPath(); g.arc(sx - rr * 0.3, sy - rr * 0.3, rr * 0.35, 0, 7); g.fill(); }
    return [sx, sy, rr];
  }
  function boxS(D, R, z0, z1, x0, x1, y0, y1, cols) {             // a box standing on the riding surface
    const p = (z, x, y) => R.S3(z, x, y), cam = R.cam;
    D.poly3(cam, [p(z0, x0, y1), p(z0, x1, y1), p(z1, x1, y1), p(z1, x0, y1)], cols.top, 1, [0, 1, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z1, x0, y0), p(z1, x0, y1), p(z0, x0, y1)], cols.side, 1, [-1, 0, 0]);
    D.poly3(cam, [p(z0, x1, y0), p(z1, x1, y0), p(z1, x1, y1), p(z0, x1, y1)], cols.side, 1, [1, 0, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z0, x1, y0), p(z0, x1, y1), p(z0, x0, y1)], cols.front, 1, [0, 0, -1]);
    if (cols.back) D.poly3(cam, [p(z1, x0, y0), p(z1, x1, y0), p(z1, x1, y1), p(z1, x0, y1)], cols.back, 1, [0, 0, 1]);
  }
  // a faceted lump of rock on the course at (z, x): w wide, h high, a glowing crack or two in its face
  function rock3(D, R, z, x, w, h, seed, k = 0, glow = 0.6, base = '#3a2e2c') {
    const r = rng(seed), c = v => fog(v, k), S = (dz, dx, y) => R.S3(z + dz, x + dx, y), cam = R.cam;
    const tl = [-w * (0.55 + r() * 0.2), h * (0.7 + r() * 0.2)], tm = [w * (r() - 0.5) * 0.4, h], tr = [w * (0.5 + r() * 0.2), h * (0.75 + r() * 0.2)];
    const d = w * 0.8;
    D.poly3(cam, [S(-d * 0.3, -w, 0), S(-d * 0.3, w, 0), S(-d * 0.1, tr[0], tr[1]), S(0, tm[0], tm[1]), S(-d * 0.1, tl[0], tl[1])], c(base));   // the face
    D.poly3(cam, [S(-d * 0.1, tl[0], tl[1]), S(0, tm[0], tm[1]), S(d * 0.6, tm[0] * 0.5, tm[1] * 0.85), S(d * 0.4, tl[0] * 0.8, tl[1] * 0.8)], c(mixHex(base, '#ffffff', 0.12)));   // its top
    D.poly3(cam, [S(0, tm[0], tm[1]), S(-d * 0.1, tr[0], tr[1]), S(d * 0.4, tr[0] * 0.8, tr[1] * 0.8), S(d * 0.6, tm[0] * 0.5, tm[1] * 0.85)], c(mixHex(base, '#ffffff', 0.06)));
    for (const sd of [-1, 1]) D.poly3(cam, [S(-d * 0.3, sd * w, 0), S(d * 0.5, sd * w * 0.8, 0), S(d * 0.4, sd > 0 ? tr[0] * 0.8 : tl[0] * 0.8, (sd > 0 ? tr[1] : tl[1]) * 0.8), S(-d * 0.1, sd > 0 ? tr[0] : tl[0], sd > 0 ? tr[1] : tl[1])], c(mixHex(base, '#000000', 0.25)), 1, [sd, 0, 0]);
    if (glow > 0 && k < 0.7) {                                    // cracks of lava in its face
      for (let j = 0; j < 2; j++) {
        const x0 = (r() - 0.5) * w * 1.2, y0 = r() * h * 0.3, x1 = x0 + (r() - 0.5) * w * 0.8, y1 = h * (0.45 + r() * 0.3);
        D.poly3(cam, [S(-d * 0.31, x0 - 0.05, y0), S(-d * 0.31, x0 + 0.05, y0), S(-d * 0.2, x1 + 0.03, y1), S(-d * 0.2, x1 - 0.03, y1)], LAVA[1 + (j % 2)], glow);
      }
    }
  }
  // a pool of lava (the part of rectangle z0..z1 × x0..x1 inside slice [za, zb]) at height `up`: bright, its crust drifting
  function lavaPool(D, R, z0, z1, x0, x1, up, za, zb, near, t) {
    const a = Math.max(za, z0), b = Math.min(zb, z1), { cam, S3 } = R;
    if (b <= a) return;
    D.poly3(cam, [S3(a, x0, up), S3(a, x1, up), S3(b, x1, up), S3(b, x0, up)], LAVA[0]);
    if (!near) return;
    const r = rng(Math.floor(a * 3) + 77);
    for (let k = 0; k < 3; k++) {                                  // blobs of crust drifting by, and bright seams
      const z = lerp(a, b, r()), x = lerp(x0 + 0.3, x1 - 0.3, (r() + t * 0.05 * (k % 2 ? 1 : -1)) % 1), s = 0.25 + r() * 0.5;
      if (z - s < a || z + s > b) continue;
      D.poly3(cam, [S3(z - s, x - s * 1.4, up + 0.01), S3(z - s * 0.5, x + s * 1.2, up + 0.01), S3(z + s, x + s, up + 0.01), S3(z + s * 0.6, x - s, up + 0.01)], CRUSTC, 0.75);
    }
    const ph = (t * 1.3) % 1;
    D.poly3(cam, [S3(a, x0, up + 0.012), S3(a, x1, up + 0.012), S3(b, x1, up + 0.012), S3(b, x0, up + 0.012)], LAVA[2], 0.18 + 0.12 * Math.sin(ph * Math.PI * 2 + a));
  }

  // ---- the ground under a raised course: a lake of lava below the rim, the gorge, the islands, the crater
  const LOW = z => (z >= RIDGE[0] - 6 && z < RIDGE[1] + 6) || (z >= CJ + 2 && z < SHORE + 2) || (z >= SHORE + 24 && z < ISL.end + 4) || (z >= LAUNCH + 2 && z < LAND - 2);
  const DEEP = z => (z >= CJ + 2 && z < SHORE + 2) ? 18 : z >= LAUNCH + 2 && z < LAND - 2 ? 24 : 6;
  function lavaSea(D, R, za, zb, near, level = null) {           // (level: at that height, not a depth under the course)
    const { cam, P3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), dep = DEEP((za + zb) / 2), W = 90;
    const ya = level ?? gy(za) - dep, yb = level ?? gy(zb) - dep, X = R.wx;
    const Q = (x0, x1, col, a = 1, up = 0, s = 0) => { const z0 = za + s, z1 = zb - s, y0 = ya + (yb - ya) * s / (zb - za), y1 = yb - (yb - ya) * s / (zb - za); D.poly3(cam, [[X(z0, x0), y0 + up, z0], [X(z0, x1), y0 + up, z0], [X(z1, x1), y1 + up, z1], [X(z1, x0), y1 + up, z1]], col, a); };
    Q(-W, W, fog(near ? '#ff6a1a' : '#d04a18', k * 0.7));
    if (k > 0.75) return;
    const r = rng(Math.floor(za / 2) * 131 + 7), s = near ? 0.22 : 0.6;   // plates of dark crust riding on it, the glow showing in the seams
    for (let x = -80 + r() * 5; x < 77;) {
      const w = 3 + r() * 6, j = r(), dx = Math.sin(t * 0.15 + x) * 0.3;
      if (j > 0.18) Q(x + 0.3 + dx, x + w - 0.3 + dx, fog(j < 0.6 ? '#3a1a12' : '#4a2418', k * 0.7), 1, 0.01, s * (0.6 + r() * 0.8));
      x += w;
    }
    if (near) Q(-W, W, LAVA[2], 0.08 + 0.07 * Math.sin(t * 2 + za * 0.3), 0.02);
  }
  function cliffs(D, R, za, zb, near) {                           // a raised stretch's rock sides, down to the lava
    const { cam, P3 } = R, dep = DEEP((za + zb) / 2) + 0.5, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k);
    for (const sd of [-1, 1]) {
      const xa = sd * HW(za), xb = sd * HW(zb);
      D.poly3(cam, [P3(za, xa, 0), P3(zb, xb, 0), P3(zb, xb * 1.15 + sd * 0.6, -dep), P3(za, xa * 1.15 + sd * 0.6, -dep)], c(Math.floor(za / 4) % 2 ? '#2a201e' : '#261c1a'), 1, [sd, 0, 0]);
      D.poly3(cam, [P3(za, xa, -0.02), P3(zb, xb, -0.02), P3(zb, xb + sd * 0.25, -0.5), P3(za, xa + sd * 0.25, -0.5)], LAVA[1], near ? 0.55 : 0.3);   // glowing from below
    }
  }

  // ---- the course surface
  const BASALT = ['#3b302e', '#362c2a'];
  function cracks(D, R, za, zb, x0, x1, n, a = 0.75) {          // thin glowing cracks in the black rock
    const r = rng(Math.floor(za * 7) + 11), { cam, S3 } = R;
    for (let k = 0; k < n; k++) {
      const z = lerp(za, zb, r()), x = lerp(x0, x1, r()), dz = (r() - 0.5) * 1.6, dx = 0.6 + r() * 1.4;
      D.poly3(cam, [S3(z, x, 0.012), S3(z + dz * 0.5, x + dx * 0.5, 0.012), S3(z + dz, x + dx, 0.012), S3(z + dz + 0.06, x + dx, 0.012), S3(z + dz * 0.5 + 0.08, x + dx * 0.5, 0.012), S3(z + 0.08, x, 0.012)], LAVA[1 + (k % 2)], a);
    }
  }
  function slopeSlice(D, R, za, zb, near) {                       // black cinder with glowing cracks, a rocky berm each side, the land out to the horizon
    const { cam, S3, P3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k), h0 = HW(za), h1 = HW(zb), med = Math.max(MED(za), MED(zb));
    const holes = holesIn(za, zb, ['lava']), cuts = [za, zb];
    for (const o of holes) for (const e of [o.z - o.hd, o.z + o.hd]) if (e > za && e < zb) cuts.push(e);
    cuts.sort((p, q) => p - q);
    D.poly3(cam, [P3(za, -70, -0.05), P3(za, 70, -0.05), P3(zb, 70, -0.05), P3(zb, -70, -0.05)], c(Math.floor(za / 8) % 2 ? '#2c2322' : '#2f2524'));   // the land round about
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2, ha = HW(a), hb = HW(b);
      if (holes.some(o => m > o.z - o.hd && m < o.z + o.hd)) {    // a stream of lava across: hot, bright, its banks glowing
        lavaPool(D, R, a, b, -ha - 1, ha + 1, -0.35, a, b, near, t);
        continue;
      }
      const col = c(BASALT[((Math.floor(a / 4) % 2) + 2) % 2]);
      if (med > 0.01) {
        const ma = MED(a), mb = MED(b);
        D.poly3(cam, [S3(a, -ha, 0), S3(a, -ma, 0), S3(b, -mb, 0), S3(b, -hb, 0)], c(Math.floor(a / 4) % 2 ? '#3a2422' : '#352220'));   // down in the tube
        D.poly3(cam, [S3(a, ma, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, mb, 0)], col);
      } else D.poly3(cam, [S3(a, -ha, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, -hb, 0)], col);
    }
    for (const o of holes) for (const e of [o.z - o.hd, o.z + o.hd]) if (e >= za && e < zb) {   // crusted lips on its banks
      const h = HW(e);
      D.poly3(cam, [S3(e - 0.25, -h, 0.03), S3(e - 0.25, h, 0.03), S3(e + 0.25, h, 0.03), S3(e + 0.25, -h, 0.03)], '#7a2a10');
    }
    for (const o of holesIn(za, zb, ['field'])) lavaPool(D, R, Math.max(za, o.z - o.hd), Math.min(zb, o.z + o.hd), o.x - o.hw, o.x + o.hw, 0.01, za, zb, near, t);   // the field of lava under the vents
    if (near && !holes.length && !course.railAt(za)) cracks(D, R, za, zb, -h0 + 0.5, h0 - 2, 2);
    railTrack(D, R, za, zb, near, [], c);                          // (the track starts out here, before the mine)
    if (near && Math.floor(za / 2) % 3 === 0) for (const sd of [-1, 1]) {   // fissures in the land either side, glowing
      const r = rng(Math.floor(za) * 5 + sd + 3), x = sd * (h0 + 3 + r() * 14), w = 0.15 + r() * 0.2;
      D.poly3(cam, [P3(za, x - w, -0.03), P3(za, x + w, -0.03), P3(zb, x + w + sd * r() * 1.5, -0.03), P3(zb, x - w + sd * r() * 1.5, -0.03)], LAVA[1], 0.8);
    }
    for (const sd of [-1, 1]) {                                    // berms of black rock, a glowing seam along their foot
      const xa = sd * h0, xb = sd * h1, n = [-sd, 0, 0];
      D.poly3(cam, [S3(za, xa, 0), S3(zb, xb, 0), S3(zb, xb + sd * 0.7, 1.0), S3(za, xa + sd * 0.7, 1.0)], c('#4a3b38'), 1, n);
      D.poly3(cam, [S3(za, xa + sd * 0.7, 1.0), S3(zb, xb + sd * 0.7, 1.0), S3(zb, xb + sd * 1.8, 0.6), S3(za, xa + sd * 1.8, 0.6)], c('#2a201e'));
      if (near) D.poly3(cam, [S3(za, xa, 0.01), S3(zb, xb, 0.01), S3(zb, xb + sd * 0.12, 0.2), S3(za, xa + sd * 0.12, 0.2)], LAVA[1], 0.7);
    }
    if (med > 0.01) {                                              // the wall of rock between the two ways, and the lava tube's vault over the left one
      const ma = MED(za), mb = MED(zb), M = (z, x, y) => R.W3(z, x, gy(z) + y);
      D.poly3(cam, [M(za, -ma, -1.2), M(zb, -mb, -1.2), M(zb, -mb, 1.8), M(za, -ma, 1.8)], c('#2e2422'), 1, [-1, 0, 0]);
      D.poly3(cam, [M(za, ma, 0), M(zb, mb, 0), M(zb, mb, 1.8), M(za, ma, 1.8)], c('#3a2e2c'), 1, [1, 0, 0]);
      D.poly3(cam, [M(za, -ma, 1.8), M(za, ma, 1.8), M(zb, mb, 1.8), M(zb, -mb, 1.8)], c('#4a3b38'));
      tube(D, R, za, zb, near, k);
    }
  }
  const TUBE = [FORK[0] + 18, FORK[1] - 22];
  function tube(D, R, za, zb, near, k) {                           // the lava tube: a low vault of black rock, lit by the lava seeping through
    const a = Math.max(za, TUBE[0]), b = Math.min(zb, TUBE[1]);
    if (b <= a) return;
    const { cam } = R, c = v => fog(v, k), M = (z, x, y) => R.W3(z, x, gy(z) - 1.2 + y), H = 8.5, X0 = -HW(a) - 0.2, X1 = -MED(a);
    const arc = (z, u) => [lerp(X0, X1 + 0.6, u), Math.sin(Math.PI * u) * H * 0.35 + H * 0.65];
    for (let j = 0; j < 6; j++) {                                  // the vault, in six strips
      const [xa, ya] = arc(a, j / 6), [xb, yb] = arc(a, (j + 1) / 6);
      D.poly3(cam, [M(a, xa, ya), M(a, xb, yb), M(b, xb, yb), M(b, xa, ya)], c(j % 2 ? '#2a1e1c' : '#261a18'), 1, [0, -1, 0]);
    }
    D.poly3(cam, [M(a, X0, 0), M(b, X0, 0), M(b, X0, H * 0.45), M(a, X0, H * 0.45)], c('#2e2220'), 1, [1, 0, 0]);
    if (near) for (let z = Math.ceil(a / 3) * 3; z < b; z += 3) {  // glowing seams across the roof
      const [xa, ya] = arc(z, 0.2), [xb, yb] = arc(z, 0.8);
      D.poly3(cam, [M(z, xa, ya - 0.05), M(z, xb, yb - 0.05), M(z + 0.12, xb, yb - 0.05), M(z + 0.12, xa, ya - 0.05)], LAVA[1], 0.6);
    }
    if (a === TUBE[0] || (za <= TUBE[0] && zb > TUBE[0])) {         // its mouth: a ragged arch
      for (let j = 0; j < 6; j++) { const [xa, ya] = arc(a, j / 6), [xb, yb] = arc(a, (j + 1) / 6); D.poly3(cam, [M(a, xa, ya), M(a, xb, yb), M(a, xb, yb + 1.2), M(a, xa, ya + 1.2)], c('#3a2c2a'), 1, [0, 0, -1]); }
    }
  }
  function rimSlice(D, R, za, zb, near) {                          // a raised stretch (rim, islands, the far side of the gorge): rock on top, no walls
    const { cam, S3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k);
    const holes = holesIn(za, zb), cuts = [za, zb];
    for (const o of holes) for (const e of [o.z - o.hd, o.z + o.hd]) if (e > za && e < zb) cuts.push(e);
    cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2, ha = HW(a), hb = HW(b);
      if (holes.some(o => m > o.z - o.hd && m < o.z + o.hd)) continue;   // (a gap: the lava below shows)
      D.poly3(cam, [S3(a, -ha, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, -hb, 0)], c(BASALT[((Math.floor(a / 4) % 2) + 2) % 2]));
      if (near) for (let x = -ha + 1.2; x < ha - 0.5; x += 2.4) D.poly3(cam, [S3(a, x, 0.01), S3(a, x + 0.06, 0.01), S3(b, x + 0.06, 0.01), S3(b, x, 0.01)], '#2a201e');   // the tops of hexagonal columns
      for (const sd of [-1, 1]) {
        const xa = sd * ha, xb = sd * hb, dep = DEEP(m) + 0.5;
        D.poly3(cam, [S3(a, xa, 0), S3(b, xb, 0), S3(b, xb * 1.1 + sd * 0.5, -dep), S3(a, xa * 1.1 + sd * 0.5, -dep)], c(Math.floor(a / 4) % 2 ? '#2a201e' : '#261c1a'), 1, [sd, 0, 0]);
        D.poly3(cam, [S3(a, xa, -0.02), S3(b, xb, -0.02), S3(b, xb + sd * 0.2, -0.45), S3(a, xa + sd * 0.2, -0.45)], LAVA[1], near ? 0.5 : 0.25);
      }
    }
    for (const o of holes) for (const [e, dir] of [[o.z - o.hd, 1], [o.z + o.hd, -1]]) if (e >= za && e < zb && !holes.some(p => p !== o && Math.abs((dir > 0 ? p.z + p.hd : p.z - p.hd) - e) < 0.05)) {   // an island's end: a sheer face down to the lava
      const h = HW(e), dep = DEEP(e) + 0.5;
      D.poly3(cam, [S3(e, -h, 0), S3(e, h, 0), S3(e, h * 1.1, -dep), S3(e, -h * 1.1, -dep)], c('#2e2321'), 1, [0, 0, dir]);
      D.poly3(cam, [S3(e, -h, -0.02), S3(e, h, -0.02), S3(e, h, -0.45), S3(e, -h, -0.45)], LAVA[1], 0.45);
    }
  }
  // the track: sleepers and two steel rails for each of the three (gone where it is broken)
  function railTrack(D, R, za, zb, near, brks, c) {
    if (!course.railAt((za + zb) / 2) && !(za < RAIL.z0 && zb > RAIL.z0 - 12)) return;
    const { cam, S3 } = R, broken = (z, x) => brks.some(o => Math.abs(z - o.z) < o.hd && Math.abs(x - o.x) < o.hw);
    for (const rx of RAIL.xs) {
      if (near) for (let z = Math.ceil(za / 1.2) * 1.2; z < zb; z += 1.2) if (!broken(z, rx)) D.poly3(cam, [S3(z - 0.18, rx - 0.75, 0.02), S3(z - 0.18, rx + 0.75, 0.02), S3(z + 0.18, rx + 0.75, 0.02), S3(z + 0.18, rx - 0.75, 0.02)], c('#5a4030'));
      for (const sx of [-0.45, 0.45]) {                            // the two rails (gone where the track is broken)
        let a = za;
        const cuts = [za, zb]; for (const o of brks) if (Math.abs(rx - o.x) < o.hw) { if (o.z - o.hd > za && o.z - o.hd < zb) cuts.push(o.z - o.hd); if (o.z + o.hd > za && o.z + o.hd < zb) cuts.push(o.z + o.hd); }
        cuts.sort((p, q) => p - q);
        for (let i = 0; i < cuts.length - 1; i++) { a = cuts[i]; const b = cuts[i + 1]; if (broken((a + b) / 2, rx)) continue; D.poly3(cam, [S3(a, rx + sx - 0.07, 0.1), S3(a, rx + sx + 0.07, 0.1), S3(b, rx + sx + 0.07, 0.1), S3(b, rx + sx - 0.07, 0.1)], c('#b8c0cc')); }
      }
    }
  }
  // the mine: gravel between the rails, sleepers and steel, rock walls, timber frames, lanterns; broken track glowing below
  function mineSlice(D, R, za, zb, near) {
    const { cam, S3, P3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2) * 0.7, c = v => fog(v, k), h0 = HW(za), h1 = HW(zb), CEIL = 5.2;
    const brks = holesIn(za, zb, ['brk']);
    D.poly3(cam, [S3(za, -h0, 0), S3(za, h0, 0), S3(zb, h1, 0), S3(zb, -h1, 0)], c(Math.floor(za / 4) % 2 ? '#4a3c34' : '#45372f'));
    for (const o of brks) {                                        // a broken stretch: a hole down to a glow
      const z0 = Math.max(za, o.z - o.hd), z1 = Math.min(zb, o.z + o.hd);
      if (z1 <= z0) continue;
      D.poly3(cam, [S3(z0, o.x - o.hw, 0.005), S3(z0, o.x + o.hw, 0.005), S3(z1, o.x + o.hw, 0.005), S3(z1, o.x - o.hw, 0.005)], '#1a0c08');
      D.poly3(cam, [S3(z0, o.x - o.hw + 0.2, 0.006), S3(z0, o.x + o.hw - 0.2, 0.006), S3(z1, o.x + o.hw - 0.2, 0.006), S3(z1, o.x - o.hw + 0.2, 0.006)], LAVA[0], 0.35 + 0.15 * Math.sin(t * 3 + o.z));
    }
    railTrack(D, R, za, zb, near, brks, c);
    for (const sd of [-1, 1]) {                                    // rock walls
      const xa = sd * (h0 + 0.1), xb = sd * (h1 + 0.1);
      D.poly3(cam, [P3(za, xa, 0), P3(zb, xb, 0), P3(zb, xb, CEIL), P3(za, xa, CEIL)], c(Math.floor(za / 3) % 2 ? '#3a2e28' : '#352a24'), 1, [-sd, 0, 0]);
      if (near) D.poly3(cam, [P3(za, xa - sd * 0.01, 0.6), P3(zb, xb - sd * 0.01, 0.6), P3(zb, xb - sd * 0.01, 0.75), P3(za, xa - sd * 0.01, 0.75)], '#c8a830', 0.6);   // a streak of sulphur
    }
    D.poly3(cam, [P3(za, -h0 - 0.1, CEIL), P3(za, h0 + 0.1, CEIL), P3(zb, h1 + 0.1, CEIL), P3(zb, -h1 - 0.1, CEIL)], c('#2a201c'), 1, [0, -1, 0]);
    const fz = Math.ceil(za / 6) * 6;                              // a timber frame every 6, a lantern on every other one
    if (fz < zb && fz > MINE[0] + 2) {
      const h = HW(fz) + 0.05, col = { top: c('#7a5a3a'), side: c('#5a4030'), front: c('#6a4a30'), back: c('#6a4a30') };
      for (const sd of [-1, 1]) { const x = sd * h; D.poly3(cam, [P3(fz - 0.2, x, 0), P3(fz + 0.2, x, 0), P3(fz + 0.2, x, CEIL), P3(fz - 0.2, x, CEIL)], col.front, 1, [-sd, 0, 0]); D.poly3(cam, [P3(fz - 0.2, x - sd * 0.35, 0), P3(fz - 0.2, x, 0), P3(fz - 0.2, x, CEIL), P3(fz - 0.2, x - sd * 0.35, CEIL)], col.side, 1, [0, 0, -1]); }
      D.poly3(cam, [P3(fz - 0.2, -h, CEIL - 0.45), P3(fz - 0.2, h, CEIL - 0.45), P3(fz - 0.2, h, CEIL), P3(fz - 0.2, -h, CEIL)], col.front, 1, [0, 0, -1]);
      if (fz % 12 === 0 && k < 0.8) { const sd = fz % 24 ? 1 : -1; glowDot(D, R, P3(fz - 0.3, sd * (h - 0.4), 3.6), 0.22, '#ffcf6b', (0.7 + 0.1 * Math.sin(t * 9 + fz)) * (1 - k)); }
    }
  }

  // ---- obstacles
  function bombObs(D, R, o) {                                       // a volcanic bomb: its red ring on the ground, then (as she comes) it drops on to it, smoking
    const { cam, S3 } = R, d = o.z - R.sz, u = seg(31 - d, 0, 7);  // u: 0 up in the sky … 1 landed
    const N = 14, ring = (s, up) => { const p = []; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2; p.push(S3(o.z + Math.cos(a) * 1.25 * s, o.x + Math.sin(a) * 1.25 * s, up)); } return p; };
    const pulse = 0.5 + 0.5 * Math.sin(R.t * 10);
    if (u < 1) {                                                    // the target ring
      D.poly3(cam, ring(1.15, 0.02), '#d42f2f', 0.55 + 0.35 * pulse);
      D.poly3(cam, ring(0.85, 0.025), '#2a1a18', 0.9);
      D.poly3(cam, ring(0.45, 0.03), '#ff5a3a', 0.6 + 0.3 * pulse);
    }
    if (u <= 0) return;
    if (u < 1) {                                                    // falling, trailing fire
      const y = (1 - u) * 26, p = S3(o.z, o.x, y + 0.9);
      for (let k = 1; k <= 4; k++) { const q = S3(o.z - k * 0.2, o.x + k * 0.15, y + 0.9 + k * 1.3); D.ctx.globalAlpha = 0.5 - k * 0.1; ball3(D, R, q, 0.7 - k * 0.1, k < 2 ? LAVA[2] : '#5a4a48'); D.ctx.globalAlpha = 1; }
      ball3(D, R, p, 0.95, '#3a2a28'); glowDot(D, R, p, 0.5, LAVA[1], 0.8);
      return;
    }
    rock3(D, R, o.z, o.x, 1.05, 1.9, Math.round(o.z * 31), 0, 0.9, '#4a3330');   // landed: a glowing hot rock in a scorch
    const age = clamp((24 - d) / 20), sm = (R.t * 0.8 + o.z) % 1;
    D.ctx.globalAlpha = 0.45 * (1 - sm) * (1 - age * 0.5); ball3(D, R, S3(o.z, o.x + sm * 0.6, 2 + sm * 3), 0.5 + sm * 0.9, '#6a5a58'); D.ctx.globalAlpha = 1;
    glowDot(D, R, S3(o.z - 0.9, o.x, 0.6), 0.5, LAVA[1], 0.5 * (1 - age * 0.6));
  }
  function hotRock(D, R, o) {                                       // a lump of hot cinder to hop: big and glowing, so it shows on the black rock
    const { cam, S3 } = R, N = 12, pulse = 0.5 + 0.5 * Math.sin(R.t * 5 + o.z), ring = s => { const p = []; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2; p.push(S3(o.z + Math.cos(a) * (o.hd + 0.7) * s, o.x + Math.sin(a) * (o.hw + 0.8) * s, 0.02)); } return p; };
    D.poly3(cam, ring(1), LAVA[1], 0.3 + 0.2 * pulse);              // its glow on the ground round it
    rock3(D, R, o.z, o.x, o.hw + 0.3, o.h + 0.35, Math.round(o.z * 17 + o.x * 5), 0, 1, '#8a3a22');
    rock3(D, R, o.z - 0.05, o.x, (o.hw + 0.3) * 0.55, (o.h + 0.35) * 0.55, Math.round(o.z * 7 + 3), 0, 1, '#ff7a1a');   // its hot heart showing through
    glowDot(D, R, S3(o.z - o.hd, o.x, (o.h + 0.35) * 0.6), 0.45, LAVA[2], 0.55 + 0.25 * pulse);
  }
  function geyserObs(D, R, o) {                                     // a vent ringed with crust; bubbling, then a column of lava shooting up
    const { cam, S3 } = R, b = obBurst(o, R.rt), N = 12, t = R.t;
    const ring = (s, up) => { const p = []; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2; p.push(S3(o.z + Math.cos(a) * 1.0 * s, o.x + Math.sin(a) * 1.2 * s, up)); } return p; };
    D.poly3(cam, ring(1.25, 0.03), '#5a2a1c');
    D.poly3(cam, ring(0.85, 0.04), b > 0 ? LAVA[2] : LAVA[0]);
    const u = ((((o.burst.w * R.rt + o.burst.ph) / (2 * Math.PI)) % 1) + 1) % 1;
    if (b <= 0 && u > 0.38) for (let k = 0; k < 3; k++) { const ph = (t * 3 + k * 0.33 + o.z) % 1; ball3(D, R, S3(o.z + (k - 1) * 0.3, o.x + (k - 1) * 0.4, 0.1 + ph * 0.6), 0.15 * (1 - ph), LAVA[2]); }   // bubbling: about to go
    if (b <= 0) return;
    const H = 6.5 * b, w = 0.9;                                      // the column (two crossed sheets, so it reads from any side), spray at its top
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const P0 = (s, y) => S3(o.z + dz * s, o.x + dx * s, y);
      D.poly3(cam, [P0(-w, 0), P0(w, 0), P0(w * 0.7, H), P0(-w * 0.7, H)], LAVA[1]);
      D.poly3(cam, [P0(-w * 0.45, 0), P0(w * 0.45, 0), P0(w * 0.3, H), P0(-w * 0.3, H)], LAVA[2]);
    }
    for (let k = 0; k < 6; k++) { const ph = (t * 1.6 + k / 6) % 1, a = k * 2.1; ball3(D, R, S3(o.z + Math.cos(a) * ph * 1.4, o.x + Math.sin(a) * ph * 1.6, H + ph * 1.2 - ph * ph * 2.5), 0.32 * (1 - ph * 0.6), k % 2 ? LAVA[2] : LAVA[1]); }
    glowDot(D, R, S3(o.z, o.x, H * 0.5), 1.0, LAVA[1], 0.35 * b);
  }
  function dripObs(D, R, o) {                                       // a row of glowing stalactites hanging low in the tube, dripping
    const { cam, P3 } = R, x0 = o.x - o.hw, x1 = o.x + o.hw, y = o.y0, n = 7;
    D.poly3(cam, [P3(o.z, x0, y + 0.5), P3(o.z, x1, y + 0.5), P3(o.z, x1, o.y1 + 0.1), P3(o.z, x0, o.y1 + 0.1)], '#2a1e1c');   // (low enough that the camera passes well over it, never through it)
    for (let k = 0; k < n; k++) {
      const xa = lerp(x0, x1, k / n), xb = lerp(x0, x1, (k + 1) / n), tip = y - 0.1 - (k % 3) * 0.15;
      D.poly3(cam, [P3(o.z - 0.01, xa, y + 0.55), P3(o.z - 0.01, xb, y + 0.55), P3(o.z - 0.01, (xa + xb) / 2, tip)], '#3a2c2a');
      D.poly3(cam, [P3(o.z - 0.02, (xa + xb) / 2 - 0.06, tip + 0.25), P3(o.z - 0.02, (xa + xb) / 2 + 0.06, tip + 0.25), P3(o.z - 0.02, (xa + xb) / 2, tip)], LAVA[2]);
      const ph = (R.t * 1.5 + k * 0.37) % 1;
      if (k % 2 === 0) ball3(D, R, P3(o.z, (xa + xb) / 2, tip - ph * (tip + 0.2)), 0.07, LAVA[2]);
    }
    for (const x of [x0 + 1.5, x1 - 1.5]) for (let j = 0; j < 2; j++) { const yy = y - 0.25 - j * 0.3; D.poly3(cam, [P3(o.z - 0.03, x - 0.35, yy + 0.18), P3(o.z - 0.03, x, yy), P3(o.z - 0.03, x + 0.35, yy + 0.18), P3(o.z - 0.03, x + 0.35, yy + 0.08), P3(o.z - 0.03, x, yy - 0.1), P3(o.z - 0.03, x - 0.35, yy + 0.08)], '#ffffff', 0.85); }   // crouch!
  }
  function spireObs(D, R, o, k = 0) {                               // a column of basalt: six sides, banded, glowing at the foot
    const { cam, S3 } = R, N = 6, rr = o.hw, H = 5.5, c = v => fog(v, k);
    for (let i = 0; i < N; i++) {
      const a0 = i / N * Math.PI * 2 + 0.3, a1 = (i + 1) / N * Math.PI * 2 + 0.3, P0 = (a, y) => S3(o.z + Math.cos(a) * rr, o.x + Math.sin(a) * rr, y);
      const nx = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
      D.poly3(cam, [P0(a0, 0), P0(a1, 0), P0(a1, H), P0(a0, H)], c(i % 2 ? '#3a2e2c' : '#332826'), 1, [nx, 0, nz]);
    }
    const top = []; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + 0.3; top.push(S3(o.z + Math.cos(a) * rr, o.x + Math.sin(a) * rr, H)); }
    D.poly3(cam, top, c('#4a3b38'));
    glowDot(D, R, S3(o.z - rr, o.x, 0.2), 0.4, LAVA[1], 0.4 * (1 - k));
  }
  function barrierObs(D, R, o) {                                     // a barricade across one rail: posts, striped planks, a sign
    const z = o.z, x0 = o.x - o.hw, x1 = o.x + o.hw;
    for (const x of [x0 + 0.1, x1 - 0.1]) boxS(D, R, z - 0.12, z + 0.12, x - 0.1, x + 0.1, 0, 1.9, { top: '#7a5a3a', side: '#5a4030', front: '#6a4a30' });
    for (const y of [0.55, 1.25]) {
      const n = 4; for (let k = 0; k < n; k++) boxS(D, R, z - 0.2, z - 0.06, lerp(x0, x1, k / n), lerp(x0, x1, (k + 1) / n), y, y + 0.4, { top: '#e8e2d0', side: '#a8a090', front: k % 2 ? '#ffffff' : '#d42f2f' });
    }
    R.billboard(PIX.sign, z - 0.25, o.x, 1.75, 1, 1);
  }
  function mcartObs(D, R, o) {                                       // a runaway ore cart rattling up the line at her, full of glowing ore, its lamp lit
    const { cam, S3 } = R, z = obZ(o, R.sz), x = o.x, L = o.hd, W = o.hw, rock = Math.sin(R.t * 30 + o.z) * 0.03;
    for (const wz of [z - L * 0.6, z + L * 0.6]) for (const sd of [-1, 1]) boxS(D, R, wz - 0.3, wz + 0.3, x + sd * W - 0.12, x + sd * W + 0.12, 0, 0.55, { top: '#2a2a2e', side: '#1a1a1e', front: '#2a2a2e' });
    boxS(D, R, z - L, z + L, x - W, x + W, 0.3 + rock, 1.35 + rock, { top: '#2a2018', side: '#6a4a30', front: '#7a5a3a', back: '#5a4030' });
    for (const u of [0.45, 1.1]) D.poly3(cam, [S3(z - L - 0.01, x - W, u + rock), S3(z - L - 0.01, x + W, u + rock), S3(z - L - 0.01, x + W, u + 0.12 + rock), S3(z - L - 0.01, x - W, u + 0.12 + rock)], '#9aa3b4', 1, [0, 0, -1]);
    for (let k = 0; k < 4; k++) ball3(D, R, S3(z - L * 0.4 + k * 0.5, x + (k % 2 ? 0.3 : -0.3), 1.45 + rock), 0.32, k % 2 ? LAVA[1] : '#c8a830');
    glowDot(D, R, S3(z - L - 0.05, x, 1.0 + rock), 0.22, '#fff2a0', 0.95);
  }


  // ---- launches: the cart's ramp out of the mine, the steam vent, the vent that blows
  function cartRamp(D, R, r) {                                       // the track kinked up at the end of the mine, on a trestle, out over the gorge
    const { cam, S3 } = R, n = 4;
    for (let k = 0; k < n; k++) {
      const za = r.z + r.len * k / n, zb = r.z + r.len * (k + 1) / n, ya = r.rise * Math.pow(k / n, 1.3), yb = r.rise * Math.pow((k + 1) / n, 1.3);
      for (const rx of RAIL.xs) for (const sx of [-0.45, 0.45]) D.poly3(cam, [S3(za, rx + sx - 0.07, ya + 0.1), S3(za, rx + sx + 0.07, ya + 0.1), S3(zb, rx + sx + 0.07, yb + 0.1), S3(zb, rx + sx - 0.07, yb + 0.1)], '#b8c0cc');
      D.poly3(cam, [S3(za, -r.hw, ya), S3(za, r.hw, ya), S3(zb, r.hw, yb), S3(zb, -r.hw, yb)], k % 2 ? '#5a4030' : '#6a4a30');
    }
    D.poly3(cam, [S3(r.z + r.len, -r.hw, -3), S3(r.z + r.len, r.hw, -3), S3(r.z + r.len, r.hw, r.rise), S3(r.z + r.len, -r.hw, r.rise)], '#4a3424');
    for (const x of [-r.hw, -1.5, 1.5, r.hw]) D.poly3(cam, [S3(r.z + r.len - 0.2, x - 0.15, -14), S3(r.z + r.len - 0.2, x + 0.15, -14), S3(r.z + r.len - 0.2, x + 0.15, r.rise), S3(r.z + r.len - 0.2, x - 0.15, r.rise)], '#5a4030');
  }
  function steamVent(D, R, r) {                                      // a crusted vent at the end of an island, a column of steam roaring up
    const { cam, S3, t } = R, zc = r.z + r.len / 2, N = 12;
    const ring = (s, up) => { const p = []; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2; p.push(S3(zc + Math.cos(a) * r.len * 0.5 * s, r.x + Math.sin(a) * r.hw * 0.9 * s, up)); } return p; };
    D.poly3(cam, ring(1.15, 0.03), '#c8a830'); D.poly3(cam, ring(0.8, 0.05), '#e8e8e8');
    for (let k = 0; k < 9; k++) { const ph = (t * 1.2 + k / 9) % 1; D.ctx.globalAlpha = 0.55 * (1 - ph); ball3(D, R, S3(zc + Math.sin(k * 2.3) * 0.5, r.x + Math.cos(k * 1.7) * 1.2 * ph, 0.5 + ph * 9), 0.8 + ph * 2.4, '#f2f2f2'); D.ctx.globalAlpha = 1; }
  }
  function blastVent(D, R, r) {                                      // the vent in the crater floor: glowing, and as she comes, the eruption
    const { cam, S3, t } = R, zc = r.z + r.len / 2, d = zc - R.sz, N = 14, go = seg(26 - d, 0, 14);
    const ring = (s, up) => { const p = []; for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2; p.push(S3(zc + Math.cos(a) * 2.6 * s, r.x + Math.sin(a) * r.hw * s, up)); } return p; };
    D.poly3(cam, ring(1.25, 0.03), '#5a2a1c'); D.poly3(cam, ring(0.9, 0.05), LAVA[0]); D.poly3(cam, ring(0.55, 0.06), LAVA[2]);
    if (go <= 0) return;
    const H = Math.min(9.5, 6 + go * 40), fade = clamp((zc + 0.5 - cam.C[2]) / 9) + clamp((cam.C[2] - zc - 0.5) / 9);   // the column of lava she is thrown up on (see-through as the camera goes through it)
    if (fade > 0.02) for (let j = 0; j < 3; j++) {
      const w = (3.4 - j) * (0.7 + 0.3 * go), col = LAVA[j];
      D.poly3(cam, [S3(zc + 0.5, r.x - w, 0), S3(zc + 0.5, r.x + w, 0), S3(zc + 0.5, r.x + w * 0.6, H), S3(zc + 0.5, r.x - w * 0.6, H)], col, (j ? 0.9 : 1) * fade);
    }
    for (let k = 0; k < 10; k++) { const ph = (t * 0.9 + k / 10) % 1, a = k * 2.4; ball3(D, R, S3(zc + 0.5, r.x + Math.cos(a) * ph * 6, H * (0.6 + ph * 0.5) - ph * ph * 10), 0.6 * (1 - ph * 0.5), k % 3 ? LAVA[2] : LAVA[1]); }
  }

  // ---- scenery pieces
  function spireS(D, R, s, k) {                                      // a jagged pinnacle of black rock out on the land
    const r = rng(s.seed), X = R.wx(s.z, s.x), y = gy(s.z) - (course.openAt(s.z) || (s.z > SHORE && s.z < ISL.end + 20) ? DEEP(s.z) : 0.05), c = v => fog(v, k);
    const w = s.w, h = s.h, p = (dx, dy) => [X + dx, y + dy, s.z];
    D.poly3(R.cam, [p(-w, 0), p(w, 0), p(w * 0.4, h * 0.7), p(w * (0.1 + r() * 0.2), h), p(-w * 0.3, h * 0.8)], c(r() < 0.5 ? '#2c2220' : '#332826'));
    D.poly3(R.cam, [p(w * 0.1, 0), p(w, 0), p(w * 0.4, h * 0.7), p(w * 0.15, h * 0.9)], c('#241a18'));
    if (k < 0.6) D.poly3(R.cam, [p(-w * 0.2, 0), p(-w * 0.1, 0), p(-w * 0.05, h * 0.45), p(-w * 0.12, h * 0.4)], LAVA[1], 0.5);
  }
  function fume(D, R, f, k) {                                         // a fumarole: yellow crust, a plume of steam
    const { t } = R, X = f.x;
    D.poly3(R.cam, [R.P3(f.z - 1.5, X - 2, 0.02), R.P3(f.z - 1.5, X + 2, 0.02), R.P3(f.z + 1.5, X + 2, 0.02), R.P3(f.z + 1.5, X - 2, 0.02)], fog('#c8a830', k));
    for (let j = 0; j < 5; j++) { const ph = (t * 0.35 + j / 5 + f.ph) % 1; D.ctx.globalAlpha = 0.4 * (1 - ph) * (1 - k * 0.6); ball3(D, R, R.P3(f.z, X + ph * 2, 0.6 + ph * 8), 0.6 + ph * 2.2, '#d8d0c8'); D.ctx.globalAlpha = 1; }
  }
  function lavaFall(D, R, f) {                                        // a lava fall pouring down the caldera wall
    const { cam, t } = R, X = f.sd * 30, z = f.z, F = (dz, x, y) => R.W3(z + dz, R.CO.centerX(z) + x - R.CO.centerX(z) + x * 0, gy(z) + y);
    const P = (dz, x, y) => R.W3(z + dz, x, gy(z) + y), k = fogK(R, z, X);
    D.poly3(cam, [P(-6, X, -1), P(6, X, -1), P(6, X + f.sd * 4, 22), P(-6, X + f.sd * 4, 22)], fog('#2a1e1c', k), 1, [-f.sd, 0, 0]);
    D.poly3(cam, [P(-1.6, X - f.sd * 0.05, -1), P(1.6, X - f.sd * 0.05, -1), P(1.2, X + f.sd * 3.6, 20), P(-1.2, X + f.sd * 3.6, 20)], LAVA[1], 1, [-f.sd, 0, 0]);
    const ph = (t * 1.4) % 1;
    for (let j = 0; j < 4; j++) { const u = (ph + j / 4) % 1; D.poly3(cam, [P(-1, X - f.sd * 0.1, 20 - u * 21), P(1, X - f.sd * 0.1, 20 - u * 21), P(1, X - f.sd * 0.1, 18.5 - u * 21), P(-1, X - f.sd * 0.1, 18.5 - u * 21)], LAVA[2], 0.6, [-f.sd, 0, 0]); }
    glowDot(D, R, P(0, X - f.sd * 0.5, 0), 2.4, LAVA[1], 0.4 * (1 - k));
    void F;
  }
  function crystal(D, R, c, k) {                                       // a cluster of black glass (obsidian) shards
    const r = rng(c.seed), X = R.wx(c.z, c.x), y = gy(c.z);
    for (let j = 0; j < 3; j++) { const dx = (j - 1) * 0.5, h = c.h * (0.6 + r() * 0.6), lean = (r() - 0.5) * 0.6; D.poly3(R.cam, [[X + dx - 0.25, y, c.z], [X + dx + 0.25, y, c.z], [X + dx + lean, y + h, c.z]], fog(j % 2 ? '#1a1420' : '#2a2034', k)); D.poly3(R.cam, [[X + dx, y, c.z - 0.01], [X + dx + 0.08, y, c.z - 0.01], [X + dx + lean * 0.9, y + h * 0.9, c.z - 0.01]], fog('#8a7aa8', k), 0.7); }
  }
  function sign(D, R, s) {                                              // a warning board on two posts
    const X = s.sd * (HW(s.z) + 3), P = (dz, x, y) => R.P3(s.z + dz, X + x, y), k = fogK(R, s.z, X);
    for (const x of [-1.8, 1.8]) D.poly3(R.cam, [P(0, x - 0.1, 0), P(0, x + 0.1, 0), P(0, x + 0.1, 3), P(0, x - 0.1, 3)], fog('#5a4030', k));
    D.poly3(R.cam, [P(-0.01, -2.4, 2.2), P(-0.01, 2.4, 2.2), P(-0.01, 2.4, 3.8), P(-0.01, -2.4, 3.8)], fog('#ffcf3a', k));
    D.poly3(R.cam, [P(-0.02, -2.2, 2.35), P(-0.02, 2.2, 2.35), P(-0.02, 2.2, 3.65), P(-0.02, -2.2, 3.65)], fog('#1a1a1a', k));
    text3(D, R, P(-0.03, 0, 3.0), s.t, s.t.length > 6 ? 0.55 : 0.85, '#ffcf3a', { far: 90 });
  }
  function mineMouth(D, R, z, out) {                                    // a timber portal on the mountainside, the mine's name over it
    const { cam, P3 } = R, h = HW(z) + 0.4, y = 5.6;
    if (!out) {                                                     // the mountainside the mine goes into
      for (const sd of [-1, 1]) D.poly3(cam, [P3(z, sd * h, -1), P3(z, sd * 70, -1), P3(z, sd * 70, 34), P3(z, sd * h, 34)], '#2c2220', 1, [0, 0, -1]);
      D.poly3(cam, [P3(z, -h, y), P3(z, h, y), P3(z, h, 34), P3(z, -h, 34)], '#2c2220', 1, [0, 0, -1]);
    }
    for (const sd of [-1, 1]) D.poly3(cam, [P3(z - 0.05, sd * h - 0.35, 0), P3(z - 0.05, sd * h + 0.35, 0), P3(z - 0.05, sd * h + 0.35, y + 0.5), P3(z - 0.05, sd * h - 0.35, y + 0.5)], '#6a4a30', 1, [0, 0, out ? 1 : -1]);
    D.poly3(cam, [P3(z - 0.06, -h - 0.6, y), P3(z - 0.06, h + 0.6, y), P3(z - 0.06, h + 0.6, y + 0.7), P3(z - 0.06, -h - 0.6, y + 0.7)], '#7a5a3a', 1, [0, 0, out ? 1 : -1]);
    if (!out) { D.poly3(cam, [P3(z - 0.07, -3.4, y + 0.8), P3(z - 0.07, 3.4, y + 0.8), P3(z - 0.07, 3.4, y + 2.4), P3(z - 0.07, -3.4, y + 2.4)], '#2a1e14', 1, [0, 0, -1]); text3(D, R, P3(z - 0.1, 0, y + 1.6), '硫磺礦坑', 1.1, '#ffcf3a', { far: 125 }); }
    for (const sd of [-1, 1]) glowDot(D, R, P3(z - 0.2, sd * (h - 0.2), 4.2), 0.3, '#ffcf6b', 0.8);
  }
  // ---- inside the volcano. Over it, the lake's crust (seen from above); under it, the magma chamber (seen from inside)
  const CRUST = course.height(EDGE) - 6, TOPY = course.height(EXIT) + 30;   // (the lake's surface; the top of the mountainside she is blown out of)
  const above = R => R.cam.C[1] > CRUST + 0.2;
  const CEIL = z => (z < EDGE + 52 ? CRUST - 0.4 - gy(z) : 10);   // the chamber's roof over the course (high where she fell in)
  function fakeIsland(D, R, za, zb) {                               // the island across the last gap: out of reach
    const a = Math.max(za, FAKE[0]), b = Math.min(zb, FAKE[1]);
    if (b <= a) return;
    const { cam } = R, y = z => gy(EDGE) - 0.13 * (z - EDGE), P = (z, x, yy) => R.W3(z, x, yy);
    D.poly3(cam, [P(a, -4, y(a)), P(a, 4, y(a)), P(b, 4, y(b)), P(b, -4, y(b))], BASALT[Math.floor(a / 4) % 2 ? 0 : 1]);
    for (const sd of [-1, 1]) D.poly3(cam, [P(a, sd * 4, y(a)), P(b, sd * 4, y(b)), P(b, sd * 4.4, CRUST), P(a, sd * 4.4, CRUST)], '#2a201e', 1, [sd, 0, 0]);
    if (a === FAKE[0]) { D.poly3(cam, [P(a, -4, y(a)), P(a, 4, y(a)), P(a, 4.4, CRUST), P(a, -4.4, CRUST)], '#2e2321', 1, [0, 0, -1]); D.poly3(cam, [P(a, -4, y(a) - 0.02), P(a, 4, y(a) - 0.02), P(a, 4, y(a) - 0.45), P(a, -4, y(a) - 0.45)], LAVA[1], 0.45, [0, 0, -1]); }
  }
  function islandEnd(D, R) {                                         // the last island's end, a sheer face down to the lava like the rest
    const { cam, S3 } = R, h = HW(EDGE), dep = gy(EDGE) - CRUST;
    D.poly3(cam, [S3(EDGE, -h, 0), S3(EDGE, h, 0), S3(EDGE, h * 1.1, -dep), S3(EDGE, -h * 1.1, -dep)], '#2e2321', 1, [0, 0, 1]);
    D.poly3(cam, [S3(EDGE, -h, -0.02), S3(EDGE, h, -0.02), S3(EDGE, h, -0.45), S3(EDGE, -h, -0.45)], LAVA[1], 0.45, [0, 0, 1]);
  }
  function caveSlice(D, R, za, zb, near) {                           // the magma chamber: black rock lit red, rivers of lava down either side, a low roof
    const { cam, S3, P3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2) * 0.6, c = v => fog(v, k), m = (za + zb) / 2;
    const W = z => HW(z) + 2.4, Y = (z, x, y) => R.W3(z, x, y);
    if (m >= EDGE + 15) {                                           // the floor (from the foot of the fall on), cut round the pools
      const holes = holesIn(za, zb, ['lava']), cuts = [za, zb];
      for (const o of holes) for (const e of [o.z - o.hd, o.z + o.hd]) if (e > za && e < zb) cuts.push(e);
      cuts.sort((p, q) => p - q);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1], mm = (a + b) / 2, ha = HW(a), hb = HW(b), o = holes.find(h => mm > h.z - h.hd && mm < h.z + h.hd);
        const col = c(Math.floor(a / 4) % 2 ? '#3a2422' : '#34201e');
        if (!o) { D.poly3(cam, [S3(a, -ha, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, -hb, 0)], col); continue; }
        const x0 = Math.max(-ha, o.x - o.hw), x1 = Math.min(ha, o.x + o.hw);
        if (x0 > -ha + 0.01) D.poly3(cam, [S3(a, -ha, 0), S3(a, x0, 0), S3(b, x0, 0), S3(b, -hb, 0)], col);
        if (x1 < ha - 0.01) D.poly3(cam, [S3(a, x1, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, x1, 0)], col);
        lavaPool(D, R, a, b, x0, x1, -0.35, a, b, near, t);
      }
      if (near && !holes.length) cracks(D, R, za, zb, -HW(za) + 0.5, HW(za) - 2, 3, 0.9);
      for (const sd of [-1, 1]) lavaPool(D, R, za, zb, sd > 0 ? HW(za) : -W(za), sd > 0 ? W(za) : -HW(za), -0.3, za, zb, near, t);   // rivers of lava either side
    }
    for (const sd of [-1, 1]) {                                     // its walls, up to the roof, glowing at the foot
      const xa = sd * W(za), xb = sd * W(zb), ya = gy(za) - 0.4, yb = gy(zb) - 0.4;
      D.poly3(cam, [Y(za, xa, ya), Y(zb, xb, yb), Y(zb, xb, gy(zb) + CEIL(zb)), Y(za, xa, gy(za) + CEIL(za))], c(Math.floor(za / 3) % 2 ? '#2e1a16' : '#2a1714'), 1, [-sd, 0, 0]);
      D.poly3(cam, [Y(za, xa - sd * 0.01, ya), Y(zb, xb - sd * 0.01, yb), Y(zb, xb - sd * 0.01, yb + 1.6), Y(za, xa - sd * 0.01, ya + 1.6)], LAVA[1], 0.35);
      if (near && Math.floor(za / 2) % 5 === 0) D.poly3(cam, [Y(za, xa - sd * 0.02, ya + 1), Y(za + 0.3, xa - sd * 0.02, ya + 1), Y(zb, xb - sd * 0.02, gy(zb) + Math.min(9, CEIL(zb))), Y(zb - 0.3, xb - sd * 0.02, gy(zb) + Math.min(9, CEIL(zb)))], LAVA[2], 0.6);   // a vein of lava up the wall
    }
    D.poly3(cam, [Y(za, -W(za), gy(za) + CEIL(za)), Y(za, W(za), gy(za) + CEIL(za)), Y(zb, W(zb), gy(zb) + CEIL(zb)), Y(zb, -W(zb), gy(zb) + CEIL(zb))], c('#1e1210'), 1, [0, -1, 0]);   // the roof
    const ma = MED(za), mb = MED(zb);
    if (ma > 0.05 || mb > 0.05) for (const sd of [-1, 1]) {        // a wall of basalt between the two ways, glowing at its foot
      D.poly3(cam, [Y(za, sd * ma, gy(za)), Y(zb, sd * mb, gy(zb)), Y(zb, sd * mb, gy(zb) + Math.min(9, CEIL(zb))), Y(za, sd * ma, gy(za) + Math.min(9, CEIL(za)))], c(Math.floor(za / 3) % 2 ? '#2e1a16' : '#2a1714'), 1, [sd, 0, 0]);
      D.poly3(cam, [Y(za, sd * ma * 1.01, gy(za)), Y(zb, sd * mb * 1.01, gy(zb)), Y(zb, sd * mb * 1.01, gy(zb) + 1.2), Y(za, sd * ma * 1.01, gy(za) + 1.2)], LAVA[1], 0.45, [sd, 0, 0]);
    }
    if (near && CEIL(za) < 11) for (let x = -W(za) + 1; x < W(za) - 1; x += 2.2) { const tip = gy(za) + CEIL(za) - 0.8 - (Math.abs(x * 7 + za) % 3) * 0.4; D.poly3(cam, [Y(za, x - 0.4, gy(za) + CEIL(za)), Y(za, x + 0.4, gy(za) + CEIL(za)), Y(za + 0.1, x, tip)], '#2e1c18'); }   // stalactites
    if (za <= EDGE + 52 && zb > EDGE + 52) { const z = EDGE + 52; D.poly3(cam, [Y(z, -W(z), gy(z) + 10), Y(z, W(z), gy(z) + 10), Y(z, W(z), CRUST - 0.4), Y(z, -W(z), CRUST - 0.4)], c('#241412'), 1, [0, 0, -1]); }   // where the roof comes down
    if (za <= EDGE && zb > EDGE) D.poly3(cam, [Y(EDGE, -8, gy(EDGE + 16) - 1), Y(EDGE, 8, gy(EDGE + 16) - 1), Y(EDGE, 8, CRUST - 0.4), Y(EDGE, -8, CRUST - 0.4)], '#241412', 1, [0, 0, 1]);   // the wall she fell down past
  }
  function mountainside(D, R) {                                       // the end of the chamber: the side of the mountain, the hole she is blown out through
    const { cam } = R, z = EXIT, w = HW(z) + 2.4, y0 = gy(z) - 0.4, y1 = gy(z) + 10, base = gy(z) - 40, WD = 110, P = (x, y, dz = 0) => [R.wx(z, x), y, z + dz];
    const up = above(R), lo = base;
    if (up) return;                                                 // (from up on the lake it is far below, under the crust)
    for (const [dz, n, col] of [[0, [0, 0, 1], '#2a1e1c'], [-0.1, [0, 0, -1], '#241412']]) {
      D.poly3(cam, [P(-WD, lo, dz), P(-w, lo, dz), P(-w, TOPY, dz), P(-WD, TOPY - 6, dz)], col, 1, n);
      D.poly3(cam, [P(w, lo, dz), P(WD, lo, dz), P(WD, TOPY - 6, dz), P(w, TOPY, dz)], col, 1, n);
      D.poly3(cam, [P(-w, Math.max(lo, y1), dz), P(w, Math.max(lo, y1), dz), P(w, TOPY, dz), P(-w, TOPY, dz)], col, 1, n);
      if (!up) D.poly3(cam, [P(-w, base, dz), P(w, base, dz), P(w, y0, dz), P(-w, y0, dz)], col, 1, n);
    }
    if (R.cam.C[2] > z) {                                               // outside: lava spilling out of the hole and down the mountainside, cracks glowing
      D.poly3(cam, [P(-2.5, y0, 0.05), P(2.5, y0, 0.05), P(4, base, 0.05), P(-4, base, 0.05)], LAVA[1], 0.95, [0, 0, 1]);
      for (const x of [-30, -12, 18, 40]) D.poly3(cam, [P(x - 0.5, TOPY - 2, 0.05), P(x + 0.5, TOPY - 2, 0.05), P(x + 3, base, 0.05), P(x + 1.5, base, 0.05)], LAVA[0], 0.7, [0, 0, 1]);
      const t = R.t;                                                   // and out of its top, the eruption: a fountain of fire, bombs flung out of it
      for (let j = 0; j < 3; j++) { const w = (6 - j * 1.8) * (1 + 0.08 * Math.sin(t * 7 + j)); D.poly3(cam, [P(-w, TOPY, 6), P(w, TOPY, 6), P(w * 0.5, TOPY + 46 + j * 4, 6), P(-w * 0.5, TOPY + 46 + j * 4, 6)], LAVA[j]); }
      for (let k = 0; k < 16; k++) { const ph = (t * 0.5 + k / 16) % 1, a = (k / 16 - 0.5) * 2.6; ball3(D, R, P(Math.sin(a) * ph * 60, TOPY + 46 * (0.5 + ph) - ph * ph * 50, 6), 1.4 * (1 - ph * 0.5), k % 3 ? LAVA[2] : '#3a2a28'); }
      for (let k = 0; k < 6; k++) { const ph = (t * 0.12 + k / 6) % 1; D.ctx.globalAlpha = 0.6 * (1 - ph); ball3(D, R, P(Math.sin(k * 2.1) * 10 + ph * 30, TOPY + 50 + ph * 60, 8), 8 + ph * 18, '#4a3432'); D.ctx.globalAlpha = 1; }   // the ash cloud
    }
    glowDot(D, R, P(0, gy(z) + 5, 0.2), 3, LAVA[1], 0.45);
  }
  function craterWalls(D, R, za, zb) {                                  // the caldera's cliffs round the lake, ragged along the top
    const { cam } = R, k = fogK(R, (za + zb) / 2, 40), top = z => gy(SHORE) + 22 - (z - SHORE) * 0.04 + Math.sin(z * 0.11) * 3 + Math.sin(z * 0.37) * 1.5;
    for (const sd of [-1, 1]) {
      const X = sd * 48, P = (z, x, y) => R.W3(z, x, y);
      D.poly3(cam, [P(za, X, gy(za) - 8), P(zb, X, gy(zb) - 8), P(zb, X + sd * 10, top(zb)), P(za, X + sd * 10, top(za))], fog(Math.floor(za / 16) % 2 ? '#2a1e1c' : '#241918', k), 1, [-sd, 0, 0]);
      if (Math.floor(za / 46) % 3 === 0) D.poly3(cam, [P(za, X + sd * 0.1, gy(za) - 8), P(zb, X + sd * 0.1, gy(zb) - 8), P(zb, X + sd * 9, top(zb) - 1), P(za, X + sd * 9, top(za) - 1)], LAVA[1], 0.25 * (1 - k), [-sd, 0, 0]);   // the glow of the lake on it
    }
  }
  function house(D, R, h, k) {                                          // a wooden house in the hot-spring village: walls, a tiled roof, a lit window, a little noren
    const X = R.wx(h.z, h.sd * h.x), y = gy(h.z), w = 2.6, d = 2.4, H = 2.8, c = v => fog(v, k);
    D.box3(R.cam, X - w, X + w, y, y + H, h.z - d, h.z + d, { side: c('#8a6a4a'), rear: c('#a07a52'), top: c('#8a6a4a') });
    const roof = (sd, col) => D.poly3(R.cam, [[X + sd * (w + 0.6), y + H, h.z - d - 0.6], [X, y + H + 1.8, h.z - d - 0.6], [X, y + H + 1.8, h.z + d + 0.6], [X + sd * (w + 0.6), y + H, h.z + d + 0.6]], c(col));
    roof(-1, h.col); roof(1, mixHex(h.col, '#000000', 0.25));
    D.poly3(R.cam, [[X - w - 0.6, y + H, h.z - d - 0.6], [X + w + 0.6, y + H, h.z - d - 0.6], [X, y + H + 1.8, h.z - d - 0.6]], c(mixHex(h.col, '#000000', 0.12)));
    D.poly3(R.cam, [[X - 1.4, y + 1.0, h.z - d - 0.01], [X - 0.2, y + 1.0, h.z - d - 0.01], [X - 0.2, y + 2.0, h.z - d - 0.01], [X - 1.4, y + 2.0, h.z - d - 0.01]], '#ffd27a');
    D.poly3(R.cam, [[X + 0.4, y + 1.2, h.z - d - 0.02], [X + 2, y + 1.2, h.z - d - 0.02], [X + 2, y + 2.2, h.z - d - 0.02], [X + 0.4, y + 2.2, h.z - d - 0.02]], c('#2a4a8a'));
  }
  function pool(D, R, p, k) {                                            // a steaming hot spring: a ring of stones, blue water, steam
    const { t } = R, N = 12, ring = (s, up) => { const q = []; for (let j = 0; j < N; j++) { const a = j / N * Math.PI * 2; q.push(R.P3(p.z + Math.cos(a) * 3 * s, p.x + Math.sin(a) * 1.6 * s * Math.sign(p.x) + Math.sign(p.x) * 1.6, up)); } return q; };
    D.poly3(R.cam, ring(1.15, 0.02), fog('#6a6260', k)); D.poly3(R.cam, ring(0.9, 0.04), fog('#5ac8d8', k));
    for (let j = 0; j < 4; j++) { const ph = (t * 0.3 + j / 4 + p.ph) % 1; D.ctx.globalAlpha = 0.4 * (1 - ph); ball3(D, R, R.P3(p.z + (j - 1.5), p.x + Math.sign(p.x) * 1.6, 0.4 + ph * 4), 0.5 + ph * 1.4, '#ffffff'); D.ctx.globalAlpha = 1; }
  }
  function villageGate(D, R, back) {                                     // the finish: a big wooden gate, the village's banner over it (seen from either side: the finish shot looks back at it)
    const z = FINISH, h = HW(z) + 0.8, { cam, P3 } = R, y = 7.2;
    if (back) return;
    for (const sd of [-1, 1]) boxS(D, R, z - 0.5, z + 0.5, sd * h - 0.5, sd * h + 0.5, 0, y + 1.6, { top: '#a83a2a', side: '#8a2a1e', front: '#c8463a', back: '#c8463a' });
    D.poly3(cam, [P3(z, -h - 1.6, y + 1.2), P3(z, h + 1.6, y + 1.2), P3(z, h + 2, y + 2), P3(z, -h - 2, y + 2)], '#2a1e1a');   // the roof beam
    D.poly3(cam, [P3(z, -h, y - 0.4), P3(z, h, y - 0.4), P3(z, h, y + 0.8), P3(z, -h, y + 0.8)], '#c8463a');                 // the banner
    D.poly3(cam, [P3(z - 0.01, -h, y - 0.4), P3(z - 0.01, h, y - 0.4), P3(z - 0.01, h, y - 0.25), P3(z - 0.01, -h, y - 0.25)], '#ffb020');
    D.poly3(cam, [P3(z + 0.01, -h, y - 0.4), P3(z + 0.01, h, y - 0.4), P3(z + 0.01, h, y - 0.25), P3(z + 0.01, -h, y - 0.25)], '#ffb020');
    const front = cam.C[2] < z;
    text3(D, R, P3(z + (front ? -0.6 : 0.6), 0, y + 0.2), 'GOAL 溫泉鄉', 1.1, '#ffffff', { far: 125, stroke: '#7a1a10' });
    for (const sd of [-1, 1]) glowDot(D, R, P3(z + (front ? -0.8 : 0.8), sd * (h - 1), y - 1.4), 0.5, '#ffb050', 0.8);
  }


  // the far view: a dark sky burning red at the horizon, ragged black ridges with lava running down them, and the
  // volcano itself smoking ahead (behind her once she is out of it: turning back she sees it blow)
  function horizon(D, g, hz, pan, W, H, t, zc) {
    [[0.35, '#2a1416', 7, 0.1], [0.7, '#1e0e10', 19, 0.22]].forEach(([k, col, seed, par], li) => {
      const off = pan * (0.3 + par) - zc * 2 * par, r = rng(seed), A = []; for (let i = 0; i < 24; i++) A.push([60 + r() * 120, 150 + r() * 140]);
      const i0 = Math.floor((-400 - off) / 240);
      for (let i = i0; i < i0 + Math.ceil((W + 800) / 240) + 1; i++) {
        const [hh, pw] = A[((i % 24) + 24) % 24], px = i * 240 + off, ph = hh * (1 + k);
        g.fillStyle = col; g.beginPath(); g.moveTo(px - pw, hz + 6);
        for (let j = 0; j <= 8; j++) { const u = j / 8; g.lineTo(px - pw + 2 * pw * u, hz + 6 - ph * Math.sin(Math.PI * u) * (0.8 + 0.2 * ((j * 7 + i) % 3) / 2)); }
        g.closePath(); g.fill();
        if (li === 1 && ((i % 3) + 3) % 3 === 0) { g.fillStyle = 'rgba(255,110,30,0.6)'; g.beginPath(); g.moveTo(px - 2, hz + 6 - ph * 0.92); g.lineTo(px + 4, hz + 6 - ph * 0.92); g.lineTo(px + pw * 0.45 + 5, hz + 6); g.lineTo(px + pw * 0.45 - 5, hz + 6); g.closePath(); g.fill(); }   // a lava stream down its face
      }
    });
  }
  function volcano(D, g, x, hz, s, t, blow) {                            // the cone: dark flanks, glowing streams, a plume of ash (a fountain of fire when it blows)
    const w = 520 * s, h = 300 * s, top = hz - h;
    g.fillStyle = '#1a0c0e'; g.beginPath(); g.moveTo(x - w, hz + 6); g.lineTo(x - w * 0.14, top); g.lineTo(x + w * 0.14, top); g.lineTo(x + w, hz + 6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,120,40,0.85)';
    for (const [a, b] of [[-0.06, -0.5], [0.04, 0.35], [0.1, 0.7]]) { g.beginPath(); g.moveTo(x + a * w, top + 4); g.lineTo(x + a * w + 10 * s, top + 4); g.lineTo(x + b * w + 6 * s, hz + 6); g.lineTo(x + b * w - 6 * s, hz + 6); g.closePath(); g.fill(); }
    g.fillStyle = '#ffb020'; g.fillRect(x - w * 0.14, top - 4 * s, w * 0.28, 8 * s);
    const n = blow ? 9 : 6;
    for (let k = 0; k < n; k++) {                                        // the plume, billowing up and drifting
      const ph = (t * (blow ? 0.25 : 0.06) + k / n) % 1, cx = x + Math.sin(k * 1.9 + t * 0.2) * 40 * s + ph * 160 * s * (blow ? 0.3 : 1), cy = top - ph * (blow ? 620 : 380) * s, rr = (50 + ph * 150) * s * (blow ? 1.4 : 1);
      g.fillStyle = blow ? (k % 3 === 0 ? 'rgba(255,120,40,0.5)' : 'rgba(70,40,40,0.75)') : 'rgba(60,40,40,0.55)'; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
    }
    if (blow) for (let k = 0; k < 14; k++) {                               // bombs flung out of it
      const ph = (t * 0.6 + k / 14) % 1, a = (k / 14 - 0.5) * 2.4, bx = x + Math.sin(a) * ph * 520 * s, by = top - Math.cos(a) * ph * 520 * s + ph * ph * 600 * s;
      g.fillStyle = k % 2 ? '#ffb020' : '#ff5a10'; g.fillRect(bx - 6 * s, by - 6 * s, 12 * s, 12 * s);
    }
  }

  const theme = {
    spray: ['#5a4a48', '#3a2e2c', '#ff7a1a'], trail: '#2a201e', ski: ['#d42f2f', '#ff7a5a', '#8a1a14'],
    flow: { lane: '#ffb020', edge: '#fff1a8', mark: '#ffffff' },   // (a lane of running lava to surf)
    boost: { pad: '#ff7a1a', glow: '#ffcf3a', arrow: '#ffffff' },
    kicker: { side: '#3a2e2c', top: '#4a3b38', edge: '#ff7a1a' },
    cart: { body: '#6a4a30', dark: '#1a120c', band: '#9aa3b4', rim: '#3a3a40', wheel: '#1a1a1e' },
    sky(R) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R;
      theme.camZ = zc; theme.sz = R.sz;
      const blow = zc > ISL.end + 10, gr = g.createLinearGradient(0, 0, 0, Math.max(60, hz + 10));
      gr.addColorStop(0, blow ? '#2a0a0c' : '#1a0a10'); gr.addColorStop(0.55, blow ? '#6a1a12' : '#4a1612'); gr.addColorStop(1, blow ? '#e8501a' : '#b8401c');
      g.fillStyle = gr; g.fillRect(0, 0, W, Math.max(60, hz + 10));
      for (let k = 0; k < 6; k++) {                                        // drifting clouds of ash
        const r = rng(400 + k), x = ((r() * (W + 600) + t * (6 + r() * 8) + pan * 0.2) % (W + 600) + W + 600) % (W + 600) - 300, y = 60 + r() * Math.max(40, hz - 260);
        g.fillStyle = 'rgba(40,24,26,0.55)'; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + j * 70, y + (j % 2) * 16, 110, 34, 0, 0, 7); g.fill(); }
      }
      const hd = R.CO.heading(zc), ahead = zc < ISL.end - 10, behind = zc > LAUNCH + 4;   // the volcano ahead (in the caldera, over the lake), behind once she is thrown out
      if (ahead) volcano(D, g, W / 2 + pan + hd * 900 + 260, hz, zc < MINE[0] ? 0.8 : 1.2, t, false);
      if (behind) volcano(D, g, W / 2 + pan + (hd + Math.PI) * 900, hz, 1.5, t, true);
      D.rect(0, hz + 4, W, H, '#241a18');
      horizon(D, g, hz, pan, W, H, t, zc);
      if (blow) D.rect(0, 0, W, H, '#ff3010', 0.06 + 0.04 * Math.sin(t * 6));
    },
    ground(R, za, zb, near) {
      const D = root.SkiDraw, m = (za + zb) / 2;
      if (m >= EDGE - 2 && m < EXIT + 2) { if (above(R)) lavaSea(D, R, za, zb, near, CRUST); return; }   // (over the volcano: the lake's surface, from above)
      if (LOW(m)) lavaSea(D, R, za, zb, near);
    },
    slice(R, za, zb, near) {
      const D = root.SkiDraw, m = (za + zb) / 2;
      if (m >= EDGE && m < EXIT + 1) {                            // over the volcano: from up on the lake, the island across it; once she has fallen in, the chamber
        if (above(R)) { fakeIsland(D, R, za, zb); if (za <= EDGE + 0.01 && zb > EDGE) islandEnd(D, R); craterWalls(D, R, za, zb); }
        else caveSlice(D, R, za, zb, near);
        return;
      }
      if (inMine(m)) mineSlice(D, R, za, zb, near);
      else if (isOpen(m) || (m >= CJ + 4 && m < SHORE + 26) || (m >= LAUNCH + 3 && m < LAND - 2)) rimSlice(D, R, za, zb, near);
      else slopeSlice(D, R, za, zb, near);
      if (m < ISL.end + 30 && m > SHORE - 10) craterWalls(D, R, za, zb);
    },
    ramp(R, r) {
      const D = root.SkiDraw;
      if (r.k === 'cartjump') { cartRamp(D, R, r); return true; }
      if (r.k === 'steam') { steamVent(D, R, r); return true; }
      if (r.k === 'blast') { blastVent(D, R, r); return true; }
      return false;
    },
    scenery(R) {
      const D = root.SkiDraw, { add, lo, hi, zc } = R;
      // the villagers' guests, the other mascots, cheering on wooden decks either side of the finish
      if (R.zc > FINISH - 160) root.SkiWorld.crowd(R, { z0: FINISH - 50, z1: FINISH + 25, stand: { top: '#9a6a44', top2: '#8a5a3a', face: '#5a3a20' } });
      const ok = (z, d = 115) => z > lo && z < hi && Math.abs(z - zc) < d, mine = inMine(zc) && zc < MINE[1] - 4;
      if (!mine) {
        for (const s of SCENE.spires) if (ok(s.z, 120)) add(s.z, () => spireS(D, R, s, fogK(R, s.z, s.x)), false, s.x);
        for (const tr of SCENE.trees) if (ok(tr.z, 90)) add(tr.z, () => R.billboard({ ...PIX.tree, cs: PIX.tree.cs * tr.s }, tr.z, tr.x, 0, 1 - fogK(R, tr.z, tr.x) * 0.6), false, tr.x);
        for (const f of SCENE.fumes) if (ok(f.z, 110)) add(f.z, () => fume(D, R, f, fogK(R, f.z, f.x)), false, f.x);
        for (const f of SCENE.falls) if (ok(f.z, 125)) add(f.z, () => lavaFall(D, R, f), false, f.sd * 30);
        for (const c of SCENE.crystals) if (ok(c.z, 80)) add(c.z, () => crystal(D, R, c, fogK(R, c.z, c.x)), false, c.x);
        for (const s of SCENE.signs) if (ok(s.z, 100)) add(s.z, () => sign(D, R, s), false, s.sd * 6);
        for (const h of SCENE.houses) if (ok(h.z, 120)) add(h.z, () => house(D, R, h, fogK(R, h.z, h.sd * h.x)), false, h.sd * h.x);
        for (const p of SCENE.pools) if (ok(p.z, 90)) add(p.z, () => pool(D, R, p, fogK(R, p.z, p.x)), false, p.x);
        for (const l of SCENE.lanterns) if (ok(l.z, 80)) add(l.z, () => { const X = l.sd * (HW(l.z) + 1.2); R.billboard({ cs: 0.1, rows: ['.KK.', 'RRRR', 'RYYR', 'RYYR', 'RRRR', '.KK.', '.K..', '.K..', '.K..', '.K..', '.K..', '.K..'], cols: { K: '#2a1a14', R: '#d43a2a', Y: '#ffcf6b' }, shadow: false }, l.z, X, 0); glowDot(D, R, R.P3(l.z, X, 0.95), 0.25, '#ffb050', 0.5); }, false, l.sd * 9);
        for (const s of SCENE.streams) if (s.z + s.len > lo && s.z < hi && Math.abs(s.z - zc) < 110) add(s.z, () => { const X = s.sd * s.x; D.poly3(R.cam, [R.P3(s.z, X - 1, 0.01), R.P3(s.z, X + 1, 0.01), R.P3(s.z + s.len, X + 1 + s.sd * 6, -0.04), R.P3(s.z + s.len, X - 1 + s.sd * 6, -0.04)], LAVA[0]); }, false, s.sd * s.x);
      }
      if (ok(MINE[0], 125) && zc < MINE[0] + 1) add(MINE[0] - 0.1, () => mineMouth(D, R, MINE[0], false));
      if (ok(MINE[1], 125) && zc < MINE[1]) add(MINE[1] - 0.05, () => mineMouth(D, R, MINE[1], true));
      if (zc > LAKE[0] - 140 && zc < LAND + 60) add(EXIT, () => mountainside(D, R));
      if (ok(FINISH, 125)) add(FINISH + 3, () => villageGate(D, R, true));
    },
    // gates: basalt pillars with braziers and a red banner; timber frames in the mine (it has its own), none on the lake or in the air
    gate(R, z, i, label) {
      const D = root.SkiDraw, { cam, P3 } = R;
      if (label === 'GOAL') { villageGate(D, R, false); return; }
      if (!label && (inMine(z) || isOpen(z) || LOW(z) || MED(z) > 0 || (z > EDGE - 30 && z < LAND + 10) || z > VILLAGE)) return;
      const h = HW(z) + 1.0, y1 = 6.4;
      for (const sd of [-1, 1]) {
        const X = R.wx(z, sd * h); D.box3(cam, X - 0.45, X + 0.45, gy(z), gy(z) + y1 + 0.5, z - 0.45, z + 0.45, { side: '#2a201e', rear: '#3a2e2c', top: '#4a3b38' });
        const fl = 0.8 + 0.2 * Math.sin(R.t * 17 + z + sd);
        D.poly3(cam, [P3(z - 0.46, sd * h - 0.3, y1 + 0.5), P3(z - 0.46, sd * h + 0.3, y1 + 0.5), P3(z - 0.46, sd * h, y1 + 0.5 + 1.0 * fl)], LAVA[1]);
        D.poly3(cam, [P3(z - 0.47, sd * h - 0.15, y1 + 0.5), P3(z - 0.47, sd * h + 0.15, y1 + 0.5), P3(z - 0.47, sd * h, y1 + 0.5 + 0.55 * fl)], '#fff1a8');
      }
      const f = D.poly3(cam, [P3(z, -h + 0.45, y1 - 1.2), P3(z, h - 0.45, y1 - 1.2), P3(z, h - 0.45, y1), P3(z, -h + 0.45, y1)], label ? D.C.orange : '#8a1a14');
      D.poly3(cam, [P3(z - 0.01, -h + 0.45, y1 - 1.2), P3(z - 0.01, h - 0.45, y1 - 1.2), P3(z - 0.01, h - 0.45, y1 - 1.05), P3(z - 0.01, -h + 0.45, y1 - 1.05)], '#ffb020');
      if (f) text3(D, R, P3(z - 0.05, 0, y1 - 0.6), label || ['高溫注意', '熔岩', '衝啊', '小心落石', '火山', '加油'][i % 6], 0.95, label ? '#ffffff' : '#ffcf3a', { far: 120 });
    },
    obstacle(R, o, i) {
      const D = root.SkiDraw;
      switch (o.k) {
        case 'rock': case 'cinder': hotRock(D, R, o); break;
        case 'lavaball': hotRock(D, R, { ...o, x: obX(o, R.rt), hd: 0.7 }); break;   // a ball of lava rolling to and fro
        case 'bomb': bombObs(D, R, o); break;
        case 'spire': spireObs(D, R, o, fogK(R, o.z, o.x)); break;
        case 'geyser': geyserObs(D, R, o); break;
        case 'drip': dripObs(D, R, o); break;
        case 'barrier': barrierObs(D, R, o); break;
        case 'mcart': mcartObs(D, R, o); break;
      }
    },
    // embers rising and ash falling; dark in the mine; once the mountain blows, the air glows red and pulses
    weather({ t }) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, z = theme.camZ ?? 0, r = rng(Math.floor(t * 12));
      if (inMine(z) && z < MINE[1] - 6) {
        const k = Math.min(seg(z, MINE[0], MINE[0] + 8), 1 - seg(z, MINE[1] - 14, MINE[1] - 6));
        const gr = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.25, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(20,10,5,0)'); gr.addColorStop(1, `rgba(20,10,5,${0.75 * k})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        return;
      }
      if (z > EDGE + 6 && z < EXIT) {                                     // inside the volcano: dark, a red glow pulsing
        const gr = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.2, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(60,8,0,0)'); gr.addColorStop(1, `rgba(40,4,0,${0.7 + 0.08 * Math.sin(t * 4)})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      const blow = z > ISL.end + 10 && z < VILLAGE, n = blow ? 40 : 18;
      for (let k = 0; k < n; k++) {                                         // embers drifting up
        const rr = rng(k * 31 + 7), x = (rr() * W + Math.sin(t * 0.8 + k) * 40) % W, y = H - ((rr() * H + t * (60 + rr() * 90)) % (H + 40));
        g.fillStyle = k % 3 ? '#ff8a2a' : '#ffd060'; g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 7 + k); g.fillRect(x, y, 5, 5);
      }
      g.globalAlpha = 0.35; g.fillStyle = '#8a7a78';
      for (let k = 0; k < 16; k++) { const x = r() * W, y = r() * H; g.fillRect(x, y, 4, 4); }    // ash
      g.globalAlpha = 1;
      const gr = g.createLinearGradient(0, H * 0.7, 0, H);                  // heat from below
      gr.addColorStop(0, 'rgba(255,90,20,0)'); gr.addColorStop(1, `rgba(255,90,20,${blow ? 0.28 + 0.1 * Math.sin(t * 5) : 0.14})`);
      g.fillStyle = gr; g.fillRect(0, H * 0.7, W, H * 0.3);
    },
    // map-screen card (until its screenshot is taken): the red sky, the cone erupting, a stream of lava
    badge(g, x, y, w, h, t = 0) {
      const Rr = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      Rr(0, 0, 1, 1, '#4a1612'); Rr(0, 0.55, 1, 0.45, '#241a18');
      g.fillStyle = '#1a0c0e'; g.beginPath(); g.moveTo(x + 0.15 * w, y + 0.62 * h); g.lineTo(x + 0.44 * w, y + 0.2 * h); g.lineTo(x + 0.56 * w, y + 0.2 * h); g.lineTo(x + 0.85 * w, y + 0.62 * h); g.fill();
      Rr(0.44, 0.18, 0.12, 0.04, '#ffb020'); Rr(0.3, 0.75, 0.4, 0.08, '#ff5a10');
      g.fillStyle = 'rgba(70,40,40,0.8)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (0.5 + k * 0.05) * w, y + (0.15 - k * 0.04) * h, (0.05 + k * 0.02) * h, 0, 7); g.fill(); }
      void t;
    },
  };

  root.SkiMaps.define('volcano', { course, theme, music: { race: 'volcano', result: 'volcano_result', cues: { minein: 'volcano_mine', erupt: 'volcano_erupt' } },
    score: { par: 127, ranks: root.SkiScore.RANKS, key: 'ski-best-volcano' }, bg: '#3a1a16' });
})(typeof window !== 'undefined' ? window : globalThis);

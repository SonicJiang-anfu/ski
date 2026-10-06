'use strict';
// 困難 · 玩具工廠: down through a toy factory, from the assembly line to the shipping dock. Its tricks: conveyor belts
// that carry her sideways (into the crates, if she lets them); stamping presses that slam down in rhythm (under one
// while it is up, or round it); a sorting machine that splits the line in two (up onto a catwalk of belts and presses,
// or down through the paint booth past rolling marbles and marching tin soldiers); a ball pit crossed on trampolines,
// bounce after bounce, steering in the air for the next one; then straight into a giant television, and inside it the
// world turns into an old 2D video game seen from the side: ← → are her pace, wind-up robots to jump over or stomp flat,
// spikes, crushers to crouch under, pipes to duck, a spring; out through the screen again onto an orange toy race track with
// wind-up cars, a leap over a broken piece of track, the track split in two by a divider (boost pads one side, cars and
// a kicker the other), a full vertical loop the camera rides round with her, upside down at the top, then a corkscrew
// that rolls her right over (nothing in the way: it is for the ride); out through a giant gift box.
(function (root) {
  const { clamp, lerp, seg, smooth, rng, mixHex, obX, obZ, stampY } = root.SkiCore;

  // ------------------------------------------------------------ course
  const FORK1 = [440, 590], FORK2 = [690, 780];                // the sorting machine (catwalk / paint booth); blocks / tops
  const PIT = [820, 1110];                                      // the ball pit: flat, crossed on trampolines
  const TV = [1160, 1460];                                      // inside the television: a 2D video game, seen from the side
  const TRACK = [1486, 1992];                                   // the toy race track
  const LOOP = { z: 1820, r: 14, shift: 9 }, L0 = LOOP.z, L1 = LOOP.z + 2 * Math.PI * LOOP.r;
  const FINISH = Math.round(L1 + 150);
  const BOOTH = [FORK1[0] + 26, FORK1[1] - 30];                 // the paint booth down the right side of the sorter
  const T = z => z + 340;                                       // (the race track is laid out from where it used to start)
  const FORK3 = [T(1216), T(1298)];                             // the race track split by a divider: boost pads (left) / cars and a kicker (right)
  const SCREW = [L1 + 12, L1 + 76];                             // the corkscrew past the loop

  // one flight (the same integration as SkiPhysics): from height y0 at speed v rising at vy, until she is down to yc
  // above the ground (flat, or falling at `grade`); { z: how far, top: [z, height] at its highest, at(z): height }
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
  const PAD = { vy: 12, v: 24 }, CATCH = 1.0, GRAB = 1.1;       // a trampoline throws her the same way every time; it catches her this high above it, this far past its frame
  const MAT = 0.2;                                              // a trampoline in the pit: its mat this high (she is thrown from it, caught CATCH above it)
  const SOFT = PAD.vy - CATCH / (2 * PAD.vy / 26);              // (caught CATCH above the mat, thrown that much softer: see SkiPhysics)
  const B_FLOOR = fly(PAD.vy, PAD.v, 0.25, MAT + CATCH), B_FLAND = fly(PAD.vy, PAD.v, 0.25, 0.3), B_MAT = fly(SOFT, PAD.v, MAT + CATCH, MAT + CATCH), B_LAND = fly(SOFT, PAD.v, MAT + CATCH, 0.3);
  const MEGA = { vy: 17, v: 22 }, B_MEGA = fly(MEGA.vy, MEGA.v, 0.25, 0.3);
  const KICK = { vy: 9, v: 30, rise: 1.0 }, B_KICK = fly(KICK.vy, KICK.v, KICK.rise, 0.3, 0.21);
  const PADS1 = 838, CHAIN = 892, CHAIN_X = [-3, 0, 3, 0, -3, 0], MEGAZ = 1050, GAPZ = T(1318);
  // the chain of trampolines across the pit: where she comes down on each (from the row on the floor, then mat to mat)
  const CATCHES = [CHAIN + 2 + B_FLOOR.z]; for (let k = 1; k < CHAIN_X.length; k++) CATCHES.push(CATCHES[k - 1] + B_MAT.z);
  const PIT_END = CATCHES[CATCHES.length - 1] + B_LAND.z - 4;   // (with room to spare: at a coarser step the flights come out a little shorter)
  // inside the TV: the ground's ups and downs (a step up is a short steep ramp, a step down a drop), as [z, grade] points
  const up = (z, d) => [[z, 0], [z + 0.2, -3], [z + 0.2 + d / 3, -3], [z + 0.4 + d / 3, 0]];
  const down = (z, d) => [[z, 0], [z + 0.2, 4], [z + 0.2 + d / 4, 4], [z + 0.4 + d / 4, 0]];
  const SPRING = { vy: 15, v: 20 }, B_SPRING = fly(SPRING.vy, SPRING.v, 0.3, 0.3);

  const course = root.SkiCourse.build({
    id: 'factory', HALF: 10, FINISH, LENGTH: FINISH + 100, START: 4,
    phys: { VMAX: 35, DRAG: 0.2, DRIFT: 0.35, CENT: 0.6, WALL_DRAG: 1.8, V2D: 20 },
    flow: true, botLanes: 0.125,
    CX: [[0, 0], [40, 0], [90, -4], [140, 0], [200, 0], [262, 5], [322, -3], [380, 0], [430, 0], [FORK1[1], 0], [630, 6], [675, 0],
      [FORK2[1] + 10, 0], [PIT[0] - 10, 0], [PIT[0], 0], [TV[1] + 10, 0], [TV[1] + 20, 0], [TRACK[0], 0], [T(1200), -10], [T(1250), -13], [T(1292), -2], [T(1306), 0],
      [GAPZ + 50, 0], [T(1390), 9], [T(1430), 4], [T(1458), 0], [T(1468), 0], [L1 + 4, 0], [L1 + 14, 0], [L1 + 60, -9], [L1 + 110, 3], [FINISH - 10, 0], [FINISH, 0], [FINISH + 100, 0]],
    GRADE: [[0, 0.02], [12, 0.06], [24, 0.21], [PIT[0] - 24, 0.21], [PIT[0] - 4, 0], [PIT[1], 0], [PIT[1] + 16, 0.21], [TV[0] - 30, 0.21], [TV[0] - 10, 0],
      ...up(TV[0] + 92, 1.5), ...up(TV[0] + 190, 1.5), ...down(TV[0] + 264, 3),
      [TV[1], 0], [TV[1] + 20, 0.21],
      [L0 - 30, 0.21], [L0 - 8, 0], [L1 + 6, 0], [L1 + 26, 0.21], [FINISH - 20, 0.21], [FINISH, 0.12], [FINISH + 50, 0], [FINISH + 100, 0]],
    WIDTH: [[0, 7], [400, 7], [430, 10], [FORK1[1] + 4, 10], [620, 8], [FORK2[0] - 14, 8], [FORK2[0], 9], [FORK2[1], 9], [PIT[0] - 12, 6],
      [PIT[1] + 16, 6], [TV[0] - 26, 6], [TV[0] - 2, 2.5], [TV[1] + 2, 2.5], [TV[1] + 24, 4], [TRACK[0], 4], [L0 - 8, 4], [L1 + 8, 4], [TRACK[1] - 6, 4], [TRACK[1] + 16, 7]],
    SPLIT: [{ m: [[FORK1[0] - 1, 0], [FORK1[0] + 12, 1.5], [FORK1[1] - 13, 1.5], [FORK1[1], 0]],
      L: [[FORK1[0] + 3, 0], [FORK1[0] + 36, 5], [FORK1[1] - 44, 5], [FORK1[1] - 13, 0]],          // up onto the catwalk
      R: [[FORK1[0] + 3, 0], [FORK1[0] + 24, -1.4], [FORK1[1] - 34, -1.4], [FORK1[1] - 13, 0]] },  // down through the paint booth
    { m: [[FORK2[0] - 1, 0], [FORK2[0] + 10, 1], [FORK2[1] - 10, 1], [FORK2[1], 0]] },
    { m: [[FORK3[0] - 1, 0], [FORK3[0] + 10, 0.8], [FORK3[1] - 10, 0.8], [FORK3[1], 0]] }],
    TWIST: [[SCREW[0], 0], [SCREW[1], 2 * Math.PI]], TWAX: [[0, 0.8]],   // (about a line just over the track: it rolls in place, like a ribbon)
    SIDE: [TV],
    LOOP,
    gateEvery: 40,
    sections: [{ name: '組裝產線', z0: 0 }, { name: '分揀岔路', z0: 420 }, { name: '彈床球池', z0: 800 }, { name: '電視遊戲', z0: TV[0] - 30 }, { name: '極速迴環', z0: TV[1] + 20 }],
  }, (c, P) => {
    const { coin, row, boost } = P;
    const crate = (z, x, hw = 1.1) => P.tall('crate', z, x, hw, { hd: 1.0 });                 // a wooden crate: go round
    const gift = (z, x) => P.hop('gift', z, x, 0.7, { h: 0.75 });                             // a wrapped present: hop it
    const press = (z, x, ph, hw = 2, period = 1.5) => P.stamp('press', z, x, hw, period, { ph });
    const arm = z => P.over('arm', z, 0, 2 * c.halfAt(z));                                    // a robot arm swung across: crouch
    const robot = (z, x, amp, period) => P.roll('robot', z, x, 0.5, amp, period, { h: 0.85 }); // a wind-up robot walking to and fro
    const marble = (z, x, amp, period) => P.roll('marble', z, x, 0.6, amp, period, { h: 0.9 });
    const soldier = (z, x, amp, period) => P.roll('soldier', z, x, 0.45, amp, period, { h: 0.85 });
    const spin = (z, x, amp, period) => P.roll('top', z, x, 0.55, amp, period, { h: 0.7 });  // a spinning top
    const blocks = (z, x, hw = 1.2) => P.tall('blocks', z, x, hw, { hd: 0.9 });              // a stack of alphabet blocks
    const duck = (z, x) => P.hop('duck', z, x, 0.6, { h: 0.7 });
    const rc = (z, x, hw = 0.8) => P.car('rc', z, x, { k: -0.4, hw, hd: 1.3, h: 0.75, honk: false, pass: 'zoom' });   // a wind-up race car, slower than her: hop it or pass it
    const ribbon = z => P.over('ribbon', z, 0, 2 * c.halfAt(z));
    const jack = (z, x) => P.tall('jack', z, x, 0.8, { hd: 0.8 });                            // a jack-in-the-box (pops up as she comes)
    const sorter = z => P.tall('sorter', z, 0, 1.3, { hd: 0.8 });                             // the nose of the sorting machine
    const pair = (z, y = 0.9) => { coin(z, -1.5, y); coin(z, 1.5, y); };

    // ① 組裝產線: down the assembly hall. Strips of conveyor belt right across, each carrying her the other way, with a
    // crate where it would carry her; rows of stamping presses slamming down in turn, faster, a free lane moving across;
    // robot arms swung across to duck; one long belt pulling left; wind-up robots
    row(28, 0, 2); gift(46, -3); gift(46, 3); coin(54, 0);
    [[62, 5.5], [74, -5.5], [86, 5.5], [98, -5.5], [110, 5.5]].forEach(([z, p]) => {
      P.belt(z, 0, 7, 10, p); crate(z + 6, p > 0 ? 4.8 : -4.8); coin(z + 6, p > 0 ? -1.5 : 1.5);
    });
    boost(128, 0, 1.6, 6); gift(144, -3.5); gift(144, 3.5); row(134, 0, 2);
    [[166, [0, 4.5]], [190, [-4.5, 4.5]], [214, [-4.5, 0]], [238, [-4.5, 4.5]], [262, [0, 4.5]]].forEach(([z, xs], k) => {   // the free lane: left, middle, right, middle, left
      xs.forEach((x, j) => press(z, x, k * 1.4 + j * 2.6));
      const free = [-4.5, 0, 4.5].find(x => !xs.includes(x));
      coin(z - 8, free); coin(z, xs[0], 0.9);                    // (one under a press, for the brave)
    });
    // stacks of toys waiting to be packed, one side then the other, presents to hop between them
    blocks(292, -3); coin(292, 3);
    P.tall('teddy', 306, 3, 0.9, { hd: 0.7 }); coin(306, -3);
    gift(318, -3.5); gift(318, 3.5);
    blocks(332, 3); coin(332, -3);
    P.tall('teddy', 346, -3, 0.9, { hd: 0.7 });
    gift(358, 0);
    robot(370, 0, 3.5, 2.6); robot(388, 0, 3.5, 2.3); boost(400, 0, 1.6, 6); coin(379, 0);
    // ② 分揀岔路: the sorting machine splits the line round its divider. Left: up onto a catwalk of belts (pushing her
    // at the divider) and presses, more coins; right: down through the paint booth, marbles rolling across, tin
    // soldiers marching. Then a second split: a slalom of block stacks, or spinning tops and a boost
    gift(414, -3); gift(414, 3); coin(424, 0);
    sorter(FORK1[0]);
    for (const [z, p] of [[470, 4.5], [500, 4.5], [530, 4.5]]) P.belt(z, -5.75, 4.25, 10, p);
    press(486, -4, 0.6, 1.9); press(486, -8, 2.4, 1.6); press(516, -7.5, 1.2, 2); press(546, -4, 3, 1.9);
    for (const z of [462, 476, 506, 524, 556, 568]) coin(z, z % 12 < 6 ? -7.5 : -5, 0.9);
    marble(470, 5.75, 3, 2.2); soldier(492, 5.75, 3.2, 2.8); marble(514, 5.75, 3, 1.9); soldier(538, 5.75, 3.2, 2.6); marble(562, 5.75, 3, 2.1);
    coin(458, 5.75); coin(481, 4); coin(503, 7.5); coin(550, 7.5);
    gift(612, -3); robot(628, 0, 3.5, 2.6); crate(646, 3.5); duck(660, -3); boost(668, 0, 1.6, 6); coin(618, 3); coin(646, -2); coin(676, 0);
    blocks(706, -3, 0.9); blocks(726, -7, 0.9); blocks(746, -3, 0.9); blocks(766, -7, 0.9);
    for (const z of [706, 726, 746, 766]) coin(z, z % 40 === 6 ? -3.4 : -6.8);
    spin(714, 5, 2.4, 1.7); spin(744, 5, 2.4, 2); boost(726, 5, 1.6, 6); coin(756, 5);
    gift(796, -2.5); gift(796, 2.5); coin(804, 0);
    // ③ 彈床球池: the ball pit, crossed on trampolines. One bounce over it; then a chain: off a row of trampolines on the
    // floor, onto one in the pit, and the next, each further to the side of the last (steer in the air); a giant
    // trampoline to fly high over balloons; jack-in-the-boxes
    const tramp = (z, x, hw, len, o) => P.launch(z, x, hw, len, o.vy, o.v, o.rise ?? 0.25, { k: o.k || 'tramp', sfx: o.sfx || 'boing', pop: o.pop, catch: CATCH, snap: true, grab: GRAB });   // (it catches her even on its very edge)
    const floorPads = (z, o) => { for (const x of [-4, 0, 4]) tramp(z, x, 2, 2, o); };
    const hole = (z0, z1, x0 = -6, x1 = 6) => {                 // (a full-width one stops just short of the pads either end: she is caught at their very edge)
      if (x1 - x0 > 11) { z0 += 0.4; z1 -= 0.4; }
      if (z1 - z0 > 0.05 && x1 - x0 > 0.05) P.gap('pit', z0, z1 - z0, { x: (x0 + x1) / 2, hw: (x1 - x0) / 2, nojump: true });
    };
    floorPads(PADS1, { ...PAD, pop: 'bounce' });
    hole(PADS1 + 2, PADS1 + 2 + B_FLAND.z - 4);
    row(PADS1 + 2 + B_FLOOR.top[0] - 3, 0, 3, 3); c.coins.slice(-3).forEach(k => { k.y = B_FLOOR.at(k.z - PADS1 - 2) + 0.75; });
    boost(878, 0, 1.6, 5);
    floorPads(CHAIN, PAD);
    let end = CHAIN + 2;
    CATCHES.forEach((zc, k) => {                                 // a pad on each catch, the pit all round
      const x = CHAIN_X[k], a = zc - 3, b = zc + 3.5;
      tramp(a, x, 2, b - a, { ...PAD, rise: MAT });
      hole(end, a); hole(a, b, -6, x - 2); hole(a, b, x + 2, 6);
      const prev = k ? CHAIN_X[k - 1] : 0, from = k ? CATCHES[k - 1] : CHAIN + 2, B = k ? B_MAT : B_FLOOR;   // a coin at the top of each bounce, on her way across
      coin(from + B.top[0], lerp(prev, x, B.top[0] / B.z), B.top[1] + 0.75);
      end = b;
    });
    hole(end, PIT_END);
    boost(PIT_END + 6, 0, 1.6, 5); coin(PIT_END + 4, 0);
    for (const x of [-4, 0, 4]) tramp(MEGAZ, x, 2, 2, { ...MEGA, k: 'mega', pop: 'bounce', sfx: 'boing2' });
    hole(MEGAZ + 2, MEGAZ + 2 + B_MEGA.z - 4);
    for (let k = 1; k <= 5; k++) { const d = B_MEGA.z * k / 6; coin(MEGAZ + 2 + d, 0, B_MEGA.at(d) + 0.75); }
    jack(MEGAZ + B_MEGA.z + 14, -3); jack(MEGAZ + B_MEGA.z + 26, 3); coin(MEGAZ + B_MEGA.z + 14, 2);
    // ④ 電視遊戲: into the screen of a giant television, and the world is a 2D video game seen from the side. She runs on
    // by herself, at a steady pace. Wind-up robots walking at her (jump over them, or on to them to
    // stomp them flat and bounce), spikes, gaps, crushers slamming down just as she gets there (crouch under them), pipes to duck, a spring
    // that throws her up over a long gap; out through the screen again
    const v = z => TV[0] + z;
    const walker = (z, k = 0.25) => P.walker('walker', v(z), 0, 0.55, { k, h: 0.9 });
    const spikes = (z, n = 1) => P.hop('spikes', v(z), 0, 2.5, { h: 0.6, hd: 0.5 * n });
    const crusher = z => P.stamp('crusher', v(z), 0, 2.5, 1, { top: 3.2, hd: 1.2, near: { low: 1.4 } });   // (hung from the top of the screen, it slams down well before she gets there and stays, just over a crouch)
    const beam = z => P.over('beam', v(z), 0, 5, { hd: 0.8, y1: 99 });   // a pipe hanging from the top of the screen down to head height: under it crouched (nothing to hop over)
    const pit2 = (z, len) => { P.gap('chasm', v(z) + 0.6, len - 1.2, { hw: 2.5 }); c.obstacles[c.obstacles.length - 1].vis = [v(z), v(z) + len]; };   // (a little kinder than it looks at either edge, like any platformer)
    P.cue(TV[0] - 1, 'tvin');
    row(v(4), 0, 3, 2); row(v(16), 0, 3, 2);                         // (a moment to find her feet before the first gap: no robots yet)
    const arcOver = (z, len, n) => { row(v(z), 0, n, len / (n - 1)); c.coins.slice(-n).forEach((k, i) => { k.y = 1.5 + 0.8 * Math.sin(Math.PI * i / (n - 1)); }); };
    pit2(38, 6); arcOver(38, 6, 3);
    spikes(62); coin(v(62), 0, 1.9);
    pit2(78, 8); arcOver(78, 8, 4);
    walker(100, 0.2); coin(v(100), 0, 2.2);
    crusher(126); coin(v(126), 0, 0.6);
    beam(140); coin(v(140), 0, 0.6);
    tramp(v(152), 0, 2.5, 2, { ...SPRING, k: 'spring', sfx: 'boing', rise: 0.3 });
    for (let z = v(155); z < v(154) + B_SPRING.z - 4; z += 4) P.gap('chasm', z, Math.min(4, v(154) + B_SPRING.z - 4 - z), { hw: 2.5, nojump: true });
    for (let k = 1; k <= 5; k++) { const d = B_SPRING.z * k / 6; coin(v(154) + d, 0, B_SPRING.at(d) + 0.75); }
    walker(200); walker(224, 0.3); coin(v(200), 0, 2.4); coin(v(224), 0, 2.4);
    crusher(240); crusher(254); coin(v(240), 0, 0.6); coin(v(254), 0, 0.6);
    pit2(286, 7); arcOver(286, 7, 3);
    P.cue(TV[1] + 0.5, 'tvout');
    // ⑤ 極速迴環: out onto an orange toy race track: wind-up cars racing (slower than her), long sustained bends, booster
    // pads, a leap over a broken piece of track; then the full vertical loop; out of it, ribbons, and the gift box
    rc(T(1170), -2); rc(T(1186), 2); boost(T(1200), 0, 1.4, 6);
    row(T(1160), 0, 2); coin(T(1186), -2); coin(T(1212), 0); coin(T(1300), 0);
    P.tall('divider', FORK3[0], 0, 0.9, { hd: 0.8 });           // the track splits round a divider: left, boost pads end to end; right, cars to hop and a kicker
    boost(T(1232), -2.4, 1.1, 6); boost(T(1252), -2.4, 1.1, 6); boost(T(1272), -2.4, 1.1, 6); coin(T(1242), -2.4); coin(T(1262), -2.4); coin(T(1282), -2.4);
    rc(T(1236), 1.8, 0.6); rc(T(1258), 3.2, 0.6); P.ramp(T(1274), 2.4, 1.1, 0.9, 5); P.flight(c.ramps[c.ramps.length - 1], 3, 4, 30); coin(T(1236), 1.8, 1.8);   // (narrower than that side, one to its left, one to its right: weave past them, or hop them)
    P.launch(GAPZ - 4, 0, 4, 4, KICK.vy, KICK.v, KICK.rise, { k: 'kick', sfx: 'ramp', pop: 'leap' });
    for (let z = GAPZ + 0.5; z < GAPZ + B_KICK.z - 3.01; z += 4) P.gap('gap', z, Math.min(4, GAPZ + B_KICK.z - 3 - z), { nojump: true });   // (in short pieces: a hole is as high as the slope at its middle)
    for (let k = 1; k <= 4; k++) { const d = B_KICK.z * k / 5; coin(GAPZ + d, 0, B_KICK.at(d) + 0.75); }   // (at() is already above the falling track)
    rc(T(1382), 2.2); rc(T(1400), -2); rc(T(1420), 2); boost(T(1434), 0, 1.4, 6); boost(T(1452), 0, 1.4, 6);
    coin(T(1382), -2); coin(T(1400), 2); coin(T(1410), 0); coin(T(1420), -2); coin(T(1462), 0);
    P.cue(L0 + 1, 'loop');
    for (let k = 0; k < 9; k++) coin(L0 + 8 + k * 9, 2.2 * Math.sin(k * 0.9), 0.9);   // round the loop, weaving
    P.cue(SCREW[0] + 2, 'screw'); boost(SCREW[0] - 2, 0, 1.4, 6);
    for (let k = 0; k < 6; k++) coin(SCREW[0] + 6 + k * 10, 2 * Math.sin(k * 1.1), 0.9);   // (nothing in the corkscrew but coins: it is for the ride)
    rc(SCREW[1] + 8, -2);
    ribbon(L1 + 90); pair(L1 + 90, 0.6); gift(L1 + 106, -3); gift(L1 + 106, 3); ribbon(L1 + 122); coin(L1 + 122, 0, 0.6); gift(FINISH - 10, -2.5); gift(FINISH - 10, 2.5); coin(FINISH - 6, 0);
  });

  // ------------------------------------------------------------ look
  const HW = z => course.halfAt(z), gy = z => course.height(z), MED = z => course.medianAt(z);
  const LIFT = (z, x) => course.liftAt(z, x);
  const inLoop = z => z > L0 && z < L1;
  // the hall's floor lies FD below the course: 0 in the halls, the race track up on stilts above it
  const FD = z => 4 * smooth(seg(z, TRACK[0] - 30, TRACK[0] - 6)) * (1 - smooth(seg(z, TRACK[1] - 4, TRACK[1] + 18)));
  // the hall round the loop keeps still while the track moves across under it (the loop's exit is to the side of its way in)
  const HX = z => (z <= L0 ? LOOP.shift / 2 * smooth(seg(z, L0 - 90, L0)) : z >= L1 ? LOOP.shift / 2 * (smooth(seg(z, L1, L1 + 90)) - 1) : 0);
  const FLW = 34;                                               // the hall: walls this far out either side, HH(z) high (higher round the loop, which stands tall)
  const HH = z => 24 + 18 * smooth(seg(z, L0 - 160, L0 - 80)) * (1 - smooth(seg(z, L1 + 40, L1 + 120)));
  const ZONES = [[PIT[0] - 10, 'hall'], [PIT[1] + 12, 'pit'], [TV[0], 'hall'], [TV[1], 'tv'], [TRACK[0] - 4, 'hall'], [TRACK[1], 'track'], [1e9, 'hall']];
  const inTV = z => z >= TV[0] && z < TV[1];
  const nearTV = z => z > TV[0] - 70 && z < TV[1] + 50;          // (the side camera stands out beyond the right-hand wall here: there is none)
  const zone = z => ZONES.find(([b]) => z < b)[1];
  const CUTS = ZONES.map(([b]) => b).slice(0, -1);
  const SEC = z => course.sectionAt(z);
  // each room its own colours: walls, their trim, the floor round the course
  const ROOM = [
    { wall: '#ddd2f2', trim: '#a996d6', floor: ['#9298b2', '#8c92ac'], ceil: '#b3a5d6', win: '#bfe6ff' },
    { wall: '#d3e3f5', trim: '#86a8d8', floor: ['#8e9ab2', '#8894ac'], ceil: '#a9bfe0', win: '#c8ecff' },
    { wall: '#ffe1ee', trim: '#f29cc2', floor: ['#a6a0c0', '#a09aba'], ceil: '#f5c3da', win: '#d4f2ff' },
    { wall: '#2e3366', trim: '#ff5a8a', floor: ['#4a4f78', '#454a72'], ceil: '#262a54', win: '#6ab4ff' },   // the game room (the television)
    { wall: '#d8efd9', trim: '#7cc48a', floor: ['#7f8a9a', '#798494'], ceil: '#b2d9b8', win: '#cdeeff' },
  ];
  const FOG = '#cdbfe6', FC = new Map();
  function fog(col, k) {                                         // far off, colours fade into the haze of the hall
    const q = Math.round(clamp(k) * 6);
    if (!q) return col;
    const key = col + q;
    let v = FC.get(key);
    if (!v) { v = mixHex(col, FOG, q / 6 * 0.85); FC.set(key, v); }
    return v;
  }
  const fogK = (R, z, x = 0) => clamp((root.SkiDraw.toCam(R.cam, R.P3(z, x))[2] - 55) / 75);
  const TOY = ['#ff5a5a', '#3a8fff', '#ffd23f', '#3fc76a', '#b46cff', '#ff8a2a'];

  const PIX = {
    teddy: { cs: 0.4, cols: { B: '#b07a46', L: '#e8c79a', K: '#2a1a10', R: '#e8343a' }, rows: [
      '..BB......BB..', '.BLLB....BLLB.', '.BLBBBBBBBBLB.', '..BBBBBBBBBB..', '..BBKBBBBKBB..', '..BBBBLLBBBB..', '..BBBLKKLBBB..', '...BBBLLBBB...',
      '....RRRRRR....', '.BBBBRRRRBBBB.', 'BBBBLLLLLLBBBB', 'BBB.LLLLLL.BBB', '....LLLLLL....', '..BBBB..BBBB..', '.BBLLB..BLLBB.'] },
    duck: { cs: 0.12, cols: { Y: '#ffd23f', O: '#ff8a1a', K: '#2a2a2a', W: '#fff6c0' }, rows: [
      '...YYY....', '..YWYYY...', '..YKYYYOO.', '..YYYYYOO.', '.YYYYYYY..', 'YYYYYYYYY.', 'YWYYYYYYY.', '.YYYYYYY..'] },
    bigduck: { cs: 0.6, cols: { Y: '#ffd23f', O: '#ff8a1a', K: '#2a2a2a', W: '#fff6c0' }, rows: [
      '...YYY....', '..YWYYY...', '..YKYYYOO.', '..YYYYYOO.', '.YYYYYYY..', 'YYYYYYYYY.', 'YWYYYYYYY.', '.YYYYYYY..'] },
    robot: [['...RR...', '..GGGG..', '.GKGGKG.', '.GGGGGG.', '..GYYG..', 'BBBBBBBB', 'B.BWWB.B', 'B.BBBB.B', '..BBBB..', '..G..G..', '.GG..GG.'],
      ['...RR...', '..GGGG..', '.GKGGKG.', '.GGGGGG.', '..GYYG..', 'BBBBBBBB', 'B.BWWB.B', 'B.BBBB.B', '..BBBB..', '..G..G..', '..GG.GG.']],
    robotCols: { R: '#ff3030', G: '#b8c0cc', K: '#1f2a3a', Y: '#ffd23f', B: '#3a7fe8', W: '#ffffff' },
    soldier: [['..KKK..', '..KKK..', '..KYK..', '..SSS..', '..SKS..', '.RRRRR.', 'RRYRYRR', 'S.RRR.S', '..WWW..', '..B.B..', '..B.B..', '..K.K..'],
      ['..KKK..', '..KKK..', '..KYK..', '..SSS..', '..SKS..', '.RRRRR.', 'RRYRYRR', 'S.RRR.S', '..WWW..', '.B...B.', '.B...B.', '.K...K.']],
    soldierCols: { K: '#1f2230', Y: '#ffd23f', S: '#ffd2b0', R: '#e8343a', W: '#ffffff', B: '#2f4fa8' },
    top: [['....K....', '...RRR...', '.YYYYYYY.', 'RRRRRRRRR', '.BBBBBBB.', '..GGGGG..', '...YYY...', '....K....'],
      ['....K....', '...BBB...', '.GGGGGGG.', 'YYYYYYYYY', '.RRRRRRR.', '..BBBBB..', '...GGG...', '....K....']],
    topCols: { K: '#2a2a2a', R: '#ff5a5a', Y: '#ffd23f', B: '#3a8fff', G: '#3fc76a' },
    clown: { cs: 0.12, cols: { R: '#ff3a3a', W: '#ffffff', K: '#1a1a1a', Y: '#ffd23f', P: '#ff8ad0' }, rows: [
      '..RRRR..', '.RWWWWR.', 'RWKWWKWR', '.WWRRWW.', '.WPWWPW.', '..WWWW..', '.YYYYYY.', 'Y.Y..Y.Y'] },
    walker: [['...KK...', '..RRRR..', '.RWKKWR.', '.RRRRRR.', 'RRYRRYRR', '.RRRRRR.', '..G..G..', '.GG..GG.'],
      ['...KK...', '..RRRR..', '.RWKKWR.', '.RRRRRR.', 'RRYRRYRR', '.RRRRRR.', '..G..G..', '..GG.GG.']],
    walkerCols: { K: '#2a2a2a', R: '#e8343a', W: '#ffffff', Y: '#ffd23f', G: '#6a6f86' },
    spikes: { cs: 0.12, cols: { W: '#e8ecf2', G: '#9aa3b4', K: '#4a5060' }, rows: [
      '...W......W......W......W...', '..WGG....WGG....WGG....WGG..', '..WGG....WGG....WGG....WGG..', '.WGGGG..WGGGG..WGGGG..WGGGG.', '.WGGGG..WGGGG..WGGGG..WGGGG.',
      'WGGGGGGWGGGGGGWGGGGGGWGGGGGG', 'KKKKKKKKKKKKKKKKKKKKKKKKKKKK'] },
    bush: { cs: 0.25, cols: { G: '#3cb043', L: '#8af08a', D: '#2a8a2a' }, rows: [
      '....LLL...LLL....', '..LLGGGL.LGGGLL..', '.LGGGGGGLGGGGGGL.', 'LGGGGGGGGGGGGGGGL', 'DGGGGGGGGGGGGGGGD', 'DDDDDDDDDDDDDDDDD'] },
    horse: { cs: 0.45, cols: { W: '#f4ece0', K: '#2a1a10', B: '#c8343a', Y: '#ffd23f', R: '#8a5a2a' }, rows: [
      '..KK........', '.KWWW.......', 'KWWKW.......', '.WWWW.......', '..WWW.......', '..WWWWWWWWK.', '..WBBBBBWWKK', '..WWWWWWWW.K', '..W..W.W..W.', '..W..W.W..W.', '.RRRRRRRRRR.', 'RR........RR'] },
  };

  // ---- what stands round the course
  const SCENE = (() => {
    const r = rng(7337), belts = [], arms = [], gears = [], toys = [], doms = [], balloons = [], crowd = [], piles = [], cols = [], signs = [], tires = [], rolls = [];
    for (const [a, b] of [[10, 410], [L1 + 70, FINISH - 50]]) for (const sd of [-1, 1]) belts.push({ a, b, sd, x: 15 });   // (round the finish: the shop's shelves)   // side assembly lines along the walls
    for (let z = 30; z < 400; z += 34) arms.push({ z, sd: (z / 34) % 2 < 1 ? -1 : 1 });
    for (let z = L1 + 80; z < FINISH; z += 40) arms.push({ z, sd: (z / 40) % 2 < 1 ? 1 : -1 });
    for (let z = 20; z < FINISH + 60; z += 16) cols.push({ z });
    for (let z = 40; z < FINISH; z += 96 + r() * 40) gears.push({ z, sd: r() < 0.5 ? -1 : 1, rad: 3 + r() * 2.5, y: 9 + r() * 6, sp: (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.5), col: ['#8a93a6', '#b0a080', '#9aa6c0'][(r() * 3) | 0] });
    const SIGN = [[60, '組裝區 A'], [180, '小心夾手'], [330, '安全第一'], [470, '分揀機'], [650, '品管檢驗'], [840, '遊戲室'], [990, '請勿奔跑'], [TV[0] - 40, '電視測試區'], [TRACK[0] + 30, '賽車場'], [1420, '大迴環'], [1700, '包裝區'], [1860, '出貨區']];
    for (const [z, t] of SIGN) signs.push({ z, t, sd: signs.length % 2 ? 1 : -1 });
    // giant toys standing about the floor: teddies, ducks, rocking horses, block towers, balls
    const KINDS = ['teddy', 'blocks', 'ball', 'bigduck', 'horse', 'rings'];
    for (let z = 50; z < FINISH; z += 26 + r() * 22) {
      if ((z > L0 - 70 && z < L1 + 50) || z > FINISH - 50) continue;   // (round the loop the view turns over: no flat pictures there; round the finish, the shop)
      const sd = r() < 0.5 ? -1 : 1, k = KINDS[(r() * KINDS.length) | 0];
      toys.push({ z, sd, x: 9 + r() * 14, k, col: TOY[(r() * TOY.length) | 0], seed: (r() * 1e6) | 0 });
    }
    for (let z = 596; z < 688; z += 2.2) for (const sd of [-1, 1]) doms.push({ z, sd, col: TOY[Math.floor(z / 2.2) % TOY.length] });
    for (let k = 0; k < 40; k++) balloons.push({ z: PIT[0] + r() * (PIT[1] - PIT[0] + 30), x: (r() < 0.5 ? -1 : 1) * (8 + r() * 22), y: 6 + r() * 12, col: TOY[(r() * TOY.length) | 0], ph: r() * 6 });
    const ids = ['owl', 'anji', 'anje', 'anbo', 'ansey', 'angoo', 'anmi', 'anka', 'anzo', 'anbi', 'anleo'];
    for (let z = TRACK[0] + 20; z < TRACK[1] - 10; z += 3.2) {
      if (z > L0 - 70 && z < L1 + 50) continue;
      for (const sd of [-1, 1]) if (r() < 0.7) crowd.push({ z, sd, x: 9.5 + r() * 2.5, row: r() < 0.5 ? 0 : 1, id: ids[(r() * ids.length) | 0], ph: r() * 6 });
    }
    for (let z = TRACK[0] + 30; z < TRACK[1]; z += 22 + r() * 18) if (!inLoop(z) && Math.abs(z - L0) > 30) tires.push({ z, sd: course.curvature(z) > 0 ? -1 : 1 });
    for (let z = 20; z < FINISH - 50; z += 30 + r() * 30) if (!inLoop(z)) piles.push({ z, sd: r() < 0.5 ? -1 : 1, x: 24 + r() * 7, n: 2 + ((r() * 3) | 0), col: r() < 0.5 ? '#c89a5a' : TOY[(r() * TOY.length) | 0] });
    for (let z = L1 + 76; z < FINISH; z += 28) rolls.push({ z, sd: (z / 28) % 2 < 1 ? -1 : 1, col: TOY[(z / 28 | 0) % TOY.length] });
    const byZ = a => a.sort((p, q) => p.z - q.z);
    return { belts, arms: byZ(arms), gears, toys, doms, balloons: byZ(balloons), crowd, piles, cols, signs, tires, rolls };
  })();
  // the balls in each ball pit hole (made once)
  const BALLS = new Map();
  function balls(o) {
    let b = BALLS.get(o);
    if (!b) {
      const r = rng(Math.round(o.z * 13 + o.x * 7)), n = Math.min(90, Math.round(o.hw * o.hd * 1.6));
      b = []; for (let k = 0; k < n; k++) b.push([o.z - o.hd + r() * o.hd * 2, o.x - o.hw + 0.3 + r() * (o.hw * 2 - 0.6), TOY[(r() * TOY.length) | 0], r() * 0.25]);
      BALLS.set(o, b);
    }
    return b;
  }

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
  function glowDot(D, R, p, rad, col, a = 0.5) {                 // a lamp: a soft disc and a bright core
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.8) return;
    const [sx, sy] = D.scr(R.cam, q), rr = clamp(R.cam.F / q[2] * rad, 2, 30), g = D.ctx;
    if (rr < 5) { D.rect(sx - rr, sy - rr, rr * 2, rr * 2, col, Math.min(1, a * 1.6)); return; }
    g.save(); g.globalAlpha *= a * 0.4; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr * 2.2, 0, 7); g.fill();
    g.globalAlpha = Math.min(1, a * 2); g.beginPath(); g.arc(sx, sy, rr * 0.8, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy, rr * 0.4, 0, 7); g.fill(); g.restore();
  }
  function ball3(D, R, p, rad, col, hi = '#ffffff') {             // a ball: a disc with a shine
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.6) return;
    const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * rad, g = D.ctx;
    if (rr < 1.5) { D.rect(sx - 1, sy - 1, 2, 2, col); return; }
    g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
    if (rr > 3) { g.fillStyle = hi; g.globalAlpha *= 0.7; g.beginPath(); g.arc(sx - rr * 0.35, sy - rr * 0.35, rr * 0.3, 0, 7); g.fill(); g.globalAlpha = 1; }
    return [sx, sy, rr];
  }
  // a box standing on the riding surface, its sides along the course (front: the face looking back up the course)
  function boxS(D, R, z0, z1, x0, x1, y0, y1, cols) {
    const p = (z, x, y) => R.S3(z, x, y), cam = R.cam;
    D.poly3(cam, [p(z0, x0, y1), p(z0, x1, y1), p(z1, x1, y1), p(z1, x0, y1)], cols.top, 1, [0, 1, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z1, x0, y0), p(z1, x0, y1), p(z0, x0, y1)], cols.side, 1, [-1, 0, 0]);
    D.poly3(cam, [p(z0, x1, y0), p(z1, x1, y0), p(z1, x1, y1), p(z0, x1, y1)], cols.side, 1, [1, 0, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z0, x1, y0), p(z0, x1, y1), p(z0, x0, y1)], cols.front, 1, [0, 0, -1]);
    if (cols.back) D.poly3(cam, [p(z1, x0, y0), p(z1, x1, y0), p(z1, x1, y1), p(z1, x0, y1)], cols.back, 1, [0, 0, 1]);
  }
  function dividerObs(D, R, o) {                                  // the nose of the divider down the race track: blue, striped
    boxS(D, R, o.z - o.hd, o.z + o.hd, o.x - o.hw, o.x + o.hw, 0, 1.2, { top: '#7fb2ff', side: '#2f6fe0', front: '#2f6fe0' });
    for (let k = 0; k < 3; k++) D.poly3(R.cam, [R.S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6, 0.2), R.S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6 + 0.3, 0.2), R.S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6 + 0.3, 1.0), R.S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6, 1.0)], '#ffffff');
  }
  // a box on the hall floor (y from the floor), x across from the centre line (the hall's own x round the loop)
  function boxF(D, R, z0, z1, x0, x1, y0, y1, cols, k = 0) {
    const zm = (z0 + z1) / 2, f = gy(zm) - FD(zm), hx = HX(zm), p = (z, x, y) => R.WF(z, x + hx, f + y), cam = R.cam, c = v => fog(v, k);
    D.poly3(cam, [p(z0, x0, y1), p(z0, x1, y1), p(z1, x1, y1), p(z1, x0, y1)], c(cols.top), 1, [0, 1, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z1, x0, y0), p(z1, x0, y1), p(z0, x0, y1)], c(cols.side), 1, [-1, 0, 0]);
    D.poly3(cam, [p(z0, x1, y0), p(z1, x1, y0), p(z1, x1, y1), p(z0, x1, y1)], c(cols.side), 1, [1, 0, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z0, x1, y0), p(z0, x1, y1), p(z0, x0, y1)], c(cols.front), 1, [0, 0, -1]);
    D.poly3(cam, [p(z1, x0, y0), p(z1, x1, y0), p(z1, x1, y1), p(z1, x0, y1)], c(cols.back || cols.front), 1, [0, 0, 1]);
  }
  const FL = (R, z, x, y) => R.WF(z, x + HX(z), gy(z) - FD(z) + y);   // a point above the hall floor (fixed: it never turns with the corkscrew)
  const stripes = (D, R, z, x0, x1, y0, y1, a, b, n) => { for (let k = 0; k < n; k++) { const xa = lerp(x0, x1, k / n), xb = lerp(x0, x1, (k + 1) / n); D.poly3(R.cam, [R.S3(z, xa, y0), R.S3(z, xb, y0), R.S3(z, xb, y1), R.S3(z, xa, y1)], k % 2 ? b : a); } };
  const crouch = (D, R, o, x) => { for (let k = 0; k < 2; k++) { const y = o.y0 - 0.3 - k * 0.32; D.poly3(R.cam, [R.P3(o.z - 0.02, x - 0.35, y + 0.18), R.P3(o.z - 0.02, x, y), R.P3(o.z - 0.02, x + 0.35, y + 0.18), R.P3(o.z - 0.02, x + 0.35, y + 0.08), R.P3(o.z - 0.02, x, y - 0.1), R.P3(o.z - 0.02, x - 0.35, y + 0.08)], '#ffffff'); } };

  // ---- the hall: floor round the course, walls with tall windows, the ceiling and its trusses; drawn under everything
  function hall(D, R, za, zb, near) {
    let a = za, b = zb;
    if (a < L0 && b > L0) b = L0;
    if (a < L1 && b > L1) a = L1;
    if (b <= a || (a >= L0 && b <= L1)) return;
    if (inTV(a) && inTV(b)) return;                                // (inside the television: the game's own world)
    const zm = (a + b) / 2, rm = ROOM[SEC(zm)], k = fogK(R, zm), c = v => fog(v, k), cam = R.cam;
    const F = (z, x, y = 0) => FL(R, z, x, y);
    const e0 = Math.max(HW(a), HW(b)) + 0.4;
    for (const sd of [-1, 1]) {
      D.poly3(cam, [F(a, 0, -0.03), F(a, sd * FLW, 0), F(b, sd * FLW, 0), F(b, 0, -0.03)], c(rm.floor[Math.floor(zm / 8) % 2]));
      if (sd > 0 && nearTV(zm)) continue;
      if (near) { const xl = sd * (e0 + 3); D.poly3(cam, [F(a, xl, 0.01), F(a, xl + sd * 0.3, 0.01), F(b, xl + sd * 0.3, 0.01), F(b, xl, 0.01)], c('#f0c93a')); }   // the walkway's yellow line
      D.poly3(cam, [F(a, sd * FLW, 0), F(b, sd * FLW, 0), F(b, sd * FLW, HH(b)), F(a, sd * FLW, HH(a))], c(rm.wall));
      D.poly3(cam, [F(a, sd * FLW - sd * 0.01, 0), F(b, sd * FLW - sd * 0.01, 0), F(b, sd * FLW - sd * 0.01, 2.2), F(a, sd * FLW - sd * 0.01, 2.2)], c(rm.trim));
      const w0 = Math.max(a, Math.floor(zm / 16) * 16 + 3), w1 = Math.min(b, Math.floor(zm / 16) * 16 + 13);   // tall windows between the columns, the sky beyond
      if (w1 > w0) {
        D.poly3(cam, [F(w0, sd * (FLW - 0.02), 8), F(w1, sd * (FLW - 0.02), 8), F(w1, sd * (FLW - 0.02), 19), F(w0, sd * (FLW - 0.02), 19)], c(rm.win));
        if (near || k < 0.5) D.poly3(cam, [F(w0, sd * (FLW - 0.03), 13.4), F(w1, sd * (FLW - 0.03), 13.4), F(w1, sd * (FLW - 0.03), 13.6), F(w0, sd * (FLW - 0.03), 13.6)], c('#ffffff'));
      }
    }
    if (Math.abs(R.CO.worldZ(zm) - L0) < 24 && FD(zm) > 3) for (let x = -16; x < 16 + LOOP.shift; x += 4) {   // a chequered pad round the foot of the loop (so which way up the hall is shows, round it)
      const i = Math.floor(x / 4) + Math.floor(R.CO.worldZ(a) / 4), X = z => x - HX(z) + LOOP.shift / 2;
      D.poly3(cam, [F(a, X(a), 0.02), F(a, X(a) + 4, 0.02), F(b, X(b) + 4, 0.02), F(b, X(b), 0.02)], c((i % 2 + 2) % 2 ? '#f4f4f4' : '#22252e'));
    }
    if (!nearTV(zm)) D.poly3(cam, [F(a, -FLW, HH(a)), F(a, FLW, HH(a)), F(b, FLW, HH(b)), F(b, -FLW, HH(b))], c(rm.ceil));
    const tz = Math.ceil(a / 8) * 8;                            // a truss across the ceiling every 8, a lamp hanging from every other one
    if (tz < b && !nearTV(tz)) {
      const WH = HH(tz);
      D.poly3(cam, [F(tz - 0.25, -FLW, WH - 1.2), F(tz - 0.25, FLW, WH - 1.2), F(tz - 0.25, FLW, WH - 0.01), F(tz - 0.25, -FLW, WH - 0.01)], c('#6a6f86'));
      if (tz % 16 === 0 && k < 0.8) for (const x of [-10, 10]) { D.poly3(cam, [F(tz, x - 0.05, WH - 4), F(tz, x + 0.05, WH - 4), F(tz, x + 0.05, WH - 1.2), F(tz, x - 0.05, WH - 1.2)], c('#4a4f5c')); D.poly3(cam, [F(tz, x - 1.2, WH - 4.6), F(tz, x + 1.2, WH - 4.6), F(tz, x + 0.6, WH - 4), F(tz, x - 0.6, WH - 4)], c('#4a4f5c')); glowDot(D, R, F(tz, x, WH - 4.7), 0.5, '#fff6d8', 0.35 * (1 - k)); }
    }
    if (FD(zm) > 0.3 && !R.CO.twistAt(zm) && !R.CO.twistAt(a) && !R.CO.twistAt(b)) {   // the race track up on its stilts: legs every 12 (none under the corkscrew: it turns about its own post)
      const lz = Math.ceil(a / 12) * 12;
      if (lz < b) for (const sd of [-1, 1]) { const X = sd * (HW(lz) - 0.6); D.poly3(cam, [F(lz, X - 0.3, 0), F(lz, X + 0.3, 0), R.W3(lz, X + 0.3, gy(lz) - 0.35), R.W3(lz, X - 0.3, gy(lz) - 0.35)], c('#3a5fbf')); }
      for (const sd of [-1, 1]) D.poly3(cam, [R.W3(a, sd * HW(a), gy(a)), R.W3(b, sd * HW(b), gy(b)), R.W3(b, sd * HW(b), gy(b) - 0.4), R.W3(a, sd * HW(a), gy(a) - 0.4)], c('#d85f0a'));   // the side of the track
    }
  }

  // ---- the course surface
  function railSide(D, R, za, zb, x, sd, col, top, h = 0.8) {     // a low wall along the edge
    D.poly3(R.cam, [R.S3(za, x, 0), R.S3(zb, x, 0), R.S3(zb, x, h), R.S3(za, x, h)], col, 1, [-sd, 0, 0]);
    D.poly3(R.cam, [R.S3(za, x, h), R.S3(zb, x, h), R.S3(zb, x + sd * 0.25, h), R.S3(za, x + sd * 0.25, h)], top);
  }
  function hallSlice(D, R, za, zb, near) {
    const { cam, S3 } = R, h0 = HW(za), h1 = HW(zb), med = Math.max(MED(za), MED(zb)), k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k);
    const col = Math.floor(za / 4) % 2 ? '#c2c8dc' : '#bcc2d6';
    const Q = (x0a, x1a, x0b, x1b, up, cl) => D.poly3(cam, [S3(za, x0a, up), S3(za, x1a, up), S3(zb, x1b, up), S3(zb, x0b, up)], cl);
    if (med > 0.01) {                                           // a fork: each side on its own (up onto the catwalk, down into the booth)
      const ma = MED(za), mb = MED(zb), L = LIFT((za + zb) / 2, -5) > 0.5, Rr = LIFT((za + zb) / 2, 5) < -0.3;
      Q(-h0, -ma, -h1, -mb, 0, c(L ? (Math.floor(za / 2) % 2 ? '#8a93a6' : '#7f889b') : col));
      Q(ma, h0, mb, h1, 0, c(Rr ? (Math.floor(za / 2) % 2 ? '#e8e2f0' : '#e0d8ea') : col));
      if (L && near) for (let x = -h0 + 0.6; x < -ma - 0.3; x += 0.9) Q(x, x + 0.08, x, x + 0.08, 0.01, '#6a7286');   // the catwalk's grating
      // the divider down the middle, as high as the higher side
      const ya = Math.max(0, LIFT(za, -1)) + 1.1, yb = Math.max(0, LIFT(zb, -1)) + 1.1, ba = Math.min(0, LIFT(za, 1)), bb = Math.min(0, LIFT(zb, 1));
      const M = (z, x, y) => R.W3(z, x, gy(z) + y);
      D.poly3(cam, [M(za, -ma, ba), M(zb, -mb, bb), M(zb, -mb, yb), M(za, -ma, ya)], c('#5a6070'), 1, [-1, 0, 0]);
      D.poly3(cam, [M(za, ma, ba), M(zb, mb, bb), M(zb, mb, yb), M(za, ma, ya)], c('#5a6070'), 1, [1, 0, 0]);
      D.poly3(cam, [M(za, -ma, ya), M(za, ma, ya), M(zb, mb, yb), M(zb, -mb, yb)], c(Math.floor(za / 2) % 2 ? '#ffcf3a' : '#2a2d36'));
      // the catwalk's outside drops to the floor; the booth's floor is down in a trough
      for (const [sd, x0, x1] of [[-1, -h0, -h1], [1, h0, h1]]) {
        const la = LIFT(za, sd * 5), lb = LIFT(zb, sd * 5);
        if (Math.abs(la) + Math.abs(lb) < 0.02) continue;
        D.poly3(cam, [M(za, x0, Math.min(0, la)), M(zb, x1, Math.min(0, lb)), M(zb, x1, Math.max(0, lb)), M(za, x0, Math.max(0, la))], c(la > 0 ? '#6a7286' : '#b9b0cc'));
      }
    } else Q(-h0, h0, -h1, h1, 0, c(col));
    if (near) for (const sd of [-1, 1]) Q(sd * (h0 - 0.5), sd * (h0 - 0.25), sd * (h1 - 0.5), sd * (h1 - 0.25), 0.01, '#f0c93a');   // yellow safety lines
    for (const sd of [-1, 1]) {                                  // safety rails along the edges, striped
      const x = sd * h0, xb = sd * h1, cl = Math.floor(za / 2) % 2 ? '#ffcf3a' : '#2a2d36';
      D.poly3(cam, [S3(za, x, 0), S3(zb, xb, 0), S3(zb, xb, 0.9), S3(za, x, 0.9)], c(cl), 1, [-sd, 0, 0]);
      D.poly3(cam, [S3(za, x, 0.9), S3(zb, xb, 0.9), S3(zb, xb + sd * 0.25, 0.9), S3(za, x + sd * 0.25, 0.9)], c('#e8ecf2'));
    }
  }
  function belts(D, R, za, zb, near) {                          // conveyor belts across the course: rubber, rollers, yellow chevrons sliding the way they carry her
    const { cam, S3, t } = R;
    for (const b of course.belts) {
      const z0 = Math.max(za, b.z), z1 = Math.min(zb, b.z + b.len);
      if (z1 <= z0) continue;
      const x0 = b.x - b.hw, x1 = b.x + b.hw, Q = (xa, xb, up, col, a = 1) => D.poly3(cam, [S3(z0, xa, up), S3(z0, xb, up), S3(z1, xb, up), S3(z1, xa, up)], col, a);
      Q(x0, x1, 0.03, '#3b3f4d');
      if (!near) continue;
      const sp = 1.1, ph = ((t * b.push) % sp + sp) % sp;      // the belt's slats, sliding across
      for (let x = x0 + ph; x < x1; x += sp) Q(x, Math.min(x1, x + 0.18), 0.035, '#5a5f70');
      const dir = Math.sign(b.push), cz = b.z + b.len / 2, gap = 2.8, cph = ((t * b.push * 0.9) % gap + gap) % gap;
      if (cz >= za && cz < zb) for (let x = x0 + cph - gap; x < x1 + gap; x += gap) {   // chevrons ">" sliding the way it carries her
        const tip = x + dir * 0.7, back = x - dir * 0.7;
        if (Math.min(tip, back) < x0 || Math.max(tip, back) > x1) continue;
        for (const zA of [cz - 2.6, cz + 2.6]) D.poly3(cam, [S3(zA, back, 0.045), S3(zA, back + dir * 0.6, 0.045), S3(cz, tip, 0.045), S3(cz, tip - dir * 0.6, 0.045)], '#ffcf3a');
      }
      for (const zz of [b.z, b.z + b.len]) if (zz >= za && zz < zb) { D.poly3(cam, [S3(zz - 0.25, x0, 0.08), S3(zz - 0.25, x1, 0.08), S3(zz + 0.25, x1, 0.08), S3(zz + 0.25, x0, 0.08)], '#9aa3b4'); }   // rollers at its ends
    }
  }
  const PITS = course.obstacles.filter(o => o.hole && o.k === 'pit');
  const pitsIn = (za, zb) => PITS.filter(o => o.z + o.hd > za && o.z - o.hd < zb);
  function pitFloor(D, R, za, zb) {                              // down in the ball pits: a dark floor, padded walls (the balls go on top, with the mats)
    const { cam, S3 } = R;
    for (const o of pitsIn(za, zb)) {
      const z0 = Math.max(za, o.z - o.hd), z1 = Math.min(zb, o.z + o.hd), x0 = o.x - o.hw, x1 = o.x + o.hw;
      D.poly3(cam, [S3(z0, x0, -0.7), S3(z0, x1, -0.7), S3(z1, x1, -0.7), S3(z1, x0, -0.7)], '#4a3478');
      if (o.z + o.hd <= zb) D.poly3(cam, [S3(o.z + o.hd, x0, -0.7), S3(o.z + o.hd, x1, -0.7), S3(o.z + o.hd, x1, 0), S3(o.z + o.hd, x0, 0)], '#8fd0ff', 1, [0, 0, -1]);
      for (const [x, sd] of [[x0, 1], [x1, -1]]) if (Math.abs(x) < 5.99) D.poly3(cam, [S3(z0, x, -0.7), S3(z1, x, -0.7), S3(z1, x, 0), S3(z0, x, 0)], '#7fc0f0', 1, [sd, 0, 0]);
    }
  }
  function pitSlice(D, R, za, zb, near) {                        // the playroom floor: soft mats in squares, open over the ball pits; the balls
    const { cam, S3 } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k);
    const MAT = ['#ff9ec7', '#8fd0ff', '#ffe08a', '#9fe6a8'], pits = pitsIn(za, zb), cuts = [za, zb];
    for (const o of pits) for (const e of [o.z - o.hd, o.z + o.hd]) if (e > za && e < zb) cuts.push(e);
    cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2, h0 = HW(a), h1 = HW(b);
      const open = pits.filter(o => m > o.z - o.hd && m < o.z + o.hd).map(o => [o.x - o.hw, o.x + o.hw]).sort((p, q) => p[0] - q[0]);
      let x = -6;
      const mat = (xa, xb) => {                                  // mats from xa to xb (in squares, near)
        if (xb - xa < 0.01) return;
        if (!near) { D.poly3(cam, [S3(a, Math.max(-h0, xa), 0), S3(a, Math.min(h0, xb), 0), S3(b, Math.min(h1, xb), 0), S3(b, Math.max(-h1, xa), 0)], c(MAT[Math.floor(a / 8) % 4])); return; }
        for (let t = Math.floor(xa / 2) * 2; t < xb; t += 2) { const u0 = Math.max(xa, t), u1 = Math.min(xb, t + 2); if (u1 > u0) D.poly3(cam, [S3(a, u0, 0), S3(a, u1, 0), S3(b, u1, 0), S3(b, u0, 0)], MAT[(((t / 2 + 3) | 0) + Math.floor(a / 2)) % 4]); }
      };
      for (const [o0, o1] of open) { mat(x, o0); x = Math.max(x, o1); }
      mat(x, 6);
      if (near) for (const o of pits) for (const [bz, bx, col, dy] of balls(o)) if (bz >= a && bz < b) ball3(D, R, S3(bz, bx, -0.32 + dy), 0.3, col);
    }
    for (const sd of [-1, 1]) railSide(D, R, za, zb, sd * HW(za), sd, c('#ff7ab0'), c('#ffd0e4'), 0.9);   // padded walls
  }
  function trackSlice(D, R, za, zb, near) {                      // the orange toy race track: joints every 12, white dashes, blue rails
    const { cam, S3 } = R, h0 = HW(za), h1 = HW(zb), lp = inLoop((za + zb) / 2), k = near || lp ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k);
    const gap = course.obstacles.find(o => o.k === 'gap' && za < o.z + o.hd && zb > o.z - o.hd);
    if (gap) return;                                             // (a broken stretch: nothing there)
    const n = lp ? (() => { const th = 2 * Math.PI * course.loopAt((za + zb) / 2); return [0, Math.cos(th), -Math.sin(th)]; })() : [0, 1, 0];
    const Q = (x0a, x1a, x0b, x1b, up, cl, nn) => D.poly3(cam, [S3(za, x0a, up), S3(za, x1a, up), S3(zb, x1b, up), S3(zb, x0b, up)], cl, 1, nn);
    const mid = (L0 + L1) / 2;
    if (za <= mid + 1 && zb > mid - 1) loopBeam(D, R);
    Q(-h0, h0, -h1, h1, 0, c(Math.floor(za / 4) % 2 ? '#ff7a1a' : '#f47012'));
    if (lp || FD((za + zb) / 2) > 0.3) Q(-h0 - 0.3, h0 + 0.3, -h1 - 0.3, h1 + 0.3, -0.35, c('#d85f0a'), n.map(v => -v));   // its underside (seen from outside the loop)
    if (near || lp) {
      if (Math.floor(za / 2) % 3 === 0) Q(-0.12, 0.12, -0.12, 0.12, 0.01, '#ffffff');
      const j = Math.ceil(za / 12) * 12;
      if (j < zb) D.poly3(cam, [S3(j - 0.12, -h0, 0.01), S3(j - 0.12, h0, 0.01), S3(j + 0.12, h0, 0.01), S3(j + 0.12, -h0, 0.01)], '#c85a0a');
    }
    const ma = MED(za), mb = MED(zb);
    if (ma > 0.05 || mb > 0.05) {                                  // the divider down the middle where the track splits
      for (const sd of [-1, 1]) D.poly3(cam, [S3(za, sd * ma, 0), S3(zb, sd * mb, 0), S3(zb, sd * mb, 0.9), S3(za, sd * ma, 0.9)], c('#2f6fe0'), 1, lp ? null : [sd, 0, 0]);
      D.poly3(cam, [S3(za, -ma, 0.9), S3(za, ma, 0.9), S3(zb, mb, 0.9), S3(zb, -mb, 0.9)], c('#7fb2ff'));
    }
    for (const sd of [-1, 1]) {
      const x = sd * h0, xb = sd * h1;
      D.poly3(cam, [S3(za, x, 0), S3(zb, xb, 0), S3(zb, xb, 0.7), S3(za, x, 0.7)], c('#2f6fe0'));
      D.poly3(cam, [S3(za, x, 0.7), S3(zb, xb, 0.7), S3(zb, xb + sd * 0.3, 0.7), S3(za, x + sd * 0.3, 0.7)], c('#7fb2ff'));
      D.poly3(cam, [S3(za, x + sd * 0.3, -0.35), S3(zb, xb + sd * 0.3, -0.35), S3(zb, xb + sd * 0.3, 0.7), S3(za, x + sd * 0.3, 0.7)], c('#2457c0'), 1, lp ? null : [sd, 0, 0]);
    }
  }
  function gapEnds(D, R) {                                        // the broken ends of the track either side of the leap, jagged
    const g = course.obstacles.filter(o => o.k === 'gap');
    if (!g.length) return;
    const z0 = g[0].z - g[0].hd, z1 = g[g.length - 1].z + g[g.length - 1].hd, { cam, S3 } = R;
    for (const [zz, dir] of [[z0, 1], [z1, -1]]) {
      const h = HW(zz);
      for (let x = -h, i = 0; x < h - 0.01; x += 0.9, i++) D.poly3(cam, [S3(zz, x, 0), S3(zz, x + 0.9, 0), S3(zz + dir * (0.4 + (i % 3) * 0.35), x + 0.45, 0)], '#ff7a1a');
      D.poly3(cam, [S3(zz, -h - 0.3, 0), S3(zz, h + 0.3, 0), S3(zz, h + 0.3, -0.35), S3(zz, -h - 0.3, -0.35)], '#c85a0a', 1, [0, 0, -dir]);
    }
  }

  // ---- obstacles
  function pressObs(D, R, o) {                                     // a stamping press: two steel legs, a beam, the head going up and down
    const { cam, S3, P3 } = R, y = stampY(o, R.rt, R.sz), top = o.stamp.top + 1.6, x0 = o.x - o.hw, x1 = o.x + o.hw, z0 = o.z - o.hd, z1 = o.z + o.hd;
    const steel = { top: '#8a93a6', side: '#5a6070', front: '#6c7486' };
    for (const x of [x0 - 0.35, x1]) boxS(D, R, z0 + 0.2, z1 - 0.2, x, x + 0.35, 0, top, steel);
    boxS(D, R, z0, z1, x0 - 0.35, x1 + 0.35, top, top + 0.7, { top: '#6c7486', side: '#4a5060', front: '#ffcf3a' });
    D.poly3(cam, [S3(o.z, o.x - 0.15, y + 1.2), S3(o.z, o.x + 0.15, y + 1.2), S3(o.z, o.x + 0.15, top), S3(o.z, o.x - 0.15, top)], '#c9ced9');   // the ram
    const shade = clamp(1 - y / o.stamp.top);
    D.poly3(cam, [S3(z0, x0, 0.02), S3(z0, x1, 0.02), S3(z1, x1, 0.02), S3(z1, x0, 0.02)], '#1a1d26', 0.15 + 0.35 * shade);   // its shadow darkens as it comes down
    boxS(D, R, z0, z1, x0, x1, y, y + 1.2, { top: '#9aa3b4', side: '#7a8296', front: '#8a93a6' });
    stripes(D, R, z0 - 0.01, x0, x1, y, y + 0.35, '#ffcf3a', '#2a2d36', Math.round(o.hw * 4));
    const u = (((o.stamp.w * R.rt + o.stamp.ph) / (2 * Math.PI)) % 1 + 1) % 1, d = o.z - R.sz;   // the warning light: red just before it falls
    const red = o.stamp.near ? d > -3 && d < 24 : u > 0.3 && u < 0.6;
    glowDot(D, R, S3(z0 - 0.05, x1 + 0.17, top + 0.35), 0.16, red ? '#ff3030' : '#3fd06a', red && Math.floor(R.t * 10) % 2 ? 1 : 0.6);
    if (y > 2.6 && R.near(o.z)) D.poly3(cam, [P3(z0 - 0.02, o.x - 0.5, 0.25), P3(z0 - 0.02, o.x + 0.5, 0.25), P3(z0 - 0.02, o.x, 0.05)], '#ffffff', 0.5);
  }
  // inside the TV, what she crouches under hangs down from the top of the screen (nothing standing under it, nothing to
  // hop over), its bottom at head height: a crusher on a ram, a green pipe
  function hungCrusher(D, R, o) {
    const { cam, S3 } = R, y = stampY(o, R.rt, R.sz), x0 = o.x - o.hw, x1 = o.x + o.hw, z0 = o.z - o.hd, z1 = o.z + o.hd;
    boxS(D, R, o.z - 0.5, o.z + 0.5, o.x - 0.5, o.x + 0.5, y + 2.2, 30, { top: '#c9ced9', side: '#9aa3b4', front: '#b0b8c8' });   // the ram, up off the top of the screen
    boxS(D, R, z0 + 0.3, z1 - 0.3, x0 + 0.2, x1 - 0.2, y + 1.8, y + 2.2, { top: '#6c7486', side: '#4a5060', front: '#5a6070' });
    boxS(D, R, z0, z1, x0, x1, y, y + 1.8, { top: '#9aa3b4', side: '#7a8296', front: '#8a93a6' });   // the head
    for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) {         // hazard stripes along its bottom edge, on the sides she sees it from
      const za = lerp(z0, z1, k / 6), zb = lerp(z0, z1, (k + 1) / 6), X = sd > 0 ? x1 + 0.01 : x0 - 0.01;
      D.poly3(cam, [S3(za, X, y), S3(zb, X, y), S3(zb, X, y + 0.4), S3(za, X, y + 0.4)], k % 2 ? '#2a2d36' : '#ffcf3a', 1, [sd, 0, 0]);
    }
  }
  function hangPipe(D, R, o) {
    const { cam, S3 } = R, z = o.z, y = o.y0, w = o.hd - 0.2;
    boxS(D, R, z - w, z + w, -0.9, 0.9, y + 0.6, 30, { top: '#5ad04a', side: '#2fa83a', front: '#3fbf45' });   // the pipe, up off the top of the screen
    boxS(D, R, z - o.hd, z + o.hd, -1.1, 1.1, y, y + 0.6, { top: '#5ad04a', side: '#2fa83a', front: '#3fbf45' });   // its mouth
    for (const sd of [-1, 1]) {                                     // a shine down it, dark edges
      const X = sd * 0.91, Xm = sd * 1.11;
      D.poly3(cam, [S3(z - w * 0.55, X, y + 0.6), S3(z - w * 0.25, X, y + 0.6), S3(z - w * 0.25, X, 30), S3(z - w * 0.55, X, 30)], '#9cf08a', 1, [sd, 0, 0]);
      D.poly3(cam, [S3(z + w * 0.75, X, y + 0.6), S3(z + w, X, y + 0.6), S3(z + w, X, 30), S3(z + w * 0.75, X, 30)], '#1d7a2a', 1, [sd, 0, 0]);
      D.poly3(cam, [S3(z - o.hd * 0.6, Xm, y), S3(z - o.hd * 0.3, Xm, y), S3(z - o.hd * 0.3, Xm, y + 0.6), S3(z - o.hd * 0.6, Xm, y + 0.6)], '#9cf08a', 1, [sd, 0, 0]);
      D.poly3(cam, [S3(z - o.hd, Xm, y), S3(z + o.hd, Xm, y), S3(z + o.hd, Xm, y + 0.08), S3(z - o.hd, Xm, y + 0.08)], '#1d7a2a', 1, [sd, 0, 0]);
    }
  }
  function rcCar(D, R, o) {                                         // a wind-up race car racing her way: body, cockpit, spoiler, wheels, number
    const { cam, S3 } = R, z = obZ(o, R.sz), x = o.x, L = o.hd, W = o.hw, col = TOY[Math.round(o.z) % TOY.length];
    for (const wz of [z - L * 0.6, z + L * 0.6]) for (const sd of [-1, 1]) boxS(D, R, wz - 0.3, wz + 0.3, x + sd * W - (sd > 0 ? 0.1 : -0.1) - 0.15, x + sd * W + 0.15 - (sd > 0 ? 0.1 : -0.1), 0, 0.55, { top: '#2a2a2a', side: '#1a1a1a', front: '#2a2a2a' });
    boxS(D, R, z - L, z + L, x - W + 0.12, x + W - 0.12, 0.2, 0.6, { top: col, side: mixHex(col, '#000000', 0.2), front: mixHex(col, '#ffffff', 0.15), back: mixHex(col, '#000000', 0.3) });
    boxS(D, R, z - 0.2, z + 0.5, x - 0.35, x + 0.35, 0.6, 0.9, { top: '#9fdcff', side: '#5aa8e0', front: '#7fc8f0', back: '#5aa8e0' });
    boxS(D, R, z - L, z - L + 0.25, x - W, x + W, 0.85, 0.95, { top: '#2a2a2a', side: '#1a1a1a', front: '#1a1a1a', back: '#2a2a2a' });
    for (const sd of [-0.5, 0.5]) D.poly3(cam, [S3(z - L + 0.1, x + sd, 0.6), S3(z - L + 0.15, x + sd, 0.6), S3(z - L + 0.15, x + sd, 0.86), S3(z - L + 0.1, x + sd, 0.86)], '#1a1a1a');
    text3(D, R, S3(z - L - 0.01, x, 0.42), String(1 + (Math.round(o.z) % 9)), 0.3, '#ffffff', { far: 40 });
    glowDot(D, R, S3(z - L - 0.02, x - W + 0.25, 0.4), 0.08, '#ff3030', 0.8); glowDot(D, R, S3(z - L - 0.02, x + W - 0.25, 0.4), 0.08, '#ff3030', 0.8);
  }
  function giftBox(D, R, o, x) {                                   // a present: a box, a ribbon round it both ways, a bow on top
    const z0 = o.z - 0.55, z1 = o.z + 0.55, x0 = x - o.hw, x1 = x + o.hw, i = Math.round(o.z * 3 + o.x), col = TOY[i % TOY.length], rib = TOY[(i + 2) % TOY.length], h = o.h;
    boxS(D, R, z0, z1, x0, x1, 0, h, { top: mixHex(col, '#ffffff', 0.15), side: mixHex(col, '#000000', 0.15), front: col });
    boxS(D, R, z0 - 0.01, z1 + 0.01, x - 0.12, x + 0.12, 0, h + 0.01, { top: rib, side: rib, front: rib });
    boxS(D, R, o.z - 0.12, o.z + 0.12, x0 - 0.01, x1 + 0.01, 0, h + 0.01, { top: rib, side: rib, front: rib });
    for (const sd of [-1, 1]) D.poly3(R.cam, [R.S3(o.z, x, h), R.S3(o.z, x + sd * 0.35, h + 0.3), R.S3(o.z, x + sd * 0.35, h + 0.05)], rib);
  }
  function crateObs(D, R, o) {
    const z0 = o.z - o.hd, z1 = o.z + o.hd, x0 = o.x - o.hw, x1 = o.x + o.hw, h = 1.9;
    boxS(D, R, z0, z1, x0, x1, 0, h, { top: '#d8a868', side: '#a87840', front: '#c08a50' });
    for (const y of [0.15, h - 0.3]) D.poly3(R.cam, [R.S3(z0 - 0.01, x0, y), R.S3(z0 - 0.01, x1, y), R.S3(z0 - 0.01, x1, y + 0.15), R.S3(z0 - 0.01, x0, y + 0.15)], '#8a5a2a', 1, [0, 0, -1]);
    D.poly3(R.cam, [R.S3(z0 - 0.01, x0 + 0.1, 0.3), R.S3(z0 - 0.01, x0 + 0.35, 0.3), R.S3(z0 - 0.01, x1 - 0.1, h - 0.3), R.S3(z0 - 0.01, x1 - 0.35, h - 0.3)], '#8a5a2a', 1, [0, 0, -1]);
    text3(D, R, R.S3(z0 - 0.02, o.x, h * 0.55), '易碎', 0.32, '#c8343a', { far: 40 });
  }
  function blocksObs(D, R, o) {                                    // a tower of alphabet blocks, each a letter
    const s = o.hw * 2 * 0.9, L = 'ABCKXYZ';
    for (let k = 0; k < 3; k++) {
      const dx = (k % 2 ? 0.12 : -0.1) * s, col = TOY[(Math.round(o.z) + k) % TOY.length];
      boxS(D, R, o.z - s / 2, o.z + s / 2, o.x - s / 2 + dx, o.x + s / 2 + dx, k * s, (k + 1) * s, { top: '#f4ece0', side: mixHex(col, '#000000', 0.15), front: col });
      text3(D, R, R.S3(o.z - s / 2 - 0.01, o.x + dx, k * s + s / 2), L[(Math.round(o.z) + k) % L.length], s * 0.6, '#ffffff', { far: 60 });
    }
  }

  // ---- the finish: 玩具店, where the toys go. Out through the gift box she is in the toy shop: its front straight ahead
  // (the name in rainbow letters, a striped awning, a window full of toys, a giant teddy by the door, balloons), shelves
  // stacked with what the factory made along both sides behind the stands (the finish shot looks across her at them)
  const SHOP = { z: FINISH + 62, hw: 15, h: 8 };
  const SHELVES = (() => {
    const r = rng(5150), out = [];
    for (const sd of [-1, 1]) for (let z = FINISH - 46; z < FINISH + 56; z += 7) {
      const items = [];
      for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 3; k++) items.push({ lv, dz: 1 + k * 1.8 + r() * 0.4, kind: ['box', 'box', 'teddy', 'robot', 'top', 'box'][(r() * 6) | 0], col: TOY[(r() * TOY.length) | 0] });
      out.push({ z, x: sd * 17, sd, items });
    }
    return out;
  })();
  function shelf(D, R, s) {                                        // a wooden shelf unit facing the course, four shelves of toys (only its
    // face towards the course: dozens of these round the finish; toys drawn as pictures only near, as blocks of their colour further off)
    const { cam, t } = R, k = R.W3(s.z, 0, 0)[2] - s.z, z0 = s.z + k, z1 = z0 + 6.4, y = gy(s.z + 6.4), X = R.wx(s.z, s.x), n = [-s.sd, 0, 0];
    const dist = Math.abs(s.z - R.zc), xb = X + s.sd * 1.2, near = dist < 18, face = (x, ya, yb, za, zb, col) => D.poly3(cam, [[x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za]], col, 1, n);
    face(xb, y, y + 7.2, z0, z1, '#b07a44');                       // (the back)
    if (dist > 45) { for (let lv = 0; lv < 4; lv++) { const yy = y + 0.45 + lv * 1.7; face(X + s.sd * 0.6, yy, yy + 1.1, z0 + 0.4, z1 - 0.4, s.items[lv * 3].col); } return; }   // (far off: a band of colour a shelf)
    for (const dz of [0, 6.4]) D.poly3(cam, [[X, y, z0 + dz], [xb, y, z0 + dz], [xb, y + 7.2, z0 + dz], [X, y + 7.2, z0 + dz]], '#8a5a30');   // (the ends)
    for (let lv = 0; lv <= 4; lv++) { const yy = y + 0.3 + lv * 1.7; D.poly3(cam, [[X, yy + 0.15, z0], [X, yy + 0.15, z1], [xb, yy + 0.15, z1], [xb, yy + 0.15, z0]], '#e0a868'); face(X, yy, yy + 0.15, z0, z1, '#c98a55'); }
    for (const it of s.items) {
      const zz = s.z + it.dz, yy = y + 0.45 + it.lv * 1.7, xf = X + s.sd * 0.05;
      if (it.kind === 'box' || !near) face(xf, yy, yy + (it.kind === 'box' ? 1.2 : 1), zz + k - 0.5, zz + k + 0.5, it.kind === 'teddy' ? '#b07a46' : it.kind === 'robot' ? '#3a7fe8' : it.col);
      else if (it.kind === 'teddy') R.billboard({ ...PIX.teddy, cs: 0.08 }, zz, s.x + s.sd * 0.5, yy - y);
      else if (it.kind === 'robot') R.billboard({ cs: 0.12, rows: PIX.robot[0], cols: PIX.robotCols }, zz, s.x + s.sd * 0.5, yy - y);
      else R.billboard({ cs: 0.13, rows: PIX.top[Math.floor(t * 4 + zz) % 2], cols: PIX.topCols }, zz, s.x + s.sd * 0.5, yy - y);
    }
  }
  function toyShop(D, R) {                                         // the shop front: rainbow name, awning, display window, door, a giant teddy, balloons
    const { cam, t } = R, z = R.W3(SHOP.z, 0, 0)[2], y = gy(SHOP.z), { hw, h } = SHOP, f = z - 0.02, g = D.ctx;   // (z: in the world, nearer than the course past the loop)
    D.box3(cam, -hw, hw, y, y + h, z, z + 4, { side: '#ffd0e4', rear: '#fff0f6', top: '#ffffff' });
    if (cam.C[2] > z) return;
    const q = (x0, y0, x1, y1, dz, col, a = 1) => D.poly3(cam, [[x0, y0, f - dz], [x1, y0, f - dz], [x1, y1, f - dz], [x0, y1, f - dz]], col, a);
    q(-hw + 1.2, y + 0.6, -2.4, y + 4.4, 0, '#5a3a6a'); q(-hw + 1.4, y + 0.8, -2.6, y + 4.2, 0.01, '#bfe8ff', 0.85);   // the display window
    [[-12, '#ff5a5a'], [-9.5, '#3a8fff'], [-7, '#ffd23f'], [-4.6, '#3fc76a']].forEach(([x, col], k) => D.box3(cam, x - 0.7, x + 0.7, y + 0.8, y + 1.8 + (k % 2) * 0.8, z - 1.2, z - 0.4, { side: col, rear: mixHex(col, '#ffffff', 0.3), top: mixHex(col, '#ffffff', 0.5) }));
    q(-1.6, y, 1.6, y + 3.6, 0, '#5a3a6a'); q(-1.4, y, 1.4, y + 3.4, 0.01, '#ffe08a');   // the door, warm light inside
    q(3.2, y + 0.6, hw - 1.2, y + 4.4, 0, '#5a3a6a'); q(3.4, y + 0.8, hw - 1.4, y + 4.2, 0.01, '#bfe8ff', 0.85);
    for (let k = 0; k < 12; k++) { const a = lerp(-hw - 0.4, hw + 0.4, k / 12), b = lerp(-hw - 0.4, hw + 0.4, (k + 1) / 12); D.poly3(cam, [[a, y + 4.6, z - 1.8], [b, y + 4.6, z - 1.8], [b, y + 5.4, z - 0.05], [a, y + 5.4, z - 0.05]], k % 2 ? '#ffffff' : '#ff4f7a'); }   // the awning
    const bands = ['#ff5a5a', '#ff8a2a', '#ffd23f', '#3fc76a', '#3a8fff', '#b46cff'], sy = y + 5.6, sh = 2.6;   // the name over it, on a rainbow board
    bands.forEach((col, k) => q(-hw + 1, sy + sh * k / 6, hw - 1, sy + sh * (k + 1) / 6, 0.03, col));
    D.print(cam, [-hw + 1, sy + sh, f - 0.05], [hw - 1, sy + sh, f - 0.05], [-hw + 1, sy, f - 0.05], '玩具店', { w: 2 * hw - 2, h: sh, color: '#ffffff', stroke: '#5a3a6a', fill: 0.85 });
    R.billboard({ ...PIX.teddy, cs: 0.55 }, SHOP.z - 3, 10.5, 0);   // a giant teddy by the door
    for (const [bx, by, col, ph] of [[-13.5, 7.5, '#ff5a5a', 0], [-12.6, 8.4, '#ffd23f', 1], [-14.3, 8.6, '#3a8fff', 2], [13.4, 8, '#3fc76a', 3], [14.2, 8.8, '#ff8ad0', 4]]) {   // bunches of balloons on strings
      const p = D.toCam(cam, [bx, y + by + 0.2 * Math.sin(t * 2 + ph), z - 0.6]), s0 = D.toCam(cam, [bx > 0 ? 12.6 : -12.6, y + 4.6, z - 0.6]);
      if (p[2] < 1 || s0[2] < 1) continue;
      const [sx, sy2] = D.scr(cam, p), [tx, ty] = D.scr(cam, s0), rr = cam.F / p[2] * 0.7;
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy2 + rr); g.lineTo(tx, ty); g.stroke();
      g.fillStyle = col; g.beginPath(); g.ellipse(sx, sy2, rr * 0.85, rr, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(sx - rr * 0.3, sy2 - rr * 0.35, rr * 0.22, 0, 7); g.fill();
    }
  }

  const GOAL_SIGN = 'GOAL 玩具店';                             // (on the finish arch: where the long way down arrives)
  const theme = {
    spray: ['#ffd23f', '#ff5a5a', '#3a8fff', '#3fc76a'], trail: '#8a90a6', ski: ['#3a8fff', '#9fd0ff', '#2457c0'],
    boost: { pad: '#ffd23f', glow: '#ff8a2a', arrow: '#ffffff' },
    kicker: { side: '#2f6fe0', top: '#ff7a1a', edge: '#ffffff' },
    // the hall's haze (whichever way up she is: round the loop the ceiling can be under her)
    sky(R) {
      const D = root.SkiDraw;
      theme.camZ = R.zc; theme.up = R.cam.u[1]; theme.side = R.cam.C[0] - R.wx(R.zc, 0); theme.sideK = R.cam.side || 0;
      D.rect(0, 0, D.W, D.H, FOG);
      if (theme.sideK > 0.01) retroSky(D, R, theme.sideK);
    },
    ground(R, za, zb, near) {
      const D = root.SkiDraw;
      if ((R.cam.side || 0) > 0.5) return;
      hall(D, R, za, zb, near);
      if (zone((za + zb) / 2) === 'pit') pitFloor(D, R, za, zb);
      if (za < L0 && zb >= L0) loopBase(D, R);
    },
    slice(R, za, zb, near) {
      const D = root.SkiDraw, cuts = [za, zb];
      if ((R.cam.side || 0) > 0.5 && !(za < TV[1] && zb > TV[0])) return;   // (seen from inside the television, only the game's world)
      for (const z of CUTS) if (z > za && z < zb) cuts.splice(cuts.length - 1, 0, z);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1], zn = zone((a + b) / 2);
        if (zn === 'hall') hallSlice(D, R, a, b, near);
        else if (zn === 'pit') pitSlice(D, R, a, b, near);
        else if (zn === 'tv') tvSlice(D, R, a, b, near);
        else trackSlice(D, R, a, b, near);
      }
      if (course.belts.some(b => b.z < zb && b.z + b.len > za)) belts(D, R, za, zb, near);
    },
    // trampolines: a round blue mat in a striped frame on little legs; the giant one star-spangled; the kicker up over the broken track
    ramp(R, r) {
      const D = root.SkiDraw, { cam, S3 } = R;
      if (r.k === 'kick') {
        const n = 4;
        for (let k = 0; k < n; k++) {
          const za = r.z + r.len * k / n, zb = r.z + r.len * (k + 1) / n, ya = r.rise * Math.pow(k / n, 1.4), yb = r.rise * Math.pow((k + 1) / n, 1.4);
          for (const sd of [-1, 1]) D.poly3(cam, [S3(za, sd * (r.hw + 0.3), 0), S3(zb, sd * (r.hw + 0.3), 0), S3(zb, sd * (r.hw + 0.3), yb + 0.7), S3(za, sd * (r.hw + 0.3), ya + 0.7)], '#2f6fe0');
          D.poly3(cam, [S3(za, -r.hw, ya), S3(za, r.hw, ya), S3(zb, r.hw, yb), S3(zb, -r.hw, yb)], k % 2 ? '#ff7a1a' : '#f47012');
          if (k % 2) D.poly3(cam, [S3(za + 0.2, -1.4, ya + 0.02), S3(zb, 0, yb + 0.02), S3(za + 0.2, 1.4, ya + 0.02), S3(za + 0.6, 0, (ya + yb) / 2 + 0.02)], '#ffffff');
        }
        D.poly3(cam, [S3(r.z + r.len, -r.hw, 0), S3(r.z + r.len, r.hw, 0), S3(r.z + r.len, r.hw, r.rise), S3(r.z + r.len, -r.hw, r.rise)], '#c85a0a');
        return true;
      }
      if (r.k !== 'tramp' && r.k !== 'mega' && r.k !== 'spring') return false;
      return true;                                               // (trampolines: see tramp(), added by the scenery)
    },
    scenery(R) {
      const D = root.SkiDraw, { add, lo, hi, zc, t, cam } = R;
      // the other mascots cheering on stands of toy blocks either side of the finish
      if (R.zc > FINISH - 160) root.SkiWorld.crowd(R, { z0: FINISH - 50, z1: FINISH + 25, stand: { top: '#ffd23f', top2: '#4fb0ff', face: '#ff4f7a' } });
      if (R.zc > FINISH - 150) {                                   // 玩具店: its front ahead, shelves of toys behind the stands
        add(SHOP.z + 2, () => toyShop(D, R), false, 0);
        for (const sh of SHELVES) if (Math.abs(sh.z - R.zc) < 70) add(sh.z + 3.2, () => shelf(D, R, sh), false, sh.x);
      }
      const ok = (z, d = 115) => z > lo && z < hi && Math.abs(z - zc) < d;
      const flat = cam.u[1] > 0.5;                                 // (flat pictures only while the view is upright)
      if ((cam.side || 0) > 0.5) {                                 // inside the television: the game's own scenery only
        for (const b of TVBG) if (b.z > lo && b.z < hi && Math.abs(b.z - R.sz) < 40) add(b.z, () => tvDeco(D, R, b), false, b.x);
        for (const r of course.ramps) if (r.k === 'spring' && Math.abs(r.z - R.sz) < 40) add(r.z - 0.05, () => spring(D, R, r), false, r.x, r);
        return;
      }
      if (zc < TV[0] + 4 && ok(TV[0], 125)) add(TV[0] - 0.5, () => tvSet(D, R));
      for (const c of SCENE.cols) if (ok(c.z, 120) && !inLoop(c.z)) for (const sd of [-1, 1]) add(c.z, () => { const k = fogK(R, c.z, sd * 30); const rm = ROOM[SEC(c.z)]; boxF(D, R, c.z - 0.8, c.z + 0.8, sd > 0 ? FLW - 1.6 : -FLW, sd > 0 ? FLW : -FLW + 1.6, 0, HH(c.z), { top: rm.trim, side: rm.trim, front: mixHex(rm.trim, '#ffffff', 0.25) }, k); }, false, sd * 33);
      for (const g of SCENE.gears) if (ok(g.z, 120)) add(g.z, () => gear(D, R, g), false, g.sd * 33);
      for (const s of SCENE.signs) if (ok(s.z, 120)) add(s.z, () => wallSign(D, R, s), false, s.sd * 33);
      for (const b of SCENE.belts) if (b.a < hi && b.b > lo) for (let z = Math.max(b.a, Math.floor(lo / 4) * 4); z < Math.min(b.b, hi); z += 4) { const za = z; if (Math.abs(za - zc) < 90) add(za + 2, () => sideBelt(D, R, b, za, Math.min(za + 4, b.b)), false, b.sd * b.x); }
      for (const a of SCENE.arms) if (ok(a.z, 90)) add(a.z, () => sideArm(D, R, a), false, a.sd * 12);
      for (const p of SCENE.piles) if (ok(p.z, 110)) add(p.z, () => pile(D, R, p), false, p.sd * p.x);
      for (const d of SCENE.doms) if (ok(d.z, 90)) add(d.z, () => domino(D, R, d), false, d.sd * (HW(d.z) + 3));
      for (const r of SCENE.rolls) if (ok(r.z, 100)) add(r.z, () => paperRoll(D, R, r), false, r.sd * 20);
      for (const tr of SCENE.tires) if (ok(tr.z, 100)) add(tr.z, () => tires(D, R, tr), false, tr.sd * (HW(tr.z) + 2));
      if (flat) {
        for (const ty of SCENE.toys) if (ok(ty.z, 115)) add(ty.z, () => bigToy(D, R, ty), false, ty.sd * ty.x);
        for (const b of SCENE.balloons) if (ok(b.z, 100)) add(b.z, () => balloon(D, R, b), false, b.x);
        for (const c of SCENE.crowd) if (ok(c.z, 70)) add(c.z, () => fan(D, R, c), false, c.sd * c.x);
      }
      for (const r of course.ramps) if ((r.k === 'tramp' || r.k === 'mega') && r.z + r.len > lo && r.z < hi) add(r.z - 0.05, () => tramp(D, R, r), false, r.x, r);
      for (const r of course.ramps) if (r.k === 'spring' && r.z + r.len > lo && r.z < hi) add(r.z - 0.05, () => spring(D, R, r), false, r.x, r);
      if (ok(FORK1[0], 120)) add(FORK1[0] - 0.5, () => sorterArch(D, R));
      if (zc > BOOTH[0] - 120 && zc < BOOTH[1]) for (let z = BOOTH[0]; z <= BOOTH[1]; z += 8) if (ok(z, 110)) add(z, () => boothFrame(D, R, z));
      if (zc > L0 - 130 && zc < L1 + 60) { add(L0 - 0.4, () => loopFrame(D, R), false, LOOP.shift / 2); add(L0 - 26, () => loopArch(D, R)); }
      if (ok(course.obstacles.find(o => o.k === 'gap').z, 120)) add(GAPZ + 1, () => gapEnds(D, R));
      if (ok(FINISH, 125)) add(FINISH + 3, () => giftArch(D, R, true));
    },
    // gates: a yellow gantry with a sign in the halls, bunting in the playroom, a chequered banner over the track; none round the loop
    gate(R, z, i, label) {
      const D = root.SkiDraw, { cam, P3 } = R, zn = zone(z);
      if (label === 'GOAL') { giftArch(D, R, false); return; }
      if (!label && (MED(z) > 0 || (z > SCREW[0] - 4 && z < SCREW[1] + 4) || nearTV(z) || Math.abs(z - (L0 + L1) / 2) < 80 || Math.abs(z - GAPZ - 15) < 30 || (z > MEGAZ - 6 && z < MEGAZ + B_MEGA.z + 4))) return;
      const h = HW(z) + 0.5;
      if (zn === 'pit' && !label) {                               // bunting across
        for (let k = 0; k < 14; k++) { const x0 = lerp(-h, h, k / 14), x1 = lerp(-h, h, (k + 1) / 14), sag = (u) => 10 - Math.sin(u * Math.PI) * 1.2; D.poly3(cam, [P3(z, x0, sag(k / 14)), P3(z, x1, sag((k + 1) / 14)), P3(z, (x0 + x1) / 2, sag((k + 0.5) / 14) - 0.9)], TOY[k % TOY.length]); }
        for (const sd of [-1, 1]) { const X = R.wx(z, sd * h); D.box3(cam, X - 0.12, X + 0.12, gy(z), gy(z) + 10.2, z - 0.12, z + 0.12, { side: '#ff7ab0', rear: '#ff9ec7', top: '#ffffff' }); }
        return;
      }
      const y1 = 6.6, track = zn === 'track';
      for (const sd of [-1, 1]) { const X = R.wx(z, sd * h); D.box3(cam, X - 0.25, X + 0.25, gy(z), gy(z) + y1 + 0.6, z - 0.25, z + 0.25, { side: track ? '#2457c0' : '#e8a91a', rear: track ? '#2f6fe0' : '#ffcf3a', top: '#ffffff' }); }
      if (track) {                                                // a chequered banner
        const n = Math.round(h * 2.4);
        for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) D.poly3(cam, [P3(z, lerp(-h, h, k / n), y1 - r * 0.5), P3(z, lerp(-h, h, (k + 1) / n), y1 - r * 0.5), P3(z, lerp(-h, h, (k + 1) / n), y1 + 0.5 - r * 0.5), P3(z, lerp(-h, h, k / n), y1 + 0.5 - r * 0.5)], (k + r) % 2 ? '#ffffff' : '#1a1a1a');
        if (label) D.print(cam, P3(z - 0.05, -h, y1 + 2.0), P3(z - 0.05, h, y1 + 2.0), P3(z - 0.05, -h, y1 + 0.9), label, { w: 2 * h, h: 1.1, stroke: '#d4501a', fill: 0.95 });   // (over the flags, in the gate's own plane)
        return;
      }
      const f = D.poly3(cam, [P3(z, -h, y1 - 0.9), P3(z, h, y1 - 0.9), P3(z, h, y1 + 0.6), P3(z, -h, y1 + 0.6)], label ? D.C.orange : '#2a2d36');
      if (!label) stripes(D, R, z - 0.01, -h, h, y1 + 0.35, y1 + 0.6, '#ffcf3a', '#2a2d36', Math.round(h * 3));
      if (f) { const top = label ? y1 + 0.6 : y1 + 0.35; D.print(cam, P3(z - 0.05, -h, top), P3(z - 0.05, h, top), P3(z - 0.05, -h, y1 - 0.9), label || ['生產線', '品管', '組裝', '好玩', '出貨', '加油'][i % 6], { w: 2 * h, h: top - y1 + 0.9, color: label ? '#ffffff' : '#ffcf3a' }); }   // (printed on the banner)
    },
    obstacle(R, o, i) {
      const D = root.SkiDraw, { cam, S3, P3 } = R;
      switch (o.k) {
        case 'teddy': R.billboard({ ...PIX.teddy, cs: 0.17 }, o.z, o.x, 0); break;
        case 'divider': dividerObs(D, R, o); break;
        case 'press': pressObs(D, R, o); break;
        case 'crusher': if (o.stamp.near) hungCrusher(D, R, o); else pressObs(D, R, o); break;
        case 'walker': {                                            // a wind-up robot walking at her; stomped flat, it squashes, then is gone
          const z = obZ(o, R.sz), sq = R.squash && R.squash.has(o);
          if (sq) { if (!SQ.has(o)) SQ.set(o, R.t); const a = R.t - SQ.get(o); if (a < 0.5) R.billboard({ cs: 0.13, rows: PIX.walker[0], cols: PIX.walkerCols }, z, o.x, 0, 1 - a * 2, 1.4); break; }
          SQ.delete(o);
          R.billboard({ cs: 0.13, rows: PIX.walker[Math.floor(R.t * 6) % 2], cols: PIX.walkerCols }, z, o.x, 0);
          break;
        }
        case 'spikes': R.billboard(PIX.spikes, o.z, o.x, 0); break;
        case 'beam': hangPipe(D, R, o); break;
        case 'rc': rcCar(D, R, o); break;
        case 'gift': giftBox(D, R, o, o.x); break;
        case 'crate': crateObs(D, R, o); break;
        case 'blocks': blocksObs(D, R, o); break;
        case 'duck': R.billboard(PIX.duck, o.z, o.x, 0); break;
        case 'robot': R.billboard({ cs: 0.11, rows: PIX.robot[Math.floor(R.t * 5) % 2], cols: PIX.robotCols }, o.z, obX(o, R.rt), 0); break;
        case 'soldier': R.billboard({ cs: 0.14, rows: PIX.soldier[Math.floor(R.t * 4) % 2], cols: PIX.soldierCols }, o.z, obX(o, R.rt), 0); break;
        case 'top': R.billboard({ cs: 0.13, rows: PIX.top[Math.floor(R.t * 12) % 2], cols: PIX.topCols }, o.z, obX(o, R.rt), 0, 1, 1 - 0.15 * Math.abs(Math.sin(R.t * 9))); break;
        case 'marble': {                                            // a big glass marble, a swirl inside
          const p = ball3(D, R, S3(o.z, obX(o, R.rt), 0.6), 0.6, 'rgba(120,200,255,0.75)');
          if (p) { const [sx, sy, rr] = p, g = D.ctx; g.save(); g.translate(sx, sy); g.rotate(-obX(o, R.rt) * 1.6); g.fillStyle = TOY[i % TOY.length]; g.beginPath(); g.ellipse(0, 0, rr * 0.7, rr * 0.25, 0.4, 0, 7); g.fill(); g.restore(); }
          break;
        }
        case 'tape': {                                              // a roll of tape rolling: a ring
          const q = D.toCam(cam, S3(o.z, obX(o, R.rt), 0.75));
          if (q[2] < 0.8) break;
          const [sx, sy] = D.scr(cam, q), rr = cam.F / q[2] * 0.75, g = D.ctx;
          g.save(); g.translate(sx, sy); g.scale(0.55, 1);
          g.fillStyle = '#c8a46a'; g.beginPath(); g.arc(0, 0, rr, 0, 7); g.fill();
          g.fillStyle = '#e8d2a0'; g.beginPath(); g.arc(0, 0, rr * 0.8, 0, 7); g.fill();
          g.fillStyle = '#7a5a3a'; g.beginPath(); g.arc(0, 0, rr * 0.45, 0, 7); g.fill();
          g.restore();
          break;
        }
        case 'jack': {                                              // a jack-in-the-box: pops open as she comes, the clown boinging on its spring
          const s = 0.75, u = seg(R.sz, o.z - 26, o.z - 22);
          boxS(D, R, o.z - s, o.z + s, o.x - s, o.x + s, 0, 1.4, { top: '#ffd23f', side: '#3a8fff', front: '#ff5a5a' });
          text3(D, R, S3(o.z - s - 0.02, o.x, 0.7), '?', 0.8, '#ffffff', { far: 50 });
          if (u > 0) {
            const bob = u < 1 ? E3(u) : 1 + Math.sin(R.t * 9) * 0.08, top = 1.4 + 1.3 * bob;
            for (let k = 0; k < 6; k++) { const y0 = 1.4 + (top - 1.4) * k / 6, y1 = 1.4 + (top - 1.4) * (k + 1) / 6; D.poly3(cam, [S3(o.z, o.x + (k % 2 ? -0.3 : 0.3), y0), S3(o.z, o.x + (k % 2 ? 0.3 : -0.3), y1), S3(o.z, o.x + (k % 2 ? 0.3 : -0.3), y1 + 0.08), S3(o.z, o.x + (k % 2 ? -0.3 : 0.3), y0 + 0.08)], '#9aa3b4'); }
            R.billboard(PIX.clown, o.z, o.x, top - 0.1);
            D.poly3(cam, [S3(o.z + s, o.x - s, 1.4), S3(o.z + s, o.x + s, 1.4), S3(o.z + s + 0.3, o.x + s, 2.8), S3(o.z + s + 0.3, o.x - s, 2.8)], '#ffd23f');   // the lid flung back
          } else boxS(D, R, o.z - s - 0.05, o.z + s + 0.05, o.x - s - 0.05, o.x + s + 0.05, 1.4, 1.55, { top: '#ffd23f', side: '#e8a91a', front: '#e8a91a' });
          break;
        }
        case 'sorter': {                                            // the nose of the sorting machine: red one way, blue the other
          boxS(D, R, o.z - o.hd, o.z + o.hd + 3, o.x - o.hw, o.x + o.hw, 0, 1.6, { top: '#5a6070', side: '#6c7486', front: '#8a93a6' });
          D.poly3(cam, [S3(o.z - o.hd - 0.01, -1.2, 0.5), S3(o.z - o.hd - 0.01, -0.2, 0.2), S3(o.z - o.hd - 0.01, -0.2, 0.8)], '#ff3a3a', 1, [0, 0, -1]);
          D.poly3(cam, [S3(o.z - o.hd - 0.01, 1.2, 0.5), S3(o.z - o.hd - 0.01, 0.2, 0.2), S3(o.z - o.hd - 0.01, 0.2, 0.8)], '#3a8fff', 1, [0, 0, -1]);
          glowDot(D, R, S3(o.z - o.hd, 0, 1.8), 0.2, '#ffb020', Math.floor(R.t * 3) % 2 ? 1 : 0.25);
          break;
        }
        case 'arm': {                                               // a robot arm swung right across at chest height, a teddy in its claw
          const h = o.hw, y = (o.y0 + o.y1) / 2, sw = Math.sin(R.t * 2 + o.z) * 0.15;
          boxS(D, R, o.z - 0.6, o.z + 0.6, -h - 0.9, -h + 0.1, 0, y + 0.8, { top: '#ffcf3a', side: '#e8a91a', front: '#ffd23f' });
          boxS(D, R, o.z - 0.3 + sw, o.z + 0.3 + sw, -h, h - 1, o.y0 + 0.1, o.y0 + 0.6, { top: '#ffd23f', side: '#e8a91a', front: '#ffcf3a' });
          boxS(D, R, o.z - 0.35 + sw, o.z + 0.35 + sw, h - 1.4, h - 0.6, o.y0 - 0.1, o.y0 + 0.8, { top: '#5a6070', side: '#4a5060', front: '#6c7486' });
          stripes(D, R, o.z - 0.31 + sw, -h, h - 1, o.y0 + 0.1, o.y0 + 0.2, '#2a2d36', '#ffcf3a', 10);
          R.billboard({ ...PIX.teddy, cs: 0.07 }, o.z + sw, h - 1, o.y0 - 0.95, 1, 1);
          for (const x of [-2, 2]) crouch(D, R, o, x);
          break;
        }
        case 'ribbon': {                                            // a broad ribbon hung across, a bow in the middle
          const h = o.hw, P = (x, y) => P3(o.z, x, y), col = TOY[i % TOY.length];
          for (const x of [-h, h]) D.poly3(cam, [P(x - 0.08, 0), P(x + 0.08, 0), P(x + 0.08, o.y1 + 0.5), P(x - 0.08, o.y1 + 0.5)], '#9aa3b4');
          for (let k = 0; k < 10; k++) { const x0 = lerp(-h, h, k / 10), x1 = lerp(-h, h, (k + 1) / 10), s0 = Math.sin(k / 10 * Math.PI) * 0.25, s1 = Math.sin((k + 1) / 10 * Math.PI) * 0.25; D.poly3(cam, [P(x0, o.y0 + 0.1 - s0), P(x1, o.y0 + 0.1 - s1), P(x1, o.y0 + 0.75 - s1), P(x0, o.y0 + 0.75 - s0)], col); }
          for (const sd of [-1, 1]) D.poly3(cam, [P(0, o.y0 + 0.2), P(sd * 1.1, o.y0 + 0.9), P(sd * 1.1, o.y0 - 0.2)], mixHex(col, '#000000', 0.15));
          D.poly3(cam, [P(-0.25, o.y0 + 0.1), P(0.25, o.y0 + 0.1), P(0.25, o.y0 + 0.6), P(-0.25, o.y0 + 0.6)], mixHex(col, '#ffffff', 0.3));
          for (const x of [-h + 1.5, h - 1.5]) crouch(D, R, o, x);
          break;
        }
      }
    },
    // the paint booth: a coloured haze; up on the catwalk: none
    weather({ t }) {
      const D = root.SkiDraw, z = theme.camZ;
      if (z > BOOTH[0] - 4 && z < BOOTH[1] && theme.side > 0) D.rect(0, 0, D.W, D.H, TOY[Math.floor(t * 1.5) % TOY.length], 0.06);
      if (theme.sideK > 0.3) crt(D, clamp((theme.sideK - 0.3) / 0.5), t);
      if (course.odAt(z + 6)) {                                   // wound right up: the edges of the picture glow gold, pulsing
        const g = D.ctx, p = 0.5 + 0.5 * Math.sin(t * 14);
        for (const [x0, x1] of [[0, D.W * 0.14], [D.W, D.W * 0.86]]) { const gg = g.createLinearGradient(x0, 0, x1, 0); gg.addColorStop(0, `rgba(255,210,63,${0.45 + 0.25 * p})`); gg.addColorStop(1, 'rgba(255,210,63,0)'); g.fillStyle = gg; g.fillRect(Math.min(x0, x1), 0, D.W * 0.14, D.H); }
      }
    },
    // map-screen card: the hall, a conveyor of presents, the orange loop, a teddy
    badge(g, x, y, w, h, t = 0) {
      const Rr = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      Rr(0, 0, 1, 1, '#ddd2f2'); Rr(0, 0, 1, 0.1, '#b3a5d6');
      for (const a of [0.08, 0.36, 0.64]) Rr(a, 0.16, 0.2, 0.3, '#bfe6ff');
      Rr(0, 0.62, 1, 0.38, '#9298b2'); Rr(0, 0.7, 1, 0.12, '#3b3f4d');
      for (let k = 0; k < 5; k++) { const a = ((k * 0.24 + t * 0.05) % 1.2) - 0.1; Rr(a, 0.6, 0.1, 0.1, TOY[k % TOY.length]); Rr(a + 0.04, 0.6, 0.02, 0.1, '#ffffff'); }
      g.strokeStyle = '#ff7a1a'; g.lineWidth = Math.max(4, h * 0.06); g.beginPath(); g.arc(x + 0.72 * w, y + 0.36 * h, 0.22 * h, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#b07a46'; g.beginPath(); g.arc(x + 0.2 * w, y + 0.5 * h, 0.1 * h, 0, 7); g.fill(); g.beginPath(); g.arc(x + 0.2 * w, y + 0.36 * h, 0.07 * h, 0, 7); g.fill();
      g.fillStyle = '#e8c79a'; g.beginPath(); g.arc(x + 0.2 * w, y + 0.52 * h, 0.05 * h, 0, 7); g.fill();
    },
  };
  function tramp(D, R, r) {                                       // a trampoline: a round blue mat in a striped frame on little legs (the giant one star-spangled)
    const { cam, S3 } = R, zc = r.z + r.len / 2, a = r.len / 2, b = r.hw * 0.96, y = r.rise, mega = r.k === 'mega', N = 16;
    const E = (f, up) => { const p = []; for (let k = 0; k < N; k++) { const an = k / N * Math.PI * 2; p.push(S3(zc + Math.cos(an) * a * f, r.x + Math.sin(an) * b * f, up)); } return p; };
    for (const an of [0.6, 2.5, 3.8, 5.7]) D.poly3(cam, [S3(zc + Math.cos(an) * a * 0.9, r.x + Math.sin(an) * b * 0.9 - 0.06, -0.6), S3(zc + Math.cos(an) * a * 0.9, r.x + Math.sin(an) * b * 0.9 + 0.06, -0.6), S3(zc + Math.cos(an) * a * 0.9, r.x + Math.sin(an) * b * 0.9 + 0.06, y), S3(zc + Math.cos(an) * a * 0.9, r.x + Math.sin(an) * b * 0.9 - 0.06, y)], '#2a2d36');
    const ring = E(1, y), inner = E(0.78, y + 0.01);
    for (let k = 0; k < N; k++) D.poly3(cam, [ring[k], ring[(k + 1) % N], inner[(k + 1) % N], inner[k]], k % 2 ? '#ffd23f' : mega ? '#b46cff' : '#ff5a5a');
    // the mat, pressed down where she stands on it (never under her feet)
    const on = Math.abs(R.sz - zc) < a + 0.6 && Math.abs(R.sx - r.x) <= r.hw, feet = R.sy - R.CO.surf(R.sz, R.sx), dip = on ? clamp(y - feet, 0, 0.6) : 0;
    if (dip > 0.01) {
      const cz = clamp(R.sz, zc - a * 0.6, zc + a * 0.6), cx = clamp(R.sx, r.x - b * 0.6, r.x + b * 0.6), c0 = S3(cz, cx, y - dip);
      for (let k = 0; k < N; k++) D.poly3(cam, [c0, inner[k], inner[(k + 1) % N]], k % 2 ? (mega ? '#33297a' : '#2a63d0') : (mega ? '#3a2f8a' : '#2f6fe0'));
    } else D.poly3(cam, E(0.78, y + 0.005), mega ? '#3a2f8a' : '#2f6fe0');
    if (dip <= 0.01 && mega) for (let k = 0; k < 5; k++) { const an = k / 5 * Math.PI * 2, an2 = an + Math.PI / 5; D.poly3(cam, [S3(zc, r.x, y + 0.02), S3(zc + Math.cos(an) * a * 0.6, r.x + Math.sin(an) * b * 0.6, y + 0.02), S3(zc + Math.cos(an2) * a * 0.25, r.x + Math.sin(an2) * b * 0.25, y + 0.02)], '#ffd23f'); }
    else if (dip <= 0.01) D.poly3(cam, E(0.3, y + 0.02), '#7fc8ff');
  }
  // inside the television, the screen itself: scan lines, a little roll of brightness, a rounded dark bezel round the edge
  let SCAN = null;
  function crt(D, k, t) {
    const g = D.ctx, W = D.W, H = D.H;
    if (!SCAN && typeof document !== 'undefined') {             // the scan lines, made once and tiled
      SCAN = document.createElement('canvas'); SCAN.width = 4; SCAN.height = 4;
      const c = SCAN.getContext('2d'); c.fillStyle = 'rgba(0,0,30,0.16)'; c.fillRect(0, 0, 4, 1); c.fillStyle = 'rgba(0,0,30,0.07)'; c.fillRect(0, 2, 4, 1);
    }
    g.save(); g.globalAlpha = k;
    if (SCAN) { g.fillStyle = g.createPattern(SCAN, 'repeat'); g.fillRect(0, 0, W, H); }
    const ry = ((t * 0.25) % 1.3 - 0.15) * H;                     // a band of brightness rolling down
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, ry, W, H * 0.12);
    const b = Math.round(Math.min(W, H) * 0.035), rr = b * 3;   // the bezel
    g.fillStyle = '#16161c'; g.beginPath(); g.rect(0, 0, W, H); g.roundRect(b, b, W - 2 * b, H - 2 * b, rr); g.fill('evenodd');
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.beginPath(); g.roundRect(b, b, W - 2 * b, H - 2 * b, rr); g.stroke();
    g.restore();
  }
  const SQ = new Map();                                            // walkers stomped flat: when (for their squash)
  // ---- inside the television: an old 2D video game
  // its far background, in screen space: a bright sky, rows of pixel hills and clouds drifting by
  function retroSky(D, R, k) {
    const W = D.W, H = D.H, g = D.ctx, scroll = R.sz * 6, q = D.toCam(R.cam, R.P3(clamp(R.sz, TV[0], TV[1]), 0, 0));
    const base = q[2] > 1 ? clamp(D.scr(R.cam, q)[1] / H + 0.02, 0.4, 0.95) : 0.7;   // (the hills stand on the game's ground, wherever it is on the screen)
    g.globalAlpha = k;
    D.rect(0, 0, W, H, '#5cb6ff');
    D.rect(0, H * 0.55, W, H * 0.45, '#7cc8ff');
    D.clouds(R.t, 77, 6, H * 0.3, 1, -scroll * 0.15);
    for (const [y, col, sp, hh] of [[base - 0.06, '#4aa84a', 0.25, 0.16], [base, '#3a8f3a', 0.45, 0.12]]) {   // hills, two layers, stepped like pixels
      g.fillStyle = col;
      for (let x = -((scroll * sp) % 240) - 240; x < W + 240; x += 240) {
        const b = H * y, top = H * (y - hh), steps = 6;
        for (let s2 = 0; s2 < steps; s2++) { const w = 240 * (1 - s2 / steps), h2 = (b - top) / steps; g.fillRect(Math.round(x + (240 - w) / 2), Math.round(b - (s2 + 1) * h2), Math.round(w), Math.ceil(h2) + 1); }
      }
      g.fillRect(0, H * y, W, H * (1 - y));
    }
    D.rect(0, H * (base + 0.03), W, H, '#1a2a4a', k);              // (and far below the ground, down a chasm: darkness)
    g.globalAlpha = 1;
  }
  // the ground of the game world: blocks of bricks with grass on top, seen side on (gone where there is a chasm)
  const CHASMS = course.obstacles.filter(o => o.k === 'chasm');
  function tvSlice(D, R, za, zb, near) {
    const { cam, S3 } = R, cuts = [za, zb];
    const ext = o => o.vis || [o.z - o.hd, o.z + o.hd];
    for (const o of CHASMS) for (const e of ext(o)) if (e > za && e < zb) cuts.push(e);
    cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2;
      if (CHASMS.some(o => m > ext(o)[0] && m < ext(o)[1])) continue;
      const h = HW(m), n = [1, 0, 0];
      D.poly3(cam, [S3(a, -h, 0), S3(a, h, 0), S3(b, h, 0), S3(b, -h, 0)], '#5ad25a');
      D.poly3(cam, [S3(a, h, -40), S3(b, h, -40), S3(b, h, -0.5), S3(a, h, -0.5)], '#c8642a', 1, n);
      D.poly3(cam, [S3(a, h + 0.01, -0.5), S3(b, h + 0.01, -0.5), S3(b, h + 0.01, 0), S3(a, h + 0.01, 0)], '#3cb043', 1, n);
      D.poly3(cam, [S3(a, h + 0.02, -0.12), S3(b, h + 0.02, -0.12), S3(b, h + 0.02, 0), S3(a, h + 0.02, 0)], '#8af08a', 1, n);
      if (!near) continue;
      for (let y = -1.5; y > -16; y -= 1) {                       // mortar lines, the bricks staggered row by row
        D.poly3(cam, [S3(a, h + 0.02, y - 0.06), S3(b, h + 0.02, y - 0.06), S3(b, h + 0.02, y + 0.06), S3(a, h + 0.02, y + 0.06)], '#7a3a1a', 1, n);
        const off = Math.round(-y) % 2 ? 1 : 0;
        for (let z = Math.ceil((a - off) / 2) * 2 + off; z < b; z += 2) D.poly3(cam, [S3(z - 0.06, h + 0.02, y), S3(z + 0.06, h + 0.02, y), S3(z + 0.06, h + 0.02, y + 1), S3(z - 0.06, h + 0.02, y + 1)], '#7a3a1a', 1, n);
      }
    }
  }
  // what stands about in the game world (behind her, never in her way): bushes, floating rows of blocks, a castle at the end
  const TVBG = (() => {
    const r = rng(2468), out = [];
    for (let z = TV[0] + 6; z < TV[1]; z += 9 + r() * 10) out.push({ z, x: -1.6, k: r() < 0.5 ? 'bush' : 'blocks', n: 2 + ((r() * 4) | 0), y: 3.2 + ((r() * 3) | 0) * 0.9 });
    return out;
  })();
  function tvDeco(D, R, b) {
    if (b.k === 'bush') { R.billboard(PIX.bush, b.z, b.x, 0); return; }
    for (let i = 0; i < b.n; i++) {                             // a row of blocks in the air: bricks, and a lit one with a star
      const z0 = b.z + i * 1.1, lit = i === (b.n >> 1);
      boxS(D, R, z0, z0 + 1, b.x - 0.5, b.x + 0.5, b.y, b.y + 1, lit ? { top: '#ffe08a', side: '#e8a91a', front: '#ffcf3a', back: '#ffcf3a' } : { top: '#e88a4a', side: '#a84a1a', front: '#c8642a', back: '#c8642a' });
      if (lit) text3(R.SkiDraw || root.SkiDraw, R, R.S3(z0 + 0.5, b.x + 0.52, b.y + 0.5), '★', 0.7, '#ffffff', { far: 60 });
    }
  }
  function spring(D, R, r) {                                        // a big spring: a coil under a red pad, squashed as she lands on it
    const { cam, S3 } = R, zc = r.z + r.len / 2, on = Math.abs(R.sz - zc) < r.len, sq = on ? clamp(1 - (R.sy - R.CO.surf(R.sz, 0)) / 1.2, 0, 0.6) : 0, top = 0.9 * (1 - sq * 0.6);
    for (let k = 0; k < 5; k++) { const y0 = top * k / 5, y1 = top * (k + 1) / 5, d = k % 2 ? 1 : -1; D.poly3(cam, [S3(zc - 0.9 * d, r.x - 1.6, y0), S3(zc + 0.9 * d, r.x - 1.6, y1), S3(zc + 0.9 * d, r.x + 1.6, y1 + 0.08), S3(zc - 0.9 * d, r.x + 1.6, y0 + 0.08)], '#c9ced9'); }
    boxS(D, R, zc - 1.1, zc + 1.1, r.x - 1.8, r.x + 1.8, top, top + 0.3, { top: '#ff5a5a', side: '#c8343a', front: '#e8444a', back: '#e8444a' });
  }
  // the giant television she rides into: a wooden cabinet, the screen showing the game, knobs, an aerial
  function tvSet(D, R) {
    const z = TV[0], { cam, P3 } = R, base = -1.5, X = 13, Y = 15, sx = 9, sy0 = 0, sy1 = 11;
    const P = (x, y, zz = z) => P3(zz, x, y);
    D.poly3(cam, [P(-X, base), P(X, base), P(X, Y), P(-X, Y)], '#8a5a2a', 1, [0, 0, -1]);
    D.poly3(cam, [P(-X, Y), P(X, Y), P(X, Y, z + 9), P(-X, Y, z + 9)], '#a87040');
    for (const sd of [-1, 1]) D.poly3(cam, [P(sd * X, base), P(sd * X, base, z + 9), P(sd * X, Y, z + 9), P(sd * X, Y)], '#6a4220', 1, [sd, 0, 0]);
    D.poly3(cam, [P(-sx - 0.8, sy0 - 0.8, z - 0.02), P(sx + 0.8, sy0 - 0.8, z - 0.02), P(sx + 0.8, sy1 + 0.8, z - 0.02), P(-sx - 0.8, sy1 + 0.8, z - 0.02)], '#2a2a2a', 1, [0, 0, -1]);
    const near = R.sz > z - 30, flick = Math.floor(R.t * 12) % 3;   // the screen: the game, flickering with static as she gets close
    D.poly3(cam, [P(-sx, sy0, z - 0.03), P(sx, sy0, z - 0.03), P(sx, sy1, z - 0.03), P(-sx, sy1, z - 0.03)], near && flick === 0 ? '#c8d0dc' : '#5cb6ff', 1, [0, 0, -1]);
    D.poly3(cam, [P(-sx, sy0, z - 0.04), P(sx, sy0, z - 0.04), P(sx, sy0 + 2.4, z - 0.04), P(-sx, sy0 + 2.4, z - 0.04)], '#c8642a', 1, [0, 0, -1]);
    D.poly3(cam, [P(-sx, sy0 + 2.4, z - 0.05), P(sx, sy0 + 2.4, z - 0.05), P(sx, sy0 + 2.9, z - 0.05), P(-sx, sy0 + 2.9, z - 0.05)], '#3cb043', 1, [0, 0, -1]);
    for (let k = 0; k < 3; k++) D.poly3(cam, [P(-6 + k * 2.2, 6, z - 0.05), P(-4.8 + k * 2.2, 6, z - 0.05), P(-4.8 + k * 2.2, 7.2, z - 0.05), P(-6 + k * 2.2, 7.2, z - 0.05)], k === 1 ? '#ffcf3a' : '#e88a4a', 1, [0, 0, -1]);
    if (near) for (let k = 0; k < 14; k++) { const y = (k * 0.8 + R.t * 9) % 11; D.poly3(cam, [P(-sx, y, z - 0.06), P(sx, y, z - 0.06), P(sx, y + 0.12, z - 0.06), P(-sx, y + 0.12, z - 0.06)], '#ffffff', 0.25, [0, 0, -1]); }   // scan lines rolling
    for (const [x, y, c] of [[11, 9, '#e8d0a0'], [11, 5.5, '#e8d0a0'], [11, 2, '#2a2a2a']]) { const q = D.toCam(cam, P(x, y, z - 0.05)); if (q[2] > 1) { const [qx, qy] = D.scr(cam, q), rr = cam.F / q[2] * 0.8; D.ctx.fillStyle = c; D.ctx.beginPath(); D.ctx.arc(qx, qy, rr, 0, 7); D.ctx.fill(); } }
    for (const sd of [-1, 1]) D.poly3(cam, [P(sd * 0.3, Y, z + 4), P(sd * 0.6, Y, z + 4), P(sd * 7, Y + 9, z + 4), P(sd * 6.7, Y + 9, z + 4)], '#9aa3b4');
    text3(D, R, P(0, 13.3, z - 0.05), '玩具牌 TV', 1.0, '#ffe08a', { far: 125 });
  }
  const E3 = u => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);   // overshoot, like a spring

  // ---- scenery pieces
  function gear(D, R, g) {                                          // a big gear turning on the wall
    const k = fogK(R, g.z, g.sd * 30), X = g.sd * (FLW - 0.05), n = 10, a0 = R.t * g.sp, pts = [];
    for (let i = 0; i < n * 2; i++) { const an = a0 + i / (n * 2) * Math.PI * 2, rr = g.rad * (i % 2 ? 0.82 : 1); pts.push(FL(R, g.z + Math.cos(an) * rr, X, g.y + Math.sin(an) * rr)); }
    D.poly3(R.cam, pts, fog(g.col, k));
    const hub = []; for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; hub.push(FL(R, g.z + Math.cos(an) * g.rad * 0.3, X - g.sd * 0.02, g.y + Math.sin(an) * g.rad * 0.3)); }
    D.poly3(R.cam, hub, fog('#4a4f5c', k));
  }
  function wallSign(D, R, s) {                                      // a big board on the wall with the room's name
    const k = fogK(R, s.z, s.sd * 30), X = s.sd * (FLW - 0.08), F = (z, y) => FL(R, z, X, y);
    D.poly3(R.cam, [F(s.z - 6, 4), F(s.z + 6, 4), F(s.z + 6, 7), F(s.z - 6, 7)], fog('#2a2d36', k));
    D.poly3(R.cam, [F(s.z - 6, 3.8), F(s.z + 6, 3.8), F(s.z + 6, 4.05), F(s.z - 6, 4.05)], fog('#ffcf3a', k));
    text3(D, R, FL(R, s.z, X - s.sd * 0.1, 5.5), s.t, 2.0, '#ffcf3a', { far: 120 });
  }
  function sideBelt(D, R, b, za, zb) {                               // an assembly line along the hall, toys riding it
    const { cam, t } = R, X = b.sd * b.x, k = fogK(R, za, X), c = v => fog(v, k), F = (z, x, y) => FL(R, z, x, y);
    D.poly3(cam, [F(za, X - 1.4, 1.2), F(za, X + 1.4, 1.2), F(zb, X + 1.4, 1.2), F(zb, X - 1.4, 1.2)], c('#3b3f4d'));
    D.poly3(cam, [F(za, X - b.sd * 1.4, 0), F(zb, X - b.sd * 1.4, 0), F(zb, X - b.sd * 1.4, 1.2), F(za, X - b.sd * 1.4, 1.2)], c('#8a93a6'));
    const sp = 5, ph = (t * 3) % sp;                            // boxes and teddies riding along
    for (let z = Math.floor(za / sp) * sp + ph; z < zb; z += sp) {
      if (z < za) continue;
      const i = Math.floor((z - ph) / sp + 100), col = TOY[i % TOY.length];
      if (i % 3 === 2 && k < 0.6 && theme.up > 0.5) R.billboard({ ...PIX.teddy, cs: 0.07, shadow: false }, z, X + HX(z), gy(z) - FD(z) + 1.2 - R.CO.surf(z, X + HX(z)));
      else boxF(D, R, z - 0.5, z + 0.5, X - 0.5, X + 0.5, 1.2, 2.1, { top: mixHex(col, '#ffffff', 0.2), side: mixHex(col, '#000000', 0.15), front: col }, k);
    }
  }
  function sideArm(D, R, a) {                                        // a robot arm beside the line, nodding as it works
    const k = fogK(R, a.z, a.sd * 12), X = a.sd * 12, sw = Math.sin(R.t * 2.2 + a.z) * 0.5, c = v => fog(v, k), F = (z, x, y) => FL(R, z, x, y);
    boxF(D, R, a.z - 0.8, a.z + 0.8, X - 0.8, X + 0.8, 0, 0.8, { top: '#4a5060', side: '#3a4050', front: '#4a5060' }, k);
    D.poly3(R.cam, [F(a.z, X - 0.25, 0.8), F(a.z, X + 0.25, 0.8), F(a.z + sw, X + 0.25, 4), F(a.z + sw, X - 0.25, 4)], c('#ffcf3a'));
    D.poly3(R.cam, [F(a.z + sw, X - 0.2, 4), F(a.z + sw, X + 0.2, 4), F(a.z + sw * 1.6, X + a.sd * 2.6 + 0.2, 2.6), F(a.z + sw * 1.6, X + a.sd * 2.6 - 0.2, 2.6)], c('#ffd23f'));
    glowDot(D, R, F(a.z + sw, X, 4), 0.2, '#ff8a2a', 0.5 * (1 - k));
  }
  function pile(D, R, p) {                                           // boxes stacked against the wall
    const k = fogK(R, p.z, p.sd * p.x), X = p.sd * p.x;
    for (let i = 0; i < p.n; i++) boxF(D, R, p.z - 1.2 + (i % 2) * 0.3, p.z + 1.2 + (i % 2) * 0.3, X - 1.2, X + 1.2, i * 2.2, (i + 1) * 2.2, { top: mixHex(p.col, '#ffffff', 0.2), side: mixHex(p.col, '#000000', 0.2), front: p.col }, k);
  }
  function domino(D, R, d) {                                         // giant dominoes beside the line, toppling one after another as she passes
    const X = d.sd * (HW(d.z) + 3.2), u = smooth(seg(R.sz, d.z - 10, d.z - 6)), an = u * 1.2, h = 3.2, w = 0.4;
    const F = (z, x, y) => R.W3(z, x, gy(z) + y), c = Math.cos(an), s = Math.sin(an);
    const P = (dz, dx, dy) => F(d.z + dz * c + dy * s, X + dx, dy * c - dz * s);
    const fr = [P(-w / 2, -1, 0), P(-w / 2, 1, 0), P(-w / 2, 1, h), P(-w / 2, -1, h)], bk = [P(w / 2, -1, 0), P(w / 2, 1, 0), P(w / 2, 1, h), P(w / 2, -1, h)];
    D.poly3(R.cam, [bk[3], bk[2], fr[2], fr[3]], '#f4ece0');
    D.poly3(R.cam, [fr[0], bk[0], bk[3], fr[3]], '#c8c0b4'); D.poly3(R.cam, [fr[1], bk[1], bk[2], fr[2]], '#c8c0b4');
    D.poly3(R.cam, fr, d.col);
    for (const [dy, dx] of [[0.8, -0.4], [0.8, 0.4], [2.4, 0]]) { const q = D.toCam(R.cam, P(-w / 2 - 0.02, dx, dy)); if (q[2] > 1) { const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * 0.18; D.ctx.fillStyle = '#ffffff'; D.ctx.beginPath(); D.ctx.arc(sx, sy, rr, 0, 7); D.ctx.fill(); } }
  }
  function paperRoll(D, R, r) {                                      // a giant roll of wrapping paper lying by the wall
    const k = fogK(R, r.z, r.sd * 20), X = r.sd * 20, F = (z, x, y) => FL(R, z, x, y), n = 10, pts = [];
    for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2; pts.push(F(r.z + Math.cos(an) * 1.6, X - r.sd * 3, 1.6 + Math.sin(an) * 1.6)); }
    boxF(D, R, r.z - 1.6, r.z + 1.6, X - 3, X + 3, 0, 3.2, { top: r.col, side: mixHex(r.col, '#000000', 0.2), front: mixHex(r.col, '#ffffff', 0.25) }, k);
    D.poly3(R.cam, pts, fog('#f4ece0', k));
  }
  function tires(D, R, tr) {                                         // a stack of toy tyres on the outside of a bend
    const X = tr.sd * (HW(tr.z) + 2), k = fogK(R, tr.z, X);
    for (let i = 0; i < 3; i++) { const q = D.toCam(R.cam, FL(R, tr.z, X, 0.35 + i * 0.7)); if (q[2] < 1) continue; const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * 0.9, g = D.ctx; g.fillStyle = fog('#2a2a2a', k); g.fillRect(sx - rr, sy - rr * 0.38, rr * 2, rr * 0.76); g.fillStyle = fog(i % 2 ? '#ffffff' : '#ff3a3a', k); g.fillRect(sx - rr, sy - rr * 0.06, rr * 2, rr * 0.12); }
  }
  function bigToy(D, R, ty) {                                        // giant toys about the floor
    const X = ty.sd * (HW(ty.z) + ty.x), k = fogK(R, ty.z, X), xw = X + HX(ty.z), up = gy(ty.z) - FD(ty.z) - R.CO.surf(ty.z, xw);
    if (ty.k === 'teddy') R.billboard(PIX.teddy, ty.z, xw, up, 1 - k * 0.6);
    else if (ty.k === 'bigduck') R.billboard(PIX.bigduck, ty.z, xw, up, 1 - k * 0.6);
    else if (ty.k === 'horse') R.billboard(PIX.horse, ty.z, xw, up, 1 - k * 0.6, ty.sd);
    else if (ty.k === 'ball') { const p = ball3(D, R, FL(R, ty.z, X, 2.2), 2.2, fog(ty.col, k)); if (p) { const [sx, sy, rr] = p, g = D.ctx; g.fillStyle = fog('#ffffff', k); g.fillRect(sx - rr, sy - rr * 0.12, rr * 2, rr * 0.24); } }
    else if (ty.k === 'rings') { for (let i = 0; i < 4; i++) { const q = D.toCam(R.cam, FL(R, ty.z, X, 0.5 + i * 0.9)); if (q[2] < 1) continue; const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * (1.8 - i * 0.35); D.ctx.fillStyle = fog(TOY[(ty.seed + i) % TOY.length], k); D.ctx.fillRect(sx - rr, sy - rr * 0.32, rr * 2, rr * 0.64); } }
    else for (let i = 0; i < 3; i++) { const s = 2.4, col = TOY[(ty.seed + i) % TOY.length]; boxF(D, R, ty.z - s / 2, ty.z + s / 2, X - s / 2 + (i % 2) * 0.4, X + s / 2 + (i % 2) * 0.4, i * s, (i + 1) * s, { top: '#f4ece0', side: mixHex(col, '#000000', 0.2), front: col }, k); }
  }
  function balloon(D, R, b) {                                        // a balloon floating over the playroom, bobbing
    const y = b.y + Math.sin(R.t * 1.2 + b.ph) * 0.5, p = ball3(D, R, FL(R, b.z, b.x, y), 0.9, b.col);
    if (!p) return;
    const [sx, sy, rr] = p, q = D.toCam(R.cam, FL(R, b.z, b.x, y - 3));
    if (q[2] > 1) { const [tx, ty] = D.scr(R.cam, q); D.ctx.strokeStyle = 'rgba(80,80,100,0.6)'; D.ctx.lineWidth = Math.max(1, rr * 0.06); D.ctx.beginPath(); D.ctx.moveTo(sx, sy + rr); D.ctx.lineTo(tx, ty); D.ctx.stroke(); }
  }
  function fan(D, R, c) {                                            // the other animals in the stands along the track, cheering
    if (c.id === R.char) return;
    const X = c.sd * (HW(c.z) + c.x + c.row * 1.4), up = 0.5 + c.row * 0.9 + Math.abs(Math.sin(R.t * 6 + c.ph)) * 0.25, q = D.toCam(R.cam, R.S3(c.z, X, up));
    if (q[2] < 1 || q[2] > 70) return;
    const [sx, sy] = D.scr(R.cam, q), scl = R.cam.F / q[2] * 1.3 / 48;
    D.spr(c.id, sx, sy, scl);
  }
  function sorterArch(D, R) {                                         // the sorting machine over the start of the split: its name, red one way, blue the other
    const z = FORK1[0] - 0.5, h = HW(z) + 0.6, { cam, P3 } = R, y = 6.4;
    for (const sd of [-1, 1]) boxS(D, R, z - 0.8, z + 0.8, sd > 0 ? h : -h - 1.2, sd > 0 ? h + 1.2 : -h, 0, y + 2, { top: '#8a93a6', side: '#6c7486', front: '#9aa3b4' });
    D.poly3(cam, [P3(z, -h, y), P3(z, h, y), P3(z, h, y + 2), P3(z, -h, y + 2)], '#4a5060');
    D.poly3(cam, [P3(z - 0.01, -h, y), P3(z - 0.01, -0.1, y), P3(z - 0.01, -0.1, y + 0.3), P3(z - 0.01, -h, y + 0.3)], '#ff3a3a');
    D.poly3(cam, [P3(z - 0.01, 0.1, y), P3(z - 0.01, h, y), P3(z - 0.01, h, y + 0.3), P3(z - 0.01, 0.1, y + 0.3)], '#3a8fff');
    text3(D, R, P3(z - 0.05, -h / 2, y + 1.15), '← 紅', 1.1, '#ff7a7a', { far: 120 });
    text3(D, R, P3(z - 0.05, h / 2, y + 1.15), '藍 →', 1.1, '#7fb8ff', { far: 120 });
    for (let k = 0; k < 6; k++) glowDot(D, R, P3(z - 0.05, lerp(-h + 0.5, h - 0.5, k / 5), y + 2.1), 0.15, k % 2 ? '#ffd23f' : '#ff8a2a', Math.floor(R.t * 4 + k) % 2 ? 0.9 : 0.3);
  }
  function boothFrame(D, R, z) {                                       // the paint booth down the right of the split: frames, nozzles puffing colour
    const { cam, S3 } = R, med = MED(z), h = HW(z), y = 5.2, i = Math.round(z / 8);
    for (const x of [med + 0.05, h]) D.poly3(cam, [S3(z - 0.2, x, 0), S3(z + 0.2, x, 0), S3(z + 0.2, x, y), S3(z - 0.2, x, y)], '#f4f0fa');
    D.poly3(cam, [S3(z, med, y), S3(z, h, y), S3(z + 8, h, y), S3(z + 8, med, y)], '#e8e2f0', 0.9);
    D.poly3(cam, [S3(z - 0.21, med, y - 0.6), S3(z - 0.21, h, y - 0.6), S3(z - 0.21, h, y), S3(z - 0.21, med, y)], TOY[i % TOY.length]);
    for (const x of [med + 1.5, h - 1.5]) {
      glowDot(D, R, S3(z, x, y - 0.8), 0.18, TOY[(i + (x > 5 ? 1 : 3)) % TOY.length], 0.8);
      const ph = (R.t * 1.4 + i * 0.37 + x) % 1;               // a puff of paint mist drifting down
      D.ctx.globalAlpha = 0.55 * (1 - ph); ball3(D, R, S3(z, x, y - 1 - ph * 2.5), 0.2 + ph * 0.45, TOY[(i + (x > 5 ? 1 : 3)) % TOY.length]); D.ctx.globalAlpha = 1;
    }
    if (i % 2 === 0) text3(D, R, S3(z - 0.25, (med + h) / 2, y - 0.3), '噴漆室', 0.45, '#ffffff', { far: 60 });
  }
  function loopFrame(D, R) {                                          // the frame the loop hangs in: two towers and a beam over its top; a base under it
    const { cam } = R, r = LOOP.r, base = gy(L0), hw = HW(L0), W = LOOP.shift, top = base + 2 * r + 1.2, Fz = L0;
    const X0 = R.CO.centerX(L0), P = (x, y, z) => [X0 + x, y, z];
    const steel = { side: '#2457c0', rear: '#2f6fe0', front: '#2f6fe0', top: '#7fb2ff' };
    for (const x of [X0 - hw - 1.6, X0 + W + hw + 0.8]) {
      D.box3(cam, x, x + 0.8, base - FD(L0), top, Fz - 0.5, Fz + 0.5, steel);
      D.box3(cam, x - 0.6, x + 1.4, base - FD(L0), base - FD(L0) + 0.6, Fz - 3, Fz + 3, { side: '#3a3f4c', rear: '#4a5060', front: '#4a5060', top: '#5a6070' });
    }
    for (let k = 0; k < 8; k++) glowDot(D, R, P(-hw - 1.2, base + 2 + k * 3.4, Fz - 0.55), 0.18, k % 2 ? '#ffd23f' : '#ff3a3a', Math.floor(R.t * 5 + k) % 2 ? 0.9 : 0.3);
  }
  function loopBase(D, R) {                                           // the block the loop stands on (under the track)
    const r = LOOP.r, base = gy(L0), hw = HW(L0), W = LOOP.shift, X0 = R.CO.centerX(L0);
    D.box3(R.cam, X0 - hw - 1, X0 + W + hw + 1, base - FD(L0), base - 0.4, L0 - r - 2, L0 + r + 2, { side: '#4a5060', rear: '#5a6070', front: '#5a6070', top: '#6a7086' });
  }
  function loopBeam(D, R) {                                           // the beam over the top of the loop and its hangers (drawn with the track there, under it)
    const { cam } = R, r = LOOP.r, base = gy(L0), hw = HW(L0), W = LOOP.shift, top = base + 2 * r + 1.2, Fz = L0, X0 = R.CO.centerX(L0);
    const steel = { side: '#2457c0', rear: '#2f6fe0', front: '#2f6fe0', top: '#7fb2ff' };
    D.box3(cam, X0 - hw - 1.6, X0 + W + hw + 1.6, top, top + 0.7, Fz - 0.5, Fz + 0.5, steel);
    for (let k = 0; k < 2; k++) D.box3(cam, X0 + W / 2 + (k ? 1 : -1.6), X0 + W / 2 + (k ? 1.6 : -1), base + 2 * r + 0.2, top, Fz - 0.2, Fz + 0.2, steel);
  }
  function loopArch(D, R) {                                           // a banner before the loop: 大迴環
    const z = L0 - 26, h = HW(z) + 0.6, { cam, P3 } = R, y = 6.4;
    for (const sd of [-1, 1]) { const X = R.wx(z, sd * h); D.box3(cam, X - 0.25, X + 0.25, gy(z), gy(z) + y + 1.8, z - 0.25, z + 0.25, { side: '#2457c0', rear: '#2f6fe0', top: '#ffffff' }); }
    D.poly3(cam, [P3(z, -h, y), P3(z, h, y), P3(z, h, y + 1.8), P3(z, -h, y + 1.8)], '#ff7a1a');
    text3(D, R, P3(z - 0.05, 0, y + 0.9), '大迴環 LOOP', 1.1, '#ffffff', { far: 120, stroke: '#c8460a' });
  }
  function giftArch(D, R, back) {                                       // the finish: a giant gift box to ride out through, a bow on top
    const z = FINISH, h = HW(z) + 0.4, { cam, P3 } = R, y = 7, col = '#ff4f7a', rib = '#ffd23f';
    if (back) {                                                   // (its far half, behind her as she passes)
      D.poly3(cam, [P3(z + 3, -h - 2, y), P3(z + 3, h + 2, y), P3(z + 3, h + 2, y + 2), P3(z + 3, -h - 2, y + 2)], mixHex(col, '#000000', 0.3), 1, [0, 0, -1]);
      return;
    }
    for (const sd of [-1, 1]) {
      const x0 = sd > 0 ? h : -h - 2, x1 = sd > 0 ? h + 2 : -h;
      boxS(D, R, z - 0.2, z + 3, x0, x1, 0, y + 2, { top: col, side: mixHex(col, '#000000', 0.15), front: col });
      D.poly3(cam, [R.S3(z - 0.21, (x0 + x1) / 2 - 0.25, 0), R.S3(z - 0.21, (x0 + x1) / 2 + 0.25, 0), R.S3(z - 0.21, (x0 + x1) / 2 + 0.25, y + 2), R.S3(z - 0.21, (x0 + x1) / 2 - 0.25, y + 2)], rib, 1, [0, 0, -1]);
    }
    D.poly3(cam, [P3(z - 0.2, -h, y), P3(z - 0.2, h, y), P3(z - 0.2, h, y + 2), P3(z - 0.2, -h, y + 2)], col);
    D.poly3(cam, [P3(z - 0.21, -h - 2, y + 0.75), P3(z - 0.21, h + 2, y + 0.75), P3(z - 0.21, h + 2, y + 1.25), P3(z - 0.21, -h - 2, y + 1.25)], rib);
    for (const sd of [-1, 1]) D.poly3(cam, [P3(z - 0.22, 0, y + 2), P3(z - 0.22, sd * 2.6, y + 3.8), P3(z - 0.22, sd * 2.8, y + 2.4)], rib);
    D.print(cam, P3(z - 0.3, -h, y + 2), P3(z - 0.3, h, y + 2), P3(z - 0.3, -h, y), GOAL_SIGN, { w: 2 * h, h: 2, stroke: '#c8243a', fill: 0.6 });   // (printed on the box: it leans with it)
  }

  root.SkiMaps.define('factory', { course, theme, music: { race: 'factory', result: 'factory_result', tv: 'factory_tv', back: 'factory_back' }, score: { par: 122, ranks: root.SkiScore.RANKS, key: 'ski-best-factory' }, bg: '#9a8cc4' });
})(typeof window !== 'undefined' ? window : globalThis);

'use strict';
// 困難 · 賽博龐克 (NEON OVERDRIVE): a rain-soaked neon megacity at night, ridden on an anti-gravity board. Its tricks:
// holograms that flicker off (ride through while they are down), laser sweepers, drones swooping at head height, lanes
// of light that carry her; then a magnetic skyway with no rails, which twists up on to the glass face of a tower (she
// rides the wall), on through a ring tunnel that corkscrews twice (the whole city turning round her), then over on to
// its back under a floating arcology (upside down, the city hanging over her head; fall through a gap and she falls
// into the sky). Back on the highway she hits OVERDRIVE: faster than ever, and everything in her way goes flying.
// Last a bridge of data blocks that fly in and lock together just ahead of her, the launch through the giant
// hologram over the plaza (slow motion, a barrel roll) and down to the finish.
(function (root) {
  const { clamp, lerp, seg, smooth, rng, mixHex, obX, obZ, obUp, obBurst } = root.SkiCore;
  const PI = Math.PI;

  // ------------------------------------------------------------ course
  const FORK = [196, 336];                                      // ① round a kiosk: up on the maglev deck (left) / down the arcade (right)
  const SKY0 = 420;                                             // ② on to the magnetic skyway
  const W = [540, 578, 702, 736];                               // the track twists up on to the towers' faces, along them, back down
  const TA = [582, 636], TB = [642, 700];                       // the two towers she rides along (an alley between them)
  const TUBE = [742, 872];                                      // the ring tunnel, corkscrewing twice
  const FL = [890, 936, 1186, 1232];                            // ③ over on to its back, upside down under the arcology, back over
  const ODZ = [1252, 1436];                                     // ④ overdrive
  const FORK2 = [1470, 1586];                                   // round a pylon: the express lane (left) / the tunnel (right)
  const BR = [1640, 1796];                                      // ⑤ the bridge of data blocks
  const JUMP = 1800;                                            // the launch through the hologram

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
  const HOLO = { vy: 17, v: 31, rise: 1.2, g: 0.35 }, B_FLY = fly(HOLO.vy, HOLO.v, HOLO.rise, 0.3, HOLO.g);
  const LAND = Math.round(JUMP + 4 + B_FLY.z);
  const IDOL = Math.round(JUMP + 4 + B_FLY.top[0]);             // the hologram's face: where she flies through it, at the top of her flight
  const FINISH = LAND + 112;
  const ROLL = [JUMP + 12, LAND - 10];                          // the barrel roll in the air
  // during the roll the track turns about a line through her, not 4 above the course (she is high over it)
  // the track turns about a line 4 above it in the ring tunnel (round its hoops); up a wall and over on to its back, about one just over
  // it, so the track ahead twists in place like a ribbon instead of sweeping up in a wall that hides the way on
  const TWAX = [[0, 4], [W[0] - 3, 4], [W[0] - 1, 0.6], [W[3] + 1, 0.6], [W[3] + 4, 4], [TUBE[1] + 4, 4], [FL[0] - 3, 0.6], [FL[3] + 1, 0.6], [FL[3] + 4, 4], [ROLL[0] - 2, 4]];
  for (let z = ROLL[0]; z < ROLL[1]; z += 4) TWAX.push([z, B_FLY.at(z - JUMP - 4) + 0.9]);
  TWAX.push([ROLL[1] + 2, 4]);
  // eased like the course's own lines, for laying things along a lane of light
  const along = pts => z => { if (z <= pts[0][0]) return pts[0][1]; for (let i = 0; i < pts.length - 1; i++) { const [za, a] = pts[i], [zb, b] = pts[i + 1]; if (z <= zb) return lerp(a, b, smooth((z - za) / (zb - za))); } return pts[pts.length - 1][1]; };

  const course = root.SkiCourse.build({
    id: 'cyber', HALF: 10, FINISH, LENGTH: FINISH + 100, START: 4, flow: true, botLanes: 0.125,   // (fast: the bot edges across in finer steps)
    phys: { VMAX: 33, DRAG: 0.22, DRIFT: 0.4, CENT: 0, WALL_DRAG: 1.7, REWIND_V: 0.85 },
    CX: [[0, 0], [40, 0], [90, -5], [150, 4], [FORK[0], 0], [FORK[1], 0], [362, -4], [392, -11], [SKY0, -16], [452, -18], [490, -14], [520, -9],
      [560, -6], [TA[0], -6], [TB[1], -6], [W[3], -6], [TUBE[0], -4], [810, 2], [TUBE[1], 6], [FL[0], 6], [980, 2], [1060, -6], [1140, -2], [FL[2], 3], [FL[3], 3],
      [ODZ[0], 0], [1310, -7], [1370, 5], [ODZ[1], 0], [FORK2[0], 0], [FORK2[1], 0], [1612, -6], [BR[0], -8], [1700, -4], [1760, 0], [JUMP, 0], [FINISH + 100, 0]],
    GRADE: [[0, 0.02], [12, 0.08], [30, 0.17], [SKY0, 0.17], [SKY0 + 10, 0.15], [W[0], 0.16], [W[3], 0.18], [TUBE[0], 0.22], [TUBE[1], 0.22], [FL[0], 0.16], [FL[3], 0.16],
      [FL[3] + 8, 0.3], [ODZ[0], 0.24], [ODZ[1], 0.2], [BR[0] - 20, 0.16], [BR[1], 0.14], [JUMP, 0.12], [JUMP + 3.5, 0.12], [JUMP + 4, HOLO.g], [LAND + 8, HOLO.g],
      [LAND + 40, 0.14], [FINISH - 20, 0.12], [FINISH, 0.06], [FINISH + 40, 0], [FINISH + 100, 0]],
    WIDTH: [[0, 7], [60, 9], [FORK[0] - 6, 9.5], [FORK[1] + 6, 9.5], [400, 9], [SKY0 + 8, 5], [W[3], 5], [TUBE[0], 6], [TUBE[1], 6], [FL[0] - 4, 4.5], [FL[1] + 4, 7], [FL[2] - 4, 7], [FL[3] + 4, 4.5],   // (narrow while it turns over: the track ahead stays under her eye)
      [ODZ[0] - 10, 10], [ODZ[1], 10], [FORK2[0] - 6, 9.5], [FORK2[1] + 6, 9.5], [BR[0] - 8, 8], [BR[0] + 4, 5], [JUMP, 5], [LAND - 6, 8], [FINISH, 9]],
    OPEN: [[SKY0 + 8, W[0]], [BR[0] + 4, JUMP]],
    SPLIT: [{ m: [[FORK[0] - 1, 0], [FORK[0] + 12, 1.4], [FORK[1] - 12, 1.4], [FORK[1], 0]],
      L: [[FORK[0] + 3, 0], [FORK[0] + 24, 2.6], [FORK[1] - 30, 2.6], [FORK[1] - 8, 0]],              // up on the maglev deck
      R: [[FORK[0] + 3, 0], [FORK[0] + 20, -1.2], [FORK[1] - 26, -1.2], [FORK[1] - 8, 0]] },          // down into the arcade
    { m: [[FORK2[0] - 1, 0], [FORK2[0] + 12, 1.4], [FORK2[1] - 12, 1.4], [FORK2[1], 0]],
      R: [[FORK2[0] + 3, 0], [FORK2[0] + 18, -1.2], [FORK2[1] - 24, -1.2], [FORK2[1] - 8, 0]] }],       // down into the tunnel
    TWIST: [[W[0], 0], [W[1], PI / 2], [W[2], PI / 2], [W[3], 0], [TUBE[0], 0], [TUBE[1], 4 * PI], [FL[0], 4 * PI], [FL[1], 5 * PI], [FL[2], 5 * PI], [FL[3], 6 * PI],
      [ROLL[0], 6 * PI], [ROLL[1], 8 * PI]],
    TWAX,
    CAMTILT: [[FL[1] - 10, 0], [FL[1] + 10, -0.22], [FL[2] - 10, -0.22], [FL[2] + 10, 0]],   // (upside down, the camera rides higher and looks further down: the gaps ahead in plain view)
    OD: [ODZ],
    slow: [[JUMP + 4, LAND - 4]],
    gateEvery: 40,
    sections: [{ name: '霓虹大道', z0: 0 }, { name: '飛簷走壁', z0: SKY0 - 10 }, { name: '倒懸都市', z0: FL[0] - 16 }, { name: '超頻衝撞', z0: ODZ[0] - 20 }, { name: '數據終點', z0: BR[0] - 30 }],
  }, (c, P) => {
    const { coin, row, boost } = P;
    const holo = (z, x, hw = 1.6, period = 2.6, ph) => P.dive('holo', z, x, hw, period, { h: 99, hd: 0.35, ph });   // a hologram wall: flickers off now and then
    const sweep = (z, x, amp, period) => P.roll('sweep', z, x, 0.9, amp, period, { h: 0.7, hd: 0.35 });          // a laser sweeping across low: hop it
    const drone = (z, x, w, k = 0.5) => {                                              // swooping at her, head high: duck (its rotors heard as it goes over)
      c.obstacles.push({ k: 'drone', z, x, hw: w / 2, hd: 0.5, y0: 1.3, y1: 2.6, drive: { k } });
      if (z < ODZ[0] || z > ODZ[1]) P.cue(z, 'whirr', { x, near: w / 2 + 1.5 });
    };
    const crate = (z, x, hw = 0.75) => P.hop('crate', z, x, hw, { h: 0.85 });
    const pillar = (z, x, hw = 0.8) => P.tall('pillar', z, x, hw, { hd: 0.8 });
    const laser = (z, x, ph) => P.burst('laser', z, x, 1.6, 2.4, { ph, hd: 0.4 });    // a laser gate firing in turn
    const sign = (z, x, w) => P.over('sign', z, x, w);                                 // a neon sign hung low: duck
    const lane = (pts, hw = 1.5) => { P.flow(pts, hw); return along(pts); };           // a lane of light
    const pair = (z, y = 0.9) => { coin(z, -1.5, y); coin(z, 1.5, y); };

    // ① 霓虹大道: down a street canyon in the rain. Holograms flicker across it, lasers sweep it, drones swoop; a lane of
    // light; then a fork round a kiosk (up on the maglev deck: a long lane of light, lasers, drones / down the arcade:
    // holograms, low signs, more coins), a long bend through laser gates, on to the skyway
    row(26, 0, 3);
    holo(48, -3.4); holo(48, 3.4); coin(48, 0);
    const l1 = lane([[58, -4], [84, 3], [110, -2]]); for (const z of [64, 80, 104]) coin(z, l1(z));
    sweep(76, 0, 4, 3.2);
    drone(96, 0, 7); coin(96, l1(96), 0.6);
    crate(116, -2.5); crate(116, 2.5); coin(116, 0);
    pillar(130, 0); coin(130, -3); coin(130, 3);
    sweep(146, 0, 5, 2.8); coin(146, 0, 1.7);
    holo(160, -4.2, 2); holo(160, 4.2, 2); coin(160, 0);
    boost(176, 0, 1.6, 6); coin(184, 0);
    P.tall('kiosk', FORK[0], 0, 1.4, { hd: 1.2 });
    const l2 = lane([[204, -5.5], [240, -4], [280, -6.5], [325, -5]]);                 // left: the maglev deck
    for (const z of [212, 238, 262, 286, 308]) coin(z, l2(z));
    sweep(226, -5.4, 2.2, 2.6); drone(250, -5.4, 7); sweep(272, -5.4, 2.2, 2.2); drone(300, -5.4, 7);
    crate(318, -3.5); crate(318, -7.5); coin(318, -5.5);
    holo(220, 6.2); coin(220, 3.2); sign(234, 5.45, 8.1); coin(234, 5.5, 0.6); coin(242, 5.5);    // right: the arcade
    crate(248, 3.5); crate(248, 7.5); coin(248, 5.5); holo(262, 3.6, 1.4, 2.0); coin(262, 7.4);
    sign(276, 5.45, 8.1); coin(276, 5.5, 0.6); holo(290, 7.2); coin(290, 3.2); crate(304, 5.5); coin(304, 5.5, 1.6);
    sign(318, 5.45, 8.1); coin(318, 5.5, 0.6);
    laser(352, -3.4, 0); laser(352, 3.4, PI); coin(352, 0);
    drone(370, 0, 8); coin(370, 0, 0.6);
    laser(386, -5, 1); laser(386, 1.5, 1 + PI); coin(386, -1.8); coin(386, 5.6);
    boost(398, -1.5, 1.6, 6); coin(406, -1.5);
    // ② 飛簷走壁: the magnetic skyway, no rails (off the edge she falls), gaps to hop; it twists up on to a tower's face
    // and she rides the wall (window units to hop, a cleaners' cradle to go round, cables to duck), over the alley to
    // the next tower, back down; then the ring tunnel, corkscrewing twice round a lane of light, with nothing in the way
    P.cue(SKY0, 'mag');
    coin(440, 0); P.gap('sky', 452, 4); coin(454, 0, 1.7);
    coin(468, 0); P.gap('sky', 482, 5); coin(484.5, 0, 1.8);
    coin(498, -2); coin(504, 2);
    P.gap('sky', 514, 4); coin(516, 0, 1.7);
    boost(530, 0, 1.5, 5); coin(538, 0);
    P.cue(W[0] + 8, 'wallride');
    row(562, 0, 3, 4);
    P.hop('ac', 596, -2, 0.8, { h: 0.8 }); coin(596, 2);
    P.tall('cradle', 610, 2.2, 1.1, { hd: 0.6 }); coin(610, -2.4);
    P.over('cable', 624, 0, 10); coin(624, 0, 0.6);
    P.gap('alley', TA[1], TB[0] - TA[1]); coin((TA[1] + TB[0]) / 2, 0, 1.7);
    P.hop('ac', 656, 2, 0.8, { h: 0.8 }); coin(656, -2);
    P.tall('cradle', 670, -2.2, 1.1, { hd: 0.6 }); coin(670, 2.4);
    P.hop('ac', 684, -2.5, 0.8, { h: 0.8 }); coin(684, 1.5);
    P.over('cable', 694, 0, 10); coin(694, 0, 0.6);
    row(712, 0, 3, 5);
    P.cue(TUBE[0] + 4, 'spiral');
    const l3 = lane([[750, 0], [780, -3], [810, 3], [840, -3], [868, 0]]);
    for (const z of [756, 764, 788, 800, 816, 830, 852, 862]) coin(z, l3(z));
    boost(744, 0, 1.6, 6);                                        // (nothing in the way in there: it is for the ride, like the jungle's sheer waterfall)
    boost(876, 0, 1.6, 6); coin(886, 0);
    // ③ 倒懸都市: over on to its back, under the floating arcology: upside down, the city over her head. Maintenance
    // crawlers to hop (or stomp), vent fans blasting in turn, pipes to duck, gaps where she would fall into the sky
    P.cue(FL[0] + 6, 'flip');
    row(930, 0, 3, 4);
    P.walker('crawler', 950, 0, 0.9, { k: 0.3 }); coin(950, -3); coin(950, 3);
    P.burst('fan', 972, -3.6, 1.4, 2.4, { ph: 0 }); P.burst('fan', 972, 3.6, 1.4, 2.4, { ph: PI }); coin(972, 0);
    P.over('pipe', 992, 0, 14); coin(992, 0, 0.6);
    P.gap('void', 1012, 4); coin(1014, 0, 1.7);
    P.walker('crawler', 1036, -3, 0.9, { k: 0.3 }); P.walker('crawler', 1036, 3, 0.9, { k: 0.3 }); coin(1036, 0);
    P.burst('fan', 1060, 0, 1.6, 2.2, { ph: 1 }); coin(1060, -4.4); coin(1060, 4.4);
    P.gap('void', 1084, 5); coin(1086.5, 0, 1.8);
    P.over('pipe', 1104, 0, 14); coin(1104, 0, 0.6);
    const l4 = lane([[1116, -4], [1150, 4], [1176, 0]]); for (const z of [1120, 1130, 1146, 1160, 1170]) coin(z, l4(z));
    P.walker('crawler', 1140, -2.5, 0.9, { k: 0.3 });
    boost(1184, 0, 1.6, 6); row(1200, 0, 3, 5);
    // ④ 超頻衝撞: down on to the highway through the OVERDRIVE gate: faster than ever, and she smashes through everything
    // (crates, barricades, robot police, parked cars, drones); out of it, a fork round a pylon: the express lane of
    // light with lasers (left) or the tunnel with drones and a boost (right)
    P.cue(ODZ[0] - 2, 'od');
    const r = rng(77);
    for (let z = ODZ[0] + 10, k = 0; z < ODZ[1] - 6; z += 9, k++) {
      const xs = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].filter(() => r() < 0.62);
      for (const x of xs) {
        const kind = (k + Math.round(x)) % 5;
        if (kind === 0) P.tall('cop', z, x, 0.6, { hd: 0.5 });
        else if (kind === 1) { P.hop('crate', z, x, 0.75, { h: 0.85 }); if (k % 2) coin(z, x, 1.5); }
        else if (kind === 2) P.tall('hcar', z, x, 1.1, { hd: 1.8 });
        else if (kind === 3) P.hop('barrier', z, x, 1.2, { h: 0.9, hd: 0.3 });
        else holo(z, x, 1.2);
      }
      if (k % 4 === 2) drone(z + 4, (k % 8 < 4 ? -4 : 4), 6, 0.4);
    }
    P.cue(ODZ[1] + 4, 'odend');
    P.tall('pylon', FORK2[0], 0, 1.4, { hd: 1.2 });
    const l5 = lane([[1478, -5.5], [1520, -4], [1580, -5.5]]); for (const z of [1486, 1520, 1560]) coin(z, l5(z));
    sweep(1502, -5.4, 2.2, 2.4); sweep(1540, -5.4, 2.2, 2.0);
    drone(1496, 5.4, 7); coin(1496, 5.4, 0.6); boost(1510, 5.5, 1.5, 6); drone(1530, 5.4, 7); coin(1530, 5.4, 0.6); drone(1556, 5.4, 7); coin(1556, 5.4, 0.6);
    holo(1604, -3.4); holo(1604, 3.4); coin(1604, 0);
    crate(1620, -2.5); crate(1620, 2.5); coin(1620, 0, 1.6);
    // ⑤ 數據終點: the bridge of data blocks, flying in and locking together just ahead of her (no rails; gaps to hop);
    // the launch through the giant hologram over the plaza (slow motion, a barrel roll), down to the finish
    P.cue(BR[0] - 6, 'bridge');
    coin(1656, 0); P.gap('data', 1676, 4); coin(1678, 0, 1.7);
    holo(1694, 0, 1.4); coin(1694, -3); coin(1694, 3);
    P.gap('data', 1712, 4); coin(1714, 0, 1.7);
    pillar(1729, 0, 0.7); coin(1729, -2.7); coin(1729, 2.7);   // (go round it: a hop here would come down in the next gap)
    P.gap('data', 1748, 5); coin(1750.5, 0, 1.8);
    boost(1768, 0, 1.6, 6); row(1780, 0, 2, 6);
    P.launch(JUMP, 0, 5, 4, HOLO.vy, HOLO.v, HOLO.rise, { k: 'holojump', sfx: 'holojump', pop: 'holojump' });
    for (let z = JUMP + 4.5; z < LAND - 4 - 0.01; z += 4) P.gap('abyss', z, Math.min(4, LAND - 4 - z), { thrown: true });
    for (let k = 1; k <= 6; k++) { const d = B_FLY.z * k / 7; coin(JUMP + 4 + d, 0, B_FLY.at(d) + 0.75); }
    P.cue(IDOL, 'glitch');
    const E = z => LAND + z;
    crate(E(24), -2.5); crate(E(24), 2.5); coin(E(24), 0);
    holo(E(40), -4, 1.8); holo(E(40), 4, 1.8); coin(E(40), 0);
    boost(E(56), 0, 1.6, 6); coin(E(66), 0);
    sweep(E(84), 0, 6.5, 2.6); coin(E(84), 0, 1.7);
    coin(FINISH - 8, 0);
  });

  root.SkiCourse.fitFlights(course);

  // ------------------------------------------------------------ look
  const HW = z => course.halfAt(z), gy = z => course.height(z), MED = z => course.medianAt(z);
  const N = { mag: '#ff3fd0', cyan: '#2ff3ff', yel: '#ffe14a', pur: '#9b5cff', lime: '#6dff8a', red: '#ff3355', org: '#ff8a2a', white: '#f4f0ff' };
  const NC = [N.mag, N.cyan, N.yel, N.pur, N.lime, N.org];
  const HAZE = '#1c1040', FC = new Map();
  function fog(col, k) {                                         // far off, colours sink into the purple haze
    const q = Math.round(clamp(k) * 6);
    if (!q) return col;
    const key = col + q;
    let v = FC.get(key);
    if (!v) { v = mixHex(col, HAZE, q / 6 * 0.85); FC.set(key, v); }
    return v;
  }
  const fogK = (R, z, x = 0) => clamp((root.SkiDraw.toCam(R.cam, R.P3(z, x))[2] - 50) / 80);
  // where she is: on the street, up on the skyway (and the towers, the tunnel, the arcology), the highway, the bridge, in the air, the plaza
  const onFace = z => (z >= TA[0] && z < TA[1]) || (z >= TB[0] && z < TB[1]);
  const inTube = z => z >= TUBE[0] - 6 && z < TUBE[1] + 6;
  const under = z => z >= FL[1] && z < FL[2];                   // (the arcology's underside: only where she is right over on her back)
  const inBridge = z => z >= BR[0] + 4 && z < JUMP + 4;
  const inAir = z => z >= JUMP + 4 && z < LAND - 3;
  const ELEV = z => z >= SKY0 + 8 && z < FL[3] + 10;
  const DEEP = along([[0, 0], [SKY0, 0], [SKY0 + 40, 46], [FL[3], 46], [ODZ[0] - 10, 0], [BR[0], 0], [BR[0] + 30, 52], [LAND - 24, 52], [LAND, 0]]);   // how far below the course the city is
  const HOLES = course.obstacles.filter(o => o.hole);
  const holesIn = (za, zb) => HOLES.filter(o => o.z + o.hd > za && o.z - o.hd < zb);
  const WP = (R, z, x, y) => [R.wx(z, x), y, z];                  // a point fixed in the world (it does not turn with the track)

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
    g.shadowColor = col; g.shadowBlur = 10; g.fillStyle = col; g.fillText(str, w / 2, cv.height / 2 + 2);
    im = { cv, w, h: cv.height, S }; TXT.set(key, im);
    return im;
  }
  function text3(D, R, p, str, size, col, o = {}) {              // a word facing the camera at p, `size` world units tall (o.world: fixed in the world, so it turns with it when the track twists)
    const q = D.toCam(R.cam, p);
    if (q[2] < 1 || q[2] > (o.far || 80)) return;
    const [sx, sy] = D.scr(R.cam, q), px = R.cam.F / q[2] * size;
    if (px < 7) return;
    const im = textImg(str, col, o.stroke || null), g = D.ctx;
    if (o.alpha !== undefined) { g.save(); g.globalAlpha *= o.alpha; }
    if (!im) D.txt(str, sx, sy + px * 0.38, { size: Math.round(px), color: col, align: 'center' });
    else {
      const k = px / im.S, w = im.w * k, h = im.h * k;
      if (R.roll && o.world) { g.save(); g.translate(sx, sy); g.rotate(R.roll); g.drawImage(im.cv, -w / 2, -h / 2, w, h); g.restore(); }
      else g.drawImage(im.cv, sx - w / 2, sy - h / 2, w, h);
    }
    if (o.alpha !== undefined) g.restore();
  }
  function glowDot(D, R, p, rad, col, a = 0.5) {                 // a glow: a soft disc and a bright core
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.8) return;
    const [sx, sy] = D.scr(R.cam, q), rr = clamp(R.cam.F / q[2] * rad, 2, 70), g = D.ctx;
    if (rr < 5) { D.rect(sx - rr, sy - rr, rr * 2, rr * 2, col, Math.min(1, a * 1.6)); return; }
    g.save(); g.globalAlpha *= a * 0.35; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr * 2.2, 0, 7); g.fill();
    g.globalAlpha = Math.min(1, a * 2); g.beginPath(); g.arc(sx, sy, rr * 0.8, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy, rr * 0.35, 0, 7); g.fill(); g.restore();
  }
  function ball3(D, R, p, rad, col) {                            // a ball: a disc
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.6) return;
    const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * rad, g = D.ctx;
    if (rr < 1.5) { D.rect(sx - 1, sy - 1, 2, 2, col); return; }
    g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
  }
  function boxS(D, R, z0, z1, x0, x1, y0, y1, cols) {             // a box standing on the riding surface (turned with the track)
    const p = (z, x, y) => R.S3(z, x, y), cam = R.cam;
    D.poly3(cam, [p(z0, x0, y0), p(z1, x0, y0), p(z1, x0, y1), p(z0, x0, y1)], cols.side, 1);
    D.poly3(cam, [p(z0, x1, y0), p(z1, x1, y0), p(z1, x1, y1), p(z0, x1, y1)], cols.side, 1);
    if (cols.back) D.poly3(cam, [p(z1, x0, y0), p(z1, x1, y0), p(z1, x1, y1), p(z1, x0, y1)], cols.back, 1);
    D.poly3(cam, [p(z0, x0, y1), p(z0, x1, y1), p(z1, x1, y1), p(z1, x0, y1)], cols.top, 1);
    D.poly3(cam, [p(z0, x0, y0), p(z0, x1, y0), p(z0, x1, y1), p(z0, x0, y1)], cols.front, 1);
  }
  // a thin glowing line along the riding surface from (za, xa) to (zb, xb), w wide, `up` above it
  const neonLine = (D, R, za, xa, zb, xb, up, w, col, a = 1) => D.poly3(R.cam, [R.S3(za, xa - w / 2, up), R.S3(za, xa + w / 2, up), R.S3(zb, xb + w / 2, up), R.S3(zb, xb - w / 2, up)], col, a);
  function duckHint(D, R, z, xs, y) {                              // white chevrons pointing down: crouch!
    for (const x of xs) for (let j = 0; j < 2; j++) { const yy = y - j * 0.3; D.poly3(R.cam, [R.P3(z - 0.05, x - 0.35, yy + 0.18), R.P3(z - 0.05, x, yy), R.P3(z - 0.05, x + 0.35, yy + 0.18), R.P3(z - 0.05, x + 0.35, yy + 0.08), R.P3(z - 0.05, x, yy - 0.1), R.P3(z - 0.05, x - 0.35, yy + 0.08)], '#ffffff', 0.9); }
  }

  // ---- what stands round the course (built once)
  const SCENE = (() => {
    const r = rng(2077), towers = [], holos = [], hang = [], signs = [], lanes = [], crowd = [];
    const cols = ['#1a1636', '#151a34', '#1e1430', '#121c30', '#201a3a'];
    for (let z = -30; z < FINISH + 120; z += 9 + r() * 9) for (const sd of [-1, 1]) {
      const d = DEEP(z), street = d < 2, flip = z > FL[0] - 20 && z < FL[3] + 20, wall = z > W[0] - 16 && z < W[3] + 16;
      if (r() < (street ? 0.08 : 0.35)) continue;
      if (wall && sd > 0) continue;                               // (the towers she rides are there)
      if (z > JUMP - 30 && z < LAND && Math.abs(sd) && r() < 0.5) continue;
      const w = street ? 7 + r() * 8 : 8 + r() * 10, plaza = z > LAND - 20;   // (on the street a tower stands back past the pavement; round the plaza, past the stands as well)
      const x = street ? sd * (HW(z) + (plaza ? 9.5 : 5.2) + w / 2 + r() * 2) : flip ? sd * (30 + r() * 26) : sd * (20 + r() * 50), dd = 8 + r() * 10;
      let top = street ? 16 + r() * 50 : -14 + r() * 70;
      if (flip) top = -3 - r() * 9;                               // (under the arcology: just below it, so upside down she sees them hanging over her)
      towers.push({ z: z + r() * 4, x, w, d: dd, top, base: -d - 2, col: cols[(r() * cols.length) | 0], neon: NC[(r() * NC.length) | 0], seed: (r() * 1e6) | 0, sign: (street && r() < 0.6) || flip ? ['拉麵', '電玩', '旅館', '夜市', '網咖', '藥局', '酒吧', '當舖', '按摩', '書店', '咖啡', '當鋪'][(r() * 12) | 0] : null });
    }
    for (const [z, sd, kind, y, w] of [[70, 1, 'koi', 14, 14], [150, -1, 'cat', 12, 12], [270, 1, 'text', 16, 16], [380, -1, 'koi', 18, 16], [480, 1, 'jelly', 10, 20], [620, -1, 'koi', 6, 22],
      [800, 1, 'cat', 4, 20], [1300, -1, 'text', 14, 16], [1390, 1, 'jelly', 18, 14], [1520, -1, 'cat', 14, 14], [1610, 1, 'koi', 16, 16]]) holos.push({ z, sd, kind, y, w, x: sd * (HW(z) + (DEEP(z) < 2 ? 9 : 16)) });
    for (let z = FL[1] + 8; z < FL[2] - 6; z += 11 + r() * 6) for (const sd of [-1, 1]) {   // the city hanging under the arcology: she sees it standing round her
      const x = sd * (10 + r() * 3);
      hang.push({ z, x, w: 2.5 + r() * 2, d: 4 + r() * 5, h: 2 + r() * 6, col: cols[(r() * cols.length) | 0], neon: NC[(r() * NC.length) | 0], seed: (r() * 1e6) | 0 });
    }
    for (const [z, t] of [[FORK[0] - 26, '← 磁浮　商場 →'], [SKY0 - 30, '前方反重力區'], [ODZ[0] - 40, '超頻區 OVERDRIVE'], [FORK2[0] - 26, '← 快線　隧道 →'], [BR[0] - 34, '數據橋施工中']]) signs.push({ z, t, sd: signs.length % 2 ? 1 : -1 });
    for (let k = 0; k < 9; k++) lanes.push({ y: 18 + k * 7 + r() * 4, x: (k % 2 ? 1 : -1) * (14 + r() * 30), v: (12 + r() * 16) * (k % 3 ? 1 : -1), gap: 26 + r() * 30, col: NC[k % NC.length], ph: r() * 100 });
    const ids = ['owl', 'anji', 'anje', 'anbo', 'ansey', 'angoo', 'anmi', 'anka', 'anzo', 'anbi', 'anleo'];
    let n = 0;                                                     // the crowd on the stands round the plaza, two rows deep
    for (let z = LAND + 10; z < FINISH + 20; z += 4) for (const sd of [-1, 1]) for (const row of [0, 1]) crowd.push({ z: z + row * 2 + (sd > 0 ? 1 : 0), x: sd * (HW(z) + 1.6 + row * 2.2), y: 0.9 + row * 0.5, id: ids[(n++ * 7) % ids.length], ph: (z * 0.7 + row * 2.3) % 6 });
    return { towers: towers.sort((a, b) => a.z - b.z), holos, hang, signs, lanes, crowd };
  })();

  // ---- the city far below a raised stretch: dark blocks, streets lit gold, fixed in the world
  function cityFloor(D, R, za, zb, near) {
    const { cam } = R, ya = gy(za) - DEEP(za) - 2, yb = gy(zb) - DEEP(zb) - 2, k = near ? 0 : fogK(R, (za + zb) / 2) * 0.8, c = v => fog(v, k);
    const Q = (x0, x1, col, a = 1, up = 0) => D.poly3(cam, [WP(R, za, x0, ya + up), WP(R, za, x1, ya + up), WP(R, zb, x1, yb + up), WP(R, zb, x0, yb + up)], col, a);
    Q(-110, 110, c('#0a0818'));
    if (k < 0.7) for (let x = -90; x <= 90; x += 30) Q(x - 0.6, x + 0.6, c(Math.abs(x) % 60 ? '#c88a2a' : '#ff8a2a'), 0.55, 0.05);   // streets, lit
    if (Math.floor(za / 24) !== Math.floor(zb / 24) || za % 24 < 2) { const z = Math.ceil(za / 24) * 24; if (z < zb) D.poly3(cam, [WP(R, z - 0.5, -110, ya + 0.06), WP(R, z - 0.5, 110, ya + 0.06), WP(R, z + 0.5, 110, yb + 0.06), WP(R, z + 0.5, -110, yb + 0.06)], c('#c88a2a'), 0.5); }
    if (k < 0.7) { const rr = rng(Math.floor(za) * 13 + 5); for (let j = 0; j < 4; j++) { const x = -90 + rr() * 180, w = 2 + rr() * 5; Q(x, x + w, NC[(rr() * NC.length) | 0], 0.25, 0.08); } }   // the glow of signs down there
  }

  // ---- the course surface
  const ROAD = ['#1b1830', '#1e1a35'];
  function streetSlice(D, R, za, zb, near, hw = false) {        // a wet street (or the highway): neon lines, signs shining in the puddles, kerbs or walls
    const { cam, S3, P3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k), h0 = HW(za), h1 = HW(zb), ma = MED(za), mb = MED(zb), med = Math.max(ma, mb);
    if (DEEP((za + zb) / 2) < 2) for (const sd of [-1, 1]) D.poly3(cam, [P3(za, sd * (h0 + 5), -0.08), P3(za, sd * 90, -0.08), P3(zb, sd * 90, -0.08), P3(zb, sd * (h1 + 5), -0.08)], c('#0d0a1c'));   // the ground beyond the pavements (only there: over a way sunk below it, it would cover it)
    const col = c(ROAD[((Math.floor(za / 4) % 2) + 2) % 2]);
    if (med > 0.01) {
      D.poly3(cam, [S3(za, -h0, 0), S3(za, -ma, 0), S3(zb, -mb, 0), S3(zb, -h1, 0)], c(za < 700 ? '#1e2440' : '#1b1830'));   // (the maglev deck: steel)
      D.poly3(cam, [S3(za, ma, 0), S3(za, h0, 0), S3(zb, h1, 0), S3(zb, mb, 0)], col);
    } else D.poly3(cam, [S3(za, -h0, 0), S3(za, h0, 0), S3(zb, h1, 0), S3(zb, -h1, 0)], col);
    const od = course.odAt((za + zb) / 2);
    if (near) {
      if (med < 0.01) for (const u of [-1 / 3, 1 / 3]) { const z0 = Math.floor(za / 6) * 6; for (let z = z0; z < zb; z += 6) { const a = Math.max(za, z), b = Math.min(zb, z + 3); if (b > a) neonLine(D, R, a, u * HW(a), b, u * HW(b), 0.012, 0.18, od ? N.mag : N.cyan, 0.55); } }
      const rr = rng(Math.floor(za * 3) + 7);                     // signs shining in the wet road
      for (let j = 0; j < 2; j++) { const x = (rr() - 0.5) * 2 * (h0 - 1.5), cc = NC[(rr() * NC.length) | 0]; if (med > 0.01 && Math.abs(x) < med + 0.3) continue; neonLine(D, R, za, x, zb, x + (rr() - 0.5) * 0.3, 0.01, 0.3 + rr() * 0.4, cc, 0.16); }
      if (od) { const ph = (t * 3 + za * 0.25) % 1; D.poly3(cam, [S3(za, -h0, 0.013), S3(za, h0, 0.013), S3(zb, h1, 0.013), S3(zb, -h1, 0.013)], N.mag, 0.1 + 0.12 * ph); }   // overdrive: the road itself pulses
    }
    for (const sd of [-1, 1]) {
      const xa = sd * h0, xb = sd * h1;
      neonLine(D, R, za, xa - sd * 0.3, zb, xb - sd * 0.3, 0.014, 0.16, od ? N.yel : N.mag, 0.9);
      if (hw) {                                                  // the highway: a concrete wall, a strip of light along its top
        D.poly3(cam, [S3(za, xa, 0), S3(zb, xb, 0), S3(zb, xb, 1.1), S3(za, xa, 1.1)], c('#2a2644'), 1, [-sd, 0, 0]);
        D.poly3(cam, [S3(za, xa, 1.1), S3(zb, xb, 1.1), S3(zb, xb + sd * 0.5, 1.1), S3(za, xa + sd * 0.5, 1.1)], c('#3a3458'));
        D.poly3(cam, [S3(za, xa - sd * 0.01, 0.85), S3(zb, xb - sd * 0.01, 0.85), S3(zb, xb - sd * 0.01, 1.0), S3(za, xa - sd * 0.01, 1.0)], od ? N.yel : sd < 0 ? N.cyan : N.mag, 0.9, [-sd, 0, 0]);
        if (DEEP((za + zb) / 2) > 2) D.poly3(cam, [S3(za, xa + sd * 0.5, 1.1), S3(zb, xb + sd * 0.5, 1.1), S3(zb, xb + sd * 0.5, -3), S3(za, xa + sd * 0.5, -3)], c('#14112a'), 1, [sd, 0, 0]);
      } else {                                                   // the street: a kerb lit along its face, the pavement
        const top = (z, x) => P3(z, x, 0.25), y0 = (z, x) => S3(z, x, 0);
        D.poly3(cam, [y0(za, xa), y0(zb, xb), top(zb, xb), top(za, xa)], c('#1e1a38'));   // (a deck's side, or the arcade's wall, where the ways split)
        D.poly3(cam, [top(za, xa), top(zb, xb), P3(zb, xb, 0.1), P3(za, xa, 0.1)], N.mag, 0.8);
        D.poly3(cam, [top(za, xa), top(za, xa + sd * 5), top(zb, xb + sd * 5), top(zb, xb)], c(Math.floor(za / 3) % 2 ? '#221d38' : '#1f1a34'));
      }
    }
    if (med > 0.01) {                                              // the median: a wall of light between the two ways; over the arcade (or the tunnel), a roof
      const M = (z, x, y) => R.W3(z, x, gy(z) + y);
      D.poly3(cam, [M(za, -ma, -1.4), M(zb, -mb, -1.4), M(zb, -mb, 3.4), M(za, -ma, 3.4)], c('#241e40'), 1, [-1, 0, 0]);
      D.poly3(cam, [M(za, ma, -1.4), M(zb, mb, -1.4), M(zb, mb, 3.4), M(za, ma, 3.4)], c('#241e40'), 1, [1, 0, 0]);
      D.poly3(cam, [M(za, -ma, 3.4), M(za, ma, 3.4), M(zb, mb, 3.4), M(zb, -mb, 3.4)], c('#2e2850'));
      for (const sd of [-1, 1]) D.poly3(cam, [M(za, sd * ma * 1.01, 2.6), M(zb, sd * mb * 1.01, 2.6), M(zb, sd * mb * 1.01, 2.85), M(za, sd * ma * 1.01, 2.85)], sd < 0 ? N.cyan : N.mag, 0.9, [sd, 0, 0]);
      const cov = (za > FORK[0] + 20 && zb < FORK[1] - 26) || (za > FORK2[0] + 18 && zb < FORK2[1] - 24);
      if (cov) {
        const y = 5.2, X1 = h0 + 0.6;
        D.poly3(cam, [M(za, ma, y), M(za, X1, y), M(zb, X1, y), M(zb, mb, y)], c('#15112a'), 1, [0, -1, 0]);
        if (near) for (const x of [ma + 1.5, (ma + X1) / 2, X1 - 1.5]) D.poly3(cam, [M(za, x - 0.12, y - 0.02), M(za, x + 0.12, y - 0.02), M(zb, x + 0.12, y - 0.02), M(zb, x - 0.12, y - 0.02)], za > 1000 ? N.cyan : N.org, 0.85, [0, -1, 0]);
        D.poly3(cam, [M(za, X1, -1.4), M(zb, X1, -1.4), M(zb, X1, y), M(za, X1, y)], c('#1a1530'), 1, [-1, 0, 0]);
        if (Math.floor(zb / 8) !== Math.floor(za / 8) && near) { const z = Math.floor(zb / 8) * 8; text3(D, R, M(z, (ma + X1) / 2, y - 0.6), za > 1000 ? '隧道' : ['拉麵', '電玩', '茶', '夜市'][Math.floor(z / 8) % 4], 0.5, za > 1000 ? N.cyan : N.org, { far: 60 }); }
      }
      if (za < 700 && near) for (const x of [-ma - 1.2, -h0 + 1.2]) neonLine(D, R, za, x, zb, x, 0.02, 0.1, N.cyan, 0.8);   // the maglev's guide rails
    }
  }
  // the magnetic track, up in the air: a slab of dark glass, its edges lit (red where there is no rail), lit from under
  function trackSlice(D, R, za, zb, near) {
    const { cam, S3, t } = R, m = (za + zb) / 2, k = near ? 0 : fogK(R, m), c = v => fog(v, k), open = course.openAt(m);
    if (onFace(m)) facade(D, R, za, zb, near, k);
    if (under(m)) plate(D, R, za, zb, near, k);
    if (inTube(m)) hoops(D, R, za, zb, near);
    const holes = holesIn(za, zb), cuts = [za, zb];
    for (const o of holes) for (const e of [o.z - o.hd, o.z + o.hd]) if (e > za && e < zb) cuts.push(e);
    cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], mm = (a + b) / 2, ha = HW(a), hb = HW(b);
      if (holes.some(o => mm > o.z - o.hd && mm < o.z + o.hd)) continue;
      D.poly3(cam, [S3(a, -ha, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, -hb, 0)], c(Math.floor(a / 4) % 2 ? '#141a33' : '#171d3a'));
      for (const sd of [-1, 1]) {
        D.poly3(cam, [S3(a, sd * ha, 0), S3(b, sd * hb, 0), S3(b, sd * hb, -0.7), S3(a, sd * ha, -0.7)], c('#0c0e22'));
        D.poly3(cam, [S3(a, sd * ha, -0.62), S3(b, sd * hb, -0.62), S3(b, sd * hb, -0.72), S3(a, sd * ha, -0.72)], N.cyan, 0.6);
        neonLine(D, R, a, sd * (ha - 0.18), b, sd * (hb - 0.18), 0.012, 0.22, open ? N.red : N.mag, 0.95);
        if (!open) { D.poly3(cam, [S3(a, sd * ha, 0.45), S3(b, sd * hb, 0.45), S3(b, sd * hb, 0.62), S3(a, sd * ha, 0.62)], N.cyan, 0.85); }   // a low rail of light
      }
      if (near && Math.floor(a / 6) !== Math.floor(b / 6 - 1e-6)) {      // chevrons down the middle, racing
        const z = Math.floor(b / 6) * 6, ph = (t * 2.5) % 1;
        neonLine(D, R, z - 0.4, -0.7, z + 0.2, 0, 0.013, 0.2, N.cyan, 0.4 + 0.4 * ph); neonLine(D, R, z + 0.2, 0, z - 0.4, 0.7, 0.013, 0.2, N.cyan, 0.4 + 0.4 * ph);
      }
    }
    for (const o of holes) for (const [e, dir] of [[o.z - o.hd, 1], [o.z + o.hd, -1]]) if (e >= za && e < zb && !holes.some(p => p !== o && Math.abs((dir > 0 ? p.z + p.hd : p.z - p.hd) - e) < 0.05)) {   // the edge of a gap: a face, a red and white warning strip
      const h = HW(e);
      D.poly3(cam, [S3(e, -h, 0), S3(e, h, 0), S3(e, h, -0.7), S3(e, -h, -0.7)], c('#0c0e22'));
      const pa = 0.75 + 0.25 * Math.sin(t * 10);
      for (let j = 0; j < 6; j++) { const x0 = -h + j * 2 * h / 6; D.poly3(cam, [S3(e - dir * 1.5, x0, 0.015), S3(e - dir * 1.5, x0 + 2 * h / 6, 0.015), S3(e, x0 + 2 * h / 6, 0.015), S3(e, x0, 0.015)], j % 2 ? '#ffffff' : N.red, pa); }
    }
    for (const o of holes) if (o.k === 'void') {                     // upside down, through a gap there is only sky: it glows, so the gap shows from far off
      const a = Math.max(za, o.z - o.hd), b = Math.min(zb, o.z + o.hd);
      if (b <= a) continue;
      const h = HW(a), y = -0.25;                                     // (just under the surface: any deeper and the near edge hides it)
      D.poly3(cam, [S3(a, -h, y), S3(a, h, y), S3(b, h, y), S3(b, -h, y)], '#8a2470');
      D.poly3(cam, [S3(a, -h * 0.7, y + 0.01), S3(a, h * 0.7, y + 0.01), S3(b, h * 0.7, y + 0.01), S3(b, -h * 0.7, y + 0.01)], '#ff7a6a', 0.55 + 0.2 * Math.sin(t * 4));
      const rr = rng(Math.floor(o.z)); for (let j = 0; j < 6; j++) glowDot(D, R, S3(lerp(a, b, rr()), (rr() - 0.5) * 2 * h, y + 0.02), 0.08, '#ffffff', 0.8);
    }
  }
  // the face of a tower she rides along (laid out flat under the track: the twist stands it up): glass, floors of
  // windows, a big sign, the ends of the tower
  const FX = [-48, 30];                                            // (from the street far below to the roof, across the course)
  function facade(D, R, za, zb, near, k) {
    const { cam, S3 } = R, c = v => fog(v, k), T = za < TA[1] ? TA : TB;
    D.poly3(cam, [S3(za, FX[0], -0.05), S3(za, FX[1], -0.05), S3(zb, FX[1], -0.05), S3(zb, FX[0], -0.05)], c(T === TA ? '#121630' : '#16122c'));
    if (near || k < 0.5) {
      const z0 = Math.ceil(za / 2.2) * 2.2;
      for (let z = z0; z < zb - 0.2; z += 2.2) for (let x = FX[0] + 2; x < FX[1] - 2; x += 2.6) {
        if (Math.abs(x) < 6) continue;                             // (not under the track)
        const h = ((Math.sin(z * 12.9 + x * 78.2) * 43758.5) % 1 + 1) % 1;
        D.poly3(cam, [S3(z, x, -0.04), S3(z, x + 1.6, -0.04), S3(z + 1.4, x + 1.6, -0.04), S3(z + 1.4, x, -0.04)], h < 0.3 ? (h < 0.08 ? N.cyan : h < 0.16 ? '#ffd27a' : '#c8a8ff') : c('#1c2244'), h < 0.3 ? 0.75 : 1);
      }
    }
    D.poly3(cam, [S3(za, FX[1] - 0.6, -0.03), S3(za, FX[1], -0.03), S3(zb, FX[1], -0.03), S3(zb, FX[1] - 0.6, -0.03)], T === TA ? N.mag : N.cyan, 0.9);   // its roof line
    for (const e of [T[0], T[1]]) if (e >= za && e < zb) {           // the tower's end
      D.poly3(cam, [S3(e, FX[0], -0.05), S3(e, FX[1], -0.05), S3(e, FX[1], -24), S3(e, FX[0], -24)], c('#0c0f22'));
      D.poly3(cam, [S3(e, -6, -0.06), S3(e, 6, -0.06), S3(e, 6, -0.6), S3(e, -6, -0.6)], N.cyan, 0.5);
    }
    const sz = (T[0] + T[1]) / 2;                                    // a huge sign up its face
    if (sz >= za && sz < zb) text3(D, R, S3(sz, 15, 0.3), T === TA ? '天空酒店' : '霓虹銀行', 3.2, T === TA ? N.mag : N.cyan, { far: 125 });
  }
  // the ring tunnel: hoops of light round the track every 6, light strips along it
  function hoops(D, R, za, zb, near) {
    const { cam } = R, RR = 7.6, AY = 4, Pt = (z, a, r) => R.W3(z, Math.sin(a) * r, gy(z) + AY - Math.cos(a) * r), n = 18;
    for (let z = Math.ceil(za / 6) * 6; z < zb; z += 6) {
      if (z < TUBE[0] - 2 || z > TUBE[1] + 2) continue;
      const col = Math.floor(z / 6) % 2 ? N.mag : N.cyan;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * 2 * PI, a1 = ((i + 1) / n) * 2 * PI;
        if (Math.cos((a0 + a1) / 2) > 0.62) continue;             // (under the track)
        D.poly3(cam, [Pt(z, a0, RR), Pt(z, a1, RR), Pt(z, a1, RR + 0.45), Pt(z, a0, RR + 0.45)], col, 0.9);
      }
      if (near) glowDot(D, R, Pt(z, PI, RR), 0.6, col, 0.6);
    }
    if (za >= TUBE[0] && zb <= TUBE[1]) for (let j = 0; j < 6; j++) {
      const a = PI * (0.35 + j * 0.26), w = 0.035;
      D.poly3(cam, [Pt(za, a - w, RR + 0.2), Pt(za, a + w, RR + 0.2), Pt(zb, a + w, RR + 0.2), Pt(zb, a - w, RR + 0.2)], j % 2 ? N.pur : '#5a3aa8', near ? 0.8 : 0.5);
    }
  }
  // the underside of the floating arcology, laid out flat round the track (upside down, it is a ceiling): panels,
  // seams of light, rows of lamps; its edge where she comes in under it
  function plate(D, R, za, zb, near, k) {
    const { cam, P3 } = R, c = v => fog(v, k);
    const PW = 15;                                                  // (narrow enough that past its edges the sky shows, upside down)
    D.poly3(cam, [P3(za, -PW, -0.06), P3(za, PW, -0.06), P3(zb, PW, -0.06), P3(zb, -PW, -0.06)], c(Math.floor(za / 8) % 2 ? '#15122c' : '#181430'));
    for (const sd of [-1, 1]) { D.poly3(cam, [P3(za, sd * PW, -0.06), P3(zb, sd * PW, -0.06), P3(zb, sd * PW, -4), P3(za, sd * PW, -4)], c('#100d22')); D.poly3(cam, [P3(za, sd * (PW - 0.6), -0.05), P3(zb, sd * (PW - 0.6), -0.05), P3(zb, sd * PW, -0.05), P3(za, sd * PW, -0.05)], sd < 0 ? N.cyan : N.mag, 0.9); }
    if (near) for (const x of [-12, -9, 9, 12]) D.poly3(cam, [P3(za, x - 0.15, -0.05), P3(za, x + 0.15, -0.05), P3(zb, x + 0.15, -0.05), P3(zb, x - 0.15, -0.05)], Math.abs(x) === 12 ? N.cyan : '#3a2a6a', 0.7);
    if (Math.floor(za / 12) !== Math.floor(zb / 12 - 1e-6)) { const z = Math.floor(zb / 12) * 12; D.poly3(cam, [P3(z - 0.15, -PW, -0.05), P3(z - 0.15, PW, -0.05), P3(z + 0.15, PW, -0.05), P3(z + 0.15, -PW, -0.05)], '#3a2a6a', 0.6); }
    for (const e of [FL[1], FL[2]]) if (e >= za && e < zb) D.poly3(cam, [P3(e, -PW, -0.06), P3(e, PW, -0.06), P3(e, PW, -4), P3(e, -PW, -4)], c('#100d22'));
  }
  // the bridge of data: blocks that fly in from every side and lock into place just ahead of her
  const shiftAt = (sz, z, i) => {                                  // where block i at z still is, on its way in (she is at sz)
    const d = z - sz, k = smooth(clamp((d - 26) / 44));
    if (k <= 0) return null;
    const r = rng(Math.floor(z) * 31 + i * 7 + 3), s = k * k;
    return [(r() - 0.5) * 70 * s, (r() - 0.35) * 46 * s, r() * 30 * s];
  };
  function bridgeSlice(D, R, za, zb, near) {
    const { cam, S3, t } = R, holes = holesIn(za, zb);
    for (let z = Math.floor(za / 2) * 2; z < zb; z += 2) {
      if (z < BR[0] + 4 - 1e-6 || holes.some(o => z + 1 > o.z - o.hd && z + 1 < o.z + o.hd)) continue;
      const h = HW(z), n = 5, wc = 2 * h / n, far = Math.abs(z - R.zc) > 45;
      for (let i = 0; i < n; i++) {
        const off = shiftAt(R.sz, z, i), x0 = -h + i * wc, x1 = x0 + wc, a = off ? 1 - 0.55 * smooth(clamp((z - R.sz - 26) / 44)) : 1;
        const P = (zz, x, y) => { const p = S3(zz, x, y); return off ? [p[0] + off[0], p[1] + off[1], p[2] + off[2]] : p; };
        const lit = ((i * 7 + Math.floor(z / 2) * 3) % 5) === 0, top = lit ? '#163a5a' : (i + Math.floor(z / 2)) % 2 ? '#0c1a30' : '#0f2038';
        D.poly3(cam, [P(z, x0, 0), P(z, x1, 0), P(z + 2, x1, 0), P(z + 2, x0, 0)], top, a);
        if (far) continue;
        D.poly3(cam, [P(z, x0, 0), P(z, x1, 0), P(z, x1, -1.2), P(z, x0, -1.2)], '#081222', a, off ? null : [0, 0, -1]);
        D.poly3(cam, [P(z, x0, 0.01), P(z, x1, 0.01), P(z + 0.1, x1, 0.01), P(z + 0.1, x0, 0.01)], N.cyan, 0.7 * a);   // its edges, lit
        D.poly3(cam, [P(z, x0, 0.01), P(z + 2, x0, 0.01), P(z + 2, x0 + 0.1, 0.01), P(z, x0 + 0.1, 0.01)], N.cyan, 0.7 * a);
        if (lit && !off) glowDot(D, R, P(z + 1, (x0 + x1) / 2, 0.05), 0.25, N.cyan, 0.3 + 0.2 * Math.sin(t * 5 + z));
      }
    }
    for (const o of holes) for (const [e, dir] of [[o.z - o.hd, 1], [o.z + o.hd, -1]]) if (e >= za && e < zb) {   // a gap: its edge lit red
      const h = HW(e);
      D.poly3(cam, [S3(e - dir * 0.5, -h, 0.02), S3(e - dir * 0.5, h, 0.02), S3(e, h, 0.02), S3(e, -h, 0.02)], N.red, 0.85);
    }
  }
  function plazaSlice(D, R, za, zb, near) {                        // the plaza: dark tiles on a grid of light, lit edges, stands for the crowd either side
    const { cam, S3, P3 } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k), h0 = HW(za), h1 = HW(zb);
    D.poly3(cam, [P3(za, -90, -0.06), P3(za, 90, -0.06), P3(zb, 90, -0.06), P3(zb, -90, -0.06)], c('#120e26'));
    if (za > LAND + 4) for (const sd of [-1, 1]) {                   // the stands: a step up behind the low wall, a higher one behind it
      for (const [x0, x1, y] of [[0, 3, 0.9], [3, 6, 1.4]]) { D.poly3(cam, [S3(za, sd * (h0 + x0), y), S3(za, sd * (h0 + x1), y), S3(zb, sd * (h1 + x1), y), S3(zb, sd * (h1 + x0), y)], c(x0 ? '#2a2450' : '#241e44')); D.poly3(cam, [S3(za, sd * (h0 + x1), 0), S3(zb, sd * (h1 + x1), 0), S3(zb, sd * (h1 + x1), y + (x0 ? 0 : 0.5)), S3(za, sd * (h0 + x1), y + (x0 ? 0 : 0.5))], c('#1a1636'), 1, [-sd, 0, 0]); }
    }
    D.poly3(cam, [S3(za, -h0, 0), S3(za, h0, 0), S3(zb, h1, 0), S3(zb, -h1, 0)], c(Math.floor(za / 3) % 2 ? '#1a1636' : '#1d1838'));
    if (near) {
      for (let x = -h0 + 1.5; x < h0; x += 3) neonLine(D, R, za, x, zb, x, 0.012, 0.06, N.cyan, 0.3);
      if (Math.floor(za / 3) !== Math.floor(zb / 3 - 1e-6)) { const z = Math.floor(zb / 3) * 3; D.poly3(cam, [S3(z - 0.03, -h0, 0.012), S3(z - 0.03, h0, 0.012), S3(z + 0.03, h0, 0.012), S3(z + 0.03, -h0, 0.012)], N.cyan, 0.3); }
    }
    for (const sd of [-1, 1]) { neonLine(D, R, za, sd * (h0 - 0.2), zb, sd * (h1 - 0.2), 0.014, 0.25, N.mag, 0.9); D.poly3(cam, [S3(za, sd * h0, 0), S3(zb, sd * h1, 0), S3(zb, sd * h1, 0.9), S3(za, sd * h0, 0.9)], c('#2a2448'), 1, [-sd, 0, 0]); neonLine(D, R, za, sd * h0, zb, sd * h1, 0.9, 0.3, N.cyan, 0.8); }
  }

  // ---- obstacles
  function boxP(D, R, F, z0, z1, x0, x1, y0, y1, cols) {           // a box from any point function F(z, x, y)
    const cam = R.cam;
    D.poly3(cam, [F(z0, x0, y0), F(z1, x0, y0), F(z1, x0, y1), F(z0, x0, y1)], cols.side);
    D.poly3(cam, [F(z0, x1, y0), F(z1, x1, y0), F(z1, x1, y1), F(z0, x1, y1)], cols.side);
    D.poly3(cam, [F(z0, x0, y1), F(z0, x1, y1), F(z1, x1, y1), F(z1, x0, y1)], cols.top);
    D.poly3(cam, [F(z0, x0, y0), F(z0, x1, y0), F(z0, x1, y1), F(z0, x0, y1)], cols.front);
  }
  const SIMPLE = { crate: [0.9, '#f0a020'], cop: [2.3, '#2a3a6a'], hcar: [1.4, '#4a2060'], barrier: [0.9, '#c8a020'], holo: [2.8, N.cyan], pillar: [7, '#1c1a38'], laser: [2.7, '#3a2a50'], crawler: [0.8, '#c89a18'], ac: [0.8, '#8a92ac'] };
  const SQ = new Map();                                            // smashed in overdrive (or stomped): since when, for the pieces flying
  function smashed(R, o) {
    if (!R.squash || !R.squash.has(o)) { SQ.delete(o); return -1; }
    if (!SQ.has(o)) SQ.set(o, R.t);
    return R.t - SQ.get(o);
  }
  function debris(D, R, o, age, cols) {                             // in pieces, flying off ahead of her
    if (age > 1.1) return;
    const r = rng(Math.round(o.z * 13 + o.x * 7 + 1));
    for (let j = 0; j < 9; j++) {
      const vx = (r() - 0.5) * 12, vy = 3 + r() * 8, vz = 4 + r() * 14, y = 0.6 + vy * age - 13 * age * age;
      const q = D.toCam(R.cam, R.S3(o.z + vz * age, o.x + vx * age, Math.max(0.1, y)));
      if (q[2] < 0.8) continue;
      const [sx, sy] = D.scr(R.cam, q), s = clamp(R.cam.F / q[2] * (0.3 + (j % 3) * 0.12), 3, 46);
      D.rect(sx - s / 2, sy - s / 2, s, s, cols[j % cols.length], 1 - age / 1.1);
    }
    if (age < 0.3) glowDot(D, R, R.S3(o.z + 2, o.x, 1), 1.8, N.yel, 1 - age / 0.3);
  }
  function groundRing(D, R, z, x, rz, rx, col, a) {
    const p = []; for (let k = 0; k < 12; k++) { const t = k / 12 * 2 * PI; p.push(R.S3(z + Math.cos(t) * rz, x + Math.sin(t) * rx, 0.02)); }
    D.poly3(R.cam, p, col, a);
  }
  function holoObs(D, R, o) {                                       // a wall of light between two emitters; now and then it flickers off
    const { cam, S3, t } = R, up = obUp(o, R.rt), x0 = o.x - o.hw, x1 = o.x + o.hw, H = 2.8;
    const u = ((((o.dive.w * R.rt + o.dive.ph) / (2 * PI)) % 1) + 1) % 1;
    for (const x of [x0, x1]) boxS(D, R, o.z - 0.22, o.z + 0.22, x - 0.2, x + 0.2, 0, 0.55, { top: N.cyan, side: '#1a2a40', front: '#22344e' });
    let a = up;
    if (u > 0.9 || (u > 0.55 && u < 0.65)) a *= Math.sin(t * 70) > 0 ? 1 : 0.25;   // (flickering as it goes and as it comes back)
    if (a < 0.05) { D.poly3(cam, [S3(o.z, x0, 0.5), S3(o.z, x1, 0.5), S3(o.z, x1, 0.58), S3(o.z, x0, 0.58)], N.cyan, 0.45); return; }
    D.poly3(cam, [S3(o.z, x0, 0.5), S3(o.z, x1, 0.5), S3(o.z, x1, H), S3(o.z, x0, H)], N.cyan, 0.3 * a);
    for (let j = 0; j < 5; j++) { const y = 0.6 + j * 0.45 + ((t * 0.8) % 0.45); if (y < H - 0.1) D.poly3(cam, [S3(o.z - 0.01, x0, y), S3(o.z - 0.01, x1, y), S3(o.z - 0.01, x1, y + 0.07), S3(o.z - 0.01, x0, y + 0.07)], '#bffaff', 0.5 * a); }
    for (const [y0, y1] of [[0.5, 0.6], [H - 0.1, H]]) D.poly3(cam, [S3(o.z - 0.02, x0, y0), S3(o.z - 0.02, x1, y0), S3(o.z - 0.02, x1, y1), S3(o.z - 0.02, x0, y1)], N.cyan, 0.95 * a);
    text3(D, R, S3(o.z - 0.05, o.x, 1.65), o.hw > 1.3 ? '禁止通行' : '禁止', 0.55, '#ffffff', { far: 75, alpha: a, stroke: '#0a6f8f' });
  }
  function sweepObs(D, R, o) {                                      // a red laser bar sweeping across, low: hop it
    const { cam, S3 } = R, x = obX(o, R.rt), z = o.z, w = o.hw;
    groundRing(D, R, z, x, 1.1, w + 0.8, N.red, 0.3);
    for (const sd of [-1, 1]) boxS(D, R, z - 0.2, z + 0.2, x + sd * w - 0.16, x + sd * w + 0.16, 0, 0.85, { top: N.red, side: '#2a1020', front: '#3a1428' });
    D.poly3(cam, [S3(z, x - w, 0.3), S3(z, x + w, 0.3), S3(z, x + w, 0.7), S3(z, x - w, 0.7)], N.red, 0.9);
    D.poly3(cam, [S3(z - 0.01, x - w, 0.45), S3(z - 0.01, x + w, 0.45), S3(z - 0.01, x + w, 0.55), S3(z - 0.01, x - w, 0.55)], '#ffffff', 0.95);
    glowDot(D, R, S3(z, x, 0.5), 0.5, N.red, 0.6);
  }
  function droneObs(D, R, o) {                                      // two police drones swooping at her, a striped bar slung between them at head height: duck
    const { cam, P3, S3, t } = R, z = obZ(o, R.sz), y = o.y0 + 0.3, xa = o.x - o.hw + 0.6, xb = o.x + o.hw - 0.6;
    const age = smashed(R, o);
    if (age >= 0) { debris(D, R, { z, x: o.x }, age, ['#3a4060', N.red, N.cyan]); return; }
    D.poly3(cam, [P3(z, xa, y), P3(z, xb, y), S3(z, xb + 0.6, 0.02), S3(z, xa - 0.6, 0.02)], N.red, 0.07);   // its searchlight
    const n = 6; for (let k = 0; k < n; k++) { const x0 = lerp(xa, xb, k / n), x1 = lerp(xa, xb, (k + 1) / n); D.poly3(cam, [P3(z, x0, y), P3(z, x1, y), P3(z, x1, y + 0.32), P3(z, x0, y + 0.32)], k % 2 ? '#1a1a1a' : N.yel); }
    for (const x of [xa, xb]) {
      boxP(D, R, P3, z - 0.45, z + 0.45, x - 0.55, x + 0.55, y + 0.2, y + 0.6, { top: '#4a5070', side: '#2a3048', front: '#3a4060' });
      for (const sd of [-1, 1]) { const s = Math.abs(Math.sin(t * 40 + sd)); D.poly3(cam, [P3(z, x + sd * 0.55 - 0.45 * s, y + 0.7), P3(z, x + sd * 0.55 + 0.45 * s, y + 0.7), P3(z, x + sd * 0.55 + 0.45 * s, y + 0.74), P3(z, x + sd * 0.55 - 0.45 * s, y + 0.74)], '#c8d0e8', 0.7); }
      glowDot(D, R, P3(z - 0.5, x, y + 0.4), 0.18, Math.floor(t * 6) % 2 ? N.red : N.cyan, 0.9);
    }
    duckHint(D, R, z, [o.x - 1.5, o.x + 1.5], o.y0 - 0.25);
  }
  function crateObs(D, R, o) {                                      // a bright amber crate edged with light, a dark band round it: hop it (bright, so it shows on the dark road)
    const h = o.h + 0.05, w = o.hw, age = smashed(R, o);
    if (age >= 0) { debris(D, R, o, age, ['#f0a020', N.cyan, N.yel]); return; }
    groundRing(D, R, o.z, o.x, 1.5, w + 1.0, N.yel, 0.35 + 0.15 * Math.sin(R.t * 6 + o.z));
    boxS(D, R, o.z - w, o.z + w, o.x - w, o.x + w, 0, h, { top: '#ffd060', side: '#c87a10', front: '#f0a020' });
    const { S3 } = R, z0 = o.z - w - 0.01;
    D.poly3(R.cam, [S3(z0, o.x - w, h * 0.42), S3(z0, o.x + w, h * 0.42), S3(z0, o.x + w, h * 0.62), S3(z0, o.x - w, h * 0.62)], '#1a1030', 0.95);
    for (const [a, b] of [[[o.x - w, 0], [o.x - w, h]], [[o.x + w, 0], [o.x + w, h]], [[o.x - w, h], [o.x + w, h]]]) D.poly3(R.cam, [S3(z0, a[0] - 0.05, a[1]), S3(z0, b[0] + 0.05, b[1]), S3(z0, b[0] + 0.05, b[1] + (a[1] === b[1] ? 0.08 : 0)), S3(z0, a[0] - 0.05, a[1] + (a[1] === b[1] ? 0.08 : 0))], N.cyan, 0.9);
    for (const x of [o.x - w, o.x + w]) D.poly3(R.cam, [S3(z0, x - 0.06, 0), S3(z0, x + 0.06, 0), S3(z0, x + 0.06, h), S3(z0, x - 0.06, h)], N.cyan, 0.9);
  }
  function pillarObs(D, R, o, k) {                                  // a column of black glass ringed with light
    const { cam, S3 } = R, n = 6, rr = o.hw, H = 7, c = v => fog(v, k);
    for (let i = 0; i < n; i++) { const a0 = i / n * 2 * PI, a1 = (i + 1) / n * 2 * PI, P = (a, y) => S3(o.z + Math.cos(a) * rr, o.x + Math.sin(a) * rr, y); D.poly3(cam, [P(a0, 0), P(a1, 0), P(a1, H), P(a0, H)], c(i % 2 ? '#1c1a38' : '#16142e'), 1, [Math.sin((a0 + a1) / 2), 0, Math.cos((a0 + a1) / 2)]); }
    for (const y of [1.2, 3.4, 5.6]) D.poly3(cam, [S3(o.z - rr - 0.02, o.x - rr, y), S3(o.z - rr - 0.02, o.x + rr, y), S3(o.z - rr - 0.02, o.x + rr, y + 0.25), S3(o.z - rr - 0.02, o.x - rr, y + 0.25)], y > 3 ? N.mag : N.cyan, 0.95);
    glowDot(D, R, S3(o.z, o.x, H + 0.3), 0.4, N.red, 0.5 + 0.4 * Math.sin(R.t * 3 + o.z));
  }
  function kioskObs(D, R, o, k, words) {                            // the nose of a fork: a block of vending machines, a sign over it pointing both ways
    const { cam, S3 } = R, w = o.hw, c = v => fog(v, k);
    boxS(D, R, o.z - o.hd, o.z + o.hd, o.x - w, o.x + w, 0, 3.2, { top: c('#2a2448'), side: c('#1e1a38'), front: c('#241e40') });
    for (let j = 0; j < 3; j++) { const x0 = o.x - w + 0.15 + j * (2 * w - 0.3) / 3; D.poly3(cam, [S3(o.z - o.hd - 0.01, x0 + 0.06, 0.5), S3(o.z - o.hd - 0.01, x0 + (2 * w - 0.3) / 3 - 0.06, 0.5), S3(o.z - o.hd - 0.01, x0 + (2 * w - 0.3) / 3 - 0.06, 2.9), S3(o.z - o.hd - 0.01, x0 + 0.06, 2.9)], [N.cyan, N.mag, N.yel][j], 0.75); }
    D.poly3(cam, [S3(o.z, o.x - 3.4, 3.6), S3(o.z, o.x + 3.4, 3.6), S3(o.z, o.x + 3.4, 4.6), S3(o.z, o.x - 3.4, 4.6)], '#120e24');
    text3(D, R, S3(o.z - 0.1, o.x, 4.1), words, 0.6, N.yel, { far: 110 });
  }
  function laserObs(D, R, o) {                                       // a laser gate: two posts, beams firing across between them in turn
    const { cam, S3, t } = R, b = obBurst(o, R.rt), x0 = o.x - o.hw, x1 = o.x + o.hw;
    const u = ((((o.burst.w * R.rt + o.burst.ph) / (2 * PI)) % 1) + 1) % 1, warn = b <= 0 && u > 0.38;
    for (const x of [x0, x1]) { boxS(D, R, o.z - 0.25, o.z + 0.25, x - 0.18, x + 0.18, 0, 2.7, { top: '#3a2a50', side: '#1c1430', front: '#261a3c' }); glowDot(D, R, S3(o.z - 0.3, x, 2.4), 0.2, warn ? (Math.floor(t * 12) % 2 ? N.yel : '#5a4a10') : b > 0 ? N.red : '#5a1a2a', 0.9); }
    if (b <= 0.3) { if (warn) D.poly3(cam, [S3(o.z, x0, 0.02), S3(o.z, x1, 0.02), S3(o.z + 0.3, x1, 0.02), S3(o.z + 0.3, x0, 0.02)], N.yel, 0.5); return; }
    for (const y of [0.35, 0.8, 1.25, 1.7, 2.15]) {
      D.poly3(cam, [S3(o.z, x0, y - 0.07), S3(o.z, x1, y - 0.07), S3(o.z, x1, y + 0.07), S3(o.z, x0, y + 0.07)], N.red, 0.9 * b);
      D.poly3(cam, [S3(o.z - 0.01, x0, y - 0.02), S3(o.z - 0.01, x1, y - 0.02), S3(o.z - 0.01, x1, y + 0.02), S3(o.z - 0.01, x0, y + 0.02)], '#ffffff', b);
    }
    groundRing(D, R, o.z, o.x, 0.8, o.hw + 0.4, N.red, 0.3 * b);
  }
  const SIGNW = ['拉麵', '電玩', '茶', '夜市', '書店'];
  function signObs(D, R, o) {                                         // a neon sign hung low over the arcade: duck
    const { cam, P3 } = R, x0 = o.x - o.hw + 0.3, x1 = o.x + o.hw - 0.3, y = o.y0 + 0.05;
    const lift = R.CO.liftAt(o.z, o.x), Q = (z, x, yy) => P3(z, x, yy + lift);
    D.poly3(cam, [Q(o.z, x0, y), Q(o.z, x1, y), Q(o.z, x1, y + 0.85), Q(o.z, x0, y + 0.85)], '#1a1030');
    for (const [a, b] of [[y, y + 0.07], [y + 0.78, y + 0.85]]) D.poly3(cam, [Q(o.z - 0.01, x0, a), Q(o.z - 0.01, x1, a), Q(o.z - 0.01, x1, b), Q(o.z - 0.01, x0, b)], N.mag, 0.95);
    for (const x of [x0 + 0.5, x1 - 0.5]) D.poly3(cam, [Q(o.z, x - 0.04, y + 0.85), Q(o.z, x + 0.04, y + 0.85), Q(o.z, x + 0.04, 5.2), Q(o.z, x - 0.04, 5.2)], '#3a3058');
    text3(D, R, Q(o.z - 0.05, o.x, y + 0.42), SIGNW[Math.floor(o.z / 7) % SIGNW.length], 0.55, N.yel, { far: 70 });
    duckHint(D, R, o.z, [o.x - 2, o.x + 2], y - 0.25 + lift);
  }
  function acObs(D, R, o) {                                           // an air-conditioning unit on the tower's face: hop it
    const { cam, S3, t } = R, w = o.hw, z = o.z;
    groundRing(D, R, z, o.x, 1.0, w + 0.6, N.cyan, 0.25);
    boxS(D, R, z - 0.5, z + 0.5, o.x - w, o.x + w, 0, o.h, { top: '#a8b0c8', side: '#6a7290', front: '#8a92ac' });
    const c = [z, o.x], P = []; for (let k = 0; k < 10; k++) { const a = k / 10 * 2 * PI; P.push(S3(c[0] + Math.cos(a) * 0.38, c[1] + Math.sin(a) * 0.38, o.h + 0.01)); }
    D.poly3(cam, P, '#2a2e40');
    const a = t * 14; D.poly3(cam, [S3(z + Math.cos(a) * 0.34, o.x + Math.sin(a) * 0.34, o.h + 0.02), S3(z - Math.cos(a) * 0.34, o.x - Math.sin(a) * 0.34, o.h + 0.02), S3(z - Math.cos(a) * 0.34 + 0.08, o.x - Math.sin(a) * 0.34, o.h + 0.02), S3(z + Math.cos(a) * 0.34 + 0.08, o.x + Math.sin(a) * 0.34, o.h + 0.02)], '#c8d0e8');
    D.poly3(cam, [S3(z - 0.51, o.x - w, o.h * 0.4), S3(z - 0.51, o.x + w, o.h * 0.4), S3(z - 0.51, o.x + w, o.h * 0.55), S3(z - 0.51, o.x - w, o.h * 0.55)], N.yel, 0.9);
  }
  function cradleObs(D, R, o) {                                       // the window cleaners' cradle, hung on cables from the roof: go round
    const { cam, S3 } = R, w = o.hw, z = o.z;
    boxS(D, R, z - o.hd, z + o.hd, o.x - w, o.x + w, 0, 1.3, { top: '#3a3a3a', side: '#c8a020', front: '#e8b828' });
    D.poly3(cam, [S3(z - o.hd - 0.01, o.x - w, 0.9), S3(z - o.hd - 0.01, o.x + w, 0.9), S3(z - o.hd - 0.01, o.x + w, 1.0), S3(z - o.hd - 0.01, o.x - w, 1.0)], '#1a1a1a');
    for (const x of [o.x - w + 0.2, o.x + w - 0.2]) D.poly3(cam, [S3(z, x, 1.3), S3(z + 0.05, x, 1.3), S3(z + 0.05, FX[1], 0.3), S3(z, FX[1], 0.3)], '#9aa0b8', 0.9);   // its cables, up to the roof
    glowDot(D, R, S3(z - o.hd, o.x, 1.45), 0.2, N.org, 0.8);
  }
  function cableObs(D, R, o) {                                         // a cleaners' line strung across, little flags on it: duck
    const { cam, P3 } = R, h = o.hw, y = o.y0 + 0.3;
    D.poly3(cam, [P3(o.z, -h, y), P3(o.z, h, y), P3(o.z, h, y + 0.1), P3(o.z, -h, y + 0.1)], '#d8dcf0');
    for (let x = -h + 0.6; x < h - 0.3; x += 1.1) D.poly3(cam, [P3(o.z - 0.01, x, y), P3(o.z - 0.01, x + 0.7, y), P3(o.z - 0.01, x + 0.35, y - 0.55)], NC[Math.round((x + h) / 1.1) % NC.length]);
    duckHint(D, R, o.z, [-2, 2], y - 0.7);
  }
  function crawlerObs(D, R, o) {                                       // a maintenance crawler scuttling at her: hop it, or land on it
    const { cam, S3, t } = R, z = obZ(o, R.sz), x = o.x, sq = R.squash && R.squash.has(o), h = sq ? 0.18 : 0.75, w = o.hw;
    groundRing(D, R, z, x, 1.0, w + 0.5, N.yel, sq ? 0.1 : 0.28);
    if (!sq) for (let j = 0; j < 3; j++) for (const sd of [-1, 1]) { const ph = Math.sin(t * 16 + j * 2 + sd), zz = z - 0.5 + j * 0.5; D.poly3(cam, [S3(zz, x + sd * w * 0.8, 0.45), S3(zz + 0.08, x + sd * w * 0.8, 0.45), S3(zz + 0.08 + ph * 0.15, x + sd * (w + 0.45), 0), S3(zz + ph * 0.15, x + sd * (w + 0.45), 0)], '#5a5a78'); }
    boxS(D, R, z - 0.6, z + 0.6, x - w * 0.8, x + w * 0.8, sq ? 0 : 0.3, h, { top: '#e8b828', side: '#8a6a10', front: '#c89a18' });
    if (!sq) { glowDot(D, R, S3(z - 0.62, x, 0.55), 0.22, N.cyan, 0.95); D.poly3(cam, [S3(z - 0.61, x - w * 0.8, 0.62), S3(z - 0.61, x + w * 0.8, 0.62), S3(z - 0.61, x + w * 0.8, 0.68), S3(z - 0.61, x - w * 0.8, 0.68)], '#1a1a1a'); }
  }
  function fanObs(D, R, o) {                                            // a vent fan in the floor: blasting now and then (its rim blinks first)
    const { cam, S3, t } = R, b = obBurst(o, R.rt), N0 = 14, u = ((((o.burst.w * R.rt + o.burst.ph) / (2 * PI)) % 1) + 1) % 1, warn = b <= 0 && u > 0.38;
    const ring = (s, up) => { const p = []; for (let k = 0; k < N0; k++) { const a = k / N0 * 2 * PI; p.push(S3(o.z + Math.cos(a) * 1.0 * s, o.x + Math.sin(a) * o.hw * s, up)); } return p; };
    D.poly3(cam, ring(1.2, 0.02), warn && Math.floor(t * 12) % 2 ? N.org : '#3a3458');
    D.poly3(cam, ring(0.95, 0.03), '#0c0a18');
    const a0 = t * (b > 0 ? 30 : 3); for (let k = 0; k < 4; k++) { const a = a0 + k * PI / 2; D.poly3(cam, [S3(o.z, o.x, 0.04), S3(o.z + Math.cos(a) * 0.9, o.x + Math.sin(a) * o.hw * 0.9, 0.04), S3(o.z + Math.cos(a + 0.4) * 0.9, o.x + Math.sin(a + 0.4) * o.hw * 0.9, 0.04)], '#6a6a88'); }
    if (b <= 0) return;
    const H = 6 * b;
    for (const [dx, dz] of [[1, 0], [0, 1]]) { const P = (s, y) => S3(o.z + dz * s, o.x + dx * s * o.hw, y); D.poly3(cam, [P(-0.9, 0), P(0.9, 0), P(0.7, H), P(-0.7, H)], '#e8f0ff', 0.25); }
    for (let k = 0; k < 8; k++) { const ph = (t * 2.2 + k / 8) % 1; D.poly3(cam, [S3(o.z, o.x + (k / 8 - 0.5) * o.hw * 1.4, ph * H), S3(o.z, o.x + (k / 8 - 0.5) * o.hw * 1.4 + 0.06, ph * H), S3(o.z, o.x + (k / 8 - 0.5) * o.hw * 1.4 + 0.06, ph * H + 0.9), S3(o.z, o.x + (k / 8 - 0.5) * o.hw * 1.4, ph * H + 0.9)], '#ffffff', 0.6 * (1 - ph)); }
  }
  function pipeObs(D, R, o) {                                           // a bundle of pipes across, low: duck
    const { cam, P3 } = R, h = o.hw;
    for (const [y, col] of [[o.y0 + 0.05, '#4a4a6a'], [o.y0 + 0.4, '#3a3a58'], [o.y0 + 0.72, '#5a4a7a']]) {
      boxP(D, R, P3, o.z - 0.18, o.z + 0.18, -h, h, y, y + 0.3, { top: '#6a6a8a', side: col, front: col });
      D.poly3(cam, [P3(o.z - 0.19, -h, y + 0.12), P3(o.z - 0.19, h, y + 0.12), P3(o.z - 0.19, h, y + 0.17), P3(o.z - 0.19, -h, y + 0.17)], N.org, 0.6);
    }
    duckHint(D, R, o.z, [-2.5, 2.5], o.y0 - 0.25);
  }
  function copObs(D, R, o) {                                             // a robot police officer, arm out: in overdrive, bowled over
    const age = smashed(R, o);
    if (age >= 0) { debris(D, R, o, age, ['#2a3a6a', '#c8d0e8', N.red, N.cyan]); return; }
    const { S3, t } = R, x = o.x, z = o.z;
    boxS(D, R, z - 0.35, z + 0.35, x - 0.5, x + 0.5, 0, 1.6, { top: '#3a4a7a', side: '#1a2448', front: '#2a3a6a' });
    boxS(D, R, z - 0.3, z + 0.3, x - 0.35, x + 0.35, 1.65, 2.25, { top: '#c8d0e8', side: '#8a92ac', front: '#a8b0c8' });
    D.poly3(R.cam, [S3(z - 0.31, x - 0.3, 1.9), S3(z - 0.31, x + 0.3, 1.9), S3(z - 0.31, x + 0.3, 2.05), S3(z - 0.31, x - 0.3, 2.05)], N.cyan);
    glowDot(D, R, S3(z, x - 0.2, 2.4), 0.2, Math.floor(t * 8) % 2 ? N.red : '#3a6aff', 0.95); glowDot(D, R, S3(z, x + 0.2, 2.4), 0.2, Math.floor(t * 8) % 2 ? '#3a6aff' : N.red, 0.95);
  }
  function hcarObs(D, R, o) {                                             // a parked hover car, glowing underneath
    const age = smashed(R, o);
    if (age >= 0) { debris(D, R, o, age, ['#5a1a6a', '#c8d0e8', N.mag, N.yel]); return; }
    const { S3, t } = R, x = o.x, z = o.z, w = o.hw, l = o.hd, hov = 0.35 + 0.05 * Math.sin(t * 3 + z);
    groundRing(D, R, z, x, l + 0.3, w + 0.3, N.mag, 0.45);
    boxS(D, R, z - l, z + l, x - w, x + w, hov, hov + 0.6, { top: '#4a2060', side: '#3a1850', front: '#5a2a70', back: '#3a1850' });
    boxS(D, R, z - l * 0.4, z + l * 0.5, x - w * 0.8, x + w * 0.8, hov + 0.6, hov + 1.15, { top: '#2a1a40', side: '#1a3a5a', front: '#2a5a7a' });
    for (const sd of [-1, 1]) glowDot(D, R, S3(z - l - 0.02, x + sd * w * 0.7, hov + 0.35), 0.18, '#ffffff', 0.9);
  }
  function barrierObs(D, R, o) {                                          // a police barricade: hop it
    const age = smashed(R, o);
    if (age >= 0) { debris(D, R, o, age, [N.yel, '#1a1a1a', '#c8d0e8']); return; }
    const { S3 } = R, z = o.z, w = o.hw;
    for (const x of [o.x - w + 0.15, o.x + w - 0.15]) boxS(D, R, z - 0.2, z + 0.2, x - 0.07, x + 0.07, 0, o.h, { top: '#c8d0e8', side: '#6a7290', front: '#8a92ac' });
    const n = 6; for (let k = 0; k < n; k++) { const x0 = lerp(o.x - w, o.x + w, k / n), x1 = lerp(o.x - w, o.x + w, (k + 1) / n); D.poly3(R.cam, [S3(z - 0.21, x0, o.h * 0.5), S3(z - 0.21, x1, o.h * 0.5), S3(z - 0.21, x1, o.h), S3(z - 0.21, x0, o.h)], k % 2 ? '#1a1a1a' : N.yel); }
    glowDot(D, R, S3(z - 0.25, o.x, o.h + 0.1), 0.15, N.org, 0.9);
  }

  // ---- scenery pieces
  function tower(D, R, b, k) {                                           // a tower: glass and concrete, floors of lit windows, neon on its edges, a sign down its side
    const { cam } = R, X = R.wx(b.z, b.x), y0 = gy(b.z) + b.base, y1 = gy(b.z) + b.top, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, c = v => fog(v, k), sd = Math.sign(b.x) || 1;
    if (y1 < y0 + 2) return;
    D.box3(cam, X - b.w / 2, X + b.w / 2, y0, y1, z0, z1, { side: c(b.col), rear: c(mixHex(b.col, '#000000', 0.25)), top: c('#0e0b1e') });
    const Xi = X - sd * (b.w / 2 + 0.03);
    if (k < 0.8) {
      const r = rng(b.seed), fy0 = Math.max(y0 + 2, cam.C[1] - 70), a = 0.85 * (1 - k);
      const near = Math.abs(b.z - R.zc) < 70;                    // (windows one by one up close; far off, a lit band now and then)
      for (let y = Math.ceil((fy0 - y0) / 3.2) * 3.2 + y0; y < y1 - 1.5; y += 3.2) {
        const col = r() < 0.6 ? '#ffd27a' : r() < 0.5 ? N.cyan : '#c8a8ff';
        if (!near) { if (r() < 0.3) { const s0 = r() * 0.6; D.poly3(cam, [[Xi, y, lerp(z0, z1, s0)], [Xi, y, lerp(z0, z1, s0 + 0.3)], [Xi, y + 1, lerp(z0, z1, s0 + 0.3)], [Xi, y + 1, lerp(z0, z1, s0)]], col, a, [-sd, 0, 0]); } continue; }
        for (let zz = z0 + 0.8; zz < z1 - 1.6; zz += 2.4) if (r() < 0.32) D.poly3(cam, [[Xi, y, zz], [Xi, y, zz + 1.4], [Xi, y + 1.3, zz + 1.4], [Xi, y + 1.3, zz]], col, a, [-sd, 0, 0]);
        for (let xx = X - b.w / 2 + 0.8; xx < X + b.w / 2 - 1.6; xx += 2.4) if (r() < 0.32) D.poly3(cam, [[xx, y, z0 - 0.03], [xx + 1.4, y, z0 - 0.03], [xx + 1.4, y + 1.3, z0 - 0.03], [xx, y + 1.3, z0 - 0.03]], col, a, [0, 0, -1]);
      }
    }
    D.poly3(cam, [[Xi, y1 - 0.5, z0], [Xi, y1 - 0.5, z1], [Xi, y1, z1], [Xi, y1, z0]], b.neon, 0.95 * (1 - k * 0.6), [-sd, 0, 0]);   // its edge lit
    D.poly3(cam, [[X - b.w / 2, y1 - 0.5, z0 - 0.04], [X + b.w / 2, y1 - 0.5, z0 - 0.04], [X + b.w / 2, y1, z0 - 0.04], [X - b.w / 2, y1, z0 - 0.04]], b.neon, 0.95 * (1 - k * 0.6), [0, 0, -1]);
    if (b.sign && k < 0.6) {                                              // a sign down its side, one character over another
      const sy0 = b.top > 10 ? gy(b.z) + 3.5 : y1 - 2 - 2.2 * b.sign.length, Xs = Xi - sd * 0.7, zs = z0 + 1.2;
      D.poly3(cam, [[Xs, sy0, zs - 0.9], [Xs, sy0, zs + 0.9], [Xs, sy0 + 2.2 * b.sign.length + 0.6, zs + 0.9], [Xs, sy0 + 2.2 * b.sign.length + 0.6, zs - 0.9]], '#120a24');
      [...b.sign].forEach((ch, j) => text3(D, R, [Xs - sd * 0.05, sy0 + 2.2 * (b.sign.length - j) - 0.8, zs], ch, 1.7, b.neon, { far: 100, world: true }));
    }
    if (k < 0.6) glowDot(D, R, [X, y1 + 1.6, b.z], 0.3, N.red, 0.5 + 0.5 * Math.abs(Math.sin(R.t * 2 + b.seed)));
  }
  function hanging(D, R, b, k) {                                         // a block of the city hanging under the arcology (to her, standing on it)
    const c = v => fog(v, k), F = (z, x, y) => R.P3(z, x, y), z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, sd = Math.sign(b.x);
    boxP(D, R, F, z0, z1, x0, x1, 0, b.h, { top: c('#100c22'), side: c(b.col), front: c(mixHex(b.col, '#000000', 0.1)) });
    if (k > 0.7) return;
    const r = rng(b.seed), xi = sd > 0 ? x0 - 0.03 : x1 + 0.03;
    for (let y = 1.5; y < b.h - 1; y += 2.6) if (r() < 0.75) { const col = r() < 0.5 ? '#ffd27a' : N.cyan; D.poly3(R.cam, [F(z0 + 0.5, xi, y), F(z1 - 0.5, xi, y), F(z1 - 0.5, xi, y + 1), F(z0 + 0.5, xi, y + 1)], col, 0.8 * (1 - k)); }
    D.poly3(R.cam, [F(z0 - 0.03, x0, b.h - 0.4), F(z0 - 0.03, x1, b.h - 0.4), F(z0 - 0.03, x1, b.h), F(z0 - 0.03, x0, b.h)], b.neon, 0.9);
  }
  const PIXART = {
    koi: { cs: 1, rows: ['......OOO.......', '....OOWWOOO.....', '..OOWWOOOOOO..OO', '.OOOOOOOROOOOOO.', 'OKOOOOORROOOOOO.', '.OOOOOOOOOOOO.OO', '..OOWWOOOOO.....', '....OOO.........'], cols: { O: '#ff8a2a', W: '#ffffff', R: '#ff3355', K: '#1a1a1a' } },
    cat: { cs: 1, rows: ['.M........M.', 'MMM......MMM', 'MMMMMMMMMMMM', 'MMWWMMMMWWMM', 'MMWKMMMMWKMM', 'MMMMMMMMMMMM', 'MMMMMPPMMMMM', '.MMMMMMMMMM.', '..MMMMMMMM..', '....MMMM....'], cols: { M: '#ff3fd0', W: '#ffffff', K: '#1a1a1a', P: '#ffe14a' } },
    jelly: { cs: 1, rows: ['...CCCC...', '.CCWWCCCC.', 'CCWCCCCCCC', 'CCCCCCCCCC', 'CCCCCCCCCC', '.C.C.C.C.C', '.C.C.C.C.C', 'C.C.C.C.C.', 'C.C.C.C.C.', '.C...C...C', '.C...C....', 'C.........'], cols: { C: '#2ff3ff', W: '#ffffff' } },
  };
  function pixAt(D, R, art, p, size, alpha) {                            // pixel art `size` world units wide, facing the camera at p
    const q = D.toCam(R.cam, p);
    if (q[2] < 1) return;
    const [sx, sy] = D.scr(R.cam, q), cs = R.cam.F / q[2] * size / art.rows[0].length, g = D.ctx;
    g.save(); g.translate(sx, sy); if (R.roll) g.rotate(R.roll);
    D.pix(art.rows, art.cols, 0, cs * art.rows.length / 2, cs, alpha);
    g.restore();
  }
  function holoAd(D, R, h, k) {                                          // a hologram advert floating by the course: a frame of light, something swimming in it
    const { cam, t } = R, y = gy(h.z) + h.y, w = h.w, ht = w * 0.62, X = R.wx(h.z, h.x), P = (dx, dy) => [X + dx, y + dy, h.z];
    const fl = Math.sin(t * 37 + h.z) > 0.93 ? 0.4 : 1, a = (1 - k * 0.7) * fl;
    D.poly3(cam, [P(-w / 2, -ht / 2), P(w / 2, -ht / 2), P(w / 2, ht / 2), P(-w / 2, ht / 2)], '#2ff3ff', 0.08 * a);
    for (const [x0, y0, x1, y1] of [[-w / 2, -ht / 2, w / 2, -ht / 2 + 0.25], [-w / 2, ht / 2 - 0.25, w / 2, ht / 2], [-w / 2, -ht / 2, -w / 2 + 0.25, ht / 2], [w / 2 - 0.25, -ht / 2, w / 2, ht / 2]]) D.poly3(cam, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], h.kind === 'cat' ? N.mag : N.cyan, 0.8 * a);
    if (DEEP(h.z) < 2) D.poly3(cam, [[X - 0.3, gy(h.z) - 1, h.z + 0.1], [X + 0.3, gy(h.z) - 1, h.z + 0.1], [X + 0.3, y - ht / 2, h.z + 0.1], [X - 0.3, y - ht / 2, h.z + 0.1]], '#241e40');   // its pole
    if (h.kind === 'text') { text3(D, R, P(0, 0.6), '不夜城', w * 0.22, N.yel, { far: 125, alpha: a, world: true }); text3(D, R, P(0, -ht * 0.28), 'NEON  CITY', w * 0.09, N.cyan, { far: 125, alpha: a, world: true }); return; }
    const art = PIXART[h.kind], sw = Math.sin(t * 1.3 + h.z) * w * 0.12;
    pixAt(D, R, art, P(sw, Math.sin(t * 2 + h.z) * ht * 0.08), w * 0.6, 0.75 * a);
  }
  function flyers(D, R, zc) {                                            // traffic in the sky: rows of cars going by, lights on (below her, under the arcology)
    const { cam, t } = R, flip = zc > FL[0] - 30 && zc < FL[3] + 30;
    for (const L of SCENE.lanes) {
      const y0 = flip ? -L.y : L.y;
      for (let z = Math.floor((zc - 40 - L.ph - t * L.v) / L.gap) * L.gap + L.ph + t * L.v; z < zc + 130; z += L.gap) {
        if (z < zc - 40) continue;
        const X = R.wx(z, L.x), Y = gy(z) + y0, d = z - zc;
        R.add(z, () => {
          if (d > 70) { glowDot(D, R, [X, Y, z], 0.5, L.v > 0 ? N.red : '#ffffff', 0.7); return; }
          D.box3(cam, X - 0.7, X + 0.7, Y, Y + 0.6, z - 1.5, z + 1.5, { side: '#2a2448', rear: '#1a1630', top: '#3a3458', front: '#1a1630' });
          glowDot(D, R, [X, Y + 0.3, z - 1.55], 0.25, L.v > 0 ? N.red : '#ffffff', 0.9);
          D.poly3(cam, [[X - 0.7, Y - 0.02, z - 1.4], [X + 0.7, Y - 0.02, z - 1.4], [X + 0.7, Y - 0.02, z + 1.4], [X - 0.7, Y - 0.02, z + 1.4]], L.col, 0.6);
        }, false, L.x);
      }
    }
  }
  function roadSign(D, R, s) {                                            // a gantry sign over the side of the course
    const X = R.wx(s.z, s.sd * (HW(s.z) + 3)), y = gy(s.z), k = fogK(R, s.z, s.sd * 8);
    D.poly3(R.cam, [[X - 0.15, y - 1, s.z], [X + 0.15, y - 1, s.z], [X + 0.15, y + 4, s.z], [X - 0.15, y + 4, s.z]], fog('#3a3458', k));
    D.poly3(R.cam, [[X - 4, y + 4, s.z - 0.01], [X + 4, y + 4, s.z - 0.01], [X + 4, y + 5.6, s.z - 0.01], [X - 4, y + 5.6, s.z - 0.01]], '#0a0820');
    D.poly3(R.cam, [[X - 4, y + 4, s.z - 0.02], [X + 4, y + 4, s.z - 0.02], [X + 4, y + 4.12, s.z - 0.02], [X - 4, y + 4.12, s.z - 0.02]], N.cyan, 0.9);
    text3(D, R, [X, y + 4.8, s.z - 0.05], s.t, s.t.length > 7 ? 0.6 : 0.85, N.yel, { far: 100, world: true });
  }
  function arch(D, R, z, words, col, big = false) {                       // a gateway of neon over the course (turned with the track)
    const { cam, P3 } = R, h = HW(z) + 0.8, y1 = big ? 8 : 6.4, k = fogK(R, z), c = v => fog(v, k);
    for (const sd of [-1, 1]) {
      boxP(D, R, P3, z - 0.35, z + 0.35, sd * h - 0.35, sd * h + 0.35, 0, y1, { top: c('#2a2448'), side: c('#1a1630'), front: c('#221d3c') });
      D.poly3(cam, [P3(z - 0.37, sd * (h - 0.36), 0), P3(z - 0.37, sd * (h - 0.2), 0), P3(z - 0.37, sd * (h - 0.2), y1 - 1.1), P3(z - 0.37, sd * (h - 0.36), y1 - 1.1)], col, 0.95);
    }
    D.poly3(cam, [P3(z, -h - 0.6, y1 - 1.1), P3(z, h + 0.6, y1 - 1.1), P3(z, h + 0.6, y1), P3(z, -h - 0.6, y1)], c('#120c26'));
    D.poly3(cam, [P3(z - 0.01, -h, y1 - 1.1), P3(z - 0.01, h, y1 - 1.1), P3(z - 0.01, h, y1 - 0.98), P3(z - 0.01, -h, y1 - 0.98)], col, 0.95);
    D.poly3(cam, [P3(z + 0.01, -h, y1 - 1.1), P3(z + 0.01, h, y1 - 1.1), P3(z + 0.01, h, y1 - 0.98), P3(z + 0.01, -h, y1 - 0.98)], col, 0.95);
    text3(D, R, P3(z + (cam.C[2] < z ? -0.1 : 0.1), 0, y1 - 0.55), words, big ? 0.85 : 0.7, '#ffffff', { far: 120, stroke: col });
  }
  // the hologram over the plaza: the character she is playing as, as tall as a tower, flickering (she flies straight through its face)
  const HOLOIMG = new Map();
  function holoImg(id) {
    if (HOLOIMG.has(id)) return HOLOIMG.get(id);
    const im = root.SkiDraw.IMG[id];
    if (!im || typeof document === 'undefined') return null;
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(47,243,255,0.55)'; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.6)'; for (let y = 0; y < cv.height; y += 3) g.fillRect(0, y, cv.width, 1);
    HOLOIMG.set(id, cv);
    return cv;
  }
  const FACEY = gy(IDOL) + B_FLY.at(IDOL - JUMP - 4) + 1;                  // (where her flight passes through it)
  function idol(D, R) {
    const { cam, t } = R, id = R.char || 'anje', base = gy(IDOL) - 52, X = R.wx(IDOL, 0);
    D.poly3(cam, [[X - 3, base, IDOL], [X + 3, base, IDOL], [X + 16, FACEY + 18, IDOL], [X - 16, FACEY + 18, IDOL]], N.cyan, 0.05);   // the beam it is projected on
    for (const r of [5, 3.6]) { const p = []; for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * PI; p.push([X + Math.cos(a) * r, base + 0.2, IDOL + Math.sin(a) * r]); } D.poly3(cam, p, r > 4 ? '#1a1636' : N.cyan, r > 4 ? 1 : 0.8); }
    const q = D.toCam(cam, [X, FACEY, IDOL]);
    if (q[2] < 1.5) return;
    const img = holoImg(id), size = 44, [sx, sy] = D.scr(cam, q), px = cam.F / q[2] * size, g = D.ctx;
    const fl = Math.sin(t * 29) > 0.9 ? 0.45 : 1, a = clamp((q[2] - 1.5) / 6) * 0.85 * fl;
    if (!img) { D.rect(sx - px / 3, sy - px / 2, px * 0.66, px, N.cyan, 0.2 * a); return; }
    const w = px * img.width / img.height;
    g.save(); g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.translate(sx, sy); if (R.roll) g.rotate(R.roll);
    const slip = Math.sin(t * 3) > 0.85 ? (Math.random() - 0.5) * px * 0.08 : 0;    // (now and then a band of it slips sideways)
    g.drawImage(img, -w / 2, -px * 0.62, w, px);
    if (slip) g.drawImage(img, 0, img.height * 0.4, img.width, img.height * 0.12, -w / 2 + slip, -px * 0.62 + px * 0.4, w, px * 0.12);
    g.restore();
  }
  function goalGate(D, R, back) {                                         // the finish: a great gate of light (seen from either side: the finish shot looks back at it)
    if (back) return;
    arch(D, R, FINISH, 'GOAL 終點', N.mag, true);
    const { P3, t } = R, h = HW(FINISH) + 0.8;
    for (const sd of [-1, 1]) for (let j = 0; j < 4; j++) glowDot(D, R, P3(FINISH - 0.5, sd * h, 1.5 + j * 1.6), 0.3, j % 2 ? N.cyan : N.mag, 0.5 + 0.4 * Math.sin(t * 6 + j));
  }
  function odGate(D, R) {                                                  // the overdrive gate: chevrons racing round a great frame
    const z = ODZ[0] - 2, { P3, t } = R;
    arch(D, R, z, 'OVERDRIVE', N.yel, true);
    const h = HW(z) + 0.8;
    for (let j = 0; j < 6; j++) { const ph = ((t * 2 + j / 6) % 1) * 7; for (const sd of [-1, 1]) glowDot(D, R, P3(z - 0.4, sd * (h - 0.3), 0.6 + ph), 0.28, N.yel, 0.9); }
  }

  // ---- the far view: a violet night, a neon sun cut in bands low ahead, the megatower, skylines with their windows
  // lit, traffic streaming across the sky. On a twisted track it all turns with the camera (R.roll)
  const SUN_B = 0.1, MEGA_B = -0.22;                                       // (bearings, fixed in the world)
  const SKYL = new Map();                                           // a skyline is drawn once into a strip 40 buildings long, then laid end to end
  function skylineStrip(layer) {
    const [seed, , hMin, hMax, col, lit] = layer;
    if (SKYL.has(seed)) return SKYL.get(seed);
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas'); cv.width = 2800; cv.height = Math.ceil(hMax) + 8;
    const g = cv.getContext('2d'), r = rng(seed), base = cv.height - 2;
    for (let i = 0; i < 40; i++) {
      const h = hMin + r() * (hMax - hMin), w = 40 + r() * 70, u = r(), ci = (r() * NC.length) | 0, x = i * 70;
      g.fillStyle = col; g.fillRect(x, base - h, w, h + 2);
      if (!lit) continue;
      g.fillStyle = 'rgba(255,210,122,0.5)';
      for (let y = base - h + 12; y < base - 12; y += 14) for (let xx = x + 6; xx < x + w - 6; xx += 12) if (((xx * 7 + y * 13 + i) % 5) === 0) g.fillRect(xx, y, 5, 6);
      if (u < 0.5) { g.fillStyle = NC[ci]; g.fillRect(x, base - h, w, 4); }
    }
    SKYL.set(seed, cv);
    return cv;
  }
  function skyline(g, hz, pan, W, layer) {
    const cv = skylineStrip(layer);
    if (!cv) return;
    const off = pan * (0.35 + layer[1]) - 1000, x0 = off - Math.ceil((off + W * 1.5) / 2800) * 2800;
    for (let x = x0; x < W * 2.5; x += 2800) g.drawImage(cv, x, hz + 8 - cv.height);
  }
  function sun(g, x, y, r) {
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
    const gr = g.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, '#ffe14a'); gr.addColorStop(0.55, '#ff7a6a'); gr.addColorStop(1, '#ff3fd0');
    g.fillStyle = gr;
    for (let yy = y - r, k = 0; yy < y + r; k++) { const band = yy > y ? 4 + (yy - y) / r * 18 : 0, h = 22; g.fillRect(x - r, yy, 2 * r, h - band); yy += h; }
    g.restore();
  }
  function megatower(g, x, hz, t) {
    g.fillStyle = '#0a0518'; g.beginPath(); g.moveTo(x - 80, hz + 6); g.lineTo(x - 46, hz - 640); g.lineTo(x - 14, hz - 700); g.lineTo(x + 14, hz - 700); g.lineTo(x + 46, hz - 640); g.lineTo(x + 80, hz + 6); g.closePath(); g.fill();
    g.fillRect(x - 3, hz - 820, 6, 130);
    g.fillStyle = 'rgba(47,243,255,0.55)'; for (let y = hz - 600; y < hz - 20; y += 22) g.fillRect(x - 30 + (y % 3) * 4, y, 60 - (y % 3) * 8, 3);
    for (const [ry, col] of [[hz - 520, 'rgba(255,63,208,0.8)'], [hz - 330, 'rgba(47,243,255,0.7)']]) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.ellipse(x, ry, 150, 26 + 8 * Math.sin(t + ry), 0, 0, 7); g.stroke(); }
    g.fillStyle = Math.floor(t * 2) % 2 ? '#ff3355' : '#5a1020'; g.fillRect(x - 6, hz - 826, 12, 12);
  }

  const theme = {
    spray: ['#2ff3ff', '#ff3fd0', '#ffffff'], trail: '#1fb8d0', ski: ['#2ff3ff', '#bffaff', '#ff3fd0'],
    boost: { pad: '#ff3fd0', glow: '#ff9af0', arrow: '#ffffff' },
    flow: { lane: '#2ff3ff', edge: '#ffffff', mark: '#ffffff' },
    kicker: { side: '#1a1636', top: '#2a2450', edge: '#ff3fd0' },
    sky(R) {
      const D = root.SkiDraw, Wd = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t, cam } = R, roll = R.roll || 0;
      theme.camZ = zc; theme.roll = roll; theme.cy = cam.cy;
      D.rect(0, 0, Wd, H, '#07031a');
      g.save();
      if (roll) { g.translate(Wd / 2, cam.cy); g.rotate(roll); g.translate(-Wd / 2, -cam.cy); }
      const X0 = -Wd * 1.5, XW = Wd * 4;
      g.fillStyle = '#07031a'; g.fillRect(X0, hz - 3000, XW, 2240);
      const gr = g.createLinearGradient(0, hz - 760, 0, hz + 6);
      gr.addColorStop(0, '#07031a'); gr.addColorStop(0.5, '#170c38'); gr.addColorStop(0.82, '#3c1258'); gr.addColorStop(1, '#8a2470');
      g.fillStyle = gr; g.fillRect(X0, hz - 760, XW, 766);
      const rs = rng(5); for (let k = 0; k < 80; k++) { const x = ((rs() * XW + pan * 0.1) % XW + XW) % XW + X0, y = hz - 160 - rs() * 1400; D.rect(x, y, 3, 3, '#ffffff', 0.2 + 0.35 * Math.abs(Math.sin(t * 1.3 + k))); }
      const sx = Wd / 2 + pan + SUN_B * 900;
      if (sx > -600 && sx < Wd + 600) sun(g, sx, hz - 120, 250);
      skyline(g, hz, pan, Wd, [11, 0.05, 60, 200, '#1a0c34', false]);
      const mx = Wd / 2 + pan + MEGA_B * 900;
      if (mx > -300 && mx < Wd + 300) megatower(g, mx, hz, t);
      skyline(g, hz, pan, Wd, [23, 0.2, 110, 330, '#0e0822', true]);
      for (let k = 0; k < 4; k++) {                                       // traffic streaming across the sky
        const y = hz - 260 - k * 70, v = (k % 2 ? 1 : -1) * (120 + k * 40);
        for (let j = 0; j < 14; j++) { const x = (((j * 260 + t * v + pan * 0.4) % 3640) + 3640) % 3640 - 1100; D.rect(x, y + (j % 3) * 6, 8, 4, v > 0 ? '#ff6a6a' : '#fff4d0', 0.8); }
      }
      g.fillStyle = '#0b0818'; g.fillRect(X0, hz + 5, XW, 3 * H);
      const hg = g.createLinearGradient(0, hz - 30, 0, hz + 40); hg.addColorStop(0, 'rgba(255,63,208,0)'); hg.addColorStop(0.5, 'rgba(255,63,208,0.35)'); hg.addColorStop(1, 'rgba(255,63,208,0)');
      g.fillStyle = hg; g.fillRect(X0, hz - 30, XW, 70);
      g.restore();
    },
    ground(R, za, zb, near) {
      if (DEEP((za + zb) / 2) > 2) cityFloor(root.SkiDraw, R, za, zb, near);
    },
    slice(R, za, zb, near) {
      const D = root.SkiDraw, m = (za + zb) / 2;
      if (inAir(m)) return;                                              // (over the abyss: nothing under her)
      if (inBridge(m)) bridgeSlice(D, R, za, zb, near);
      else if (m >= LAND - 3) plazaSlice(D, R, za, zb, near);
      else if (ELEV(m)) trackSlice(D, R, za, zb, near);
      else streetSlice(D, R, za, zb, near, m > FL[3]);
    },
    scenery(R) {
      const D = root.SkiDraw, { add, lo, hi, zc } = R;
      const ok = (z, d = 125) => z > lo && z < hi && Math.abs(z - zc) < d;
      for (const b of SCENE.towers) if (ok(b.z, 125)) add(b.z, () => tower(D, R, b, fogK(R, b.z, b.x)), false, b.x);
      for (const h of SCENE.holos) if (ok(h.z, 125)) add(h.z, () => holoAd(D, R, h, fogK(R, h.z, h.x)), false, h.x);
      if (zc > FL[0] - 40 && zc < FL[3]) for (const b of SCENE.hang) if (ok(b.z, 110)) add(b.z, () => hanging(D, R, b, fogK(R, b.z, b.x)), false, b.x);
      for (const s of SCENE.signs) if (ok(s.z, 110)) add(s.z, () => roadSign(D, R, s), false, s.sd * 8);
      flyers(D, R, zc);
      if (zc > LAND - 30) for (const c of SCENE.crowd) if (ok(c.z, 70)) add(c.z, () => {
        const q = D.toCam(R.cam, R.P3(c.z, c.x, c.y)); if (q[2] < 1) return;
        const [sx, sy] = D.scr(R.cam, q), s = R.cam.F / q[2] * 2.1 / 48, hop = Math.abs(Math.sin(R.t * 6 + c.ph)) * 14 * s;
        D.spr(c.id, sx, sy - hop, s);
      }, false, c.x);
      if (ok(SKY0, 125)) add(SKY0, () => arch(D, R, SKY0, '磁浮天軌', N.cyan, true));
      if (ok(ODZ[0], 125)) add(ODZ[0] - 2, () => odGate(D, R));
      if (ok(BR[0], 125)) add(BR[0], () => arch(D, R, BR[0], '數據橋', N.cyan, true));
      if (zc > BR[0] - 60 && zc < IDOL + 2) add(IDOL, () => idol(D, R));
      if (ok(FINISH, 125)) add(FINISH + 3, () => goalGate(D, R, true));
    },
    // gates: neon gateways over the street and the highway, under the arcology; none on the open skyway, the towers'
    // faces, the tunnel (it has its hoops), in forks, in overdrive or on the bridge
    gate(R, z, i, label) {
      const D = root.SkiDraw;
      if (label === 'GOAL') { goalGate(D, R, false); return; }
      if (label) { arch(D, R, z, label, N.mag); return; }
      if (course.openAt(z) || inBridge(z) || inAir(z) || MED(z) > 0 || course.odAt(z) || (z > W[0] - 4 && z < FL[1] + 4) || (z > FL[2] - 4 && z < FL[3] + 12) || Math.abs(z - SKY0) < 20 || Math.abs(z - ODZ[0]) < 20 || Math.abs(z - BR[0]) < 20) return;
      arch(D, R, z, ['霓虹', '衝刺', '夜城', '未來', '電光', '加速'][i % 6], i % 2 ? N.cyan : N.mag);
    },
    obstacle(R, o) {
      const D = root.SkiDraw;
      if (inBridge(o.z)) {                                                  // on the bridge, it flies in with its block
        const off = shiftAt(R.sz, o.z, 2);
        if (off) { const R0 = R, add = p => [p[0] + off[0], p[1] + off[1], p[2] + off[2]]; R = Object.assign({}, R0, { S3: (z, x, u) => add(R0.S3(z, x, u)), P3: (z, x, u) => add(R0.P3(z, x, u)) }); }
      }
      if (o.z - R.zc > 62 && SIMPLE[o.k] && !(R.squash && R.squash.has(o))) {   // far off: just its shape, in its colour
        const [h, col] = SIMPLE[o.k], x = obX(o, R.rt), w = o.hw, z = obZ(o, R.sz), k = fogK(R, z, x);
        D.poly3(R.cam, [R.S3(z, x - w, 0), R.S3(z, x + w, 0), R.S3(z, x + w, h), R.S3(z, x - w, h)], fog(col, k), o.k === 'holo' ? 0.4 * obUp(o, R.rt) : 1);
        return;
      }
      switch (o.k) {
        case 'holo': holoObs(D, R, o); break;
        case 'sweep': sweepObs(D, R, o); break;
        case 'drone': droneObs(D, R, o); break;
        case 'crate': crateObs(D, R, o); break;
        case 'pillar': pillarObs(D, R, o, fogK(R, o.z, o.x)); break;
        case 'kiosk': kioskObs(D, R, o, fogK(R, o.z, o.x), '← 磁浮　商場 →'); break;
        case 'pylon': kioskObs(D, R, o, fogK(R, o.z, o.x), '← 快線　隧道 →'); break;
        case 'laser': laserObs(D, R, o); break;
        case 'sign': signObs(D, R, o); break;
        case 'ac': acObs(D, R, o); break;
        case 'cradle': cradleObs(D, R, o); break;
        case 'cable': cableObs(D, R, o); break;
        case 'crawler': crawlerObs(D, R, o); break;
        case 'fan': fanObs(D, R, o); break;
        case 'pipe': pipeObs(D, R, o); break;
        case 'cop': copObs(D, R, o); break;
        case 'hcar': hcarObs(D, R, o); break;
        case 'barrier': barrierObs(D, R, o); break;
      }
    },
    shift(z, sz) {                                                          // coins on the bridge fly in with its blocks
      return inBridge(z) ? shiftAt(sz, z, 2) : null;
    },
    // rain falling past (with the world: on a twisted track it falls across the picture), neon at the edges; in
    // overdrive the picture pulses; passing through the hologram, it glitches
    weather({ t }) {
      const D = root.SkiDraw, Wd = D.W, H = D.H, g = D.ctx, z = theme.camZ ?? 0, roll = theme.roll || 0, cy = theme.cy || H / 2;
      g.save();
      if (roll) { g.translate(Wd / 2, cy); g.rotate(roll); g.translate(-Wd / 2, -cy); }
      const r = rng(17), n = z > FL[1] && z < FL[2] ? 40 : 70;
      g.strokeStyle = 'rgba(190,210,255,0.32)'; g.lineWidth = 3; g.beginPath();
      for (let k = 0; k < n; k++) { const sp = 1300 + r() * 700, x = ((r() * Wd * 2 - Wd * 0.5 + t * 90) % (Wd * 2)) - Wd * 0.5, y = ((r() * H * 2 + t * sp) % (H * 2)) - H * 0.5; g.moveTo(x, y); g.lineTo(x - 10, y + 46); }
      g.stroke(); g.restore();
      const vg = g.createRadialGradient(Wd / 2, H * 0.5, Math.min(Wd, H) * 0.35, Wd / 2, H * 0.5, Math.max(Wd, H) * 0.75);
      vg.addColorStop(0, 'rgba(20,6,40,0)'); vg.addColorStop(1, 'rgba(20,6,40,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, Wd, H);
      if (course.odAt(z + 8)) {                                             // overdrive: the edges burn magenta and yellow, bands of colour flicker
        const p = 0.5 + 0.5 * Math.sin(t * 14);
        for (const [x0, x1, col] of [[0, Wd * 0.14, 'rgba(255,63,208,'], [Wd, Wd * 0.86, 'rgba(255,225,74,']]) { const gg = g.createLinearGradient(x0, 0, x1, 0); gg.addColorStop(0, col + (0.45 + 0.25 * p) + ')'); gg.addColorStop(1, col + '0)'); g.fillStyle = gg; g.fillRect(Math.min(x0, x1), 0, Wd * 0.14, H); }
        const rr = rng(Math.floor(t * 20)); for (let k = 0; k < 3; k++) D.rect(0, rr() * H, Wd, 4 + rr() * 10, rr() < 0.5 ? N.cyan : N.mag, 0.12);
      }
      const gl = Math.max(1 - Math.abs(z + 7 - IDOL) / 9, 0) + (z > BR[0] && z < JUMP && Math.sin(t * 3.1) > 0.97 ? 0.4 : 0);
      if (gl > 0 && g.canvas) {                                            // a glitch: bands of the picture slip sideways, tinted
        const cv = g.canvas, rr = rng(Math.floor(t * 24)), bw = cv.width;
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        for (let k = 0; k < Math.round(3 + gl * 8); k++) { const y = rr() * cv.height, h = 6 + rr() * 50 * gl, dx = (rr() - 0.5) * 120 * gl; try { g.drawImage(cv, 0, y, bw, h, dx, y, bw, h); } catch (e) { /* (no canvas to copy in the tests) */ } }
        g.restore();
        D.rect(0, 0, Wd, H, rr() < 0.5 ? N.cyan : N.mag, 0.08 * gl);
      }
    },
    // map-screen card (until its screenshot is taken): the violet night, the banded sun, towers, a track of light
    badge(g, x, y, w, h) {
      const gr = g.createLinearGradient(0, y, 0, y + h * 0.6); gr.addColorStop(0, '#07031a'); gr.addColorStop(1, '#8a2470');
      g.fillStyle = gr; g.fillRect(x, y, w, h * 0.6); g.fillStyle = '#0b0818'; g.fillRect(x, y + h * 0.6, w, h * 0.4);
      g.fillStyle = '#ffb05a'; g.beginPath(); g.arc(x + w * 0.5, y + h * 0.5, h * 0.22, Math.PI, 0); g.fill();
      g.fillStyle = '#0e0822'; for (let k = 0; k < 8; k++) g.fillRect(x + k * w / 8, y + h * (0.6 - 0.1 - (k * 37 % 5) * 0.06), w / 9, h);
      g.fillStyle = '#ff3fd0'; g.beginPath(); g.moveTo(x + w * 0.45, y + h * 0.6); g.lineTo(x + w * 0.55, y + h * 0.6); g.lineTo(x + w * 0.8, y + h); g.lineTo(x + w * 0.2, y + h); g.fill();
      g.fillStyle = '#2ff3ff'; g.fillRect(x + w * 0.49, y + h * 0.62, w * 0.02, h * 0.38);
    },
  };

  root.SkiMaps.define('cyber', { course, theme, music: { race: 'cyber', result: 'cyber_result', cues: { mag: 'cyber_grav', od: 'cyber_od', odend: 'cyber_back' } },
    score: { par: 109, ranks: root.SkiScore.RANKS, key: 'ski-best-cyber' }, bg: '#120a2a' });
})(typeof window !== 'undefined' ? window : globalThis);

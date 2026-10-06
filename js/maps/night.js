'use strict';
// 困難 · 深夜街道: a city at midnight, ridden downhill all the way. Its tricks: cars that come straight at her with
// their headlights blazing (they honk a second before, and swish past close); forks where the road splits round a
// median and each side is its own ride (a night market or the road; oncoming traffic or a building site; up a
// flyover or down a neon tunnel); an unfinished viaduct whose end throws her high into the night sky, onto the back
// of a jumbo jet; down off its nose into the glass wall of a skyscraper, straight through the window into an office
// where the animals working late jump out of their skins; out through the far window, across the rooftops and back
// down to the street.
(function (root) {
  const { clamp, lerp, seg, smooth, rng, obX, obZ } = root.SkiCore;

  // ------------------------------------------------------------ course
  const FINISH = 1990;
  const LIP = 1185;                                             // the end of the unfinished viaduct (the launch)
  const PLANE = [1258, 1380], WING = [1316, 1346];              // the jumbo jet (tail to nose) and its wings
  const TOWER = [1430, 1540];                                   // the skyscraper: in through one glass wall, out through the other
  const ROOF = [[1545, 1640], [1644, 1730]], STREET2 = 1734;    // two rooftops, then the street again
  const FORK_N = [148, 271], FORK_H = [600, 722], FORK_T = [832, 1000], TUNNEL = [866, 952];
  const S = 3;                                                  // a drop off an edge (grade)
  const drop = (z, d, before, after) => [[z, before], [z + 0.4, S], [z + 0.4 + d / S, S], [z + 0.8 + d / S, after]];
  // a step up (d > 0) or down in the course, taken at grade ∓St between grades a and b; it rises exactly d
  const step = (z, d, a, b, St = 6) => { const s = d > 0 ? -St : St, w = (-d - (a + s) * 0.1 - (s + b) * 0.1) / s; return [[z, a], [z + 0.2, s], [z + 0.2 + w, s], [z + 0.4 + w, b]]; };
  const DECK = 33, DIVE = 46, DIVE_VY = -9, LAUNCH_VY = 50, FIN_H = 8.6;
  // the wings, swept back like an airliner's: the root chord [R0, R1] against the fuselage, the tip chord [T0, T1] out at
  // the half span TIP, well behind it. Only what joins the fuselage where she is can be ridden (behind the root the
  // wing has swept away from the body); the tailplane likewise, smaller (TP)
  const TIP = 30, WR = [WING[0] + 14, WING[1]], WT = [WING[0] - 4, WING[0] + 2];
  const TP = { R: [PLANE[0] + 3.5, PLANE[0] + 9.5], T: [PLANE[0] + 2.5, PLANE[0] + 5.5], tip: 7.2 };
  const leadX = (z, w = { R: WR, T: WT, tip: TIP }) => 3.2 + (w.R[1] - z) / (w.R[1] - w.T[1]) * (w.tip - 3.2);   // the leading edge's span at z
  const LEAD = []; for (let z = WR[0] + 2; z < WR[1] - 1e-9; z += 2) LEAD.push([z, leadX(z)]);                                  // the jet's tail above the viaduct's end; the office floor below its nose
  const PG = 0.08;                                              // the jet is coming in to land: its back falls gently to the nose
  const course = root.SkiCourse.build({
    id: 'night', HALF: 11, FINISH, LENGTH: 2090, START: 4,
    phys: { VMAX: 35, DRAG: 0.2, DRIFT: 0.35, CENT: 0.6, WALL_DRAG: 1.8, EDGE: 0.3 },   // (EDGE: off a wall-less edge only once her skis are off it, as she is seen to be: 數讀房市's rule)
    flow: true, botLanes: 0.125,                                 // (fast enough on the boost pads that the bot steers in finer steps)
    CX: [[0, 0], [40, 0], [90, -5], [140, 0], [150, 0], [270, 0], [305, 6], [345, -6], [385, 0], [420, 9], [455, 10], [495, 4],
      [550, -6], [600, 0], [722, 0], [765, 9], [810, 0], [832, 0], [1000, 0], [1040, -8], [1085, 0], [1110, 0],
      [1540, 0], [1600, 4], [1640, 0], [1685, -4], [1730, 0], [1780, 8], [1840, -8], [1900, 6], [1950, 0], [1990, 0], [2090, 0]],
    GRADE: [[0, 0.02], [12, 0.06], [24, 0.18], [400, 0.2], [600, 0.22], [1100, 0.22], [1150, 0.18], [LIP, 0.18],
      [LIP + 1, 0], ...step(PLANE[0] - 3, DECK, 0, PG), [PLANE[1] - 0.5, PG], [PLANE[1] + 1.5, 0.5],          // ④ up onto the jet; its nose
      ...drop(PLANE[1] + 2, DIVE - 7.2, 0.5, 0.15), [TOWER[1], 0.15],                                    // ⑤ down off it to the office floor
      ...drop(TOWER[1], 12, 0.15, 0.2), [ROOF[0][1], 0.2], ...drop(ROOF[0][1], 9, 0.2, 0.2), [ROOF[1][1], 0.2], ...drop(ROOF[1][1], 10, 0.2, 0.22),
      [1960, 0.22], [FINISH, 0.12], [2030, 0], [2090, 0]],
    WIDTH: [[0, 6], [140, 6], [158, 9], [262, 9], [280, 6], [400, 6], [440, 9], [820, 9], [848, 11], [984, 11], [1004, 9], [1110, 9], [1130, 6],
      [LIP - 11, 6], [LIP, 3.4], [PLANE[0], 3.4], [PLANE[0] + 4, 3.2],
      [WR[0] - 1, 3.2], [WR[0], leadX(WR[0])], ...LEAD, [WR[1], 3.2], [PLANE[1] - 4, 3.2], [PLANE[1], 2.6], [PLANE[1] + 2, 3.4],
      [TOWER[0] - 2, 3.4], [TOWER[0], 5], [TOWER[1], 5], [ROOF[0][0], 6]],
    OPEN: [[1160, TOWER[0]]],
    SPLIT: [{ m: [[FORK_N[0] - 1, 0], [FORK_N[0] + 12, 1.4], [FORK_N[1] - 13, 1.4], [FORK_N[1], 0]] },
      { m: [[FORK_H[0] - 1, 0], [FORK_H[0] + 10, 0.9], [FORK_H[1] - 10, 0.9], [FORK_H[1], 0]] },
      { m: [[FORK_T[0] - 1, 0], [FORK_T[0] + 18, 3], [FORK_T[1] - 18, 3], [FORK_T[1], 0]],
        L: [[FORK_T[0] + 3, 0], [FORK_T[0] + 40, 6.5], [FORK_T[1] - 54, 6.5], [FORK_T[1] - 18, 0]],               // up a flyover
        R: [[FORK_T[0] + 3, 0], [FORK_T[0] + 26, -1.2], [FORK_T[1] - 40, -1.2], [FORK_T[1] - 18, 0]] }],          // down into a tunnel
    slow: [[LIP + 45, LIP + 90]],
    CAMYAW: [[LIP + 4, 0], [LIP + 34, 0.42], [LIP + 80, 0.42], [LIP + 102, 0]],   // up in the air, the camera swings round to show the jet side on                                 // over the top of the flight up to the jet
    gateEvery: 40,
    sections: [{ name: '霓虹夜市', z0: 0 }, { name: '逆向高速', z0: 400 }, { name: '交流岔路', z0: 800 }, { name: '夜空航班', z0: 1150 }, { name: '破窗而入', z0: TOWER[0] - 2 }],
  }, (c, P) => {
    const { coin, row, arc, boost } = P;
    const cone = (z, x) => P.hop('cone', z, x, 0.45, { h: 0.8 });
    const bags = (z, x) => P.hop('bags', z, x, 0.8, { h: 0.7 });
    const stool = (z, x) => P.hop('stool', z, x, 0.6, { h: 0.75 });
    const barrier = (z, x, hw = 1.3) => P.hop('barrier', z, x, hw, { h: 0.85, hd: 0.35 });   // striped barricade: hop it
    const barrel = (z, x) => P.tall('barrel', z, x, 0.5);
    const block = (z, x, hw = 1.2) => P.tall('jersey', z, x, hw, { hd: 0.8 });                // concrete block: go round
    const cart = (z, x) => P.tall('cart', z, x, 1.1, { hd: 0.9 });                            // a food stall on wheels
    const cushion = z => P.tall('cushion', z, 0, 0.9, { hd: 0.6 });                            // the nose of a fork
    const banner = z => P.over('banner', z, 0, 2 * c.halfAt(z));                           // a neon sign hung across: crouch
    const lanterns = (z, x, w) => P.over('lanterns', z, x, w);
    const bar = z => P.over('bar', z, 0, 2 * c.halfAt(z), { y0: 1.35 });                                   // a height bar on the highway
    const cat = (z, x, amp, period) => P.roll('cat', z, x, 0.45, amp, period, { h: 0.6 });
    const taxi = (z, x, k = 0.7) => P.car('taxi', z, x, { k });
    const car = (z, x, k = 0.7) => P.car('car', z, x, { k });
    const truck = (z, x, k = 0.6) => P.car('truck', z, x, { k, hd: 3.6, hw: 1.25 });
    const scooter = (z, x) => P.car('scooter', z, x, { k: -0.35, hw: 0.45, hd: 1, honk: false });   // going her way, slowly
    const pair = z => { coin(z, -1.5, 0.6); coin(z, 1.5, 0.6); };

    // ① 霓虹夜市: down a neon-lit street; the road splits round a row of parked scooters: the night market on the
    // left (stools, food carts, lanterns to duck under), the road on the right (taxis coming straight at her)
    cone(46, 2); cone(46, 3.2); taxi(70, -3); bags(88, 3); banner(104); scooter(124, 3); cone(136, -2.5);
    row(30, 0, 3); row(76, 2.5, 2); pair(104); coin(114, -2);
    cushion(FORK_N[0]);
    stool(168, -4); cart(180, -7.6); lanterns(192, -5.2, 7.6); stool(204, -3); stool(204, -7); cart(222, -2.6); lanterns(236, -5.2, 7.6); stool(250, -5.5);
    for (const z of [162, 176, 212, 248]) coin(z, z % 24 < 12 ? -4.4 : -6, 0.9);
    coin(192, -5.2, 0.6); coin(236, -5.2, 0.6);
    taxi(176, 3.2); scooter(196, 7); taxi(218, 3.2); cone(232, 6); car(252, 6.5); row(186, 7, 2);
    taxi(292, -3); cat(308, 0, 4, 4); scooter(322, 3); banner(338); taxi(356, -3); car(372, 3); bags(386, -3.5);
    coin(296, 2.5); pair(338); row(348, 0, 2); row(378, -3, 2);
    // ② 逆向高速: up onto the highway the wrong way: convoys coming at her in every lane but one, the free lane moving
    // across; boost pads down the free lanes. Then a fork: oncoming traffic on the left, a building site on the right
    cone(410, -4); cone(424, 4);
    const lanes = [-6.4, -2.2, 2.2, 6.4];
    [[470, 3], [508, 2], [546, 1], [584, 2]].forEach(([z, free], k) => {
      lanes.forEach((x, j) => { if (j !== free) (j === (k + 1) % 4 ? truck : k % 2 ? car : taxi)(z + (j % 2) * 4, x); });
      boost(z - 22, lanes[free], 1.4, 6); row(z - 8, lanes[free], 2);
    });
    bar(594);
    cushion(FORK_H[0]);
    // (a straight way down between its two lanes of traffic; the boost pads and coins out in the lane that is free)
    [[624, -7.2], [640, -2.6], [656, -7.2], [672, -2.6], [690, -7.2], [706, -2.6]].forEach(([z, x], k) => { (k % 3 === 2 ? truck : car)(z, x, 0.75); boost(z - 13, x < -5 ? -3 : -6.8, 1.3, 5); coin(z - 6, x < -5 ? -3 : -6.8, 0.9); });
    cone(620, 3); cone(620, 7); barrier(636, 3.6, 1.6); block(652, 6.4, 1.3);
    P.gap('trench', 670, 3.2, { x: 5, hw: 4 }); coin(671.6, 5, 2); barrel(690, 2.6); barrel(690, 7.4);
    row(640, 7, 2); row(680, 5, 2);
    car(750, 6.4); taxi(750, -2.2); truck(774, 2.2); car(790, -6.4); bar(806); pair(806);
    row(756, -6.4, 2); row(780, -2.2, 2);
    // ③ 交流岔路: the big fork: up a flyover on the left (coins, a view over the city, a few cars), down into a neon tunnel
    // on the right (boost pads, headlights coming through it). Then on towards the unfinished viaduct
    cushion(FORK_T[0]);
    for (let z = 872; z < 950; z += 14) coin(z, -7 + 2.2 * Math.sin(z * 0.08), 0.9);
    car(900, -8.4); car(936, -5.2); taxi(962, -7);
    boost(872, 7, 1.5, 6); boost(902, 5, 1.5, 6); boost(932, 8.4, 1.5, 6);
    car(890, 8.6); taxi(918, 4.6); car(946, 8.4); row(878, 7, 2); row(908, 5, 2); row(940, 8.4, 2);
    car(1020, -2.2); truck(1020, 6.4); taxi(1048, 2.2); car(1060, -6.4); barrier(1084, -4, 2.4); barrier(1084, 4.5, 2.4); bar(1100);
    coin(1030, -6.4); row(1054, 6.4, 2); coin(1084, 0, 0.9); pair(1100);
    // ④ 夜空航班: the viaduct narrows and loses its railings (building site), boost pads to its broken end, the launch
    // high into the night sky, onto the jumbo jet coming in to land; along its back (over the wings), off its nose
    cone(1128, -3); cone(1128, 3); barrel(1144, -2.5); barrel(1144, 2.5);
    boost(1152, 0, 1.6, 6); boost(1166, 0, 1.6, 6);
    row(1136, 0, 2); coin(1156, 0); row(1170, 0, 2, 5);
    P.launch(LIP - 6, 0, 3.2, 6, LAUNCH_VY, 38);
    for (let z = LIP + 1; z < PLANE[0] - 2; z += 6) P.gap('sky', z, Math.min(6, PLANE[0] - 2 - z), { nojump: true });
    arc(LIP, 0, 9, 10);
    P.hop('fin', PLANE[0] + 8, 0, 0.3, { hd: 5, h: FIN_H + 0.2 });     // the tail fin: high under her as she flies over it
    P.tall('mast', 1310, -1.6, 0.25, { hd: 0.3 }); P.tall('mast', 1314, 1.8, 0.25, { hd: 0.3 });
    row(1308, 0, 3, 3); for (const [z, x] of [[WR[0] + 3, 3.4], [WR[0] + 7, 4.0]]) { coin(z, -x, 0.9); coin(z, x, 0.9); }   // out on the wings (only so far out that she is back on the jet before the wing sweeps away under her)
    P.tall('mast', 1360, 0, 0.25, { hd: 0.3 }); row(1364, 1.2, 2, 3);
    P.launch(PLANE[1] - 4, 0, 2.8, 4, DIVE_VY, 34, 0.2);         // off the nose, diving: always the same flight, into the glass
    for (let z = PLANE[1] + 1; z < TOWER[0] - 2; z += 6) P.gap('sky', z, Math.min(6, TOWER[0] - 2 - z), { nojump: true });
    arc(PLANE[1], 0, 6, 7.5);
    P.cue(TOWER[0], 'glass');
    // ⑤ 破窗而入: through the glass into an office where the animals are working late: rolling chairs, boxes, partitions,
    // ceiling signs; out through the far window, down onto a rooftop (air-conditioners, water tanks, washing lines), a
    // lower rooftop, the street again, the finish
    const chair = (z, x, amp, period) => P.roll('chair', z, x, 0.45, amp, period, { h: 0.75 });
    const box = (z, x) => P.hop('box', z, x, 0.6, { h: 0.7 });
    const part = (z, x, hw = 1.4) => P.tall('partition', z, x, hw, { hd: 0.25 });
    const sign = z => P.over('sign', z, 0, 10);
    const worker = (z, x) => P.tall('worker', z, x, 0.5, { hd: 0.4 });
    box(1446, -2); chair(1458, 0, 3, 3.6); part(1470, 2.6); part(1470, -3.6, 1.2); sign(1482); worker(1492, -2.6); box(1502, 2.6);
    chair(1510, 0, 3.2, 3.2); part(1522, -2.4); worker(1530, 2.8);
    row(1440, 0, 2); pair(1482); row(1494, 2, 2); coin(1514, -2.5); P.cue(TOWER[1], 'glass2'); P.cue(TOWER[1] + 0.5, 'scream'); P.cue(TOWER[1] + 1, 'ah');
    P.cue(TOWER[0] + 0.5, 'scream'); P.cue(TOWER[0] + 1, 'wow');                     // in through the glass: screams all round
    ['oh', 'scream', 'ah', 'gasp', 'wow', 'oh', 'scream', 'ah', 'gasp', 'wow', 'oh', 'scream'].forEach((nm, k) => { const z = TOWER[0] + 9 + k * 8 - 9; if (z > TOWER[0] + 2 && z < TOWER[1] - 4) P.cue(z, nm); });   // and at every row of desks as she shoots past
    const ac = (z, x) => P.hop('ac', z, x, 0.8, { h: 0.8 });
    const tank = (z, x) => P.tall('tank', z, x, 1.2, { hd: 1.2 });
    const wash = z => P.over('wash', z, 0, 12);
    ac(1584, -3); tank(1598, 3); wash(1612); ac(1626, 0);
    ac(1664, 3); tank(1676, -3); wash(1692); ac(1706, -2.5); ac(1706, 2.5); tank(1720, 0);
    row(1580, 0, 2); pair(1612); coin(1632, -3); coin(1668, -2); pair(1692); coin(1706, 0, 1.9);
    taxi(1770, -3); cone(1786, 2.5); scooter(1800, 3); banner(1816); car(1836, 3); taxi(1852, -3); cat(1868, 0, 4, 3.6); bags(1884, 3.5); taxi(1902, 3); car(1918, -3); banner(1940); cone(1956, -2.5); cone(1956, 2.5);
    row(1760, 0, 2);                                              // (the first two where she is down again off the last roof)
    coin(1792, -2.5); pair(1816); coin(1842, -1); coin(1892, -1.5); pair(1940); coin(1964, 0);
  });

  root.SkiCourse.fitFlights(course);                           // the coins up to the jet and down to the glass go where she flies

  // where she comes down on the jet from the launch (the same every time: the launch fixes her speed)
  const LAND = (() => {
    const PH = root.SkiPhysics; if (!PH) return PLANE[0] + 35;
    const s = PH.create(course); s.z = LIP - 12; s.y = course.ground(s.z, 0); s.v = 30; s.t = 100; s.inv = 1e9;
    let up = false;
    for (let i = 0; i < 1200; i++) { const ev = PH.step(s, { left: false, right: false, down: false, jump: false }, 1 / 120); s.inv = 1e9; up = up || ev.some(e => e.type === 'launch'); if (up && !s.air) return s.z; }
    return PLANE[0] + 35;
  })();
  // the jet cruises on high above the city, the same way as her: until she is nearly down on it, it is drawn further on
  // (it is slower than her, so she catches it up); once she has dived off its nose it flies on, climbing a little.
  // While she rides it the city far below streams past faster than she goes. [dx, dy, dz], or null where it is in place
  function jetShift(sz) {
    if (sz < LAND - 6) return [0, 0, (LAND - 6 - sz) * 0.55];
    if (sz > PLANE[1] + 1) { const d = sz - PLANE[1] - 1; return [0, d * 0.15, d * 0.6]; }
    return null;
  }
  const cityRush = sz => 0.9 * clamp(sz - (LAND - 6), 0, PLANE[1] + 1 - (LAND - 6));

  // ------------------------------------------------------------ look
  const HW = z => course.halfAt(z), gy = z => course.height(z), MED = z => course.medianAt(z);
  const SKW = 70, CEIL = 6.4, TCEIL = 6.8, OW = 4.6;            // ground either side; office ceiling; tunnel ceiling; office beyond the aisle
  const FLOOR = gy(STREET2) - 2;                                // the city far below the viaduct, the jet, the tower and the rooftops
  const DOWN = [1112, 1150];                                    // where the ground falls away under the viaduct
  const floorY = z => (z < DOWN[0] ? gy(z) : z < DOWN[1] ? lerp(gy(DOWN[0]), FLOOR, smooth(seg(z, DOWN[0], DOWN[1]))) : FLOOR);
  const ZONES = [[400, 'street'], [DOWN[0], 'hwy'], [LIP, 'via'], [PLANE[0], 'sky'], [PLANE[1], 'jet'], [TOWER[0], 'sky'], [TOWER[1], 'office'], [STREET2, 'roof'], [1e9, 'street']];
  const zone = z => ZONES.find(([b]) => z < b)[1];
  const CUTS = ZONES.map(([b]) => b).slice(0, -1);
  const inTunnel = z => z >= TUNNEL[0] && z < TUNNEL[1], onRoof = z => ROOF.some(([a, b]) => z >= a && z < b);
  const FW = z => clamp(Math.min(0.7 + (z - PLANE[0]) * 0.2, 3.2 - (z - (PLANE[1] - 7)) * 0.12), 0.7, 3.2);   // the jet's fuselage, half its width
  const C = {
    road: ['#2b2e3a', '#282b36'], line: '#e9e6d8', yellow: '#f2c14e', walk: ['#4b4f60', '#474b5b'], curb: '#8a8fa0', brick: ['#7a3d36', '#733832'],
    dirt: '#141a2b', conc: '#8e93a0', concD: '#6c717e', concL: '#a9aebb', light: '#ffd27a',
    jetW: '#eef2f8', jetG: '#c9d0dc', jetB: '#2f5fbf', jetD: '#8a93a6', wing: '#d3d9e4', wingE: '#9aa3b4',
    carpet: ['#3c4a66', '#38455f'], aisle: ['#4a5a7a', '#465674'], ceil: '#c9ced9', lamp: '#f4fbff', roof: ['#5a5f6c', '#555a67'],
  };
  const NEON = ['#ff4fa8', '#3ff2ff', '#ffe14a', '#5dff7a', '#b46cff', '#ff8a2a'];
  const BCOL = ['#3a3550', '#45405c', '#2f3a52', '#4a3c46', '#3b4651', '#523f3a', '#36404f'];
  const SIGNS = ['小吃', '冰店', '茶飲', '麵館', '旅社', '藥局', '書店', '電玩', '燒烤', '火鍋', '咖啡', '豆花', '牙醫', '眼鏡', '理髮', '水果', '粥', '滷味', '鞋店', '鐘錶'];
  const SIGNC = [['#c8102e', '#ffffff'], ['#0a3d91', '#ffe14a'], ['#f2c200', '#c8102e'], ['#1a7a3a', '#ffffff'], ['#ffffff', '#c8102e'], ['#5a1a8a', '#3ff2ff']];
  const STALL = ['雞排', '珍奶', '臭豆腐', '蚵仔煎', '烤玉米', '香腸', '鹽酥雞', '豆花', '刈包', '大腸麵線'];
  const ADS = ['夜市美食', '飛向夜空', '加班辛苦了', '晚安城市', '小心逆向車', '機場 AIRPORT'];

  const PIX = {
    cone: { cs: 0.1, cols: { O: '#ff7a1a', W: '#ffffff', D: '#c4500a', K: '#2a2a2a' }, rows: [
      '...OO...', '...OO...', '..OOOO..', '..WWWW..', '..OOOD..', '.OOOODD.', '.WWWWWW.', '.OOOOOD.', 'KKKKKKKK'] },
    bags: { cs: 0.11, cols: { K: '#3a7fe8', G: '#1f4fa8', L: '#bfe0ff' }, rows: [
      '...LK.......', '..GKKG..LK..', '.GKKKKG.GKG.', 'GKKKLKKGKKKG', 'GKKKKKKKKKKG', 'GKKKKKKGKKKG', '.GKKKKG.GKG.'] },
    stool: { cs: 0.1, cols: { R: '#e8343a', D: '#a8222a', L: '#ff7a7a', B: '#2f6fd8', N: '#1f4fa8' }, rows: [
      'LRRRRRRL', 'RRRRRRRR', '.D....D.', '.DRRRRD.', '.D....D.', 'BBBBBBBB', 'BBBBBBBB', '.N....N.', '.N....N.'] },
    barrel: { cs: 0.12, cols: { O: '#ff6a1a', W: '#ffffff', D: '#c24a0a', Y: '#ffd23f' }, rows: [
      '...YY...', 'OOOOOOOO', 'WWWWWWWW', 'OOOOOODD', 'OOOOOODD', 'WWWWWWWW', 'OOOOOODD', 'OOOOOODD', 'WWWWWWWW', 'OOOOOODD', '.OOOOOD.'] },
    cat: [['K.K.......', 'KKKK......', 'KYKY.....K', 'KKKK....K.', '.KKKKKKKK.', '.KKKKKKKK.', '.K.K..K.K.'],
      ['K.K.......', 'KKKK.....K', 'KYKY....K.', 'KKKK....K.', '.KKKKKKKK.', '.KKKKKKKK.', 'K...KK...K']],
    chair: { cs: 0.1, cols: { K: '#22252e', B: '#f07a1a', L: '#ffb060', G: '#c0c6d0' }, rows: [
      '..BBBB..', '..BLLB..', '..BBBB..', '..BBBB..', '...GG...', 'BBBBBBBB', 'BLLLLLLB', '...GG...', '...GG...', '.GGGGGG.', '.K.KK.K.'] },
    scooter: { cs: 0.1, cols: { R: '#d8343a', K: '#1f222b', G: '#9aa0ad', Y: '#ffe14a', B: '#2f6fd8' }, rows: [
      '.......GG..', '......GRRY.', '.KK...GRR..', 'RRRRRRRRR..', 'RRRRRRRRRR.', '.KK.....KK.', 'KKKK...KKKK', '.KK.....KK.'] },
    rider: { cs: 0.11, cols: { H: '#ffe14a', S: '#3a5fbf', K: '#1f222b', R: '#ff2a2a', G: '#9aa0ad', W: '#ffffff' }, rows: [
      '..HHH..', '.HHWHH.', '..HHH..', '.SSSSS.', 'SSSSSSS', 'SSSSSSS', '.SSSSS.', 'GGRRRGG', '.KKKKK.', '..KKK..', '..KKK..', '...K...'] },
    plant: { cs: 0.12, cols: { G: '#2f8a3a', L: '#56b25a', P: '#c87a3a', D: '#9a5a2a' }, rows: [
      '..L.G.L.', '.GLGGLG.', 'LGGLGGLG', '.GLGGLG.', '..GGGG..', '..PPPD..', '..PPPD..', '...PD...'] },
  };
  const PAL = id => ({ ...PIX[id] });

  // ---- what stands along the course
  const SCENE = (() => {
    const r = rng(5150), bld = [], stalls = [], lamps = [], scoots = [], ads = [], far = [], cranes = [], clouds = [], desks = [], nbrs = [];
    for (const [a, b] of [[-30, 412], [STREET2 - 6, course.LENGTH + 60]]) for (const sd of [-1, 1]) for (let z = a; z < b;) {
      const len = 7 + r() * 9, z1 = z + len - 0.6;
      bld.push({ z0: z, z1, sd, off: Math.max(HW(z), HW(z1)) + 2.6, h: 9 + r() * 16, d: 8, col: BCOL[(r() * BCOL.length) | 0], seed: (r() * 1e6) | 0,
        shop: NEON[(r() * NEON.length) | 0], sign: r() < 0.75 ? { t: SIGNS[(r() * SIGNS.length) | 0], c: SIGNC[(r() * SIGNC.length) | 0], y: 3.6 + r() * 2.5, at: 0.2 + r() * 0.6 } : null });
      z += len;
    }
    for (let z = FORK_N[0] + 12, k = 0; z < FORK_N[1] - 10; z += 7.5, k++) stalls.push({ z, t: STALL[k % STALL.length], c: NEON[k % NEON.length] });
    for (let z = FORK_N[0] + 6; z < FORK_N[1] - 6; z += 3.4) scoots.push({ z, x: (r() - 0.5) * 0.8, c: ['#d8343a', '#2f6fd8', '#f2f2f2', '#2fae6a', '#ffcc1a'][(r() * 5) | 0] });
    for (const [a, b, gap] of [[0, 400, 24], [400, DOWN[0], 30], [STREET2, FINISH + 40, 24]]) for (let z = a + 8, k = 0; z < b; z += gap, k++) {
      if (z > FORK_T[0] + 30 && z < FORK_T[1] - 20) continue;   // (the flyover and the tunnel light themselves)
      for (const sd of a === 400 ? [-1, 1] : [k % 2 ? 1 : -1]) lamps.push({ z: z + (sd > 0 ? gap / 2 : 0), sd });
    }
    for (let z = 470, k = 0; z < DOWN[0]; z += 85 + r() * 40, k++) ads.push({ z, sd: k % 2 ? 1 : -1, t: ADS[k % ADS.length], c: NEON[(k * 2) % NEON.length] });
    for (let z = 380; z < DOWN[0] - 12; z += 9 + r() * 10) for (const sd of [-1, 1]) if (r() < 0.75) far.push({ z, sd, off: 16 + r() * 50, w: 6 + r() * 8, h: 12 + r() * 40, col: BCOL[(r() * BCOL.length) | 0], seed: (r() * 1e6) | 0 });
    cranes.push({ z: 1118, x: -26, h: 40, jib: 22 }, { z: 1146, x: 30, h: 46, jib: -24 });
    for (let k = 0; k < 46; k++) clouds.push({ z: LIP - 40 + r() * (TOWER[0] - LIP + 60), x: (r() < 0.5 ? -1 : 1) * (5 + r() * 70), y: -36 + r() * 24, s: 6 + r() * 10, sp: 10 + r() * 14 });   // (below the jet)
    for (let z = TOWER[0] + 9, k = 0; z < TOWER[1] - 6; z += 8, k++) for (const sd of [-1, 1]) desks.push({ z: z + (sd > 0 ? 4 : 0), sd, ch: k * 2 + (sd > 0 ? 1 : 0) });
    // round the rooftops: other buildings, never level with the roof she is on (that would look like more roof)
    for (let z = TOWER[1]; z < STREET2 + 10; z += 10 + r() * 8) for (const sd of [-1, 1]) nbrs.push({ z, sd, ...((w) => ({ w, off: HW(z) + 6 + w + r() * 14 }))(5 + r() * 6), top: gy(Math.min(z, STREET2 - 1)) + (r() < 0.45 ? -5 - r() * 10 : 4 + r() * 16), col: BCOL[(r() * BCOL.length) | 0], seed: (r() * 1e6) | 0, neon: r() < 0.3 ? ADS[(r() * ADS.length) | 0] : null });
    const byZ = a => a.sort((p, q) => p.z - q.z || p.z0 - q.z0);
    return { bld: bld.sort((p, q) => p.z0 - q.z0), stalls, lamps: byZ(lamps), scoots, ads, far: byZ(far), cranes, clouds, desks, nbrs: byZ(nbrs) };
  })();

  // ---- small helpers
  function speck(D, R, p, rad, col) {                             // a light far below: one square
    const q = D.toCam(R.cam, p);
    if (q[2] < 1) return;
    const [sx, sy] = D.scr(R.cam, q), rr = clamp(R.cam.F / q[2] * rad, 1.5, 6);
    D.rect(sx - rr, sy - rr, rr * 2, rr * 2, col, 0.85);
  }
  const animals = () => (root.SkiChars ? root.SkiChars.list.map(c => c.id) : []);   // the other mascots, working late (chars.js loads after the maps)
  // text facing the camera at a point, size in world units (only when it would be readable). Each sign's text is set
  // once into its own little canvas and then just scaled onto the screen (setting text every frame is slow)
  const TXT = new Map();
  function textImg(str, col, stroke) {
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
  function text3(D, R, p, str, size, col, o = {}) {
    const q = D.toCam(R.cam, p);
    if (q[2] < 1 || q[2] > (o.far || 80)) return;
    const [sx, sy] = D.scr(R.cam, q), px = R.cam.F / q[2] * size;
    if (px < 7) return;
    const im = textImg(str, col, o.stroke || null);
    if (!im) { D.txt(str, sx, sy + px * 0.38, { size: Math.round(px), color: col, align: 'center', alpha: o.alpha ?? 1 }); return; }
    const k = px / im.S, w = im.w * k, h = im.h * k;
    D.ctx.drawImage(im.cv, sx - w / 2, sy - h / 2, w, h);
  }
  function glowDot(D, R, p, rad, col, a = 0.5) {                 // a light seen from afar: a soft disc and a bright core
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.8) return;
    const [sx, sy] = D.scr(R.cam, q), rr = clamp(R.cam.F / q[2] * rad, 2, 26), g = D.ctx;
    if (rr < 5) { D.rect(sx - rr, sy - rr, rr * 2, rr * 2, col, Math.min(1, a * 1.6)); return; }   // (far off: just a speck of light)
    g.save(); g.globalAlpha *= a * 0.45; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr * 2.2, 0, 7); g.fill();
    g.globalAlpha = Math.min(1, a * 2); g.beginPath(); g.arc(sx, sy, rr * 0.8, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy, rr * 0.4, 0, 7); g.fill(); g.restore();
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
  // a box at absolute heights (y0..y1), x across from the centre line
  function boxA(D, R, z0, z1, x0, x1, y0, y1, cols) {
    const p = (z, x, y) => [R.wx(z, x), y, z], cam = R.cam;
    if (cols.top) D.poly3(cam, [p(z0, x0, y1), p(z0, x1, y1), p(z1, x1, y1), p(z1, x0, y1)], cols.top, 1, [0, 1, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z1, x0, y0), p(z1, x0, y1), p(z0, x0, y1)], cols.side, 1, [-1, 0, 0]);
    D.poly3(cam, [p(z0, x1, y0), p(z1, x1, y0), p(z1, x1, y1), p(z0, x1, y1)], cols.side, 1, [1, 0, 0]);
    D.poly3(cam, [p(z0, x0, y0), p(z0, x1, y0), p(z0, x1, y1), p(z0, x0, y1)], cols.front, 1, [0, 0, -1]);
  }
  const lit = (seed, i) => { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };   // the same window lit every frame
  function windows(D, R, face, n, m, seed, dens = 0.45) {        // face(u, v) → point; n columns × m floors of lit windows
    n = Math.min(n, 8); m = Math.min(m, 10);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const v = lit(seed, i * 31 + j);
      if (v > dens) continue;
      const col = v < dens * 0.25 ? '#9fd8ff' : v < dens * 0.4 ? '#ffb86a' : '#ffe2a0', u0 = (i + 0.2) / n, u1 = (i + 0.8) / n, v0 = (j + 0.25) / m, v1 = (j + 0.75) / m;
      D.poly3(R.cam, [face(u0, v0), face(u1, v0), face(u1, v1), face(u0, v1)], col);
    }
  }

  // ---- the street: shops and flats with neon signboards
  function building(D, R, b) {
    const { cam, wx, zc } = R, sd = b.sd, X = b.off, base = Math.min(gy(b.z0), gy(b.z1)) - 1, top = gy(b.z0) + b.h, near = Math.abs(b.z0 - zc) < 70;
    const P = (z, x, y) => [wx(z, sd * x), y, z];
    D.poly3(cam, [P(b.z0, X, base), P(b.z1, X, base), P(b.z1, X, top), P(b.z0, X, top)], b.col, 1, [-sd, 0, 0]);
    if (zc < b.z0) D.poly3(cam, [P(b.z0, X, base), P(b.z0, X + b.d, base), P(b.z0, X + b.d, top), P(b.z0, X, top)], mixDark(b.col), 1, [0, 0, -1]);
    const fy = z => gy(z);
    if (!near) { windows(D, R, (u, v) => P(lerp(b.z0, b.z1, u), X - 0.02, lerp(fy(b.z0) + 4, top - 1, v)), 3, 3, b.seed, 0.5); return; }
    windows(D, R, (u, v) => P(lerp(b.z0, b.z1, u), X - 0.02, lerp(fy(b.z0) + 4, top - 1, v)), Math.min(5, Math.max(2, Math.round((b.z1 - b.z0) / 2.6))), Math.min(6, Math.max(2, Math.round((b.h - 5) / 3))), b.seed);
    const y0 = gy(b.z1) + 0.2, y1 = y0 + 2.8;                      // the shop front, lit, with an awning
    D.poly3(cam, [P(b.z0 + 0.4, X - 0.03, y0), P(b.z1 - 0.4, X - 0.03, y0), P(b.z1 - 0.4, X - 0.03, y1), P(b.z0 + 0.4, X - 0.03, y1)], '#f0d89a', 0.6, [-sd, 0, 0]);
    D.poly3(cam, [P(b.z0 + 0.4, X - 0.04, y1 - 0.25), P(b.z1 - 0.4, X - 0.04, y1 - 0.25), P(b.z1 - 0.4, X - 0.04, y1), P(b.z0 + 0.4, X - 0.04, y1)], b.shop, 1, [-sd, 0, 0]);
    D.poly3(cam, [P(b.z0 + 0.3, X, y1 + 0.1), P(b.z1 - 0.3, X, y1 + 0.1), P(b.z1 - 0.3, X - 0.9, y1 - 0.3), P(b.z0 + 0.3, X - 0.9, y1 - 0.3)], mixDark(b.shop), 0.9);
    for (let y = fy(b.z0) + 6.5; y < top - 1.5; y += 3) D.poly3(cam, [P(b.z0 + 1, X - 0.6, y), P(b.z1 - 1, X - 0.6, y), P(b.z1 - 1, X - 0.6, y + 0.12), P(b.z0 + 1, X - 0.6, y + 0.12)], '#1a1d26');   // iron window grilles
    if (b.sign) {                                                 // a vertical signboard sticking out over the pavement
      const s = b.sign, z = lerp(b.z0, b.z1, s.at), sy0 = fy(z) + s.y, n = s.t.length, sy1 = sy0 + 1.3 * n + 0.6, x0 = X - 0.1, x1 = X - 1.6;
      D.poly3(cam, [P(z, x0 + 0.15, sy0 - 0.15), P(z, x1 - 0.15, sy0 - 0.15), P(z, x1 - 0.15, sy1 + 0.15), P(z, x0 + 0.15, sy1 + 0.15)], NEON[b.seed % 6], 0.35);
      D.poly3(cam, [P(z, x0, sy0), P(z, x1, sy0), P(z, x1, sy1), P(z, x0, sy1)], s.c[0]);
      for (let k = 0; k < n; k++) text3(D, R, P(z - 0.02, (x0 + x1) / 2, sy1 - 0.95 - k * 1.3), s.t[k], 1.05, s.c[1], { far: 60 });
    }
  }
  const mixDark = c => root.SkiCore.mixHex(c, '#05060c', 0.35);
  function stall(D, R, st) {                                      // a night-market stall on the pavement: lit counter, striped roof, sign
    const { cam, wx } = R, X = -(HW(st.z) + 0.4), z0 = st.z - 2.4, z1 = st.z + 2.4, y = gy(st.z), P = (z, x, yy) => [wx(z, x), y + yy, z];
    D.poly3(cam, [P(z0, X, 0), P(z1, X, 0), P(z1, X, 1.1), P(z0, X, 1.1)], '#c9a36a', 1, [1, 0, 0]);
    D.poly3(cam, [P(z0, X, 1.1), P(z1, X, 1.1), P(z1, X - 0.6, 1.1), P(z0, X - 0.6, 1.1)], '#fff1c8');
    D.poly3(cam, [P(z0, X - 2.4, 1.1), P(z1, X - 2.4, 1.1), P(z1, X - 2.4, 2.6), P(z0, X - 2.4, 2.6)], '#ffcf6a', 0.8, [1, 0, 0]);
    for (let k = 0; k < 4; k++) { const za = lerp(z0, z1, k / 4), zb = lerp(z0, z1, (k + 1) / 4); D.poly3(cam, [P(za, X + 0.4, 2.8), P(zb, X + 0.4, 2.8), P(zb, X - 2.6, 3.4), P(za, X - 2.6, 3.4)], k % 2 ? '#ffffff' : st.c); }
    D.poly3(cam, [P(z0, X + 0.3, 3.5), P(z1, X + 0.3, 3.5), P(z1, X + 0.3, 4.5), P(z0, X + 0.3, 4.5)], '#1a1d26', 1, [1, 0, 0]);
    text3(D, R, P(st.z, X + 0.25, 4.0), st.t, 0.75, st.c, { far: 55 });
    for (let k = 0; k < 4; k++) speck(D, R, P(lerp(z0, z1, (k + 0.5) / 4), X + 0.35, 2.75), 0.08, '#ffe2a0');
  }
  function lamp(D, R, l) {                                        // a street lamp: pole, arm, the lamp, a pool of light under it
    const { cam, wx } = R, z = l.z, sd = l.sd, X = sd * (HW(z) + (zone(z) === 'hwy' ? 1.3 : 1.7)), y = Math.min(gy(z), floorY(z)), top = gy(z) + 8.5;
    D.poly3(cam, [[wx(z, X) - 0.12, y, z], [wx(z, X) + 0.12, y, z], [wx(z, X) + 0.12, top, z], [wx(z, X) - 0.12, top, z]], '#4a4f5c');
    D.poly3(cam, [[wx(z, X), top, z], [wx(z, X - sd * 2.6), top + 0.4, z], [wx(z, X - sd * 2.6), top + 0.2, z], [wx(z, X), top - 0.2, z]], '#4a4f5c');
    glowDot(D, R, [wx(z, X - sd * 2.6), top + 0.15, z], 0.35, C.light, 0.85);
  }
  function scooterPark(D, R, s) { R.billboard({ ...PIX.scooter, cols: { ...PIX.scooter.cols, R: s.c } }, s.z, s.x, 0.25); }
  function ad(D, R, a) {                                          // a big lit billboard on a pole beside the highway
    const { cam, wx } = R, X = a.sd * (HW(a.z) + 7), y = gy(a.z), P = (x, yy) => [wx(a.z, X + x), y + yy, a.z];
    D.poly3(cam, [P(-0.25, -2), P(0.25, -2), P(0.25, 9), P(-0.25, 9)], '#3a3f4c');
    D.poly3(cam, [P(-6.4, 8.6), P(6.4, 8.6), P(6.4, 13.4), P(-6.4, 13.4)], a.c, 0.4);
    D.poly3(cam, [P(-6, 9), P(6, 9), P(6, 13), P(-6, 13)], '#141826');
    D.poly3(cam, [P(-6, 9), P(6, 9), P(6, 9.25), P(-6, 9.25)], a.c); D.poly3(cam, [P(-6, 12.75), P(6, 12.75), P(6, 13), P(-6, 13)], a.c);
    text3(D, R, P(0, 11), a.t, 1.9, '#ffffff', { far: 125, stroke: a.c });
  }
  function farBuilding(D, R, b) {                                 // the city round the highway: towers with lit windows
    const { cam, wx } = R, X = b.sd * (HW(b.z) + b.off), y = Math.min(gy(b.z), floorY(b.z)) - 2, top = gy(b.z) + b.h, P = (x, z, yy) => [wx(z, X + x), yy, z];
    D.poly3(cam, [P(-b.w, b.z, y), P(b.w, b.z, y), P(b.w, b.z, top), P(-b.w, b.z, top)], b.col, 1, [0, 0, -1]);
    D.poly3(cam, [P(-b.sd * b.w, b.z, y), P(-b.sd * b.w, b.z + b.w * 1.6, y), P(-b.sd * b.w, b.z + b.w * 1.6, top), P(-b.sd * b.w, b.z, top)], mixDark(b.col), 1, [-b.sd, 0, 0]);
    windows(D, R, (u, v) => P(lerp(-b.w, b.w, u), b.z - 0.02, lerp(y + 3, top - 1, v)), Math.round(b.w / 1.6), Math.round(b.h / 3.2), b.seed, 0.35);
    if (b.h > 40) glowDot(D, R, P(0, b.z, top + 0.5), 0.3, '#ff3030', Math.floor(R.t * 1.4 + b.seed) % 2 ? 0.9 : 0.25);
  }
  function crane(D, R, c) {                                       // a tower crane over the building site, its warning lights blinking
    const { cam, wx } = R, y = floorY(c.z), top = gy(c.z) + 8 + c.h * 0.2, X = wx(c.z, c.x), P = (x, yy, dz = 0) => [X + x, yy, c.z + dz];
    for (const dx of [-0.8, 0.8]) D.poly3(cam, [P(dx - 0.15, y), P(dx + 0.15, y), P(dx + 0.15, top), P(dx - 0.15, top)], '#e0a81a');
    for (let yy = y + 3; yy < top; yy += 3) D.poly3(cam, [P(-0.8, yy), P(0.8, yy + 2.6), P(0.8, yy + 2.9), P(-0.8, yy + 0.3)], '#c8901a');
    D.poly3(cam, [P(-c.jib * 0.25, top), P(c.jib, top), P(c.jib, top + 0.7), P(-c.jib * 0.25, top + 0.9)], '#e0a81a');
    D.poly3(cam, [P(-c.jib * 0.25 - 1, top - 1.6), P(-c.jib * 0.25 + 2, top - 1.6), P(-c.jib * 0.25 + 2, top), P(-c.jib * 0.25 - 1, top)], '#5a5f6c');
    D.poly3(cam, [P(c.jib * 0.7 - 0.04, top), P(c.jib * 0.7 + 0.04, top), P(c.jib * 0.7 + 0.04, top - 14), P(c.jib * 0.7 - 0.04, top - 14)], '#2a2d36');
    const on = Math.floor(R.t * 1.2) % 2;
    glowDot(D, R, P(c.jib, top + 0.9), 0.35, '#ff3030', on ? 0.9 : 0.2); glowDot(D, R, P(0, top + 1.6), 0.35, '#ff3030', on ? 0.2 : 0.9);
  }

  // ---- the jumbo jet
  // the fuselage in cross-section: a circle whose top is the strip she rides (±FW), bulging out well beyond it below,
  // so from above its round sides, its windows and its stripe show
  // its back is drawn rounded (falling away CROWN at the edges of the strip she rides), shaded light to dark, with
  // the blue cheat line and a row of windows where it curves down
  const A0 = 0.85, BANDS = [A0, 0.45, 0, -0.5, -1.0, -1.5708], BCOLS = ['#c3cbd8', '#b3bccb', C.jetB, '#9aa3b4', '#8a93a6'], CROWN = 0.75, WY = -0.32;                // (the wings sit a little below the spine, rising out of its shoulders)
  const backY = (x, f) => -CROWN * (x / f) * (x / f);
  const ring = f => { const rr = f / Math.cos(A0), c0 = -CROWN - rr * Math.sin(A0); return BANDS.map(a => [rr * Math.cos(a), c0 + rr * Math.sin(a)]); };
  const BACK = ['#f4f7fb', '#eef2f8', '#e3e9f2', '#d5dce8', '#c8d0dd'];
  function jetSlice(D, R, za, zb, near) {
    const { cam, P3 } = R, k = ((Math.floor(za / 2) % 2) + 2) % 2;
    const fa = FW(za), fb = FW(zb), ha = HW(za), hb = HW(zb), ra = ring(fa), rb = ring(fb);
    for (const sd of [-1, 1]) for (let i = BANDS.length - 2; i >= 0; i--) {   // its sides, belly first
      const am = (BANDS[i] + BANDS[i + 1]) / 2;
      D.poly3(cam, [P3(za, sd * ra[i][0], ra[i][1]), P3(zb, sd * rb[i][0], rb[i][1]), P3(zb, sd * rb[i + 1][0], rb[i + 1][1]), P3(za, sd * ra[i + 1][0], ra[i + 1][1])], BCOLS[i], 1, [sd * Math.cos(am), Math.sin(am), 0]);
    }
    for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) {        // its rounded back, strip by strip from the spine out
      const u0 = i / 5, u1 = (i + 1) / 5, q = (z, f, u) => P3(z, sd * u * f, backY(u * f, f));
      D.poly3(cam, [q(za, fa, u0), q(za, fa, u1), q(zb, fb, u1), q(zb, fb, u0)], BACK[i]);
    }
    for (const sd of [-1, 1]) {                                     // the cheat line where it curves down, and the windows above it
      const q = (z, f, u, up = 0.004) => P3(z, sd * u * f, backY(u * f, f) + up);
      D.poly3(cam, [q(za, fa, 0.9), q(za, fa, 1), q(zb, fb, 1), q(zb, fb, 0.9)], C.jetB);
      D.poly3(cam, [q(za, fa, 0.77, 0.006), q(za, fa, 0.83, 0.006), q(zb, fb, 0.83, 0.006), q(zb, fb, 0.77, 0.006)], '#7d8aa6');
      if (near) for (let z = Math.ceil(za / 0.7) * 0.7; z < zb; z += 0.7) { const f = FW(z); D.poly3(cam, [q(z, f, 0.765, 0.008), q(z, f, 0.835, 0.008), q(z + 0.3, f, 0.835, 0.008), q(z + 0.3, f, 0.765, 0.008)], '#ffe2a0'); }
    }
    if (near) D.poly3(cam, [P3(za, -0.04, 0.004), P3(za, 0.04, 0.004), P3(zb, 0.04, 0.004), P3(zb, -0.04, 0.004)], '#c4cbd8');
    for (const w of [{ R: WR, T: WT, tip: TIP, y: WY }, { ...TP, y: -0.15 }]) {   // the wings and the tailplane, swept back
      const xin = z => (z >= w.R[0] ? FW(z) * 0.62 : 3.2 + (w.R[0] - z) / (w.R[0] - w.T[0]) * (w.tip - 3.2)), xout = z => (z >= w.T[1] ? leadX(z, w) : w.tip);
      const cuts = [za, zb]; for (const c of [w.T[0], w.T[1], w.R[0]]) if (c > za && c < zb) cuts.splice(cuts.length - 1, 0, c);
      cuts.sort((p, q) => p - q);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a0 = Math.max(cuts[i], w.T[0]), a1 = Math.min(cuts[i + 1], w.R[1]);
        if (a1 <= a0) continue;
        for (const sd of [-1, 1]) {
          D.poly3(cam, [P3(a0, sd * xin(a0), w.y), P3(a0, sd * xout(a0), w.y), P3(a1, sd * xout(a1), w.y), P3(a1, sd * xin(a1), w.y)], k ? C.wing : '#ccd3df');
          D.poly3(cam, [P3(a0, sd * xout(a0), w.y + 0.004), P3(a0, sd * (xout(a0) - 0.5), w.y + 0.004), P3(a1, sd * (xout(a1) - 0.5), w.y + 0.004), P3(a1, sd * xout(a1), w.y + 0.004)], C.wingE);
        }
      }
    }
    if (za <= PLANE[0] && zb > PLANE[0]) {                          // the tail end: a cone with the little engine's exhaust in it
      const r = ring(FW(PLANE[0])), p = [];
      p.push(P3(PLANE[0], 0, 0));
      for (const sd of [1, -1]) for (let i = 0; i < r.length; i++) { const j = sd > 0 ? i : r.length - 1 - i; p.push(P3(PLANE[0], sd * r[j][0], r[j][1])); }
      D.poly3(cam, p, '#c9d0dc', 1, [0, 0, -1]);
      glowDot(D, R, P3(PLANE[0] - 0.05, 0, r[3][1]), 0.3, '#ff9a3a', 0.6);
    }
    if (za <= PLANE[1] && zb > PLANE[1]) noseCone(D, R);
  }
  function noseCone(D, R) {                                       // the nose: the fuselage closing to a rounded point, the cockpit windows on top
    const { cam, P3 } = R, z = PLANE[1], f = FW(z), r = ring(f), T = P3(z + 4.2, 0, r[3][1] * 0.75), mid = (p, q, u) => p.map((v, i) => v + (q[i] - v) * u);
    for (const sd of [-1, 1]) for (let i = r.length - 2; i >= 0; i--) D.poly3(cam, [P3(z, sd * r[i][0], r[i][1]), P3(z, sd * r[i + 1][0], r[i + 1][1]), T], BCOLS[i]);
    const a = P3(z, -f, -CROWN), b = P3(z, f, -CROWN), top = P3(z, 0, 0);
    D.poly3(cam, [a, top, T], '#e3e9f2'); D.poly3(cam, [top, b, T], '#e3e9f2');
    for (let k = 0; k < 4; k++) {                                    // four cockpit panes across the top of the nose
      const u0 = k / 4, u1 = (k + 1) / 4, e0 = mid(a, b, u0 + 0.03), e1 = mid(a, b, u1 - 0.03);
      D.poly3(cam, [mid(e0, T, 0.18), mid(e1, T, 0.18), mid(e1, T, 0.38), mid(e0, T, 0.38)], '#1f3a6a');
    }
    D.poly3(cam, [mid(a, T, 0.42), mid(b, T, 0.42), mid(b, T, 0.47), mid(a, T, 0.47)], '#ffffff', 0.4);
  }
  function fin(D, R) {                                            // the tail fin: tall, swept back, in the airline's dark blue with a yellow moon
    const { cam, P3, t } = R, z0 = PLANE[0] + 2, z1 = PLANE[0] + 13, H = FIN_H, T0 = z0 - 2.2, T1 = z0 + 3.2;   // root [z0, z1], top [T0, T1]
    const w0 = 0.5, w1 = 0.18, P = (z, sd, w, y) => P3(z, sd * w, y);
    for (const sd of [-1, 1]) {
      D.poly3(cam, [P(z0, sd, w0, 0), P(z1, sd, 0.08, 0), P(T1, sd, 0.05, H), P(T0, sd, w1, H)], '#1f3f8f', 1, [sd, 0, 0]);
      D.poly3(cam, [P(z0 + 0.3, sd, w0 + 0.01, 0.15), P(z0 + 3.5, sd, 0.36, 0.15), P(T0 + 2.4, sd, w1 + 0.01, H - 0.2), P(T0 + 0.3, sd, w1 + 0.01, H - 0.2)], '#2f5fbf', 1, [sd, 0, 0]);   // the rudder, a shade lighter
      const m = [], cz = (z0 + T1) / 2 + 0.6, cy = H * 0.55;
      for (let k = 0; k <= 8; k++) { const a = -1.2 + k / 8 * 2.4; m.push(P(cz + Math.cos(a) * 1.4, sd, 0.32, cy + Math.sin(a) * 1.4)); }
      for (let k = 8; k >= 0; k--) { const a = -1.2 + k / 8 * 2.4; m.push(P(cz + 0.5 + Math.cos(a) * 1.0, sd, 0.32, cy + Math.sin(a) * 1.15)); }
      D.poly3(cam, m, '#ffe14a', 1, [sd, 0, 0]);
    }
    D.poly3(cam, [P(z0, -1, w0, 0), P(z0, 1, w0, 0), P(T0, 1, w1, H), P(T0, -1, w1, H)], '#18326f', 1, [0, 0, -1]);   // its back edge, seen from behind
    D.poly3(cam, [P(T0, -1, w1, H), P(T0, 1, w1, H), P(T1, 1, 0.05, H), P(T1, -1, 0.05, H)], '#2f5fbf', 1, [0, 1, 0]);   // its tip
    D.poly3(cam, [P(z0 + 0.4, -1, w0 + 0.02, 0.4), P(z0 + 0.4, 1, w0 + 0.02, 0.4), P(z0 + 0.25, 1, w0 + 0.02, 1.0), P(z0 + 0.25, -1, w0 + 0.02, 1.0)], '#ffffff', 1, [0, 0, -1]);   // a white tail light
    glowDot(D, R, P3(T0 + 0.6, 0, H + 0.15), 0.25, '#ff3030', Math.floor(t * 1.5) % 2 ? 1 : 0.2);
  }
  const leadZ = x => WR[1] - (Math.abs(x) - 3.2) / (TIP - 3.2) * (WR[1] - WT[1]);   // where the wing's leading edge is, x across
  function engines(D, R) {                                        // four engines hanging under the wings, their fronts sticking out ahead of them; wingtip lights
    const { cam, P3, t } = R;
    for (const x of [-18, -9.5, 9.5, 18]) {
      const z0 = leadZ(x) - 1, z1 = leadZ(x) + 3.2, yc = WY - 1.3, rr = 0.9, sd = Math.sign(x);
      D.poly3(cam, [P3(z0, x - 0.12, yc + rr), P3(z1 - 1.5, x - 0.12, yc + rr), P3(z1 - 1.5, x - 0.12, WY), P3(z0, x - 0.12, WY)], C.jetD);   // the pylon
      for (const [a0, a1, col] of [[Math.PI * 0.75, Math.PI * 0.25, '#c9d0dc'], [Math.PI * 0.25, -Math.PI * 0.2, '#aab2c0'], [Math.PI * 0.75, Math.PI * 1.2, '#aab2c0']]) {
        const P = (z, a) => P3(z, x + Math.cos(a) * rr, yc + Math.sin(a) * rr);
        D.poly3(cam, [P(z0, a0), P(z1, a0), P(z1, a1), P(z0, a1)], col);
      }
      D.poly3(cam, [P3(z1, x - rr, yc), P3(z1, x + rr, yc), P3(z1 + 0.02, x + rr * 0.7, yc + rr * 0.72), P3(z1 + 0.02, x - rr * 0.7, yc + rr * 0.72)], '#5a6070');   // the intake's lip
    }
    for (const sd of [-1, 1]) {                                     // winglets at the tips
      D.poly3(cam, [P3(WT[0], sd * TIP, WY), P3(WT[1], sd * TIP, WY), P3(WT[1] - 1.2, sd * TIP, WY + 1.8), P3(WT[0] + 0.4, sd * TIP, WY + 1.8)], C.jetB);
    }
    const tip = (sd, col, on) => glowDot(D, R, P3(WT[0] + 1, sd * (TIP - 0.2), WY + 1.9), 0.3, col, on ? 1 : 0.35);
    tip(-1, '#ff3030', true); tip(1, '#3aff6a', true);
    if ((t * 1.1) % 1 < 0.08) { tip(-1, '#ffffff', true); tip(1, '#ffffff', true); }
  }
  function cloud(D, R, c) {
    const z = c.zz, q = D.toCam(R.cam, [R.wx(z, c.x), gy(PLANE[0]) + c.y, z]);
    if (q[2] < 2) return;
    const [sx, sy] = D.scr(R.cam, q), s = R.cam.F / q[2] * c.s, g = D.ctx;
    g.save(); g.globalAlpha *= 0.32; g.fillStyle = '#8a92b8';
    for (const [dx, dy, rr] of [[0, 0, 1], [-0.9, 0.15, 0.7], [0.9, 0.1, 0.75], [0.3, -0.35, 0.6]]) { g.beginPath(); g.ellipse(sx + dx * s, sy + dy * s, rr * s, rr * s * 0.42, 0, 0, 7); g.fill(); }
    g.restore();
  }

  // R moved by sh = [dx, dy, dz] (the jet where it has flown to)
  function shifted(R, sh) {
    if (!sh) return R;
    const m = f => (z, x, up = 0) => { const p = f(z, x, up); return [p[0] + sh[0], p[1] + sh[1], p[2] + sh[2]]; };
    return { ...R, P3: m(R.P3), S3: m(R.S3), billboard: (art, z, x, up, a, sq) => R.billboard(art, z, x, up, a, sq, sh) };
  }

  // ---- the skyscraper: a wide base (her floor near its top) and a tower set back on it, both well below the jet. Seen
  // from above as she dives: the base's roof terrace with its lights, the tower's front, its roof with a helipad,
  // air-conditioners, a mast and a neon sign. Every window alike (the one she smashes looks like all the others)
  const TW = 30, FL = 4.2, A_TOP = gy(TOWER[0]) + 3 * FL, BW = 19, BZ = [TOWER[0] + 10, TOWER[1] - 10], B_TOP = gy(TOWER[0]) + 30;
  function towerFace(D, R) {
    const { cam, wx, t } = R, z = TOWER[0], Yf = gy(z), broken = R.sz > z - 0.4, n = [0, 0, -1];
    const hx = HW(z) + 0.8, hy0 = Yf - 0.6, hy1 = Yf + CEIL + 0.2;
    const A = (zz, x, y) => [wx(zz, x), y, zz];
    const face = (zz, x0, x1, y0, y1, col, a = 1) => D.poly3(cam, [A(zz, x0, y0), A(zz, x1, y0), A(zz, x1, y1), A(zz, x0, y1)], col, a, n);
    const top = (z0, z1, x0, x1, y, col, a = 1) => D.poly3(cam, [A(z0, x0, y), A(z0, x1, y), A(z1, x1, y), A(z1, x0, y)], col, a, [0, 1, 0]);
    // a glass front, floor by floor, lit here and there
    function glass(zz, x0, x1, y0, y1, seed, skip) {
      for (let y = Yf + FL * Math.floor((y0 - Yf) / FL); y < y1 - 0.1; y += FL) {
        if (y + FL <= y0) continue;
        const fi = Math.round((y - Yf) / FL);
        for (let x = x0, i = 0; x < x1 - 0.1; x += 3, i++) {
          if (skip && skip(fi, x)) continue;
          const v = lit(fi * 7 + seed, i);
          if (v < 0.42 && (v < 0.3 || Math.abs(fi) < 6)) face(zz, x + 0.15, Math.min(x1, x + 2.85), Math.max(y0, y + 0.5), Math.min(y1, y + FL - 0.4), v < 0.1 ? '#9fd8ff' : v < 0.3 ? '#ffe7b0' : '#6f86b8', v < 0.3 ? 0.9 : 0.5);
        }
        if (y > y0) face(zz, x0, x1, y - 0.12, y + 0.12, '#0c1428');
      }
      for (let x = x0; x <= x1 + 0.01; x += 3) face(zz, x - 0.07, x + 0.07, y0, skip && broken && x > -hx && x < hx && y0 < hy0 ? hy0 : y1, '#0c1428');
    }
    // the base: its front (with her floor), its roof terrace
    face(z, -TW, TW, FLOOR - 2, hy0, '#16223e'); face(z, -TW, TW, hy1, A_TOP, '#16223e'); face(z, -TW, -hx, hy0, hy1, '#16223e'); face(z, hx, TW, hy0, hy1, '#16223e');
    if (!broken) face(z, -hx, hx, hy0, hy1, '#16223e');
    glass(z, -TW, TW, FLOOR, A_TOP, 3, (fi, x) => broken && fi === 0 && x + 3 > -hx && x < hx);
    top(z, TOWER[1], -TW, TW, A_TOP, '#2a3146');
    top(z, z + 1.2, -TW, TW, A_TOP + 0.01, '#4a5266');                                        // the parapet along its front edge
    face(z - 0.01, -TW, TW, A_TOP - 0.5, A_TOP + 0.6, '#3a4256');
    for (let x = -TW + 2; x < TW; x += 4) glowDot(D, R, A(z - 0.05, x, A_TOP + 0.7), 0.2, '#fff2c0', 0.6);   // lights along the edge
    for (const [x0, x1, z0] of [[-TW + 3, -BW - 3, z + 6], [BW + 3, TW - 3, z + 6]]) {          // planters on the terrace
      top(z0, z0 + 14, x0, x1, A_TOP + 0.6, '#2f5f3a'); face(z0, x0, x1, A_TOP, A_TOP + 0.6, '#3a4256');
    }
    // the tower set back on it: its front, its roof
    face(BZ[0], -BW, BW, A_TOP, B_TOP, '#1a2848');
    glass(BZ[0], -BW, BW, A_TOP, B_TOP, 11);
    top(BZ[0], BZ[1], -BW, BW, B_TOP, '#2c3348');
    top(BZ[0], BZ[0] + 1, -BW, BW, B_TOP + 0.01, '#4a5266'); face(BZ[0] - 0.01, -BW, BW, B_TOP - 0.4, B_TOP + 0.7, '#3a4256');
    const hz0 = BZ[0] + 22, Y = B_TOP + 0.02;                                                   // the helipad: a yellow ring, a white H
    const ring = (r0, r1, col) => { for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; D.poly3(cam, [A(hz0 + Math.sin(a0) * r0, Math.cos(a0) * r0, Y), A(hz0 + Math.sin(a1) * r0, Math.cos(a1) * r0, Y), A(hz0 + Math.sin(a1) * r1, Math.cos(a1) * r1, Y), A(hz0 + Math.sin(a0) * r1, Math.cos(a0) * r1, Y)], col); } };
    ring(0, 9, '#3a4256'); ring(7.6, 8.6, '#ffcf3a');
    top(hz0 - 4, hz0 + 4, -3, -1.8, Y + 0.01, '#ffffff'); top(hz0 - 4, hz0 + 4, 1.8, 3, Y + 0.01, '#ffffff'); top(hz0 - 0.6, hz0 + 0.6, -1.8, 1.8, Y + 0.01, '#ffffff');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; glowDot(D, R, A(hz0 + Math.sin(a) * 8.1, Math.cos(a) * 8.1, Y + 0.1), 0.18, '#7fe0ff', Math.floor(t * 2 + k) % 2 ? 0.9 : 0.4); }
    for (const [x0, zz] of [[-BW + 2, BZ[0] + 4], [-BW + 6, BZ[0] + 4], [BW - 5, BZ[0] + 4], [-BW + 2, BZ[0] + 40], [BW - 6, BZ[0] + 44]]) {   // air-conditioners, a water tank
      D.box3(cam, wx(zz, x0), wx(zz, x0 + 3), B_TOP, B_TOP + 1.6, zz, zz + 3, { side: '#6c717e', rear: '#8a8fa0', front: '#8a8fa0', top: '#a9aebb' });
    }
    const mz = BZ[1] - 12, mx = BW - 4;                                                         // the mast, its red light blinking
    D.poly3(cam, [A(mz, mx - 0.3, B_TOP), A(mz, mx + 0.3, B_TOP), A(mz, mx + 0.1, B_TOP + 12), A(mz, mx - 0.1, B_TOP + 12)], '#5a5f6c', 1, n);
    glowDot(D, R, A(mz, mx, B_TOP + 12.3), 0.5, '#ff3030', Math.floor(t * 1.2) % 2 ? 1 : 0.3);
    face(BZ[0] + 1.5, -10, 10, B_TOP + 0.5, B_TOP + 4.5, '#141826');                            // a neon sign on the roof's front edge
    for (const yy of [B_TOP + 0.5, B_TOP + 4.3]) face(BZ[0] + 1.49, -10, 10, yy, yy + 0.2, '#3ff2ff');
    text3(D, R, A(BZ[0] + 1.45, 0, B_TOP + 2.5), '星光大樓', 2.4, '#3ff2ff', { far: 160, stroke: '#141826' });
    if (broken) {                                                                               // smashed: jagged teeth of glass round the hole
      const P = (x, y) => A(z, x, y);
      for (let x = -hx, i = 0; x < hx; x += 0.9, i++) {
        const l = 0.3 + ((i * 7) % 5) * 0.18;
        D.poly3(cam, [P(x, hy1), P(x + 0.9, hy1), P(x + 0.45, hy1 - l)], '#bfe6ff', 0.75, n);
        D.poly3(cam, [P(x, hy0), P(x + 0.9, hy0), P(x + 0.45, hy0 + l * 0.7)], '#bfe6ff', 0.75, n);
      }
      for (const sd of [-1, 1]) for (let y = hy0, i = 0; y < hy1; y += 0.8, i++) { const l = 0.3 + ((i * 5) % 4) * 0.2; D.poly3(cam, [P(sd * hx, y), P(sd * hx, y + 0.8), P(sd * (hx - l), y + 0.4)], '#bfe6ff', 0.75, n); }
    }
  }
  function officeSlice(D, R, za, zb, near) {
    const { cam, P3, t } = R, k = ((Math.floor(za / 2) % 2) + 2) % 2, h0 = HW(za), h1 = HW(zb), W0 = h0 + OW, W1 = h1 + OW;
    D.poly3(cam, [P3(za, -W0, 0), P3(za, W0, 0), P3(zb, W1, 0), P3(zb, -W1, 0)], C.carpet[k]);
    D.poly3(cam, [P3(za, -h0, 0.004), P3(za, h0, 0.004), P3(zb, h1, 0.004), P3(zb, -h1, 0.004)], C.aisle[k]);
    for (const sd of [-1, 1]) {                                     // window walls: the night city outside
      D.poly3(cam, [P3(za, sd * W0, 0), P3(zb, sd * W1, 0), P3(zb, sd * W1, CEIL), P3(za, sd * W0, CEIL)], '#0f1830', 1, [-sd, 0, 0]);
      if (near) for (let z = Math.ceil(za / 3) * 3; z < zb; z += 3) D.poly3(cam, [P3(z - 0.08, sd * (W0 - 0.01), 0), P3(z + 0.08, sd * (W0 - 0.01), 0), P3(z + 0.08, sd * (W0 - 0.01), CEIL), P3(z - 0.08, sd * (W0 - 0.01), CEIL)], '#3a4258', 1, [-sd, 0, 0]);
      if (near) for (let j = 0; j < 3; j++) { const r = rng(Math.floor(za) * 13 + j + (sd > 0 ? 7 : 0)), z = lerp(za, zb, r()), y = 1 + r() * 4.5; D.poly3(cam, [P3(z, sd * (W0 - 0.02), y), P3(z + 0.25, sd * (W0 - 0.02), y), P3(z + 0.25, sd * (W0 - 0.02), y + 0.25), P3(z, sd * (W0 - 0.02), y + 0.25)], r() < 0.5 ? '#ffe2a0' : '#9fd8ff', 1, [-sd, 0, 0]); }
    }
    D.poly3(cam, [P3(za, -W0, CEIL), P3(za, W0, CEIL), P3(zb, W1, CEIL), P3(zb, -W1, CEIL)], C.ceil, 1, [0, -1, 0]);
    for (let z = Math.ceil(za / 4) * 4; z < zb; z += 4) for (const x of [-3, 3]) {   // fluorescent panels; one flickers
      const fl = Math.floor(z / 4) % 7 === 3 && Math.sin(t * 37) > 0.6 ? 0.4 : 1;
      D.poly3(cam, [P3(z, x - 1.1, CEIL - 0.01), P3(z, x + 1.1, CEIL - 0.01), P3(z + 1.2, x + 1.1, CEIL - 0.01), P3(z + 1.2, x - 1.1, CEIL - 0.01)], C.lamp, fl, [0, -1, 0]);
    }
    if (za <= TOWER[1] && zb > TOWER[1] - 0.01) {                    // the far glass wall: the city through it, then smashed
      const z = TOWER[1], P = (x, y) => P3(z, x, y), n = [0, 0, -1], broken = R.sz > z - 0.4, hx = h1 + 0.6;
      D.poly3(cam, [P(-W1, 0), P(W1, 0), P(W1, CEIL), P(-W1, CEIL)], '#7fb0e0', broken ? 0 : 0.22, n);
      for (let x = -W1; x <= W1 + 0.01; x += 3) if (!broken || Math.abs(x) > hx) D.poly3(cam, [P(x - 0.08, 0), P(x + 0.08, 0), P(x + 0.08, CEIL), P(x - 0.08, CEIL)], '#3a4258', 1, n);
      if (!broken) D.poly3(cam, [P(-W1, CEIL * 0.5), P(-W1 + 3, CEIL * 0.5 + 2), P(-W1 + 3, CEIL * 0.5 + 2.3), P(-W1, CEIL * 0.5 + 0.3)], '#ffffff', 0.18, n);
      else for (let x = -hx, i = 0; x < hx; x += 0.9, i++) D.poly3(cam, [P(x, CEIL), P(x + 0.9, CEIL), P(x + 0.45, CEIL - 0.3 - (i % 3) * 0.2)], '#bfe6ff', 0.7, n);
    }
  }
  function desk(D, R, d) {                                        // a desk by the window, an animal working late behind it, who jumps when she shoots past
    const { cam, P3 } = R, z = d.z, X = d.sd * (HW(z) + 1.4), sd = d.sd, ids = animals();
    const u = seg(R.sz, z - 10, z - 4), jump = u > 0 && u < 1 ? Math.sin(u * Math.PI) * 1.2 : 0, up = u > 0 ? 0.6 : 0;
    let p = null, scl = 0;
    if (ids.length) {                                              // behind the desk: drawn first, so the desk hides its legs
      let id = ids[d.ch % ids.length]; if (id === R.char) id = ids[(d.ch + 1) % ids.length];
      p = D.toCam(cam, P3(z + 0.2, X + sd * 1.0, 0.15 + up + jump));
      if (p[2] > 1) { const [sx, sy] = D.scr(cam, p); scl = cam.F / p[2] * 1.5 / 48; D.spr(id + (u > 0 ? '_blink' : ''), sx + (u >= 1 ? Math.sin(R.t * 40 + z) * 2 * scl : 0), sy, scl); p = [sx, sy]; } else p = null;
    }
    boxA(D, R, z - 1.3, z + 1.3, X - 0.7, X + 0.7, gy(z), gy(z) + 0.95, { top: '#c9a878', side: '#9a7a52', front: '#a8885e' });
    boxA(D, R, z - 0.5, z + 0.3, X + sd * 0.25 - 0.45, X + sd * 0.25 + 0.45, gy(z) + 0.95, gy(z) + 1.6, { top: '#22252e', side: '#2a2d36', front: '#1a1d26' });
    glowDot(D, R, P3(z - 0.1, X + sd * 0.25, 1.3), 0.25, '#7fd8ff', 0.35);
    if (p && u > 0) {                                              // "!" over its head, papers flying off the desk
      const by = p[1] - 58 * scl - (u < 1 ? (1 - u) * 10 * scl : 0);
      D.txt('!', p[0], by, { size: Math.max(10, Math.round(30 * scl)), color: '#ffe14a', align: 'center', stroke: ['#1a1d26', Math.max(2, 5 * scl)] });
      if (u < 1) for (let k = 0; k < 3; k++) { const a = R.t * 6 + k * 2.1, pp = D.toCam(cam, P3(z - 0.3 + k * 0.4, X - sd * 0.3, 1.1 + u * 1.6 + k * 0.2)); if (pp[2] > 1) { const [px, py] = D.scr(cam, pp), s2 = cam.F / pp[2] * 0.22; D.ctx.save(); D.ctx.translate(px, py); D.ctx.rotate(a); D.rect(-s2, -s2 * 0.7, s2 * 2, s2 * 1.4, '#ffffff'); D.ctx.restore(); } }
    }
    if (d.ch % 3 === 1) R.billboard(PIX.plant, z + 3.6, sd * (HW(z) + 0.9), 0);   // a pot plant between the desks
  }

  // ---- the city far below (under the viaduct, the jet and the rooftops): blocks of light, streets of moving cars
  function below(D, R, za, zb, near) {
    const { cam, wx, t } = R, a = Math.max(za, DOWN[0]), b = Math.min(zb, STREET2 + 4);
    if (b <= a) return;
    const Y = z => floorY(z), G = (z, x, up = 0) => [wx(z, x), Y(z) + up, z], k = ((Math.floor(a / 8) % 2) + 2) % 2;
    D.poly3(cam, [G(a, -220), G(a, 220), G(b, 220), G(b, -220)], k ? '#121829' : '#131a2c');
    if (a < DOWN[1]) return;                                         // (the slope down to it: dark)
    const rush = cityRush(R.sz);                                     // (streaming past under the jet)
    for (const x of [-150, -102, -54, 22, 70, 118, 166]) {             // avenues: orange street lights, cars' lights streaming
      D.poly3(cam, [G(a, x - 2, 0.05), G(a, x + 2, 0.05), G(b, x + 2, 0.05), G(b, x - 2, 0.05)], '#2a2630');
      for (let z = Math.ceil((a + rush) / 6) * 6 - rush; z < b; z += 6) speck(D, R, G(z, x - 2.6, 0.3), 0.3, '#ffb04a');
      for (let j = 0; j < 2; j++) { const u = ((t * (0.05 + j * 0.03) + x * 0.013) % 1 + 1) % 1, z = DOWN[1] + u * (STREET2 - DOWN[1]); if (z >= a && z < b) speck(D, R, G(z, x + (j ? 0.8 : -0.8), 0.3), 0.4, j ? '#ff4040' : '#fff2c0'); }
    }
    for (let blk = Math.floor((a + rush) / 16); blk * 16 - rush < b; blk++) {          // rooftops of the blocks between, windows lit here and there
      const r = rng(blk * 31 + 5);
      for (let j = 0; j < 4; j++) {
        const z = blk * 16 + r() * 13 - rush, x = -200 + r() * 400, w = 4 + r() * 8, d = 4 + r() * 8, h = 3 + r() * 22;
        if (z < a || z + d > b + 8 || Math.abs(x) < 40 || [-150, -102, -54, 22, 70, 118, 166].some(ax => Math.abs(x - ax) < w + 3)) continue;
        const y0 = Y(z);
        D.poly3(cam, [[wx(z, x - w), y0, z], [wx(z, x + w), y0, z], [wx(z, x + w), y0 + h, z], [wx(z, x - w), y0 + h, z]], BCOL[j % BCOL.length], 1, [0, 0, -1]);
        D.poly3(cam, [[wx(z, x - w), y0 + h, z], [wx(z, x + w), y0 + h, z], [wx(z + d, x + w), y0 + h, z + d], [wx(z + d, x - w), y0 + h, z + d]], '#262b3e');
        if (Math.abs(z - R.zc) < 60 && h > 8) windows(D, R, (u, v) => [wx(z, lerp(x - w, x + w, u)), lerp(y0 + 1, y0 + h - 0.5, v), z - 0.02], Math.round(w / 1.5), Math.max(1, Math.round(h / 3)), blk * 7 + j, 0.35);
      }
    }
    for (const [up, al] of [[18, 0.08], [40, 0.08], [70, 0.08]]) D.poly3(cam, [G(a, -220, up), G(a, 220, up), G(b, 220, up), G(b, -220, up)], '#6a6aa8', al);   // haze: the deeper, the bluer
    for (let z = Math.ceil(a / 18) * 18; z < b; z += 18) if (z > DOWN[1] && z < LIP - 4 && Math.abs(z - R.zc) > 10) {   // the viaduct's piers
      const X = wx(z, 0), top = gy(z) - 1.4;
      D.box3(cam, X - 1.4, X + 1.4, Y(z), top, z - 1, z + 1, { side: '#5a5f6c', rear: '#6a6f7c', front: '#6a6f7c', top: '#6a6f7c' });
    }
  }

  // ---- roads
  function marks(D, R, za, zb, x, col, dash = true, w = 0.12) {   // a painted line along x (dashed: only near)
    if (!dash) { D.poly3(R.cam, [R.S3(za, x - w, 0.012), R.S3(za, x + w, 0.012), R.S3(zb, x + w, 0.012), R.S3(zb, x - w, 0.012)], col); return; }
    for (let z = Math.ceil(za / 6) * 6; z < zb; z += 6) { const b = Math.min(zb, z + 3); D.poly3(R.cam, [R.S3(z, x - w, 0.012), R.S3(z, x + w, 0.012), R.S3(b, x + w, 0.012), R.S3(b, x - w, 0.012)], col); }
  }
  const CROSS = [36, 142, 284, 1760, 1880];
  function streetSlice(D, R, za, zb, near) {
    const { cam, P3, S3 } = R, k = ((Math.floor(za / 8) % 2) + 2) % 2, h0 = HW(za), h1 = HW(zb), m0 = MED(za), m1 = MED(zb);
    D.poly3(cam, [P3(za, -SKW, -0.05), P3(za, SKW, -0.05), P3(zb, SKW, -0.05), P3(zb, -SKW, -0.05)], C.dirt);
    for (const sd of [-1, 1]) {                                     // pavements and kerbs
      D.poly3(cam, [P3(za, sd * h0, 0.18), P3(za, sd * (h0 + 2.7), 0.18), P3(zb, sd * (h1 + 2.7), 0.18), P3(zb, sd * h1, 0.18)], C.walk[k]);
      D.poly3(cam, [P3(za, sd * h0, 0), P3(zb, sd * h1, 0), P3(zb, sd * h1, 0.18), P3(za, sd * h0, 0.18)], C.curb, 1, [-sd, 0, 0]);
    }
    if (m0 > 0.02 || m1 > 0.02) {                                  // the night-market fork: an alley of tiles on the left, the road on the right
      D.poly3(cam, [S3(za, -h0, 0.005), S3(za, -m0, 0.005), S3(zb, -m1, 0.005), S3(zb, -h1, 0.005)], C.brick[k]);
      D.poly3(cam, [S3(za, m0, 0.005), S3(za, h0, 0.005), S3(zb, h1, 0.005), S3(zb, m1, 0.005)], C.road[k]);
      D.poly3(cam, [P3(za, -m0, 0.3), P3(za, m0, 0.3), P3(zb, m1, 0.3), P3(zb, -m1, 0.3)], '#3d4a3a');
      for (const sd of [-1, 1]) D.poly3(cam, [P3(za, sd * m0, 0), P3(zb, sd * m1, 0), P3(zb, sd * m1, 0.3), P3(za, sd * m0, 0.3)], C.curb, 1, [sd, 0, 0]);
      if (near) marks(D, R, za, zb, (m0 + h0) / 2, C.line);
    } else {
      D.poly3(cam, [S3(za, -h0, 0.005), S3(za, h0, 0.005), S3(zb, h1, 0.005), S3(zb, -h1, 0.005)], C.road[k]);
      marks(D, R, za, zb, -0.16, C.yellow, false, 0.07); marks(D, R, za, zb, 0.16, C.yellow, false, 0.07);
      if (near) { marks(D, R, za, zb, -h0 / 2, C.line); marks(D, R, za, zb, h0 / 2, C.line); }
    }
    for (const cz of CROSS) if (cz < zb && cz + 4 > za) for (let x = -h0 + 0.6; x < h0 - 0.5; x += 1.2) {   // zebra crossings
      if (Math.abs(x) < MED(cz) + 0.3) continue;
      D.poly3(cam, [S3(Math.max(za, cz), x, 0.014), S3(Math.max(za, cz), x + 0.6, 0.014), S3(Math.min(zb, cz + 4), x + 0.6, 0.014), S3(Math.min(zb, cz + 4), x, 0.014)], C.line, 0.9);
    }
  }
  function jersey(D, R, za, zb, x, sd, lift = 0) {               // a concrete barrier along x, its face towards -sd
    const { cam, S3 } = R, X = z => x(z);
    D.poly3(cam, [S3(za, X(za), 0), S3(zb, X(zb), 0), S3(zb, X(zb) + sd * 0.15, 0.9), S3(za, X(za) + sd * 0.15, 0.9)], C.conc, 1, [-sd, 0, 0]);
    D.poly3(cam, [S3(za, X(za) + sd * 0.15, 0.9), S3(zb, X(zb) + sd * 0.15, 0.9), S3(zb, X(zb) + sd * 0.45, 0.9), S3(za, X(za) + sd * 0.45, 0.9)], C.concL);
    D.poly3(cam, [S3(za, X(za) + sd * 0.02, 0.5), S3(zb, X(zb) + sd * 0.02, 0.5), S3(zb, X(zb) + sd * 0.04, 0.62), S3(za, X(za) + sd * 0.04, 0.62)], '#ffcf3a', 0.7, [-sd, 0, 0]);
  }
  function hwySlice(D, R, za, zb, near) {
    const { cam, P3, S3, t } = R, k = ((Math.floor(za / 8) % 2) + 2) % 2, h0 = HW(za), h1 = HW(zb), m0 = MED(za), m1 = MED(zb);
    const via = zone(za) === 'via', fork = m0 > 0.02 || m1 > 0.02;
    if (!via) for (const sd of [-1, 1]) D.poly3(cam, [P3(za, sd * (h0 + 0.4), -0.1), P3(za, sd * SKW, -0.1), P3(zb, sd * SKW, -0.1), P3(zb, sd * (h1 + 0.4), -0.1)], C.dirt);   // (not under the road: down one side of a fork it sinks below the ground)
    const side = (sd, xa0, xa1, xb0, xb1) => D.poly3(cam, [S3(za, sd * xa0, 0.005), S3(za, sd * xa1, 0.005), S3(zb, sd * xb1, 0.005), S3(zb, sd * xb0, 0.005)], via ? (k ? '#6a6f7c' : '#666b78') : C.road[k]);
    if (!fork) {
      side(1, -h0, h0, -h1, h1);
      if (near) for (const x of h0 > 7 ? [-4.3, 0, 4.3] : [0]) marks(D, R, za, zb, x, C.line);
      for (const sd of [-1, 1]) marks(D, R, za, zb, sd * (h0 - 0.5), via ? '#ff9a3a' : C.line, false, 0.1);
    } else for (const sd of [-1, 1]) {
      side(sd, m0, h0, m1, h1);
      for (const x of [(m0 + h0) / 2]) if (near) marks(D, R, za, zb, sd * x, C.line);
      marks(D, R, za, zb, sd * (h0 - 0.5), C.line, false, 0.1); marks(D, R, za, zb, sd * (m0 + 0.4), C.yellow, false, 0.08);
    }
    const lf = (z, sd) => course.liftAt(z, sd * 1);
    for (const sd of [-1, 1]) {                                       // barriers along the edges (none on the unfinished end of the viaduct)
      if (via && za >= 1160) {
        D.poly3(cam, [P3(za, sd * h0, 0), P3(zb, sd * h1, 0), P3(zb, sd * h1, -1.4), P3(za, sd * h0, -1.4)], C.concD, 1, [sd, 0, 0]);
        if (near && Math.floor(za / 4) % 2 === 0) D.poly3(cam, [P3(za, sd * (h0 - 0.05), 0.01), P3(zb, sd * (h1 - 0.05), 0.01), P3(zb, sd * (h1 - 0.35), 0.01), P3(za, sd * (h0 - 0.35), 0.01)], '#ffcf3a');
        continue;
      }
      const up0 = lf(za, sd), up1 = lf(zb, sd);
      if (up0 > 0.3 || up1 > 0.3) {                                   // the flyover: its sides drop to the ground
        for (const [x0, x1, n] of [[h0, h1, sd], [m0, m1, -sd]]) D.poly3(cam, [S3(za, sd * x0, 0), S3(zb, sd * x1, 0), P3(zb, sd * x1, -0.1), P3(za, sd * x0, -0.1)], C.concD, 1, [n, 0, 0]);
      }
      jersey(D, R, za, zb, z => sd * HW(z), sd);
      if (fork && (up0 > 0.3 || up1 > 0.3 || lf(za, -sd) > 0.3)) { if (!(inTunnel(za) && sd > 0)) jersey(D, R, za, zb, z => sd * MED(z), -sd); }
      else if (fork) D.poly3(cam, [P3(za, sd * m0, 0), P3(zb, sd * m1, 0), P3(zb, sd * m1, 0.9), P3(za, sd * m0, 0.9)], C.conc, 1, [sd, 0, 0]);   // a plain concrete median
    }
    if (fork && !(lf(za, -1) > 0.3 || lf(za, 1) < -0.3)) D.poly3(cam, [P3(za, -m0, 0.9), P3(za, m0, 0.9), P3(zb, m1, 0.9), P3(zb, -m1, 0.9)], C.concL);
    if (fork && lf(za, 1) > -0.05) D.poly3(cam, [P3(za, -m0, 0), P3(za, m0, 0), P3(zb, m1, 0), P3(zb, -m1, 0)], '#3a3f4c');   // the median
    if (inTunnel(za) || inTunnel(zb - 0.01)) tunnel(D, R, Math.max(za, TUNNEL[0]), Math.min(zb, TUNNEL[1]), near);
    if (za <= TUNNEL[0] && zb > TUNNEL[0]) portal(D, R);
  }
  function tunnel(D, R, za, zb, near) {                           // the neon tunnel down the right side of the big fork
    if (zb <= za) return;
    const { cam, S3, t } = R, m0 = MED(za), m1 = MED(zb), h0 = HW(za), h1 = HW(zb), k = ((Math.floor(za / 2) % 2) + 2) % 2;
    for (const [x0, x1, n, col] of [[m0, m1, 1, '#3a3550'], [h0, h1, -1, '#35304a']]) {
      D.poly3(cam, [S3(za, x0, 0), S3(zb, x1, 0), S3(zb, x1, TCEIL), S3(za, x0, TCEIL)], k ? col : mixDark(col), 1, [n, 0, 0]);
      const neon = n > 0 ? '#3ff2ff' : '#ff4fa8';
      for (const y of [1.2, 4.2]) D.poly3(cam, [S3(za, x0 + n * 0.02, y), S3(zb, x1 + n * 0.02, y), S3(zb, x1 + n * 0.02, y + 0.14), S3(za, x0 + n * 0.02, y + 0.14)], neon, 1, [n, 0, 0]);
      if (near) for (let z = Math.floor(za / 5) * 5 - ((t * 60) % 5); z < zb; z += 5) {   // streaks of light racing past
        const a = Math.max(za, z), b = Math.min(zb, z + 1.6);
        if (b > a) D.poly3(cam, [S3(a, x0 + n * 0.03, 2.6), S3(b, x0 + n * 0.03, 2.6), S3(b, x0 + n * 0.03, 2.9), S3(a, x0 + n * 0.03, 2.9)], '#ffffff', 0.9, [n, 0, 0]);
      }
    }
    D.poly3(cam, [S3(za, m0, TCEIL), S3(za, h0, TCEIL), S3(zb, h1, TCEIL), S3(zb, m1, TCEIL)], '#26233a', 1, [0, -1, 0]);
    D.poly3(cam, [S3(za, m0 - 0.4, TCEIL + 0.5), S3(za, h0 + 0.5, TCEIL + 0.5), S3(zb, h1 + 0.5, TCEIL + 0.5), S3(zb, m1 - 0.4, TCEIL + 0.5)], '#2c3346', 1, [0, 1, 0]);
    for (let z = Math.ceil(za / 6) * 6; z < zb; z += 6) { const x = ((m0 + h0) / 2); D.poly3(cam, [S3(z, x - 1.6, TCEIL - 0.02), S3(z, x + 1.6, TCEIL - 0.02), S3(z + 1, x + 1.6, TCEIL - 0.02), S3(z + 1, x - 1.6, TCEIL - 0.02)], '#e8f6ff', 1, [0, -1, 0]); }
  }
  function portal(D, R) {
    const { cam, S3 } = R, z = TUNNEL[0], m = MED(z), h = HW(z), n = [0, 0, -1];
    const q = (x0, x1, y0, y1, col) => D.poly3(cam, [S3(z, x0, y0), S3(z, x1, y0), S3(z, x1, y1), S3(z, x0, y1)], col, 1, n);
    q(m - 0.6, h + 0.8, TCEIL, TCEIL + 2.6, '#5a5f6c'); q(m - 0.6, m, 0, TCEIL, '#5a5f6c'); q(h, h + 0.8, 0, TCEIL, '#5a5f6c');
    q(m - 0.6, h + 0.8, TCEIL + 2.2, TCEIL + 2.6, '#ff4fa8');
    text3(R.D || root.SkiDraw, R, S3(z - 0.05, (m + h) / 2, TCEIL + 1.25), '霓虹隧道', 1.3, '#3ff2ff', { far: 110, stroke: '#1a1030' });
  }
  function roofSlice(D, R, za, zb, near) {
    const { cam, P3 } = R, k = ((Math.floor(za / 4) % 2) + 2) % 2;
    if (!onRoof((za + zb) / 2)) return;                               // (between two buildings: thin air, the alley far below)
    const h0 = HW(za) + 0.8, h1 = HW(zb) + 0.8;
    D.poly3(cam, [P3(za, -h0, 0), P3(za, h0, 0), P3(zb, h1, 0), P3(zb, -h1, 0)], C.roof[k]);
    if (near) for (let z = Math.ceil(za / 3) * 3; z < zb; z += 3) D.poly3(cam, [P3(z, -h0, 0.01), P3(z, h0, 0.01), P3(z + 0.08, h0, 0.01), P3(z + 0.08, -h0, 0.01)], '#4a4f5c');
    for (const sd of [-1, 1]) {
      D.poly3(cam, [P3(za, sd * h0, 0), P3(zb, sd * h1, 0), P3(zb, sd * h1, 0.8), P3(za, sd * h0, 0.8)], '#6c717e', 1, [-sd, 0, 0]);
      D.poly3(cam, [P3(za, sd * h0, 0.8), P3(zb, sd * h1, 0.8), P3(zb, sd * (h1 + 0.4), 0.8), P3(za, sd * (h0 + 0.4), 0.8)], '#8a8fa0');
    }
    for (const [a] of ROOF) if (za <= a && zb > a && a > ROOF[0][0]) {   // the front of the lower building, from the alley up to its roof
      const y = gy(a), n = [0, 0, -1];
      D.poly3(cam, [[R.wx(a, -h0 - 0.4), FLOOR, a], [R.wx(a, h0 + 0.4), FLOOR, a], [R.wx(a, h0 + 0.4), y + 0.8, a], [R.wx(a, -h0 - 0.4), y + 0.8, a]], '#3b4256', 1, n);
      windows(D, R, (u, v) => [R.wx(a, lerp(-h0, h0, u)), lerp(FLOOR + 2, y - 1, v), a - 0.02], 5, Math.max(1, Math.round((y - FLOOR) / 3.5)), Math.round(a), 0.5);
    }
  }
  function nbr(D, R, b) {                                         // the buildings round the rooftops
    const { cam, wx } = R, X = b.sd * b.off, P = (x, z, y) => [wx(z, X + x), y, z];
    D.poly3(cam, [P(-b.w, b.z, FLOOR), P(b.w, b.z, FLOOR), P(b.w, b.z, b.top), P(-b.w, b.z, b.top)], b.col, 1, [0, 0, -1]);
    D.poly3(cam, [P(-b.w, b.z, b.top), P(b.w, b.z, b.top), P(b.w, b.z + 9, b.top), P(-b.w, b.z + 9, b.top)], '#2a3044');
    windows(D, R, (u, v) => P(lerp(-b.w, b.w, u), b.z - 0.02, lerp(FLOOR + 2, b.top - 1, v)), Math.round(b.w / 1.5), Math.max(1, Math.round((b.top - FLOOR) / 3.2)), b.seed, 0.4);
    if (b.neon) { const c = NEON[b.seed % 6]; D.poly3(cam, [P(-b.w + 0.5, b.z + 2, b.top + 0.5), P(b.w - 0.5, b.z + 2, b.top + 0.5), P(b.w - 0.5, b.z + 2, b.top + 3.4), P(-b.w + 0.5, b.z + 2, b.top + 3.4)], '#141826', 1, [0, 0, -1]); text3(D, R, P(0, b.z + 1.95, b.top + 1.95), b.neon, 1.4, c, { far: 100, stroke: '#141826' }); }
  }
  function viaEnd(D, R) {                                          // the broken end of the viaduct: torn concrete, bent steel
    const { cam, P3 } = R, z = LIP, h = HW(z - 7);
    for (let x = -h, i = 0; x < h; x += 0.5, i++) D.poly3(cam, [P3(z, x, 0.02), P3(z, x + 0.5, 0.02), P3(z, x + 0.25, -0.5 - (i % 3) * 0.3)], C.concD);
    for (let i = 0; i < 9; i++) { const x = -h + 0.4 + i * (2 * h - 0.8) / 8, l = 0.8 + (i % 3) * 0.5; D.poly3(cam, [P3(z, x - 0.04, -0.3), P3(z, x + 0.04, -0.3), P3(z + l, x + 0.3 * ((i % 2) * 2 - 1) + 0.04, -0.3 - l * 0.4), P3(z + l, x + 0.3 * ((i % 2) * 2 - 1) - 0.04, -0.3 - l * 0.4)], '#8a5a3a'); }
  }

  // ---- obstacles
  function crouchMarks(D, R, o, cx) {                             // white down-chevrons: crouch here
    const a = o.y0 + 0.15, b = o.y1 - 0.25, base = (course.liftAt ? course.liftAt(o.z, cx) : 0);
    D.poly3(R.cam, [R.P3(o.z - 0.05, cx - 0.42, base + b), R.P3(o.z - 0.05, cx + 0.42, base + b), R.P3(o.z - 0.05, cx, base + a)], '#ffffff');
  }
  function carObs(D, R, o) {                                      // a car (or a truck) in its lane: headlights blazing if it is coming at her
    const z = obZ(o, R.sz), x = o.x, toward = o.drive.k > 0, { cam, S3 } = R, L = o.hd, W = o.hw;
    if (o.k === 'scooter') {                                        // a scooter going her way: the rider's back and a red tail light
      const p = R.billboard(PIX.rider, z, x, 0.15);
      if (p) glowDot(D, R, S3(z - 0.1, x, 0.95), 0.12, '#ff3030', 0.9);
      return;
    }
    const front = toward ? z - L : z + L, fz = toward ? -1 : 1;
    const wheels = (zs, r, w) => {                                  // tyres on the road: their sides, and their fronts under the bumper
      for (const wz of zs) for (const sd of [-1, 1]) {
        const xo = x + sd * (W + 0.02);
        D.poly3(cam, [S3(wz - r, xo, 0), S3(wz + r, xo, 0), S3(wz + r * 0.7, xo, r * 1.6), S3(wz - r * 0.7, xo, r * 1.6)], '#15171d', 1, [sd, 0, 0]);
        D.poly3(cam, [S3(wz - r * 0.4, xo + sd * 0.01, r * 0.5), S3(wz + r * 0.4, xo + sd * 0.01, r * 0.5), S3(wz + r * 0.4, xo + sd * 0.01, r * 1.1), S3(wz - r * 0.4, xo + sd * 0.01, r * 1.1)], '#8a8f9a', 1, [sd, 0, 0]);   // the hub
      }
      const fw = front - fz * 0.25;                                   // the front tyres seen head-on, just behind the bumper
      D.poly3(cam, [S3(fw - fz * 0.01, x - W + w, 0.15), S3(fw - fz * 0.01, x + W - w, 0.15), S3(fw - fz * 0.01, x + W - w, r * 1.6), S3(fw - fz * 0.01, x - W + w, r * 1.6)], '#1a1c22', 1, [0, 0, fz]);   // the underside between them
      for (const sd of [-1, 1]) {
        const xa = x + sd * (W - w), xb = x + sd * (W + 0.02);
        D.poly3(cam, [S3(fw, xa, 0), S3(fw, xb, 0), S3(fw, xb, r * 1.6), S3(fw, xa, r * 1.6)], '#0b0c10', 1, [0, 0, fz]);
        for (const u of [0.35, 0.75]) D.poly3(cam, [S3(fw + fz * 0.01, xa, r * 1.6 * u), S3(fw + fz * 0.01, xb, r * 1.6 * u), S3(fw + fz * 0.01, xb, r * 1.6 * u + 0.05), S3(fw + fz * 0.01, xa, r * 1.6 * u + 0.05)], '#4a4f5c', 1, [0, 0, fz]);   // tread
      }
    };
    if (toward) {                                                   // the beams on the road in front of it
      const b0 = front, b1 = front - 16;
      D.poly3(cam, [S3(b0, x - 0.9, 0.02), S3(b0, x + 0.9, 0.02), S3(b1, x + 3, 0.02), S3(b1, x - 3, 0.02)], '#fff2c0', 0.14);
      D.poly3(cam, [S3(b0, x - 0.7, 0.025), S3(b0, x + 0.7, 0.025), S3(front - 7, x + 1.6, 0.025), S3(front - 7, x - 1.6, 0.025)], '#fff2c0', 0.14);
    }
    const near = Math.abs(z - R.zc) < 90;
    if (o.k === 'truck') {
      const cab0 = toward ? z - L : z + L - 1.8, cab1 = cab0 + 1.8, c0 = toward ? cab1 + 0.2 : z - L, c1 = toward ? z + L : cab0 - 0.2;
      wheels(toward ? [cab0 + 0.8, c1 - 2.2, c1 - 0.9] : [cab1 - 0.8, c0 + 2.2, c0 + 0.9], 0.5, 0.42);
      boxS(D, R, c0, c1, x - W, x + W, 0.95, 3.2, { top: '#d9dde6', side: '#c9ced9', front: '#b9bfcc', back: '#b9bfcc' });
      D.poly3(cam, [S3(c0, x - W, 0.75), S3(c1, x - W, 0.75), S3(c1, x - W, 0.95), S3(c0, x - W, 0.95)], '#3a3f4c', 1, [-1, 0, 0]); D.poly3(cam, [S3(c0, x + W, 0.75), S3(c1, x + W, 0.75), S3(c1, x + W, 0.95), S3(c0, x + W, 0.95)], '#3a3f4c', 1, [1, 0, 0]);   // the chassis rail
      if (near) text3(D, R, S3(c0 - 0.02, x, 1.9), '夜貨', 0.9, '#2f5fbf', { far: 60 });
      boxS(D, R, cab0, cab1, x - W, x + W, 0.85, 2.4, { top: '#a8222a', side: '#c8303a', front: '#b8282f', back: '#b8282f' });
      const bz = toward ? cab0 - 0.05 : cab1 + 0.05;
      D.poly3(cam, [S3(bz, x - W - 0.05, 0.62), S3(bz, x + W + 0.05, 0.62), S3(bz, x + W + 0.05, 0.88), S3(bz, x - W - 0.05, 0.88)], '#c9ced9', 1, [0, 0, fz]);   // the bumper
      D.poly3(cam, [S3(toward ? cab0 - 0.01 : cab1 + 0.01, x - W + 0.2, 1.5), S3(toward ? cab0 - 0.01 : cab1 + 0.01, x + W - 0.2, 1.5), S3(toward ? cab0 - 0.01 : cab1 + 0.01, x + W - 0.2, 2.2), S3(toward ? cab0 - 0.01 : cab1 + 0.01, x - W + 0.2, 2.2)], '#1f3050', 1, [0, 0, fz]);
    } else {
      const col = o.k === 'taxi' ? ['#ffcc1a', '#e8b010', '#f2be14'] : [['#d8443a', '#b8342c', '#c83c33'], ['#3a7fd8', '#2a62b0', '#3270c4'], ['#e8e8ec', '#c8c8d0', '#d8d8de'], ['#2fae6a', '#228a52', '#28a060']][Math.round(o.z) % 4];
      wheels([z - L * 0.62, z + L * 0.62], 0.36, 0.35);
      boxS(D, R, z - L, z + L, x - W, x + W, 0.42, 1.12, { top: col[0], side: col[1], front: col[2], back: col[2] });
      const c0 = z - L * 0.45, c1 = z + L * 0.4;
      boxS(D, R, c0, c1, x - W * 0.82, x + W * 0.82, 1.12, 1.7, { top: col[0], side: '#1f3050', front: '#2a4268', back: '#2a4268' });
      if (o.k === 'taxi') { boxS(D, R, z - 0.25, z + 0.25, x - 0.35, x + 0.35, 1.65, 1.95, { top: '#ffffff', side: '#f2f2f2', front: '#ffffff' }); if (near) text3(D, R, S3(z - 0.27, x, 1.8), '計程', 0.22, '#c8102e', { far: 30 }); }
    }
    for (const sd of [-1, 1]) glowDot(D, R, S3(front + fz * 0.02, x + sd * (W - 0.3), o.k === 'truck' ? 1.1 : 0.8), toward ? 0.13 : 0.11, toward ? '#fff6d0' : '#ff3030', toward ? 1 : 0.85);
  }
  function stripes(D, R, z, x0, x1, y0, y1, a, b, n) {             // a striped board across [x0, x1] facing back up the course
    for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n; D.poly3(R.cam, [R.S3(z, lerp(x0, x1, u0), y0), R.S3(z, lerp(x0, x1, u1), y0), R.S3(z, lerp(x0, x1, u1), y1), R.S3(z, lerp(x0, x1, u0), y1)], i % 2 ? a : b, 1, [0, 0, -1]); }
  }
  function hangSign(D, R, o, text, col, bg) {                      // a board hanging across the course at crouch height, on two cables
    const { cam, S3 } = R, x0 = o.x - o.hw, x1 = o.x + o.hw, y0 = o.y0 + 0.1, y1 = o.y1 + 0.1, base = course.liftAt(o.z, o.x);
    const P = (x, y) => R.P3(o.z, x, base + y);
    for (const x of [x0 + 0.6, x1 - 0.6]) D.poly3(cam, [P(x - 0.03, y1), P(x + 0.03, y1), P(x + 0.03, y1 + 3), P(x - 0.03, y1 + 3)], '#2a2d36');
    D.poly3(cam, [P(x0 - 0.15, y0 - 0.15), P(x1 + 0.15, y0 - 0.15), P(x1 + 0.15, y1 + 0.15), P(x0 - 0.15, y1 + 0.15)], col, 0.35);
    D.poly3(cam, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], bg);
    D.poly3(cam, [P(x0, y0), P(x1, y0), P(x1, y0 + 0.08), P(x0, y0 + 0.08)], col); D.poly3(cam, [P(x0, y1 - 0.08), P(x1, y1 - 0.08), P(x1, y1), P(x0, y1)], col);
    text3(D, R, P(o.x, (y0 + y1) / 2 + 0.1), text, 0.62, col, { far: 70 });
    const m = Math.max(1, Math.floor(o.hw * 2 / 3)); for (let k = 0; k < m; k++) crouchMarks(D, R, o, lerp(x0, x1, (k + 0.5) / m));
  }
  let VIG = null;
  const BANNERS = ['歡迎光臨', '深夜食堂', '24小時營業', '前方夜市', '小心駕駛'];

  // the building site's trench, drawn on the road a slice at a time (only the part in this slice: the slices nearer are
  // drawn after, and would cover a hole drawn whole): black, yellow and black stripes before and after it
  const TRENCH = course.obstacles.filter(o => o.k === 'trench');
  function trenchTop(D, R, o, za, zb) {
    const { cam, S3 } = R, z0 = o.z - o.hd, z1 = o.z + o.hd, x0 = o.x - o.hw, x1 = o.x + o.hw, a = Math.max(za, z0), b = Math.min(zb, z1);
    if (b > a) D.poly3(cam, [S3(a, x0, 0.006), S3(a, x1, 0.006), S3(b, x1, 0.006), S3(b, x0, 0.006)], '#07080c');
    if (b > a) for (const [u0, u1] of [[x0 - 0.2, x0], [x1, x1 + 0.2]]) D.poly3(cam, [S3(a, u0, 0.008), S3(a, u1, 0.008), S3(b, u1, 0.008), S3(b, u0, 0.008)], '#ffcf3a');   // (lit edges: black on the night road is hard to see)
    for (const zz of [z0, z1]) if (zz >= za && zz < zb) D.poly3(cam, [S3(zz - 0.2, x0 - 0.2, 0.008), S3(zz - 0.2, x1 + 0.2, 0.008), S3(zz, x1 + 0.2, 0.008), S3(zz, x0 - 0.2, 0.008)], '#ffcf3a');
    for (const zz of [z0 - 0.3, z1 + 0.3]) if (zz >= za && zz < zb) stripes(D, R, zz, x0, x1, 0.02, 0.06, '#ffcf3a', '#1a1d26', 8);
  }
  const theme = {
    spray: ['#ffd27a', '#ff9a3a', '#ffffff'], trail: '#9aa0ad', ski: ['#ff4fa8', '#ff9ad0', '#c8207a'],
    boost: { pad: '#3ff2ff', glow: '#b46cff', arrow: '#ffffff' },
    shift: (z, sz) => (z >= PLANE[0] - 1 && z <= PLANE[1] + 1 ? jetShift(sz) : null),   // coins on the jet go where it has flown to
    // the night sky: stars, a big moon, the far skyline lit up; fireworks over the finish
    sky(R) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R;
      theme.camZ = zc; theme.camY = R.cam.C[1];
      const bands = ['#070b22', '#0a0f2a', '#0e1433', '#141a3e', '#1c1f48', '#272453', '#35295c', '#472f63'];
      const bh = Math.max(40, hz + 10) / bands.length;
      bands.forEach((col, k) => D.rect(0, k * bh, W, bh + 1, col));
      const r = rng(31);
      for (let k = 0; k < 90; k++) { const x = ((r() * W * 1.4 + pan * 0.05) % W + W) % W, y = r() * Math.max(40, hz - 60), tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 3) + k); g.fillStyle = '#ffffff'; g.globalAlpha = 0.35 + 0.5 * tw * r(); g.fillRect(x, y, r() < 0.15 ? 4 : 2, r() < 0.15 ? 4 : 2); }
      g.globalAlpha = 1;
      const mx = W * 0.74 + pan * 0.04, my = hz - Math.min(420, hz * 0.7);
      g.fillStyle = 'rgba(255,240,200,0.12)'; g.beginPath(); g.arc(mx, my, 190, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,240,200,0.2)'; g.beginPath(); g.arc(mx, my, 125, 0, 7); g.fill();
      g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, 88, 0, 7); g.fill();
      g.fillStyle = '#e8dcb8'; for (const [dx, dy, rr] of [[-28, -18, 16], [22, 10, 22], [-6, 34, 10], [34, -30, 9]]) { g.beginPath(); g.arc(mx + dx, my + dy, rr, 0, 7); g.fill(); }
      if (Math.floor(t / 7) % 2 === 0) { const u = (t % 7) / 7, px = -100 + u * (W + 200) + pan * 0.1, py = hz - 300 - u * 80; g.fillStyle = Math.floor(t * 2) % 2 ? '#ff4040' : '#ffffff'; g.fillRect(px, py, 6, 6); g.fillStyle = '#ffffff'; g.fillRect(px + 14, py + 2, 3, 3); }   // a plane crossing far off
      const top = Math.max(0, hz + 4);
      D.rect(0, top, W, H - top + 1, '#10162a');
      skyline(D, g, hz, pan, zc, W, t);
      if (zc > FINISH - 260) fireworks(D, g, hz, W, t, seg(zc, FINISH - 260, FINISH - 160));
    },
    ground(R, za, zb, near) { below(root.SkiDraw, R, za, zb, near); },
    slice(R, za, zb, near) {
      const D = root.SkiDraw, cuts = [za, zb];
      for (const z of CUTS) if (z > za && z < zb) cuts.splice(cuts.length - 1, 0, z);
      cuts.sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1], zn = zone((a + b) / 2);
        if (zn === 'street') streetSlice(D, R, a, b, near);
        else if (zn === 'hwy' || zn === 'via') hwySlice(D, R, a, b, near);
        else if (zn === 'office') officeSlice(D, R, a, b, near);
        else if (zn === 'roof') roofSlice(D, R, a, b, near);
      }
      if (za <= LIP && zb > LIP) viaEnd(D, R);
      for (const o of TRENCH) trenchTop(D, R, o, za, zb);
    },
    // the launch ramp at the end of the viaduct: a steel ski jump striped yellow and black (the jet's nose draws itself)
    ramp(R, r) {
      if (!r.launch) return false;
      if (r.z > PLANE[0]) return true;
      const D = root.SkiDraw, { cam, P3 } = R, n = 6;
      for (let k = 0; k < n; k++) {
        const za = r.z + r.len * k / n, zb = r.z + r.len * (k + 1) / n, ya = r.rise * Math.pow(k / n, 1.6), yb = r.rise * Math.pow((k + 1) / n, 1.6);
        for (const sd of [-1, 1]) D.poly3(cam, [P3(za, sd * r.hw, 0), P3(zb, sd * r.hw, 0), P3(zb, sd * r.hw, yb), P3(za, sd * r.hw, ya)], '#3a3f4c');
        D.poly3(cam, [P3(za, -r.hw, ya), P3(za, r.hw, ya), P3(zb, r.hw, yb), P3(zb, -r.hw, yb)], k % 2 ? '#ffcf3a' : '#2a2d36');
        D.poly3(cam, [P3((za + zb) / 2 - 0.4, -1.2, (ya + yb) / 2 + 0.02), P3((za + zb) / 2 + 0.3, 0, (ya + yb) / 2 + 0.03), P3((za + zb) / 2 - 0.4, 1.2, (ya + yb) / 2 + 0.02), P3((za + zb) / 2 - 0.1, 0, (ya + yb) / 2 + 0.02)], '#ff4fa8');
      }
      return true;
    },
    scenery(R) {
      const D = root.SkiDraw, { add, lo, hi, zc, t } = R, zn = zone(zc);
      // the other mascots cheering on stands along the pavements before the finish
      if (R.zc > FINISH - 160) root.SkiWorld.crowd(R, { z0: FINISH - 50, z1: FINISH + 25, stand: { top: '#4a4e62', top2: '#3e4256', face: '#ffd27a' } });
      const ok = (z, d = 110) => z > lo && z < hi && Math.abs(z - zc) < d;
      const inside = zn === 'office';
      if (!inside) {
        for (const b of SCENE.bld) if (ok(b.z0, 115) || ok(b.z1, 115)) {   // (looking ahead, sorted by its far end, so whatever stands in the street is drawn over it; from the side by where it really stands)
          if (R.cam.f[2] > 0.6) add(Math.min(b.z1, hi - 1), () => building(D, R, b));
          else add((b.z0 + b.z1) / 2, () => building(D, R, b), false, b.sd * (b.off + b.d / 2));
        }
        for (const s of SCENE.stalls) if (ok(s.z, 80)) add(s.z, () => stall(D, R, s));
        for (const s of SCENE.scoots) if (ok(s.z, 40)) add(s.z, () => scooterPark(D, R, s));
        for (const l of SCENE.lamps) if (ok(l.z, 115)) add(l.z, () => lamp(D, R, l));
        for (const a of SCENE.ads) if (ok(a.z, 125)) add(a.z, () => ad(D, R, a));
        for (const b of SCENE.far) if (ok(b.z, 125)) add(b.z, () => farBuilding(D, R, b));
        for (const c of SCENE.cranes) if (ok(c.z, 125)) add(c.z, () => crane(D, R, c));
        for (const b of SCENE.nbrs) if (ok(b.z, 110)) add(b.z, () => nbr(D, R, b));
        if (zc < TOWER[0] && ok(TOWER[0], 125)) add(TOWER[0] - 0.3, () => towerFace(D, R));
        if (zc > 900 && zc < TOWER[0] + 20) {                        // the jet, wherever it has flown to
          const sh = jetShift(R.sz), [dx, dy, dz] = sh || [0, 0, 0], RJ = shifted(R, sh);
          for (let z = PLANE[0]; z < PLANE[1] - 1e-6;) {
            const far = Math.abs(z + dz - zc) > 40, st = Math.min(PLANE[1] - z, far ? 6 : 2), za = z;
            if (za + dz > zc - 12 && za + dz < zc + 320) add(za + dz + st / 2, () => jetSlice(D, RJ, za, za + st, !far));
            z += st;
          }
          if (WING[0] + dz < zc + 320) add(leadZ(9) + 1.6 + dz, () => engines(D, RJ));
          if (sh && PLANE[0] + 8 < lo && PLANE[0] + 8 + dz > zc - 12) add(PLANE[0] + 8 + dz, () => fin(D, RJ));   // (flown on past where the course keeps it)
        }
        if (zc > LIP - 4 && zc < TOWER[0] + 10) for (const c of SCENE.clouds) {   // clouds rushing past (the jet is flying)
          const span = TOWER[0] - LIP + 80, zz = LIP - 40 + ((c.z - LIP + 40 - t * c.sp) % span + span) % span;
          if (ok(zz, 125)) { c.zz = zz; add(zz, () => cloud(D, R, { ...c, zz })); }
        }
      } else for (const d of SCENE.desks) if (ok(d.z, 70)) add(d.z, () => desk(D, R, d));
      if (zc > TOWER[0] - 10 && zc < TOWER[1]) for (const d of SCENE.desks) if (!inside && ok(d.z, 60)) add(d.z, () => desk(D, R, d));
    },
    // street: a neon arch; highway: a green sign gantry; none in the air, in the office or on the roofs. START and GOAL in orange
    gate(R, z, i, label) {
      const zn = zone(z), D = root.SkiDraw, { cam, P3, wx } = R;
      if (!label && zn !== 'street' && zn !== 'hwy') return;
      if (!label && (MED(z) > 0 || Math.abs(z - LIP) < 140)) return;
      const h = HW(z) + (zn === 'hwy' ? 0.6 : 1.0), y = gy(z);
      if (zn === 'hwy' && !label) {
        for (const sd of [-1, 1]) { const X = wx(z, sd * h); D.box3(cam, X - 0.18, X + 0.18, y, y + 8, z - 0.18, z + 0.18, { side: '#6a6f7c', rear: '#7a7f8c', top: '#7a7f8c' }); }
        D.poly3(cam, [P3(z, -h, 7.6), P3(z, h, 7.6), P3(z, h, 8), P3(z, -h, 8)], '#6a6f7c');
        const SG = [['機場', '市中心'], ['夜市', '港口'], ['機場', '高架橋'], ['北', '南']][i % 4];
        SG.forEach((s, k) => { const x0 = k ? 0.6 : -h + 0.8, x1 = k ? h - 0.8 : -0.6; D.poly3(cam, [P3(z - 0.02, x0, 5.2), P3(z - 0.02, x1, 5.2), P3(z - 0.02, x1, 7.5), P3(z - 0.02, x0, 7.5)], '#1f7a4a'); D.poly3(cam, [P3(z - 0.03, x0 + 0.1, 5.3), P3(z - 0.03, x1 - 0.1, 5.3), P3(z - 0.03, x1 - 0.1, 5.38), P3(z - 0.03, x0 + 0.1, 5.38)], '#ffffff'); text3(D, R, P3(z - 0.04, (x0 + x1) / 2, 6.35), s, 1.1, '#ffffff', { far: 110 }); });
        return;
      }
      const col = label ? D.C.orange : NEON[i % NEON.length], y0 = label ? 5.8 : 6.0, y1 = label ? 7.3 : 7.0;
      for (const sd of [-1, 1]) { const X = wx(z, sd * h); D.box3(cam, X - 0.2, X + 0.2, y, y + y1 + 0.4, z - 0.2, z + 0.2, { side: '#2a2d36', rear: '#3a3f4c', top: '#3a3f4c' }); D.poly3(cam, [[X - 0.22, y + 0.4, z - 0.22], [X + 0.22, y + 0.4, z - 0.22], [X + 0.22, y + y1, z - 0.22], [X - 0.22, y + y1, z - 0.22]], col, 0.8); }
      D.poly3(cam, [P3(z, -h - 0.3, y0 - 0.25), P3(z, h + 0.3, y0 - 0.25), P3(z, h + 0.3, y1 + 0.25), P3(z, -h - 0.3, y1 + 0.25)], col, 0.3);
      const f = D.poly3(cam, [P3(z, -h + 0.4, y0), P3(z, h - 0.4, y0), P3(z, h - 0.4, y1), P3(z, -h + 0.4, y1)], label ? col : '#141826');
      if (!label) for (const yy of [y0, y1 - 0.1]) D.poly3(cam, [P3(z - 0.01, -h + 0.4, yy), P3(z - 0.01, h - 0.4, yy), P3(z - 0.01, h - 0.4, yy + 0.1), P3(z - 0.01, -h + 0.4, yy + 0.1)], col);
      if (f) {
        const q = D.toCam(cam, P3(z, 0, (y0 + y1) / 2));
        if (q[2] > 1) { const [sx, sy] = D.scr(cam, q), s2 = cam.F / q[2]; D.txt(label || ['夜市', '霓虹街', '宵夜', '晚安'][i % 4], sx, sy + s2 * 0.42, { size: Math.round(s2 * 1.1), color: label ? '#ffffff' : col, align: 'center', ls: Math.round(s2 * 0.1) }); }
      }
    },
    obstacle(R, o, i) {
      const D = root.SkiDraw, { cam, S3, P3 } = R;
      switch (o.k) {
        case 'car': case 'taxi': case 'truck': case 'scooter': carObs(D, R, o); break;
        case 'cart': {                                                 // a night-market food cart: lit glass case, striped canopy, its sign
          const z0 = o.z - o.hd, z1 = o.z + o.hd, x0 = o.x - o.hw, x1 = o.x + o.hw, c = NEON[Math.round(o.z) % NEON.length];
          for (const sd of [-1, 1]) for (const wz of [z0 + 0.3, z1 - 0.3]) D.poly3(cam, [S3(wz - 0.25, o.x + sd * (o.hw + 0.01), 0), S3(wz + 0.25, o.x + sd * (o.hw + 0.01), 0), S3(wz + 0.25, o.x + sd * (o.hw + 0.01), 0.45), S3(wz - 0.25, o.x + sd * (o.hw + 0.01), 0.45)], '#1a1d26', 1, [sd, 0, 0]);
          boxS(D, R, z0, z1, x0, x1, 0.2, 1.0, { top: '#d0d6e0', side: '#c8303a', front: '#d8404a', back: '#d8404a' });
          boxS(D, R, z0 + 0.1, z1 - 0.1, x0 + 0.1, x1 - 0.1, 1.0, 1.6, { top: '#fff1c8', side: '#ffe2a0', front: '#fff1c8' });
          for (const [xx, zz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) D.poly3(cam, [S3(zz, xx - 0.04, 1.6), S3(zz, xx + 0.04, 1.6), S3(zz, xx + 0.04, 2.4), S3(zz, xx - 0.04, 2.4)], '#8a8f9a');
          for (let k = 0; k < 4; k++) { const xa = lerp(x0 - 0.2, x1 + 0.2, k / 4), xb = lerp(x0 - 0.2, x1 + 0.2, (k + 1) / 4); D.poly3(cam, [S3(z0 - 0.2, xa, 2.4), S3(z0 - 0.2, xb, 2.4), S3(z1 + 0.2, xb, 2.6), S3(z1 + 0.2, xa, 2.6)], k % 2 ? '#ffffff' : c); }
          D.poly3(cam, [S3(z0 - 0.21, x0, 2.0), S3(z0 - 0.21, x1, 2.0), S3(z0 - 0.21, x1, 2.4), S3(z0 - 0.21, x0, 2.4)], '#1a1d26', 1, [0, 0, -1]);
          text3(D, R, S3(z0 - 0.23, o.x, 2.2), ['雞蛋糕', '烤魷魚', '車輪餅'][Math.round(o.z) % 3], 0.32, c, { far: 50 });
          glowDot(D, R, S3(z0 - 0.1, o.x, 1.3), 0.3, '#ffe2a0', 0.6);
          break;
        }
        case 'cone': R.billboard(PIX.cone, o.z, o.x, 0); break;
        case 'bags': R.billboard(PIX.bags, o.z, o.x, 0); break;
        case 'stool': R.billboard(PIX.stool, o.z, o.x, 0); break;
        case 'barrel': R.billboard(PIX.barrel, o.z, o.x, 0); glowDot(D, R, S3(o.z - 0.1, o.x, 1.35), 0.12, '#ffb020', Math.floor(R.t * 2 + o.z) % 2 ? 0.9 : 0.2); break;
        case 'cat': R.billboard({ cs: 0.1, cols: { K: '#2a2a33', Y: '#ffe14a' }, rows: PIX.cat[Math.floor(R.t * 6) % 2] }, o.z, obX(o, R.rt), 0); break;
        case 'chair': R.billboard(PIX.chair, o.z, obX(o, R.rt), 0); break;
        case 'cushion': boxS(D, R, o.z - o.hd, o.z + o.hd + 2, o.x - o.hw, o.x + o.hw, 0, 1.1, { top: '#3a3f4c', side: '#ffcf3a', front: '#ffcf3a' }); for (let k = 0; k < 3; k++) D.poly3(cam, [S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6, 0.1), S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6 + 0.3, 0.1), S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6 + 0.6, 1.0), S3(o.z - o.hd - 0.01, o.x - o.hw + k * 0.6 + 0.3, 1.0)], '#1a1d26', 1, [0, 0, -1]); glowDot(D, R, S3(o.z - o.hd, o.x, 1.3), 0.15, '#ffb020', Math.floor(R.t * 3) % 2 ? 1 : 0.2); break;
        case 'jersey': boxS(D, R, o.z - o.hd, o.z + o.hd, o.x - o.hw, o.x + o.hw, 0, 1.0, { top: C.concL, side: C.concD, front: C.conc }); stripes(D, R, o.z - o.hd - 0.01, o.x - o.hw, o.x + o.hw, 0.5, 0.8, '#ff6a1a', '#ffffff', 6); break;
        case 'barrier': for (const sd of [-1, 1]) D.poly3(cam, [S3(o.z, o.x + sd * (o.hw - 0.15) - 0.05, 0), S3(o.z, o.x + sd * (o.hw - 0.15) + 0.05, 0), S3(o.z, o.x + sd * (o.hw - 0.15) + 0.05, 0.85), S3(o.z, o.x + sd * (o.hw - 0.15) - 0.05, 0.85)], '#3a3f4c'); stripes(D, R, o.z - 0.02, o.x - o.hw, o.x + o.hw, 0.45, 0.8, '#e8343a', '#ffffff', Math.round(o.hw * 3)); glowDot(D, R, S3(o.z - 0.05, o.x - o.hw + 0.2, 0.95), 0.1, '#ffb020', Math.floor(R.t * 2) % 2 ? 0.9 : 0.2); break;
        case 'banner': hangSign(D, R, o, BANNERS[i % BANNERS.length], NEON[i % NEON.length], '#141826'); break;
        case 'bar': hangSign(D, R, o, '限高', '#ffcf3a', '#2a2d36'); break;
        case 'sign': hangSign(D, R, o, ['業務部', '加班中', '會議室', '請保持安靜'][i % 4], '#3ff2ff', '#1a2440'); break;
        case 'lanterns': {                                             // a string of red lanterns across the market alley
          const x0 = o.x - o.hw, x1 = o.x + o.hw, P = (x, y) => P3(o.z, x, y);
          D.poly3(cam, [P(x0, o.y1 + 0.45), P(x1, o.y1 + 0.45), P(x1, o.y1 + 0.5), P(x0, o.y1 + 0.5)], '#2a2d36');
          for (let x = x0 + 0.5, k = 0; x < x1 - 0.2; x += 1.1, k++) {
            D.poly3(cam, [P(x - 0.02, o.y1 + 0.45), P(x + 0.02, o.y1 + 0.45), P(x + 0.02, o.y1), P(x - 0.02, o.y1)], '#2a2d36');
            const p = []; for (let m = 0; m < 8; m++) { const a = m / 8 * Math.PI * 2; p.push(P(x + Math.cos(a) * 0.38, (o.y0 + o.y1) / 2 + 0.15 + Math.sin(a) * 0.48)); }
            D.poly3(cam, p, k % 3 === 2 ? '#ffb020' : '#e8343a'); glowDot(D, R, P(x, (o.y0 + o.y1) / 2 + 0.15), 0.18, '#ffb04a', 0.35);
          }
          for (const x of [x0 + 1.5, x1 - 1.5]) crouchMarks(D, R, o, x);
          break;
        }
        case 'trench': {                                                // a hole dug across the building-site lane: its far side (the hole itself and its
          const z1 = o.z + o.hd, x0 = o.x - o.hw, x1 = o.x + o.hw;      // stripes are drawn with the road, trenchTop: as one item here the road covered most of it)
          D.poly3(cam, [S3(z1, x0, 0.006), S3(z1, x1, 0.006), S3(z1, x1, -1.6), S3(z1, x0, -1.6)], '#4a3a2a', 1, [0, 0, -1]);
          break;
        }
        case 'fin': fin(D, shifted(R, jetShift(R.sz))); break;
        case 'mast': { const RJ = shifted(R, jetShift(R.sz)), S3 = RJ.S3; D.poly3(cam, [S3(o.z, o.x - 0.07, 0), S3(o.z, o.x + 0.07, 0), S3(o.z, o.x + 0.03, 1.5), S3(o.z, o.x - 0.03, 1.5)], '#3a3f4c'); glowDot(D, RJ, S3(o.z, o.x, 1.55), 0.13, '#ff3030', Math.floor(R.t * 2.4 + o.z) % 2 ? 1 : 0.2); break; }
        case 'box': boxS(D, R, o.z - 0.5, o.z + 0.5, o.x - o.hw, o.x + o.hw, 0, 0.7, { top: '#d8a868', side: '#a87840', front: '#c08a50' }); D.poly3(cam, [S3(o.z - 0.51, o.x - 0.1, 0), S3(o.z - 0.51, o.x + 0.1, 0), S3(o.z - 0.51, o.x + 0.1, 0.7), S3(o.z - 0.51, o.x - 0.1, 0.7)], '#e8d8a0', 1, [0, 0, -1]); break;
        case 'partition': boxS(D, R, o.z - 0.12, o.z + 0.12, o.x - o.hw, o.x + o.hw, 0, 1.8, { top: '#c9ced9', side: '#8a93a6', front: '#5a6a8a' }); D.poly3(cam, [S3(o.z - 0.13, o.x - o.hw, 1.7), S3(o.z - 0.13, o.x + o.hw, 1.7), S3(o.z - 0.13, o.x + o.hw, 1.8), S3(o.z - 0.13, o.x - o.hw, 1.8)], '#c9ced9', 1, [0, 0, -1]); break;
        case 'worker': {                                                // an animal standing in the aisle with a coffee: jumps, stays put
          const ids = animals(); if (!ids.length) break;
          let id = ids[(Math.round(o.z) + 3) % ids.length]; if (id === R.char) id = ids[(Math.round(o.z) + 4) % ids.length];
          const u = seg(R.sz, o.z - 12, o.z - 4), jump = u > 0 && u < 1 ? Math.sin(u * Math.PI) * 0.9 : 0, q = D.toCam(cam, S3(o.z, o.x, jump));
          if (q[2] < 0.8) break;
          const [sx, sy] = D.scr(cam, q), scl = cam.F / q[2] * 1.9 / 48;
          D.spr(id + (u > 0 ? '_blink' : ''), sx + (u >= 1 ? Math.sin(R.t * 40) * 2 * scl : 0), sy, scl);
          if (u > 0) D.txt('!', sx, sy - 56 * scl, { size: Math.max(10, Math.round(32 * scl)), color: '#ffe14a', align: 'center', stroke: ['#1a1d26', Math.max(2, 5 * scl)] });
          break;
        }
        case 'ac': boxS(D, R, o.z - 0.5, o.z + 0.5, o.x - o.hw, o.x + o.hw, 0, 0.8, { top: '#c9ced9', side: '#9aa0ad', front: '#b0b6c2' }); { const q = D.toCam(cam, S3(o.z - 0.52, o.x, 0.4)); if (q[2] > 1) { const [sx, sy] = D.scr(cam, q), rr = cam.F / q[2] * 0.3, g = D.ctx; g.fillStyle = '#3a3f4c'; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill(); g.save(); g.translate(sx, sy); g.rotate(R.t * 12); g.fillStyle = '#8a8fa0'; g.fillRect(-rr * 0.9, -rr * 0.15, rr * 1.8, rr * 0.3); g.restore(); } } break;
        case 'tank': boxS(D, R, o.z - o.hd, o.z + o.hd, o.x - o.hw, o.x + o.hw, 0, 0.5, { top: '#5a5f6c', side: '#4a4f5c', front: '#4a4f5c' }); boxS(D, R, o.z - o.hd * 0.85, o.z + o.hd * 0.85, o.x - o.hw * 0.85, o.x + o.hw * 0.85, 0.5, 2.6, { top: '#e8ecf2', side: '#aab2c0', front: '#d0d6e0' }); D.poly3(cam, [S3(o.z - o.hd * 0.86, o.x - o.hw * 0.3, 0.6), S3(o.z - o.hd * 0.86, o.x - o.hw * 0.1, 0.6), S3(o.z - o.hd * 0.86, o.x - o.hw * 0.1, 2.5), S3(o.z - o.hd * 0.86, o.x - o.hw * 0.3, 2.5)], '#ffffff', 0.6, [0, 0, -1]); break;
        case 'wash': {                                                  // a washing line across the roof, shirts and towels hanging from it
          const x0 = o.x - o.hw, x1 = o.x + o.hw, P = (x, y) => P3(o.z, x, y);
          for (const x of [x0, x1]) D.poly3(cam, [P(x - 0.05, 0), P(x + 0.05, 0), P(x + 0.05, o.y1 + 0.6), P(x - 0.05, o.y1 + 0.6)], '#6c717e');
          D.poly3(cam, [P(x0, o.y1 + 0.5), P(x1, o.y1 + 0.5), P(x1, o.y1 + 0.54), P(x0, o.y1 + 0.54)], '#d0d4dc');
          const cols = ['#ff7a9a', '#5a9aff', '#ffffff', '#ffd23f', '#6ad88a'];
          for (let x = x0 + 0.6, k = 0; x < x1 - 0.6; x += 1.2, k++) { const sw = Math.sin(R.t * 3 + k) * 0.06; D.poly3(cam, [P(x - 0.45, o.y1 + 0.5), P(x + 0.45, o.y1 + 0.5), P(x + 0.4 + sw, o.y0 + 0.15 + (k % 2) * 0.3), P(x - 0.4 + sw, o.y0 + 0.15 + (k % 2) * 0.3)], cols[k % cols.length]); }
          for (const x of [x0 + 2, x1 - 2]) crouchMarks(D, R, o, x);
          break;
        }
      }
    },
    // the night: darker round the edges; light streaks in the tunnel; wind and cold blue up in the sky; fluorescent white in the office
    weather({ t }) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, z = theme.camZ, zn = zone(z);
      if (!VIG || VIG.width !== Math.round(W / 4) || VIG.height !== Math.round(H / 4)) {   // the dark edges, made once (a quarter size, scaled up)
        VIG = document.createElement('canvas'); VIG.width = Math.round(W / 4); VIG.height = Math.round(H / 4);
        const v = VIG.getContext('2d'), w = VIG.width, h = VIG.height, gr = v.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.8);
        gr.addColorStop(0, 'rgba(5,6,20,0)'); gr.addColorStop(1, 'rgba(5,6,20,0.45)'); v.fillStyle = gr; v.fillRect(0, 0, w, h);
      }
      const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.drawImage(VIG, 0, 0, W, H); g.imageSmoothingEnabled = sm;
      if (zn === 'sky' || zn === 'jet') {
        D.rect(0, 0, W, H, '#5a6ab8', 0.08);
        const r = rng(Math.floor(t * 20));
        g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        for (let k = 0; k < 12; k++) { const y = r() * H, x = r() * W, l = 120 + r() * 220; g.globalAlpha = 0.18 + r() * 0.15; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l, y + l * 0.05); g.stroke(); }
        g.globalAlpha = 1;
      }
      if (zn === 'office') D.rect(0, 0, W, H, '#dff2ff', 0.06);
      if (inTunnel(z)) D.rect(0, 0, W, H, '#ff4fa8', 0.05);
    },
    // map-screen thumbnail: the night sky, a moon, a jet, the lit skyline, a neon sign
    badge(g, x, y, w, h, t = 0) {
      const Rr = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      Rr(0, 0, 1, 0.4, '#0e1433'); Rr(0, 0.4, 1, 0.3, '#272453'); Rr(0, 0.6, 1, 0.1, '#472f63');
      g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(x + 0.8 * w, y + 0.2 * h, 0.1 * h, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; for (const [a, b] of [[0.1, 0.1], [0.3, 0.06], [0.5, 0.15], [0.62, 0.05], [0.2, 0.25], [0.92, 0.38]]) g.fillRect(x + a * w, y + b * h, 3, 3);
      g.fillStyle = '#eef2f8'; g.fillRect(x + 0.32 * w, y + 0.28 * h, 0.3 * w, 0.05 * h); g.fillRect(x + 0.42 * w, y + 0.24 * h, 0.07 * w, 0.14 * h); g.fillRect(x + 0.33 * w, y + 0.22 * h, 0.03 * w, 0.07 * h);
      g.fillStyle = '#2f5fbf'; g.fillRect(x + 0.32 * w, y + 0.31 * h, 0.3 * w, 0.012 * h);
      [[0, 0.5, 0.12, '#2f3a52'], [0.1, 0.42, 0.1, '#3a3550'], [0.2, 0.55, 0.12, '#45405c'], [0.6, 0.38, 0.14, '#2f3a52'], [0.74, 0.5, 0.12, '#3a3550'], [0.86, 0.45, 0.14, '#4a3c46']].forEach(([a, b, c, col]) => {
        Rr(a, b, c, 1 - b, col);
        g.fillStyle = '#ffe2a0'; for (let yy = b + 0.05; yy < 0.95; yy += 0.07) for (let xx = a + 0.02; xx < a + c - 0.02; xx += 0.035) if (lit(Math.round(a * 100), Math.round(yy * 100 + xx * 1000)) < 0.45) g.fillRect(x + xx * w, y + yy * h, 0.015 * w, 0.025 * h);
      });
      Rr(0, 0.86, 1, 0.14, '#2b2e3a'); Rr(0, 0.92, 1, 0.012, '#f2c14e');
      g.fillStyle = '#ff4fa8'; g.fillRect(x + 0.44 * w, y + 0.55 * h, 0.06 * w, 0.28 * h); g.fillStyle = '#3ff2ff'; g.fillRect(x + 0.53 * w, y + 0.6 * h, 0.05 * w, 0.24 * h);
    },
  };
  // the far skyline: three layers of towers with lit windows, a tall one with a red light on top. Each layer is drawn
  // once into a long strip (it repeats every 32 towers) and then just slid along
  const SKY_N = 32, SKY_DX = 90, SKY_H = 440, SKYL = [[0.55, '#232845', 7, 0.08, 0.25], [0.8, '#1c2038', 19, 0.16, 0.35], [1.0, '#161a2e', 31, 0.28, 0.45]];
  let STRIPS = null;
  function strips() {
    STRIPS = SKYL.map(([k, col, seed, , dens], li) => {
      const cv = document.createElement('canvas'); cv.width = SKY_N * SKY_DX; cv.height = SKY_H;
      const g = cv.getContext('2d'), r = rng(seed), base = SKY_H - 6, towers = [];
      for (let i = 0; i < SKY_N; i++) {
        const hh = 60 + r() * 180, ww = 30 + r() * 50, sd = (r() * 1e5) | 0, px = i * SKY_DX + SKY_DX / 2, ph = hh * k;
        g.fillStyle = col; g.fillRect(px - ww / 2, base - ph, ww, ph + 6);
        for (let yy = base - ph + 14; yy < base; yy += 14) for (let xx = px - ww / 2 + 6; xx < px + ww / 2 - 6; xx += 10) if (lit(sd, yy * 3 + xx) < dens * 0.6) { g.fillStyle = lit(sd, xx) < 0.3 ? '#9fd8ff' : '#ffd98a'; g.globalAlpha = 0.5 + li * 0.15; g.fillRect(xx, yy, 4, 6); g.globalAlpha = 1; }
        if (li === 0 && i % 9 === 4) { g.fillStyle = col; g.fillRect(px - 6, base - ph - 120, 12, 120); g.fillRect(px - 2, base - ph - 170, 4, 50); towers.push([px, base - ph - 176]); }
      }
      return { cv, towers };
    });
  }
  function skyline(D, g, hz, pan, zc, W, t) {
    if (typeof document === 'undefined') return;
    if (!STRIPS) strips();
    const L = SKY_N * SKY_DX;
    SKYL.forEach(([, , , par], li) => {
      // high above the city (on the viaduct, in the sky) the far towers sink towards the horizon: nothing stands as high as she is
      const st = STRIPS[li], off = pan * (0.3 + par) - zc * 2 * par - SKY_DX / 2, k = clamp(1 - ((theme.camY ?? FLOOR) - floorY(zc) - 20) / 160, 0.3, 1), sh = (SKY_H - 6) * k, y = hz + 6 - sh;
      for (let x = ((off % L) + L) % L - L; x < W; x += L) {
        g.drawImage(st.cv, x, y, L, SKY_H * k);
        for (const [tx, ty] of st.towers) if (x + tx > -10 && x + tx < W + 10) { g.fillStyle = Math.floor(t * 1.2 + tx) % 2 ? '#ff3030' : '#5a1010'; g.fillRect(x + tx - 4, y + ty * k, 8, 8); }
      }
      g.fillStyle = 'rgba(120,90,170,0.12)'; g.fillRect(0, hz - 30 - li * 40, W, 40);
    });
  }
  function fireworks(D, g, hz, W, t, a) {                          // bursts over the finish
    for (let k = 0; k < 4; k++) {
      const cyc = 2.2 + k * 0.4, ph = (t + k * 0.9) % cyc, u = ph / 1.4, n = Math.floor((t + k * 0.9) / cyc);
      if (u > 1) continue;
      const r = rng(n * 17 + k), cx = W * (0.15 + r() * 0.7), cy = hz - 260 - r() * 260, col = NEON[(n + k) % NEON.length], rad = 40 + u * 170;
      g.globalAlpha = a * (1 - u);
      for (let j = 0; j < 18; j++) { const an = j / 18 * Math.PI * 2; g.fillStyle = j % 3 ? col : '#ffffff'; g.fillRect(cx + Math.cos(an) * rad - 4, cy + Math.sin(an) * rad + u * u * 40 - 4, 8, 8); }
      g.globalAlpha = 1;
    }
  }

  root.SkiMaps.define('night', { desc: '深夜街道：閃逆向車、選岔路、衝上夜空降落在飛機上、破窗衝進大樓！', course, theme,
    music: { race: 'night', result: 'night_result' }, score: { par: 118, ranks: root.SkiScore.RANKS, key: 'ski-best-night' }, bg: '#1d2a5a' });
})(typeof window !== 'undefined' ? window : globalThis);

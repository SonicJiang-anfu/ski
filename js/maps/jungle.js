'use strict';
// 困難 · 叢林急流: white water through a rainforest gorge, faster than any easy map. Its tricks: lanes of fast water
// (bright, with chevrons racing down them) that carry her well past her usual top speed; crocodiles that swim
// across or sink and come back up; three waterfalls in a row to fly off; an ancient stone aqueduct high over the
// gorge with no walls at all (ride off its edge, or into one of its broken gaps, and she falls); at its end a sheer
// waterfall she rides straight down, faster than anywhere else, the camera looking down it from above; a cave behind
// a curtain of falling water; a giant waterfall, flown in slow motion, down into a lagoon; and last, the river runs into
// the mouth of a stone face: an ancient temple, crushers slamming down, then a boulder breaks out behind her and
// chases her through it (the camera turns to show it), out on to a cliff where she swings across the ravine on a vine.
// Round an island the river forks: rapids with rock kickers and crocodiles to bounce along on their backs (left), or
// through a giant hollow log (right). Mossy boulders to go round, floating logs to hop, low branches, vines and
// stalactites to crouch under.
(function (root) {
  const { clamp, lerp, seg, smooth, rng, mixHex, obX, obUp, stampY } = root.SkiCore;

  // ------------------------------------------------------------ course
  const FINISH = 1942;
  const FALLS = [[700, 8], [790, 11], [880, 14], [1462, 32]];   // waterfall lips (flown off) and how far each drops
  const STEEP = 3;                                              // the face of a waterfall (grade)
  const AQ = [990, 1212], CAVE = [1300, 1424];                  // the aqueduct (no walls); the cave behind the curtain
  const SHEER = [1240, 140], SG = 10;                           // the sheer fall at the end of the aqueduct (ridden down it) and its grade
  const SHEER_END = SHEER[0] + 1 + (SHEER[1] - 12.5) / SG + 1.5;
  const ISLE = [508, 650], LOG = [528, 628];                    // ② the island the river forks round; the hollow log on its right
  const TEMPLE = [1552, 1712], CRUSH = [1564, 1600], CHASE = [1600, 1650], TFORK = [1656, 1704];   // ⑤ the temple: crushers, the boulder breaking out, a fork
  const VS = 1716;                                              // the cliff at the temple's far side: the vine swing over the ravine
  // one flight (the same integration as SkiPhysics): from height y0 at speed v rising at vy, until she is down to yc
  // above the ground (falling at `grade`); { z: how far, at(z): height above the ground }
  function fly(vy, v, y0, yc, grade = 0) {
    const dt = 1 / 120, pts = [];
    let z = 0, y = y0;
    for (let i = 0; i < 4000; i++) {
      v -= 0.02 * v * dt; z += v * dt;
      if (vy < 0 && y + grade * z <= yc) break;
      vy -= 26 * dt; y += vy * dt;
      pts.push([z, y + grade * z]);
    }
    const at = q => { let k = 0; while (k < pts.length - 1 && pts[k][0] < q) k++; return pts[k][1]; };
    return { z, at };
  }
  const VINE = { vy: 15, v: 30, rise: 1.2, g: 0.45 }, B_VINE = fly(VINE.vy, VINE.v, VINE.rise, 0.3, VINE.g);
  const LANDV = Math.round(VS + 4 + B_VINE.z);
  const fall = ([z, d], before, after) => [[z, before], [z + 0.4, STEEP], [z + 0.4 + d / STEEP, STEEP], [z + 0.8 + d / STEEP, after]];
  const course = root.SkiCourse.build({
    id: 'jungle', HALF: 7, FINISH, LENGTH: 2042, START: 4,
    phys: { VMAX: 34, DRAG: 0.24, DRIFT: 0.35, CENT: 0.8, WALL_DRAG: 1.8 },   // faster than the easy maps; the rock banks bite harder
    flow: true,
    CX: [[0, 0], [50, 0], [100, -6], [150, 5], [200, -5], [250, 7], [300, 0],
      [340, 0], [380, -12], [425, -20], [470, -12], [510, 0], [550, 12], [595, 20], [635, 12], [665, 0],   // ② two long sustained bends
      [690, 0], [712, 0], [745, -6], [770, 0], [802, 0], [835, 6], [860, 0], [895, 0], [925, -6], [955, 0],
      [988, 0], [1016, -7], [1050, 8], [1086, -7], [1118, 0], [1150, 7], [1182, -6], [1210, 0],         // ④ big S-bends on the aqueduct
      [1222, 0], [1270, 0], [1432, 0], [1512, 0], [1530, 5], [1548, 0], [TEMPLE[1], 0], [LANDV, 0], [1830, -8], [1880, 6], [1942, 0], [2042, 0]],
    GRADE: [[0, 0.02], [12, 0.06], [24, 0.18], [330, 0.22], [650, 0.24], [690, 0.2],
      ...fall(FALLS[0], 0.2, 0.08), [725, 0.08], [735, 0.26], [780, 0.2],
      ...fall(FALLS[1], 0.2, 0.08), [818, 0.08], [828, 0.26], [870, 0.2],
      ...fall(FALLS[2], 0.2, 0.08), [910, 0.08], [920, 0.26], [960, 0.22],
      [985, 0.16], [1214, 0.16], [SHEER[0], 0.15], [SHEER[0] + 1, SG], [SHEER_END - 1.5, SG], [SHEER_END, 0.1],   // ⑤ the sheer fall
      [SHEER_END + 50, 0.24], [1427, 0.22], [1450, 0.2],
      ...fall(FALLS[3], 0.2, 0.06), [1502, 0.06], [1522, 0.2], [VS, 0.18], [VS + 3.5, 0.18], [VS + 4, VINE.g], [LANDV + 6, VINE.g], [LANDV + 30, 0.22], [1922, 0.24], [1942, 0.12], [1982, 0], [2042, 0]],
    WIDTH: [[0, 7], [955, 7], [986, 2.7], [1098, 2.7], [1112, 2.2], [1140, 2.2], [1154, 2.7], [1214, 2.7], [1234, 4.5], [SHEER_END + 1, 4.5], [SHEER_END + 20, 7]],
    OPEN: [AQ],
    VERT: [[SHEER[0], SHEER_END]],
    slow: [[FALLS[3][0] - 2, FALLS[3][0] + 60], [VS + 4, LANDV - 4]],   // the giant waterfall and the vine swing, in slow motion
    SPLIT: [{ m: [[ISLE[0] - 1, 0], [ISLE[0] + 12, 1.6], [ISLE[1] - 12, 1.6], [ISLE[1], 0]] }, { m: [[TFORK[0] - 1, 0], [TFORK[0] + 8, 1.2], [TFORK[1] - 8, 1.2], [TFORK[1], 0]] }],
    CAMYAW: [[CHASE[0] + 4, 0], [CHASE[0] + 12, 2.8], [CHASE[1] - 26, 2.8], [CHASE[1] - 16, 0]],   // the camera turns round to show the boulder coming (and back well before the pillar at the fork: facing it only 8 ahead, it came too fast to miss)
    sections: [{ name: '雨林急流', z0: 0 }, { name: '鱷魚河灣', z0: 330 }, { name: '三疊瀑布', z0: 665 }, { name: '天空雙瀑', z0: 960 }, { name: '神殿逃亡', z0: 1480 }],
  }, (c, P) => {
    const FULL = P.FULL;
    const rock = (z, x, hw = 0.9) => P.tall('rock', z, x, hw, { look: 1.5 });   // mossy boulder: go round (as high as its picture)
    const log = (z, x, hw) => P.hop('log', z, x, hw, { hd: 0.45, h: 0.7 });  // floating log: hop it
    const branch = z => P.over('branch', z, 0, FULL);                        // low branch right across: crouch
    const croc = (z, x, period = 3.2) => P.dive('croc', z, x, 1.2, period, { h: 0.7 });          // lies across the current, sinks, comes back up
    const swim = (z, x, amp, period) => P.roll('swim', z, x, 1.2, amp, period, { h: 0.7 });       // swims to and fro across it
    const { coin, row, arc, flow, boost } = P;
    // ① 雨林急流: boulders, logs, low branches; the first lanes of fast water
    flow([[30, 0], [50, 2], [70, -1], [90, -4], [110, -2]]);
    rock(62, 3); rock(84, 1.5); log(104, 3.5, 3.4); branch(128);
    flow([[140, 3], [165, 1], [190, -2], [215, -4]], 1.5);
    rock(150, -3.2); rock(176, 4); croc(196, 3); log(222, -3.5, 3.4); rock(240, 3.6);
    flow([[250, 0], [280, 2], [310, 0]]); branch(266); rock(292, -3); swim(318, 0, 4, 4);
    row(36, 0, 2); row(112, -2, 2); coin(128, -1.5, 0.6); coin(128, 1.5, 0.6); row(160, 1, 2); coin(222, -3.5, 1.9);
    row(250, 0, 2); coin(266, 0, 0.6);
    // ② 鱷魚河灣: two long bends, crocodiles everywhere; the fast water runs round the outside of each bend
    flow([[340, 0], [380, 3.5], [425, 4.5], [470, 3.5], [500, 0]], 1.5);
    croc(352, -2.5); swim(372, 0, 4.3, 4.2); rock(398, -2); croc(410, 3.6, 3.6); croc(440, -1, 3); swim(460, 0, 4.3, 3.8); log(486, -3.5, 3.4);
    row(380, 3.5, 2); row(428, 4.5, 2); coin(486, -3.5, 1.9);
    // round the island: left, the rapids (fast water, rock kickers to fly, crocodiles lying in a row to bounce along
    // on their backs); right, through a giant hollow log (roots to duck, toadstools to go round, more coins)
    P.tall('isle', ISLE[0], 0, 1.4, { hd: 1.4 });
    flow([[520, -4.3], [645, -4.3]], 1.5);
    P.ramp(524, -4.3, 1.8, 1.0, 6); P.flight(c.ramps[c.ramps.length - 1], 3, 4, 32);   // (down well before the first crocodile)
    const back = z => P.stompee('crocback', z, -4.3, 1.3, { h: 0.7, hd: 0.9 });   // a crocodile lying still: hop it, or land on its back and bounce off
    back(576); back(600); coin(588, -4.3, 2.4);
    P.ramp(624, -4.3, 1.8, 1.0, 6); P.flight(c.ramps[c.ramps.length - 1], 3, 4, 32);
    P.over('root', 548, 4.3, 5.4, { y0: 1.3, y1: 2.6 }); coin(548, 4.3, 0.6);
    P.tall('shroom', 566, 3, 0.9, { hd: 0.9 }); coin(566, 5.6);
    P.over('root', 588, 4.3, 5.4, { y0: 1.3, y1: 2.6 }); coin(588, 4.3, 0.6);
    P.tall('shroom', 606, 5.6, 0.9, { hd: 0.9 }); coin(606, 2.9);
    row(536, 4.3, 2, 4); row(614, 4.3, 2, 4);
    log(660, 3.5, 3.2);
    // ③ 三疊瀑布: three waterfalls in a row, coins down every flight; fast water leads to each lip
    for (const [zl] of FALLS.slice(0, 3)) { flow([[zl - 28, 0], [zl - 4, 0]], 1.6); arc(zl, 0, 5, 3.2); }
    rock(682, -4); rock(682, 4); log(744, -3, 3.5); rock(766, 3);
    branch(830); rock(846, -2.8); swim(858, 0, 4, 3.6); log(926, 3, 3.8); croc(944, -2, 3.4);
    row(740, 3.5, 2); coin(830, -1.5, 0.6); coin(830, 1.5, 0.6); row(930, -3, 2);
    // ④ 天空水道: the river narrows into a stone aqueduct over the gorge: no walls, broken gaps to jump, vines to crouch under
    rock(962, -4); rock(962, 4);
    const vine = z => P.over('vine', z, 0, 2 * c.halfAt(z));
    P.gap('gap', 1012, 3); vine(1036); P.gap('gap', 1058, 3); vine(1084);
    P.gap('gap', 1124, 3.5); vine(1164); P.gap('gap', 1190, 3);
    for (const z of [1013.5, 1059.5, 1125.75, 1191.5]) coin(z, 0, 2.0);
    row(996, 0, 3); row(1024, 0, 3); coin(1036, 0, 0.6); row(1068, 0, 3); coin(1084, 0, 0.6); row(1100, 0, 3, 3);
    row(1136, 0, 2, 3); coin(1164, 0, 0.6); row(1202, 0, 3);
    // ⑤ 雙瀑布: straight down the sheer fall and along the canyon below it with nothing in the way (just coins), through
    // the cave behind the falling water, out onto the brink, the giant drop, the lagoon
    for (let k = 0; k < 9; k++) coin(SHEER[0] + 2.5 + k * 1.2, [1.5, 1.5, 0.6, -0.8, -2, -1.2, 0.4, 1.6, 1.2][k], 0.9);
    P.tall('stalag', 1314, -3.4, 0.9); P.tall('stalag', 1314, 3.4, 0.9); P.over('drip', 1332, 0, FULL); log(1348, 0, 3.6);
    P.tall('stalag', 1362, -1.5, 0.9); P.tall('stalag', 1374, 3, 0.9); P.over('drip', 1388, 0, FULL); P.tall('stalag', 1402, -3, 0.9); log(1414, -3.5, 3.4);
    flow([[1430, 0], [1460, 0]], 1.8); arc(FALLS[3][0], 0, 10, 4);
    // the lagoon, then into the stone face's mouth: the temple. Crushers slamming down in turn; the wall behind bursts
    // and a boulder comes rolling after her (a clear run, boost pads, the camera turned round to see it); a fork round
    // a row of pillars (darts across the left, the floor falling in on the right); out on to the cliff, the vine swing
    coin(1528, 0); coin(1540, 0);                                 // (nothing to hop here: a hop still in the giant waterfall's slow motion would slow it again)
    P.cue(TEMPLE[0] - 2, 'temple');
    const crush = (z, x, hw, ph) => P.stamp('crusher', z, x, hw, 2.6, { ph, top: 3.6, hd: 1.0 });
    crush(1568, -3.6, 1.4, 0); crush(1568, 3.6, 1.4, Math.PI); coin(1568, 0);   // (a way through between them, or round the one in the middle: or time it)
    crush(1582, 0, 2.0, 1.6); coin(1582, -4.7); coin(1582, 4.7);
    crush(1596, -3.6, 1.4, 2.4); crush(1596, 3.6, 1.4, 2.4 + Math.PI); coin(1596, 0);
    P.cue(CHASE[0], 'rumble');
    boost(CHASE[0] + 6, 0, 1.6, 6); boost(CHASE[0] + 22, 0, 1.6, 6); boost(CHASE[0] + 38, 0, 1.6, 6); coin(CHASE[0] + 30, 0);
    P.tall('pillar', TFORK[0], 0, 1.3, { hd: 1.0 });
    const darts = z => P.over('darts', z, -4.1, 5.8, { y0: 1.3, y1: 2.4 });   // darts shooting across the left way: duck
    P.roll('spikes', 1664, -4.1, 0.8, 1.6, 2.2, { h: 0.7 }); coin(1664, -4.1, 1.8); darts(1690); coin(1690, -4.1, 0.6);   // (a hop over the spikes is down well before the darts)
    const pit = z => P.gap('pit', z, 3.5, { x: 4.1, hw: 2.9 });                 // the floor falls in on the right way: jump
    pit(1668); coin(1669.75, 4.1, 1.9); pit(1690); coin(1691.75, 4.1, 1.9);
    P.launch(VS, 0, 7, 4, VINE.vy, VINE.v, VINE.rise, { k: 'vine', sfx: 'vine', pop: 'vine' });
    for (let z = VS + 4.5; z < LANDV - 4 - 0.01; z += 4) P.gap('ravine', z, Math.min(4, LANDV - 4 - z), { thrown: true });
    for (let k = 1; k <= 5; k++) { const d = B_VINE.z * k / 6; coin(VS + 4 + d, 0, B_VINE.at(d) + 0.75); }
    flow([[1800, 0], [1832, 3], [1857, 0]], 1.5); croc(1818, -2.5, 3); branch(1840); rock(1862, -2); swim(1882, 0, 4.3, 3.6); log(1900, -3.5, 3.4); rock(1922, -3);
    row(1264, 0, 3); coin(1332, 0, 0.6); coin(1348, 0, 1.9); row(1356, 2, 3); coin(1388, 0, 0.6); row(1432, 0, 3);
    row(1806, 1.5, 2); coin(1840, -1.5, 0.6); coin(1840, 1.5, 0.6); row(1868, 1.5, 2);
  });

  root.SkiCourse.fitFlights(course);                           // the coins down each waterfall go where she really flies

  // ------------------------------------------------------------ look
  const SKW = 46, BANK = [0.5, 1.1, 1.4, 2.4], CEIL = 7.5, DEP = 1.8, LIP = 0.35;
  const GORGE = course.height(AQ[1]) - course.height(SHEER_END);   // the gorge under the aqueduct is as deep as the sheer fall at its end
  const HW = z => course.halfAt(z), gy = z => course.height(z), GZ = z => course.height(z) - GORGE;
  const inAQ = z => z >= AQ[0] && z < AQ[1], inCave = z => z >= CAVE[0] && z < CAVE[1];
  const ALLF = [...FALLS, SHEER];                               // every waterfall, the sheer one too
  const face = f => (f === SHEER ? [SHEER[0], SHEER_END] : [f[0], f[0] + 0.8 + f[1] / STEEP]);   // where a waterfall's face runs
  const BIG = FALLS[3], LAGOON = face(BIG)[1] + 4;              // past the giant waterfall: the lagoon
  const huge = f => f === BIG || f === SHEER;
  const onFace = (za, zb) => ALLF.find(f => { const [a, b] = face(f); return a < zb && b > za; });
  const C = {
    river: ['#2aa1b4', '#2699ad'], deep: '#1f8598', foam: '#eafcff', fallW: '#bdf0fb', fallS: '#ffffff',
    floor: ['#2f7d3a', '#2c7637'], rock: ['#7d7466', '#716959'], ledge: ['#8a8170', '#7f7666'], sand: ['#e9cf92', '#e3c787'],
    bank: { in: '#6a7560', top: '#4d8c3c', out: '#3f7533' }, sbank: { in: '#d9b977', top: '#efd9a0', out: '#e2c487' },
    stone: '#b4ad98', stoneD: '#8f8975', stoneL: '#cfc8b2', aqW: '#4cc4d4', cave: ['#3a3f3f', '#343939'], caveC: '#2a2e2f',
  };
  const PIX = {
    rock: { cs: 0.13, cols: { M: '#4f9a42', G: '#8fd06a', R: '#8a8f86', L: '#b8bcb0', D: '#5e635c' }, rows: [
      '.....MMMM.....', '...MMGGMMMM...', '..MMGMMMMMMM..', '.LRMMMRRMMMRR.', '.LLRRRRRRRRRD.', 'LLRRRRRRRRRRDD', 'LRRRLRRRRRRRDD',
      'LRRRRRRRRRRDDD', '.RRRRRRRRRDDD.', '.DRRRRRRRDDDD.', '..DDDDDDDDDD..'] },
    stalag: { cs: 0.19, cols: { L: '#a9a28f', R: '#7f7969', D: '#5a5549', C: '#7ff6e8' }, rows: [
      '...L....', '...LR...', '...LR...', '..LRR...', '..LRR...', '..LRRD..', '..LRRD..', '.LLRRD..', '.LRRRDD.', '.LRRRDD.',
      '.LRRRDD.', 'LLRRRRDD', 'LRRRRRDD', 'LRRRRRDD', 'CLRRRRDC', 'CCRRRDCC'] },
    croc: [[
      '...............KE.....', '....D.D.D.D...GGGG....', '..DGGGGGGGGGGGGGGGGGG.', 'DGGLGLGLGLGLGGGGGGGGGG', '.GGGGGGGGGGGGGGWGWGWGG', '..LLLLLLLLLLLLLLLLLLL.'],
    ['...............KE...GG', '....D.D.D.D...GGGGGG..', '..DGGGGGGGGGGGGGGW.W..', 'DGGLGLGLGLGLGGGRRRRR..', '.GGGGGGGGGGGGGGW.W.WGG', '..LLLLLLLLLLLLLLLLLLL.']],
    toucan: { cs: 0.12, cols: { K: '#1a1a1a', O: '#ff8a1e', W: '#fff4d0', B: '#3fa9f5', Y: '#e0b030' }, rows: [
      '..KKK...', '.KKBK...', '.KWWOOOO', '.KWWOOO.', '.KKKK...', '.KKKK...', '..KK....', '..Y.Y...'], shadow: false },
    flower: { cs: 0.12, cols: { R: '#ff4f6a', Y: '#ffe14a', G: '#2f8a3a', P: '#ff9ad0' }, rows: ['.R.R.', 'RRYRR', '.RRR.', '..G..', '.GG..'], shadow: false },
  };
  const CROC_COLS = { G: '#3f8f3a', L: '#9bd46a', D: '#28602a', K: '#1a1a1a', E: '#ffe14a', W: '#ffffff', R: '#d8443a' };

  // ---- what grows and stands along the river
  const SCENE = (() => {
    const r = rng(9137), trees = [], palms = [], bananas = [], bamboo = [], ferns = [], flowers = [], boulders = [], heads = [], ruins = [], huts = [], torches = [], canoes = [];
    const bare = z => (z > TEMPLE[0] - 2 && z < TEMPLE[1] + 2) || (z > AQ[0] - 3 && z < AQ[1] + 2) || (z > CAVE[0] - 1 && z < CAVE[1] + 1) || (z > CAVE[1] && z < BIG[0]) || ALLF.some(f => { const [a, b] = face(f); return z > a - 3 && z < b + 3; });
    const lag = z => z > LAGOON;
    for (let z = -20; z < course.LENGTH + 150; z += 3.2 + r() * 2) for (const sd of [-1, 1]) {
      const zz = z + r() * 2;
      if (bare(zz)) continue;
      const near = HW(zz) + BANK[0] + 1.6, k = r();
      if (lag(zz)) {                                              // the lagoon: palms on the beach, huts on stilts, torches
        if (k < 0.45) palms.push({ z: zz, x: sd * (near + 1 + r() * 9), h: 5 + r() * 3, lean: sd * (0.4 + r() * 1.2) });
        else if (k < 0.55) torches.push({ z: zz, x: sd * (near + 0.4) });
        else if (k < 0.75) bananas.push({ z: zz, x: sd * (near + 2 + r() * 8), s: 0.9 + r() * 0.5 });
        else ferns.push({ z: zz, x: sd * (near + r() * 6), s: 0.8 + r() * 0.6 });
      } else if (k < 0.3) trees.push({ z: zz, x: sd * (near + 2.5 + r() * 6), h: 9 + r() * 5, over: r() < 0.45 });
      else if (k < 0.42) palms.push({ z: zz, x: sd * (near + 1 + r() * 7), h: 5 + r() * 3.5, lean: sd * (0.3 + r() * 1.4) });
      else if (k < 0.6) bananas.push({ z: zz, x: sd * (near + 0.5 + r() * 6), s: 0.8 + r() * 0.6 });
      else if (k < 0.7) bamboo.push({ z: zz, x: sd * (near + 1.5 + r() * 7), n: 4 + ((r() * 3) | 0), h: 7 + r() * 4 });
      else if (k < 0.85) ferns.push({ z: zz, x: sd * (near - 0.6 + r() * 4), s: 0.8 + r() * 0.7 });
      else boulders.push({ z: zz, x: sd * (near + r() * 8), s: 0.8 + r() * 1.2 });
      if (r() < 0.35) flowers.push({ z: zz + 1, x: sd * (near - 0.4 + r() * 3), c: r() < 0.5 });
      if (lag(zz)) continue;
      if (r() < 0.6) trees.push({ z: zz + r() * 2, x: sd * (near + 1 + r() * 4), h: 8 + r() * 4, over: r() < 0.4 });   // more right by the water
      if (r() < 0.55) trees.push({ z: zz + r() * 3, x: sd * (near + 6 + r() * 5), h: 13 + r() * 6 });   // tall ones rising over the green behind
    }
    for (let z = 120, k = 0; z < FINISH; z += 150 + r() * 60, k++) {   // stone heads and ruined pillars, now and then
      const sd = k % 2 ? 1 : -1, x = sd * (HW(z) + 9 + r() * 4);
      if (bare(z) || lag(z)) continue;
      if (k % 3 === 1) heads.push({ z, x, h: 5.5 + r() * 1.5 });
      else ruins.push({ z, x, cols: Array.from({ length: 3 }, (_, j) => ({ dz: j * 3.4, h: [6, 3.5, 5][j] * (0.8 + r() * 0.4) })) });
    }
    for (let z = LAGOON + 40, k = 0; z < FINISH + 60; z += 70 + r() * 30, k++) {
      const sd = k % 2 ? -1 : 1;
      huts.push({ z, x: sd * (HW(z) + 6 + r() * 3) });
      canoes.push({ z: z - 6, x: sd * (HW(z) + 2.6) });
    }
    for (let z = ISLE[0] + 18; z < ISLE[1] - 14; z += 22) palms.push({ z, x: 0, h: 6 + r() * 2, lean: (r() - 0.5) * 1.6 });   // palms on the island
    const tops = [];                                               // treetops round the pool under the sheer fall (seen from above)
    for (let z = SHEER_END - 10; z < SHEER_END + 90; z += 3) for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) {
      const x = sd * (HW(z) + 3 + j * 9 + r() * 8);
      tops.push({ z: z + r() * 3, x, rad: 2.5 + r() * 2.5, up: 2 + r() * 1, c: (r() * 3) | 0 });   // (low and level: higher, they stacked up into towers rushing at her, and the camera coming down met them as slabs)
    }
    const byZ = a => a.sort((p, q) => p.z - q.z);
    return { tops: byZ(tops), trees: byZ(trees), palms: byZ(palms), bananas: byZ(bananas), bamboo: byZ(bamboo), ferns: byZ(ferns), flowers: byZ(flowers), boulders: byZ(boulders), heads, ruins, huts, torches: byZ(torches), canoes };
  })();

  // ---- pieces
  function oval(D, R, q, za, zb, s0, s1, col, up, alpha = 1) {   // an oval patch on the water (as in the desert)
    const cz = q.z + q.len / 2, L = q.len / 2, half = (z, s) => { const u = (z - cz) / (L * s); return s > 0 && Math.abs(u) < 1 ? q.hw * s * Math.sqrt(1 - u * u) : 0; };
    const z0 = Math.max(za, cz - L * s0), z1 = Math.min(zb, cz + L * s0);
    for (let z = z0; z < z1 - 1e-6; z += 1) {
      const zz = Math.min(z1, z + 1), oa = half(z, s0), ob = half(zz, s0), ia = half(z, s1), ib = half(zz, s1);
      if (ia <= 0 && ib <= 0) { D.poly3(R.cam, [R.S3(z, q.x - oa, up), R.S3(z, q.x + oa, up), R.S3(zz, q.x + ob, up), R.S3(zz, q.x - ob, up)], col, alpha); continue; }
      for (const sd of [-1, 1]) D.poly3(R.cam, [R.S3(z, q.x + sd * oa, up), R.S3(z, q.x + sd * ia, up), R.S3(zz, q.x + sd * ib, up), R.S3(zz, q.x + sd * ob, up)], col, alpha);
    }
  }
  // white water racing down the river (only near the camera): short streaks, the same wherever they cross a slice
  function rapids(D, R, za, zb, speed = 12) {
    const gap = 1.6, off = (R.t * speed) % gap;
    for (let k = Math.floor((za - off) / gap) - 1; ; k++) {
      const z = k * gap + off;
      if (z >= zb) break;
      const a = Math.max(za, z), b = Math.min(zb, z + 0.7);
      if (b <= a) continue;
      const r = rng(k * 7919 + 13), h = HW(a) - 0.6;
      for (let j = 0; j < 2; j++) { const x = (r() - 0.5) * 2 * h, w = 0.18 + r() * 0.3; D.poly3(R.cam, [R.S3(a, x - w, 0.012), R.S3(a, x + w, 0.012), R.S3(b, x + w, 0.012), R.S3(b, x - w, 0.012)], C.foam, 0.55); }
    }
  }
  function banks(D, R, za, zb, near, col) {                      // rock (or sand) banks either side, foam where the water meets them
    const { cam, P3 } = R, [bx, by, bw, bo] = BANK;
    for (const sd of [-1, 1]) {
      const q = (z, x, y) => P3(z, sd * (HW(z) + x), y);
      if (near) D.poly3(cam, [q(za, bx + bw, by), q(zb, bx + bw, by), q(zb, bo + bw, 0), q(za, bo + bw, 0)], col.out);
      D.poly3(cam, [q(za, bx, by), q(zb, bx, by), q(zb, bx + bw, by), q(za, bx + bw, by)], col.top);
      D.poly3(cam, [q(za, 0, 0), q(zb, 0, 0), q(zb, bx, by), q(za, bx, by)], col.in);
      D.poly3(cam, [q(za, -0.25, 0.012), q(zb, -0.25, 0.012), q(zb, 0.05, 0.02), q(za, 0.05, 0.02)], C.foam, 0.85);
    }
  }
  // the jungle behind the trees: a layer of undergrowth and, further back, a high wall of canopy along both banks,
  // bumpy along the top (the same bumps whichever slice draws them)
  const bump = (z, sd) => 0.5 + 0.3 * Math.sin(z * 0.53 + sd * 2) + 0.2 * Math.sin(z * 1.37 + sd);
  function jungleWalls(D, R, za, zb, lag) {
    const { cam, P3 } = R, n = Math.max(1, Math.round((zb - za) / 2));
    const layers = lag ? [[16, 5, 3, '#2f7f3a']] : [[13, 9, 7, '#1d5c2f'], [5.5, 2.4, 1.8, '#2c7a37']];
    for (const [dx, base, amp, col] of layers) for (const sd of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= n; i++) { const z = za + (zb - za) * i / n; pts.push(P3(z, sd * (HW(z) + dx), base + amp * bump(z, sd + dx))); }
      pts.push(P3(zb, sd * (HW(zb) + dx), -0.5), P3(za, sd * (HW(za) + dx), -0.5));
      D.poly3(cam, pts, col, 1, [-sd, 0, 0]);
    }
  }
  // the rock walls either side of the sheer fall, standing out from its face (so they line it, seen from above)
  function sheerWalls(D, R, za, zb, near) {
    const { cam, wx } = R, a = Math.max(za, SHEER[0]), b = Math.min(zb, SHEER_END);
    if (b <= a) return;
    const N = (z, x, d) => { const g = course.grade(z), c = 1 / Math.sqrt(1 + g * g); return [wx(z, x), gy(z) + d * c, z + d * g * c]; };
    for (let z = a; z < b - 1e-6; z += 0.5) {
      const z1 = Math.min(b, z + 0.5), k = Math.floor(z * 2) % 2;
      for (const sd of [-1, 1]) {
        const x0 = sd * (HW(z) + 0.1), x1 = sd * (HW(z1) + 0.1);
        D.poly3(cam, [N(z, x0, 0), N(z1, x1, 0), N(z1, x1, 1.4), N(z, x0, 1.4)], k ? '#5e5a4e' : '#57534a', 1, [-sd, 0, 0]);
        if (near && k) D.poly3(cam, [N(z, x0 - sd * 0.01, 1), N(z1, x1 - sd * 0.01, 1), N(z1, x1 - sd * 0.01, 1.4), N(z, x0 - sd * 0.01, 1.4)], '#3f8a3a', 1, [-sd, 0, 0]);
      }
    }
  }
  // a waterfall's face: pale water with white streaks pouring down it (only the part inside [za, zb])
  function fallFace(D, R, f, za, zb, near) {
    const [a, b] = face(f), z0 = Math.max(za, a), z1 = Math.min(zb, b), wide = f === BIG ? 12 : 0, { cam, P3, t } = R;
    if (z1 <= z0) return;
    const h0 = HW(z0) + wide, h1 = HW(z1) + wide;
    D.poly3(cam, [P3(z0, -h0, 0.01), P3(z0, h0, 0.01), P3(z1, h1, 0.01), P3(z1, -h1, 0.01)], C.fallW);
    if (!near && f !== BIG) return;
    const L = b - a;
    for (let x = -h0 + 0.4, i = 0; x < h0 - 0.2; x += 0.85, i++) {
      const u = ((t * 1.3 + ((i * 0.618) % 1)) % 1), s0 = a + u * L, s1 = Math.min(b, s0 + L * 0.35), c0 = Math.max(z0, s0), c1 = Math.min(z1, s1);
      if (c1 > c0) D.poly3(cam, [P3(c0, x - 0.12, 0.03), P3(c0, x + 0.12, 0.03), P3(c1, x + 0.12, 0.03), P3(c1, x - 0.12, 0.03)], C.fallS, 0.8);
    }
  }
  // the aqueduct over [za, zb]: a stone channel of water with low lips and no walls, broken where there are gaps
  function aqueduct(D, R, za, zb, near) {
    const { cam, P3, t } = R, holes = course.obstacles.filter(o => o.hole && o.z + o.hd > za && o.z - o.hd < zb);
    const edges = course.obstacles.filter(o => o.hole && o.z - o.hd >= za && o.z - o.hd - 3 < zb);
    for (const o of holes) {                                       // water pouring into each gap; the far broken edge
      const hs = o.z - o.hd, he = o.z + o.hd, h = HW(o.z);
      if (hs >= za && hs < zb) {
        D.poly3(cam, [P3(hs, -h - LIP, 0.12), P3(hs, h + LIP, 0.12), P3(hs, h + LIP, -DEP), P3(hs, -h - LIP, -DEP)], '#5a5446', 1, [0, 0, 1]);
        D.poly3(cam, [P3(hs, -h, 0), P3(hs, h, 0), P3(hs + 0.9, h, -9), P3(hs + 0.9, -h, -9)], '#ffffff', 0.9);
        for (let k = 0; k < 3; k++) { const u = (t * 2.2 + k / 3) % 1; D.poly3(cam, [P3(hs + 0.9 * u, -h, -9 * u), P3(hs + 0.9 * u, h, -9 * u), P3(hs + 0.9 * u + 0.1, h, -9 * u - 1.5), P3(hs + 0.9 * u + 0.1, -h, -9 * u - 1.5)], C.fallW, 0.9); }
      }
      if (he > za && he <= zb) {
        D.poly3(cam, [P3(he, -h - LIP, 0.12), P3(he, h + LIP, 0.12), P3(he, h + LIP, -DEP), P3(he, -h - LIP, -DEP)], '#5a5446', 1, [0, 0, -1]);
        for (let x = -h - LIP, i = 0; x < h + LIP - 0.1; x += 0.7, i++) D.poly3(cam, [P3(he - 0.01, x, 0.13), P3(he - 0.01, x + 0.7, 0.13), P3(he - 0.01, x + 0.35, 0.13 + 0.15 + (i % 3) * 0.12)], C.stoneD);   // a broken top edge
        for (let x = -h; x < h; x += 1.1) D.poly3(cam, [P3(he, x, -DEP), P3(he, x + 1.1, -DEP), P3(he - 0.01, x + 0.55, -DEP - 0.5 - ((x * 7) % 1 + 1) % 1 * 0.6)], C.stoneD);   // ragged underside
      }
    }
    const pieces = []; let a = za;                               // the deck, minus the gaps
    for (const o of holes.sort((p, q) => p.z - q.z)) { const hs = o.z - o.hd, he = o.z + o.hd; if (hs > a) pieces.push([a, Math.min(zb, hs)]); a = Math.max(a, he); }
    if (a < zb) pieces.push([a, zb]);
    for (const [p0, p1] of pieces) {
      const h0 = HW(p0), h1 = HW(p1);
      const side = p1 > R.zc + 4;                                  // (on a bend the camera can hang out past the edge: its sides right below it would fill a corner)
      for (const sd of [-1, 1]) {
        if (side) D.poly3(cam, [P3(p0, sd * (h0 + LIP), 0.12), P3(p1, sd * (h1 + LIP), 0.12), P3(p1, sd * (h1 + LIP), -DEP), P3(p0, sd * (h0 + LIP), -DEP)], C.stone, 1, [sd, 0, 0]);
        if (near) {                                                 // water spilling over the lip and down the side
          const u = (t * 1.5) % 1;
          D.poly3(cam, [P3(p0, sd * (h0 + LIP + 0.01), 0.1), P3(p1, sd * (h1 + LIP + 0.01), 0.1), P3(p1, sd * (h1 + LIP + 0.01), -0.4 - u), P3(p0, sd * (h0 + LIP + 0.01), -0.4 - u)], C.fallW, 0.55, [sd, 0, 0]);
        }
        D.poly3(cam, [P3(p0, sd * h0, 0), P3(p1, sd * h1, 0), P3(p1, sd * h1, 0.12), P3(p0, sd * h0, 0.12)], C.stoneD);
        D.poly3(cam, [P3(p0, sd * h0, 0.12), P3(p1, sd * h1, 0.12), P3(p1, sd * (h1 + LIP), 0.12), P3(p0, sd * (h0 + LIP), 0.12)], C.stoneL);
      }
      D.poly3(cam, [P3(p0, -h0, 0.005), P3(p0, h0, 0.005), P3(p1, h1, 0.005), P3(p1, -h1, 0.005)], C.aqW);
      if (near) rapids(D, R, p0, p1, 10);
      for (const o of edges) {                                     // white water rushing to the edge of a gap: jump here
        const hs = o.z - o.hd, a0 = Math.max(p0, hs - 3), a1 = Math.min(p1, hs);
        if (a1 > a0) D.poly3(cam, [P3(a0, -HW(a0), 0.015), P3(a0, HW(a0), 0.015), P3(a1, HW(a1), 0.015), P3(a1, -HW(a1), 0.015)], '#ffffff', 0.8 + 0.15 * Math.sin(t * 10));
      }
    }
  }
  // the cave behind the falling water: dark rock on the left, the bright curtain on the right, a rock ceiling
  function cave(D, R, za, zb, near) {
    const { cam, P3, t } = R, W = HW(za) + 0.2, k = ((Math.floor(za / 2) % 2) + 2) % 2;
    D.poly3(cam, [P3(za, -W, 0), P3(zb, -W, 0), P3(zb, -W, CEIL), P3(za, -W, CEIL)], C.cave[k], 1, [1, 0, 0]);
    D.poly3(cam, [P3(za, W + 1.5, -1), P3(zb, W + 1.5, -1), P3(zb, W + 1.5, CEIL), P3(za, W + 1.5, CEIL)], '#e8fbff', 1, [-1, 0, 0]);   // daylight through the water
    D.poly3(cam, [P3(za, W, 0), P3(zb, W, 0), P3(zb, W, CEIL), P3(za, W, CEIL)], '#8fd8ec', 0.55, [-1, 0, 0]);
    D.poly3(cam, [P3(za, -W, CEIL), P3(za, W, CEIL), P3(zb, W, CEIL), P3(zb, -W, CEIL)], C.caveC, 1, [0, -1, 0]);
    if (!near) return;
    for (let j = 0; j < 4; j++) {                                  // the curtain's streaks pouring past
      const r = rng(Math.floor(za) * 31 + j), z = lerp(za, zb, r()), u = (t * 1.8 + r()) % 1, y1 = CEIL * (1 - u), y0 = Math.max(0, y1 - 2.5);
      D.poly3(cam, [P3(z, W - 0.02, y0), P3(z + 0.25, W - 0.02, y0), P3(z + 0.25, W - 0.02, y1), P3(z, W - 0.02, y1)], '#ffffff', 0.85, [-1, 0, 0]);
    }
    const r = rng(Math.floor(za) * 17 + 5);                       // glowing mushrooms low on the rock wall, drips from the ceiling
    if (r() < 0.6) { const z = lerp(za, zb, r()), y = 0.3 + r() * 1.5, col = r() < 0.5 ? '#7ff6e8' : '#ff7ad9';
      D.poly3(cam, [P3(z - 0.35, -W + 0.02, y), P3(z + 0.35, -W + 0.02, y), P3(z, -W + 0.02, y + 0.3)], col, 1, [1, 0, 0]);
      D.poly3(cam, [P3(z - 0.6, -W + 0.01, y - 0.4), P3(z + 0.6, -W + 0.01, y - 0.4), P3(z + 0.6, -W + 0.01, y + 0.6), P3(z - 0.6, -W + 0.01, y + 0.6)], col, 0.18, [1, 0, 0]); }
    for (let j = 0; j < 2; j++) { const x = (r() - 0.5) * 2 * W, z = lerp(za, zb, r()), l = 0.4 + r() * 0.8; D.poly3(cam, [P3(z - 0.25, x, CEIL), P3(z + 0.25, x, CEIL), P3(z, x, CEIL - l)], '#4a4f4e'); }
  }
  // the cliff the river runs into: a wall of rock with the cave mouth, falls pouring over it, the curtain across the mouth
  function cliff(D, R) {
    const { cam, P3, t } = R, z = CAVE[0], W = HW(z) + 0.2, top = 46, O = 8.5, X = 110;
    const q = (x, y) => P3(z, x, y), n = [0, 0, -1];
    D.poly3(cam, [q(-X, -1), q(-W, -1), q(-W, top), q(-X, top)], '#6f6a5c', 1, n);
    D.poly3(cam, [q(W, -1), q(X, -1), q(X, top), q(W, top)], '#6f6a5c', 1, n);
    D.poly3(cam, [q(-W, O), q(W, O), q(W, top), q(-W, top)], '#6f6a5c', 1, n);
    for (let k = 0; k < 6; k++) { const y = 6 + k * 7; D.poly3(cam, [q(-X, y), q(X, y), q(X, y + 1.2), q(-X, y + 1.2)], '#655f52', 1, n); }   // strata
    D.poly3(cam, [q(-X, top - 2), q(X, top - 2), q(X, top + 1.5), q(-X, top + 1.5)], '#3f8a3a', 1, n);   // jungle along the top
    for (let x = -X + 3, i = 0; x < X; x += 5.5, i++) { const l = 4 + ((i * 37) % 9); if (Math.abs(x) > W + 1 || true) D.poly3(cam, [q(x, top - 2), q(x + 0.5, top - 2), q(x + 0.3, top - 2 - l), q(x + 0.1, top - 2 - l)], '#3a7d35', 1, n); }
    for (const [x, w] of [[-62, 7], [-34, 4], [-17, 3], [24, 5], [48, 9], [80, 4]]) {   // falls over the top
      D.poly3(cam, [q(x - w, -1), q(x + w, -1), q(x + w, top), q(x - w, top)], C.fallW, 1, n);
      for (let k = 0; k < 5; k++) { const u = (t * 0.8 + k / 5 + x * 0.01) % 1, y1 = top * (1 - u), y0 = Math.max(-1, y1 - 9), xx = x - w + (k + 0.5) * (2 * w / 5);
        D.poly3(cam, [q(xx - 0.4, y0), q(xx + 0.4, y0), q(xx + 0.4, y1), q(xx - 0.4, y1)], '#ffffff', 0.8, n); }
    }
    D.poly3(cam, [q(-W - 0.8, -1), q(-W, -1), q(-W, O), q(-W - 0.8, O)], '#5a554a', 1, n);
    D.poly3(cam, [q(W, -1), q(W + 0.8, -1), q(W + 0.8, O), q(W, O)], '#5a554a', 1, n);
    for (let k = 0; k < 3; k++) {                                  // the curtain over the mouth: she rides right through it
      const u = (t * 1.6 + k / 3) % 1;
      D.poly3(cam, [P3(z - 0.05, -W, O * (1 - u) - 3), P3(z - 0.05, W, O * (1 - u) - 3), P3(z - 0.05, W, O * (1 - u) + 3), P3(z - 0.05, -W, O * (1 - u) + 3)], '#ffffff', 0.18);
    }
    D.poly3(cam, [P3(z - 0.06, -W, 0), P3(z - 0.06, W, 0), P3(z - 0.06, W, O), P3(z - 0.06, -W, O)], C.fallW, 0.3);
  }
  function caveExit(D, R) {                                       // the far mouth, seen from inside
    const { cam, P3 } = R, z = CAVE[1], W = HW(z) + 0.2, n = [0, 0, -1];
    D.poly3(cam, [P3(z, -W - 30, -2), P3(z, -W, -2), P3(z, -W, 30), P3(z, -W - 30, 30)], '#4a4d48', 1, n);
    D.poly3(cam, [P3(z, W, -2), P3(z, W + 30, -2), P3(z, W + 30, 30), P3(z, W, 30)], '#4a4d48', 1, n);
    D.poly3(cam, [P3(z, -W, CEIL), P3(z, W, CEIL), P3(z, W, 30), P3(z, -W, 30)], '#4a4d48', 1, n);
  }

  // ---- what stands beside the river
  function canopy(D, cam, X, y, z, rad, cols) {                   // a round crown of leaves: dark, mid and a light top
    const blob = (cx, cy, r, col) => { const p = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, z]); } D.poly3(cam, p, col); };
    blob(X, y, rad, cols[0]); blob(X - rad * 0.55, y - rad * 0.2, rad * 0.7, cols[0]); blob(X + rad * 0.6, y - rad * 0.15, rad * 0.65, cols[1]);
    blob(X - rad * 0.15, y + rad * 0.3, rad * 0.6, cols[1]); blob(X + rad * 0.2, y + rad * 0.45, rad * 0.32, cols[2]);
  }
  function canopy2(D, cam, X, y, z, rad, cols) {                 // the same crown far away: two blobs
    const blob = (cx, cy, r, col) => { const p = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, z]); } D.poly3(cam, p, col); };
    blob(X, y, rad, cols[0]); blob(X - rad * 0.1, y + rad * 0.3, rad * 0.6, cols[1]);
  }
  const LEAF = [['#1f6a33', '#2f8a3f', '#56b25a'], ['#25713a', '#3a9a48', '#6cc266'], ['#1d5f36', '#2b7d44', '#4aa25a']];
  function tree(D, R, t, far) {
    const { cam, wx } = R, z = t.z, X = wx(z, t.x), y0 = gy(z), h = t.h, cols = LEAF[Math.floor(Math.abs(t.z * 3)) % 3];
    D.poly3(cam, [[X - 0.55, y0, z], [X + 0.55, y0, z], [X + 0.35, y0 + h, z], [X - 0.35, y0 + h, z]], '#6b4a2e');
    if (!far) {
      D.poly3(cam, [[X - 1.6, y0, z], [X - 0.4, y0, z], [X - 0.4, y0 + 2.2, z]], '#5a3d24'); D.poly3(cam, [[X + 1.5, y0, z], [X + 0.4, y0, z], [X + 0.4, y0 + 2, z]], '#5a3d24');
      D.poly3(cam, [[X - 0.15, y0 + 1, z - 0.01], [X + 0.1, y0 + 1, z - 0.01], [X + 0.1, y0 + h * 0.8, z - 0.01], [X - 0.15, y0 + h * 0.8, z - 0.01]], '#8a6440');
    }
    const ox = t.over ? -Math.sign(t.x) * 3.5 : 0;                // some lean right out over the river
    if (t.over) D.poly3(cam, [[X - 0.25, y0 + h - 1, z], [X + 0.25, y0 + h - 1, z], [X + ox + 0.2, y0 + h + 0.8, z], [X + ox - 0.2, y0 + h + 0.8, z]], '#6b4a2e');
    if (far) { canopy2(D, cam, X + ox, y0 + h + 1, z, 3.8, cols); return; }
    canopy(D, cam, X + ox, y0 + h + 1, z, 3.2 + (t.h - 9) * 0.15, cols);
    if (Math.abs(z - R.zc) < 25) for (let k = 0; k < 3; k++) { const vx = X + ox + (k - 1) * 1.6, l = 2.5 + ((k * 13 + Math.floor(z)) % 5) * 0.6; D.poly3(cam, [[vx - 0.05, y0 + h, z - 0.02], [vx + 0.05, y0 + h, z - 0.02], [vx + 0.05, y0 + h - l, z - 0.02], [vx - 0.05, y0 + h - l, z - 0.02]], '#2f7a2f'); }
  }
  function treetop(D, R, tp) {                                    // a crown seen from above: round, a lighter top to one side
    const Y = gy(Math.max(tp.z, SHEER_END)) + tp.up;              // on the ground at the foot of the fall, not up its face
    const disc = (dx, dz, rr, col) => { const p = []; for (let m = 0; m < 7; m++) { const a = m / 7 * Math.PI * 2, z = tp.z + dz + Math.sin(a) * rr; p.push([R.wx(z, tp.x + dx + Math.cos(a) * rr), Y, z]); } D.poly3(R.cam, p, col); };
    const col = LEAF[tp.c];
    disc(0, 0, tp.rad, col[0]); disc(-tp.rad * 0.2, -tp.rad * 0.2, tp.rad * 0.6, col[1]); disc(-tp.rad * 0.35, -tp.rad * 0.3, tp.rad * 0.25, col[2]);
  }
  function palm(D, cam, x, z, y0, h, lean, far) {
    const T = [x + lean, y0 + h];
    D.poly3(cam, [[x - 0.2, y0, z], [x + 0.2, y0, z], [T[0] + 0.13, T[1], z], [T[0] - 0.13, T[1], z]], '#9a7a4a');
    if (far) { D.poly3(cam, [[T[0] - 2, T[1] - 0.6, z], [T[0], T[1] + 0.5, z], [T[0] + 2, T[1] - 0.6, z], [T[0], T[1] - 0.2, z]], '#2f9a52'); return; }
    for (const [ang, len, col] of [[2.85, 2.4, '#2f8a4a'], [0.3, 2.4, '#2f8a4a'], [2.1, 2.0, '#3aa65a'], [1.05, 2.0, '#3aa65a'], [1.57, 1.5, '#47b866']]) {
      const dx = Math.cos(ang), dy = Math.sin(ang), tip = [T[0] + dx * len, T[1] + dy * len * 0.55 - 0.25 * Math.abs(dx) * len];
      const mid = [T[0] + dx * len * 0.5, T[1] + dy * len * 0.4], nx = -dy * 0.32, ny = dx * 0.32;
      D.poly3(cam, [[T[0], T[1], z - 0.01], [mid[0] + nx, mid[1] + ny, z - 0.01], [tip[0], tip[1], z - 0.01], [mid[0] - nx * 0.4, mid[1] - ny * 0.4, z - 0.01]], col);
    }
    D.poly3(cam, [[T[0] - 0.25, T[1] - 0.3, z - 0.02], [T[0] + 0.25, T[1] - 0.3, z - 0.02], [T[0], T[1] - 0.7, z - 0.02]], '#7a5a2a');   // coconuts
  }
  function banana(D, cam, X, z, y0, s) {                         // a banana plant: big paddle leaves fanning out
    D.poly3(cam, [[X - 0.15 * s, y0, z], [X + 0.15 * s, y0, z], [X + 0.1 * s, y0 + 1.6 * s, z], [X - 0.1 * s, y0 + 1.6 * s, z]], '#6a8a3a');
    for (const [ang, col] of [[2.5, '#3f9e3c'], [0.65, '#3f9e3c'], [1.95, '#58b84a'], [1.2, '#58b84a'], [1.57, '#6cc85a']]) {
      const dx = Math.cos(ang), dy = Math.sin(ang), b = [X, y0 + 1.5 * s], L = 2.2 * s, w = 0.55 * s;
      const tip = [b[0] + dx * L, b[1] + dy * L * 0.8], m = [b[0] + dx * L * 0.5, b[1] + dy * L * 0.4];
      D.poly3(cam, [[b[0], b[1], z - 0.01], [m[0] - dy * w, m[1] + dx * w, z - 0.01], [tip[0], tip[1], z - 0.01], [m[0] + dy * w, m[1] - dx * w, z - 0.01]], col);
    }
  }
  function fern(D, cam, X, z, y0, s) {
    for (let k = 0; k < 5; k++) { const a = Math.PI * (0.15 + k * 0.175), dx = Math.cos(a), dy = Math.sin(a);
      D.poly3(cam, [[X - 0.12 * s, y0, z], [X + 0.12 * s, y0, z], [X + dx * 1.4 * s, y0 + dy * 1.1 * s, z]], k % 2 ? '#2f7f34' : '#3c9440'); }
  }
  function bambooClump(D, cam, X, z, y0, b, far) {
    for (let k = 0; k < b.n; k++) {
      const x = X + (k - b.n / 2) * 0.55, h = b.h * (0.75 + ((k * 37) % 10) / 40), lean = (k - b.n / 2) * 0.25;
      D.poly3(cam, [[x - 0.12, y0, z], [x + 0.12, y0, z], [x + lean + 0.09, y0 + h, z], [x + lean - 0.09, y0 + h, z]], k % 2 ? '#7cbf3f' : '#5fa83a');
      if (!far) for (let y = 1.4; y < h; y += 1.4) { const xx = x + lean * y / h; D.poly3(cam, [[xx - 0.13, y0 + y, z - 0.01], [xx + 0.13, y0 + y, z - 0.01], [xx + 0.13, y0 + y + 0.1, z - 0.01], [xx - 0.13, y0 + y + 0.1, z - 0.01]], '#3f7a2a'); }
      D.poly3(cam, [[x + lean, y0 + h, z - 0.02], [x + lean + 1.1, y0 + h - 0.5, z - 0.02], [x + lean + 0.2, y0 + h - 0.2, z - 0.02], [x + lean - 1, y0 + h - 0.4, z - 0.02]], '#4fae3c');
    }
  }
  function boulder(D, cam, X, z, y0, s) {
    const p = (a, r, up) => [X + Math.cos(a) * r * s, y0 + Math.sin(a) * r * s * up, z];
    D.poly3(cam, [p(Math.PI, 1.4, 1), p(2.4, 1.3, 1), p(1.9, 1.2, 1), p(1.2, 1.25, 1), p(0.5, 1.3, 1), p(0, 1.4, 1)], '#878a7e');
    D.poly3(cam, [p(2.6, 1.2, 1), p(1.9, 1.15, 1.05), p(1.2, 1.2, 1.05), p(0.6, 1.1, 1), p(1.3, 0.9, 0.9)], '#4f9a42');   // moss on top
  }
  function stoneHead(D, cam, X, z, y0, h) {                       // an old carved stone face, half swallowed by the jungle
    const w = h * 0.36, d = h * 0.3;
    D.box3(cam, X - w, X + w, y0, y0 + h, z - d, z + d, { side: '#9a947f', rear: '#aaa48e', top: '#5aa64a' });
    const f = (x0, x1, y_0, y_1, col) => D.poly3(cam, [[X + x0 * w, y0 + y_0 * h, z - d - 0.02], [X + x1 * w, y0 + y_0 * h, z - d - 0.02], [X + x1 * w, y0 + y_1 * h, z - d - 0.02], [X + x0 * w, y0 + y_1 * h, z - d - 0.02]], col);
    f(-0.75, 0.75, 0.62, 0.68, '#7d7765'); f(-0.6, -0.2, 0.5, 0.58, '#3a3a34'); f(0.2, 0.6, 0.5, 0.58, '#3a3a34');   // brow, eyes
    f(-0.12, 0.12, 0.3, 0.5, '#bdb7a0'); f(-0.45, 0.45, 0.16, 0.22, '#3a3a34');                                     // nose, mouth
    f(-1, -0.6, 0.7, 1, '#4f9a42'); f(0.5, 1, 0.82, 1, '#4f9a42');                                                   // moss
  }
  function column(D, cam, X, z, y0, h) {
    D.box3(cam, X - 0.5, X + 0.5, y0, y0 + h, z - 0.5, z + 0.5, { side: '#a9a38e', rear: '#bdb7a0', top: '#5aa64a' });
    D.poly3(cam, [[X - 0.3, y0 + h, z - 0.52], [X - 0.15, y0 + h, z - 0.52], [X - 0.15, y0 + h * 0.3, z - 0.52], [X - 0.3, y0 + h * 0.3, z - 0.52]], '#3f8a3a');
  }
  function hut(D, cam, X, z, y0) {                                // on stilts, with a thatched roof
    const w = 1.8, d = 1.6, b = y0 + 1.4;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) D.box3(cam, X + sx * w - 0.1, X + sx * w + 0.1, y0, b, z + sz * d - 0.1, z + sz * d + 0.1, { side: '#7a5530', rear: '#8a6238', top: '#8a6238' });
    D.box3(cam, X - w, X + w, b, b + 2, z - d, z + d, { side: '#b98a4a', rear: '#c99a58', top: '#c99a58' });
    D.poly3(cam, [[X - 0.5, b, z - d - 0.01], [X + 0.5, b, z - d - 0.01], [X + 0.5, b + 1.4, z - d - 0.01], [X - 0.5, b + 1.4, z - d - 0.01]], '#4a3018');
    D.poly3(cam, [[X - w - 0.6, b + 1.8, z - d - 0.6], [X + w + 0.6, b + 1.8, z - d - 0.6], [X, b + 3.6, z - d - 0.6]], '#e2bf62');
    D.poly3(cam, [[X - w - 0.6, b + 1.8, z - d - 0.6], [X, b + 3.6, z - d - 0.6], [X, b + 3.6, z + d + 0.6], [X - w - 0.6, b + 1.8, z + d + 0.6]], '#c9a24e');
    D.poly3(cam, [[X + w + 0.6, b + 1.8, z - d - 0.6], [X, b + 3.6, z - d - 0.6], [X, b + 3.6, z + d + 0.6], [X + w + 0.6, b + 1.8, z + d + 0.6]], '#d6b058');
  }
  function torch(D, cam, X, z, y0, t) {
    D.poly3(cam, [[X - 0.08, y0, z], [X + 0.08, y0, z], [X + 0.08, y0 + 2.2, z], [X - 0.08, y0 + 2.2, z]], '#6b4a2e');
    const fl = 0.85 + 0.15 * Math.sin(t * 21 + z);
    D.poly3(cam, [[X - 0.22, y0 + 2.2, z - 0.01], [X + 0.22, y0 + 2.2, z - 0.01], [X, y0 + 2.2 + 0.8 * fl, z - 0.01]], '#ff8a1e');
    D.poly3(cam, [[X - 0.1, y0 + 2.22, z - 0.02], [X + 0.1, y0 + 2.22, z - 0.02], [X, y0 + 2.22 + 0.45 * fl, z - 0.02]], '#fff1a8');
  }
  function canoe(D, cam, X, z, y0) {
    D.poly3(cam, [[X - 0.5, y0 + 0.05, z - 2.4], [X + 0.5, y0 + 0.05, z - 2.4], [X + 0.6, y0 + 0.4, z - 1.5], [X - 0.6, y0 + 0.4, z - 1.5]], '#8a5a2a');
    D.poly3(cam, [[X - 0.6, y0 + 0.4, z - 1.5], [X + 0.6, y0 + 0.4, z - 1.5], [X + 0.6, y0 + 0.4, z + 1.5], [X - 0.6, y0 + 0.4, z + 1.5]], '#5a3a1a');
  }
  // the gorge below the aqueduct: its floor, a river, treetops, mist; the stone piers and arches holding the channel up
  function gorge(D, R, za, zb, near) {
    const { cam, P3, t } = R, a = Math.max(za, AQ[0]), b = Math.min(zb, AQ[1]);
    if (b <= a) return;
    const G = (z, x, up = 0) => P3(z, x, GZ(z) - gy(z) + up), k = ((Math.floor(a / 8) % 2) + 2) % 2;
    D.poly3(cam, [G(a, -160), G(a, 160), G(b, 160), G(b, -160)], k ? '#2b5f3c' : '#2e643f');
    const rx = z => 22 * Math.sin(z * 0.018);
    D.poly3(cam, [G(a, rx(a) - 5, 0.05), G(a, rx(a) + 5, 0.05), G(b, rx(b) + 5, 0.05), G(b, rx(b) - 5, 0.05)], '#2f9fb4');
    for (let blk = Math.floor(a / 8); blk * 8 < b; blk++) {         // treetops seen from above: clumps of round crowns, 4 to every 8 units
      const r = rng(blk * 13 + 7);
      for (let j = 0; j < 4; j++) {
        const z = blk * 8 + r() * 8, x = (r() - 0.5) * 200, rad = 5 + r() * 5, up = 4 + r() * 4, col = LEAF[j % 3];
        if (z < a || z >= b || Math.abs(x - rx(z)) < 9) continue;
        const disc = (dx, dz, rr, c) => { const p = []; for (let m = 0; m < 7; m++) { const an = m / 7 * Math.PI * 2; p.push(G(z + dz + Math.sin(an) * rr * 0.8, x + dx + Math.cos(an) * rr, up)); } D.poly3(cam, p, c); };
        disc(0, 0, rad, col[0]); disc(rad * 0.85, rad * 0.3, rad * 0.7, col[0]);
        if (near) disc(-rad * 0.2, -rad * 0.2, rad * 0.55, col[1]);
      }
    }
    for (const [up, al] of [[10, 0.1], [20, 0.12], [30, 0.12]]) D.poly3(cam, [G(a, -160, up), G(a, 160, up), G(b, 160, up), G(b, -160, up)], '#e6f6f2', al);   // haze: the deeper, the paler
    for (let z = Math.ceil((a - AQ[0] - 6) / 14) * 14 + AQ[0] + 6; z < b; z += 14) {   // piers
      if (z > AQ[1] - 4 || (z > R.zc - 16 && z < R.zc + 8)) continue;   // (right by the camera a pier and its arches would fill a corner of the screen)
      const X = R.wx(z, 0), top = gy(z) - DEP, bot = GZ(z);
      D.box3(cam, X - 1.3, X + 1.3, bot, top, z - 1.1, z + 1.1, { side: '#a49d87', rear: '#b4ad98', front: '#b4ad98', top: '#b4ad98' });
      for (let y = bot + 6; y < top - 2; y += 7) D.poly3(cam, [[X - 1.31, y, z - 1.11], [X + 1.31, y, z - 1.11], [X + 1.31, y + 0.4, z - 1.11], [X - 1.31, y + 0.4, z - 1.11]], '#8f8975');
      for (const sd of [-1, 1]) {                                  // an arch between this pier and the next, either side
        const z1 = z + 14, h = HW(z) + LIP, pts = [P3(z + 1.1, sd * h, -DEP), P3(z1 - 1.1, sd * h, -DEP), P3(z1 - 1.1, sd * h, -DEP - 4)];
        for (let m = 1; m < 8; m++) { const u = m / 8; pts.push(P3(z1 - 1.1 - u * 11.8, sd * h, -DEP - 4 + Math.sin(u * Math.PI) * 3)); }
        pts.push(P3(z + 1.1, sd * h, -DEP - 4));
        D.poly3(cam, pts, '#a49d87', 1, [sd, 0, 0]);
      }
    }
    if (AQ[1] > za && AQ[1] <= zb) {                               // the far cliff, up to the jungle again
      const d = GZ(AQ[1]) - gy(AQ[1]), c = (x0, x1, y0, y1, col) => D.poly3(cam, [P3(AQ[1], x0, y0), P3(AQ[1], x1, y0), P3(AQ[1], x1, y1), P3(AQ[1], x0, y1)], col, 1, [0, 0, -1]);
      c(-SKW, SKW, d, -0.05, '#6f6a5c');
      for (let k = 1; k < 5; k++) c(-SKW, SKW, d * k / 5, d * k / 5 + 1.2, '#645f52');
      for (let x = -SKW + 2, i = 0; x < SKW; x += 4.5, i++) c(x, x + 0.4, -3 - (i * 7) % 6, -0.05, '#3a7d35');   // vines over the edge
    }
  }

  // the far horizon: misty limestone peaks in three layers, a long fall on one of them; parrots crossing
  function horizon(D, g, hz, pan, zc, W, t) {
    [[1.0, '#9fcfc4', 7, 0.08], [0.75, '#7fb8a6', 19, 0.16], [0.5, '#5f9e84', 31, 0.28]].forEach(([k, col, seed, par], li) => {
      const off = pan * (0.3 + par) - zc * 2.5 * par, r = rng(seed), list = [];
      for (let i = 0; i < 24; i++) list.push([140 + r() * 180, 60 + r() * 60]);
      const i0 = Math.floor((-300 - off) / 150);
      for (let i = i0; i < i0 + Math.ceil((W + 600) / 150) + 1; i++) {
        const [h, w] = list[((i % 24) + 24) % 24], px = i * 150 + off, ph = h * k * (0.7 + 0.3 * k);
        g.fillStyle = col; g.beginPath(); g.moveTo(px - w, hz + 6);
        for (let j = 0; j <= 10; j++) { const u = j / 10; g.lineTo(px - w + 2 * w * u, hz + 6 - ph * Math.pow(Math.sin(Math.PI * u), 0.55)); }
        g.closePath(); g.fill();
        if (li === 0 && ((i % 7) + 7) % 7 === 3) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(px - 4, hz + 6 - ph * 0.85, 8, ph * 0.75); }
      }
      g.fillStyle = 'rgba(230,248,242,0.35)'; g.fillRect(0, hz - 20 - li * 30, W, 26);   // mist between the layers
    });
    const r = rng(77);                                             // parrots
    for (let k = 0; k < 5; k++) {
      const sp = 60 + r() * 50, x = ((r() * W + t * sp + pan * 0.2) % (W + 200) + W + 200) % (W + 200) - 100, y = hz - 180 - r() * 220 + Math.sin(t * 2 + k) * 12;
      const up = Math.floor(t * 8 + k) % 2, col = ['#e8413a', '#2fb06a', '#2f86c8'][k % 3];
      g.fillStyle = col; g.fillRect(x, y, 14, 6); g.fillRect(x + 12, y - 2, 6, 6);
      g.fillRect(x + 2, up ? y - 8 : y + 6, 8, 4); g.fillStyle = '#ffd23f'; g.fillRect(x + 18, y, 3, 3);
    }
  }
  // looking straight down the sheer fall: the jungle far below, a sea of treetops that rushes up at her (flat discs,
  // drawn straight onto the screen behind everything else; the river and the pool are drawn over them)
  const BELOW = (() => {
    const r = rng(4242), list = [];
    for (let gz = SHEER[0] - 80; gz < SHEER_END + 320; gz += 18) for (let gx = -300; gx <= 300; gx += 18) {
      const z = gz + r() * 14, x = gx + r() * 14;
      if (z < SHEER_END + 4 && Math.abs(x) < 16) continue;         // under the cliff
      if (z > SHEER_END && Math.abs(x) < 11) continue;            // the river
      list.push({ z, x, rad: 7 + r() * 6, c: (r() * 3) | 0, up: r() * 3 });
    }
    return list;
  })();
  function canopyBelow(D, R) {
    const g = D.ctx, Y = course.height(SHEER_END) + 5;
    for (const b of BELOW) {
      const q = D.toCam(R.cam, [R.wx(b.z, b.x), Y + b.up, b.z]);
      if (q[2] < 2) continue;
      const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * b.rad;
      if (sx < -rr || sx > D.W + rr || sy < -rr || sy > D.H + rr) continue;
      const col = LEAF[b.c];
      g.fillStyle = col[0]; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
      g.fillStyle = col[1]; g.beginPath(); g.arc(sx - rr * 0.2, sy - rr * 0.2, rr * 0.6, 0, 7); g.fill();
    }
    D.rect(0, 0, D.W, D.H, '#e6f6f2', 0.12);                       // a little haze over it, far below
  }
  function rainbow(D, g, hz, pan, a) {
    const cx = D.W * 0.55 + pan * 0.1, cy = hz + 60, r0 = Math.min(D.W, 1600) * 0.42;
    ['#ff5a5a', '#ffa33a', '#ffe14a', '#5fd36a', '#4aa8ff', '#9a6aff'].forEach((col, k) => {
      g.strokeStyle = col; g.globalAlpha = 0.32 * a; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, r0 - k * 18, Math.PI, 2 * Math.PI); g.stroke();
    });
    g.globalAlpha = 1;
  }

  // obstacles
  function foamRing(D, R, z, x, w) {                             // white water round something standing in the river
    const q = D.toCam(R.cam, R.S3(z, x, 0.02));
    if (q[2] < 0.6) return;
    const [sx, sy] = D.scr(R.cam, q), k = R.cam.F / q[2], g = D.ctx, wob = 1 + 0.08 * Math.sin(R.t * 9 + z);
    g.save(); g.globalAlpha *= 0.75; g.fillStyle = C.foam; g.beginPath(); g.ellipse(sx, sy, w * k * wob, w * k * 0.22 * wob, 0, 0, 7); g.fill(); g.restore();
  }
  function croc(D, R, o, i) {                                     // side on, jaws snapping; it sinks and comes back up (dive) or swims (swim)
    const x = obX(o, R.rt), up = obUp(o, R.rt), q = D.toCam(R.cam, R.S3(o.z, x, 0));
    if (q[2] < 0.6) return;
    const [sx, sy] = D.scr(R.cam, q), k = R.cam.F / q[2], cs = 0.13 * k, g = D.ctx;
    const dir = o.move ? Math.sign(Math.cos(o.move.w * R.rt + o.move.ph)) || 1 : (i % 2 ? 1 : -1);
    if (up < 0.98) {                                               // ripples where it went down; bubbles before it comes up
      const u = obUp(o, R.rt - 0.3) < up || up > 0 ? 1 : 0.5;
      g.save(); g.strokeStyle = C.foam; g.globalAlpha *= 0.7; g.lineWidth = Math.max(2, cs * 0.8);
      for (let j = 0; j < 2; j++) { const s = ((R.rt * 1.2 + j / 2) % 1); g.beginPath(); g.ellipse(sx, sy, (8 + s * 10) * cs, (8 + s * 10) * cs * 0.22, 0, 0, 7); g.stroke(); }
      g.restore();
      if (u === 1 && up < 0.5) for (let j = 0; j < 4; j++) { const bx = sx + Math.sin(R.rt * 7 + j * 2) * 6 * cs, by = sy - ((R.rt * 2 + j / 4) % 1) * 5 * cs; D.rect(bx - cs, by - cs, cs * 2, cs * 2, '#ffffff', 0.85); }
    }
    if (up <= 0.02) return;
    const rows = PIX.croc[Math.floor(R.rt * 2.2 + o.z) % 2], n = Math.max(1, Math.round(rows.length * up));
    g.save(); g.translate(sx, sy); g.scale(dir, R.squash && R.squash.has(o) ? 0.4 : 1);   // (a crocodile bounced on lies flattened)
    D.pix(rows.slice(0, n), CROC_COLS, 0, 0, cs);
    g.restore();
    g.save(); g.globalAlpha *= 0.8; g.fillStyle = C.foam; g.beginPath(); g.ellipse(sx, sy, 12 * cs, 2.2 * cs, 0, 0, 7); g.fill(); g.restore();
    if (o.move && up > 0.5) { g.save(); g.strokeStyle = C.foam; g.lineWidth = Math.max(2, cs); g.globalAlpha *= 0.7; g.beginPath(); g.moveTo(sx - dir * 10 * cs, sy - cs); g.lineTo(sx - dir * 20 * cs, sy + 2 * cs); g.stroke(); g.restore(); }
  }
  function logObs(D, R, o) {                                      // a floating log across part of the river
    const { cam, P3 } = R, x0 = o.x - o.hw, x1 = o.x + o.hw, r = 0.38, bob = Math.sin(R.t * 2.5 + o.z) * 0.04;
    D.poly3(cam, [P3(o.z - r, x0, 0.05 + bob), P3(o.z - r, x1, 0.05 + bob), P3(o.z - r * 0.7, x1, r + bob), P3(o.z - r * 0.7, x0, r + bob)], '#6b4424');
    D.poly3(cam, [P3(o.z - r * 0.7, x0, r + bob), P3(o.z - r * 0.7, x1, r + bob), P3(o.z, x1, 2 * r - 0.02 + bob), P3(o.z, x0, 2 * r - 0.02 + bob)], '#8a5a2e');
    D.poly3(cam, [P3(o.z, x0, 2 * r - 0.02 + bob), P3(o.z, x1, 2 * r - 0.02 + bob), P3(o.z + r * 0.7, x1, r + bob), P3(o.z + r * 0.7, x0, r + bob)], '#a46e3a');
    for (const [xx, sd] of [[x0, -1], [x1, 1]]) {                  // cut ends: rings
      const p = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p.push(P3(o.z + Math.cos(a) * r * 0.9, xx, r + Math.sin(a) * r * 0.9 + bob)); }
      D.poly3(cam, p, '#d8a868', 1, [sd, 0, 0]);
    }
    if (R.near(o.z)) for (let x = x0 + 0.7; x < x1 - 0.4; x += 1.6) D.poly3(cam, [P3(o.z - r * 0.72, x, r * 0.7 + bob), P3(o.z - r * 0.72, x + 0.5, r * 0.7 + bob), P3(o.z - r * 0.5, x + 0.5, r * 1.3 + bob), P3(o.z - r * 0.5, x, r * 1.3 + bob)], '#4f9a42');   // moss
    D.poly3(cam, [P3(o.z - r - 0.3, x0 - 0.2, 0.02), P3(o.z - r - 0.3, x1 + 0.2, 0.02), P3(o.z - r, x1, 0.02), P3(o.z - r, x0, 0.02)], C.foam, 0.8);
  }
  function crouchMarks(D, R, o, cx) {                             // white down-chevrons: crouch here
    const a = o.y0 + 0.15, b = o.y1 - 0.25;
    D.poly3(R.cam, [R.P3(o.z - 0.05, cx - 0.42, b), R.P3(o.z - 0.05, cx + 0.42, b), R.P3(o.z - 0.05, cx, a)], '#ffffff');
  }
  function branchObs(D, R, o) {                                   // a big low branch right across, leaves on it, vines hanging
    const { cam, P3 } = R, x0 = o.x - o.hw - 1.2, x1 = o.x + o.hw + 1.2, y = o.y0 + 0.05, near = R.near(o.z);
    D.poly3(cam, [P3(o.z, x0, y), P3(o.z, x1, y + 0.3), P3(o.z, x1, y + 0.85), P3(o.z, x0, y + 0.6)], '#6b4a2e');
    D.poly3(cam, [P3(o.z - 0.01, x0, y + 0.45), P3(o.z - 0.01, x1, y + 0.7), P3(o.z - 0.01, x1, y + 0.85), P3(o.z - 0.01, x0, y + 0.6)], '#8a6440');
    for (let x = x0 + 0.8, k = 0; x < x1; x += 1.7, k++) {
      const yy = lerp(y + 0.6, y + 0.85, (x - x0) / (x1 - x0));
      D.poly3(cam, [P3(o.z - 0.02, x - 0.9, yy), P3(o.z - 0.02, x, yy + 0.9 + (k % 2) * 0.3), P3(o.z - 0.02, x + 0.9, yy), P3(o.z - 0.02, x, yy - 0.15)], k % 2 ? '#3a9a48' : '#2f8a3f');
      if (near && k % 2 === 0) D.poly3(cam, [P3(o.z - 0.03, x - 0.05, yy), P3(o.z - 0.03, x + 0.05, yy), P3(o.z - 0.03, x + 0.05, o.y0 + 0.1), P3(o.z - 0.03, x - 0.05, o.y0 + 0.1)], '#2f7a2f');
    }
    const m = Math.max(1, Math.floor(o.hw * 2 / 2.6));
    for (let k = 0; k < m; k++) crouchMarks(D, R, o, lerp(o.x - o.hw, o.x + o.hw, (k + 0.5) / m));
  }
  function vineArch(D, R, o) {                                    // a ruined stone arch over the aqueduct, a curtain of vines from it
    const { cam, P3 } = R, h = HW(o.z) + 0.15, top = o.y1 + 0.5;
    for (const sd of [-1, 1]) { const X = R.wx(o.z, sd * h), y = gy(o.z); D.box3(cam, X - 0.22, X + 0.22, y, y + top + 0.5, o.z - 0.25, o.z + 0.25, { side: C.stone, rear: C.stoneL, top: C.stoneL }); }
    D.poly3(cam, [P3(o.z - 0.25, -h - 0.4, top), P3(o.z - 0.25, h + 0.4, top), P3(o.z - 0.25, h + 0.4, top + 0.6), P3(o.z - 0.25, -h - 0.4, top + 0.6)], C.stone);
    for (let x = -h + 0.3, k = 0; x < h; x += 0.42, k++) {
      const sw = Math.sin(R.t * 2 + k) * 0.05, y0 = o.y0 + 0.08 + (k % 3) * 0.12;
      D.poly3(cam, [P3(o.z - 0.3, x - 0.06, top), P3(o.z - 0.3, x + 0.06, top), P3(o.z - 0.3, x + 0.06 + sw, y0), P3(o.z - 0.3, x - 0.06 + sw, y0)], k % 2 ? '#3a9a48' : '#2f8a3f');
      if (k % 2) D.poly3(cam, [P3(o.z - 0.32, x + sw, y0 + 0.4), P3(o.z - 0.32, x + 0.22 + sw, y0 + 0.2), P3(o.z - 0.32, x + sw, y0)], '#6cc266');
    }
    crouchMarks(D, R, o, 0);
  }
  function drips(D, R, o) {                                       // stalactites hanging down to crouch height
    const { cam, P3, t } = R;
    for (let x = o.x - o.hw + 0.4, k = 0; x < o.x + o.hw; x += 0.9, k++) {
      const y0 = o.y0 + 0.05 + (k % 3) * 0.25;
      D.poly3(cam, [P3(o.z, x - 0.4, CEIL), P3(o.z, x + 0.4, CEIL), P3(o.z, x, y0)], k % 2 ? '#7f7969' : '#6a6457');
      if (k % 4 === 1) { const u = (t * 1.5 + k * 0.3) % 1; D.poly3(cam, [P3(o.z - 0.01, x - 0.04, y0 - u * y0), P3(o.z - 0.01, x + 0.04, y0 - u * y0), P3(o.z - 0.01, x, y0 - u * y0 - 0.2)], '#bff2ff'); }
    }
    D.poly3(cam, [P3(o.z, o.x - o.hw, o.y0 + 1.5), P3(o.z, o.x + o.hw, o.y0 + 1.5), P3(o.z, o.x + o.hw, CEIL), P3(o.z, o.x - o.hw, CEIL)], '#5a5549');
    crouchMarks(D, R, o, -2.5); crouchMarks(D, R, o, 2.5);
  }

  // ---- the island fork: the island down the middle, the hollow log over the right way
  const MED = z => course.medianAt(z);
  function island(D, R, za, zb) {                                 // a low mound of rock and grass between the two ways
    const { cam, P3 } = R, ma = MED(za), mb = MED(zb);
    if (ma < 0.05 && mb < 0.05) return;
    D.poly3(cam, [P3(za, -ma - 0.3, 0.02), P3(za, -ma * 0.5, 0.7), P3(zb, -mb * 0.5, 0.7), P3(zb, -mb - 0.3, 0.02)], C.bank.in);
    D.poly3(cam, [P3(za, ma * 0.5, 0.7), P3(za, ma + 0.3, 0.02), P3(zb, mb + 0.3, 0.02), P3(zb, mb * 0.5, 0.7)], C.bank.in);
    D.poly3(cam, [P3(za, -ma * 0.5, 0.7), P3(za, ma * 0.5, 0.7), P3(zb, mb * 0.5, 0.7), P3(zb, -mb * 0.5, 0.7)], C.bank.top);
    for (const sd of [-1, 1]) D.poly3(cam, [P3(za, sd * (ma + 0.3), 0.012), P3(zb, sd * (mb + 0.3), 0.012), P3(zb, sd * (mb + 0.6), 0.015), P3(za, sd * (ma + 0.6), 0.015)], C.foam, 0.8);
  }
  const LOGA = z => { const m = MED(z), h = HW(z); return { xc: (m + h) / 2, a: (h - m) / 2 + 0.7, H: 6.2 }; };   // the log's hollow: an arch over the right way
  function hollowLog(D, R, za, zb, near) {
    const a0 = Math.max(za, LOG[0]), b0 = Math.min(zb, LOG[1]);
    if (b0 <= a0) return;
    const { cam, P3 } = R, n = 8, pt = (z, u, grow = 0) => { const L = LOGA(z); return P3(z, L.xc - (L.a + grow) * Math.cos(u), (L.H + grow) * Math.sin(u)); };
    for (let j = 0; j < n; j++) {
      const u0 = Math.PI * j / n, u1 = Math.PI * (j + 1) / n;
      D.poly3(cam, [pt(a0, u0), pt(a0, u1), pt(b0, u1), pt(b0, u0)], j % 2 ? '#5e4128' : '#6b4a2e');
    }
    if (near) {                                                   // knotholes letting the daylight in, moss in the seams
      const r = rng(Math.floor(a0 * 3) + 9);
      if (r() < 0.5) { const z = lerp(a0, b0, r()), u = 0.6 + r() * 1.9; D.poly3(cam, [pt(z - 0.3, u - 0.05, -0.02), pt(z - 0.3, u + 0.08, -0.02), pt(z + 0.3, u + 0.08, -0.02), pt(z + 0.3, u - 0.05, -0.02)], '#fff4c0', 0.85); }
      D.poly3(cam, [pt(a0, 1.45, -0.02), pt(a0, 1.7, -0.02), pt(b0, 1.7, -0.02), pt(b0, 1.45, -0.02)], '#4f9a42', 0.8);
    }
    for (const [e, dir] of [[LOG[0], -1], [LOG[1], 1]]) if (e >= za && e < zb) {   // its cut ends: rings of pale wood
      for (let j = 0; j < n; j++) { const u0 = Math.PI * j / n, u1 = Math.PI * (j + 1) / n; D.poly3(cam, [pt(e, u0), pt(e, u1), pt(e, u1, 0.9), pt(e, u0, 0.9)], j % 2 ? '#d8a868' : '#c8965a', 1, [0, 0, dir]); }
      for (let j = 0; j < n; j++) { const u0 = Math.PI * j / n, u1 = Math.PI * (j + 1) / n; D.poly3(cam, [pt(e + dir * 0.01, u0, 0.4), pt(e + dir * 0.01, u1, 0.4), pt(e + dir * 0.01, u1, 0.5), pt(e + dir * 0.01, u0, 0.5)], '#a8743e', 1, [0, 0, dir]); }
    }
  }
  // ---- the temple: a channel of water through stone, carved walls, a low stone ceiling, torches; the floor falling
  // into pits on one way of its fork, a wall of pillars between the two ways
  const TCEIL = 8.6, inTemple = z => z >= TEMPLE[0] && z < TEMPLE[1];
  const PITS = course.obstacles.filter(o => o.k === 'pit');
  function templeSlice(D, R, za, zb, near) {
    const { cam, P3, t } = R, k = ((Math.floor(za / 4) % 2) + 2) % 2, W = HW(za) + 0.3, ma = MED(za), mb = MED(zb);
    const pits = PITS.filter(o => o.z + o.hd > za && o.z - o.hd < zb);
    D.poly3(cam, [P3(za, -W, 0.004), P3(za, W, 0.004), P3(zb, W, 0.004), P3(zb, -W, 0.004)], k ? '#6f6a5a' : '#67624f');   // stone flags
    D.poly3(cam, [P3(za, -W + 0.6, 0.006), P3(za, W - 0.6, 0.006), P3(zb, W - 0.6, 0.006), P3(zb, -W + 0.6, 0.006)], C.deep, 0.7);   // a film of water over them
    if (near) rapids(D, R, za, zb, 9);
    for (const o of pits) {                                        // a pit where the floor fell in: black, its rim broken
      const a = Math.max(za, o.z - o.hd), b = Math.min(zb, o.z + o.hd), x0 = o.x - o.hw, x1 = o.x + o.hw;
      if (b > a) D.poly3(cam, [P3(a, x0, 0.01), P3(a, x1, 0.01), P3(b, x1, 0.01), P3(b, x0, 0.01)], '#0e0d0a');
      for (const [e, dir] of [[o.z - o.hd, 1], [o.z + o.hd, -1]]) if (e >= za && e < zb) {
        D.poly3(cam, [P3(e, x0, 0.012), P3(e, x1, 0.012), P3(e + dir * 0.5, x1, 0.012), P3(e + dir * 0.5, x0, 0.012)], '#ffffff', 0.85);   // white water spilling in: jump here
        D.poly3(cam, [P3(e, x0, 0), P3(e, x1, 0), P3(e, x1, -3), P3(e, x0, -3)], '#2a2720', 1, [0, 0, -dir]);
      }
    }
    for (const sd of [-1, 1]) {                                    // the walls: carved bands, the foot wet
      const x = sd * W, n = [-sd, 0, 0];
      D.poly3(cam, [P3(za, x, 0), P3(zb, x, 0), P3(zb, x, TCEIL), P3(za, x, TCEIL)], k ? '#7f7969' : '#78725f', 1, n);
      D.poly3(cam, [P3(za, x - sd * 0.01, 3.4), P3(zb, x - sd * 0.01, 3.4), P3(zb, x - sd * 0.01, 4.1), P3(za, x - sd * 0.01, 4.1)], '#5a5546', 1, n);
      if (near && Math.floor(za / 2) % 2 === 0) D.poly3(cam, [P3(za + 0.4, x - sd * 0.02, 3.5), P3(za + 1.2, x - sd * 0.02, 3.5), P3(za + 1.2, x - sd * 0.02, 4.0), P3(za + 0.4, x - sd * 0.02, 4.0)], '#c8a830', 0.8, n);   // a glyph, gilded
      D.poly3(cam, [P3(za, x - sd * 0.01, 0), P3(zb, x - sd * 0.01, 0), P3(zb, x - sd * 0.01, 0.5), P3(za, x - sd * 0.01, 0.5)], '#4f9a42', 0.8, n);
    }
    D.poly3(cam, [P3(za, -W, TCEIL), P3(za, W, TCEIL), P3(zb, W, TCEIL), P3(zb, -W, TCEIL)], '#4a463a', 1, [0, -1, 0]);
    if (Math.floor(za / 12) !== Math.floor(zb / 12 - 1e-6)) {      // a torch on either wall every 12
      const z = Math.floor(zb / 12) * 12;
      for (const sd of [-1, 1]) { const X = R.wx(z, sd * (W - 0.15)), y = gy(z) + 3.2, fl = 0.85 + 0.15 * Math.sin(t * 21 + z + sd);
        D.poly3(cam, [[X - 0.12, y - 0.8, z], [X + 0.12, y - 0.8, z], [X + 0.12, y, z], [X - 0.12, y, z]], '#5a3a1a');
        D.poly3(cam, [[X - 0.3, y, z - 0.01], [X + 0.3, y, z - 0.01], [X, y + 1.0 * fl, z - 0.01]], '#ff8a1e');
        D.poly3(cam, [[X - 0.14, y + 0.02, z - 0.02], [X + 0.14, y + 0.02, z - 0.02], [X, y + 0.55 * fl, z - 0.02]], '#fff1a8'); }
    }
    if (ma > 0.05 || mb > 0.05) for (const sd of [-1, 1]) D.poly3(cam, [P3(za, sd * ma, 0), P3(zb, sd * mb, 0), P3(zb, sd * mb, TCEIL), P3(za, sd * ma, TCEIL)], k ? '#8a8472' : '#827c6a', 1, [sd, 0, 0]);   // the wall between the two ways
    for (const e of [TEMPLE[1]]) if (e >= za && e < zb && R.zc < e) {   // the far doorway, daylight beyond it
      for (const sd of [-1, 1]) D.poly3(cam, [P3(e, sd * W, -1), P3(e, sd * (W + 40), -1), P3(e, sd * (W + 40), 30), P3(e, sd * W, 30)], '#6a6556', 1, [0, 0, -1]);
      D.poly3(cam, [P3(e, -W, TCEIL), P3(e, W, TCEIL), P3(e, W, 30), P3(e, -W, 30)], '#6a6556', 1, [0, 0, -1]);
    }
  }
  function templeFace(D, R) {                                     // the temple's front: a great stone face the river runs into, by the mouth
    const { cam, P3, t } = R, z = TEMPLE[0], W = HW(z) + 0.3, H = 34, X = 70, n = [0, 0, -1];
    const q = (x, y) => P3(z, x, y);
    D.poly3(cam, [q(-X, -1), q(-W, -1), q(-W, H * 0.7), q(-X * 0.8, H * 0.55)], '#857f6b', 1, n);
    D.poly3(cam, [q(W, -1), q(X, -1), q(X * 0.8, H * 0.55), q(W, H * 0.7)], '#857f6b', 1, n);
    D.poly3(cam, [q(-W, TCEIL), q(W, TCEIL), q(W, H * 0.7), q(-W, H * 0.7)], '#857f6b', 1, n);
    D.poly3(cam, [q(-X * 0.8, H * 0.55), q(-W, H * 0.7), q(-W * 1.4, H), q(W * 1.4, H), q(W, H * 0.7), q(X * 0.8, H * 0.55), q(X * 0.5, H * 0.8), q(-X * 0.5, H * 0.8)], '#8f8975', 1, n);   // the brow and crown
    for (const sd of [-1, 1]) {                                    // eyes, glowing; cheeks
      D.poly3(cam, [q(sd * 6, 18), q(sd * 14, 18), q(sd * 13, 22), q(sd * 7, 22)], '#2a2720', 1, n);
      D.poly3(cam, [q(sd * 8.5, 19), q(sd * 11.5, 19), q(sd * 11, 21), q(sd * 9, 21)], '#7ff6e8', 0.6 + 0.3 * Math.sin(t * 3), n);
      D.poly3(cam, [q(sd * (W + 0.2), -1), q(sd * (W + 2), -1), q(sd * (W + 2), TCEIL + 1.2), q(sd * (W + 0.2), TCEIL + 1.2)], '#6f6a5a', 1, n);   // the lips
    }
    D.poly3(cam, [q(-2, 12), q(2, 12), q(1.2, 17), q(-1.2, 17)], '#7a745f', 1, n);   // the nose
    D.poly3(cam, [q(-W - 2, TCEIL + 1.2), q(W + 2, TCEIL + 1.2), q(W + 2, TCEIL + 2.4), q(-W - 2, TCEIL + 2.4)], '#6f6a5a', 1, n);
    for (let x = -X + 4, i = 0; x < X - 2; x += 6.5, i++) { const l = 5 + ((i * 37) % 11); D.poly3(cam, [q(x, H * 0.62), q(x + 0.6, H * 0.62), q(x + 0.4, H * 0.62 - l), q(x + 0.15, H * 0.62 - l)], '#3a7d35', 1, n); }   // vines hanging over it
    D.poly3(cam, [q(-X, H * 0.5), q(X, H * 0.5), q(X * 0.8, H * 0.58), q(-X * 0.8, H * 0.58)], '#4f9a42', 1, n);
  }
  // the boulder that breaks out behind her in the temple and rolls after her (a ball of carved stone, turning)
  const bGap = sz => lerp(12, 28, seg(sz, CHASE[1] - 16, CHASE[1] + 8));   // (close while the camera looks back at it; then she pulls away)
  function boulderChase(D, R) {
    const { cam, t } = R, sz = R.sz, rad = 4.3, z = sz - bGap(sz), p = R.P3(z, 0, rad), q = D.toCam(cam, p);
    if (q[2] < rad + 1.5) return;                                  // (never round the camera)
    const [sx, sy] = D.scr(cam, q), rr = cam.F / q[2] * rad, g = D.ctx, rot = z / rad;
    g.save();
    const gr = g.createRadialGradient(sx - rr * 0.35, sy - rr * 0.4, rr * 0.1, sx, sy, rr);
    gr.addColorStop(0, '#b4ad98'); gr.addColorStop(0.7, '#857f6b'); gr.addColorStop(1, '#5a5546');
    g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
    g.strokeStyle = '#4a463a'; g.lineWidth = Math.max(2, rr * 0.06);   // carved bands, turning as it rolls
    for (let k = 0; k < 3; k++) { const a = rot + k * 2.1, y = Math.sin(a) * rr * 0.85; if (Math.cos(a) < 0) continue; g.beginPath(); g.ellipse(sx, sy + y, rr * Math.sqrt(Math.max(0, 1 - (y / rr) ** 2)), rr * 0.12, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#4f9a42'; g.beginPath(); g.arc(sx + rr * 0.3, sy - rr * 0.55, rr * 0.25, 0, 7); g.fill();
    g.globalAlpha = 0.5; g.fillStyle = '#c8bfa8';                   // dust thrown up behind it
    for (let k = 0; k < 5; k++) { const ph = (t * 1.5 + k / 5) % 1; g.beginPath(); g.arc(sx + (k - 2) * rr * 0.5, sy + rr * (0.9 - ph * 0.6), rr * (0.2 + ph * 0.3), 0, 7); g.fill(); }
    g.restore();
  }
  // the vine: hung from a great branch over the ravine; she grabs it off the cliff's edge and swings across, letting
  // go at the top of the swing
  const VP = [VS + 4 + B_VINE.z * 0.45, 26];                       // its pivot: [z, height above the cliff]
  function vine(D, R) {
    const { cam, t } = R, top = [R.wx(VP[0], 0), gy(VS) + VP[1], VP[0]], rel = VS + 4 + B_VINE.z * 0.6;
    let end;
    if (R.sz < VS + 3.5 || R.sz > LANDV) end = [R.wx(VS + 1, 0), gy(VS) + 2.4, VS + 1];
    else if (R.sz < rel) end = [R.wx(R.sz, R.sx), R.sy + 1.7, R.sz];
    else { const u = seg(R.sz, rel, rel + 30), a = 0.6 * Math.cos(u * 6) * (1 - u); end = [top[0], top[1] - 18 * Math.cos(a), top[2] + 18 * Math.sin(a)]; }
    D.poly3(cam, [[top[0] - 0.08, top[1], top[2]], [top[0] + 0.08, top[1], top[2]], [end[0] + 0.08, end[1], end[2]], [end[0] - 0.08, end[1], end[2]]], '#3a7d35');
    for (let k = 1; k < 6; k++) { const p = [lerp(top[0], end[0], k / 6), lerp(top[1], end[1], k / 6), lerp(top[2], end[2], k / 6)]; D.poly3(cam, [[p[0], p[1], p[2] - 0.01], [p[0] + 0.5, p[1] + 0.2, p[2] - 0.01], [p[0] + 0.15, p[1] - 0.3, p[2] - 0.01]], k % 2 ? '#4fae3c' : '#3a9a48'); }
    const X = R.wx(VP[0], 0);                                      // the branch it hangs from, out of a giant tree on the far side
    D.poly3(cam, [[X - 22, top[1] - 0.6, VP[0] + 6], [X + 2, top[1] - 0.4, VP[0]], [X + 2, top[1] + 0.6, VP[0]], [X - 22, top[1] + 0.8, VP[0] + 6]], '#6b4a2e');
    D.poly3(cam, [[X - 24, gy(VP[0]) - 40, VP[0] + 7], [X - 19, gy(VP[0]) - 40, VP[0] + 7], [X - 20, top[1] + 4, VP[0] + 6], [X - 23, top[1] + 4, VP[0] + 6]], '#5e4128');
    canopy(D, cam, X - 21, top[1] + 6, VP[0] + 6, 7, ['#1d5c2f', '#2c7a37', '#3f9a48']);
  }
  // ---- obstacles of the fork and the temple
  const PIXJ = {
    shroom: { cs: 0.22, cols: { R: '#e8343a', W: '#ffffff', S: '#f2e6c8', D: '#c8b896' }, rows: [
      '...RRRRRR...', '.RRWWRRRRRR.', 'RRRWWRRRWWRR', 'RRRRRRRRWWRR', 'RWWRRRRRRRRR', '.RRRRRRRRRR.', '....SSSS....', '....SSSD....', '....SSSD....', '....SSSD....', '...SSSSDD...'] },
  };
  function rootObs(D, R, o) {                                      // a thick root arching across the hollow, low: duck
    const { cam, P3 } = R, x0 = o.x - o.hw, x1 = o.x + o.hw, y = o.y0 + 0.05;
    for (let j = 0; j < 6; j++) { const a = lerp(x0, x1, j / 6), b = lerp(x0, x1, (j + 1) / 6), wa = 0.15 * Math.sin(j * 1.7), wb = 0.15 * Math.sin((j + 1) * 1.7);
      D.poly3(cam, [P3(o.z, a, y + wa), P3(o.z, b, y + wb), P3(o.z, b, y + 0.7 + wb), P3(o.z, a, y + 0.7 + wa)], j % 2 ? '#7a5530' : '#6b4a2e'); }
    crouchMarks(D, R, o, o.x);
  }
  function crusherObs(D, R, o) {                                   // a block of carved stone slamming down, then lifted; its eyes glow red as it is about to fall
    const { cam, S3, P3 } = R, y = stampY(o, R.rt, R.sz), x0 = o.x - o.hw, x1 = o.x + o.hw, z0 = o.z - o.hd, z1 = o.z + o.hd, B = y, T = y + 2.6;
    const u = ((((o.stamp.w * R.rt + o.stamp.ph) / (2 * Math.PI)) % 1) + 1) % 1, warn = u > 0.33 && u < 0.5;
    D.poly3(cam, [S3(z0, x0, 0.015), S3(z0, x1, 0.015), S3(z1, x1, 0.015), S3(z1, x0, 0.015)], '#000000', 0.15 + 0.35 * (1 - y / o.stamp.top));   // its shadow
    D.poly3(cam, [P3(z0, x0, B), P3(z1, x0, B), P3(z1, x0, T), P3(z0, x0, T)], '#6f6a5a');
    D.poly3(cam, [P3(z0, x1, B), P3(z1, x1, B), P3(z1, x1, T), P3(z0, x1, T)], '#6f6a5a');
    D.poly3(cam, [P3(z0, x0, B), P3(z0, x1, B), P3(z0, x1, T), P3(z0, x0, T)], '#8f8975');
    D.poly3(cam, [P3(z0 - 0.01, x0 + 0.2, B + 0.3), P3(z0 - 0.01, x1 - 0.2, B + 0.3), P3(z0 - 0.01, x1 - 0.2, B + 0.6), P3(z0 - 0.01, x0 + 0.2, B + 0.6)], '#c8a830', 0.9);   // its teeth, gilded
    for (const sd of [-1, 1]) D.poly3(cam, [P3(z0 - 0.02, o.x + sd * o.hw * 0.4 - 0.3, B + 1.6), P3(z0 - 0.02, o.x + sd * o.hw * 0.4 + 0.3, B + 1.6), P3(z0 - 0.02, o.x + sd * o.hw * 0.4 + 0.3, B + 2.0), P3(z0 - 0.02, o.x + sd * o.hw * 0.4 - 0.3, B + 2.0)], warn ? '#ff3a2a' : '#2a2720');
    if (T < TCEIL) for (const sd of [-0.5, 0.5]) D.poly3(cam, [P3(o.z, o.x + sd * o.hw - 0.08, T), P3(o.z, o.x + sd * o.hw + 0.08, T), P3(o.z, o.x + sd * o.hw + 0.08, TCEIL), P3(o.z, o.x + sd * o.hw - 0.08, TCEIL)], '#3a3630');   // chains
  }
  function pillarObs(D, R, o) {                                     // a carved pillar: the end of the wall between the temple's two ways
    const { cam, P3 } = R, X = R.wx(o.z, o.x), y = gy(o.z), w = o.hw;
    D.box3(cam, X - w, X + w, y, y + TCEIL, o.z - o.hd, o.z + o.hd, { side: '#8a8472', rear: '#9a947f', top: '#9a947f' });
    for (const h of [1.5, 4.0, 6.5]) D.poly3(cam, [[X - w, y + h, o.z - o.hd - 0.02], [X + w, y + h, o.z - o.hd - 0.02], [X + w, y + h + 0.5, o.z - o.hd - 0.02], [X - w, y + h + 0.5, o.z - o.hd - 0.02]], '#c8a830', 0.85);
    void P3;
  }
  function dartsObs(D, R, o) {                                      // darts flying across from holes in the wall, head high: duck
    const { cam, P3, t } = R, x0 = o.x - o.hw, x1 = o.x + o.hw, y = o.y0 + 0.4;
    for (let k = 0; k < 4; k++) {
      const u = ((t * 1.6 + k / 4) % 1), x = lerp(x0, x1, u), yy = y + (k % 2) * 0.35;
      D.poly3(cam, [P3(o.z - 0.1 * k, x - 0.7, yy - 0.04), P3(o.z - 0.1 * k, x, yy - 0.04), P3(o.z - 0.1 * k, x, yy + 0.04), P3(o.z - 0.1 * k, x - 0.7, yy + 0.04)], '#6b4a2e');
      D.poly3(cam, [P3(o.z - 0.1 * k, x, yy - 0.12), P3(o.z - 0.1 * k, x + 0.25, yy), P3(o.z - 0.1 * k, x, yy + 0.12)], '#c8c8d0');
      D.poly3(cam, [P3(o.z - 0.1 * k, x - 0.75, yy - 0.12), P3(o.z - 0.1 * k, x - 0.6, yy), P3(o.z - 0.1 * k, x - 0.75, yy + 0.12)], '#e8343a');
    }
    D.poly3(cam, [P3(o.z, x0 - 0.02, y - 0.3), P3(o.z + 0.4, x0 - 0.02, y - 0.3), P3(o.z + 0.4, x0 - 0.02, y + 0.7), P3(o.z, x0 - 0.02, y + 0.7)], '#1a1814');   // the holes they come from
    D.poly3(cam, [P3(o.z - 0.05, x0, y + 0.1), P3(o.z - 0.05, x1, y + 0.1), P3(o.z - 0.05, x1, y + 0.16), P3(o.z - 0.05, x0, y + 0.16)], '#ff5a3a', 0.6);   // the line they fly along, lit
    crouchMarks(D, R, o, o.x);
  }
  function spikesObs(D, R, o) {                                     // a spiked roller of wood and iron, rolling to and fro: hop it
    const { cam, S3, t } = R, x = obX(o, R.rt), w = o.hw, r = 0.42;
    D.poly3(cam, [S3(o.z - r, x - w, 0.05), S3(o.z - r, x + w, 0.05), S3(o.z, x + w, 2 * r), S3(o.z, x - w, 2 * r)], '#8a5a2e');
    D.poly3(cam, [S3(o.z, x - w, 2 * r), S3(o.z, x + w, 2 * r), S3(o.z + r, x + w, 0.05), S3(o.z + r, x - w, 0.05)], '#6b4424');
    for (let k = 0; k < 5; k++) { const xx = lerp(x - w + 0.15, x + w - 0.15, k / 4), a = t * 6 + k; D.poly3(cam, [S3(o.z - r * 0.6, xx - 0.12, r), S3(o.z - r * 0.6, xx + 0.12, r), S3(o.z - r - 0.3, xx, r + 0.35 * Math.cos(a))], '#e8e8f0'); }
    foamRing(D, R, o.z, x, 1.1);
  }

  const theme = {
    spray: ['#ffffff', '#c8f2ff', '#8fe0f5'], trail: '#c8f4fb', ski: ['#ffd23f', '#fff1a0', '#e0a800'],
    flow: { lane: '#a6fbff', edge: '#ffffff', mark: '#ffffff' },
    kicker: { side: '#7d7466', top: '#8a8170', edge: '#ffe14a' }, boost: { pad: '#ffb020', glow: '#ffe28a', arrow: '#ffffff' },
    ramp(R, r) {                                                  // the cliff's edge she swings off: a lip of stone, no kicker
      if (r.k !== 'vine') return false;
      const D = root.SkiDraw, { cam, P3 } = R, z = r.z + r.len, h = HW(z) + 0.3;
      D.poly3(cam, [P3(z, -h, 0), P3(z, h, 0), P3(z, h, -20), P3(z, -h, -20)], '#6f6a5a', 1, [0, 0, -1]);
      D.poly3(cam, [P3(z - 0.6, -h, 0.02), P3(z - 0.6, h, 0.02), P3(z, h, 0.02), P3(z, -h, 0.02)], '#ffe14a', 0.8);
      return true;
    },
    // a bright humid sky, a soft sun, misty limestone peaks; a rainbow over the lagoon
    sky(R) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R;
      theme.camZ = zc;
      const bands = ['#4fb3e8', '#5fbbea', '#73c4ea', '#89cdea', '#a2d8ea', '#bde3ea', '#d5ede8', '#e4f4ea'];
      const bh = Math.max(40, hz + 10) / bands.length;
      bands.forEach((col, k) => D.rect(0, k * bh, W, bh + 1, col));
      const sx = W * 0.22 + pan * 0.05, sy = hz - 380;
      g.fillStyle = 'rgba(255,250,210,0.35)'; g.beginPath(); g.arc(sx, sy, 140, 0, 7); g.fill();
      g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(sx, sy, 80, 0, 7); g.fill();
      D.clouds(t, 61, Math.round(3 * W / 1920) + 1, Math.max(40, hz - 420), 0.85, pan * 0.2);
      const rb = seg(zc, CAVE[1] - 10, CAVE[1] + 20) * (1 - seg(zc, LAGOON + 150, LAGOON + 260));
      if (rb > 0) rainbow(D, g, hz, pan, rb);
      const top = Math.max(0, hz + 4);                             // (looking straight down a fall the horizon is far above the screen)
      D.rect(0, top, W, H - top + 1, '#2d6e3e');
      if (hz > -200) horizon(D, g, hz, pan, zc, W, t);
      else canopyBelow(D, R);
    },
    ground(R, za, zb, near) { if (R.cam.pitch < 0.9) gorge(root.SkiDraw, R, za, zb, near); },   // (down the sheer fall the gorge is behind its rock)
    // one slice: the river between rock banks with the jungle floor beyond (a waterfall's face, the aqueduct or the
    // cave where those are)
    slice(R, za, zb, near) {
      const D = root.SkiDraw;
      const cuts = [za, zb]; for (const z of [AQ[0], AQ[1], CAVE[0], CAVE[1], TEMPLE[0], TEMPLE[1]]) if (z > za && z < zb) cuts.splice(cuts.length - 1, 0, z);
      cuts.sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2;
        if (inAQ(m)) aqueduct(D, R, a, b, near);
        else if (inTemple(m)) templeSlice(D, R, a, b, near);
        else if (inCave(m)) { river(D, R, a, b, near, true); cave(D, R, a, b, near); }
        else river(D, R, a, b, near, false);
      }
      if (za <= CAVE[1] && zb > CAVE[1] && R.zc > CAVE[0]) caveExit(D, R);
      if (za < ISLE[1] && zb > ISLE[0]) { island(D, R, za, zb); hollowLog(D, R, za, zb, near); }
    },
    // trees, palms, banana plants, bamboo, ferns, flowers, boulders, stone heads, ruins; huts and torches by the
    // lagoon; the cliff with the cave; mist where the falls come down
    scenery(R) {
      const D = root.SkiDraw, { cam, lo, hi, zc, wx, t } = R;
      // looking down the sheer fall only treetops are seen (a tree stood up on the ground is a long streak from above);
      // as the camera tilts back up at its foot they fade into the trees, not swapped in a frame (trees sprang up)
      const topK = smooth(seg(R.cam.pitch, 0.8, 1.1)), faded = (k, fn) => () => { const g = D.ctx, a = g.globalAlpha; g.globalAlpha = a * k; try { fn(); } finally { g.globalAlpha = a; } };
      if (topK > 0) for (const tp of SCENE.tops) if (tp.z > lo && tp.z < hi) R.add(tp.z, topK < 1 ? faded(topK, () => treetop(D, R, tp)) : () => treetop(D, R, tp));
      if (topK >= 1) return;
      const add = topK > 0 ? (z, fn, ...more) => R.add(z, faded(1 - topK, fn), ...more) : R.add;
      // the other mascots cheering on bamboo decks either side of the finish
      if (R.zc > FINISH - 160) root.SkiWorld.crowd(R, { z0: FINISH - 50, z1: FINISH + 25, stand: { top: '#c8a060', top2: '#b08850', face: '#7a5a30' } });
      const inside = inCave(zc), hidden = z => (inside && z < CAVE[1] + 2) || (!inside && zc < CAVE[0] && z > CAVE[0] && z < CAVE[1] + 3) || (inTemple(zc) && z < TEMPLE[1]) || (zc < TEMPLE[0] && z > TEMPLE[0] && z < TEMPLE[1] + 3);
      const ok = (z, d = 110) => z > lo && z < hi && Math.abs(z - zc) < d && !hidden(z);
      if (zc < CAVE[0] && CAVE[0] < hi) add(CAVE[0] - 0.05, () => cliff(D, R));
      if (zc < TEMPLE[0] && TEMPLE[0] < hi) add(TEMPLE[0] - 0.05, () => templeFace(D, R));
      if (R.sz >= CHASE[0] && R.sz < TEMPLE[1]) add(R.sz - bGap(R.sz), () => boulderChase(D, R));
      if (zc > VS - 125 && zc < LANDV + 30) add(VP[0], () => vine(D, R));
      for (const tr of SCENE.trees) if (ok(tr.z, 112)) add(tr.z, () => tree(D, R, tr, Math.abs(tr.z - zc) > 40));
      for (const p of SCENE.palms) if (ok(p.z, 100)) add(p.z, () => palm(D, cam, wx(p.z, p.x), p.z, gy(p.z), p.h, p.lean, Math.abs(p.z - zc) > 45));
      for (const b of SCENE.bananas) if (ok(b.z, 70)) add(b.z, () => banana(D, cam, wx(b.z, b.x), b.z, gy(b.z), b.s));
      for (const b of SCENE.bamboo) if (ok(b.z, 100)) add(b.z, () => bambooClump(D, cam, wx(b.z, b.x), b.z, gy(b.z), b, Math.abs(b.z - zc) > 45));
      for (const f of SCENE.ferns) if (ok(f.z, 45)) add(f.z, () => fern(D, cam, wx(f.z, f.x), f.z, gy(f.z), f.s));
      for (const b of SCENE.boulders) if (ok(b.z, 70)) add(b.z, () => boulder(D, cam, wx(b.z, b.x), b.z, gy(b.z), b.s));
      for (const f of SCENE.flowers) if (ok(f.z, 35)) add(f.z, () => R.billboard(f.c ? PIX.flower : { ...PIX.flower, cols: { ...PIX.flower.cols, R: '#ffb43a', Y: '#ffffff' } }, f.z, f.x, 0));
      for (const h of SCENE.heads) if (ok(h.z)) add(h.z, () => { stoneHead(D, cam, wx(h.z, h.x), h.z, gy(h.z), h.h); if (Math.abs(h.z - zc) < 50) R.billboard(PIX.toucan, h.z - 0.5, h.x + 0.6, h.h); });
      for (const r of SCENE.ruins) if (ok(r.z)) r.cols.forEach(c => add(r.z + c.dz, () => column(D, cam, wx(r.z + c.dz, r.x), r.z + c.dz, gy(r.z + c.dz), c.h)));
      for (const h of SCENE.huts) if (ok(h.z)) add(h.z, () => hut(D, cam, wx(h.z, h.x), h.z, gy(h.z)));
      for (const c of SCENE.canoes) if (ok(c.z, 70)) add(c.z, () => canoe(D, cam, wx(c.z, c.x), c.z, gy(c.z)));
      for (const tc of SCENE.torches) if (ok(tc.z, 70)) add(tc.z, () => torch(D, cam, wx(tc.z, tc.x), tc.z, gy(tc.z), t));
      if (zc > AQ[0] - 60 && zc < AQ[1]) for (let k = 0; k < 10; k++) {   // clouds drifting below the aqueduct
        const z = AQ[0] + 10 + k * 21, x = ((k * 37) % 2 ? 1 : -1) * (10 + (k * 53) % 30) + Math.sin(t * 0.2 + k) * 4;
        if (!ok(z, 125)) continue;
        add(z, () => {
          const q = D.toCam(cam, R.P3(z, x, -14 - (k % 3) * 6));
          if (q[2] < 1) return;
          const [sx, sy] = D.scr(cam, q), s = cam.F / q[2] * 9, g = D.ctx;
          g.save(); g.globalAlpha *= 0.55; g.fillStyle = '#ffffff';
          for (const [dx, dy, rr] of [[0, 0, 1], [-0.9, 0.15, 0.7], [0.9, 0.1, 0.75], [0.3, -0.35, 0.6]]) { g.beginPath(); g.ellipse(sx + dx * s, sy + dy * s, rr * s, rr * s * 0.45, 0, 0, 7); g.fill(); }
          g.restore();
        });
      }
      if (ok(BIG[0] + 14, 125) && zc < BIG[0]) for (let k = 0; k < 5; k++) add(BIG[0] + 12 + k * 4, () => {   // spray rising past the brink of the giant fall
        const q = D.toCam(cam, R.P3(BIG[0] + 12 + k * 4, (k - 2) * 7, -6 + (k % 2) * 4 + Math.sin(t * 1.5 + k) * 1.5));
        if (q[2] < 1) return;
        const [sx, sy] = D.scr(cam, q), s = cam.F / q[2] * 8, g = D.ctx;
        g.save(); g.globalAlpha *= 0.45; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(sx, sy, s, s * 0.7, 0, 0, 7); g.fill(); g.restore();
      });
      for (const f of ALLF) {                                      // spray rising where each fall lands
        const zb = face(f)[1] + 2;
        if (!ok(zb, 120)) continue;
        for (let k = 0; k < (huge(f) ? 7 : 3); k++) add(zb + k * 1.5, () => {
          const q = D.toCam(cam, R.S3(zb + k * 1.5, (k % 3 - 1) * (f === BIG ? 9 : 4), 1.5 + (k % 2) * 2));
          if (q[2] < 1) return;
          const [sx, sy] = D.scr(cam, q), s = cam.F / q[2] * (huge(f) ? 7 : 3.5) * (1 + 0.1 * Math.sin(t * 3 + k)), g = D.ctx;
          g.save(); g.globalAlpha *= 0.32; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(sx, sy, s, s * 0.6, 0, 0, 7); g.fill(); g.restore();
        });
      }
    },
    // bamboo arches with a leafy banner (none on the aqueduct, in the cave or at a waterfall); START and GOAL in orange
    gate(R, z, i, label) {
      if (!label && (inAQ(z) || (z > TEMPLE[0] - 8 && z < LANDV + 6) || MED(z) > 0 || z > AQ[0] - 30 && z < AQ[1] + 8 || z > CAVE[0] - 8 && z < BIG[0] + 4 || ALLF.some(f => z > f[0] - 6 && z < face(f)[1] + 4))) return;
      const D = root.SkiDraw, { cam, P3, wx } = R, h = gy(z), x = HW(z) + BANK[0] + 0.6, y = BANK[1];
      const col = label ? D.C.orange : i % 2 ? '#19a39a' : '#f08a24', y0 = y + (label ? 5.6 : 5.4), y1 = y + (label ? 7.1 : 6.5);
      for (const gx of [-x, x]) {
        const X = wx(z, gx);
        D.box3(cam, X - 0.2, X + 0.2, h + y - 0.3, h + y1 + 0.8, z - 0.2, z + 0.2, { side: '#7cbf3f', rear: '#8fd04a', top: '#a6e060' });
        for (let k = 1; k < 4; k++) D.poly3(cam, [[X - 0.22, h + y + k * 1.8, z - 0.21], [X + 0.22, h + y + k * 1.8, z - 0.21], [X + 0.22, h + y + k * 1.8 + 0.12, z - 0.21], [X - 0.22, h + y + k * 1.8 + 0.12, z - 0.21]], '#4f8a2a');
      }
      D.poly3(cam, [P3(z, -x - 0.6, y1 + 0.2), P3(z, x + 0.6, y1 + 0.2), P3(z, x + 0.6, y1 + 0.55), P3(z, -x - 0.6, y1 + 0.55)], '#8fd04a');
      const f = D.poly3(cam, [P3(z, -x + 0.4, y0), P3(z, x - 0.4, y0), P3(z, x - 0.4, y1), P3(z, -x + 0.4, y1)], col);
      for (let gx = -x + 0.8, k = 0; gx < x - 0.6; gx += 1.3, k++) D.poly3(cam, [P3(z - 0.01, gx - 0.35, y0 + 0.05), P3(z - 0.01, gx + 0.35, y0 + 0.05), P3(z - 0.01, gx, y0 - 0.55 - (k % 2) * 0.2)], k % 2 ? '#3a9a48' : '#56b25a');
      if (f && label) {
        const q = D.toCam(cam, P3(z, 0, (y0 + y1) / 2));
        if (q[2] > 1) { const [sx, sy] = D.scr(cam, q), s2 = cam.F / q[2]; D.txt(label, sx, sy + s2 * 0.42, { size: Math.round(s2 * 1.15), color: '#ffffff', align: 'center', ls: Math.round(s2 * 0.1) }); }
      }
    },
    obstacle(R, o, i) {
      const D = root.SkiDraw;
      if (o.k === 'croc' || o.k === 'swim' || o.k === 'crocback') croc(D, R, o, i);
      else if (o.k === 'isle') { foamRing(D, R, o.z, o.x, 2); R.billboard({ ...PIX.rock, cs: PIX.rock.cs * 1.6 }, o.z, o.x, -0.1); }
      else if (o.k === 'root') rootObs(D, R, o);
      else if (o.k === 'shroom') { foamRing(D, R, o.z, o.x, 1.1); R.billboard(PIXJ.shroom, o.z, o.x, -0.05); }
      else if (o.k === 'crusher') crusherObs(D, R, o);
      else if (o.k === 'pillar') pillarObs(D, R, o);
      else if (o.k === 'darts') dartsObs(D, R, o);
      else if (o.k === 'spikes') spikesObs(D, R, o);
      else if (o.k === 'log') logObs(D, R, o);
      else if (o.k === 'branch') branchObs(D, R, o);
      else if (o.k === 'vine') vineArch(D, R, o);
      else if (o.k === 'drip') drips(D, R, o);
      else if (o.k === 'rock') { foamRing(D, R, o.z, o.x, 1.3); R.billboard(PIX.rock, o.z, o.x, -0.1); }
      else if (o.k === 'stalag') { foamRing(D, R, o.z, o.x, 1.1); R.billboard(PIX.stalag, o.z, o.x, -0.1); }
    },
    // the cave: dark round the edges with a cool tint; where a fall comes down, a fine spray; elsewhere pollen drifting
    weather({ t }) {
      const D = root.SkiDraw, W = D.W, H = D.H, g = D.ctx, z = theme.camZ;
      if (inCave(z) || inTemple(z)) {                              // (in the temple too: torchlit, dark at the edges)
        const k = inTemple(z) ? Math.min(seg(z, TEMPLE[0], TEMPLE[0] + 6), 1 - seg(z, TEMPLE[1] - 8, TEMPLE[1])) : Math.min(seg(z, CAVE[0], CAVE[0] + 6), 1 - seg(z, CAVE[1] - 8, CAVE[1]));
        const gr = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.2, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(10,30,40,0)'); gr.addColorStop(1, `rgba(10,30,40,${0.72 * k})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        return;
      }
      const mist = Math.max(0, ...ALLF.map(f => { const b = face(f)[1]; return seg(z, f[0] - 10, b) * (1 - seg(z, b + 10, b + (huge(f) ? 60 : 25))) * (huge(f) ? 1 : 0.6); }));
      if (mist > 0) D.rect(0, 0, W, H, '#ffffff', 0.16 * mist);
      const r = rng(Math.floor(t * 4) * 0 + 5);
      g.fillStyle = mist > 0.1 ? '#ffffff' : '#fff6c0';
      for (let k = 0; k < 14 + 30 * mist; k++) {
        const sp = 20 + r() * 40, x = ((r() * W + Math.sin(t * 0.7 + k) * 40) % W + W) % W, y = ((r() * H + t * sp * (mist > 0.1 ? 8 : 1)) % H + H) % H, s = mist > 0.1 ? 5 : 4;
        g.globalAlpha = 0.35 + 0.3 * mist; g.fillRect(x, y, s, s);
      }
      g.globalAlpha = 1;
    },
    // map-screen thumbnail: sky, karst peaks, a waterfall into the river, jungle either side
    badge(g, x, y, w, h) {
      const Rr = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a * w, y + b * h, c * w, d * h); };
      Rr(0, 0, 1, 0.55, '#73c4ea'); Rr(0, 0.42, 1, 0.13, '#d5ede8');
      g.fillStyle = '#7fb8a6'; g.beginPath(); g.moveTo(x, y + 0.55 * h); g.quadraticCurveTo(x + 0.15 * w, y + 0.05 * h, x + 0.3 * w, y + 0.55 * h); g.quadraticCurveTo(x + 0.5 * w, y + 0.1 * h, x + 0.7 * w, y + 0.55 * h); g.fill();
      Rr(0, 0.55, 1, 0.45, '#2f7d3a');
      Rr(0.42, 0.2, 0.16, 0.42, '#7d7466'); Rr(0.46, 0.2, 0.08, 0.5, '#bdf0fb');
      g.fillStyle = '#2aa1b4'; g.beginPath(); g.moveTo(x + 0.44 * w, y + 0.66 * h); g.lineTo(x + 0.56 * w, y + 0.66 * h); g.lineTo(x + 0.75 * w, y + h); g.lineTo(x + 0.25 * w, y + h); g.fill();
      Rr(0.43, 0.64, 0.14, 0.04, '#ffffff');
      g.fillStyle = '#1f6a33'; for (const [cx, cy, r] of [[0.1, 0.62, 0.12], [0.25, 0.7, 0.1], [0.85, 0.6, 0.13], [0.95, 0.75, 0.1]]) { g.beginPath(); g.arc(x + cx * w, y + cy * h, r * h, 0, 7); g.fill(); }
      g.fillStyle = '#3f8f3a'; g.fillRect(x + 0.62 * w, y + 0.86 * h, 0.14 * w, 0.04 * h); g.fillStyle = '#ffe14a'; g.fillRect(x + 0.73 * w, y + 0.85 * h, 0.015 * w, 0.015 * h);
    },
  };
  // the river between its banks over [za, zb] (inside the cave: just the water, the cave draws the rest)
  function river(D, R, za, zb, near, inCaveNow) {
    const { cam, P3 } = R, k = ((Math.floor(za / 8) % 2) + 2) % 2, f = onFace(za, zb), lag = za >= LAGOON, ledge = za >= CAVE[1] && za < BIG[0];
    const sw = f === SHEER ? HW(za) + 9 : SKW;                    // the cliff the sheer fall runs down is narrow: the jungle far below shows round it
    if (!inCaveNow) D.poly3(cam, [P3(za, -sw), P3(za, sw), P3(zb, sw), P3(zb, -sw)], f ? C.rock[k] : ledge ? C.ledge[k] : lag ? C.floor[k] : C.floor[k]);
    if (lag && !inCaveNow) for (const sd of [-1, 1]) { const q = (z, x) => P3(z, sd * (HW(z) + x), 0.004); D.poly3(cam, [q(za, 1), q(zb, 1), q(zb, 7), q(za, 7)], C.sand[k]); }   // beach
    const ha = HW(za), hb = HW(zb);
    D.poly3(cam, [P3(za, -ha, 0.005), P3(za, ha, 0.005), P3(zb, hb, 0.005), P3(zb, -hb, 0.005)], inCaveNow ? C.deep : C.river[k]);
    if (f) fallFace(D, R, f, za, zb, near);
    for (const fl of ALLF) if (fl[0] - 2.5 < zb && fl[0] > za) {    // white water breaking over each lip
      const a = Math.max(za, fl[0] - 2.5), b = Math.min(zb, fl[0] + 0.4), w = HW(fl[0]) + (fl === BIG ? 12 : 0), bob = 0.03 * Math.sin(R.t * 8);
      D.poly3(cam, [P3(a, -w, 0.02), P3(a, w, 0.02), P3(b, w, 0.02 + bob), P3(b, -w, 0.02 + bob)], C.foam, 0.75);
    }
    if (near && !f) rapids(D, R, za, zb, inCaveNow ? 9 : 12);
    for (const fl of ALLF) {                                      // white water churning where each fall lands
      const p = { z: face(fl)[1], len: huge(fl) ? 26 : 14, x: 0, hw: HW(face(fl)[1]) - 0.2 };
      if (p.z < zb && p.z + p.len > za) { oval(D, R, p, za, zb, 1, 0, C.foam, 0.008, 0.55); if (near) oval(D, R, p, za, zb, 0.7 + 0.15 * Math.sin(R.t * 4), 0.6 + 0.15 * Math.sin(R.t * 4), '#ffffff', 0.01, 0.8); }
    }
    if (f === SHEER) sheerWalls(D, R, za, zb, near);
    else if (!inCaveNow && !(f === BIG)) banks(D, R, za, zb, near, lag ? C.sbank : C.bank);
    if (!inCaveNow && !f && !ledge && !(za >= AQ[1] && za < SHEER[0]) && R.cam.pitch < 0.9) jungleWalls(D, R, za, zb, lag);   // (from straight above they would only be lines)
  }

  root.SkiMaps.define('jungle', { desc: '叢林急流：衝急流、閃鱷魚、飛越瀑布、穿過沒有牆的空中水道！', course, theme,
    music: { race: 'jungle', result: 'jungle_result', cues: { rumble: 'jungle_chase' } }, score: { par: 108, ranks: root.SkiScore.RANKS, key: 'ski-best-jungle' }, bg: '#2f8f6a' });
})(typeof window !== 'undefined' ? window : globalThis);

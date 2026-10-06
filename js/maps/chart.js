'use strict';
// 地獄 · 數讀房市 (HOUSING DECODER): another dimension. Not snow, not a slope: a void of data drawn in lines of light
// that beat with the music, ridden on a board that leaves a trail of light. Down the price curve, a ribbon of light in
// the dark (up its rises, off its peaks, a fork where prices soar or fall), and straight down the crash. Thrown up off a
// kicker the camera swings right round her in slow motion: she lands riding backwards down a strip of film, the years
// counting down, what is coming only in the mirror the owl flies in front of her; thrown up again, she turns back and
// drops into a tube of data, riding round and round it (its walls, its ceiling: the world turns round her). Out of it
// the camera rises over her and turns round, and the screen is the 數讀房市 website, the real one (js/site.js), as anyone
// browsing it sees it, scrolling down as she rides down it, a click through to the next page and the next; only she,
// the coins and what pops up in the way are on top of it. Then she is fired off a jet through a chain of rings of light, each one throwing her on its own way to the next with no hands; copied and pasted
// into four of her (which one is she?); along the line of the chart itself, hair thin, bending hard and rising and
// falling; and 暴漲, flat out to the finish.
(function (root) {
  const { clamp, lerp, seg, smooth, rng, mixHex, obX, obZ, obUp } = root.SkiCore;
  const PI = Math.PI;

  // ------------------------------------------------------------ course
  const RIB = [44, 214];                                        // ① the price curve: a ribbon of light with no walls
  const FORK = [224, 330];                                      // 漲 up the ridge (left) / 跌 down the valley (right)
  const CRASH = 352, DROP = 96, SG = 8;                         // 崩盤: the sheer fall, how far it drops, its grade
  const CRASH_END = CRASH + 1 + DROP / SG + 1.5;

  // one flight (the same integration as SkiPhysics): from height y0 at speed v rising at vy, gravity g × 26, until she
  // is down to yc above the ground (falling at `grade`); { z: how far, top: [z, height], at(z): height above the ground }
  function fly(vy, v, y0, yc, grade = 0, g = 1) {
    const dt = 1 / 120, pts = [];
    let z = 0, y = y0, top = [0, y0];
    for (let i = 0; i < 6000; i++) {
      v -= 0.02 * v * dt; z += v * dt;
      if (vy < 0 && y + grade * z <= yc) break;
      vy -= 26 * g * dt; y += vy * dt;
      pts.push([z, y + grade * z]);
      if (y + grade * z > top[1]) top = [z, y + grade * z];
    }
    const at = q => { let k = 0; while (k < pts.length - 1 && pts[k][0] < q) k++; return pts[k][1]; };
    return { z, top, at };
  }
  const BULL = { vy: 9, v: 28, rise: 1 }, B_BULL = fly(BULL.vy, BULL.v, BULL.rise, 0.3, 0.2);   // off the top of the ridge
  const BULLZ = 266;
  // ② turning round: thrown up off a kicker, the camera swinging round her in slow motion as she flies; she lands backwards
  const KICK = { vy: 9.5, v: 22, rise: 1 }, BG = 0.21, B_KICK = fly(KICK.vy, KICK.v, KICK.rise, 0.3, BG);
  const KICK1 = CRASH_END + 26, TURN = [KICK1 + 4, Math.round(KICK1 + 4 + B_KICK.z)];
  const OB = TURN[1] - 428;                                     // (what is in the way riding backwards, laid out from 428)
  const KICK2 = TURN[1] + 340, TURN2 = [KICK2 + 4, Math.round(KICK2 + 4 + B_KICK.z)];
  const BACKZ = [(TURN[0] + TURN[1]) / 2, (TURN2[0] + TURN2[1]) / 2];   // (riding backwards from half way round the swing to half way back)
  // ③ the tube of data (x from −10 to 10 runs right round it); out of it, on to the website
  const TUBE = [TURN2[1] + 40, TURN2[1] + 520], TR = 10 / PI, T0 = TUBE[0] - 40, TT = z => z + T0;   // (the tube's things laid out from 40)
  // ④ the website: seen from above (course.page: the camera half way round at either end of WEB, ← → as on the screen
  // in between), the real site under the canvas (js/site.js); a page each, from z0: [z0, its page in landscape (the
  // desktop layout), in portrait (the phone's; its home page there is a reader driven by script, so the list of its
  // articles instead), what its link says]
  const WEB0 = TUBE[1] + 50, WEB = [WEB0, WEB0 + 205], GW = 0.08;   // (the page flat: no bends, one grade)
  const PAGES = [[WEB0 + 10, 'home', 'articles', '首頁'], [WEB0 + 95, 'charts', 'charts', '視覺化圖表'], [WEB0 + 133, 'article', 'article', '919 前後，房價和成本']];
  const PAGE_W = 21;                                            // (as wide as the screen, as in js/world.js: the page laid out across it)
  // ⑤ the rings: off a jet she is a projectile, every ring catches her and throws her on to the next (its own way: up,
  // down, left, right). Three far apart, then a run of them close together. [how long since the last throw (s), then
  // thrown at: vy, v, vx]
  const RJ = WEB[1] + 70, JET = { vy: 14.2, v: 80, rise: 1.2 }, RG = 0.06;   // (under the rings a long slope, falling at RG)
  const RTHROW = [[1, 12, 78, 21.1], [0.95, 1.7, 76, -42.4], [0.9, 9.2, 74, 24], [0.32, -13.7, 73, 27.8], [0.3, 14.6, 73, 14], [0.3, 8.1, 72, -30.7],
    [0.3, -13.7, 72, -27.8], [0.3, 9.8, 71, -14], [0.3, -15.2, 71, 25.1], [0.3, 8.1, 70, 30.6], [0.3, -10.2, 70, -19.5], [0.3, 6, 60, 0]];   // (solved for: x 0, 5.5, −5.5, −1, 4, 6.5, 1, −4, −6.5, −2, 3.5, 0; 6 to 12 over the slope)
  const RINGS = (() => {                                        // [z, x, her height over the slope] where each ring catches her (the same steps as SkiPhysics)
    const out = [], dt = 1 / 120; let z = RJ + 4, x = 0, y = JET.rise, vy = JET.vy, v = JET.v, vx = 0;
    for (const [T, vy1, v1, vx1] of RTHROW) {
      for (let t = 0; t < T - 1e-9; t += dt) { vx -= 3.6 * vx * dt; x += vx * dt; v -= 0.02 * v * dt; z += v * dt; vy -= 26 * dt; y += vy * dt + RG * v * dt; }
      out.push([z, x, y]); vy = vy1; v = v1; vx = vx1;
    }
    return out;
  })();
  const RN = RINGS.length, RLAST = RTHROW[RN - 1], B_RLAST = fly(RLAST[1], RLAST[2], RINGS[RN - 1][2], 0.3, RG);
  const RLAND = Math.round(RINGS[RN - 1][0] + B_RLAST.z);
  const COPY = [RLAND + 40, RLAND + 270];                       // copied and pasted: three more of her
  const THIN = [COPY[1] + 40, COPY[1] + 340];                   // the line of the chart itself: hair thin, bending hard one way and the other, rising and falling, no walls
  const FINISH = THIN[1] + 230;                                 // (暴漲: boost pads end to end, flat out to the finish)
  const TH = 1.15;                                              // (how wide the line is, either side of its middle)
  const THINW = [];                                             // (its slope rising and falling: steeper, gentler, every 20)
  for (let z = THIN[0] + 10, k = 0; z < THIN[1] - 10; z += 20, k++) THINW.push([z, k % 2 ? -0.08 : 0.4]);   // (up a little, down a lot: never so sharp over a crest that she leaves it)
  const THINX = [];                                             // (its bends: hard one way, hard the other, every 40)
  for (let z = THIN[0] + 40, k = 0; z < THIN[1] - 20; z += 40, k++) THINX.push([z, k % 2 ? 9 : -9]);

  const course = root.SkiCourse.build({
    id: 'chart', HALF: 10, FINISH, LENGTH: FINISH + 100, START: 4, flow: true, botLanes: 0.125,
    phys: { VMAX: 35, DRAG: 0.22, DRIFT: 0.35, CENT: 0, WALL_DRAG: 1.7, REWIND_V: 0.85, EDGE: 0.3 },   // (EDGE: off a wall-less edge only once her skis are off it)
    CX: [[0, 0], [40, 0], [80, -3], [120, 3], [160, -2], [200, 2], [FORK[0], 0], [FORK[1], 0], [CRASH - 6, 0], [KICK1 + 30, 0],
      [TURN[1] + 72, -5], [TURN[1] + 152, 4], [TURN[1] + 232, -4], [KICK2 - 10, 0], [TURN2[1] + 10, 0],
      [TUBE[0] + 10, 0], [TT(130), 6], [TT(230), -6], [TT(330), 5], [TT(430), -4], [TUBE[1] - 10, 0], [TUBE[1] + 14, 0],   // (the tube swinging gently one way and the other)
      [WEB[1] + 30, 0], [RJ, 0], [RLAND + 20, 0], [COPY[0], 0], [COPY[0] + 90, -5], [COPY[0] + 180, 5], [COPY[1], 0],
      [THIN[0], 0], ...THINX, [THIN[1], 0], [FINISH + 100, 0]],
    GRADE: [[0, 0.02], [12, 0.1], [36, 0.2],
      [70, 0.24], [76, -0.14], [93, -0.14], [95, 0.55], [107, 0.55], [111, 0.2],                       // ① the price curve: rises (uphill), peaks flown off
      [134, 0.22], [140, -0.16], [157, -0.16], [159, 0.6], [171, 0.6], [175, 0.18], [196, 0.22], [FORK[0], 0.18],
      [FORK[1], 0.18], [CRASH - 10, 0.12], [CRASH, 0.1], [CRASH + 1, SG], [CRASH_END - 1.5, SG], [CRASH_END, 0.08],   // 崩盤
      [CRASH_END + 18, BG], [TURN2[1], BG], [TUBE[0] - 30, 0.3], [TUBE[0], 0.26], [TUBE[1], 0.26], [TUBE[1] + 20, 0.18],   // ② backwards, ③ down into the tube, fast through it
      [WEB[0] - 34, GW], [WEB[1] + 30, GW], [RJ - 20, 0.16], [RJ + 3.5, 0.16], [RJ + 4, RG], [RLAND + 30, RG], [RLAND + 60, 0.2],   // ④ the site and the plan, ⑤ the rings
      [COPY[0], 0.2], [COPY[1], 0.2], ...THINW, [THIN[1] + 10, 0.18], [FINISH - 20, 0.1], [FINISH, 0.05], [FINISH + 40, 0], [FINISH + 100, 0]],
    WIDTH: [[0, 7], [RIB[0] - 8, 7], [RIB[0] + 4, 4.2], [RIB[1] - 6, 4.2], [FORK[0] - 2, 8], [FORK[1] + 2, 8], [CRASH - 6, 5.5], [CRASH_END + 6, 6.5],
      [TURN2[1], 6.5], [TUBE[0] - 12, 10], [TUBE[1] + 14, 10], [WEB[1] + 30, 10], [RJ - 10, 8.5], [RLAND - 6, 8.5], [COPY[0], 6.5], [COPY[1], 6.5],
      [THIN[0] - 14, 4], [THIN[0], TH], [THIN[1], TH], [THIN[1] + 16, 6], [FINISH - 30, 8], [FINISH, 8]],
    OPEN: [[RIB[0], RIB[1]], [TURN[1] + 6, KICK2 - 8], [THIN[0] - 20, THIN[1] + 6]],   // (no walls along the curve, the strip of film ridden backwards (← → the wrong way round in the mirror: easy to go off it), or the line: off the edge she falls)
    TUBE: [[TUBE[0], TUBE[1], TR]],
    VERT: [[CRASH, CRASH_END]],
    BACK: [BACKZ],
    CAMYAW: [[TURN[0], 0], [TURN[1], PI], [TURN2[0], PI], [TURN2[1], 0]],   // (swung round as she flies off the kicker, and back as she flies off the next)
    PAGE: [WEB],
    VCAP: [[WEB[0] - 30, WEB[0] + 184, 11]],
    SURGE: [[THIN[1] + 8, FINISH - 30, 44, 88]],                 // (暴漲: no ceiling, faster and faster to the finish)                   // (down the website at a browsing pace)
    CLONE: [COPY],
    SPLIT: [{ m: [[FORK[0] - 1, 0], [FORK[0] + 12, 1.4], [FORK[1] - 12, 1.4], [FORK[1], 0]],
      L: [[FORK[0] + 2, 0], [FORK[0] + 30, 4.5], [FORK[1] - 34, 4.5], [FORK[1] - 6, 0]],              // 漲: up the ridge
      R: [[FORK[0] + 2, 0], [FORK[0] + 22, -3], [FORK[1] - 26, -3], [FORK[1] - 6, 0]] }],            // 跌: down the valley
    slow: [[BULLZ + 4, BULLZ + 4 + B_BULL.z, -1], [TURN[0], TURN[1] - 1], [TURN2[0], TURN2[1] - 1]],   // (off the ridge: only its side; off both kickers as the camera swings round)
    gateEvery: 40,
    sections: [{ name: '漲跌曲線', z0: 0 }, { name: '時光倒流', z0: CRASH_END + 10 }, { name: '數據隧道', z0: TURN2[1] + 10 }, { name: '網站衝浪', z0: TUBE[1] + 10 }, { name: '光環衝刺', z0: RJ - 30 }],
  }, (c, P) => {
    const { coin, row, arc, boost } = P;
    const tag = (z, x, hw = 0.8) => P.hop('tag', z, x, hw, { h: 0.8, hd: 0.4 });             // a board of a sale price, standing low: hop it
    const pin = (z, x, hw = 0.6) => P.tall('pin', z, x, hw, { hd: 0.5 });                    // a map pin, as tall as she is: go round
    const tip = (z, x, w) => P.over('tip', z, x, w);                                         // a green arrow hanging low: duck
    const ticker = (z, amp, period, x = 0) => P.roll('ticker', z, x, 1.2, amp, period, { h: 0.6, hd: 0.35 });   // a price board sliding to and fro across the ribbon: hop it
    const dot = (z, x, hw = 1.2, period = 2.4) => P.dive('dot', z, x, hw, period, { h: 0.8, hd: 0.5 });   // a point of the chart bobbing up and down on its stalk: hop it, or pass while it is down
    // ① 漲跌曲線: down the made-up price index, a ribbon of light with no walls: up its rises (a boost pad on each),
    // off its peaks; price boards, map pins, bobbing points of the chart, breaks in the data to hop
    tag(56, -2.4); dot(56, 0.6, 1.0, 2.2); coin(56, 3);
    ticker(66, 3, 2.4); coin(66, 0, 1.7);
    boost(77, 0, 1.4, 6); coin(84, 0, 2.1);
    arc(95, 0, 3, 3);
    pin(118, 1.6); coin(118, -2);
    P.gap('break', 128, 3.5); coin(130, 0, 1.7);
    boost(141, 0, 1.4, 6); dot(152, 0, 1.4, 2.0); coin(152, 0, 1.6);
    arc(159, 0, 4, 3);
    pin(184, 2); coin(184, -1.5);
    P.gap('break', 198, 4); coin(200, 0, 1.7);
    // the fork: 漲 up the ridge (a launch off its top, slow motion over the gap) / 跌 down the valley (low green arrows
    // to duck, a boost pad)
    P.tall('fork', FORK[0], 0, 1.4, { hd: 1.2 });
    row(240, -4.5, 2, 4);
    tag(252, -5.5); coin(252, -3);
    P.launch(BULLZ, -4.6, 3, 4, BULL.vy, BULL.v, BULL.rise, { k: 'bull', sfx: 'bull', pop: 'bull' });
    P.gap('bullgap', BULLZ + 4.5, B_BULL.z - 8.5, { x: -4.7, hw: 3.3, thrown: true });   // (the launch is right across that side: she is thrown over all of it)
    for (let k = 1; k <= 3; k++) { const d = B_BULL.z * k / 4; coin(BULLZ + 4 + d, -4.6, B_BULL.at(d) + 0.75); }
    tag(306, -3.5); coin(306, -6);
    tip(244, 4.7, 6.6); coin(244, 4.7, 0.6);
    boost(256, 4.5, 1.4, 6); coin(266, 4.5);
    tip(276, 4.7, 6.6); coin(276, 4.7, 0.6);
    pin(290, 3); coin(290, 6);
    tip(304, 4.7, 6.6); coin(304, 4.7, 0.6);
    tag(318, 5.5); coin(318, 3.2);
    coin(336, 0, 2.1); dot(342, -1.8, 1.0, 2.2); dot(342, 1.8, 1.0, 2.2);
    // 崩盤: the curve drops straight down, and so does she
    coin(CRASH_END + 4, 0);
    // ② 時光倒流: thrown up off a kicker the camera swings right round her in slow motion: she lands riding backwards down
    // a strip of film, the years counting down, seeing what is coming only in the owl's mirror. Rows of hourglasses with
    // one gap in them (left, right, the middle: ← → the wrong way round) every other time, and between them rifts in
    // time to hop, clock hands sweeping across, banners of years to duck, a calendar. Thrown up again at the end, the camera swings back
    P.cue(KICK1 - 10, 'back');
    P.launch(KICK1, 0, 6.5, 4, KICK.vy, KICK.v, KICK.rise, { k: 'kick', sfx: 'turn' });
    const glass = (z, x) => P.tall('hourglass', z, x, 0.8, { hd: 0.6 });
    const cal = (z, x, hw = 1.4) => P.hop('calendar', z, x, hw, { h: 0.8, hd: 0.4 });
    const hand = (z, x, amp, period) => P.roll('hand', z, x, 1.1, amp, period, { h: 0.6, hd: 0.35 });
    const banner = (z, x = 0, w = 2 * c.halfAt(z)) => P.over('banner', z, x, w);
    const B = z => z + OB;
    const wall = (z, xs) => xs.forEach(x => glass(z, x));          // a row of hourglasses with one gap in it: ← → the wrong way round to find it
    coin(B(440), 0, 2.1);
    glass(B(462), 0); coin(B(462), -3); coin(B(462), 3);
    hand(B(484), 0, 3.6, 3.2); coin(B(484), 0, 1.7);
    wall(B(506), [-5.2, -2.6, 0, 5.6]); coin(B(506), 2.8);         // (the gap: right)
    P.gap('rift', B(528), 3.5); coin(B(530), 0, 1.7);
    wall(B(550), [5.2, 2.6, 0, -5.6]); coin(B(550), -2.8);         // (left)
    banner(B(572)); coin(B(572), -2.8, 0.6);
    glass(B(594), -2.4); glass(B(594), 2.4); coin(B(594), 0);       // (the middle)
    P.gap('rift', B(616), 4); coin(B(618), 0, 1.7);
    wall(B(638), [-5.2, -2.6, 0, 5.6]); coin(B(638), 2.8);         // (right)
    hand(B(660), 0, 3.4, 2.8); coin(B(660), 0, 1.7);
    glass(B(682), 1.6); glass(B(682), -4.4); coin(B(682), -1.4);    // (a little left)
    banner(B(704)); coin(B(704), -1.4, 0.6);
    wall(B(726), [5.2, 2.6, 0, -5.6]); coin(B(726), -2.8);         // (left)
    cal(B(748), 0, 2.4); coin(B(748), -4.4);
    P.cue(KICK2 - 10, 'front');
    P.launch(KICK2, 0, 6.5, 4, KICK.vy, KICK.v, KICK.rise, { k: 'kick', sfx: 'turn' });
    // ③ 數據隧道: dropped into a tube of data she rides right round (the ceiling, the walls, the floor: the world turns
    // round her). Blocks of data to hop, firewalls across part of the tube to go round (up the wall, over the top),
    // scanning blades sweeping round, spikes jabbing in and out; boost pads; coins spiralling round. Out of it she is
    // brought back to the middle while the floor uncurls
    const block = (z, x, hw = 1) => P.hop('block', TT(z), x, hw, { h: 0.8, hd: 0.5 });
    const fw = (z, x, hw) => P.tall('fw', TT(z), x, hw, { hd: 0.4 });
    const blade = (z, x, amp, period) => P.roll('blade', TT(z), x, 0.8, amp, period, { h: 0.6, hd: 0.3 });
    const spike = (z, x, hw = 1.2, period = 1.8) => P.dive('spike', TT(z), x, hw, period, { h: 0.9, hd: 0.5 });
    const tc = (z, x, y) => coin(TT(z), x, y);
    P.cue(TUBE[0] - 22, 'tube');
    tc(52, 0);
    boost(TT(76), 0, 1.6, 6);
    block(68, 0, 1.2);
    fw(88, 0, 4); tc(88, 6.6); tc(88, -6.6);
    block(108, -6); block(108, 6); tc(108, 0);
    blade(134, 0, 7, 2.6); tc(134, 0, 2.1);                         // (a hop never straight after a hop: one carries her 20 on in here)
    boost(TT(142), 0, 1.6, 6); tc(152, 0);
    fw(166, -6.5, 3); fw(166, 6.5, 3); tc(166, 0);
    spike(186, -3); spike(186, 3); tc(186, 0);
    fw(208, 0, 4.4); tc(208, 7.2); tc(208, -7.2);                   // (round it: high up the tube's wall)
    blade(228, 0, 8, 2.2);
    block(256, -4, 0.9); block(256, 0, 0.9); block(256, 4, 0.9); tc(256, 0, 2.1);
    fw(272, 5, 4.4); fw(272, -8.4, 1.6); tc(272, -3);
    spike(292, 0, 1.6, 1.6); tc(292, -4);
    boost(TT(308), -3, 1.6, 6); tc(318, -3);
    fw(332, 0, 3); tc(332, 6); tc(332, -6);
    blade(352, 0, 6.5, 2.0); tc(362, 0);
    fw(372, -5.6, 3.8); tc(372, 3);
    fw(398, 5.6, 3.8); tc(398, -3);
    block(420, -6, 0.9); block(420, -2, 0.9); block(420, 2, 0.9); block(420, 6, 0.9);
    boost(TT(436), 0, 1.6, 6);
    for (let k = 0; k < 3; k++) tc(426 + k * 7, 5 * Math.sin(k * 0.9));
    spike(460, 0, 1.6, 1.6);
    fw(480, 0, 6); tc(480, 8.2); tc(480, -8.2);                     // (all but the very top: over it, or round the way up)
    blade(502, 0, 8, 2.4);
    // ④ 網站衝浪: the website itself, scrolling down as she rides down it, a click through to the next page and the next;
    // on top of it, what pops up at anyone browsing: a box asking her to subscribe, to log in, to allow notifications (go
    // round), a bar about cookies right across but for a gap (through it), a toast sliding to and fro and the mouse
    // pointer sweeping across (hop them), loading spinners coming and going (hop them, or pass while they are gone)
    P.cue(WEB[0] - 40, 'web');
    const Wz = z => WEB[0] + z;
    const popup = (z, x, hw = 3) => P.tall('popup', Wz(z), x, hw, { hd: 1.6 });
    const cookie = (z, gap, w = 5) => {                         // right across the page but for a gap w wide at `gap`
      const H = 10, a = gap - w / 2, b = gap + w / 2;
      if (a > -H + 0.2) P.tall('cookie', Wz(z), (a - H) / 2, (a + H) / 2, { hd: 0.8 });
      if (b < H - 0.2) P.tall('cookie', Wz(z), (b + H) / 2, (H - b) / 2, { hd: 0.8 });
      coin(Wz(z), gap);
    };
    const toast = (z, x, amp, period) => P.roll('toast', Wz(z), x, 1.8, amp, period, { h: 0.6, hd: 0.5 });
    const pointer = (z, x, amp, period) => P.roll('pointer', Wz(z), x, 0.7, amp, period, { h: 0.6, hd: 0.8 });
    const spinner = (z, x) => P.dive('spinner', Wz(z), x, 1.0, 1.8, { h: 0.8, hd: 1.0 });
    for (const [z0] of PAGES.slice(1)) P.cue(z0, 'click');      // (over its link: clicked, and on to the next page)
    row(Wz(12), 0, 2, 3);
    popup(26, 0, 3.2); coin(Wz(26), -6.5); coin(Wz(26), 6.5);
    spinner(38, -5); spinner(38, 5); coin(Wz(38), 0);
    toast(50, 0, 5, 2.8); coin(Wz(50), 0, 1.7);
    popup(62, -5.5, 3); coin(Wz(62), 4);
    cookie(76, 3, 4.6);
    pointer(86, 0, 6.5, 2.4); coin(Wz(86), 0, 1.7);
    popup(104, 5.5, 3); coin(Wz(104), -5);
    spinner(120, -4); spinner(120, 4); coin(Wz(120), 0);
    cookie(142, -3, 4.6);
    pointer(156, 0, 7, 2.0); coin(Wz(156), 0, 1.7);
    popup(170, 0, 3); coin(Wz(170), -6.5); coin(Wz(170), 6.5);
    toast(182, 0, 6, 2.6); coin(Wz(182), 0, 1.7);
    boost(Wz(188), 0, 1.6, 6); row(Wz(196), 0, 3, 3);
    // ⑤ 光環衝刺: fired off a jet into a chain of rings of light, each one catching her and throwing her on to the next,
    // its own way: three far apart, then a run of them close together (nothing to do but fly); copied and pasted: three
    // more of her ride beside her, one her mirror image, two a moment behind, and the camera no longer keeps her in the
    // middle; the line of the chart itself, hair thin, with no walls, bending hard and rising and falling; 暴漲, boost
    // pads end to end, flat out to the finish
    boost(RJ - 22, 0, 1.6, 6);
    P.cue(RJ - 4, 'rings');
    P.launch(RJ, 0, c.halfAt(RJ), 4, JET.vy, JET.v, JET.rise, { k: 'ringjump', sfx: 'jet', punch: true, jet: true, home: RTHROW[0][0] });
    RINGS.forEach(([z, x, y], k) => {
      const [, vy, v, vx] = RTHROW[k];
      P.launch(z, 0, c.halfAt(z), 2, vy, v, 0, { k: 'ring', sfx: 'ring', catch: 99, punch: true, jet: true, vx });   // (a ring in the air: it catches her, however high over the slope, and throws her on)
      coin(z + 1, x, y + 0.8);
    });
    const num = (z, x, hw = 1.0) => { P.tall('num', z, x, hw, { hd: 1.0 }); P.cue(z - 24, 'numfall', { x, near: 99 }); };
    P.cue(COPY[0] - 8, 'clone');
    const K = z => COPY[0] + z;
    num(K(14), -2.5); coin(K(14), 1.5);
    pin(K(34), -3); pin(K(34), 3);
    tag(K(54), 0, 2.2);
    pin(K(74), -3); pin(K(74), 3); coin(K(74), 0, 2.1);   // (nothing tall right down the middle here: the camera rides there, not behind her)
    ticker(K(94), 4, 2.6); coin(K(94), 0, 1.7);
    num(K(114), 2.5); coin(K(114), -1.5);
    dot(K(134), -3, 1.2, 2.2); dot(K(134), 3, 1.2, 2.2); coin(K(134), 0, 2.1);
    pin(K(154), -2.6); pin(K(154), 2.6);
    tag(K(174), -4); tag(K(174), 4); coin(K(174), 0, 2.1);
    pin(K(194), -4.6); pin(K(194), 1.6); coin(K(194), -1.5);
    ticker(K(214), 4, 2.2); coin(K(214), 0, 1.7);
    P.cue(THIN[0] - 4, 'thin');
    for (let z = THIN[0] + 20, k = 0; z < THIN[1] - 10; z += 40, k++) coin(z, 0, k % 2 ? 2.1 : 0.9);   // (every other one up high: a hop for it, on a line this thin)
    P.cue(THIN[1] + 40, 'surge');                                  // (after the first boost pad's own word)
    for (let z = THIN[1] + 8; z < FINISH - 30; z += 6) boost(z, 0, 1.6, 6);   // 暴漲: boost pads end to end, flat out to the finish
    row(THIN[1] + 30, 0, 2, 50);
    coin(FINISH - 8, 0);
  });

  root.SkiCourse.fitFlights(course);

  // ------------------------------------------------------------ look
  // another dimension: a void of data drawn in lines of light, beating with the music (the price curve, the tube, the
  // rings, the line); a strip of film going sepia as time runs back inside it; and the real website over it
  const HW = z => course.halfAt(z), gy = z => course.height(z), MED = z => course.medianAt(z);
  const C = { void: '#03060f', ink: '#0a1430', panel: '#0d1a3c', line: '#2a4aa0', orange: '#ff6a1a', amber: '#ffb03a', white: '#f4f8ff', cyan: '#4ad8ff', up: '#ff4a4a', down: '#2ee08a',
    navy: '#0d3170', gold: '#f7c531', film: '#2a1c12' };
  const LOOK = z => (z < CRASH_END + 12 ? 0 : z < TURN2[1] + 14 ? 1 : 0);   // which dimension (0: the void of data, 1: the past)
  const HAZES = ['#060a1c', '#8a6a48'];
  const FC = new Map();
  function fog(col, k, haze) {
    const q = Math.round(clamp(k) * 6);
    if (!q) return col;
    const key = col + q + haze;
    let v = FC.get(key);
    if (!v) { v = mixHex(col, haze, q / 6 * 0.85); FC.set(key, v); }
    return v;
  }
  const fogK = (R, z, x = 0) => clamp((root.SkiDraw.toCam(R.cam, R.P3(z, x))[2] - 40) / 80);
  const HOLES = course.obstacles.filter(o => o.hole);
  const holesIn = (za, zb) => HOLES.filter(o => o.z + o.hd > za && o.z - o.hd < zb);
  const inRings = z => z > RJ - 10 && z < RLAND + 10;
  const inTube = z => z > TUBE[0] - 16 && z < TUBE[1] + 16;
  // the beat: from the tune itself where it plays (SkiAudio.beat), from the clock otherwise; pulse: 1 on the beat, dying away
  let BEAT = 0;
  const pulse = (k = 5) => Math.exp(-(((BEAT % 1) + 1) % 1) * k);

  // ---- small helpers
  const TXT = new Map();
  function textImg(str, col, stroke) {                           // a word set once into its own canvas, then just scaled
    const key = str + '|' + col + '|' + stroke;
    let im = TXT.get(key);
    if (im) return im;
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.check("48px 'Cubic11'")) return null;
    const S = 48, pad = 8, g0 = document.createElement('canvas').getContext('2d');
    g0.font = `${S}px 'Cubic11'`;
    const w = Math.ceil(g0.measureText(str).width) + pad * 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = S + pad * 2;
    const g = cv.getContext('2d'); g.font = `${S}px 'Cubic11'`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = 7; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(str, w / 2, cv.height / 2 + 2); }
    g.fillStyle = col; g.fillText(str, w / 2, cv.height / 2 + 2);
    im = { cv, w, h: cv.height, S }; TXT.set(key, im);
    return im;
  }
  function text3(D, R, p, str, size, col, o = {}) {              // a word facing the camera at p, `size` units tall
    const q = D.toCam(R.cam, p);
    if (q[2] < 1 || q[2] > (o.far || 80)) return;
    const [sx, sy] = D.scr(R.cam, q), px = R.cam.F / q[2] * size;
    if (px < 7) return;
    const im = textImg(str, col, o.stroke || null), g = D.ctx;
    if (o.alpha !== undefined) { g.save(); g.globalAlpha *= o.alpha; }
    if (!im) D.txt(str, sx, sy + px * 0.38, { size: Math.round(px), color: col, align: 'center' });
    else { const k = px / im.S; if (R.roll) { g.save(); g.translate(sx, sy); g.rotate(R.roll); g.drawImage(im.cv, -im.w * k / 2, -im.h * k / 2, im.w * k, im.h * k); g.restore(); } else g.drawImage(im.cv, sx - im.w * k / 2, sy - im.h * k / 2, im.w * k, im.h * k); }
    if (o.alpha !== undefined) g.restore();
  }
  function glowDot(D, R, p, rad, col, a = 0.5) {
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.8) return;
    const [sx, sy] = D.scr(R.cam, q), rr = clamp(R.cam.F / q[2] * rad, 2, 80), g = D.ctx;
    if (rr < 5) { D.rect(sx - rr, sy - rr, rr * 2, rr * 2, col, Math.min(1, a * 1.6)); return; }
    g.save(); g.globalAlpha *= a * 0.3; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr * 2.2, 0, 7); g.fill();
    g.globalAlpha = Math.min(1, a * 2); g.beginPath(); g.arc(sx, sy, rr * 0.8, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy, rr * 0.35, 0, 7); g.fill(); g.restore();
  }
  function disc(D, R, p, rad, col, a = 1) {                       // a round dot facing the camera
    const q = D.toCam(R.cam, p);
    if (q[2] < 0.6) return;
    const [sx, sy] = D.scr(R.cam, q), rr = R.cam.F / q[2] * rad, g = D.ctx;
    if (rr < 1.2) return;
    g.save(); g.globalAlpha *= a; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill(); g.restore();
  }
  function boxF(D, R, F, z0, z1, x0, x1, y0, y1, cols) {          // a box from any point function F(z, x, y)
    const cam = R.cam;
    D.poly3(cam, [F(z0, x0, y0), F(z1, x0, y0), F(z1, x0, y1), F(z0, x0, y1)], cols.side);
    D.poly3(cam, [F(z0, x1, y0), F(z1, x1, y0), F(z1, x1, y1), F(z0, x1, y1)], cols.side);
    if (cols.back) D.poly3(cam, [F(z1, x0, y0), F(z1, x1, y0), F(z1, x1, y1), F(z1, x0, y1)], cols.back);
    D.poly3(cam, [F(z0, x0, y1), F(z0, x1, y1), F(z1, x1, y1), F(z1, x0, y1)], cols.top);
    D.poly3(cam, [F(z0, x0, y0), F(z0, x1, y0), F(z0, x1, y1), F(z0, x0, y1)], cols.front);
  }
  const boxS = (D, R, z0, z1, x0, x1, y0, y1, cols) => boxF(D, R, R.S3, z0, z1, x0, x1, y0, y1, cols);
  function ring(D, R, z, x, rz, rx, col, a, up = 0.02, n = 14) {  // an oval flat on the ground
    const p = []; for (let k = 0; k < n; k++) { const t = k / n * 2 * PI; p.push(R.S3(z + Math.cos(t) * rz, x + Math.sin(t) * rx, up)); }
    D.poly3(R.cam, p, col, a);
  }
  const line3 = (D, R, za, xa, zb, xb, up, w, col, a = 1) => D.poly3(R.cam, [R.S3(za, xa - w / 2, up), R.S3(za, xa + w / 2, up), R.S3(zb, xb + w / 2, up), R.S3(zb, xb - w / 2, up)], col, a);
  const cross = (D, R, z, xa, xb, up, w, col, a = 1) => D.poly3(R.cam, [R.S3(z - w / 2, xa, up), R.S3(z - w / 2, xb, up), R.S3(z + w / 2, xb, up), R.S3(z + w / 2, xa, up)], col, a);
  function duckHint(D, R, z, xs, y) {                             // white chevrons pointing down: crouch!
    for (const x of xs) for (let j = 0; j < 2; j++) { const yy = y - j * 0.3; D.poly3(R.cam, [R.P3(z - 0.05, x - 0.35, yy + 0.18), R.P3(z - 0.05, x, yy), R.P3(z - 0.05, x + 0.35, yy + 0.18), R.P3(z - 0.05, x + 0.35, yy + 0.08), R.P3(z - 0.05, x, yy - 0.1), R.P3(z - 0.05, x - 0.35, yy + 0.08)], '#ffffff', 0.9); }
  }
  const YEAR = z => 2025 - Math.max(0, Math.floor((z - TURN[1]) / 32));   // the years down the strip of film, counting down

  // ---- what stands in the void round the course (built once): beams of light rising out of the dark, cards of charts
  // in wireframe, clocks beside the film
  const SCENE = (() => {
    const r = rng(1314), beams = [], cards = [], clocks = [];
    for (let z = -20; z < FINISH + 80; z += 9 + r() * 10) {
      if (LOOK(z) !== 0) continue;
      for (const sd of [-1, 1]) if (r() < 0.7) beams.push({ z: z + r() * 6, x: sd * (14 + r() * 40), h: 20 + r() * 50, col: r() < 0.7 ? C.orange : r() < 0.5 ? C.cyan : C.white, ph: r() * 4 });
      if (r() < 0.45) { const sd = r() < 0.5 ? -1 : 1; cards.push({ z: z + r() * 6, x: sd * (13 + r() * 22), y: 2 + r() * 10, w: 4 + r() * 4, kind: (r() * 3) | 0, seed: (r() * 1e6) | 0, bob: r() * 6 }); }
    }
    for (let z = TURN[1] + 6; z < TURN2[0]; z += 22 + r() * 10) for (const sd of [-1, 1]) if (r() < 0.7) clocks.push({ z, x: sd * (11 + r() * 12), y: 3 + r() * 6, r: 1.6 + r() * 2.4, kind: r() < 0.65 ? 'clock' : 'glass', sp: 0.6 + r() * 1.6 });
    return { beams: beams.sort((a, b) => a.z - b.z), cards: cards.sort((a, b) => a.z - b.z), clocks };
  })();

  // ---- the course surface
  function faded(R, fn) {                                           // (drawn as much as the void still shows over the website)
    if (R.mirror || FADE >= 1) { fn(); return; }
    const g = root.SkiDraw.ctx, ga = g.globalAlpha; g.globalAlpha = ga * FADE; try { fn(); } finally { g.globalAlpha = ga; }
  }
  const E_out = u => 1 - (1 - u) * (1 - u);
  function cutSlices(za, zb, holes) {                             // [a, b] pieces of [za, zb] not over a hole right across (one across part of it is drawn over the surface)
    holes = holes.filter(o => o.hw >= HW(o.z) - 0.5);
    const cuts = [za, zb];
    for (const o of holes) for (const e of [o.z - o.hd, o.z + o.hd]) if (e > za && e < zb) cuts.push(e);
    cuts.sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i < cuts.length - 1; i++) { const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2; if (!holes.some(o => m > o.z - o.hd && m < o.z + o.hd)) out.push([a, b]); }
    return out;
  }
  // the tube of data: panels all round, rings of light every 4 (pulsing on the beat), lines of light racing along it,
  // the seam over her head a line of white. Curling up out of the floor at either end
  function tubeSlice(D, R, za, zb, near) {
    const { cam, S3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k, HAZES[0]), n = near ? 16 : 8, h = HW(za), p = pulse();
    for (let i = 0; i < n; i++) {
      const xa = -h + 2 * h * i / n, xb = -h + 2 * h * (i + 1) / n;
      D.poly3(cam, [S3(za, xa, 0), S3(za, xb, 0), S3(zb, xb, 0), S3(zb, xa, 0)], c((i + Math.floor(za / 4)) % 2 ? C.ink : C.panel));
    }
    if (k > 0.85) return;
    for (const x of [-7.5, -2.5, 2.5, 7.5]) line3(D, R, za, x, zb, x, 0.01, 0.08, x % 5 ? C.cyan : C.line, 0.55);
    if (Math.floor(za / 4) !== Math.floor(zb / 4 - 1e-6)) {           // a ring of light round the tube
      const z = Math.floor(zb / 4) * 4, big = z % 16 === 0;
      for (let i = 0; i < n; i++) cross(D, R, z, -h + 2 * h * i / n, -h + 2 * h * (i + 1) / n, 0.015, big ? 0.32 : 0.12, big ? C.orange : C.line, big ? 0.55 + 0.45 * p : 0.6);
    }
    if (near) {                                                     // dashes of data racing along it
      const r = rng(Math.floor(za * 7) + 3);
      for (let j = 0; j < 3; j++) { const x = (r() - 0.5) * 2 * (h - 0.5), ph = ((t * 3 + r()) % 1) * (zb - za); line3(D, R, za + ph * 0.5, x, Math.min(zb, za + ph * 0.5 + 0.8), x, 0.02, 0.1, r() < 0.5 ? C.amber : C.cyan, 0.8); }
    }
  }
  // the price curve: a ribbon of dark glass, lit along its edges, the line itself glowing down its middle; the area
  // under it hangs down in a glow, like an area chart; points of the chart on it every 20
  function ribbonSlice(D, R, za, zb, near) {
    const { cam, S3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k, HAZES[0]), open = course.openAt((za + zb) / 2), p = pulse();
    const holes = holesIn(za, zb).filter(o => !o.thrown && o.hw >= HW(o.z) - 0.5), med = Math.max(MED(za), MED(zb));
    for (const [a, b] of cutSlices(za, zb, holes)) {
      const ha = HW(a), hb = HW(b), ma = MED(a), mb = MED(b), sides = med > 0.01 ? [[-ha, -ma, -hb, -mb], [ma, ha, mb, hb]] : [[-ha, ha, -hb, hb]];
      for (const [x0, x1, x2, x3] of sides) {
        D.poly3(cam, [S3(a, x0, 0), S3(a, x1, 0), S3(b, x3, 0), S3(b, x2, 0)], c(Math.floor(a / 4) % 2 ? C.ink : C.panel));
        if (near && Math.floor(a / 2) % 2 === 0) for (const u of [-0.5, 0.5]) line3(D, R, a, lerp(x0, x1, 0.5 + u * 0.5), b, lerp(x2, x3, 0.5 + u * 0.5), 0.008, 0.05, C.line, 0.8);
      }
      if (near && Math.floor(a / 4) !== Math.floor(b / 4 - 1e-6) && med < 0.01) { const z = Math.floor(b / 4) * 4; cross(D, R, z, -HW(z), HW(z), 0.01, 0.06, C.line, 0.6 + 0.4 * p); }
      if (med < 0.01) { line3(D, R, a, 0, b, 0, 0.012, 0.34, C.orange, 0.95); line3(D, R, a, 0, b, 0, 0.014, 0.1, '#ffe0c0', 0.9); }   // the line itself
      for (const sd of [-1, 1]) {
        const xa = sd * ha, xb = sd * hb;
        D.poly3(cam, [S3(a, xa, 0), S3(b, xb, 0), S3(b, xb, -0.45), S3(a, xa, -0.45)], c('#081028'));
        line3(D, R, a, xa - sd * 0.12, b, xb - sd * 0.12, 0.012, 0.24, C.orange, 0.7 + 0.3 * p);
        if (open) D.poly3(cam, [S3(a, xa, -0.45), S3(b, xb, -0.45), S3(b, xb, -9), S3(a, xa, -9)], C.orange, 0.07 + 0.05 * p);   // the area under the curve, glowing down into the dark
        else { D.poly3(cam, [S3(a, xa, 0), S3(b, xb, 0), S3(b, xb, 0.55), S3(a, xa, 0.55)], c('#101c44'), 1); line3(D, R, a, xa, b, xb, 0.55, 0.12, C.orange, 1); }
      }
      if (Math.floor(a / 20) !== Math.floor(b / 20 - 1e-6) && med < 0.01) { const z = Math.floor(b / 20) * 20; glowDot(D, R, S3(z, 0, 0.05), 0.3, '#ffffff', 0.9); ring(D, R, z, 0, 0.45, 0.45, C.orange, 0.9, 0.02, 10); }
    }
    for (const o of holesIn(za, zb).filter(o => o.hw < HW(o.z) - 0.5)) {   // a break across one side only (a fork's): the dark showing through, its edges red
      const a = Math.max(za, o.z - o.hd), b = Math.min(zb, o.z + o.hd), x0 = o.x - o.hw, x1 = o.x + o.hw, F = (z, x, y) => R.W3(z, x, course.surf(z, x) + y);
      if (b <= a) continue;
      D.poly3(cam, [F(a, x0, 0.012), F(a, x1, 0.012), F(b, x1, 0.012), F(b, x0, 0.012)], C.void);
      for (const e of [o.z - o.hd, o.z + o.hd]) if (e >= za && e < zb) D.poly3(cam, [F(e - 0.6, x0, 0.016), F(e - 0.6, x1, 0.016), F(e + 0.6, x1, 0.016), F(e + 0.6, x0, 0.016)], C.up, 0.85 + 0.15 * Math.sin(t * 10));
    }
    for (const o of holes) for (const [e, dir] of [[o.z - o.hd, 1], [o.z + o.hd, -1]]) if (e >= za && e < zb) {   // a break in the data: its edge striped red
      const h = HW(e);
      D.poly3(cam, [S3(e, -h, 0), S3(e, h, 0), S3(e, h, -0.45), S3(e, -h, -0.45)], '#3a0a0a');
      for (let j = 0; j < 7; j++) { const x0 = -h + j * 2 * h / 7; if (j % 2 === 0) D.poly3(cam, [S3(e - dir * 1.2, x0, 0.015), S3(e - dir * 1.2, x0 + 2 * h / 7, 0.015), S3(e, x0 + 2 * h / 7, 0.015), S3(e, x0, 0.015)], C.up, 0.85 + 0.15 * Math.sin(t * 10)); }
    }
  }
  function forkDeco(D, R, za, zb, near) {                         // up arrows painted up the ridge, down arrows down the valley
    const { cam, S3 } = R;
    if (!near || Math.floor(za / 8) === Math.floor(zb / 8 - 1e-6)) return;
    const z = Math.floor(zb / 8) * 8;
    if (z > FORK[0] + 10 && z < BULLZ) D.poly3(cam, [S3(z, -4.6 - 1.2, 0.02), S3(z + 1.6, -4.6, 0.02), S3(z, -4.6 + 1.2, 0.02), S3(z + 0.5, -4.6, 0.02)], C.up, 0.85);
    if (z > FORK[0] + 18 && z < FORK[1] - 22) D.poly3(cam, [S3(z + 1.6, 4.6 - 1.2, 0.02), S3(z, 4.6, 0.02), S3(z + 1.6, 4.6 + 1.2, 0.02), S3(z + 1.1, 4.6, 0.02)], C.down, 0.85);
  }
  // the strip of film: dark, sprocket holes down both edges, frames across it; low amber rails
  function filmSlice(D, R, za, zb, near) {
    const { cam, S3, t } = R, k = near ? 0 : fogK(R, (za + zb) / 2), c = v => fog(v, k, HAZES[1]), holes = holesIn(za, zb);
    for (const [a, b] of cutSlices(za, zb, holes)) {
      const ha = HW(a), hb = HW(b);
      D.poly3(cam, [S3(a, -ha, 0), S3(a, ha, 0), S3(b, hb, 0), S3(b, -hb, 0)], c(C.film));
      D.poly3(cam, [S3(a, -ha + 1.1, 0.005), S3(a, ha - 1.1, 0.005), S3(b, hb - 1.1, 0.005), S3(b, -hb + 1.1, 0.005)], c(Math.floor(a / 8) % 2 ? '#4a3420' : '#53391f'));   // the frames
      if (near) {
        if (Math.floor(a / 8) !== Math.floor(b / 8 - 1e-6)) { const z = Math.floor(b / 8) * 8; D.poly3(cam, [S3(z - 0.12, -ha + 1.1, 0.01), S3(z - 0.12, ha - 1.1, 0.01), S3(z + 0.12, ha - 1.1, 0.01), S3(z + 0.12, -ha + 1.1, 0.01)], '#1a1008'); }
        for (let z = Math.ceil(a / 1.6) * 1.6; z < b - 0.5; z += 1.6) for (const sd of [-1, 1]) { const x = sd * (HW(z) - 0.55); D.poly3(cam, [S3(z, x - 0.25, 0.01), S3(z, x + 0.25, 0.01), S3(z + 0.8, x + 0.25, 0.01), S3(z + 0.8, x - 0.25, 0.01)], '#e8d0a0', 0.85); }
      }
      const open = course.openAt((a + b) / 2);
      for (const sd of [-1, 1]) {
        if (open) {                                                 // no walls: the edge of the film, its thickness hanging over the drop, a line of light along it
          D.poly3(cam, [S3(a, sd * ha, 0), S3(b, sd * hb, 0), S3(b, sd * hb, -0.6), S3(a, sd * ha, -0.6)], c('#2a1c10'));
          line3(D, R, a, sd * (ha - 0.06), b, sd * (hb - 0.06), 0.012, 0.12, '#ffbf5a', 0.95);
          continue;
        }
        D.poly3(cam, [S3(a, sd * ha, 0), S3(b, sd * hb, 0), S3(b, sd * hb, 0.9), S3(a, sd * ha, 0.9)], c('#3a2814'), 1, [-sd, 0, 0]);
        line3(D, R, a, sd * ha, b, sd * hb, 0.9, 0.18, '#ffbf5a', 0.95);
      }
    }
    for (const o of holes) {                                       // a rift in time: the film torn, a glowing violet void under it
      const a = Math.max(za, o.z - o.hd), b = Math.min(zb, o.z + o.hd), x0 = o.x - o.hw, x1 = o.x + o.hw, w = x1 - x0;
      if (b <= a) continue;
      D.poly3(cam, [S3(a, x0, -0.3), S3(a, x1, -0.3), S3(b, x1, -0.3), S3(b, x0, -0.3)], '#3a1260');
      D.poly3(cam, [S3(a, x0 + w * 0.1, -0.29), S3(a, x1 - w * 0.1, -0.29), S3(b, x1 - w * 0.1, -0.29), S3(b, x0 + w * 0.1, -0.29)], '#b46aff', 0.45 + 0.25 * Math.sin(t * 6));
      for (const e of [o.z - o.hd, o.z + o.hd]) if (e >= za && e < zb) for (let j = 0; j < 9; j++) { const xa = x0 + j * w / 9; D.poly3(cam, [S3(e, xa, 0.02), S3(e, xa + w / 9, 0.02), S3(e + (j % 2 ? 0.5 : -0.5), xa + w / 18, 0.02)], '#ffcf6a', 0.9); }
    }
  }
  // the finish: a floor of light, the stands either side
  function plazaSlice(D, R, za, zb, near) {
    const { cam, S3, P3 } = R, ha = HW(za), hb = HW(zb), p = pulse();
    D.poly3(cam, [P3(za, -70, -0.05), P3(za, 70, -0.05), P3(zb, 70, -0.05), P3(zb, -70, -0.05)], C.void);
    D.poly3(cam, [S3(za, -ha, 0), S3(za, ha, 0), S3(zb, hb, 0), S3(zb, -hb, 0)], Math.floor(za / 4) % 2 ? C.ink : C.panel);
    if (near) for (let x = -Math.floor(ha); x <= ha; x += 2) line3(D, R, za, x, zb, x, 0.008, 0.05, C.line, 0.6);
    if (Math.floor(za / 4) !== Math.floor(zb / 4 - 1e-6)) { const z = Math.floor(zb / 4) * 4; cross(D, R, z, -ha, ha, 0.01, 0.12, C.orange, 0.4 + 0.6 * p); }
    for (const sd of [-1, 1]) line3(D, R, za, sd * (ha - 0.2), zb, sd * (hb - 0.2), 0.012, 0.3, C.orange, 1);
  }
  // the dark beneath the void's course: a grid of light far below, running off into the dark
  function gridFloor(D, R, za, zb, near) {
    const { cam } = R, ya = gy(za) - 30, yb = gy(zb) - 30, k = near ? 0 : fogK(R, (za + zb) / 2) * 0.9;
    const Qd = (x0, x1, col, a = 1, up = 0) => D.poly3(cam, [R.WF(za, x0, ya + up), R.WF(za, x1, ya + up), R.WF(zb, x1, yb + up), R.WF(zb, x0, yb + up)], col, a);
    Qd(-160, 160, fog('#040816', k, HAZES[0]));
    if (k < 0.8) for (let x = -150; x <= 150; x += 15) Qd(x - 0.12, x + 0.12, C.line, (x % 60 ? 0.3 : 0.6) * (1 - k));
    if (Math.floor(za / 15) !== Math.floor(zb / 15 - 1e-6)) { const z = Math.floor(zb / 15) * 15, y = gy(z) - 30 + 0.05; D.poly3(cam, [R.WF(z - 0.12, -160, y), R.WF(z - 0.12, 160, y), R.WF(z + 0.12, 160, y), R.WF(z + 0.12, -160, y)], C.line, 0.4 * (1 - k)); }
  }

  // ---- scenery
  function beam(D, R, b) {                                           // a beam of light rising out of the dark, flaring on the beat
    const k = fogK(R, b.z, b.x), X = R.wx(b.z, b.x), y0 = gy(b.z) - 30, p = pulse(4);
    D.poly3(R.cam, [[X - 0.2, y0, b.z], [X + 0.2, y0, b.z], [X + 0.05, y0 + b.h, b.z], [X - 0.05, y0 + b.h, b.z]], b.col, (0.25 + 0.5 * p) * (1 - k * 0.7));
    if (k < 0.6) glowDot(D, R, [X, y0 + b.h, b.z], 0.5, b.col, 0.3 + 0.5 * p);
  }
  function card(D, R, cd, k) {                                      // a card of a chart in wireframe, floating
    const { cam, t } = R, y = gy(cd.z) + cd.y + Math.sin(t * 0.8 + cd.bob) * 0.4, X = R.wx(cd.z, cd.x), w = cd.w, h = w * 0.66, a = 1 - k;
    const P = (u, v) => [X + (u - 0.5) * w, y + v * h, cd.z];
    const Qd = (u0, v0, u1, v1, col, al) => D.poly3(cam, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], col, al * a);
    Qd(0, 0, 1, 1, '#0a1838', 0.75);
    for (const [u0, v0, u1, v1] of [[0, 0, 1, 0.03], [0, 0.97, 1, 1], [0, 0, 0.02, 1], [0.98, 0, 1, 1]]) Qd(u0, v0, u1, v1, C.cyan, 0.8);
    if (k > 0.7) return;
    const r = rng(cd.seed);
    if (cd.kind === 1) for (let j = 0; j < 6; j++) { const v = 0.12 + r() * 0.62; Qd(0.1 + j * 0.14, 0.08, 0.2 + j * 0.14, 0.08 + v, j % 2 ? C.cyan : C.orange, 0.85); }
    else { let v0 = 0.2 + r() * 0.3; for (let j = 0; j < 8; j++) { const v1 = clamp(v0 + (r() - 0.4) * 0.22, 0.08, 0.78); D.poly3(cam, [P(0.08 + j * 0.105, v0), P(0.08 + (j + 1) * 0.105, v1), P(0.08 + (j + 1) * 0.105, v1 + 0.04), P(0.08 + j * 0.105, v0 + 0.04)], C.orange, a); v0 = v1; } }
  }
  function clockObj(D, R, ck) {                                      // a clock floating beside the film, its hands running backwards (or an hourglass)
    const { cam, t } = R, X = R.wx(ck.z, ck.x), Y = gy(ck.z) + ck.y, k = fogK(R, ck.z, ck.x), c = v => fog(v, k, HAZES[1]);
    if (ck.kind === 'glass') {
      const s = ck.r * 0.7, P = (dx, dy) => [X + dx * s, Y + dy * s, ck.z];
      D.poly3(cam, [P(-1, 1.6), P(1, 1.6), P(0.1, 0), P(-0.1, 0)], c('#e8d8b0'), 0.55); D.poly3(cam, [P(-0.1, 0), P(0.1, 0), P(1, -1.6), P(-1, -1.6)], c('#e8d8b0'), 0.55);
      for (const dy of [1.6, -1.6]) D.poly3(cam, [P(-1.25, dy - 0.15), P(1.25, dy - 0.15), P(1.25, dy + 0.15), P(-1.25, dy + 0.15)], c('#6a4422'));
      return;
    }
    const n = 20, P = (a, rr) => [X + Math.cos(a) * rr, Y + Math.sin(a) * rr, ck.z], face = [], f2 = [];
    for (let i = 0; i < n; i++) { face.push(P(i / n * 2 * PI, ck.r)); f2.push(P(i / n * 2 * PI, ck.r * 0.88)); }
    D.poly3(cam, face, c('#6a4422')); D.poly3(cam, f2, c('#f2e2c0'));
    for (const [len, sp, w] of [[0.55, 0.4, 0.07], [0.78, 4.8, 0.04]]) { const a = PI / 2 + t * sp * ck.sp; D.poly3(cam, [P(a + PI / 2, ck.r * w), P(a, ck.r * len), P(a - PI / 2, ck.r * w)], c('#2a1408')); }   // (anticlockwise: time running back)
  }
  function portal(D, R, z, label, col) {                              // a great frame across the way, its name on top
    const { P3 } = R, h = HW(z) + 1.2, y1 = 7.5;
    for (const sd of [-1, 1]) boxF(D, R, P3, z - 0.5, z + 0.5, sd * h - 0.6, sd * h + 0.6, 0, y1, { top: col, side: mixHex(col, '#000000', 0.35), front: col, back: col });
    boxF(D, R, P3, z - 0.5, z + 0.5, -h - 0.6, h + 0.6, y1, y1 + 1.4, { top: col, side: mixHex(col, '#000000', 0.35), front: col, back: col });
    text3(D, R, P3(z - 0.6, 0, y1 + 0.7), label, 1.0, '#ffffff', { far: 125, stroke: mixHex(col, '#000000', 0.4) });
  }
  // the rings of light in the air: each a hoop of orange round where she flies through it, arrows spinning in it
  function hoop(D, R, z, x, y, k) {
    const { cam, t } = R, X = R.wx(z, x), Y = gy(z) + y + 0.9, n = 28, r0 = 2.6, r1 = 2.15, p = pulse(), sp = t * 2 + k;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 2 * PI, a1 = (i + 1) / n * 2 * PI, P = (a, rr) => [X + Math.cos(a) * rr, Y + Math.sin(a) * rr, z];
      D.poly3(cam, [P(a0, r1), P(a1, r1), P(a1, r0), P(a0, r0)], i % 2 ? C.orange : C.amber, 0.85 + 0.15 * p);
    }
    const halo = []; for (let i = 0; i < n; i++) { const a = i / n * 2 * PI; halo.push([X + Math.cos(a) * (r0 + 0.7), Y + Math.sin(a) * (r0 + 0.7), z + 0.05]); }
    D.poly3(cam, halo, C.orange, 0.12 + 0.12 * p);
    for (let j = 0; j < 3; j++) { const a = sp + j * 2 * PI / 3, P = (u, v) => [X + Math.cos(a) * u - Math.sin(a) * v, Y + Math.sin(a) * u + Math.cos(a) * v, z - 0.02]; D.poly3(cam, [P(0.6, -0.35), P(1.5, 0), P(0.6, 0.35)], '#ffffff', 0.85); }
  }

  // ---- obstacles
  // the tube's: a block of data, a firewall across part of the tube, a blade sweeping round, a spike jabbing in and out
  function blockObs(D, R, o) {
    const { cam, S3 } = R, z = o.z, x = o.x, w = o.hw, h = o.h, p = pulse();
    boxS(D, R, z - o.hd, z + o.hd, x - w, x + w, 0, h, { top: '#1a3a8a', side: '#0e2050', front: '#14306e', back: '#14306e' });
    for (const [a, b] of [[x - w, x - w + 0.08], [x + w - 0.08, x + w]]) D.poly3(cam, [S3(z - o.hd - 0.01, a, 0), S3(z - o.hd - 0.01, b, 0), S3(z - o.hd - 0.01, b, h), S3(z - o.hd - 0.01, a, h)], C.cyan, 0.9);
    D.poly3(cam, [S3(z - o.hd - 0.01, x - w, h - 0.08), S3(z - o.hd - 0.01, x + w, h - 0.08), S3(z - o.hd - 0.01, x + w, h), S3(z - o.hd - 0.01, x - w, h)], C.cyan, 0.7 + 0.3 * p);
    text3(D, R, S3(z - o.hd - 0.05, x, h * 0.5), Math.floor(z * 7 + x) % 2 ? '1010' : '0110', 0.3, C.cyan, { far: 40 });
  }
  function fwObs(D, R, o) {                                         // a firewall: a panel of red light standing up off the tube's wall, in pieces round its curve
    const { cam, S3, t } = R, z = o.z, p = pulse(), n = Math.max(1, Math.ceil(o.hw * 2 / 1.25)), H = 1.9;   // (no taller than she is: the camera rides close over it in the tube)
    for (let i = 0; i < n; i++) {
      const a = o.x - o.hw + 2 * o.hw * i / n, b = o.x - o.hw + 2 * o.hw * (i + 1) / n;
      D.poly3(cam, [S3(z, a, 0), S3(z, b, 0), S3(z, b, H), S3(z, a, H)], C.up, 0.28 + 0.2 * p);
      D.poly3(cam, [S3(z - 0.01, a, H - 0.12), S3(z - 0.01, b, H - 0.12), S3(z - 0.01, b, H), S3(z - 0.01, a, H)], '#ffb0a0', 0.95);
      D.poly3(cam, [S3(z - 0.01, a, 0), S3(z - 0.01, b, 0), S3(z - 0.01, b, 0.1), S3(z - 0.01, a, 0.1)], '#ffb0a0', 0.95);
      for (let j = 1; j < 4; j++) { const y = (j / 4 * H + t * 1.2) % H; D.poly3(cam, [S3(z - 0.02, a, y), S3(z - 0.02, b, y), S3(z - 0.02, b, y + 0.05), S3(z - 0.02, a, y + 0.05)], '#ff7a6a', 0.6); }
    }
    for (const e of [o.x - o.hw, o.x + o.hw]) D.poly3(cam, [S3(z, e - 0.06, 0), S3(z, e + 0.06, 0), S3(z, e + 0.06, H), S3(z, e - 0.06, H)], '#ffffff', 0.9);
  }
  function bladeObs(D, R, o) {                                      // a scanning blade sweeping round the tube, low: hop it
    const { cam, S3 } = R, x = obX(o, R.rt), z = o.z;
    D.poly3(cam, [S3(z - 1.2, x - o.hw, 0.02), S3(z - 1.2, x + o.hw, 0.02), S3(z, x + o.hw, 0.02), S3(z, x - o.hw, 0.02)], C.amber, 0.25);
    boxS(D, R, z - o.hd, z + o.hd, x - o.hw, x + o.hw, 0, o.h, { top: '#ffffff', side: C.amber, front: C.orange, back: C.orange });
    glowDot(D, R, S3(z, x, o.h + 0.1), 0.35, C.amber, 0.8);
  }
  function spikeObs(D, R, o) {                                      // a spike of data jabbing up and down out of the wall: hop it, or pass while it is in
    const { cam, S3 } = R, u = obUp(o, R.rt), z = o.z, x = o.x, w = o.hw, H = 0.1 + (o.h + 0.4) * u;
    ring(D, R, z, x, 0.8, w + 0.4, u > 0.5 ? C.up : C.line, 0.4);
    D.poly3(cam, [S3(z, x - w, 0), S3(z, x + w, 0), S3(z, x, H)], u > 0.5 ? C.orange : C.line, 0.95);
    D.poly3(cam, [S3(z - o.hd, x, 0), S3(z + o.hd, x, 0), S3(z, x, H)], u > 0.5 ? C.amber : C.line, 0.9);
  }
  const PRICES = ['成交 1,280萬', '每坪 52.3萬', '成交 2,150萬', '每坪 61.8萬', '成交 980萬', '每坪 47.5萬'];
  function tagObs(D, R, o) {                                        // a board of a sale price on two legs, low: hop it
    const { S3 } = R, z = o.z, x = o.x, w = o.hw, h = o.h;
    ring(D, R, z, x, 0.9, w + 0.6, C.orange, 0.3);
    for (const sd of [-1, 1]) boxS(D, R, z - 0.06, z + 0.06, x + sd * (w - 0.15) - 0.06, x + sd * (w - 0.15) + 0.06, 0, h * 0.4, { top: '#8a92ac', side: '#5a6280', front: '#6a7290' });
    boxS(D, R, z - o.hd * 0.4, z + o.hd * 0.4, x - w, x + w, h * 0.35, h, { top: '#ffffff', side: '#c8d0e4', front: '#f4f8ff', back: '#f4f8ff' });
    D.poly3(R.cam, [S3(z - o.hd * 0.4 - 0.01, x - w, h - 0.12), S3(z - o.hd * 0.4 - 0.01, x + w, h - 0.12), S3(z - o.hd * 0.4 - 0.01, x + w, h), S3(z - o.hd * 0.4 - 0.01, x - w, h)], C.orange);
    text3(D, R, S3(z - o.hd * 0.4 - 0.05, x, h * 0.62), PRICES[Math.abs(Math.round(z * 3 + x)) % PRICES.length], Math.min(0.32, w * 0.2), C.navy, { far: 45 });
  }
  function pinObs(D, R, o) {                                        // a map pin standing on the ribbon: go round
    const { cam, S3 } = R, z = o.z, x = o.x, r = o.hw + 0.35, Y = 2.5;
    ring(D, R, z, x, 0.7, 0.9, C.up, 0.3);
    D.poly3(cam, [S3(z, x - r * 0.75, Y - r * 0.4), S3(z, x + r * 0.75, Y - r * 0.4), S3(z, x, 0)], '#d42f2f');
    disc(D, R, S3(z, x, Y), r, '#ff4a4a');
    disc(D, R, S3(z - 0.05, x, Y), r * 0.42, '#ffffff');
  }
  function dotObs(D, R, o) {                                        // a point of the chart on its stalk, bobbing up and down: hop it, or pass while it is down
    const u = obUp(o, R.rt), z = o.z, x = o.x, w = o.hw, H = 0.2 + (o.h - 0.2) * u, col = u > 0.5 ? C.orange : C.line;
    ring(D, R, z, x, 0.9, w + 0.6, col, 0.25 + 0.2 * u);
    D.poly3(R.cam, [R.S3(z, x - 0.06, 0), R.S3(z, x + 0.06, 0), R.S3(z, x + 0.06, H), R.S3(z, x - 0.06, H)], '#ffffff', 0.9);
    disc(D, R, R.S3(z, x, H), w * 0.7, col);
    disc(D, R, R.S3(z - 0.05, x, H), w * 0.4, '#ffffff');
  }
  function tickerObs(D, R, o) {                                     // a price board sliding to and fro across the ribbon, its number ticking: hop it
    const x = obX(o, R.rt), z = o.z, w = o.hw, up = Math.sin(R.rt * 3 + z) > 0;
    ring(D, R, z, x, 0.8, w + 0.5, up ? C.up : C.down, 0.3);
    boxS(D, R, z - o.hd, z + o.hd, x - w, x + w, 0, o.h, { top: '#ffffff', side: '#8a92ac', front: '#0a1838', back: '#0a1838' });
    text3(D, R, R.S3(z - o.hd - 0.05, x, o.h * 0.5), (up ? '▲' : '▼') + (100 + Math.floor((R.rt * 7 + z) % 60)), 0.32, up ? '#ff8a7a' : '#6ae0a0', { far: 50 });
  }
  function tipObs(D, R, o) {                                        // over the valley: a big green arrow pointing down, hung low: duck
    const { cam, P3 } = R, lift = R.CO.liftAt(o.z, o.x), Q2 = (x, y) => P3(o.z, x, y + lift), y = o.y0 + 0.05;
    D.poly3(cam, [Q2(o.x - 1.1, y + 1.05), Q2(o.x + 1.1, y + 1.05), Q2(o.x + 1.1, y + 0.5), Q2(o.x + 2.0, y + 0.5), Q2(o.x, y), Q2(o.x - 2.0, y + 0.5), Q2(o.x - 1.1, y + 0.5)], C.down);
    for (const x of [o.x - 2.4, o.x + 2.4]) D.poly3(cam, [Q2(x - 0.04, y + 1.05), Q2(x + 0.04, y + 1.05), Q2(x + 0.04, 4.6), Q2(x - 0.04, 4.6)], '#3a5a4a');
    D.poly3(cam, [Q2(o.x - 2.6, y + 1.0), Q2(o.x + 2.6, y + 1.0), Q2(o.x + 2.6, y + 1.08), Q2(o.x - 2.6, y + 1.08)], C.down, 0.8);
    duckHint(D, R, o.z, [o.x - 1.6, o.x + 1.6], y - 0.25 + lift);
  }
  function forkObs(D, R, o) {                                       // the nose of the fork: 漲 one way, 跌 the other
    const { cam, P3 } = R;
    boxF(D, R, P3, o.z - o.hd, o.z + o.hd, o.x - o.hw, o.x + o.hw, 0, 3, { top: '#1a2a5a', side: '#0e1838', front: '#14224a' });
    D.poly3(cam, [P3(o.z - 0.1, -4.2, 3.4), P3(o.z - 0.1, 4.2, 3.4), P3(o.z - 0.1, 4.2, 5), P3(o.z - 0.1, -4.2, 5)], '#0a1430');
    for (const y of [3.4, 4.95]) D.poly3(cam, [P3(o.z - 0.11, -4.2, y), P3(o.z - 0.11, 4.2, y), P3(o.z - 0.11, 4.2, y + 0.06), P3(o.z - 0.11, -4.2, y + 0.06)], C.orange);
    text3(D, R, P3(o.z - 0.3, -2.1, 4.2), '漲 ▲', 0.9, C.up, { far: 110 });
    text3(D, R, P3(o.z - 0.3, 2.1, 4.2), '▼ 跌', 0.9, C.down, { far: 110 });
  }
  function numObs(D, R, o) {                                        // a number falling out of the sky on to its ring (it lands as she gets there): go round
    const { cam, S3 } = R, k = clamp((o.z - R.sz) / 26), y = 40 * k * k, txt = (Math.floor(o.z) % 3 ? '+' : '-') + (1 + (Math.floor(o.z * 7) % 9)) + '.' + (Math.floor(o.z * 3) % 10) + '%';
    ring(D, R, o.z, o.x, 1.4, o.hw + 0.7, C.up, 0.35 + 0.3 * (1 - k));
    const q = D.toCam(cam, S3(o.z, o.x, 1.2 + y));
    if (q[2] < 1) return;
    text3(D, R, S3(o.z, o.x, 1.2 + y), txt, 1.5, txt[0] === '+' ? C.up : C.down, { far: 125, stroke: '#ffffff' });
    if (k > 0.05) D.poly3(cam, [S3(o.z, o.x - 0.3, 2 + y), S3(o.z, o.x + 0.3, 2 + y), S3(o.z, o.x, 2 + y + 6)], '#ffffff', 0.3);
  }
  function hourglassObs(D, R, o) {                                  // an hourglass as tall as she is: go round
    const { cam, S3, t } = R, z = o.z, x = o.x, w = o.hw, H = 2.8;
    for (const y of [0, H - 0.2]) boxS(D, R, z - 0.6, z + 0.6, x - w - 0.2, x + w + 0.2, y, y + 0.2, { top: '#8a5a2a', side: '#5a3a18', front: '#6a4422' });
    D.poly3(cam, [S3(z - 0.45, x - w, H - 0.2), S3(z - 0.45, x + w, H - 0.2), S3(z - 0.45, x + 0.1, H / 2), S3(z - 0.45, x - 0.1, H / 2)], '#fff4dc', 0.5);
    D.poly3(cam, [S3(z - 0.45, x - 0.1, H / 2), S3(z - 0.45, x + 0.1, H / 2), S3(z - 0.45, x + w, 0.2), S3(z - 0.45, x - w, 0.2)], '#fff4dc', 0.5);
    const f = 0.5 + 0.4 * Math.sin(t * 0.7 + z);
    D.poly3(cam, [S3(z - 0.46, x - w * f, 0.2 + (H / 2 - 0.2) * (1 - f)), S3(z - 0.46, x + w * f, 0.2 + (H / 2 - 0.2) * (1 - f)), S3(z - 0.46, x + w, 0.2), S3(z - 0.46, x - w, 0.2)], '#e0a040');
  }
  function calendarObs(D, R, o) {                                   // a desk calendar lying in the way, its date flipping back: hop it
    const { cam, S3, t } = R, z = o.z, x = o.x, w = o.hw, h = o.h;
    ring(D, R, z, x, 0.9, w + 0.6, '#ffbf5a', 0.25);
    boxS(D, R, z - o.hd, z + o.hd, x - w, x + w, 0, h, { top: '#f6ecd6', side: '#b89a6a', front: '#f6ecd6', back: '#f6ecd6' });
    D.poly3(cam, [S3(z - o.hd - 0.01, x - w, h - 0.25), S3(z - o.hd - 0.01, x + w, h - 0.25), S3(z - o.hd - 0.01, x + w, h), S3(z - o.hd - 0.01, x - w, h)], C.up);
    text3(D, R, S3(z - o.hd - 0.05, x, h * 0.42), String(28 - (Math.floor(t * 3 + z) % 27)), 0.5, '#2a1a10', { far: 60 });
  }
  function handObs(D, R, o) {                                       // a clock's hand lying on the film, sweeping back and forth across it: hop it
    const { cam, S3 } = R, x = obX(o, R.rt), z = o.z, L = 3.2;
    D.poly3(cam, [S3(z, x - L, 0.02), S3(z - 0.35, x + L * 0.7, 0.02), S3(z, x + L, 0.02), S3(z + 0.35, x + L * 0.7, 0.02)], '#ffbf5a', 0.35);
    boxS(D, R, z - 0.2, z + 0.2, x - L, x + L * 0.6, 0, o.h, { top: '#2a1408', side: '#1a0c04', front: '#3a1e0c', back: '#3a1e0c' });
    D.poly3(cam, [S3(z - 0.21, x + L * 0.6, 0), S3(z - 0.21, x + L, o.h * 0.5), S3(z - 0.21, x + L * 0.6, o.h)], '#3a1e0c');
  }
  function bannerObs(D, R, o) {                                     // a long banner with a year on it, hung low across the film: duck
    const { cam, P3 } = R, a = o.x - o.hw, b = o.x + o.hw, y = o.y0 + 0.05;   // (all of it, wherever across it hangs)
    D.poly3(cam, [P3(o.z, a, y), P3(o.z, b, y), P3(o.z, b, y + 0.8), P3(o.z, a, y + 0.8)], '#7a1e14');
    for (const yy of [y + 0.05, y + 0.7]) D.poly3(cam, [P3(o.z - 0.01, a, yy), P3(o.z - 0.01, b, yy), P3(o.z - 0.01, b, yy + 0.05), P3(o.z - 0.01, a, yy + 0.05)], C.gold);
    for (const x of [a + 0.4, b - 0.4]) D.poly3(cam, [P3(o.z, x - 0.04, y + 0.8), P3(o.z, x + 0.04, y + 0.8), P3(o.z, x + 0.04, 4.0), P3(o.z, x - 0.04, 4.0)], '#4a2a12');
    text3(D, R, P3(o.z - 0.05, o.x, y + 0.42), `${YEAR(o.z)} 年`, 0.55, C.gold, { far: 70 });
    duckHint(D, R, o.z, [o.x - 2, o.x + 2], y - 0.25);
  }
  // ---- the website (④): the real one, under the canvas (js/site.js), scrolled as she rides down it; the void of data
  // over it fading away once the camera is right round over her (FADE: how much of the void still shows)
  const inWeb = z => z > WEB[0] - 40 && z < WEB[1] + 40;
  const pageA = z => smooth(seg(course.pageK(z), 0.88, 1));
  const pageOf = z => { let i = 0; while (i < PAGES.length - 1 && z >= PAGES[i + 1][0]) i++; return i; };
  let FADE = 1, ASKED = false, WARMED = false;
  function showPage(R) {
    const S = root.SkiSite;
    if (!S || S.demo) { FADE = 1; return; }                      // (skied behind the map cards: fetching and laying out the site there stalled the cards for seconds; it comes with the race)
    if (!ASKED) { ASKED = true; for (const p of PAGES) S.load(S.layout() === 'phone' ? p[2] : p[1]); }   // (fetched as the map starts, long before they are needed)
    const L = S.layout() === 'phone' ? 2 : 1, at = R.sz < PAGES[0][0] ? -1 : pageOf(R.sz);
    for (let j = at + 1; j < PAGES.length; j++) S.ready(PAGES[j][L]);   // (the pages to come: drawn under what is in front from the start of the race, as they come in; drawn first later, each cost a stutter)
    warmType(S);
    const a = pageA(R.sz);
    if (a <= 0) { FADE = 1; return; }
    const i = pageOf(R.sz), p = PAGES[i];
    FADE = S.show(p[L], (R.sz - p[0]) * S.width() / PAGE_W) ? 1 - a : 1;   // (the page scrolled as far down as she has come since it opened; not in yet: the void stays)
  }
  function warmType(S) {                                        // (the site's type in the canvas, set once before it is needed: the first time costs)
    if (WARMED || !S.font() || typeof document === 'undefined') return;
    WARMED = true;
    const g = document.createElement('canvas').getContext('2d'), all = [...POPS.flat(), ...PAGES.map(p => p[3]), ...COOKIE, '已加入收藏 ✓ ✕ → 前往「」'].join('');
    for (const w of [400, 500, 600, 700, 800]) { g.font = font(w, 20); g.fillText(all, 0, 20); }
  }
  // before the first race, behind the loading screen (main.js 'prep'): the site's pages fetched, laid out and run down
  // once, which stalls for seconds; doing it as the map's card came up (its demo run) or in the countdown froze them.
  // 0..1; look: only how far it has got
  function prep(look) {
    const S = root.SkiSite;
    if (!S || typeof document === 'undefined') return 1;
    const L = S.layout() === 'phone' ? 2 : 1;
    let k = 0;
    for (const p of PAGES) { if (!look) S.ready(p[L]); k += S.progress(p[L]); }
    if (!look && k >= PAGES.length) warmType(S);
    return k / PAGES.length;
  }

  // what pops up over the page, drawn flat on it in the site's own manner (its type, its colours), in pixels of a page
  // PX to the unit, exactly as big as it is to hit; it shows as the camera comes round over her
  const PX = 60, INK = '#1a2340', SUB = '#64748b', LINE = '#e2e8f0', CTA = '#c2410c';
  const font = (w, n) => `${w} ${n}px ${(root.SkiSite && root.SkiSite.font()) || "'IBM Plex Sans', 'Noto Sans TC', sans-serif"}`;
  function onPage(D, R, z, x, fn) {
    const a = R.cam.page !== undefined ? clamp((R.cam.page - 0.5) * 2) : R.sz > WEB[0] - 30 ? 1 : 0;   // (not yet round: none of it, nor from further back)
    if (a <= 0) return;
    const P = (zz, xx) => { const q = D.toCam(R.cam, R.S3(zz, xx, 0.02)); return q[2] > 0.5 ? D.scr(R.cam, q) : null; };
    const o = P(z, x), ex = P(z, x - 1), ey = P(z + 1, x);          // (across the screen: from above, turned round, -x is to the right)
    if (!o || !ex || !ey) return;
    const g = D.ctx; g.save(); g.globalAlpha *= a;
    g.transform((ex[0] - o[0]) / PX, (ex[1] - o[1]) / PX, (ey[0] - o[0]) / PX, (ey[1] - o[1]) / PX, o[0], o[1]);
    fn(g); g.restore();
  }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) {
    g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  function txt(g, str, x, y, f, col, align = 'left') { g.font = f; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(str, x, y); }
  const POPS = [['訂閱數讀週報', '每週一封，看懂房市正在發生什麼', '立即訂閱', '稍後'], ['登入以收藏圖表', '登入後就能收藏、留言、追蹤更新', '登入', '註冊'], ['允許顯示通知？', '有新文章時第一時間通知你', '允許', '不用了']];
  function popupObs(D, R, o) {                                        // a box over the page, asking something of her: go round
    const [title, line, yes, no] = POPS[Math.abs(Math.round(o.z / 7 + o.x)) % POPS.length];
    onPage(D, R, o.z, o.x, g => {
      const w = o.hw * PX, h = o.hd * PX, n = Math.min(1, w / 190);
      rr(g, -w + 8, -h + 14, 2 * w, 2 * h, 16, 'rgba(15,23,42,0.13)'); rr(g, -w + 3, -h + 5, 2 * w, 2 * h, 16, 'rgba(15,23,42,0.1)');   // (its shadow: raised off the page)
      rr(g, -w, -h, 2 * w, 2 * h, 16, '#ffffff', LINE);
      rr(g, -w, -h, 2 * w, 7, [16, 16, 0, 0], CTA);
      txt(g, title, -w + 26, -h + 46, font(700, Math.round(26 * n)), INK);
      txt(g, '✕', w - 28, -h + 40, font(500, 24), SUB, 'center');
      txt(g, line, -w + 26, -h + 84, font(400, Math.round(16 * n)), SUB);
      rr(g, -w + 26, h - 62, 132 * n, 42, 21, CTA); txt(g, yes, -w + 26 + 66 * n, h - 41, font(700, Math.round(17 * n)), '#ffffff', 'center');
      rr(g, -w + 40 + 132 * n, h - 62, 110 * n, 42, 21, '#ffffff', '#f3b89a'); txt(g, no, -w + 40 + 187 * n, h - 41, font(600, Math.round(17 * n)), CTA, 'center');
    });
  }
  const COOKIE = ['🍪 本網站使用 Cookie 以提供更好的瀏覽體驗　', '我們使用 Cookie 讓網站更好用。', '接受'];
  function cookieObs(D, R, o) {                                       // a bar about cookies across the page (one piece of it either side of its gap)
    const right = o.x < 0;                                            // (the piece to the right on the screen holds the button, by the gap)
    onPage(D, R, o.z, o.x, g => {
      const w = o.hw * PX, h = o.hd * PX;
      rr(g, -w + 4, -h + 10, 2 * w, 2 * h, 12, 'rgba(15,23,42,0.18)');
      rr(g, -w, -h, 2 * w, 2 * h, 12, '#1e293b');
      g.save(); g.beginPath(); g.rect(-w, -h, 2 * w, 2 * h); g.clip();
      if (right) { rr(g, -w + 18, -20, 96, 40, 20, '#f97316'); txt(g, COOKIE[2], -w + 66, 0, font(700, 17), '#ffffff', 'center'); txt(g, COOKIE[1], -w + 134, 0, font(400, 17), '#e2e8f0'); }
      else txt(g, COOKIE[0], w - 18, 0, font(500, 17), '#e2e8f0', 'right');
      g.restore();
    });
  }
  function toastObs(D, R, o) {                                        // a toast sliding to and fro across the page: hop it
    onPage(D, R, o.z, obX(o, R.rt), g => {
      const w = o.hw * PX, h = o.hd * PX;
      rr(g, -w + 3, -h + 6, 2 * w, 2 * h, h, 'rgba(15,23,42,0.18)');
      rr(g, -w, -h, 2 * w, 2 * h, h, '#111827');
      g.fillStyle = '#22c55e'; g.beginPath(); g.arc(-w + h, 0, h * 0.55, 0, 7); g.fill();
      txt(g, '✓', -w + h, 1, font(800, 18), '#ffffff', 'center');
      txt(g, '已加入收藏', -w + h * 2 + 6, 0, font(600, 19), '#ffffff');
    });
  }
  function pointerObs(D, R, o) {                                      // the mouse pointer, sweeping across the page: hop it
    onPage(D, R, o.z, obX(o, R.rt), g => {
      const w = o.hw * PX, h = o.hd * PX, A = [[0, 0], [0, 0.78], [0.2, 0.6], [0.36, 1], [0.5, 0.94], [0.34, 0.56], [0.62, 0.56]];
      const pts = A.map(([u, v]) => [-w * 0.6 + u * w * 2, -h + v * h * 2]);
      g.fillStyle = 'rgba(15,23,42,0.2)'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x + 6, y + 8) : g.moveTo(x + 6, y + 8))); g.closePath(); g.fill();
      g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#000000'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
    });
  }
  function spinnerObs(D, R, o) {                                      // a loading spinner coming up over the page and going: hop it, or pass while it is gone
    const u = obUp(o, R.rt);
    onPage(D, R, o.z, o.x, g => {
      const r = o.hw * PX * 0.82 * (0.55 + 0.45 * u);
      g.lineCap = 'round';
      if (u < 0.15) { g.setLineDash([6, 8]); g.strokeStyle = 'rgba(100,116,139,0.45)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, o.hw * PX * 0.82, 0, 7); g.stroke(); g.setLineDash([]); return; }
      g.globalAlpha *= 0.3 + 0.7 * u;
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(0, 0, r + 10, 0, 7); g.fill();
      g.strokeStyle = LINE; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, r - 4, 0, 7); g.stroke();
      const a = R.t * 7; g.strokeStyle = '#f97316'; g.beginPath(); g.arc(0, 0, r - 4, a, a + 1.9); g.stroke();
    });
  }
  function linkChip(D, R, i) {                                        // the link to the next page, on the page across the way: she rides over it, clicking it (gone with its page)
    const z = PAGES[i][0] - 3;
    onPage(D, R, z, 0, g => {
      const w = 7 * PX, h = 0.95 * PX, hov = R.sz > z - 6 && R.sz < z + 4;
      rr(g, -w, -h, 2 * w, 2 * h, h, hov ? '#fff1e6' : '#ffffff', '#f97316', 3);
      txt(g, `前往「${PAGES[i][3]}」 →`, 0, 0, font(700, 30), CTA, 'center');
      g.save(); g.translate(w - 70, 10); g.fillStyle = '#ffffff'; g.strokeStyle = '#000000'; g.lineWidth = 3; g.lineJoin = 'round';   // (a hand pointer over it)
      g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 10); g.lineTo(-10, 2); g.lineTo(-16, 8); g.lineTo(-2, 30); g.lineTo(22, 30); g.lineTo(26, 6); g.lineTo(8, 0); g.lineTo(8, -20); g.quadraticCurveTo(4, -28, 0, -20); g.closePath(); g.fill(); g.stroke();
      g.restore();
    });
  }
  function launchPad(D, R, r, col, side, arrow) {                   // a launch ramp of the theme's own
    const { cam } = R, n = 4;
    for (let k = 0; k < n; k++) {
      const za = r.z + r.len * k / n, zb = r.z + r.len * (k + 1) / n, ya = r.rise * k / n, yb = r.rise * (k + 1) / n, p = (z, x, y) => R.S3(z, x, y);
      for (const sd of [-1, 1]) D.poly3(cam, [p(za, r.x + sd * r.hw, 0), p(zb, r.x + sd * r.hw, 0), p(zb, r.x + sd * r.hw, yb), p(za, r.x + sd * r.hw, ya)], side);
      D.poly3(cam, [p(za, r.x - r.hw, ya), p(za, r.x + r.hw, ya), p(zb, r.x + r.hw, yb), p(zb, r.x - r.hw, yb)], col);
      if (k % 2) D.poly3(cam, [p(za, r.x - r.hw * 0.6, ya + 0.02), p(zb, r.x, yb + 0.02), p(za, r.x + r.hw * 0.6, ya + 0.02), p(za + 0.3, r.x, ya + 0.02)], arrow);
    }
  }
  function tickGate(D, R, z, label, col) {                           // a tick on the chart's time axis: two posts of light, its label over them (in the gate's plane: it turns with it)
    const { P3 } = R, h = HW(z) + 0.4, y1 = 4.4;
    for (const sd of [-1, 1]) D.poly3(R.cam, [P3(z, sd * h - 0.1, 0), P3(z, sd * h + 0.1, 0), P3(z, sd * h + 0.1, y1), P3(z, sd * h - 0.1, y1)], col, 0.9);
    D.poly3(R.cam, [P3(z, -h, y1 - 0.08), P3(z, h, y1 - 0.08), P3(z, h, y1 + 0.08), P3(z, -h, y1 + 0.08)], col, 0.9);
    D.print(R.cam, P3(z - 0.02, -h, y1 + 1.1), P3(z - 0.02, h, y1 + 1.1), P3(z - 0.02, -h, y1 + 0.15), label, { w: 2 * h, h: 0.95, stroke: col, fill: 0.75 });
  }
  function bigClock(g, x, y, r, t) {                                 // the clock face over the past, running backwards
    g.save(); g.globalAlpha = 0.35;
    g.fillStyle = '#f2e2c0'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = '#6a4422'; g.lineWidth = r * 0.05; g.stroke();
    g.lineWidth = r * 0.04; g.lineCap = 'round';
    for (const [len, sp] of [[0.5, 0.3], [0.75, 3]]) { const a = -PI / 2 - t * sp; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * len, y + Math.sin(a) * r * len); g.stroke(); }
    g.restore();
  }
  // a wireframe pie, turning slowly, far off in the void
  function wirePie(g, x, y, r, t, col) {
    g.save(); g.strokeStyle = col; g.lineWidth = 3; g.globalAlpha = 0.5;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.55, 0, 7); g.stroke();
    for (const f of [0, 0.31, 0.55, 0.78]) { const a = t * 0.1 + f * 2 * PI; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    g.restore();
  }

  const SKIES = [
    { top: '#010208', mid: '#040a1c', low: '#0a1638', glow: '#ff5a1a' },   // the void of data
    { top: '#2a1608', mid: '#7a4a22', low: '#d8a060', glow: '#ffe0a0' },   // the past
  ];
  const skyMix = z => {                                              // which sky, and how far into the next (over 40 either side of a change)
    const at = [[CRASH_END + 12, 0, 1], [TURN2[1] + 14, 1, 0]];
    for (const [e, a, b] of at) if (z < e + 20) return z < e - 20 ? [a, a, 0] : [a, b, smooth(seg(z, e - 20, e + 20))];
    return [0, 0, 0];
  };
  const SKYC = new Map();
  function skyCols(z) {
    const [a, b, k] = skyMix(z), q = Math.round(k * 12), key = a * 100 + b * 10 + q / 100;
    let v = SKYC.get(key);
    if (!v) { v = {}; for (const n of ['top', 'mid', 'low', 'glow']) v[n] = q ? mixHex(SKIES[a][n], SKIES[b][n], q / 12) : SKIES[a][n]; SKYC.set(key, v); }
    return v;
  }

  // ---- the finish: 數讀房市 itself. Past the finish its logo stands in the void as big as a building (the site's own,
  // in its dark colours: assets/site/logo_dark.svg), on dark glass framed in light that beats with the music, held up on
  // two beams of light; screens of charts hang either side behind the stands (made-up figures, as every curve the game
  // draws itself)
  const LOGO = { z: FINISH + 62, w: 46 };
  const LOGO_IMG = (() => {
    if (typeof Image === 'undefined') return null;
    const im = new Image(), o = { cv: im, w: 0, h: 0 };
    im.onload = () => { o.w = im.naturalWidth || 1460; o.h = im.naturalHeight || 420; };
    im.src = 'assets/site/logo_dark.svg';
    return o;
  })();
  const SCREENS = (() => {
    const r = rng(3030), out = [];
    for (const sd of [-1, 1]) for (const z of [FINISH - 40, FINISH - 18, FINISH + 6]) {
      const v = []; let x = 0.3 + r() * 0.2;
      for (let k = 0; k < 8; k++) { x = clamp(x + (r() - 0.4) * 0.25, 0.1, 0.95); v.push(x); }
      out.push({ z, x: sd * 16, sd, v, kind: r() < 0.5 ? 'bars' : 'line', col: r() < 0.5 ? C.orange : C.cyan, y: 3.5 + r() * 2.5 });
    }
    return out;
  })();
  function logoMonument(D, R) {
    const { cam } = R, z = LOGO.z, y = gy(z), w = LOGO.w, h = w * 210 / 730, y0 = y + 20, f = z - 0.05, p = pulse(4);   // (high: over the finish arch's floating name, seen from before it)
    for (const sd of [-1, 1]) {                                    // the beams holding it up
      const X = sd * w * 0.3;
      D.poly3(cam, [[X - 1.2, y, z + 0.5], [X + 1.2, y, z + 0.5], [X + 0.5, y0, z + 0.5], [X - 0.5, y0, z + 0.5]], C.orange, 0.18 + 0.12 * p);
      D.poly3(cam, [[X - 0.15, y, z + 0.45], [X + 0.15, y, z + 0.45], [X + 0.15, y0, z + 0.45], [X - 0.15, y0, z + 0.45]], C.amber, 0.9);
    }
    const m = 1.6, fr = (x0, y0_, x1, y1, col, a) => D.poly3(cam, [[x0, y0_, f], [x1, y0_, f], [x1, y1, f], [x0, y1, f]], col, a);
    fr(-w / 2 - m - 0.6, y0 - m - 0.6, w / 2 + m + 0.6, y0 + h + m + 0.6, C.orange, 0.25 + 0.35 * p);   // (the frame of light, beating)
    fr(-w / 2 - m, y0 - m, w / 2 + m, y0 + h + m, C.ink, 0.92);
    D.printImg(cam, [-w / 2, y0 + h, f - 0.02], [w / 2, y0 + h, f - 0.02], [-w / 2, y0, f - 0.02], LOGO_IMG, { w, h, fill: 0.96 });
  }
  function screen(D, R, s) {                                       // a chart on a screen of light, facing the course
    const { cam } = R, X = R.wx(s.z, s.x) - s.sd * 0.02, z0 = s.z, z1 = s.z + 9, y = gy(s.z + 4.5), y0 = y + s.y, y1 = y0 + 5.4, n = [-s.sd, 0, 0];
    const P = (u, v, dx = 0) => [X - s.sd * dx, lerp(y0, y1, v), lerp(z0, z1, u)];
    D.poly3(cam, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], C.panel, 0.88, n);
    D.poly3(cam, [P(0, 0, 0.01), P(1, 0, 0.01), P(1, 0.03, 0.01), P(0, 0.03, 0.01)], s.col, 1, n);
    D.poly3(cam, [P(0, 0.97, 0.01), P(1, 0.97, 0.01), P(1, 1, 0.01), P(0, 1, 0.01)], s.col, 1, n);
    const N = s.v.length;
    if (s.kind === 'bars') for (let k = 0; k < N; k++) { const u0 = 0.08 + k * 0.84 / N, u1 = u0 + 0.84 / N * 0.6; D.poly3(cam, [P(u0, 0.1, 0.02), P(u1, 0.1, 0.02), P(u1, 0.1 + s.v[k] * 0.78, 0.02), P(u0, 0.1 + s.v[k] * 0.78, 0.02)], k === N - 1 ? C.amber : s.col, 0.9, n); }
    else for (let k = 0; k < N - 1; k++) {                         // a line, thick enough to read from the course
      const ua = 0.08 + k * 0.84 / (N - 1), ub = 0.08 + (k + 1) * 0.84 / (N - 1), va = 0.1 + s.v[k] * 0.78, vb = 0.1 + s.v[k + 1] * 0.78;
      D.poly3(cam, [P(ua, va - 0.03, 0.02), P(ub, vb - 0.03, 0.02), P(ub, vb + 0.03, 0.02), P(ua, va + 0.03, 0.02)], s.col, 1, n);
    }
  }

  const GOAL_SIGN = 'GOAL 數讀房市';                             // (on the finish arch: where the long way down arrives)
  const theme = {
    spray: ['#ff9a4a', '#ffd0a0', '#4ad8ff'], trail: '#ff7a2a', light: { col: '#ff6a1a', w: 0.32, k: z => 1 - 0.8 * pageA(z) },   // (faint over the website) ski: ['#ff6a1a', '#ffd0a0', '#4ad8ff'],
    boost: { pad: '#ff6a1a', glow: '#ffb08a', arrow: '#ffffff' },
    kicker: { side: '#0e1838', top: '#1a2a5a', edge: '#ff6a1a' },
    mirror: { frame: { rim: '#b8892a', glint: '#ffffff', stem: '#7a5a1a' } },
    sky(R) {
      const D = root.SkiDraw, Wd = D.W, H = D.H, g = D.ctx, { hz, pan, zc, t } = R, S = skyCols(zc), L = LOOK(zc), roll = R.roll || 0;
      if (!R.mirror) {
        theme.camZ = zc; theme.herZ = R.sz; theme.roll = roll; theme.cy = R.cam.cy;
        showPage(R);
        const b = root.SkiAudio && root.SkiAudio.beat ? root.SkiAudio.beat() : null; BEAT = b === null ? t * 140 / 60 : b;
      }
      if (!R.mirror && FADE < 1) { g.clearRect(-Wd, -H, Wd * 3, H * 3); if (FADE <= 0) return; }   // (over the website: see-through, the void fading off it)
      g.save();
      if (!R.mirror && FADE < 1) g.globalAlpha = FADE;
      if (roll) { g.translate(Wd / 2, R.cam.cy); g.rotate(roll); g.translate(-Wd / 2, -R.cam.cy); }
      const X0 = -Wd, XW = Wd * 3;
      const gr = g.createLinearGradient(0, hz - 640, 0, hz + 4);
      gr.addColorStop(0, S.top); gr.addColorStop(0.55, S.mid); gr.addColorStop(0.92, S.low); gr.addColorStop(1, S.glow);
      g.fillStyle = S.top; g.fillRect(X0, hz - 3000, XW, 3000 - 640);
      g.fillStyle = gr; g.fillRect(X0, hz - 640, XW, 644);
      g.fillStyle = L === 0 ? '#02040c' : S.low; g.fillRect(X0, hz + 4, XW, 3 * H);
      if (!R.mirror && L === 0) {                                    // the void: stars of data, a grid across the sky, wireframe pies far off, the horizon pulsing
        const rs = rng(9), p = pulse(4);
        for (let k = 0; k < 70; k++) { const x = ((rs() * XW + pan * 0.08) % XW + XW) % XW + X0, y = hz - 40 - rs() * 1200; D.rect(x, y, 3, 3, k % 5 ? '#ffffff' : C.orange, 0.2 + 0.4 * Math.abs(Math.sin(t * 1.1 + k))); }
        g.strokeStyle = 'rgba(74,120,255,0.13)'; g.lineWidth = 2;
        for (let k = -8; k <= 8; k++) { const x = Wd / 2 + pan * 0.5 + k * 240; g.beginPath(); g.moveTo(x, hz - 900); g.lineTo(x, hz); g.stroke(); }
        for (let k = 1; k < 7; k++) { const y = hz - k * 120; g.beginPath(); g.moveTo(X0, y); g.lineTo(X0 + XW, y); g.stroke(); }
        wirePie(g, Wd / 2 + pan + 0.6 * 900, hz - 380, 170, t, C.cyan); wirePie(g, Wd / 2 + pan - 0.9 * 900, hz - 300, 120, -t, C.orange);
        const hg = g.createLinearGradient(0, hz - 40, 0, hz + 30); hg.addColorStop(0, 'rgba(255,106,26,0)'); hg.addColorStop(0.6, `rgba(255,106,26,${0.25 + 0.35 * p})`); hg.addColorStop(1, 'rgba(255,106,26,0)');
        g.fillStyle = hg; g.fillRect(X0, hz - 40, XW, 70);
      }
      if (!R.mirror && L === 1) { bigClock(g, Wd / 2 + pan + PI * 900, hz - 360, 300, t); bigClock(g, Wd / 2 + pan + (PI + 0.9) * 900, hz - 240, 160, t * 1.7); }
      g.restore();
    },
    ground(R, za, zb, near) {                                          // the grid of light far below the void's course
      const m = (za + zb) / 2;
      if (LOOK(m) !== 0 || inTube(m) || (m > CRASH - 4 && m < CRASH_END + 12) || FADE <= 0) return;
      faded(R, () => gridFloor(root.SkiDraw, R, za, zb, near));
    },
    slice(R, za, zb, near) {
      if (FADE <= 0 && !R.mirror) return;                               // (over the website: nothing but the page)
      if (FADE < 1 && !R.mirror) { faded(R, () => theme.slice({ ...R, mirror: true }, za, zb, near)); return; }
      const D = root.SkiDraw, m = (za + zb) / 2, L = LOOK(m);
      if (m > FINISH - 40) { plazaSlice(D, R, za, zb, near); return; }
      if (inTube(m) && m < TUBE[1] + 14) { tubeSlice(D, R, za, zb, near); return; }
      if (L === 1) { filmSlice(D, R, za, zb, near); return; }
      ribbonSlice(D, R, za, zb, near);
      if (m > FORK[0] && m < FORK[1]) forkDeco(D, R, za, zb, near);
    },
    scenery(R) {
      const D = root.SkiDraw, { add, lo, hi, zc } = R;
      if (R.mirror) return;                                           // (the mirror: the course and what is on it, nothing more)
      const ok = (z, d = 125) => z > lo && z < hi && Math.abs(z - zc) < d;
      if (FADE < 1) { for (let i = 1; i < PAGES.length; i++) if (R.sz < PAGES[i][0] && ok(PAGES[i][0] - 3, 60)) add(PAGES[i][0] - 3, () => linkChip(D, R, i), false, 0); }
      else if (!inTube(zc + 6)) { for (const b of SCENE.beams) if (ok(b.z, 125)) add(b.z, () => beam(D, R, b), false, b.x); for (const cd of SCENE.cards) if (ok(cd.z, 110)) add(cd.z, () => card(D, R, cd, fogK(R, cd.z, cd.x)), false, cd.x); }
      if (zc > TURN[0] - 40 && zc < TURN2[1] + 40) for (const ck of SCENE.clocks) if (ok(ck.z, 110)) add(ck.z, () => clockObj(D, R, ck), false, ck.x);
      if (ok(TUBE[0] - 12)) add(TUBE[0] - 12, () => portal(D, R, TUBE[0] - 12, '數據隧道', C.orange), false, 0);
      if (zc > RJ - 140 && zc < RLAND + 10) RINGS.forEach(([z, x, y], k) => { if (ok(z, 130)) add(z, () => hoop(D, R, z, x, y, k), false, x); });
      if (zc > FINISH - 80) root.SkiWorld.crowd(R, { z0: FINISH - 36, z1: FINISH + 24, gap: 1.6, y: 0.9, stand: { top: '#14224a', top2: '#1a2a5a', face: '#ff6a1a' } });
      if (zc > FINISH - 200) {                                     // 數讀房市: its logo ahead, screens of charts behind the stands
        R.add(LOGO.z, () => logoMonument(root.SkiDraw, R), false, 0);
        for (const sc of SCREENS) if (sc.z > R.lo - 10 && sc.z < R.hi + 10) R.add(sc.z + 4.5, () => screen(root.SkiDraw, R, sc), false, sc.x);
      }
    },
    ramp(R, r) {
      const D = root.SkiDraw;
      if (r.k === 'ring') return true;                                   // (a ring in the air: drawn as a hoop, scenery)
      if (r.k === 'bull') { launchPad(D, R, r, '#ff6a5a', '#9a1e1a', '#ffffff'); return true; }
      if (r.k === 'kick') { launchPad(D, R, r, '#3a2814', '#1a1008', '#ffbf5a'); return true; }
      if (r.k === 'ringjump') { launchPad(D, R, r, '#1a2a5a', '#0e1838', C.orange); for (const sd of [-1, 1]) glowDot(D, R, R.S3(r.z + r.len, r.x + sd * (r.hw - 0.6), r.rise + 0.2), 0.5, C.orange, 0.6 + 0.3 * Math.sin(R.t * 20)); return true; }
      return false;
    },
    gate(R, z, i, label) {
      const D = root.SkiDraw, L = LOOK(z);
      if (label === 'GOAL') { tickGate(D, R, z, GOAL_SIGN, C.orange); return; }
      if (label) { tickGate(D, R, z, '起點 START', C.orange); return; }
      if (inWeb(z) || inTube(z) || MED(z) > 0 || course.vertAt(z) || inRings(z) || Math.abs(z - CRASH) < 16 || (z > KICK1 - 10 && z < TURN[1] + 6) || (z > KICK2 - 10 && z < TURN2[1] + 6) || z > THIN[0] - 20) return;   // (none from the line on: the words of 暴漲 are up there)
      if (L === 1) { tickGate(D, R, z, `${YEAR(z)}`, '#b8892a'); return; }
      const q = Math.floor(z / 40);
      tickGate(D, R, z, `${2010 + (q % 16)} Q${(q % 4) + 1}`, C.orange);
    },
    obstacle(R, o) {
      const D = root.SkiDraw;
      switch (o.k) {
        case 'block': blockObs(D, R, o); break;
        case 'fw': fwObs(D, R, o); break;
        case 'blade': bladeObs(D, R, o); break;
        case 'spike': spikeObs(D, R, o); break;
        case 'tag': tagObs(D, R, o); break;
        case 'dot': dotObs(D, R, o); break;
        case 'pin': pinObs(D, R, o); break;
        case 'ticker': tickerObs(D, R, o); break;
        case 'tip': tipObs(D, R, o); break;
        case 'fork': forkObs(D, R, o); break;
        case 'num': numObs(D, R, o); break;
        case 'hourglass': hourglassObs(D, R, o); break;
        case 'calendar': calendarObs(D, R, o); break;
        case 'hand': handObs(D, R, o); break;
        case 'banner': bannerObs(D, R, o); break;
        case 'popup': popupObs(D, R, o); break;
        case 'cookie': cookieObs(D, R, o); break;
        case 'toast': toastObs(D, R, o); break;
        case 'pointer': pointerObs(D, R, o); break;
        case 'spinner': spinnerObs(D, R, o); break;
      }
    },
    // the edges of the picture: in the void, dark, a glow of orange flaring on the beat (stronger in the tube and through
    // the rings); in the past, sepia, grain and scratches like old film
    weather({ t }) {
      const D = root.SkiDraw, Wd = D.W, H = D.H, g = D.ctx, z = theme.camZ ?? 0, L = LOOK(z);
      const vg = g.createRadialGradient(Wd / 2, H * 0.5, Math.min(Wd, H) * 0.38, Wd / 2, H * 0.5, Math.max(Wd, H) * 0.75);
      const hot = L === 0 ? (inTube(z + 7) || (z > RJ - 10 && z < RLAND) ? 1 : 0.5) * pulse(4) : 0;
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, L === 1 ? 'rgba(60,30,10,0.6)' : `rgba(${Math.round(40 + 160 * hot)},${Math.round(14 + 40 * hot)},${Math.round(40 - 30 * hot)},${0.45 + 0.2 * hot})`);
      g.save(); g.globalAlpha = FADE; g.fillStyle = vg; g.fillRect(0, 0, Wd, H); g.restore();
      if (FADE < 1) {                                                  // over the website: a page coming in after a click, its bar of progress along the top
        const hz = theme.herZ ?? z;
        for (const [z0] of PAGES.slice(1)) if (hz >= z0 && hz < z0 + 7) { const u = (hz - z0) / 7; D.rect(0, 0, Wd * (0.25 + 0.75 * E_out(u)), 5, '#f97316', 1 - seg(u, 0.75, 1)); }
      }
      if (L === 1) {                                                   // further back in time, older film
        const old = clamp((z - TURN[1]) / (TURN2[0] - TURN[1])) * (1 - seg(z, TURN2[0], TURN2[1]));
        D.rect(0, 0, Wd, H, '#a87a3a', 0.08 + 0.14 * old);
        const r = rng(Math.floor(t * 18));
        for (let k = 0; k < 2 + Math.round(old * 4); k++) { const x = r() * Wd; D.rect(x, 0, 2 + r() * 2, H, '#fff4dc', 0.12 + 0.2 * r()); }
      }
    },
    badge(g, x, y, w, h) {                                             // map-screen card (until its screenshot is taken): a tube of light in the dark
      g.fillStyle = '#02040c'; g.fillRect(x, y, w, h);
      g.strokeStyle = '#ff6a1a'; g.lineWidth = Math.max(2, h * 0.02);
      for (let k = 1; k <= 6; k++) { g.globalAlpha = 1 - k / 7; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * 0.08 * k, h * 0.09 * k, 0, 0, 7); g.stroke(); }
      g.globalAlpha = 1;
    },
  };

  // its loading screen (main.js 'prep', the first race only): the void, the name, and a price line climbing as it
  // loads, her riding its tip (a made-up line, as every curve the game draws itself). o: { k 0..1, t, char }
  const RISE = [0, 0.04, 0.02, 0.09, 0.07, 0.15, 0.13, 0.12, 0.2, 0.26, 0.23, 0.31, 0.29, 0.38, 0.47, 0.44, 0.52, 0.6, 0.57, 0.66, 0.74, 0.71, 0.82, 0.9, 1];
  function loading(o) {
    const D = root.SkiDraw, g = D.ctx, W = D.W, H = D.H, P = D.P, t = o.t, beat = 0.5 + 0.5 * Math.sin(t * 6);
    D.rect(0, 0, W, H, C.void);
    g.fillStyle = 'rgba(42,74,160,0.22)';                         // (the grid of the void, drifting)
    const s = 60, off = (t * 40) % s;
    for (let x = -off; x < W; x += s) g.fillRect(x, 0, 2, H);
    for (let y = -off; y < H; y += s) g.fillRect(0, y, W, 2);
    const ty = P ? H * 0.3 : H * 0.27;
    D.txt('HOUSING DECODER', W / 2, ty - (P ? 120 : 110), { size: 30, color: C.cyan, align: 'center', ls: 12 });
    g.save(); g.shadowColor = C.cyan; g.shadowBlur = 24 + 12 * beat;
    D.txt('數讀房市', W / 2, ty, { size: P ? 120 : 110, color: C.white, align: 'center' }); g.restore();
    // the line: across the middle, drawn as far as it has loaded
    const x0 = P ? 110 : W / 2 - 560, x1 = W - x0, y0 = P ? H * 0.66 : H * 0.8, y1 = P ? H * 0.42 : H * 0.42, n = RISE.length - 1;
    const pt = u => { const i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i, v = RISE[i] + (RISE[i + 1] - RISE[i]) * f; return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v]; };
    g.strokeStyle = 'rgba(74,216,255,0.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();   // (its floor)
    const k = clamp(o.k), m = Math.max(1, Math.round(k * 120));
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); for (let j = 0; j <= m; j++) { const [x, y] = pt(k * j / m); j ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.shadowColor = C.orange; g.shadowBlur = 20; g.strokeStyle = C.orange; g.lineWidth = 8; g.stroke(); g.restore();
    const [hx, hy] = pt(k);
    g.fillStyle = C.amber; g.beginPath(); g.arc(hx, hy, 9 + 4 * beat, 0, 7); g.fill();
    const sc = P ? 4 : 3.5, bob = Math.round(Math.abs(Math.sin(t * 5)) * -6);
    D.spr(o.char + '_ski_front' + (((t % 3.1) < 0.14) ? '_blink' : ''), hx, hy - 10 + bob, sc);
    D.txt(Math.floor(k * 100) + '%', W / 2, y0 + (P ? 120 : 90), { size: 40, color: C.amber, align: 'center' });
  }
  root.SkiMaps.define('chart', { course, theme, prep, loading, music: { race: 'chart', result: 'chart_result', cues: { back: 'chart_back', front: 'chart_tube', web: 'chart_web', rings: 'chart_end' } },
    score: { par: 160, ranks: root.SkiScore.RANKS, key: 'ski-best-chart' }, bg: '#02040c' });
})(typeof window !== 'undefined' ? window : globalThis);

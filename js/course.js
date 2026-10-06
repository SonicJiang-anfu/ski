'use strict';
// Builds a course from a map's data: pure data + lookups, no drawing. Physics, the bot, the renderer and the tests
// all read the result. World: z runs down the course, x across it, y up. The centre line bends (cx(z)) and falls
// (h(z)); everything placed on the course uses an offset `x` from that centre line.
// A course may be a U-shaped trough (`bowl`): flat in the middle, the sides curving up to a rim she can ride.
(function (root) {
  const { clamp, lerp, smooth, seg, table } = root.SkiCore;

  function piece(pts, f) {                                     // value at z from control points with interpolation f
    return z => {
      if (z <= pts[0][0]) return pts[0][1];
      for (let i = 0; i < pts.length - 1; i++) {
        const [za, a] = pts[i], [zb, b] = pts[i + 1];
        if (z <= zb) return lerp(a, b, f((z - za) / (zb - za)));
      }
      return pts[pts.length - 1][1];
    };
  }

  // a curve through the control points (Catmull-Rom): the slope carries on through a point, so bends can flow
  // straight into each other or keep turning, instead of straightening out at every point
  function spline(pts) {
    return z => {
      if (z <= pts[0][0]) return pts[0][1];
      for (let i = 0; i < pts.length - 1; i++) {
        const [za, a] = pts[i], [zb, b] = pts[i + 1];
        if (z > zb) continue;
        const h = zb - za, t = (z - za) / h;
        const ma = i > 0 ? (b - pts[i - 1][1]) / (zb - pts[i - 1][0]) * h : 0;
        const mb = i < pts.length - 2 ? (pts[i + 2][1] - a) / (pts[i + 2][0] - za) * h : 0;
        const t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * ma + (-2 * t3 + 3 * t2) * b + (t3 - t2) * mb;
      }
      return pts[pts.length - 1][1];
    };
  }

  // def: { id, HALF, FINISH, LENGTH, START, CX: [[z, x]] (smoothstep, or a spline with `flow`), GRADE: [[z, grade]] (linear), bowl?, phys?,
  //        WIDTH?: [[z, half]] (smoothstep; HALF everywhere if left out), OPEN?: [[z0, z1]] (no walls there: past the
  //        edge she falls off), slow?: [[z0, z1, side?]] (slow motion while she flies there; side −1 or 1: only on that side of the centre line), VERT?: [[z0, z1]] (a sheer face she rides straight down instead of flying off),
  //        SPLIT?: [{ m: [[z, m]], L?: [[z, up]], R?: [[z, up]] }] (a fork: a median m either side of the centre line splits
  //        the course in two, and each side can rise or sink by `up`; smoothstep, 0 outside its points),
  //        CAMYAW?: [[z, angle]] (the chase camera swings round her by this much, smoothstep; 0 outside its points),
  //        SIDE?: [[z0, z1]] (inside a video game: seen from the side like a 2D platformer; she keeps to the middle, runs on
  //        by herself at phys.V2D, and ← → slow her down and speed her up instead of steering),
  //        RAIL?: [{ z0, z1, xs }] (rails along the course at offsets xs: she rides on one of them; ← → hop her across to the
  //        next one instead of steering),
  //        LOOP?: { z, r, shift } (a vertical loop: the course from z on, 2πr long, is rolled up into a circle of radius
  //        r standing on the floor, its exit `shift` to the side of its way in; past it the whole world sits 2πr
  //        nearer and `shift` across. Keep the course straight and level there),
  //        TWIST?: [[z, angle]] (an anti-gravity track: the course turns about a line TWAX above its centre line by this
  //        much, smoothstep, 0 outside its points; she sticks to it, so physics is untouched and only the picture turns:
  //        up a wall at π/2, upside down at π, a corkscrew past 2π. The chase camera turns with it),
  //        TWAX?: [[z, height]] (how far above the centre line that line runs: 4 if left out),
  //        CAMTILT?: [[z, angle]] (the chase camera looks this much higher there, smoothstep; 0 outside its points),
  //        OD?: [[z0, z1]] (overdrive: she goes faster there and smashes straight through anything in her way, holes apart),
  //        BACK?: [[z0, z1]] (she rides backwards there, facing up the course: the map swings the camera round with
  //        CAMYAW so it looks back up the course over her shoulder, and ← → are as seen from there; what is coming shows
  //        only in a mirror (SkiWorld.mirror)),
  //        TOP?: [[z0, z1]] (the chase camera rises to look straight down on her there, like a plan seen from above),
  //        LOWG?: [[z0, z1, g]] (gravity is g times as strong there: she floats, and a hop goes high and far),
  //        TUBE?: [[z0, z1, r]] (a tube: the course rolled up into a pipe of radius r round a line r over it, x running
  //        round it, its two edges meeting over her head: no walls, she can go right round. Over the 14 either side of it
  //        the flat course curls up into it; the chase camera turns with her, so she is always at the bottom),
  //        CLONE?: [[z0, z1]] (copies of her ride beside her there, some mirroring her, some a moment behind; the camera
  //        stops keeping her in the middle, so the player has to tell which one is her),
  //        BEND?: [[z, k]] (the picture of the world curls up ahead of the camera by k (down where k < 0, like a small
  //        planet's), smoothstep, 0 outside its points; only the picture: SkiDraw.bend),
  //        botLanes? (the bot's lane step: finer for a course fast enough that it must edge across in smaller steps),
  //        sections: [{name, z0}] }
  // fill(c, put): places obstacles, ramps, coins and boost pads using the helpers in `put`
  function build(def, fill) {
    const { HALF, FINISH, LENGTH, START = 4 } = def;
    const cxRaw = def.flow ? spline(def.CX) : piece(def.CX, smooth), gradeRaw = piece(def.GRADE, t => t);
    const STEP = 0.5;
    const centerX = table(LENGTH + 40, STEP, z => cxRaw(z));
    const grade = table(LENGTH + 40, STEP, z => gradeRaw(z));
    const height = (() => {                                    // h(z) = −∫ grade, integrated once into a table
      let h = 40, prev = 0;
      return table(LENGTH + 40, STEP, z => { if (z > 0) h -= (gradeRaw(prev) + gradeRaw(z)) / 2 * (z - prev); prev = z; return h; });
    })();
    const slopeX = z => (centerX(z + 0.5) - centerX(z - 0.5)); // d cx / dz
    const heading = z => Math.atan(slopeX(z));

    // the trough: 0 across the flat middle, rising as u² to `rim` at ±HALF; it flattens out into the pool past `fade`
    const B = def.bowl, wallW = B ? HALF - B.flat : 1;
    const amp = z => (B ? B.rim * (1 - seg(z, B.fade[0], B.fade[1])) : 0);
    const bowlU = x => (B ? clamp((Math.abs(x) - B.flat) / wallW) : 0);
    // forks (SPLIT): a median down the middle, and each side at its own height
    const SPL = def.SPLIT || [], within = (pts, f) => z => (z > pts[0][0] && z < pts[pts.length - 1][0] ? f(z) : 0);
    const sum = list => (list.length ? table(LENGTH + 40, STEP, z => list.reduce((a, f) => a + f(z), 0)) : () => 0);
    const medianAt = sum(SPL.map(sp => within(sp.m, piece(sp.m, smooth))));
    const upL = sum(SPL.filter(sp => sp.L).map(sp => within(sp.L, piece(sp.L, smooth))));
    const upR = sum(SPL.filter(sp => sp.R).map(sp => within(sp.R, piece(sp.R, smooth))));
    const liftAt = (z, x) => (x < 0 ? upL(z) : upR(z));
    const base = B ? (z, x) => { const u = bowlU(x); return height(z) + amp(z) * u * u; } : z => height(z);
    const surf = SPL.length ? (z, x) => base(z, x) + liftAt(z, x) : base;
    const gradeAt = SPL.length ? (z, x) => grade(z) - (liftAt(z + 0.25, x) - liftAt(z - 0.25, x)) * 2 : z => grade(z);   // the slope she really rides
    const bank = B ? (z, x) => Math.sign(x) * amp(z) * 2 * bowlU(x) / wallW : () => 0;   // d surf / dx

    // the course can narrow (WIDTH) and, in places, lose its walls (OPEN)
    const halfAt = def.WIDTH ? table(LENGTH + 40, STEP, piece(def.WIDTH, smooth)) : () => HALF;
    const OPEN = def.OPEN || [], openAt = z => OPEN.some(([a, b]) => z >= a && z < b);
    const VERT = def.VERT || [], vertAt = z => VERT.some(([a, b]) => z >= a && z < b);
    const SIDE = def.SIDE || [], sideAt = z => SIDE.some(([a, b]) => z >= a && z < b);
    // how far the camera has swung round to the side view (0..1): over the 12 either side of where a SIDE stretch begins and ends
    const RAIL = def.RAIL || [], railAt = z => RAIL.find(r => z >= r.z0 && z < r.z1) || null;
    const sideK = z => SIDE.reduce((k, [a, b]) => Math.max(k, smooth(seg(z, a - 4, a + 8)) * (1 - smooth(seg(z, b - 8, b + 4)))), 0);

    // the loop (LOOP): where a course point is in the world. Off the loop that is just (centre line + x, y, z), moved
    // nearer and across past it; on it, round the circle, its height above the track pointing in towards the middle
    const LP = def.LOOP ? { z0: def.LOOP.z, r: def.LOOP.r, len: 2 * Math.PI * def.LOOP.r, w: def.LOOP.shift || 0 } : null;
    if (LP) LP.z1 = LP.z0 + LP.len;
    const loopAt = LP ? z => (z > LP.z0 && z < LP.z1 ? (z - LP.z0) / LP.len : null) : () => null;   // 0..1 round it
    const shiftX = LP ? z => LP.w * smooth(clamp((z - LP.z0) / LP.len)) : () => 0;
    const worldZ = LP ? z => (z >= LP.z1 ? z - LP.len : z > LP.z0 ? LP.z0 : z) : z => z;
    // the twist (TWIST): a course point turned about the line TWAX above the centre line, along the course
    const TWP = def.TWIST || [], twRaw = TWP.length ? table(LENGTH + 40, STEP, piece(TWP, smooth)) : null;   // (a table: it is read for every point drawn)
    const tw0 = TWP.length ? TWP[0][0] : 0, tw1 = TWP.length ? TWP[TWP.length - 1][0] : 0;
    const twistAt = twRaw ? z => {                              // (in −π..π: a whole turn is no turn)
      if (z <= tw0 || z >= tw1) return 0;
      const th = twRaw(z), w = th - 2 * Math.PI * Math.round(th / (2 * Math.PI));
      return Math.abs(w) < 1e-6 ? 0 : w;
    } : null;
    const twAx = def.TWAX ? piece(def.TWAX, smooth) : () => 4;
    const TUB = def.TUBE || [];
    const tubeOf = z => TUB.find(([a, b]) => z > a - 16 && z < b + 16) || null;
    const tubeK = z => TUB.reduce((k, [a, b]) => Math.max(k, smooth(seg(z, a - 14, a)) * (1 - smooth(seg(z, b, b + 14)))), 0);
    const tubeAt = z => TUB.some(([a, b]) => z >= a && z < b);
    const curvAt = z => { const t = tubeOf(z); return t ? tubeK(z) / t[2] : 0; };   // (how sharply the floor curls: 1/r inside the tube)
    const curl = (z, x, y) => {                                   // a course point on the floor curled up (u above it: in towards the tube's line)
      const k = curvAt(z);
      if (!(k > 1e-5)) return null;
      const h = height(z), u = y - h, a = k * x, sn = Math.sin(a), cs = Math.cos(a);
      return [centerX(z) + sn / k - sn * u, h + (1 - cs) / k + cs * u, z];
    };
    const wrapX = (z, dx) => { if (!tubeAt(z)) return dx; const C = 2 * Math.PI * tubeOf(z)[2]; return dx - C * Math.round(dx / C); };   // (across, the short way round)
    const flat = LP ? (z, x, y) => {                              // where a course point is before any twist (round the loop: rolled up with it)
      const u = loopAt(z), X = centerX(z) + x + shiftX(z);
      if (u === null) return [X, y, worldZ(z)];
      const th = 2 * Math.PI * u, rr = LP.r - (y - height(z));
      return [X, height(LP.z0) + LP.r - rr * Math.cos(th), LP.z0 + rr * Math.sin(th)];
    } : (z, x, y) => [centerX(z) + x, y, z];
    const twistFrame = z => {                                    // a point on that line (in the world, past a loop too) and its direction (unit)
      const k = [slopeX(z), -grade(z), 1], n = Math.hypot(k[0], k[1], k[2]);
      return { A: flat(z, 0, height(z) + twAx(z)), k: [k[0] / n, k[1] / n, k[2] / n] };
    };
    const twist = (p, z) => {
      const th = twistAt(z);
      if (!th) return p;
      const { A, k } = twistFrame(z), q = root.SkiCore.rotAxis([p[0] - A[0], p[1] - A[1], p[2] - A[2]], k, th);
      return [q[0] + A[0], q[1] + A[1], q[2] + A[2]];
    };
    const shaped = TUB.length ? (z, x, y) => curl(z, x, y) || flat(z, x, y) : flat;
    const world = twistAt ? (z, x, y) => twist(shaped(z, x, y), z) : shaped;   // (a course may have a loop and a twist both, at different places)
    const OD = def.OD || [], odAt = z => OD.some(([a, b]) => z >= a && z < b);
    const BACK = def.BACK || [], backAt = z => BACK.some(([a, b]) => z >= a && z < b);
    const backK = z => BACK.reduce((k, [a, b]) => Math.max(k, smooth(seg(z, a - 2, a + 14)) * (1 - smooth(seg(z, b - 8, b + 4)))), 0);   // (how far the mirror is up: 0..1; it comes down as she comes round, goes as she turns back)
    const CLONE = def.CLONE || [], cloneK = z => CLONE.reduce((k, [a, b]) => Math.max(k, smooth(seg(z, a - 6, a + 6)) * (1 - smooth(seg(z, b - 6, b + 6)))), 0);
    // a web page (course.page): seen from straight above, turned right round (she rides down the screen); 0..1 how far the
    // camera has come round (it is half way round, ← → turning over, at either end)
    const PG = def.PAGE || [], pageAt = z => PG.some(([a, b]) => z >= a && z < b);
    const pageK = z => PG.reduce((k, [a, b]) => Math.max(k, seg(z, a - 30, a + 10) * (1 - seg(z, b - 10, b + 30))), 0);
    const flipAt = z => backAt(z) || pageAt(z);
    const SG = def.SURGE || [], surgeAt = z => { for (const [a, b, v0, v1] of SG) if (z >= a && z < b) return lerp(v0, v1, (z - a) / (b - a)); return 0; };   // (on its boost pads, a top speed climbing all the way along)
    const CAP = def.VCAP || [], capAt = z => { for (const [a, b, v] of CAP) if (z >= a && z < b) return v; return Infinity; };   // (a top speed of its own for a while: slowed to it smoothly)                    // (← → as seen on the screen: looking back up the course, or from above a page)
    const TOP = def.TOP || [], topK = z => TOP.reduce((k, [a, b]) => Math.max(k, smooth(seg(z, a - 10, a + 4)) * (1 - smooth(seg(z, b - 4, b + 10)))), 0);
    const LG = def.LOWG || [], gravAt = z => {                    // (eased in and out over 8: a hop across its edge is not jolted)
      for (const [a, b, g] of LG) if (z > a - 4 && z < b + 4) return lerp(1, g, smooth(seg(z, a - 4, a + 4)) * (1 - smooth(seg(z, b - 4, b + 4))));
      return 1;
    };

    const c = { id: def.id, HALF, FINISH, LENGTH, START, centerX, height, grade, gradeAt, slopeX, heading, surf, bank, bowl: B || null, halfAt, openAt, vertAt, sideAt, sideK, side: SIDE, railAt, rail: RAIL,
      tube: TUB, tubeAt, tubeK, tubeOf, curvAt, wrapX,
      loop: LP, loopAt, shiftX, worldZ, world, flat, bent: !!(LP || twistAt || TUB.length), twistAt, twistFrame, twist: TWP, od: OD, odAt,
      back: BACK, backAt, backK, page: PG, pageAt, pageK, flipAt, capAt, surgeAt, clone: CLONE, cloneK, top: TOP, topK, lowg: LG, gravAt, bendAt: def.BEND ? within(def.BEND, piece(def.BEND, smooth)) : null,
      medianAt, liftAt, split: SPL, botLanes: def.botLanes, camYaw: def.CAMYAW ? within(def.CAMYAW, piece(def.CAMYAW, smooth)) : null, camTilt: def.CAMTILT ? within(def.CAMTILT, piece(def.CAMTILT, smooth)) : null, open: OPEN, vert: VERT, slow: def.slow || [], phys: def.phys || {},
      obstacles: [], ramps: [], coins: [], boosts: [], sand: [], flows: [], belts: [], gates: [], cues: [], sections: def.sections };

    function rampAt(z, x) {
      for (const r of c.ramps) if (z >= r.z && z < r.z + r.len && Math.abs(x - r.x) <= r.hw) return r;
      return null;
    }
    function launchAt(z, x) {                                  // a launch ramp under her as she comes down from the air (with its margin)
      for (const r of c.ramps) { const g = r.launch ? r.launch.grab : 0; if (r.launch && z >= r.z - g && z < r.z + r.len + g && Math.abs(x - r.x) <= r.hw + g) return r; }
      return null;
    }
    function boostAt(z, x) {
      for (const b of c.boosts) if (z >= b.z && z < b.z + b.len && Math.abs(x - b.x) <= b.hw) return b;
      return null;
    }
    let FB = null;                                             // fast-water lane pieces by whole unit of z
    function flowAt(z, x) {
      if (!FB) { FB = new Map(); for (const f of c.flows) for (let k = Math.floor(f.z); k <= Math.floor(f.z + f.len); k++) (FB.get(k) || FB.set(k, []).get(k)).push(f); }
      const list = FB.get(Math.floor(z));
      if (list) for (const f of list) if (z >= f.z && z < f.z + f.len && Math.abs(x - (f.x0 + (f.x1 - f.x0) * (z - f.z) / f.len)) <= f.hw) return f;
      return null;
    }
    function beltAt(z, x) {                                    // a conveyor belt running across the course
      for (const b of c.belts) if (z >= b.z && z < b.z + b.len && Math.abs(x - b.x) <= b.hw) return b;
      return null;
    }
    function sandAt(z, x) {                                    // quicksand: an oval patch
      for (const q of c.sand) { const u = (z - q.z) / (q.len / 2) - 1, v = (x - q.x) / q.hw; if (u * u + v * v <= 1) return q; }
      return null;
    }
    // ground under offset x at z: the riding surface plus any kicker there
    function ground(z, x) {
      const r = rampAt(z, x);
      return surf(z, x) + (r ? r.rise * (z - r.z) / r.len : 0);
    }
    Object.assign(c, { rampAt, launchAt, boostAt, sandAt, flowAt, beltAt, ground, curvature: z => centerX(z + 1) - 2 * centerX(z) + centerX(z - 1),
      sectionAt: z => { let k = 0; c.sections.forEach((s, i) => { if (z >= s.z0) k = i; }); return k; }, clampX: x => clamp(x, -HALF, HALF) });

    // obstacles come in three kinds, whatever they look like: `hop` (jump it or go round), `tall` (go round),
    // `over` (crouch under); k names the art
    const put = {
      FULL: HALF * 2,
      hop: (k, z, x, hw, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.6, h: o.h ?? 0.8 }),
      tall: (k, z, x, hw, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.6, h: 99, look: o.look }),   // (look: how high it is drawn, when far less than a wall: for tools/camclip.js)
      over: (k, z, x, w, o = {}) => c.obstacles.push({ k, z, x, hw: w / 2, hd: o.hd ?? 0.3, y0: o.y0 ?? 1.3, y1: o.y1 ?? 2.4 }),
      ramp: (z, x, hw, rise, len = 8) => c.ramps.push({ z, len, x, hw, rise }),
      boost: (z, x, hw = 1.5, len = 5) => c.boosts.push({ z, len, x, hw }),
      sand: (z, x, hw, len) => c.sand.push({ z, len, x, hw }),          // quicksand from z to z + len
      // something that rolls back and forth across the course (amp either side of x, once every `period` s): hop it
      roll: (k, z, x, hw, amp, period, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.6, h: o.h ?? 0.8, move: { amp, w: 2 * Math.PI / period, ph: (z * 0.37) % (2 * Math.PI) } }),
      // something that ducks under the water and comes back up (once every `period` s; see SkiCore.obUp): hop it, or
      // pass while it is under
      // a walker that comes towards her at k times her speed (a car that can be hopped), and that she can also jump on to
      // squash it (and bounce off it)
      walker: (k, z, x, hw, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.5, h: o.h ?? 0.9, drive: { k: o.k ?? 0.25 }, stomp: true }),
      // something standing there she can hop over or jump on to squash
      stompee: (k, z, x, hw, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.5, h: o.h ?? 0.9, stomp: true }),
      // a fountain that shoots up out of the ground once every `period` s (SkiCore.obBurst): too tall to hop while it goes;
      // pass while it is quiet, or go round
      burst: (k, z, x, hw, period, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.9, h: 99, burst: { w: 2 * Math.PI / period, ph: o.ph ?? (z * 0.53) % (2 * Math.PI) } }),
      dive: (k, z, x, hw, period, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 0.6, h: o.h ?? 0.8, dive: { w: 2 * Math.PI / period, ph: o.ph ?? (z * 0.61) % (2 * Math.PI) } }),
      // a hole right across the course (or across x ± hw), len long: only something in the air gets over it; she falls
      // in otherwise. nojump: a hole she is thrown over anyway (by a launch), so the bot need not hop it (thrown: right
      // across, so where she flies over it does not matter either)
      gap: (k, z, len, o = {}) => c.obstacles.push({ k, z: z + len / 2, x: o.x ?? 0, hw: o.hw ?? halfAt(z + len / 2), hd: len / 2, h: 0.3, hole: true, nojump: !!o.nojump || !!o.thrown, thrown: !!o.thrown }),
      // a car in lane x that she meets at z: it drives towards her at k times her speed (k < 0: the same way, slower),
      // so it is only ever met at z (SkiCore.obZ). It honks a second before, and swishes past if she is close (pass:
      // what that sounds like, or false). h: a small one she can hop
      car(k, z, x, o = {}) {
        const sp = o.k ?? 0.7;
        c.obstacles.push({ k, z, x, hw: o.hw ?? 1.05, hd: o.hd ?? 2.3, h: o.h ?? 99, drive: { k: sp } });
        if (sp > 0 && o.honk !== false) put.cue(z - 30, 'honk');
        if (o.pass !== false) put.cue(z, o.pass || 'pass', { x, near: 3.6 });
      },
      // a stamping press over x ± hw: up `top` high for a while, then it slams down to the floor and lifts again, once
      // every `period` s. She passes under it while it is up (crouching gives a little longer)
      stamp: (k, z, x, hw, period, o = {}) => c.obstacles.push({ k, z, x, hw, hd: o.hd ?? 1.1, y0: 0, y1: 99, stamp: { w: 2 * Math.PI / period, ph: o.ph ?? 0, top: o.top ?? 3.4, near: o.near || null } }),
      // a conveyor belt across x ± hw from z to z + len: while she rides it, it carries her sideways at `push` (+: right)
      belt: (z, x, hw, len, push) => c.belts.push({ z, len, x, hw, push }),
      // something to hear (or see) as she passes z; near: only within that far across of x
      cue: (z, name, o = {}) => c.cues.push({ z, name, x: o.x ?? 0, near: o.near ?? 1e9 }),
      // a launch ramp: whatever her speed, she leaves it (or jumps off it) at speed v, rising at vy. o: { k (what it
      // looks like), sfx (what it sounds like), pop (the word that pops up), catch (coming down over it from the air,
      // how near she has to be to be thrown again: 2.5), snap (a trampoline: thrown from its mat, so every bounce off
      // it is the same: caught above its mat, thrown softer to match), grab (coming down from the air, it catches her this far past its edges) }; with no sfx, a big one (vy > 10) is a launch into the sky and a small one a swish
      launch: (z, x, hw, len, vy, v, rise = 1.2, o = {}) => c.ramps.push({ z, len, x, hw, rise, k: o.k, launch: { vy, v, vx: o.vx, sfx: o.sfx, pop: o.pop, catch: o.catch ?? 2.5, snap: !!o.snap, grab: o.grab || 0, punch: !!o.punch, jet: !!o.jet, home: o.home || 0 } }),   // (punch: the picture punches out wide as she is thrown; vx: thrown sideways too; jet: in the air from it she is a projectile, nothing slows her to her top speed and ← → do nothing, until she is down; home: thrown sideways too, back to the middle in that many seconds)
      // a lane of fast water along points [[z, x]] (x eased from one to the next), hw either side of its middle
      flow(pts, hw = 1.6) {
        const xAt = piece(pts, smooth), end = pts[pts.length - 1][0];
        for (let z = pts[0][0]; z < end - 1e-9; z += 2) { const z1 = Math.min(end, z + 2); c.flows.push({ z, len: z1 - z, x0: xAt(z), x1: xAt(z1), hw }); }
      },
      coin: (z, x, y = 0.9) => c.coins.push({ z, x, y }),                 // y = centre height above the surface
      row(z, x, n, dz = 3, dx = 0) { for (let i = 0; i < n; i++) put.coin(z + i * dz, x + i * dx); },
      // coins along the flight off kicker r: the ballistic path at a typical take-off speed (same gravity and kick
      // as SkiPhysics.K: GRAV 26, RAMP_KICK 4), measured from the falling slope, at her middle (0.7 above her feet)
      // coins over the top of a rise at z0 (a dune crest), every dz: their heights are set later by fitFlights, along
      // the flight she really takes
      arc(z0, x, n, dz = 3) { for (let i = 1; i <= n; i++) { put.coin(z0 + i * dz, x, 0.9); c.coins[c.coins.length - 1].arc = true; } },
      flight(r, n, dz = 3, v = 20) {
        const ze = r.z + r.len, y0 = height(ze) + r.rise, vy0 = v * r.rise / r.len + 4;
        for (let i = 1; i <= n; i++) { const z = ze + i * dz, t = (z - ze) / v; put.coin(z, r.x, y0 + vy0 * t - 13 * t * t - height(z) + 0.7); }
      },
    };
    fill(c, put);
    c.obstacles.sort((a, b) => a.z - b.z);
    c.coins.sort((a, b) => a.z - b.z);
    c.cues.sort((a, b) => a.z - b.z);
    // decorative gates every 40 units, clear of anything to crouch under
    const gap = def.gateEvery || 40;
    for (let z = gap, i = 0; z < FINISH - 10; z += gap, i++) if (!c.obstacles.some(o => o.y0 !== undefined && Math.abs(o.z - z) < 8)) c.gates.push({ z, i });
    return c;
  }

  // a clean run down the middle (left of any fork, or right where the left one is over something to fall into): no steering, at the speed the slopes give it, hopping only the holes; step(s) is
  // called after each 1/120 s
  function middleRun(c, step) {
    const P = root.SkiPhysics, s = P.create(c), holes = c.obstacles.filter(o => o.hole && !o.nojump);   // (a launch throws her over the others)
    const pits = c.obstacles.filter(o => o.hole && o.nojump);
    let sd = 0;
    for (let i = 0; i < 120 * 200 && s.mode !== 'done'; i++) {
      const med = c.medianAt(s.z);                            // (round a fork by its left side)
      if (!(med > 0)) sd = 0;
      else if (!sd) { const m = Math.max(...[10, 20, 30, 40].map(d => c.medianAt(s.z + d))); sd = pits.some(o => o.z > s.z && o.z < s.z + 140 && Math.abs(-(m + s.K.PR) - o.x) < o.hw + s.K.PR) ? 1 : -1; }
      s.x = med > 0 ? sd * (med + s.K.PR + 0.01) : 0; s.vx = 0; s.inv = 1e9;
      const jump = !s.air && holes.some(o => { const d = o.z - o.hd - s.z; return d > 0 && d < s.v * 0.12; });
      P.step(s, { left: false, right: false, down: false, jump }, 1 / 120);
      step(s);
    }
    return s;
  }
  // lay every arc coin on the flight that clean run really takes, so the coins over a crest are there for anyone who
  // just rides over it; where the bot's line (faster: down the fast water, over the boost pads) crosses the same coin
  // higher or lower, as high as both still reach if there is one (her middle takes a coin from 1.9 below it to 0.4
  // above). Needs SkiPhysics (and SkiBot), which every page and test loads before the maps.
  function fitFlights(c) {
    if (!root.SkiPhysics || !c.coins.some(k => k.arc)) return;
    const run = () => { const zs = [], rs = [], xs = []; return { zs, rs, xs, add(s) { if (!zs.length || s.z > zs[zs.length - 1]) { zs.push(s.z); rs.push(s.y - c.surf(s.z, s.x)); xs.push(s.x); } } }; };
    const at = (r, z) => { const { zs } = r; let i = 1; while (i < zs.length - 1 && zs[i] < z) i++; const f = zs.length > 1 ? clamp((z - zs[i - 1]) / (zs[i] - zs[i - 1] || 1)) : 0; return zs.length > 1 ? [lerp(r.rs[i - 1], r.rs[i], f), lerp(r.xs[i - 1], r.xs[i], f)] : [0, 0]; };
    const mid = run(); middleRun(c, s => mid.add(s));
    const fast = run();
    if (root.SkiBot) { const P = root.SkiPhysics, s = P.create(c), bot = root.SkiBot.create(c); for (let i = 0; i < 120 * 200 && s.mode !== 'done'; i++) { P.step(s, bot(s), 1 / 120); fast.add(s); } }
    for (const k of c.coins) if (k.arc) {
      const [r] = at(mid, k.z);
      k.y = r > 0.15 ? r + 0.75 : 0.9;
      if (!fast.zs.length) continue;
      const [r2, x2] = at(fast, k.z), lo = Math.max(r, r2) - 0.4 + 0.05, hi = Math.min(Math.max(r, 0), Math.max(r2, 0)) + 1.9 - 0.05;
      if (Math.abs(x2 - k.x) < 1 && lo < hi) k.y = clamp(k.y, lo, hi);
    }
  }

  const SkiCourse = { build, fitFlights, middleRun };
  root.SkiCourse = SkiCourse;
  if (typeof module !== 'undefined') module.exports = SkiCourse;
})(typeof window !== 'undefined' ? window : globalThis);

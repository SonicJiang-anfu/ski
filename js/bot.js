'use strict';
// Autopilot. Plans one line down the whole course in advance (dynamic programming over 1-unit slices × lanes):
// tall things are walls, low ones cost a hop, overhead ones a crouch, coins, boost pads and fast water are a reward,
// past the edge of the course (with a margin where it has no walls) is out, and from one
// slice to the next she can only move as far sideways as her steering allows at the speed she will have there.
// Then it follows that line, hops what is in its way and crouches under banners. The tests use it to prove the
// course can be finished cleanly in time; the title screen uses it as a demo.
(function (root) {
  const { clamp, obX, obZ } = root.SkiCore;
  const NONE = { left: false, right: false, down: false, jump: false };

  function plan(course) {
    const K = root.SkiPhysics.params(course), DZ = 1, LS = course.botLanes || 0.25, lim = course.HALF - K.PR - 0.2;
    const lanes = []; for (let x = -lim; x <= lim + 1e-9; x += LS) lanes.push(x);
    const nZ = Math.ceil((course.FINISH + 4 - course.START) / DZ) + 1, nL = lanes.length;
    // speed she will have along the course (riding the snow, no walls, over every boost pad): dv/dz = a / v
    const vAt = new Float64Array(nZ);
    let v = 1, bz = -1e9, fz = -1e9;
    const flows = course.flows || [], holes = course.obstacles.filter(o => o.hole && o.nojump), launches = course.ramps.filter(r => r.launch), belts = course.belts && course.belts.length;
    for (let i = 0; i < nZ; i++) {
      const z0 = course.START + i * DZ, g0 = course.grade(z0);
      const ln = launches.find(r => z0 >= r.z + r.len - 1 && z0 < r.z + r.len);
      if (ln) v = ln.launch.v;                                  // thrown off a launch ramp at its own speed
      if (holes.some(o => z0 > o.z - o.hd - 1 && z0 < o.z + o.hd + 1)) { vAt[i] = v; continue; }   // flying over the gap after it
      if (course.sideAt && course.sideAt(z0)) { v = K.V2D; vAt[i] = v; continue; }   // inside a video game: her own pace
      if (course.vertAt && course.vertAt(z0)) {               // down a sheer face: fast, but most of it is drop, not distance
        const k = 1 / Math.sqrt(1 + g0 * g0);
        vAt[i] = v * k;
        v = clamp(v + (K.VERT_A + K.G * g0 * k - 0.05 * v) / Math.max(v * k, 1) * DZ, 1, K.VMAX * K.VERT_MAX);
        continue;
      }
      vAt[i] = v;
      const z = course.START + i * DZ, pad = course.boosts.some(b => z >= b.z && z < b.z + b.len), fl = flows.some(f => z >= f.z && z < f.z + f.len);
      if (pad) bz = z;
      if (fl) fz = z;
      const g = course.grade(z);                                // (over a drop that steep she is flying, not speeding up)
      const od = course.odAt && course.odAt(z);
      const a = g > 1 ? 0 : K.G * g + K.P0 + K.PUSH * Math.max(0, 1 - v / 10) - K.DRAG * v + (pad ? K.BOOST_A : 0) + (fl ? K.FLOW_A : 0) + (od ? K.OD_A : 0);
      const sg = course.surgeAt && (z - bz) / v < K.BOOST_T ? course.surgeAt(z) : 0;   // (a surge: boosted, a top speed climbing along it)
      v = clamp(v + a / Math.max(v, 1) * DZ, 1, Math.max(sg, od ? K.VMAX * K.OD_MAX : v > K.VMAX * K.BOOST_MAX ? v - 1.5 * (v - K.VMAX) / v * DZ : (z - bz) / v < K.BOOST_T ? K.VMAX * K.BOOST_MAX : (z - fz) / v < K.FLOW_T ? K.VMAX * K.FLOW_MAX : K.VMAX));
      const cap = course.capAt ? course.capAt(z) : Infinity;   // (a stretch with a top speed of its own: eased down to it, as the physics does)
      if (v > cap) v = Math.max(cap, v - 1.5 * (v - cap) / v * DZ);
    }
    const cell = new Float64Array(nZ * nL);                     // cost of being in a cell
    const near = Array.from({ length: nZ }, () => []);          // the obstacles that reach each slice
    for (const o of course.obstacles) {
      const r = o.hd + 0.3 + DZ * 0.6 + (course.railAt && course.railAt(o.z) ? 3.5 : 0);   // (on rails, kept clear for the time a hop across takes)
      for (let i = Math.max(0, Math.ceil((o.z - r - course.START) / DZ)); i < nZ && course.START + i * DZ <= o.z + r; i++) near[i].push(o);
    }
    for (let i = 0; i < nZ; i++) {
      const z = course.START + i * DZ;
      const half = course.halfAt ? course.halfAt(z) : course.HALF, edge = course.openAt && course.openAt(z) ? half - 1 : half - K.PR - 0.2;
      const med = course.medianAt ? course.medianAt(z) : 0;     // the wall down the middle of a fork
      const rl = course.railAt ? course.railAt(z) : null;      // on rails: only on one of them
      for (let j = 0; j < nL; j++) {
        let c = (rl && !rl.xs.some(x => Math.abs(x - lanes[j]) < 0.13)) || Math.abs(lanes[j]) > edge || (med > 0 && Math.abs(lanes[j]) < med + K.PR + 0.2) ? 1e6 : 0;   // off a narrow stretch, too near an edge with no wall, in a fork's median
        for (const o of near[i]) {                              // a rolling one counts everywhere it can roll to
          if (o.thrown || Math.abs(lanes[j] - o.x) > o.hw + (o.move ? o.move.amp : 0) + K.PR + 0.6) continue;
          if (!o.hole && course.odAt && course.odAt(o.z)) continue;   // (in overdrive she smashes through it)
          c += o.h >= 99 || o.stamp || (o.hole && o.nojump) ? 1e6 : o.y0 !== undefined ? 0.5 : 8;   // (a press is a wall to it; so is a hole no launch throws it over)
        }
        if (course.sand && course.sand.length && course.sandAt(z, lanes[j])) c += 4;   // keep out of quicksand
        cell[i * nL + j] = c;
      }
    }
    for (const cn of course.coins) {
      const i = Math.round((cn.z - course.START) / DZ);
      if (i < 0 || i >= nZ) continue;
      lanes.forEach((x, j) => { if (Math.abs(x - cn.x) < 0.7) cell[i * nL + j] -= 3; });
    }
    for (const b of course.boosts) for (let z = b.z; z < b.z + b.len; z += DZ) {
      const i = Math.round((z - course.START) / DZ);
      if (i >= 0 && i < nZ) lanes.forEach((x, j) => { if (Math.abs(x - b.x) < b.hw - 0.2) cell[i * nL + j] -= 1; });
    }
    for (let i = 0; i < nZ; i++) {                              // ride the fast water
      const z = course.START + i * DZ, f = flows.length ? flows.find(f => z >= f.z && z < f.z + f.len) : null;
      if (f) { const fx = f.x0 + (f.x1 - f.x0) * (z - f.z) / f.len; lanes.forEach((x, j) => { if (Math.abs(x - fx) < f.hw - 0.3) cell[i * nL + j] -= 1; }); }
    }
    // DP from the finish back up to the start
    const cost = new Float64Array(nZ * nL), next = new Int16Array(nZ * nL);
    for (let j = 0; j < nL; j++) cost[(nZ - 1) * nL + j] = cell[(nZ - 1) * nL + j];
    for (let i = nZ - 2; i >= 0; i--) {
      const z = course.START + i * DZ, dt = DZ / vAt[i], pull = K.DRIFT * course.slopeX(z) * vAt[i], rl = course.railAt ? course.railAt(z) : null, reach = rl ? 14 : 8;   // (on rails she hops across to the next one at once)
      for (let j = 0; j < nL; j++) {
        let best = Infinity, bk = j;
        const bt = belts ? course.beltAt(z, lanes[j]) : null, push = bt ? bt.push : 0;   // (a conveyor belt carries her across too)
        for (let k = Math.max(0, j - reach); k <= Math.min(nL - 1, j + reach); k++) {
          const dx = lanes[k] - lanes[j], vx = dx / dt + pull - push;  // steering speed this move needs
          if (Math.abs(vx) > 8 && !rl) continue;
          const c = cost[(i + 1) * nL + k] + 0.3 * dx * dx;
          if (c < best) { best = c; bk = k; }
        }
        cost[i * nL + j] = cell[i * nL + j] + best; next[i * nL + j] = bk;
      }
    }
    let j = lanes.findIndex(x => Math.abs(x) < 1e-6);
    const path = new Float64Array(nZ);
    for (let i = 0; i < nZ; i++) { path[i] = lanes[j]; j = next[i * nL + j]; }
    const at = z => { const k = clamp((z - course.START) / DZ, 0, nZ - 1), i = Math.min(nZ - 2, Math.floor(k)); return path[i] + (path[i + 1] - path[i]) * (k - i); };
    at.dbg = { cell, cost, lanes, vAt, nL };                    // (for tools/botrun.js)
    return at;
  }

  function create(course) {
    const K = root.SkiPhysics.params(course), line = plan(course);
    return function (s) {
      if (s.mode !== 'ride') return NONE;
      const g = course.grade(s.z), v = Math.max(s.v * (course.vertAt && course.vertAt(s.z) ? 1 / Math.sqrt(1 + g * g) : 1), 3);   // how fast she covers the map
      const tgt = line(s.z + 1), lead = (line(s.z + 2) - tgt) * v;   // where the line is just ahead and how fast it moves
      const bt = !s.air && course.belts && course.belts.length ? course.beltAt(s.z, s.x) : null;   // (and against a conveyor belt's pull)
      const want = clamp((tgt - s.x) * 6 + lead, -11, 11) + K.DRIFT * course.slopeX(s.z) * s.v - (bt ? bt.push : 0);
      const err = want - s.vx + (K.SIDE_G * course.bank(s.z, s.x) + K.CENT * course.curvature(s.z) * s.v * s.v) / K.STEER_D * 0.5;   // lean against a trough's side and a curve's pull
      const inp = { left: err < -0.4, right: err > 0.4, down: false, jump: false };
      const od = course.odAt && course.odAt(s.z);
      for (const o of course.obstacles) {
        if (o.z + o.hd + 0.3 < s.z || o.z > s.z + v) continue;
        if (od && !o.hole && course.odAt(o.z)) continue;         // (in overdrive: straight through it)
        const tt = (o.z - s.z) / v, xAt = s.x + (s.vx - K.DRIFT * course.slopeX(s.z) * s.v) * Math.max(0, tt);   // where she will be
        const ox = obX(o, s.t + Math.max(0, tt));               // and where it will be
        if (Math.abs(s.x - ox) > o.hw + K.PR + 0.35 && Math.abs(xAt - ox) > o.hw + K.PR + 0.35 && !o.move) continue;
        if (o.move && Math.min(Math.abs(s.x - o.x), Math.abs(xAt - o.x)) > o.move.amp + o.hw + K.PR + 0.35) continue;   // (one that sweeps to and fro: only if it sweeps across her)
        const over = o.y0 !== undefined;
        const gr = K.GRAV * (course.gravAt ? course.gravAt(s.z) : 1);   // (where gravity is weaker a hop goes higher and further)
        if (o.hole) {                                          // a hole: take off so she comes down as far past it as she left before it
          const hop = v * 2 * (course.sideAt && course.sideAt(s.z) ? K.HOP2D : K.HOP) / gr * 0.9, lead = Math.max(0.12 * v, (hop - 2 * o.hd - 0.6) / 2);
          if (!o.nojump && !s.air && o.z - o.hd - s.z < lead && s.z < o.z) inp.jump = true;
          continue;
        }
        if (!over && o.h < 99 && !s.air && tt < 0.92 * K.HOP / gr && tt > 0 && (o.move || (course.sideAt && course.sideAt(o.z)) || Math.abs(line(o.z) - ox) < o.hw + K.PR + 0.5)) inp.jump = true;   // (not if the line goes round it; inside a video game there is no going round)
        if (over && (!o.stamp || o.stamp.near) && tt < 0.5) inp.down = true;   // (a press that comes down as she gets there: under it crouched)
      }
      if (course.sideAt && course.sideAt(s.z)) inp.left = inp.right = false;   // inside a video game: no steering
      if (course.flipAt ? course.flipAt(s.z) : course.backAt && course.backAt(s.z)) [inp.left, inp.right] = [inp.right, inp.left];   // riding backwards (or down a web page): ← → as seen on the screen
      const rl = course.railAt ? course.railAt(s.z) : null;
      if (rl) {                                                // on rails: a tap towards the rail the line takes a little ahead (then let go, so the next tap counts)
        const ahead = line(s.z + 1 + v * 0.22), want = rl.xs.reduce((b, x, i) => (Math.abs(x - ahead) < Math.abs(rl.xs[b] - ahead) ? i : b), 0);
        inp.left = inp.right = false;
        const nx = s.railT + Math.sign(want - s.railT), X = rl.xs[nx], z1 = s.z + v * 0.3 + 2;   // one rail at a time, and only onto a clear one
        const clear = !course.obstacles.some(o => (o.h >= 99 || o.hole) && obZ(o, s.z) + o.hd > s.z - 1 && obZ(o, s.z) - o.hd < z1 && Math.abs(o.x - X) < o.hw + K.PR);
        if (want !== s.railT && !s.botTap && clear) { inp.left = want < s.railT; inp.right = want > s.railT; }
        s.botTap = inp.left || inp.right;
      }
      return inp;
    };
  }

  const SkiBot = { create, plan };
  root.SkiBot = SkiBot;
  if (typeof module !== 'undefined') module.exports = SkiBot;
})(typeof window !== 'undefined' ? window : globalThis);

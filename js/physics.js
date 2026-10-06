'use strict';
// Anje's state and how it changes each step. No drawing, no sound: step() returns events ({type, ...}) that the
// renderer and the audio react to. Positions use the course frame: z along the course, x offset from its centre line,
// y absolute height (so a jump off a steep drop flies further, like in the trailer).
(function (root) {
  const { clamp, obX, obUp, obZ, obBurst, stampY } = root.SkiCore;

  const K = {
    G: 22, P0: 2, PUSH: 4, DRAG: 0.25, VMAX: 32,      // forward: a = G·grade + P0 (+ push-off below 10) − DRAG·v
    GRAV: 26, HOP: 8.5, RAMP_KICK: 4,                 // hop ≈ 1.4 high, 0.65 s in the air on the flat
    PR: 0.55, BODY_H: 1.9, DUCK_H: 1.0,               // her half-width and height (crouched)
    STEER_A: 42, STEER_D: 3.6, DUCK_STEER: 0.6, AIR_STEER: 0.35,
    DRIFT: 0.6,                                       // share of a bend's sideways pull she has to steer against
    CENT: 0,                                          // outward push in a curve, × curvature × v² (0: snow bends only drift)
    WALL_DRAG: 1.6,                                   // speed lost per second against a snow wall (fraction of v)
    CRASH_T: 0.9, INV_T: 1.5, REWIND: 3, REWIND_V: 0.6, REWIND_GAP: 1.6, JUMP_BUFFER: 0.12, HIST_DT: 0.1,   // (REWIND_V: how much of her speed she has back after a rewind)
    SIDE_G: 22,                                       // pull back down the side of a trough (course.bowl)
    BOOST_A: 30, BOOST_MAX: 1.25, BOOST_T: 1.2,       // boost pads: push, top speed (× VMAX) and how long it lasts
    SAND_DRAG: 1.3, SAND_STEER: 0.6,                  // quicksand: speed lost per second (fraction of v), grip left for steering
    FLOW_A: 9, FLOW_MAX: 1.15, FLOW_T: 0.5,           // a lane of fast water: push, top speed (× VMAX), how long it carries on after
    FALL_T: 1.3,                                      // falling off a wall-less stretch (or into a hole) until she is back
    VERT_A: 30, VERT_MAX: 2.2,                        // riding down a sheer face (course.vert): extra push, top speed (× VMAX)
    V2D: 20,                                                   // inside a video game (course.side): her own steady pace (← → do nothing there)
    STOMP: 10, HOP2D: 10.5,                                        // jumping on to a walker: how hard she bounces off it
    RAIL_V: 16,                                                    // on rails (course.rail): how fast she crosses to the next one
    COYOTE: 0.1,                                                   // inside a video game: just past the edge of a gap she can still jump, like any platformer
    OD_A: 14, OD_MAX: 1.3,                                         // overdrive (course.odAt): push, top speed (× VMAX)
    EDGE: 0,                                                       // with no walls: how far past the edge her middle can go before she drops (her skis still on it)
  };
  // a map can change any of these for its own course (course.phys)
  const params = course => (course.phys && Object.keys(course.phys).length ? Object.assign({}, K, course.phys) : K);

  function create(course) {
    const z = course.START, y = course.ground(z, 0);
    return {
      course, K: params(course), mode: 'ride', t: 0, z, x: 0, y, v: 0, vx: 0, vy: 0, air: false, airT: 0, duck: false, wall: false,
      inv: 0, again: 0, crashZ: -1e9, passZ: -1e9, boostT: 0, onBoost: false, inSand: false, flowT: 0, inFlow: false, inVert: false, crashT: 0, crashes: 0, crashK: null, coins: 0, got: new Set(), jumpBuf: 0, finishTime: null,
      hist: [{ t: 0, z, x: 0, v: 0 }], histT: 0, section: 0, gateIdx: 0, squash: new Set(), inSide: false, coyote: 0, rail: null, railT: 0, prevL: false, prevR: false,
    };
  }

  // back to where she was REWIND seconds ago, but never just before a hole (she would only drop straight back in): at
  // least REWIND_GAP seconds before it at the speed she is put back at, to see it and hop it
  function rewind(s) {
    const c = s.course, K = s.K, tgt = s.t - K.REWIND, holes = c.obstacles.filter(o => o.hole);
    const back = e => (c.sideAt && c.sideAt(e.z) ? K.V2D : Math.max(8, K.REWIND_V * Math.min(e.v, K.VMAX)));   // (the speed she is put back at: never more than top speed, even back on a sheer face)
    const bad = e => holes.some(o => e.z > o.z - o.hd - Math.max(15, K.REWIND_GAP * back(e)) && e.z < o.z + o.hd + 1);
    let k = 0;
    s.hist.forEach((e, i) => { if (e.t <= tgt) k = i; });
    while (k > 0 && bad(s.hist[k])) k--;
    const h = s.hist[k];
    s.hist = s.hist.slice(0, k + 1);
    const open = c.openAt && c.openAt(h.z), med = c.medianAt ? c.medianAt(h.z) : 0;   // back on a wall-less stretch: right in the middle
    s.z = h.z; s.x = open ? 0 : h.x;
    if (med > 0 && Math.abs(s.x) < med + K.PR + 0.2) s.x = (Math.sign(s.x) || 1) * (med + K.PR + 0.2);   // (where a fork's median has grown since: beside it)
    s.v = back(h); s.vx = 0; s.vy = 0;   // (inside a video game: straight back at her own pace)
    s.y = c.ground(s.z, s.x); s.air = false; s.duck = false; s.jumpBuf = 0;
    // a second crash at one spot: this time she cannot crash until she is past it. Put back at the same moment, at the
    // same speed, she met a crocodile coming up again and again (anything that moves in time can line up like that)
    s.passZ = s.again >= 2 ? s.crashZ + 3 : -1e9;
    s.inv = K.INV_T; s.mode = 'ride'; s.boostT = 0; s.flowT = 0; s.rail = null; s.jet = false; s.caught = null;   // (back on rails: on the nearest one)
    if (s.squash) for (const o of [...s.squash]) if (o.z > s.z - 2) s.squash.delete(o);   // (back before a walker she squashed, or something she smashed: it is there again)
  }

  // overhead things hang at a height above the centre line; things on the ground stand on the surface where they are
  function hits(s, o) {
    const c = s.course, K = s.K;
    if (o.dive && obUp(o, s.t) < 0.4) return false;              // under the water: she rides over it
    if (o.burst && obBurst(o, s.t) < 0.3) return false;          // a fountain between bursts: nothing there yet
    if (o.hole && s.air && s.vy > 0) return false;               // on her way up off the edge of a hole: it has not got her yet
    const ox = obX(o, s.t);
    if (Math.abs(s.z - obZ(o, s.z)) > o.hd + (o.hole ? -0.2 : 0.3) || Math.abs(c.wrapX ? c.wrapX(s.z, s.x - ox) : s.x - ox) > o.hw + K.PR) return false;   // (a hole only once she is over it, not at its very edge)
    // (a hole from the lower of the surface under her and at its middle: a long one on a slope falls away under her as she
    // flies over its far end)
    const over = o.y0 !== undefined, above = s.y - (over ? c.height(o.z) + (c.liftAt ? c.liftAt(o.z, ox) : 0) : (o.hole ? Math.min(c.surf(s.z, ox), c.surf(o.z, ox)) : c.surf(o.z, ox))), top = above + (s.duck ? K.DUCK_H : K.BODY_H);
    return over ? top > (o.stamp ? stampY(o, s.t, s.z) : o.y0) && above < o.y1 : above < o.h;
  }

  function noteCrash(s) { s.again = Math.abs(s.z - s.crashZ) < 6 ? s.again + 1 : 1; s.crashZ = s.z; }   // (how many times running at this spot)

  // over the edge of a wall-less stretch, or into a hole: she drops away, then comes back as after a crash
  function fall(s, k, ev) {
    noteCrash(s);
    s.mode = 'crash'; s.crashT = s.K.FALL_T; s.crashes++; s.crashK = k; s.air = true; s.vy = Math.min(s.vy, 0);
    s.vx = k === 'edge' ? Math.sign(s.x) * 3 : 0; s.v *= 0.5; s.duck = false; s.wall = false;
    ev.push({ type: 'crash', z: s.z, x: s.x, k, fall: true });
  }

  function step(s, inp, dt) {
    const ev = [], c = s.course, K = s.K;
    if (!(dt > 0)) return ev;                                  // no time, no step (speeds below divide by dt)
    const GR = K.GRAV * (c.gravAt ? c.gravAt(s.z) : 1);         // (weaker where the course says so: c.gravAt)
    if (s.mode !== 'done') s.t += dt;
    if (s.inv > 0) s.inv = Math.max(0, s.inv - dt);
    if (s.mode === 'ride' && s.z < s.passZ) s.inv = Math.max(s.inv, 0.05);   // (until past where she crashed twice: see rewind)

    if (s.mode === 'crash') {                                  // tumbling: slide to a stop, then back in time
      s.v *= Math.exp(-4 * dt); s.z += s.v * dt;
      if (s.air) { s.vy -= GR * dt; s.y += s.vy * dt; s.x += s.vx * dt; }   // falling
      else s.y = c.ground(s.z, s.x);
      s.crashT -= dt;
      if (s.crashT <= 0) { rewind(s); ev.push({ type: 'rewind', z: s.z }); }
      return ev;
    }
    const done = s.mode === 'done';

    // ---- sideways
    const vert = !!(c.vertAt && c.vertAt(s.z));                  // on a sheer face: stuck to it, no hops
    if (vert && !s.inVert && !done) ev.push({ type: 'plunge' });
    s.inVert = vert;
    if (vert && s.air) { s.air = false; s.y = c.ground(s.z, s.x); }
    s.jumpBuf = inp.jump && !done && !vert ? K.JUMP_BUFFER : Math.max(0, s.jumpBuf - dt);
    const side = !done && c.sideAt && c.sideAt(s.z);            // inside a video game: ← → do nothing (she runs on by herself)
    if (side !== s.inSide) { s.inSide = side; if (!done) ev.push({ type: side ? 'side' : 'unside' }); }
    const rl = !done && c.railAt ? c.railAt(s.z) : null;        // on rails: ← → hop her across to the next rail, one press each
    if (rl && !s.rail) { s.railT = rl.xs.reduce((b, x, i) => (Math.abs(x - s.x) < Math.abs(rl.xs[b] - s.x) ? i : b), 0); ev.push({ type: 'rail' }); }
    if (!rl && s.rail && !done) ev.push({ type: 'unrail' });
    s.rail = rl;
    if (rl && inp.left && !s.prevL && s.railT > 0) { s.railT--; ev.push({ type: 'switch' }); }
    if (rl && inp.right && !s.prevR && s.railT < rl.xs.length - 1) { s.railT++; ev.push({ type: 'switch' }); }
    s.prevL = !!inp.left; s.prevR = !!inp.right;
    const back = !done && !!(c.flipAt ? c.flipAt(s.z) : c.backAt && c.backAt(s.z));   // riding backwards, or down a web page from above: ← → as seen on the screen
    const tb = !done && c.tubeOf ? c.tubeOf(s.z) : null, homing = !!(tb && s.z >= tb[1] && s.z < tb[1] + 16);   // out of a tube: brought back to the middle while the floor uncurls
    const steer = done ? clamp(-s.x * 0.4 - s.vx * 0.3, -1, 1) : side || rl || homing || (s.jet && s.air) ? 0 : ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * (back ? -1 : 1);
    const wasDuck = s.duck;
    s.duck = !!inp.down && !done;                               // a tuck in the air counts too
    if (s.duck && !wasDuck) ev.push({ type: 'duck' });
    const sand = !done && !s.air && c.sand && c.sand.length ? c.sandAt(s.z, s.x) : null;   // quicksand drags at her skis
    if (sand && !s.inSand) ev.push({ type: 'sink' });
    s.inSand = !!sand;
    const auth = (s.air ? K.AIR_STEER : s.duck ? K.DUCK_STEER : 1) * (sand ? K.SAND_STEER : 1);
    const sideG = s.air ? 0 : K.SIDE_G * c.bank(s.z, s.x) + K.CENT * c.curvature(s.z) * s.v * s.v;   // a trough's side pulls her back down, a curve flings her out
    s.vx += (steer * K.STEER_A * auth - K.STEER_D * s.vx - sideG) * dt;
    const belt = !done && !s.air && c.belts && c.belts.length ? c.beltAt(s.z, s.x) : null;   // a conveyor belt carries her sideways
    if (belt && belt !== s.belt) ev.push({ type: 'belt' });
    s.belt = belt;
    if (side) { s.vx = 0; s.x -= s.x * Math.min(1, dt * 6); }    // (she keeps to the middle)
    if (homing) { s.vx = 0; s.x -= s.x * Math.min(1, dt * 7); }
    if (rl) s.vx = 0;
    const xdot = side || homing ? 0 : rl ? clamp((rl.xs[s.railT] - s.x) / dt, -K.RAIL_V, K.RAIL_V) : s.vx - K.DRIFT * c.slopeX(s.z) * s.v + (belt ? belt.push : 0), xPrev = s.x;
    s.x += xdot * dt;
    const inTube = !!(c.tubeAt && c.tubeAt(s.z));                  // in a tube: no walls; right round, over the top, and back to the bottom
    if (inTube) { const C = 2 * Math.PI * c.tubeOf(s.z)[2]; if (s.x > C / 2) s.x -= C; else if (s.x < -C / 2) s.x += C; }
    const half = c.halfAt ? c.halfAt(s.z) : c.HALF, lim = half - K.PR, wasWall = s.wall;
    s.wall = false;
    let held = false, off = false;
    // no wall here: past the edge there is nothing under her (but just after a crash the edge holds her like a wall,
    // so she is never put back only to slide straight off again)
    if (c.openAt && (c.openAt(s.z) || (s.out && s.air)) && !(s.inv > 0)) off = Math.abs(s.x) > half + K.EDGE;   // (flown out past the edge just before a wall begins: still out there, falling)
    else if (!inTube && Math.abs(s.x) > lim) {
      const sd = Math.sign(s.x), open = c.openAt && c.openAt(s.z);   // (open: the edge only holding her just after a crash, with no wall to rub on)
      s.x = sd * lim; held = true;
      if (sd * s.vx > 0) s.vx = -0.2 * s.vx;
      if (!s.air && !open) { s.wall = true; s.v -= s.v * K.WALL_DRAG * dt; }
    }
    s.out = off;
    const med = c.medianAt ? c.medianAt(s.z) : 0;               // a fork: the median between its two sides is a wall
    if (med > 0 && Math.abs(s.x) < med + K.PR) {
      const sd = Math.sign(xPrev) || Math.sign(s.x) || 1;
      s.x = sd * (med + K.PR); held = true;
      if (sd * s.vx < 0) s.vx = -0.2 * s.vx;
      if (!s.air) { s.wall = true; s.v -= s.v * K.WALL_DRAG * dt; }
    }
    if (s.wall && !wasWall) ev.push({ type: 'wall', side: Math.sign(s.x) });

    // ---- forward
    const g = c.grade(s.z), gr = c.gradeAt ? c.gradeAt(s.z, s.x) : g;   // (up or down one side of a fork, the slope she rides)
    let a;
    if (done) a = -Math.min(8, s.v * 0.8);                      // run-out: ease to a stop past the finish
    else if (side) a = (K.V2D - s.v) * 3;                         // her own steady pace (in the air too)
    else if (s.air) a = -0.02 * s.v + K.PUSH * Math.max(0, 1 - s.v / 10);   // (the push-off at a standstill carries on through hops: hopping at the start never leaves her stuck there)
    else if (vert) a = K.VERT_A + K.G * g / Math.sqrt(1 + g * g) - 0.05 * s.v;   // straight down the face: faster and faster
    else a = K.G * gr + K.P0 + K.PUSH * Math.max(0, 1 - s.v / 10) - K.DRAG * s.v - (sand ? K.SAND_DRAG * s.v : 0);
    const od = !done && !!(c.odAt && c.odAt(s.z));               // overdrive: faster, and nothing stops her
    if (od !== !!s.inOD) { s.inOD = od; ev.push({ type: od ? 'od' : 'unod' }); }
    if (od && !s.air) a += K.OD_A;
    const pad = !done && !s.air && c.boosts.length ? c.boostAt(s.z, s.x) : null;   // boost pad: a shove and a higher top speed for a while
    if (pad) { if (!s.onBoost) ev.push({ type: 'boost' }); s.boostT = K.BOOST_T; a += K.BOOST_A; }
    s.onBoost = !!pad;
    s.boostT = Math.max(0, s.boostT - dt);
    const fl = !done && !s.air && c.flows && c.flows.length ? c.flowAt(s.z, s.x) : null;   // fast water carries her along
    if (fl) { if (!s.inFlow) ev.push({ type: 'flow' }); s.flowT = K.FLOW_T; a += K.FLOW_A; }
    s.inFlow = !!fl;
    s.flowT = Math.max(0, s.flowT - dt);
    let vmax = side ? K.V2D * 1.2 : K.VMAX * (vert ? K.VERT_MAX : od ? K.OD_MAX : s.boostT > 0 ? K.BOOST_MAX : s.flowT > 0 ? K.FLOW_MAX : 1);
    let v = s.v + a * dt;
    if (c.capAt) vmax = Math.min(vmax, c.capAt(s.z));             // (a stretch with a top speed of its own)
    if (c.surgeAt && s.boostT > 0) vmax = Math.max(vmax, c.surgeAt(s.z));   // (a surge: boosted, faster and faster all the way along it)
    if (v > vmax && !(s.jet && s.air)) v = Math.max(vmax, Math.min(v, s.v - (s.v - vmax) * 1.5 * dt));   // over the limit (a boost wearing off): ease back down (but not thrown off a jet)
    s.v = Math.max(side ? K.V2D * 0.8 : 0, v);
    const z0 = s.z;
    s.z = Math.min(c.LENGTH, s.z + s.v * dt * (vert ? 1 / Math.sqrt(1 + g * g) : 1));   // on a sheer face her speed runs down it, not along the map

    // ---- up and down
    if (!s.air && off && !done) { fall(s, 'edge', ev); return ev; }
    if (!s.air) {
      if (side && s.vy > 0) s.vy = 0;                            // (a step up inside a video game is a step, not a ramp: it throws no one)
      const r0 = c.rampAt(z0, s.x), gnd = c.ground(s.z, s.x);
      const gvy = (gnd - s.y) / dt;                            // vertical speed needed to stay on the snow
      const leave = gvy < s.vy - GR * dt - 1 && !held && !vert;   // the snow falls away faster than she can drop
      if (r0 && r0.launch && (s.jumpBuf > 0 || s.z >= r0.z + r0.len || leave)) {   // a launch ramp throws her the same way every time
        s.air = true; s.airT = 0; s.vy = r0.launch.vy; s.v = r0.launch.v; s.jumpBuf = 0; s.jet = r0.launch.jet; s.caught = r0; if (r0.launch.vx !== undefined) s.vx = r0.launch.vx;
        if (r0.launch.home) s.vx -= (s.x - r0.x) * K.STEER_D / (1 - Math.exp(-K.STEER_D * r0.launch.home));   // (thrown back to its middle on the way: the same path from wherever she took off)
        ev.push({ type: 'launch', big: r0.launch.vy > 10, sfx: r0.launch.sfx, pop: r0.launch.pop, punch: r0.launch.punch });
      } else if (s.jumpBuf > 0) {
        // (the snow's own rise as she takes off, but never a step under her: on to a ramp from its side, a fork's median
        // after being put back, a step inside a video game would otherwise throw her into the sky)
        s.air = true; s.airT = 0; s.vy = (side ? 0 : clamp(gvy, -s.v * g, Math.max(0, s.vy) + 3)) + (side ? K.HOP2D : K.HOP); s.jumpBuf = 0;   // (inside a video game she jumps higher, like any platformer hero)
        ev.push({ type: 'jump' });
      } else if (leave) {                                      // airborne
        s.air = true; s.airT = 0;
        if (r0 && s.z >= r0.z + r0.len) { s.vy = s.v * r0.rise / r0.len + K.RAMP_KICK; ev.push({ type: 'ramp' }); }
      } else {                                                 // on the snow; a step up under her (on to a ramp from its side) is not a ramp: it throws no one
        const sv = s.v * (c.ground(s.z + 0.2, s.x) - c.ground(s.z - 0.2, s.x)) / 0.4 + xdot * c.bank(s.z, s.x);   // (how fast the surface itself rises under her: along it, and up a trough's side)
        s.vy = Math.min(gvy, Math.max(0, sv) + 1);
        s.y = gnd;
      }
    }
    if (s.air && !done) {                                     // a hop just before a launch ramp still lands on it: thrown all the same
      const r = c.launchAt ? c.launchAt(s.z, s.x) : c.rampAt(s.z, s.x), top = r && r.launch && r.launch.snap ? c.surf(s.z, s.x) + r.rise : null;
      if (r && r.launch && (r.launch.jet ? s.caught !== r : s.vy < r.launch.vy * 0.7) && s.y - (top ?? c.ground(s.z, s.x)) < r.launch.catch) {   // (a ring in the air catches her once, whichever way she flies in)
        let vy = r.launch.vy;
        if (top !== null) {                                      // a trampoline: caught a little above its mat, she is thrown a little softer, so
          const h = s.y - top;                                   // she comes back down to its height as if thrown from the mat itself
          if (h < 0) s.y = top; else vy -= h / (2 * r.launch.vy / GR);   // (in weaker gravity, the flight that long)
        }
        s.vy = vy; s.v = r.launch.v; s.airT = 0; s.jet = r.launch.jet; s.caught = r; if (r.launch.vx !== undefined) s.vx = r.launch.vx; ev.push({ type: 'launch', big: r.launch.vy > 10, sfx: r.launch.sfx, pop: r.launch.pop, punch: r.launch.punch });
      }
    }
    if (s.air) {
      s.airT += dt;
      s.vy -= GR * dt; s.y += s.vy * dt;
      const gnd = c.ground(s.z, s.x);
      if (off && !done) { if (s.y < gnd - 0.8) { fall(s, 'edge', ev); return ev; } }   // flew out past the edge: nothing to land on
      else if (s.y <= gnd) {
        s.y = gnd; s.air = false; s.jet = false;
        if (s.airT > 0.15) ev.push({ type: 'land', airT: s.airT });
        s.vy = (c.ground(s.z + s.v * dt, c.clampX(s.x + xdot * dt)) - gnd) / dt;   // carry on at the snow's own falling speed
      }
    }

    // ---- what she touches
    if (!done) {
      let edge = false;
      for (const o of c.obstacles) {
        if (o.z > s.z + 4) break;                               // (sorted by z; nothing reaches further than 3.7 from its middle)
        if (s.inv > 0 && !o.hole) continue;                    // a fresh start goes through things, not over holes
        if (s.squash.has(o)) continue;                         // squashed or smashed already
        if (o.stomp) {                                         // a walker: landed on now
          const above = s.y - c.surf(s.z, o.x);
          if (s.air && s.vy < 0 && Math.abs(s.z - obZ(o, s.z)) < o.hd + 0.8 && Math.abs(c.wrapX ? c.wrapX(s.z, s.x - obX(o, s.t)) : s.x - obX(o, s.t)) < o.hw + K.PR && above > o.h * 0.3 && above < o.h + 0.8) {
            s.squash.add(o); s.vy = K.STOMP; s.airT = 0; s.jumpBuf = 0;
            ev.push({ type: 'stomp', z: o.z, k: o.k });
            continue;
          }
        }
        if (o.hole && hits(s, o)) {
          if ((side || back) && !s.air && s.coyote < K.COYOTE) { s.coyote += dt; edge = true; continue; }   // (a moment's grace to jump; riding backwards too, the edge seen only in a mirror)
          fall(s, o.k, ev); return ev;
        }
        if (hits(s, o)) {
          if (od) { s.squash.add(o); ev.push({ type: 'smash', z: o.z, x: obX(o, s.t), k: o.k }); continue; }   // in overdrive: straight through it, in pieces
          noteCrash(s); s.mode = 'crash'; s.crashT = K.CRASH_T; s.crashes++; s.crashK = o.k; s.v *= 0.5; s.vx = 0; s.duck = false; s.wall = false; s.air = false;
          ev.push({ type: 'crash', z: s.z, x: s.x, k: o.k });
          return ev;
        }
      }
      if (!edge) s.coyote = 0;
      if (c.stamps === undefined) c.stamps = c.obstacles.filter(o => o.stamp);
      for (const o of c.stamps) {                                // a press slamming down just ahead of her (or beside her): heard
        if (o.z < s.z - 4 || o.z > s.z + 30) continue;
        const lo = o.stamp.near ? o.stamp.near.low + 0.05 : 0.05;
        if (stampY(o, s.t - dt, s.z - s.v * dt) > lo && stampY(o, s.t, s.z) <= lo) { ev.push({ type: 'cue', name: 'stomp', z: o.z }); break; }
      }
      const rel = s.y - c.surf(s.z, s.x), lo = rel + 0.1, hi = rel + (s.duck ? 0.9 : 1.4);   // her middle reaches coins; one over her head needs a hop
      c.coins.forEach((cn, i) => {
        if (s.got.has(i) || Math.abs(cn.z - s.z) > 0.9 || Math.abs(c.wrapX ? c.wrapX(s.z, cn.x - s.x) : cn.x - s.x) > 1.05) return;
        if (cn.y + 0.5 > lo && cn.y - 0.5 < hi) { s.got.add(i); s.coins++; ev.push({ type: 'coin', i }); }
      });
      while (s.gateIdx < c.gates.length && c.gates[s.gateIdx].z <= s.z) { ev.push({ type: 'gate', i: s.gateIdx }); s.gateIdx++; }
      if (c.cues) for (const q of c.cues) {                     // (crossed again after a rewind, so heard again)
        if (q.z > s.z) break;
        if (q.z > z0 && Math.abs(s.x - q.x) <= q.near) ev.push({ type: 'cue', name: q.name, z: q.z });
      }
      const sec = c.sectionAt(s.z);
      if (sec !== s.section) { s.section = sec; ev.push({ type: 'section', i: sec }); }
      if (z0 < c.FINISH && s.z >= c.FINISH) {
        s.finishTime = s.t - dt + dt * (c.FINISH - z0) / Math.max(1e-9, s.z - z0);
        s.mode = 'done';
        ev.push({ type: 'finish', time: s.finishTime });
      }
      s.histT += dt;
      if (s.histT >= K.HIST_DT && !s.air && s.mode === 'ride') {
        s.histT = 0; s.hist.push({ t: s.t, z: s.z, x: s.x, v: s.v });
        if (s.hist.length > 300) s.hist.splice(0, s.hist.length - 300);
      }
    }
    return ev;
  }

  const SkiPhysics = { K, params, create, step };
  root.SkiPhysics = SkiPhysics;
  if (typeof module !== 'undefined') module.exports = SkiPhysics;
})(typeof window !== 'undefined' ? window : globalThis);

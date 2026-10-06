'use strict';
// Small math helpers shared by every other file (same definitions as the trailer's video.html).
(function (root) {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const E = {
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  function rng(seed) {                                         // mulberry32: same seed → same sequence
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mixHex(a, b, k) {
    const ch = s => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const A = ch(a), B = ch(b);
    return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
  }
  // a table sampled every `step` along [0, L], read back with linear interpolation
  function table(L, step, f) {
    const n = Math.ceil(L / step) + 1, a = new Float64Array(n);
    for (let i = 0; i < n; i++) a[i] = f(i * step);
    const at = z => { const k = clamp(z / step, 0, n - 1), i = Math.min(n - 2, Math.floor(k)); return a[i] + (a[i + 1] - a[i]) * (k - i); };
    at.raw = a; at.step = step;
    return at;
  }
  const fmtTime = s => {                                       // 72.345 → "01:12.34"
    const cs = Math.floor(Math.max(0, s) * 100), m = Math.floor(cs / 6000), r = cs % 6000;
    return `${String(m).padStart(2, '0')}:${String(Math.floor(r / 100)).padStart(2, '0')}.${String(r % 100).padStart(2, '0')}`;
  };
  const fmtInt = n => Math.round(n).toLocaleString('en-US');
  // where an obstacle is at race time t: most stand still, some (o.move) sway back and forth across the course
  const obX = (o, t) => (o.move ? o.x + o.move.amp * Math.sin(o.move.w * t + o.move.ph) : o.x);
  // how far out of the water a diving one (o.dive) is at race time t: 1 up, 0 under. Each cycle it is up for a
  // while, sinks, stays under, then comes back up (bubbles first)
  const obUp = (o, t) => {
    if (!o.dive) return 1;
    const u = (((o.dive.w * t + o.dive.ph) / (2 * Math.PI)) % 1 + 1) % 1;
    return u < 0.55 ? 1 : u < 0.65 ? 1 - (u - 0.55) / 0.1 : u < 0.9 ? 0 : (u - 0.9) / 0.1;
  };

  // how hard a fountain (o.burst) is going at race time t: 0 quiet, 1 full. Each cycle it is quiet for a while (bubbling
  // near the end of it), shoots up, keeps going, then dies down. She can only pass while it is low
  const obBurst = (o, t) => {
    if (!o.burst) return 1;
    const u = (((o.burst.w * t + o.burst.ph) / (2 * Math.PI)) % 1 + 1) % 1;
    return u < 0.55 ? 0 : u < 0.62 ? (u - 0.55) / 0.07 : u < 0.88 ? 1 : 1 - (u - 0.88) / 0.12;
  };

  // where an obstacle is along the course while she is at z: most stand still; a car (o.drive) drives at k times her
  // speed (towards her when k > 0, away when k < 0) and gets to o.z just as she does, so it can only be met there
  const obZ = (o, sz) => (o.drive ? o.z - o.drive.k * (sz - o.z) : o.z);

  // how high the bottom of a stamping press (o.stamp) is above the floor at race time t: up at `top` for a while,
  // slammed down, held there, then lifted again. She gets under it while it is high enough (crouching, sooner).
  // o.stamp.near: it goes by where she is (z) instead: slammed down to `low` just before she gets there (she has to
  // crouch), held while she passes, then lifted again
  const stampY = (o, t, z) => {
    if (o.stamp.near) {
      const d = o.z - z, H = o.stamp.top, lo = o.stamp.near.low;
      return d > 30 ? H : d > 26 ? lo + (H - lo) * (1 - ((30 - d) / 4) ** 2) : d > -3 ? lo : lo + (H - lo) * smooth(Math.min(1, (-3 - d) / 6));   // (down well before she gets there, to stay: plain to see it is one to crouch under)
    }
    const u = (((o.stamp.w * t + o.stamp.ph) / (2 * Math.PI)) % 1 + 1) % 1, H = o.stamp.top;
    return u < 0.45 ? H : u < 0.55 ? H * (1 - ((u - 0.45) / 0.1) ** 2) : u < 0.75 ? 0 : H * smooth((u - 0.75) / 0.25);
  };

  // vector v turned by angle th about the unit axis k (Rodrigues)
  const rotAxis = (v, k, th) => {
    const c = Math.cos(th), s = Math.sin(th), d = (k[0] * v[0] + k[1] * v[1] + k[2] * v[2]) * (1 - c);
    return [v[0] * c + (k[1] * v[2] - k[2] * v[1]) * s + k[0] * d, v[1] * c + (k[2] * v[0] - k[0] * v[2]) * s + k[1] * d, v[2] * c + (k[0] * v[1] - k[1] * v[0]) * s + k[2] * d];
  };

  const SkiCore = { clamp, seg, lerp, smooth, E, rng, mixHex, table, fmtTime, fmtInt, obX, obUp, obZ, obBurst, stampY, rotAxis };
  root.SkiCore = SkiCore;
  if (typeof module !== 'undefined') module.exports = SkiCore;
})(typeof window !== 'undefined' ? window : globalThis);

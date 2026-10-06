'use strict';
// Keyboard and touch. Touch devices get on-screen pads (laid out by the HUD); a finger can slide from ◀ to ▶.
// Anywhere else a press counts as a tap only once it is let go without having moved; one that moved across is a swipe
// (swipes: how far across), and while it is still down, drag.dx says how far it has gone (the map cards follow it).
// The mode follows what the player actually uses: a key press hides the pads, a touch shows them.
(function (root) {
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down',
  };

  function create(canvas, view, getPads) {
    const held = { left: false, right: false, up: false, down: false };     // keyboard
    const padOf = new Map();                                               // pointerId → pad id
    const since = { left: 0, right: 0, up: 0, down: 0 };
    let edges = {}, taps = [], swipes = [], gen = 0;
    const downs = new Map();                                               // pointerId → where it went down (not on a pad)
    const MOVED = 28, SWIPE = 70;                                          // (logical pixels: moved that far, not a tap; across that far, a swipe)
    const coarse = root.matchMedia && root.matchMedia('(pointer: coarse)').matches;
    const params = new URLSearchParams(root.location ? root.location.search : '');
    const api = { touch: params.has('touch') || (coarse && !params.has('keys')), pressed: { left: 0, right: 0, up: 0, down: 0 }, since, now: 0 };

    const edge = k => { edges[k] = true; };
    const gesture = () => { if (api.onGesture) api.onGesture(); };   // sound may only be switched on inside a real key / touch handler (iOS Safari)
    root.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!e.repeat) gesture();
      api.touch = params.has('touch');
      const k = KEYMAP[e.code];
      // (Space jumps / confirms; it never moves a menu)
      if (k) { if (!held[k] && !e.repeat) { since[k] = api.now; if (k === 'up') edge('jump'); } if (!e.repeat && e.code !== 'Space') edge('nav_' + k); held[k] = true; e.preventDefault(); }
      if (!e.repeat) {
        if (e.code === 'Escape' || e.code === 'KeyP') edge('pause');
        if (e.code === 'Enter' || e.code === 'Space') edge('confirm');
        if (e.code === 'KeyR') edge('restart');
        if (e.code === 'KeyH') edge('home');
        if (e.code === 'KeyM') edge('mute');
        edge('any');
      }
    });
    root.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) held[k] = false; });
    root.addEventListener('blur', () => { for (const k in held) held[k] = false; padOf.clear(); });

    const toLogical = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * view.W / r.width, (e.clientY - r.top) * view.H / r.height]; };
    const padAt = (x, y) => { for (const p of getPads()) if (Math.hypot(x - p.x, y - p.y) < p.r * 1.35) return p.id; return null; };
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') { api.touch = true; api.mouse.inside = false; }
      track(e);
      gesture();
      const [x, y] = toLogical(e);
      const p = api.touch ? padAt(x, y) : null;
      if (p) {
        padOf.set(e.pointerId, p); since[p] = api.now; if (p === 'up') edge('jump');
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      } else downs.set(e.pointerId, { x0: x, y0: y, x, y, gen });
      edge('any');
      e.preventDefault();
    });
    api.mouse = { x: 0, y: 0, inside: false, moved: 0 };                // where the mouse is (for hover), when it last moved (performance.now); touches don't count
    const track = e => { if (e.pointerType !== 'mouse') return; const [x, y] = toLogical(e); if (x !== api.mouse.x || y !== api.mouse.y) api.mouse.moved = performance.now(); api.mouse.x = x; api.mouse.y = y; api.mouse.inside = true; };
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') api.mouse.inside = false; });
    canvas.addEventListener('pointermove', e => {
      track(e);
      const d = downs.get(e.pointerId);
      if (d) { [d.x, d.y] = toLogical(e); return; }
      if (!padOf.has(e.pointerId)) return;
      const [x, y] = toLogical(e), p = padAt(x, y), was = padOf.get(e.pointerId);
      if (p && p !== was && (p === 'left' || p === 'right') && (was === 'left' || was === 'right')) { padOf.set(e.pointerId, p); since[p] = api.now; }
    });
    const up = e => {
      padOf.delete(e.pointerId);
      const d = downs.get(e.pointerId);
      if (!d) return;
      downs.delete(e.pointerId);
      if (e.type !== 'pointerup' || d.gen !== gen) return;               // (cancelled, or pressed on a screen that is gone: nothing)
      [d.x, d.y] = toLogical(e);
      const dx = d.x - d.x0, dy = d.y - d.y0;
      if (Math.hypot(dx, dy) < MOVED) taps.push([d.x0, d.y0]);
      else if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) swipes.push(dx);
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', e => { if (padOf.has(e.pointerId)) up(e); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchend', gesture, { passive: true });      // older iOS only counts touchend

    // the controls as the game sees them this frame; edges (jump, pause, ...) are consumed
    api.poll = () => {
      const pad = { left: false, right: false, up: false, down: false };
      for (const p of padOf.values()) pad[p] = true;
      const st = {
        left: held.left || pad.left, right: held.right || pad.right, down: held.down || pad.down, upHeld: held.up || pad.up,
        nav: { left: !!edges.nav_left, right: !!edges.nav_right, up: !!edges.nav_up, down: !!edges.nav_down }, jump: !!edges.jump, pause: !!edges.pause, confirm: !!edges.confirm, restart: !!edges.restart, home: !!edges.home, mute: !!edges.mute, any: !!edges.any, taps, swipes,
      };
      for (const k of ['left', 'right', 'up', 'down']) api.pressed[k] = pad[k] ? 1 : 0;
      edges = {}; taps = []; swipes = [];
      return st;
    };
    api.clear = () => { edges = {}; taps = []; swipes = []; gen++; };   // (a press already down when the screen changed counts for nothing when let go)
    api.drag = () => { for (const d of downs.values()) if (d.gen === gen) return { dx: d.x - d.x0, dy: d.y - d.y0 }; return null; };
    return api;
  }

  root.SkiInput = { create };
})(typeof window !== 'undefined' ? window : globalThis);

'use strict';
// Game loop and screens: loading → title (bot demo behind the logo) → character → map → countdown → play ⇄ pause
// → goal → result.
// The stage is 1920×1080-ish in landscape and 1080×1920-ish in portrait (the trailer's two layouts), stretched to
// the screen's aspect within limits; the canvas backing resolution drops automatically on slow devices.
(function () {
  const { clamp, seg } = SkiCore;
  const D = SkiDraw, PH = SkiPhysics, WD = SkiWorld, HUD = SkiHud, AU = SkiAudio, SC = SkiScore;
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');                        // (see-through where a map clears it: the website under it, js/site.js)
  D.ctx = ctx;
  const NONE = { left: false, right: false, down: false, jump: false };
  const CARS = new Set(['car', 'taxi', 'truck', 'scooter']);
  const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();

  // ------------------------------------------------------------ sizing
  let quality = 1, bs = 1;
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    D.P = params.has('portrait') || (!params.has('landscape') && vh > vw);
    if (D.P) { D.W = 1080; D.H = Math.round(clamp(1080 * vh / vw, 1620, 2400)); }
    else { D.H = 1080; D.W = Math.round(clamp(1080 * vw / vh, 1440, 2400)); }
    const s = Math.min(vw / D.W, vh / D.H);
    D.small = s < 0.5;                                           // (a phone: its small type made bigger, js/draw.js)
    canvas.style.width = Math.floor(D.W * s) + 'px'; canvas.style.height = Math.floor(D.H * s) + 'px';
    bs = Math.min(1, s * Math.min(window.devicePixelRatio || 1, 2)) * quality;
    canvas.width = Math.round(D.W * bs); canvas.height = Math.round(D.H * bs);
  }
  window.addEventListener('resize', resize);
  resize();

  const input = SkiInput.create(canvas, D, () => (G.mode === 'play' || G.mode === 'count' || G.mode === 'resume') && input.touch ? HUD.layout().pads : []);
  const MAP = () => SkiMaps.get(G.map);                         // the map being played (or chosen)
  const BOTS = {};                                              // one planned bot per map, made when first needed
  const botFor = m => BOTS[m.id] || (BOTS[m.id] = SkiBot.create(m.course));
  const bestOf = m => { const total = SC.loadBest(store, m.score.key); return { total, rank: SC.rank(total, m.score.ranks) }; };
  input.onGesture = () => AU.unlock();

  // ------------------------------------------------------------ state
  const G = {
    mode: 'loading', t: 0, modeT: 0, s: null, cam: WD.newCam(), view: null, trail: [], pops: [], flash: 0, shake: 0,
    char: SkiChars.load(store), sel: 0, demoChar: 'anje', map: SkiMaps.load(store), mapSel: 0, deny: 0, demoMap: 'snow',
    best: 0, result: null, demo: null, demoBot: null, demoCam: WD.newCam(), bot: null, anje: null, beeps: 0, ticks: 0, slow: 1,
    botPlay: params.has('bot'),
  };
  const setMode = m => { G.mode = m; G.modeT = 0; input.clear(); };   // (a finger already down when the screen changes taps nothing on the new one)
  function newRun() {
    const m = MAP();
    G.s = PH.create(m.course); G.cam = WD.newCam(); G.trail = []; G.pops = []; WD.parts.length = 0; G.beeps = 0; G.slow = 1;
    if (G.botPlay) G.bot = botFor(m);
    AU.setTheme(m.id); document.body.style.background = m.bg;
  }
  const INTRO = 1.2;                                            // (before 3, 2, 1: the character and her 會贏喔！)
  // a map with something heavy to get ready first (數讀房市's website) shows the loading screen until it is: the first time only
  function startCountdown() { newRun(); AU.music(null); if (MAP().prep && MAP().prep(true) < 1) { G.prepK = G.prepShow = G.prepAt = 0; setMode('prep'); return; } setMode('count'); G.countOff = INTRO; }
  function openMaps() { G.mapSel = G.mapPos = 0; setMode('maps'); newDemo('snow', G.char); if (!AU.playing()) AU.music('title'); }   // (always opens on 經典雪坡)
  function openSelect() { G.sel = SkiChars.index(G.char); setMode('select'); if (!AU.playing()) AU.music('title'); }
  function backToTitle() { if (G.demoMap !== 'snow' || G.demoChar !== 'anje') newDemo('snow', 'anje'); setMode('title'); }
  function goHome() { AU.music('title'); AU.pauseMusic(false); G.pops = []; WD.parts.length = 0; newDemo('snow', 'anje'); setMode('title'); input.clear(); }
  // Anje skis behind the title on the snow slope (as in the trailer); on the map screen the chosen character skis
  // the map in focus
  function newDemo(id = G.demoMap, ch = G.demoChar) {
    const m = SkiMaps.get(id);
    G.demoMap = m.id; G.demoChar = ch; G.demo = PH.create(m.course); G.demoCam = WD.newCam(); G.demoBot = botFor(m); G.demoTrail = [];
    document.body.style.background = m.bg;
  }

  function warp(s, z) {                                         // debug: start somewhere down the course
    const CO = s.course, x = +(params.get('x') || 0);
    s.z = z; s.x = x; s.y = CO.ground(z, x); s.v = +(params.get('v') || 20); s.t = +(params.get('t') || z / 21);
    s.section = CO.sectionAt(z); s.gateIdx = CO.gates.filter(g => g.z <= z).length; s.hist = [{ t: s.t, z, x, v: s.v }];
  }

  // ------------------------------------------------------------ events → sound, particles, popups
  // a phone buzzes only when she crashes or falls, the times she goes back to try again (not on iPhones: Safari has no vibrate)
  const buzz = ms => { if (input.touch && navigator.vibrate) try { navigator.vibrate(ms); } catch (err) { /* not allowed yet */ } };
  function onEvents(ev) {
    const s = G.s, a = G.anje || [D.W / 2, D.H * 0.7, 4];
    for (const e of ev) switch (e.type) {
      case 'jump': AU.sfx('jump'); break;
      case 'ramp': AU.sfx('ramp'); WD.puff(a[0], a[1], 14, { spread: 0.8, up: 0.7, size: 5 * a[2] }); break;
      case 'land': AU.sfx('land', { airT: e.airT }); WD.puff(a[0], a[1], Math.round(10 + 14 * Math.min(1, e.airT)), { spread: 1.2, up: 0.6, size: 5 * a[2] }); break;
      case 'coin': {                                             // a run of coins adds up in one small number beside her, out of the way of what is ahead
        AU.sfx('coin');
        if (s.course.cloneK && s.course.cloneK(s.z) > 0.05) break;   // (among her copies: nothing beside her to give her away)
        const run = G.pops.find(p => p.kind === 'coin' && G.t - p.t0 < 0.6);
        if (run) { run.n++; run.t0 = G.t; } else G.pops.push({ kind: 'coin', n: 1, t0: G.t });
        WD.puff(a[0], a[1] - 30 * a[2], 8, { spread: 0.5, up: 0.8, size: 3 * a[2], cols: ['#ffd84a', '#fff3b0', '#f0a030'], life: 0.4, grav: 600 }); break;
      }
      case 'crash':
        buzz(e.fall ? 220 : 160);
        if (e.fall) { AU.sfx('fall', { k: e.k }); G.pops.push({ kind: HUD.WORDS[`fall_${MAP().id}_${e.k}`] ? `fall_${MAP().id}_${e.k}` : HUD.WORDS['fall_' + e.k] ? 'fall_' + e.k : 'fall', t0: G.t }); WD.puff(a[0], a[1], 18, { spread: 1, up: 1.2, size: 5 * a[2] }); break; }   // off the edge, or into a gap (a map can say where she fell to: into the sky...)
        AU.sfx(e.k === 'croc' || e.k === 'swim' ? 'chomp' : 'crash'); if (CARS.has(e.k)) AU.sfx('honk'); G.pops.push({ kind: 'crash', t0: G.t }); G.shake = 0.45; WD.puff(a[0], a[1], 30, { spread: 1.4, up: 1.1, size: 6 * a[2] }); break;
      case 'rewind': AU.sfx('rewind'); G.flash = 0.8; G.cam.snap = true;
        G.trail = G.trail.filter(p => p.z <= s.z); G.trail.push({ z: s.z, x: s.x, gap: true }); break;
      case 'wall': AU.sfx('wall'); break;
      case 'duck': AU.sfx('duck'); break;
      case 'gate': AU.sfx('gate'); break;
      case 'flow': AU.sfx('flow'); break;
      case 'belt': AU.sfx('belt'); break;
      case 'side': { const m = MAP().music; if (m.tv) AU.music(m.tv); break; }   // into the television: the game's own music
      case 'unside': { const m = MAP().music; if (m.tv && s.mode !== 'done') AU.music(m.back || m.race); break; }
      case 'stomp': AU.sfx('squash'); G.pops = G.pops.filter(p => p.kind !== 'squash'); G.pops.push({ kind: 'squash', t0: G.t }); WD.puff(a[0], a[1], 14, { spread: 1, up: 0.5, size: 4 * a[2], cols: ['#e8343a', '#ffd23f', '#ffffff'], life: 0.4 }); break;
      case 'launch':                                             // thrown off a launch ramp (a big one: up into the sky)
        if (e.sfx) {                                             // (one with its own sound, and maybe its own word)
          AU.sfx(e.sfx); if (e.punch) { G.cam.punch = 1; G.flash = Math.max(G.flash, 0.22); G.shake = Math.max(G.shake, 0.18); } WD.puff(a[0], a[1], 12, { spread: 0.8, up: 0.6, size: 4 * a[2], life: 0.4 });
          if (e.pop && !G.pops.some(p => p.kind === e.pop && G.t - p.t0 < 1.4)) { G.pops.push({ kind: e.pop, t0: G.t }); G.shake = Math.max(G.shake, 0.2); }
          break;
        }
        if (!e.big) { AU.sfx('pass'); break; }
        AU.sfx('launch'); G.pops.push({ kind: 'launch', t0: G.t }); G.flash = Math.max(G.flash, 0.35); G.shake = 0.35; WD.puff(a[0], a[1], 20, { spread: 1, up: 0.8, size: 5 * a[2] }); break;
      case 'rail': AU.sfx('cart'); G.pops.push({ kind: 'cart', t0: G.t }); break;   // into a mine cart, on rails
      case 'switch': AU.sfx('switch'); break;
      case 'cue':                                                // something the map wants heard (and seen) as she passes a spot
        AU.sfx(e.name);
        { const mu = MAP().music; if (mu.cues && mu.cues[e.name] && s.mode !== 'done' && AU.playing() !== mu.cues[e.name]) AU.music(mu.cues[e.name]); }   // (a map can change its tune there)
        if (e.name === 'pass') G.shake = Math.max(G.shake, 0.18);
        if (e.name === 'stomp') G.shake = Math.max(G.shake, 0.1);
        if (e.name === 'bomb') G.shake = Math.max(G.shake, 0.15);
        if (e.name === 'quake' || e.name === 'erupt') { G.shake = Math.max(G.shake, e.name === 'erupt' ? 0.9 : 0.6); if (e.name === 'erupt') G.flash = Math.max(G.flash, 0.5); }
        if (e.name !== 'glass' && HUD.WORDS[e.name]) { G.pops.push({ kind: e.name, t0: G.t }); G.flash = Math.max(G.flash, 0.3); }   // (round a loop...)
        if (e.name === 'tvin' || e.name === 'tvout') {            // through a television screen: a flash of static, glass flying
          G.flash = Math.max(G.flash, 0.6); G.shake = 0.3;
          WD.puff(a[0], a[1] - 40 * a[2], 36, { spread: 1.8, up: 1.2, size: 4 * a[2], cols: ['#ffffff', '#c8d0dc', '#5cb6ff', '#3cb043'], life: 0.6, grav: 900 });
        }
        if (e.name === 'crust') {                                  // through the crust of a lava lake: a flash, glowing lumps flying
          G.flash = Math.max(G.flash, 0.4); G.shake = 0.35;
          WD.puff(a[0], a[1] - 20 * a[2], 40, { spread: 1.8, up: 1.3, size: 5 * a[2], cols: ['#ff5a10', '#ffb020', '#3a1a12', '#ff7a1a'], life: 0.7, grav: 900 });
        }
        if (e.name === 'glitch') { G.flash = Math.max(G.flash, 0.25); WD.puff(a[0], a[1] - 40 * a[2], 30, { spread: 2, up: 1, size: 5 * a[2], cols: ['#2ff3ff', '#ff3fd0', '#ffffff'], life: 0.6, grav: 300 }); }   // through a hologram: it breaks into pixels
        if (e.name === 'glass' || e.name === 'glass2') {           // through a window: shards everywhere
          G.flash = Math.max(G.flash, 0.45); G.shake = 0.4;
          WD.puff(a[0], a[1] - 40 * a[2], 40, { spread: 1.8, up: 1.2, size: 4 * a[2], cols: ['#e8fbff', '#9fe0ff', '#ffffff', '#6fb8e8'], life: 0.7, grav: 900 });
          if (e.name === 'glass') G.pops.push({ kind: 'glass', t0: G.t });
        }
        break;
      case 'plunge': AU.sfx('plunge'); G.pops.push({ kind: HUD.WORDS['plunge_' + MAP().id] ? 'plunge_' + MAP().id : 'plunge', t0: G.t }); G.flash = Math.max(G.flash, 0.3); G.shake = 0.3; break;   // (a map can call it its own name)
      case 'sink': AU.sfx('sink'); WD.puff(a[0], a[1], 8, { spread: 0.5, up: 0.4, size: 4 * a[2], life: 0.4 }); break;
      case 'boost': AU.sfx('boost'); G.flash = Math.max(G.flash, 0.2); G.pops.push({ kind: 'boost', t0: G.t }); WD.puff(a[0], a[1], 16, { spread: 0.9, up: 0.6, size: 5 * a[2], life: 0.4 }); break;
      case 'smash': {                                            // in overdrive, straight through something: a crunch, bits flying, the count going up
        AU.sfx('smash'); G.shake = Math.max(G.shake, 0.22); G.flash = Math.max(G.flash, 0.12);
        const run = G.pops.find(p => p.kind === 'smash' && G.t - p.t0 < 1.2);
        if (run) { run.n++; run.t0 = G.t; } else G.pops.push({ kind: 'smash', n: 1, t0: G.t });
        WD.puff(a[0], a[1] - 30 * a[2], 22, { spread: 1.6, up: 1.1, size: 5 * a[2], cols: ['#ffe14a', '#ff3fd0', '#2ff3ff', '#ffffff'], life: 0.5, grav: 900 }); break;
      }
      case 'od': G.flash = Math.max(G.flash, 0.5); G.shake = Math.max(G.shake, 0.4); break;   // into overdrive (its sound and word are the map's cue)
      case 'finish': AU.music(null); AU.sfx('goal'); G.pops.push({ kind: 'goal', t0: G.t, time: e.time }); G.flash = 0.5; break;
    }
    G.pops = G.pops.filter(p => G.t - p.t0 < 3 || p.kind === 'goal');
  }
  function trailAndSpray(s, trail, dt, live) {
    if (!s.air && s.mode !== 'crash') {
      const last = trail[trail.length - 1];
      if (!last || s.z - last.z > 0.6) trail.push({ z: s.z, x: s.x, gap: !!(last && s.z - last.z > 3) });
      if (trail.length > 400) trail.splice(0, trail.length - 400);
    }
    if (!live || !G.anje || s.air || s.mode === 'crash') return;
    const [ax, ay, sc] = G.anje, carve = Math.abs(s.vx) / 11;
    if (carve > 0.35 && s.v > 8 && Math.random() < carve * 1.6 * dt * 60) WD.puff(ax, ay, 1, { dir: -Math.sign(s.vx), spread: 0.6 + carve, up: 0.7, size: 4 * sc, life: 0.35 });
    if (s.wall && Math.random() < 0.8) WD.puff(ax + Math.sign(s.x) * 12 * sc, ay, 2, { dir: -Math.sign(s.x), spread: 0.9, up: 1, size: 5 * sc, life: 0.4 });
  }

  // ------------------------------------------------------------ mouse hover: which button is under the pointer
  const HK = {};                                                 // id → 0..1, eased
  const hk = id => HK[id] || 0;
  let cursorNow = '';
  function hoverTarget() {
    if (!input.mouse.inside || input.touch) return null;
    const { x, y } = input.mouse, L = HUD.layout();
    if (G.mode === 'count' || G.mode === 'play' || G.mode === 'resume') return near(L.pause, x, y) ? 'pause' : near(L.mute, x, y) ? 'mute' : null;
    if (G.mode === 'pause') { const b = HUD.pauseButtons().find(b => hit(b, x, y)); return b ? b.id : null; }
    if (G.mode === 'maps') { const L = HUD.mapLayout(G.mapPos), a = L.arrows.find(a => Math.hypot(x - a.cx, y - a.cy) < a.r * 1.3), c = [...L.cards].reverse().find(c => hit(c, x, y)); return onBack(L.back, x, y) ? 'back' : hit(L.go, x, y) ? 'mapGo' : a ? a.id : c ? c.id : null; }
    if (G.mode === 'select') { const SL = HUD.selectLayout(), c = SL.cards.find(c => hit(c, x, y)); return onBack(SL.back, x, y) ? 'back' : c ? c.id : hit(SL.go, x, y) ? 'go' : null; }
    if (G.mode === 'result' && G.modeT > 3.6) { const b = HUD.resultButtons().find(b => hit(b, x, y)); return b ? b.id : null; }
    return null;
  }
  // keyboard focus in the pause menu and on the result card; the mouse moves it too
  function menuNav(inp, ids) {
    const n = ids.length, i = Math.max(0, ids.indexOf(G.focus));
    const j = inp.nav.up || inp.nav.left ? (i + n - 1) % n : inp.nav.down || inp.nav.right ? (i + 1) % n : i;
    if (ids[j] !== G.focus) { G.focus = ids[j]; AU.sfx('hover'); }
  }
  function updateHover(dt) {
    const mouse = hoverTarget();
    if (mouse && mouse !== G.hover) { AU.sfx('hover'); if (G.mode === 'pause' || G.mode === 'result') G.focus = mouse; }
    G.hover = mouse;
    const id = mouse || (G.mode === 'pause' || (G.mode === 'result' && G.modeT > 3.6) ? G.focus : null);
    for (const k of new Set([...Object.keys(HK), ...(id ? [id] : [])])) HK[k] = clamp((HK[k] || 0) + (k === id ? 1 : -1) * dt * 8);
    const racing = G.mode === 'play' || G.mode === 'count' || G.mode === 'resume' || G.mode === 'goal';
    const still = racing && !mouse && performance.now() - input.mouse.moved > 1500;   // during a run a mouse left still is hidden, so it never covers the course
    const cur = still ? 'none' : SkiCursor.get()[mouse || G.mode === 'title' ? 'hand' : 'arrow'];   // the whole title screen is clickable
    if (cur !== cursorNow) { canvas.style.cursor = cur; cursorNow = cur; }
  }

  // ------------------------------------------------------------ update
  function hit(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
  const near = (c, x, y) => Math.hypot(x - c.x, y - c.y) < c.r * 1.3;
  const onBack = (b, x, y) => Math.hypot(x - b.cx, y - b.cy) < b.r * 1.3;
  function stepRun(s, inpFn, dt) {                              // fixed 1/120 s physics steps
    let ev = [];
    const n = Math.max(1, Math.ceil(dt * 120));
    for (let i = 0; i < n; i++) ev = ev.concat(PH.step(s, inpFn(i), dt / n));
    return ev;
  }
  const GOAL_SHOT = 3.6;                                        // seconds of finish shot before the result card
  function pauseGame() {                                       // pausing during the resume countdown counts as pausing play
    if (G.mode === 'play' || G.mode === 'count' || G.mode === 'resume') { G.paused = G.mode === 'resume' ? 'play' : G.mode; setMode('pause'); G.focus = 'resume'; AU.sfx('blip'); AU.pauseMusic(true); }
  }

  // the map screen (after the character): a row of cards, ← → (or ↑ ↓) slide to the next one, and so does a finger
  // swiped across (the row follows it while it is down); the 出發 button (or Enter, or a mouse click on the middle card)
  // starts it; a tap on a card to the side brings it to the middle, a tap on the middle one does nothing (a phone's
  // swipes started there too often); a map that is not made yet only shakes its head
  // ← or → held down keeps sliding: after a moment, a card every so often. While it slides the background stays put (a
  // map skied behind the cards first has its line planned, a moment's work); it catches up once the key is let go
  const HOLD_WAIT = 0.35, HOLD_EVERY = 0.12;
  const mapPosShown = () => { const d = input.drag(); return d && G.mode === 'maps' ? clamp(G.mapPos - d.dx / HUD.mapLayout(G.mapPos).step, -0.4, SkiMaps.list.length - 0.6) : G.mapPos; };   // (the row under a finger follows it)
  function mapsInput(inp, dt) {
    const list = SkiMaps.list;
    let i = G.mapSel, go = inp.confirm;
    if (inp.nav.left || inp.nav.up) i = Math.max(0, i - 1);
    if (inp.nav.right || inp.nav.down) i = Math.min(list.length - 1, i + 1);
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let sliding = false;
    if (!dir || dir !== G.holdDir || inp.nav.left || inp.nav.right) { G.holdDir = dir; G.holdT = 0; if (G.slid) { G.slid = false; if (list[i].ready && list[i].id !== G.demoMap) newDemo(list[i].id); } }
    else if ((G.holdT += dt) >= HOLD_WAIT) { G.holdT -= HOLD_EVERY; i = clamp(i + dir, 0, list.length - 1); sliding = G.slid = true; }
    const L = HUD.mapLayout(G.mapPos);
    if (inp.taps.some(([x, y]) => onBack(L.back, x, y))) { AU.sfx('blip'); openSelect(); return; }   // (‹ back to the characters)
    for (const dx of inp.swipes) {                              // (a long swipe: more than one; the row carries on from where the finger left it)
      i = clamp(i - Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx) / L.step)), 0, list.length - 1);
      G.mapPos = clamp(G.mapPos - dx / L.step, -0.4, list.length - 0.6);
    }
    for (const [x, y] of inp.taps) {
      const a = L.arrows.find(a => Math.hypot(x - a.cx, y - a.cy) < a.r * 1.3), c = [...L.cards].reverse().find(c => hit(c, x, y));
      if (hit(L.go, x, y)) go = true;
      else if (a) i = clamp(i + a.dir, 0, list.length - 1);
      else if (c && c.i === G.mapSel) { if (!input.touch) go = true; }
      else if (c) i = c.i;
    }
    if (i !== G.mapSel) { G.mapSel = i; AU.sfx('blip'); if (!sliding && list[i].ready && list[i].id !== G.demoMap) newDemo(list[i].id); }
    if (inp.pause) { AU.sfx('blip'); openSelect(); return; }
    if (!go) return;
    const m = list[G.mapSel];
    if (!m.ready) { AU.sfx('deny'); G.deny = 1; return; }
    G.map = m.id; SkiMaps.save(store, m.id); AU.sfx('select'); startCountdown();
  }

  function update(dt) {
    G.t += dt; G.modeT += dt; input.now = G.t;
    const inp = input.poll();
    if (inp.mute) AU.setMuted(!AU.muted);
    G.flash = Math.max(0, G.flash - dt * 2); G.shake = Math.max(0, G.shake - dt); G.deny = Math.max(0, G.deny - dt * 2.5);
    G.mapPos = (G.mapPos ?? G.mapSel) + (G.mapSel - (G.mapPos ?? G.mapSel)) * (1 - Math.exp(-dt * 12));   // (the row of map cards slides)
    WD.stepParts(dt);
    const L = HUD.layout();
    switch (G.mode) {
      case 'title': case 'maps': case 'select': {               // the bot keeps skiing behind these screens
        if (!G.demo) newDemo();
        const d = G.demo;
        stepRun(d, () => G.demoBot(d), dt);
        if (d.mode === 'done' && d.v < 2) newDemo();
        if (G.mode === 'title') { if (inp.any || inp.taps.length) { AU.sfx('select'); openSelect(); } break; }
        if (G.mode === 'maps') { mapsInput(inp, dt); break; }
        const n = SkiChars.list.length, SL = HUD.selectLayout();
        let i = G.sel, go = inp.confirm;
        if (inp.taps.some(([x, y]) => onBack(SL.back, x, y))) { AU.sfx('blip'); backToTitle(); break; }   // (‹ back to the title)
        if (inp.nav.left) i = (i + n - 1) % n;
        if (inp.nav.right) i = (i + 1) % n;
        if (inp.nav.up && i >= 4) i -= 4;
        if (inp.nav.down && Math.floor(i / 4) < Math.floor((n - 1) / 4)) i = Math.min(n - 1, i + 4);
        for (const [x, y] of inp.taps) {
          const c = SL.cards.find(c => hit(c, x, y));
          if (c) { if (c.i === i && !input.touch) go = true; i = c.i; }   // mouse: clicking the chosen card again starts
          if (hit(SL.go, x, y)) go = true;
        }
        if (i !== G.sel) { G.sel = i; AU.sfx('blip'); }
        if (inp.pause) { AU.sfx('blip'); backToTitle(); break; }
        if (go) { G.char = SkiChars.list[G.sel].id; SkiChars.save(store, G.char); AU.sfx('select'); openMaps(); }
        break;
      }
      case 'prep':                                                 // (given up after a while: the race fetches what is missing as before)
        if ((G.prepK >= 1 && G.prepShow >= 1) || G.modeT > 20) { setMode('count'); G.countOff = INTRO; }
        break;
      case 'count': {
        for (const [x, y] of inp.taps) if (near(L.pause, x, y)) pauseGame(); else if (near(L.mute, x, y)) AU.setMuted(!AU.muted);
        if (inp.pause) { pauseGame(); break; }
        const ct = G.modeT - (G.countOff || 0);
        while (G.beeps < 3 && ct >= G.beeps) { AU.sfx('count'); G.beeps++; }
        if (ct >= 3) { AU.sfx('go'); AU.music(MAP().music.race); G.countEnd = G.t; setMode('play'); }
        break;
      }
      case 'resume': {                                             // back from the pause menu: 3, 2, 1, GO with everything frozen
        for (const [x, y] of inp.taps) if (near(L.pause, x, y)) pauseGame(); else if (near(L.mute, x, y)) AU.setMuted(!AU.muted);
        if (inp.pause) { pauseGame(); break; }
        while (G.beeps < 3 && G.modeT >= G.beeps) { AU.sfx('rtick'); G.beeps++; }
        if (G.modeT >= 3) { AU.sfx('rgo'); AU.pauseMusic(false); G.resumeEnd = G.t; setMode('play'); }
        break;
      }
      case 'play': {
        for (const [x, y] of inp.taps) if (near(L.pause, x, y)) pauseGame(); else if (near(L.mute, x, y)) AU.setMuted(!AU.muted);
        if (inp.pause) pauseGame();
        if (G.mode !== 'play') break;
        const s = G.s;
        let jump = inp.jump;
        // slow motion while she flies off a big drop (course.slow): eased in fast, out gently; the race clock slows too
        const want = s.air && s.mode === 'ride' && s.course.slow.some(([a, b, sd]) => s.z >= a && s.z < b && !(sd && sd * s.x < 0)) ? 0.35 : 1;
        if (want < 1 && G.slow > 0.99) AU.sfx('slowmo');
        G.slow += (want - G.slow) * (1 - Math.exp(-dt * (want < G.slow ? 12 : 3)));
        const ev = stepRun(s, i => {
          if (G.botPlay) return G.bot(s);
          const r = { left: inp.left, right: inp.right, down: inp.down, jump: jump && i === 0 }; return r;
        }, dt * G.slow);
        onEvents(ev);
        if (s.mode === 'done') setMode('goal');
        break;
      }
      case 'goal': {                                              // finish shot: slow motion at first, then real time
        const slow = G.modeT < 1.2 ? 0.3 : Math.min(1, 0.3 + (G.modeT - 1.2) * 0.8);
        onEvents(stepRun(G.s, () => NONE, dt * slow));
        if (G.modeT > GOAL_SHOT) {
          const s = G.s, m = MAP(), r = SC.compute({ time: s.finishTime, coins: s.coins }, m.score), before = SC.loadBest(store, m.score.key);
          r.crashes = s.crashes; r.coinsTotal = m.course.coins.length; r.newBest = SC.saveBest(store, r.total, m.score.key); r.best = Math.max(before, r.total);
          G.result = r; G.ticks = 0; setMode('result'); G.focus = 'again'; AU.music(m.music.result);
        }
        break;
      }
      case 'pause': {
        let act = null;
        menuNav(inp, HUD.pauseButtons().map(b => b.id));
        if (inp.confirm) act = G.focus;
        if (inp.pause) act = 'resume';
        if (inp.restart) act = 'restart';
        if (inp.home) act = 'home';
        for (const [x, y] of inp.taps) for (const b of HUD.pauseButtons()) if (hit(b, x, y)) act = b.id;
        if (act && act !== 'resume') AU.pauseMusic(false);
        if (act === 'resume') {                                    // the music stays quiet until GO
          AU.sfx('blip'); G.beeps = 0;
          if (G.paused === 'count') { AU.pauseMusic(false); setMode('count'); G.countOff = 0; } else setMode('resume');   // (her 會贏喔！ only once)
        }
        if (act === 'restart') { AU.sfx('select'); startCountdown(); }
        if (act === 'home') { AU.sfx('blip'); goHome(); }
        break;
      }
      case 'result': {
        onEvents(stepRun(G.s, () => NONE, dt));
        const a = G.modeT, r = G.result;
        [0.4, 0.9, 1.4].forEach((t0, i) => { if (G.ticks === i && a >= t0) { AU.sfx('tick', { i }); G.ticks++; } });
        if (G.ticks === 3 && a >= 3.1) { AU.sfx('rank'); G.ticks++; }
        if (G.ticks === 4 && a >= 3.5) { if (r.newBest) AU.sfx('best'); G.ticks++; }
        if (a > 3.6) {
          menuNav(inp, HUD.resultButtons().map(b => b.id));
          let act = inp.confirm ? G.focus : inp.pause || inp.home ? 'home' : null;
          for (const [x, y] of inp.taps) for (const b of HUD.resultButtons()) if (hit(b, x, y)) act = b.id;
          if (act === 'again') { AU.sfx('select'); startCountdown(); }
          if (act === 'home') { AU.sfx('blip'); goHome(); }
        }
        break;
      }
    }
    updateHover(dt);
    // camera + continuous sounds
    const attract = G.mode === 'title' || G.mode === 'maps' || G.mode === 'select', st = attract ? G.demo : G.s;
    if (st) {
      G.view = G.mode === 'goal' || G.mode === 'result' ? WD.finishCam(st, G.mode === 'goal' ? clamp(G.modeT / GOAL_SHOT) : 1)
        : WD.chase(attract ? G.demoCam : G.cam, st, G.mode === 'pause' ? 0 : dt);
      if (G.mode !== 'pause') trailAndSpray(st, attract ? G.demoTrail : G.trail, dt, !attract);
    }
    const riding = (G.mode === 'play' || G.mode === 'goal') && G.s;
    AU.ride(riding ? { active: true, speed: G.s.v, air: G.s.air, carve: clamp(Math.abs(G.s.vx) / 11), wall: G.s.wall, rail: !!G.s.rail } : null);
  }

  // ------------------------------------------------------------ render
  function render() {
    ctx.setTransform(bs, 0, 0, bs, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (G.mode === 'loading') { HUD.loading(G.loadP || 0); return; }
    if (G.mode === 'prep') {
      if (window.SkiSite) SkiSite.begin(false);
      G.prepK = MAP().prep();
      if (G.prepK >= 1 && G.view) WD.draw({ s: G.s, t: G.t, cam: G.view, trail: G.trail, char: G.char, theme: G.s.course.map.theme });   // (once it is in: the course drawn under the loading screen, so its first frame does not stall the countdown)
      if (window.SkiSite) SkiSite.end();
      const now = performance.now(), dt = Math.min(0.25, (now - (G.prepAt || now)) / 1000); G.prepAt = now;
      G.prepShow = Math.min(G.prepK, G.prepShow + dt * 2);         // (its bar eased along in real time, never back)
      if (MAP().loading) MAP().loading({ k: G.prepShow, t: G.t, char: G.char }); else HUD.loading(G.prepShow); return; }
    const attract = G.mode === 'title' || G.mode === 'maps' || G.mode === 'select', st = attract ? G.demo : G.s;
    if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 30 * G.shake, (Math.random() - 0.5) * 30 * G.shake);
    const theme = st.course.map.theme;
    if (window.SkiSite) SkiSite.begin(attract);                  // (the website under the canvas: shown only if the map asks for it this frame, and never behind the menus)
    const info = WD.draw({ s: st, t: G.t, cam: G.view, trail: attract ? G.demoTrail : G.trail, char: attract ? G.demoChar : G.char, theme });
    if (!attract) G.anje = info.anje;
    WD.drawParts();
    WD.weather(G.t, st.v, info.hz, theme, attract ? 0 : Math.min(1, (st.boostT || 0) / PH.K.BOOST_T));
    if (st.course.backK && G.mode !== 'goal' && G.mode !== 'result') WD.mirror({ s: st, t: G.t, trail: attract ? G.demoTrail : G.trail, char: attract ? G.demoChar : G.char, theme }, st.course.backK(st.z), theme.mirror);   // (riding backwards: what is coming, in a mirror)
    if (G.mode === 'play' || G.mode === 'pause') WD.flip(st);   // (turning round to ride backwards: the picture flips over)
    if (window.SkiSite) SkiSite.end();
    ctx.setTransform(bs, 0, 0, bs, 0, 0);
    const inRun = G.mode === 'count' || G.mode === 'resume' || G.mode === 'play' || G.mode === 'goal' || G.mode === 'pause';
    if (G.mode === 'goal' || G.mode === 'result') HUD.letterbox(G.mode === 'goal' ? seg(G.modeT, 0, 0.4) : 1);
    else if (G.mode === 'play' && G.slow < 0.98) HUD.letterbox(seg(1 - G.slow, 0, 0.6));   // cinema bars while time slows
    if (inRun && !params.has('nohud')) {             // (?nohud: the bare picture, for the map cards' screenshots)
      if (G.mode !== 'goal') HUD.play(st, { muted: AU.muted, hk, char: G.char });
      if (input.touch && G.mode !== 'goal') HUD.pads(input);
      HUD.popups(G.pops, G.t, G.anje, st.course.backK && st.course.backK(st.z) > 0.2 ? (D.P ? 0.6 : 0.56) : null);   // (riding backwards: under the mirror)
      if (G.mode === 'count') { const off = G.countOff || 0; if (G.modeT < off) HUD.intro(G.char, G.modeT / off, G.t); else HUD.countdown(G.modeT - off); }
      if (G.mode === 'resume') HUD.resumeCount(G.modeT);
      if (G.mode === 'play' && G.resumeEnd !== undefined) HUD.resumeCount(3, G.t - G.resumeEnd);
      if (G.mode === 'play' && G.countEnd !== undefined) HUD.countdown(3 + G.t - G.countEnd);
    }
    if (G.mode === 'pause') HUD.pause(input.touch, hk, G.t);
    if (G.mode === 'title') HUD.title({ t: G.t, touch: input.touch });
    if (G.mode === 'maps') { const best = {}; SkiMaps.ready().forEach(m => { best[m.id] = bestOf(m); }); HUD.mapSelect({ sel: G.mapSel, pos: mapPosShown(), t: G.t, a: G.modeT, hk, touch: input.touch, best, deny: G.deny }); }
    if (G.mode === 'select') HUD.select({ sel: G.sel, t: G.t, a: G.modeT, hk, touch: input.touch });
    if (G.mode === 'result') { HUD.result(G.result, G.modeT, input.touch, hk); }
    if (G.flash > 0) D.rect(0, 0, D.W, D.H, '#ffffff', G.flash);
  }

  // ------------------------------------------------------------ loop, quality, lifecycle
  let last = performance.now(), costAvg = 8, costT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    update(dt);
    const t0 = performance.now(); render(); const cost = performance.now() - t0;
    costAvg += (cost - costAvg) * 0.05; costT += dt;
    if (costT > 2 && !params.has('q')) {                          // keep the frame cheap: lower or raise the backing resolution
      costT = 0;
      if (costAvg > 13 && quality > 0.5) { quality = Math.max(0.5, quality * 0.85); resize(); }
      else if (costAvg < 6 && quality < 1) { quality = Math.min(1, quality * 1.1); resize(); }
    }
    requestAnimationFrame(frame);
  }
  if (params.has('q')) { quality = clamp(+params.get('q'), 0.3, 1); resize(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); AU.suspend(); } else AU.resume(); });

  async function boot() {
    const imgs = SkiChars.sprites(), shots = SkiMaps.ready().map(m => m.id);
    let done = 0;
    const tick = () => { done++; G.loadP = done / (imgs.length + shots.length + 1); };
    await Promise.all([
      document.fonts.load('48px Cubic11').then(tick, tick),
      ...imgs.map(n => D.loadImg(n, `assets/sprites/${n}.png`).then(tick)),
      ...shots.map(id => D.loadImg('map_' + id, `assets/maps/${id}.jpg`).then(tick, tick)),   // the map cards' pictures (a card without one draws its own)
    ]);
    const st = params.get('state');
    if (params.get('char')) G.char = params.get('char');
    if (params.get('map')) G.map = SkiMaps.get(params.get('map')).id;
    if (st === 'play' || st === 'pause' || st === 'count') {
      newRun(); if (params.get('z')) warp(G.s, +params.get('z'));
      setMode(st === 'count' ? 'count' : 'play'); G.countOff = 0; if (st === 'play') G.countEnd = -10;
      if (st === 'pause') { G.paused = 'play'; setMode('pause'); G.focus = 'resume'; }
    } else if (st === 'result') {
      newRun(); const m = MAP(); warp(G.s, m.course.FINISH + 20); G.s.mode = 'done'; G.s.finishTime = 72.34; G.s.coins = 82; G.s.crashes = 2;
      const r = SC.compute({ time: 72.34, coins: 82 }, m.score); r.crashes = 2; r.coinsTotal = m.course.coins.length; r.newBest = params.has('best'); r.best = 9232; G.result = r;
      setMode('result'); G.focus = 'again'; G.modeT = +(params.get('rt') || 5);
    } else if (st === 'select') { if (params.get('char')) G.char = params.get('char'); openSelect(); G.modeT = 2; }
    else if (st === 'maps') { openMaps(); G.modeT = 2; }
    else setMode('title');                                       // no title music the first time: browsers keep pages silent until the first press
    update(0);
  }
  // screenshot / test hook: ?shot freezes the loop; tools/shot.js drives frames itself
  window.__ski = { G, update, render, input, frames(n, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); render(); } };
  boot().then(() => { if (!params.has('shot')) requestAnimationFrame(t => { last = t; frame(t); }); else render(); });
  requestAnimationFrame(function first() { if (G.mode === 'loading') { ctx.setTransform(bs, 0, 0, bs, 0, 0); HUD.loading(G.loadP || 0); requestAnimationFrame(first); } });
})();

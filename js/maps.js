'use strict';
// The map list: three difficulty tiers (three easy maps, five hard, one hellish). A map becomes playable when its own file (js/maps/<id>.js)
// calls define() with its course, theme (look), music and score rules; the rest show as "製作中" on the map screen.
(function (root) {
  const TIERS = [
    { name: '新手', en: 'EASY', col: '#2f9e57', stars: 1 },
    { name: '困難', en: 'HARD', col: '#e8811a', stars: 2 },
    { name: '地獄', en: 'HELL', col: '#d42f2f', stars: 3 },
  ];
  // pal: colours for the card of a map that is not ready yet (sky, ground, accent)
  const list = [
    { id: 'snow', name: '經典雪坡', en: 'SNOW SLOPE', tier: 0, pal: ['#8dbcee', '#ffffff', '#2e7050'] },
    { id: 'water', name: '水上樂園', en: 'SPLASH PARK', tier: 0, pal: ['#5cc0f2', '#3fc3e8', '#ffd23f'] },
    { id: 'desert', name: '大漠沙丘', en: 'DUNE DASH', tier: 0, pal: ['#f6c38b', '#e8a95a', '#5d9e46'] },
    { id: 'jungle', name: '叢林急流', en: 'JUNGLE RAPIDS', tier: 1, pal: ['#8fd3a8', '#2f8f6a', '#3fb6d8'] },
    { id: 'factory', name: '玩具工廠', en: 'TOY FACTORY', tier: 1, pal: ['#c9b6e8', '#6a6f86', '#f0c93a'] },
    { id: 'night', name: '深夜街道', en: 'MIDNIGHT STREET', tier: 1, pal: ['#1d2a5a', '#3a3f55', '#ffd27a'] },
    { id: 'volcano', name: '火山熔岩', en: 'VOLCANO RIDGE', tier: 1, pal: ['#5a2a2a', '#2b2222', '#ff6a1a'] },
    { id: 'cyber', name: '賽博龐克', en: 'NEON OVERDRIVE', tier: 1, pal: ['#1a0f3a', '#2a2a5a', '#ff3fd0'] },
    { id: 'chart', name: '數讀房市', en: 'HOUSING DECODER', tier: 2, pal: ['#0d3170', '#f5f7fc', '#f05416'] },
  ];
  list.forEach((m, i) => { m.i = i; m.slot = list.filter(n => n.tier === m.tier).indexOf(m); m.ready = false; });   // (slot: its place within its tier)
  const KEY = 'ski-map';

  // parts: { desc, course, theme, music: { race, result }, score: { par, ranks, key }, bg (page colour) }
  function define(id, parts) { const m = get(id); Object.assign(m, parts, { ready: true }); m.course.map = m; return m; }
  function get(id) { return list.find(m => m.id === id) || list[0]; }
  const ready = () => list.filter(m => m.ready);
  function load(store) { try { const id = store && store.getItem(KEY); return list.some(m => m.id === id && m.ready) ? id : 'snow'; } catch (e) { return 'snow'; } }
  function save(store, id) { try { store && store.setItem(KEY, id); } catch (e) { /* not kept */ } }

  const SkiMaps = { TIERS, list, define, get, ready, load, save };
  root.SkiMaps = SkiMaps;
  if (typeof module !== 'undefined') module.exports = SkiMaps;
})(typeof window !== 'undefined' ? window : globalThis);

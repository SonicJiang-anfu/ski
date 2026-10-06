'use strict';
// Final score: time points + coin points, a letter rank, and the best score kept on this device (one per map).
// Each map sets its own par time and rank lines (rules = { par, ranks, key }); the snow slope's are the defaults.
(function (root) {
  const RANKS = { S: 8500, A: 7000, B: 5000 };
  const KEY = 'anje-ski-best';
  const DEF = { par: 120, ranks: RANKS, key: KEY };
  const timeScore = (sec, par = 120) => Math.round(Math.max(0, par - sec) * 100);
  const coinScore = n => n * 50;
  const rank = (total, R = RANKS) => (total >= R.S ? 'S' : total >= R.A ? 'A' : total >= R.B ? 'B' : 'C');
  function compute({ time, coins }, rules = DEF) {
    const timePts = timeScore(time, rules.par), coinPts = coinScore(coins), total = timePts + coinPts;
    return { time, coins, timePts, coinPts, total, rank: rank(total, rules.ranks) };
  }
  // storage can be missing or throw (private mode, blocked site data): the game still works, it just forgets
  function loadBest(store, key = KEY) {
    try { return Math.max(0, parseInt(store && store.getItem(key), 10) || 0); } catch (e) { return 0; }
  }
  function saveBest(store, total, key = KEY) {                 // true when this is a new best
    if (total <= loadBest(store, key)) return false;
    try { store && store.setItem(key, String(total)); } catch (e) { /* not kept, still a new best this time */ }
    return true;
  }

  const SkiScore = { RANKS, DEF, timeScore, coinScore, rank, compute, loadBest, saveBest };
  root.SkiScore = SkiScore;
  if (typeof module !== 'undefined') module.exports = SkiScore;
})(typeof window !== 'undefined' ? window : globalThis);

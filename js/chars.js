'use strict';
// The 11 Echo Forest mascots a player can ski as. Only their names are shown. Each has a front sprite (<id>.png,
// <id>_blink.png) ski sprites seen from behind and from in front (<id>_ski_back.png, <id>_ski_front(_blink).png, made by tools/sprites_ski.py).
(function (root) {
  const list = [
    { id: 'owl', name: 'Owl' }, { id: 'anji', name: 'Anji' }, { id: 'anje', name: 'Anje' }, { id: 'anbo', name: 'Anbo' },
    { id: 'ansey', name: 'Ansey' }, { id: 'angoo', name: 'Angoo' }, { id: 'anmi', name: 'Anmi' }, { id: 'anka', name: 'Anka' },
    { id: 'anzo', name: 'Anzo' }, { id: 'anbi', name: 'Anbi' }, { id: 'anleo', name: 'Anleo' },
  ];
  const KEY = 'ski-char';
  const index = id => Math.max(0, list.findIndex(c => c.id === id));
  function load(store) { try { const id = store && store.getItem(KEY); return list.some(c => c.id === id) ? id : 'anje'; } catch (e) { return 'anje'; } }
  function save(store, id) { try { store && store.setItem(KEY, id); } catch (e) { /* not kept */ } }
  const sprites = () => list.flatMap(c => [c.id, c.id + '_blink', c.id + '_ski_back', c.id + '_ski_front', c.id + '_ski_front_blink']);

  root.SkiChars = { list, index, load, save, sprites };
})(typeof window !== 'undefined' ? window : globalThis);

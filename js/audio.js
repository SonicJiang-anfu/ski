'use strict';
// All sound is synthesised live with Web Audio (no audio files): an 8-bit band (pulse channels, triangle bass,
// noise drums) playing original tunes through a look-ahead step sequencer, plus the sound effects.
// Every map has its own tune and its own flavour of effects (setTheme). Browsers only allow sound after a tap or key
// press, so unlock() is called from the first one.
(function (root) {
  const NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = s => { const m = /^([A-G]#?)(\d)$/.exec(s); return 12 * (+m[2] + 1) + NAMES[m[1]]; };
  const hzOf = (n, tr = 0) => 440 * Math.pow(2, (n + tr - 69) / 12);
  const TRANSPOSE = 2;                                         // the snow tune: written in C, played in D major (brighter)
  const hz = n => hzOf(n, TRANSPOSE);

  // ------------------------------------------------------------ the tunes (original). 8 steps per bar: note, '-' hold, '.' rest
  const CH = { C: [48, 'M'], Am: [45, 'm'], F: [41, 'M'], G: [43, 'M'], Em: [40, 'm'], Dm: [38, 'm'], E: [40, 'M'], D: [38, 'M'], B: [47, 'M'], Bm: [47, 'm'] };
  // 雪坡: a bright chiptune gallop with an arpeggio sparkle, D major, 150 BPM
  const SEC_SNOW = {
    intro: { ch: 'C Am F G', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'B4 - D5 - G5 - F5 -'], drums: 'main' },
    a1: { ch: 'C Am F G C Am F G', lead: [
      'G5 - E5 - C5 E5 G5 -', 'A5 - E5 - C5 E5 A5 -', 'F5 G5 A5 - C6 - A5 -', 'G5 - - F5 E5 - D5 -',
      'E5 - C5 - G4 C5 E5 -', 'A5 G5 E5 - C5 - E5 -', 'F5 E5 F5 A5 G5 - E5 -', 'B4 - D5 - G5 - F5 -'], drums: 'main' },
    a2: { ch: 'C Am F G C Am F C', lead: [
      'G5 - E5 - C5 E5 G5 -', 'A5 - E5 - C5 E5 A5 -', 'F5 G5 A5 - C6 - A5 -', 'G5 - - F5 E5 - D5 -',
      'E5 - C5 - G4 C5 E5 -', 'A5 G5 E5 - C5 - E5 -', 'F5 E5 F5 A5 G5 - E5 -', 'C5 - - - . . . .'], drums: 'main' },
    b: { ch: 'F G Em Am Dm G C G', lead: [
      'A5 - - G5 A5 - C6 -', 'B5 - - A5 G5 - D5 -', 'G5 - - E5 G5 - B5 -', 'A5 - - - E5 - C6 -',
      'D6 - C6 - A5 - F5 -', 'G5 - A5 - B5 - G5 -', 'C6 - G5 - E5 - G5 -', 'D6 - - - B5 - G5 -'], drums: 'main' },
    c: { ch: 'Am F C G Am F G G', lead: [
      'E5 - - - C5 - - -', 'F5 - - - A5 - - -', 'G5 - - - E5 - - -', 'D5 - - - G5 - - -',
      'A5 - - - E5 - C6 -', 'C6 - - - A5 - F5 -', 'G5 - A5 - B5 - D6 -', 'G5 - - - . . . .'], drums: 'half', duty: 0.25 },
  };
  // 水上樂園: a calypso on steel drums — bouncy 3-3-2 bass, off-beat chord skanks, congas and a shaker, F major,
  // 140 BPM. The chorus (b) is one little "la-la-LA-la" figure climbing through the chords, so it sticks.
  const SEC_WATER = {
    intro: { ch: 'C F G C', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'C5 E5 G5 - A5 - B5 -'], drums: 'main' },
    a1: { ch: 'C F G C C F G C', lead: [
      'G5 - E5 G5 - A5 G5 -', 'A5 - F5 A5 - C6 A5 -', 'G5 - D5 G5 - B5 A5 G5', 'E5 - - C5 - - E5 -',
      'G5 - E5 G5 - A5 G5 -', 'A5 - F5 A5 - C6 A5 -', 'B5 - A5 G5 - D5 E5 F5', 'E5 - - C5 - - . .'], drums: 'main' },
    a2: { ch: 'C F G C C F G G', lead: [
      'G5 - E5 G5 - A5 G5 -', 'A5 - F5 A5 - C6 A5 -', 'G5 - D5 G5 - B5 A5 G5', 'E5 - - C5 - - E5 -',
      'G5 - E5 G5 - A5 G5 -', 'A5 - F5 A5 - C6 A5 -', 'B5 - A5 G5 - D5 E5 F5', 'G5 - B5 - D6 - F6 -'], drums: 'main' },
    b: { ch: 'F G Em Am F G C C', lead: [
      'A5 A5 C6 A5 - F5 - -', 'B5 B5 D6 B5 - G5 - -', 'G5 G5 B5 G5 - E5 - -', 'A5 - C6 - E6 - - .',
      'A5 A5 C6 A5 - F5 - -', 'B5 B5 D6 B5 - G5 - -', 'C6 - G5 - E5 - G5 -', 'C6 - - - . . . .'], drums: 'main' },
    c: { ch: 'Am F C G Am F G G', lead: [
      'E5 - A5 - C6 - B5 A5', 'A5 - - - F5 - - -', 'G5 - C6 - E6 - D6 C6', 'D6 - - - B5 - - -',
      'C6 - B5 A5 - E5 - -', 'F5 - A5 - C6 - A5 -', 'B5 - - - D6 - - -', 'G5 - A5 - B5 - D6 -'], drums: 'half' },
  };
  // 大漠沙丘: a snake-charmer tune in the Phrygian dominant mode (E F G# A B C D, played a tone lower, in D) over a
  // drone and a darbuka playing the maqsum rhythm (dum tek . tek dum . tek .), finger cymbals at the end of a
  // phrase, 128 BPM. The chorus (b) is one figure stepping down the chords Am G F E, then the leap up to E.
  const SEC_DESERT = {
    intro: { ch: 'E E E E', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'B4 - D5 - E5 F5 G#5 -'], drums: 'main' },
    a1: { ch: 'E F E E Am Dm E E', lead: [
      'E5 - F5 E5 G#5 - F5 E5', 'F5 - E5 F5 A5 - G#5 F5', 'G#5 A5 G#5 F5 E5 - D5 -', 'E5 - - - B4 - D5 -',
      'C6 - B5 A5 B5 - A5 G#5', 'A5 - G#5 F5 A5 - F5 D5', 'E5 F5 G#5 A5 B5 - G#5 -', 'A5 G#5 F5 E5 - - . .'], drums: 'main' },
    a2: { ch: 'E F E E Am Dm E E', lead: [
      'E5 - F5 E5 G#5 - F5 E5', 'F5 - E5 F5 A5 - G#5 F5', 'G#5 A5 G#5 F5 E5 - D5 -', 'E5 - - - B4 - D5 -',
      'C6 - B5 A5 B5 - A5 G#5', 'A5 - G#5 F5 A5 - F5 D5', 'E5 F5 G#5 A5 B5 - G#5 -', 'B5 - G#5 - E6 - D6 -'], drums: 'main' },
    b: { ch: 'Am G F E Am G F E', lead: [
      'A5 A5 C6 B5 A5 - E5 -', 'G5 G5 B5 A5 G5 - D5 -', 'F5 F5 A5 G#5 F5 - E5 -', 'E5 F5 G#5 B5 E6 - - -',
      'A5 A5 C6 B5 A5 - E5 -', 'G5 G5 B5 A5 G5 - D5 -', 'F5 E5 F5 A5 G#5 F5 E5 D5', 'E5 - - - . . . .'], drums: 'main' },
    c: { ch: 'Dm E Am E Dm E F E', lead: [
      'D5 - - F5 A5 - - -', 'G#5 - - F5 E5 - - -', 'C6 - B5 - A5 - E5 -', 'G#5 - - - B5 - - -',
      'F5 - E5 - D5 - F5 -', 'E5 - F5 - G#5 - B5 -', 'C6 - B5 - A5 - G#5 -', 'B5 - - - E6 - - -'], drums: 'half' },
  };
  // 叢林急流: a jungle adventure for marimba and log drums, A Dorian (the bright F# over D), 152 BPM. The hook is
  // "da-da DA, da-da DA-da" climbing up the bar; the chorus (b) answers it from the top, then drops to E for the
  // leap back in. Toms gallop under it, a shaker, claps on the backbeat, a bird calling now and then.
  const SEC_JUNGLE = {
    intro: { ch: 'Am Am Am Am', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'E5 - A5 - B5 - C6 D6'], drums: 'main' },
    a1: { ch: 'Am D Am G Am D F G', lead: [
      'E5 E5 A5 - G5 A5 C6 -', 'B5 - A5 F#5 - D5 E5 -', 'E5 E5 A5 - G5 A5 C6 -', 'D6 - C6 B5 - G5 - -',
      'E5 E5 A5 - G5 A5 C6 -', 'B5 - A5 F#5 - D5 F#5 A5', 'C6 - A5 F5 - C6 - A5', 'B5 - G5 D5 - G5 B5 D6'], drums: 'main' },
    a2: { ch: 'Am D Am G Am D F E', lead: [
      'E5 E5 A5 - G5 A5 C6 -', 'B5 - A5 F#5 - D5 E5 -', 'E5 E5 A5 - G5 A5 C6 -', 'D6 - C6 B5 - G5 - -',
      'E5 E5 A5 - G5 A5 C6 -', 'B5 - A5 F#5 - D5 F#5 A5', 'C6 - A5 F5 - C6 - A5', 'G#5 - B5 - E6 - D6 B5'], drums: 'main' },
    b: { ch: 'F G Am Am F G E E', lead: [
      'C6 - C6 D6 C6 - A5 -', 'B5 - B5 C6 B5 - G5 -', 'A5 C6 E6 - D6 C6 A5 -', 'E6 - - D6 C6 - A5 -',
      'C6 - C6 D6 C6 - A5 -', 'B5 - B5 C6 B5 - G5 -', 'B5 - G#5 B5 - E6 - D6', 'E5 - - - . . . .'], drums: 'main' },
    c: { ch: 'Am F C G Am F E E', lead: [
      'A5 - - - E6 - - -', 'C6 - - - A5 - - -', 'G5 - - - C6 - E6 -', 'D6 - - - B5 - - -',
      'A5 - - - E6 - - -', 'F6 - E6 - C6 - A5 -', 'G#5 - - - B5 - - -', 'E6 - - - . . . .'], drums: 'half' },
  };
  // 深夜街道: a midnight drive in synthwave colours, A minor, 136 BPM: four on the floor, a sawtooth bass bouncing in
  // octaves, a sparkling arpeggio, a bright square lead with a lower voice under it. The hook climbs "da DA-da, da-da
  // DA"; the chorus (b) leaps up a sixth at the start of every bar, then drops to E for the way back in.
  const SEC_NIGHT = {
    intro: { ch: 'Am F C G', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'E5 - G5 - B5 - D6 -'], drums: 'main' },
    a1: { ch: 'Am F C G Am F G G', lead: [
      'A5 - C6 A5 - E5 G5 A5', 'C6 - A5 - F5 - A5 C6', 'E6 - D6 C6 - G5 - E5', 'D6 - - B5 - G5 B5 D6',
      'A5 - C6 A5 - E5 G5 A5', 'C6 - A5 - F5 - A5 C6', 'D6 - E6 - D6 C6 B5 G5', 'B5 - - - . . . .'], drums: 'main' },
    a2: { ch: 'Am F C G Am F G E', lead: [
      'A5 - C6 A5 - E5 G5 A5', 'C6 - A5 - F5 - A5 C6', 'E6 - D6 C6 - G5 - E5', 'D6 - - B5 - G5 B5 D6',
      'A5 - C6 A5 - E5 G5 A5', 'C6 - A5 - F5 - A5 C6', 'D6 - E6 - D6 C6 B5 G5', 'G#5 - B5 - E6 - D6 B5'], drums: 'main' },
    b: { ch: 'F G Em Am F G E E', lead: [
      'A5 A5 C6 - F6 - E6 C6', 'B5 B5 D6 - G6 - F6 D6', 'G5 G5 B5 - E6 - D6 B5', 'C6 - B5 A5 - E5 - -',
      'A5 A5 C6 - F6 - E6 C6', 'B5 B5 D6 - G6 - A6 G6', 'G#5 - B5 - E6 - G#6 -', 'E6 - - - . . . .'], drums: 'main' },
    c: { ch: 'Dm Am F E Dm Am F E', lead: [
      'F5 - - - A5 - D6 -', 'C6 - - - E5 - A5 -', 'A5 - - - C6 - F6 -', 'E6 - - - B5 - G#5 -',
      'F5 - - - A5 - D6 -', 'E6 - - - C6 - A5 -', 'C6 - D6 - E6 - F6 -', 'G#6 - - - E6 - - -'], drums: 'half' },
  };
  // 玩具工廠: a wind-up toy march for music box and glockenspiel, G major, 144 BPM: an oom-pah bass, woodblocks
  // ticking like clockwork, claps on the backbeat, a spring going boing every few bars and a wind-up ratchet into each
  // section. The hook hops up the chord and wiggles; the chorus (b) steps down in bright stabs, then back up
  const SEC_TOY = {
    intro: { ch: 'C C G G', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'G5 - A5 - B5 - D6 -'], drums: 'main' },
    a1: { ch: 'C G Am G C G F G', lead: [
      'E5 G5 C6 - B5 G5 A5 -', 'G5 - E5 - D5 E5 G5 -', 'A5 C6 E6 - D6 C6 A5 -', 'G5 - F5 E5 D5 - . .',
      'E5 G5 C6 - B5 G5 A5 -', 'G5 - E5 - D5 E5 G5 -', 'A5 - G5 F5 A5 - C6 -', 'B5 - G5 - D6 - . .'], drums: 'main' },
    a2: { ch: 'C G Am G C G F C', lead: [
      'E5 G5 C6 - B5 G5 A5 -', 'G5 - E5 - D5 E5 G5 -', 'A5 C6 E6 - D6 C6 A5 -', 'G5 - F5 E5 D5 - . .',
      'E5 G5 C6 - B5 G5 A5 -', 'G5 - E5 - D5 E5 G5 -', 'F5 A5 C6 - B5 - G5 -', 'C6 - - - . . . .'], drums: 'main' },
    b: { ch: 'F G Em Am F G C C', lead: [
      'A5 - C6 - F6 - E6 -', 'D6 - B5 - G5 - D6 -', 'E6 - D6 - B5 - G5 -', 'A5 - B5 - C6 - E6 -',
      'F6 - E6 - C6 - A5 -', 'B5 - D6 - G6 - F6 -', 'E6 - - D6 C6 - G5 -', 'C6 - - - . . . .'], drums: 'main' },
    c: { ch: 'Am F C G Am F G G', lead: [
      'E5 - - - A5 - C6 -', 'C6 - - - A5 - F5 -', 'G5 - - - C6 - E6 -', 'D6 - - - B5 - G5 -',
      'E5 - - - A5 - C6 -', 'F6 - E6 - C6 - A5 -', 'B5 - - - D6 - - -', 'G5 - A5 - B5 - D6 -'], drums: 'half' },
  };
  // 火山熔岩: a heavy chiptune rock anthem, A minor with the E major of the harmonic minor (played a tone lower), 160
  // BPM: chugging power-chord bass, a pounding rock beat with a crash at each section, a square lead doubled an octave
  // down. The hook hammers "da da-da DA" up the chord; the chorus (b) climbs a sixth every bar, then falls to E
  const SEC_LAVA = {
    intro: { ch: 'Am Am F E', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'E5 - G#5 - B5 - D6 -'], drums: 'main' },
    a1: { ch: 'Am F G E Am F E E', lead: [
      'E5 - E5 D5 E5 - A5 -', 'G5 - F5 E5 F5 - C5 -', 'D5 - D5 C5 D5 - G5 -', 'G#5 - F5 E5 B4 - E5 -',
      'E5 - E5 D5 E5 - A5 B5', 'C6 - B5 A5 F5 - A5 -', 'G#5 A5 B5 - E6 - D6 C6', 'B5 - - - . . . .'], drums: 'main' },
    a2: { ch: 'Am F G E Am F E E', lead: [
      'E5 - E5 D5 E5 - A5 -', 'G5 - F5 E5 F5 - C5 -', 'D5 - D5 C5 D5 - G5 -', 'G#5 - F5 E5 B4 - E5 -',
      'E5 - E5 D5 E5 - A5 B5', 'C6 - B5 A5 F5 - A5 -', 'G#5 A5 B5 - E6 - D6 C6', 'B5 - G#5 - E5 - . .'], drums: 'main' },
    b: { ch: 'F G Am Am F G E E', lead: [
      'C6 - - A5 C6 - F6 -', 'D6 - - B5 D6 - G6 -', 'E6 - D6 C6 B5 - A5 -', 'C6 - B5 A5 E5 - - -',
      'C6 - - A5 C6 - F6 -', 'D6 - - B5 D6 - G6 F6', 'E6 - D6 - B5 - G#5 -', 'E5 - - - . . . .'], drums: 'main' },
    c: { ch: 'Dm Am E Am Dm Am E E', lead: [
      'D5 - - - F5 - A5 -', 'E5 - - - C5 - A4 -', 'G#4 - - - B4 - E5 -', 'A4 - - - C5 - E5 -',
      'F5 - - - A5 - D6 -', 'C6 - - - A5 - E5 -', 'G#5 - - - B5 - D6 -', 'E6 - - - . . . .'], drums: 'half' },
  };
  // 賽博龐克: an 8-bit synthwave drive, E minor (played in C# minor), 128 BPM: a sixteenth-note octave bass, a pad
  // swelling on every bar, a gated snare, a lead doubled by a detuned twin. The hook climbs the chord and leans on the
  // D# of B major; the chorus (b) soars a bar at a time, then lands on B
  const SEC_CYBER = {
    intro: { ch: 'Em Em C B', lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'B4 - D#5 - F#5 - A5 -'], drums: 'half' },
    a1: { ch: 'Em C Am B Em C Am B', lead: [
      'E5 - G5 B5 - E6 - D6', 'C6 - B5 G5 - E5 G5 -', 'A5 - C6 E6 - D6 C6 B5', 'D#6 - - B5 F#5 - - -',
      'E5 - G5 B5 - E6 - F#6', 'G6 - F#6 E6 - C6 - E6', 'D6 - C6 B5 - A5 - F#5', 'B5 - - - . . . .'], drums: 'main' },
    a2: { ch: 'Em C Am B Em C Am B', lead: [
      'E5 - G5 B5 - E6 - D6', 'C6 - B5 G5 - E5 G5 -', 'A5 - C6 E6 - D6 C6 B5', 'D#6 - - B5 F#5 - - -',
      'E5 - G5 B5 - E6 - F#6', 'G6 - F#6 E6 - C6 - E6', 'D6 - C6 B5 - A5 - F#5', 'D#6 - F#6 - B6 - A6 F#6'], drums: 'main' },
    b: { ch: 'C D Bm Em C D B B', lead: [
      'E6 - - C6 E6 - G6 -', 'F#6 - - D6 F#6 - A6 -', 'B6 - A6 F#6 - D6 - B5', 'G6 - F#6 E6 - B5 - -',
      'E6 - - C6 E6 - G6 -', 'F#6 - - D6 F#6 - A6 B6', 'D#6 - F#6 - B6 - A6 -', 'B6 - - - . . . .'], drums: 'main' },
    c: { ch: 'Am Em C B Am Em C B', lead: [
      'A5 - - - C6 - E6 -', 'B5 - - - G5 - E5 -', 'C6 - - - E6 - G6 -', 'F#6 - - - D#6 - B5 -',
      'A5 - - - C6 - E6 -', 'G6 - - - E6 - B5 -', 'C6 - D6 - E6 - G6 -', 'F#6 - - - D#6 - - -'], drums: 'half' },
  };
  // 數讀房市: bright 8-bit data pop, C major (played in F), 140 BPM: a hook that climbs like a chart, a music-box
  // arpeggio ticking along, a clock's tick for a hi-hat. The chorus (b) soars and syncopates like a ticker; the bridge
  // (c) floats. Riding backwards it plays backwards (SEC_CHART_REV: every bar, and the order of its notes, reversed)
  const SEC_CHART = {
    intro: { ch: 'C C F G', lead: ['. . . . . . . .', '. . . . . . . .', 'C6 - G5 - E5 - C5 -', 'D5 - E5 - F5 - G5 -'], drums: 'half' },
    a1: { ch: 'C G Am F C G F G', lead: [
      'C5 - E5 G5 - C6 - B5', 'D6 - - B5 G5 - D5 -', 'E5 - A5 C6 - E6 - D6', 'C6 - A5 - F5 - A5 -',
      'C5 - E5 G5 - C6 - E6', 'D6 - - B5 G5 - B5 D6', 'C6 - A5 - F5 - A5 C6', 'B5 - - - G5 - - -'], drums: 'main' },
    a2: { ch: 'C G Am F C G F G', lead: [
      'C5 - E5 G5 - C6 - B5', 'D6 - - B5 G5 - D5 -', 'E5 - A5 C6 - E6 - D6', 'C6 - A5 - F5 - A5 -',
      'C5 - E5 G5 - C6 - E6', 'D6 - - B5 G5 - B5 D6', 'C6 - A5 - F5 - A5 C6', 'B5 - D6 - G6 - F6 D6'], drums: 'main' },
    b: { ch: 'F G Em Am F G C C', lead: [
      'A5 - C6 - F6 - E6 -', 'D6 - G6 - - - F6 E6', 'E6 - D6 - B5 - G5 -', 'A5 - C6 - E6 - - -',
      'F6 - E6 - D6 - C6 -', 'D6 - - E6 F6 - G6 -', 'E6 - D6 C6 - G5 - E6', 'C6 - - - . . . .'], drums: 'main' },
    c: { ch: 'Am F C G Am F Dm G', lead: [
      'A5 - - - E5 - - -', 'F5 - A5 - C6 - - -', 'G5 - - - E5 - C5 -', 'D5 - - - G5 - - -',
      'A5 - - - C6 - E6 -', 'F6 - - - C6 - A5 -', 'D6 - - - F6 - A6 -', 'G6 - - - B5 - D6 -'], drums: 'half' },
  };
  const revBar = bar => {                                        // a bar's notes in reverse order (each keeps its length)
    const ev = [];
    for (const tk of bar.split(' ')) { if (tk === '-' && ev.length) ev[ev.length - 1][1]++; else ev.push([tk === '-' ? '.' : tk, 1]); }
    return ev.reverse().flatMap(([n, len]) => [n, ...Array(n === '.' ? 0 : len - 1).fill('-'), ...Array(n === '.' ? len - 1 : 0).fill('.')]).join(' ');
  };
  const SEC_CHART_REV = Object.fromEntries(Object.entries(SEC_CHART).map(([k, s]) => [k, { ch: s.ch.split(' ').reverse().join(' '), lead: [...s.lead].reverse().map(revBar), drums: s.drums }]));
  // name → { bpm, tr (semitones from C), style (which band plays it), sec, head (once), loop, soft, gain }
  const SNOW = { bpm: 150, tr: TRANSPOSE, style: 'snow', sec: SEC_SNOW };
  const DESERT = { bpm: 128, tr: -2, style: 'sand', sec: SEC_DESERT, gain: 1.15 };
  const WATER = { bpm: 140, tr: -7, style: 'surf', sec: SEC_WATER, gain: 1.25 };   // the steel band reads a little quieter: lift it to match
  const JUNGLE = { bpm: 152, tr: 0, style: 'wood', sec: SEC_JUNGLE, gain: 1.1 };
  const NIGHT = { bpm: 136, tr: 0, style: 'city', sec: SEC_NIGHT, gain: 0.95 };
  const TOY = { bpm: 144, tr: -5, style: 'toy', sec: SEC_TOY, gain: 1.15 };
  const LAVA = { bpm: 160, tr: -2, style: 'rock', sec: SEC_LAVA, gain: 1.0 };
  const CYBER = { bpm: 128, tr: -3, style: 'synth', sec: SEC_CYBER, gain: 1.25 };
  const CHART = { bpm: 140, tr: 5, style: 'dream', sec: SEC_CHART, gain: 1.2 };
  const SONGS = {
    snow: { ...SNOW, head: ['intro'], loop: ['a1', 'a2', 'b', 'a2', 'c'] },
    title: { ...SNOW, head: [], loop: ['a1', 'a2', 'b', 'a2', 'c'], soft: true },
    snow_result: { ...SNOW, head: [], loop: ['c'], soft: true },
    water: { ...WATER, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    water_result: { ...WATER, head: [], loop: ['c'], soft: true },
    desert: { ...DESERT, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    desert_result: { ...DESERT, head: [], loop: ['c'], soft: true },
    jungle: { ...JUNGLE, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    jungle_result: { ...JUNGLE, head: [], loop: ['c'], soft: true },
    jungle_chase: { ...JUNGLE, bpm: 176, head: [], loop: ['b', 'a2', 'b', 'a1'], gain: 1.15 },              // the boulder after her: the chorus, flat out
    night: { ...NIGHT, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    night_result: { ...NIGHT, head: [], loop: ['c'], soft: true },
    factory: { ...TOY, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    factory_result: { ...TOY, head: [], loop: ['c'], soft: true },
    factory_tv: { ...TOY, bpm: 168, style: 'retro', head: [], loop: ['a1', 'b', 'a2', 'b'], gain: 0.9 },   // inside the television: the same tune as an old video game
    factory_back: { ...TOY, head: [], loop: ['b', 'a2', 'b', 'c', 'a1'] },
    factory_wind: { ...TOY, bpm: 176, head: [], loop: ['b', 'b', 'a2', 'b'], gain: 1.2 },               // wound right up: the chorus, flat out                                // out again
    volcano: { ...LAVA, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    volcano_result: { ...LAVA, head: [], loop: ['c'], soft: true },
    volcano_mine: { ...LAVA, bpm: 172, anvil: true, head: [], loop: ['a2', 'b', 'a1', 'b'] },             // down the mine: faster, hammers ringing
    volcano_erupt: { ...LAVA, bpm: 176, head: [], loop: ['b', 'b', 'a2', 'b', 'c'], gain: 1.05 },        // the mountain blows: the chorus, flat out
    cyber: { ...CYBER, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    cyber_result: { ...CYBER, head: [], loop: ['c'], soft: true },
    cyber_grav: { ...CYBER, head: [], loop: ['c', 'a2', 'b', 'c', 'b'], airy: true, gain: 1.45 },                      // the anti-gravity track: floating, the kick held back
    cyber_od: { ...CYBER, bpm: 150, head: [], loop: ['b', 'b', 'a1', 'b'], drive: true, gain: 1.0 },          // overdrive: faster, four on the floor, the lead an octave up too
    cyber_back: { ...CYBER, head: [], loop: ['a2', 'b', 'c', 'b'] },
    chart: { ...CHART, head: ['intro'], loop: ['a1', 'b', 'a2', 'b', 'c', 'b'] },
    chart_result: { ...CHART, head: [], loop: ['c'], soft: true },
    chart_back: { ...CHART, sec: SEC_CHART_REV, bpm: 126, head: [], loop: ['b', 'a1', 'c', 'a2'], rev: true, gain: 1.3 },   // time running back: the tune backwards, on a wobbling old tape
    chart_plan: { ...CHART, bpm: 132, head: [], loop: ['a1', 'c', 'a2', 'c'], plan: true, gain: 1.3 },                    // the blueprint: plucked short, a metronome ticking
    chart_space: { ...CHART, bpm: 118, head: [], loop: ['c', 'b', 'c', 'a2'], airy: true, gain: 1.35 },                  // in a third of the gravity: floating, the kick only on the bar
    chart_tube: { ...CHART, bpm: 164, head: ['intro'], loop: ['b', 'a2', 'b', 'a1', 'c', 'b'], drive: true, gain: 1.1 },              // the tube of data: flat out from the start
    chart_web: { ...CHART, bpm: 140, head: [], loop: ['a2', 'b', 'a1', 'c'], gain: 1.2 },                                 // on the website: the tune as it is, bright and clean
    chart_end: { ...CHART, bpm: 156, head: [], loop: ['b', 'a2', 'b', 'a1'], drive: true, gain: 1.1 },                   // the last run: the chorus, flat out
  };
  // flatten a song's sections into per-step events
  function compile(song, names) {
    const steps = [];
    for (const nm of names) {
      const sc = song.sec[nm], chords = sc.ch.split(' ');
      chords.forEach((cs, bar) => {
        const toks = sc.lead[bar].split(' ');
        for (let i = 0; i < 8; i++) {
          let len = 0;
          if (toks[i] !== '-' && toks[i] !== '.') { len = 1; while (i + len < 8 && toks[i + len] === '-') len++; }
          steps.push({ lead: len ? midi(toks[i]) : null, len, chord: CH[cs], i, bar, last: bar === chords.length - 1, drums: sc.drums, duty: sc.duty || 0.5 });
        }
      });
    }
    return steps;
  }

  const A = { ctx: null, muted: false, ready: false, theme: 'snow' };
  let master, musicBus, sfxBus, echoIn, echoDelay, noiseBuf, waves = {}, ski = null;
  try { A.muted = root.localStorage && root.localStorage.getItem('anje-ski-muted') === '1'; } catch (e) { A.muted = false; }

  function pulse(duty) {                                       // band-limited pulse wave via Fourier series
    if (waves[duty]) return waves[duty];
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return (waves[duty] = A.ctx.createPeriodicWave(re, im));
  }

  function build(ctx) {                                          // the mixer: buses → master → compressor → speakers
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    echoIn = ctx.createGain(); echoIn.gain.value = 0.22;      // a little echo on the lead, like a big open valley
    const dl = echoDelay = ctx.createDelay(1); dl.delayTime.value = 0.3; const fb = ctx.createGain(); fb.gain.value = 0.28;
    echoIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  A.init = () => {
    if (A.ctx) return;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC(); waves = {};
    build(A.ctx);
    A.ready = true;
    if (A.pending !== undefined) { const p = A.pending; A.pending = undefined; A.music(p); }
  };
  A.unlock = () => {                                            // call from inside a key / touch handler (iOS Safari needs that)
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };
  A.setMuted = m => {
    A.muted = m;
    try { root.localStorage && root.localStorage.setItem('anje-ski-muted', m ? '1' : '0'); } catch (e) { /* not kept */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.02);
  };
  A.playing = () => (seq && !seq.stop ? seq.name : (A.pending || null));
  A.pauseMusic = on => { if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.12 : 0.55, A.ctx.currentTime, 0.05); };   // quieter behind the pause menu
  A.suspend = () => { if (A.ctx && A.ctx.state === 'running') A.ctx.suspend(); };
  A.resume = () => { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };

  // ------------------------------------------------------------ voices
  function tone(t, f, dur, o = {}) {
    const { type = 'pulse', duty = 0.5, gain = 0.1, bus = sfxBus, to = null, attack = 0.004, release = 0.05, vib = 0, echo = false, sustain = 0.7 } = o;
    const ctx = A.ctx, osc = ctx.createOscillator(), g = ctx.createGain();
    if (type === 'pulse') osc.setPeriodicWave(pulse(duty)); else osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (vib) {                                                    // vibrato that fades in on long notes
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5;
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * vib, t + Math.min(0.3, dur));
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + release);
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setTargetAtTime(gain * sustain, t + attack, 0.08);
    g.gain.setValueAtTime(gain * sustain, t + Math.max(attack, dur - 0.01));
    g.gain.linearRampToValueAtTime(0, t + dur + release);
    osc.connect(g); g.connect(bus); if (echo) g.connect(echoIn);
    osc.start(t); osc.stop(t + dur + release + 0.02);
  }
  function noise(t, dur, o = {}) {
    const { gain = 0.1, bus = sfxBus, filter = 'highpass', freq = 6000, q = 0.7, to = null, attack = 0.002, decay = null } = o;
    const ctx = A.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = filter; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    if (decay) g.gain.setTargetAtTime(0, t + attack, decay); else g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function kick(t, gain, bus) { tone(t, 150, 0.14, { type: 'sine', to: 45, gain, bus, sustain: 1, release: 0.04 }); }
  function snare(t, gain, bus) { noise(t, 0.16, { gain, bus, filter: 'bandpass', freq: 1900, q: 0.8, decay: 0.045 }); tone(t, 190, 0.06, { type: 'triangle', gain: gain * 0.6, bus, to: 140 }); }
  function hat(t, gain, bus) { noise(t, 0.04, { gain, bus, filter: 'highpass', freq: 7500, decay: 0.012 }); }
  // a cartoon voice: a buzzy pulse through two vowel formants. pitch goes f0 → f1 (then f2 if given), vowels v0 → v1
  // ('a' 'o' 'u' 'e' 'i'), with a wobble on top; a whole crowd is a few of these at different pitches
  const VOW = { a: [800, 1250], o: [520, 900], u: [350, 750], e: [480, 1850], i: [320, 2300] };
  function voice(t, dur, f0, f1, v0, v1, o = {}) {
    const { gain = 0.07, f2 = null, vib = 7, depth = 0.03, bus = sfxBus } = o;
    const ctx = A.ctx, osc = ctx.createOscillator(), g = ctx.createGain(), out = ctx.createGain();
    osc.setPeriodicWave(pulse(0.3));
    osc.frequency.setValueAtTime(f0, t);
    if (f2) { osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4); osc.frequency.exponentialRampToValueAtTime(f2, t + dur); }
    else osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = vib; lg.gain.value = f0 * depth; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    for (let k = 0; k < 2; k++) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5;
      bp.frequency.setValueAtTime(VOW[v0][k], t); bp.frequency.linearRampToValueAtTime(VOW[v1][k], t + dur * 0.5);
      const kg = ctx.createGain(); kg.gain.value = k ? 0.6 : 1; osc.connect(bp); bp.connect(kg); kg.connect(g);
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.03); g.gain.setValueAtTime(1, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    out.gain.value = gain * 3.2; g.connect(out); out.connect(bus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function bubbles(t, n) { for (let k = 0; k < n; k++) tone(t + k * 0.07, 300 + Math.random() * 300, 0.06, { type: 'sine', to: 900 + Math.random() * 500, gain: 0.05, sustain: 1, release: 0.02 }); }

  // ------------------------------------------------------------ music sequencer
  let seq = null;
  A.music = name => {
    if (!A.ready) { A.pending = name; return; }
    if (seq) { seq.stop = true; seq = null; }
    if (!name) return;
    const song = SONGS[name], head = compile(song, song.head), loop = compile(song, song.loop), step = 60 / song.bpm / 2;   // one step = an eighth note
    const s = seq = { name, i: 0, t: A.ctx.currentTime + 0.08, t0: A.ctx.currentTime + 0.08, head, loop, soft: !!song.soft, stop: false, step, tr: song.tr, style: song.style, anvil: !!song.anvil, song };
    echoDelay.delayTime.setValueAtTime(step * 1.5, A.ctx.currentTime);
    const bus = A.ctx.createGain(); bus.gain.value = (s.soft ? 0.7 : 1) * (song.gain || 1); bus.connect(musicBus); s.bus = bus;
    const tick = () => {
      if (s.stop) { bus.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); return; }
      while (s.t < A.ctx.currentTime + 0.2) { playStep(s, s.i < head.length ? head[s.i] : loop[(s.i - head.length) % loop.length], s.t); s.i++; s.t += step; }
      setTimeout(tick, 25);
    };
    tick();
  };
  A.beat = () => (seq && A.ctx ? (A.ctx.currentTime - seq.t0) / (seq.step * 2) : null);   // beats since the tune began (for a map's picture to pulse with it)
  function playStep(s, st, t) {
    if (s.style === 'surf') { playSurf(s, st, t); return; }
    if (s.style === 'sand') { playSand(s, st, t); return; }
    if (s.style === 'wood') { playWood(s, st, t); return; }
    if (s.style === 'city') { playCity(s, st, t); return; }
    if (s.style === 'toy') { playToy(s, st, t); return; }
    if (s.style === 'retro') { playRetro(s, st, t); return; }
    if (s.style === 'rock') { playRock(s, st, t); return; }
    if (s.style === 'synth') { playSynth(s, st, t); return; }
    if (s.style === 'dream') { playDream(s, st, t); return; }
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12];
    if (st.lead !== null) tone(t, hz(st.lead), st.len * STEP - 0.02, { duty: st.duty, gain: 0.13, bus: b, echo: true, vib: st.len >= 3 ? 0.012 : 0 });
    // sparkle: 16th-note arpeggio of the chord, an octave up, very quiet
    if (st.drums === 'main') for (let k = 0; k < 2; k++) tone(t + k * STEP / 2, hz(root_ + 24 + tri[(st.i * 2 + k) % 4]), STEP / 2 - 0.01, { duty: 0.125, gain: 0.032, bus: b, sustain: 0.5, release: 0.02 });
    // bass: octave bounce, a fifth to lead into the next bar
    const bn = st.i === 7 ? root_ + 7 : st.i % 2 ? root_ + 12 : root_;
    if (st.drums === 'main' || st.i % 2 === 0) tone(t, hz(bn - 12), STEP * (st.drums === 'main' ? 0.9 : 1.8), { type: 'triangle', gain: 0.26, bus: b, sustain: 0.85, release: 0.03 });
    if (st.drums === 'main') {
      if (st.i === 0 || st.i === 4 || (st.i === 7 && st.bar % 2)) kick(t, 0.5, b);
      if (st.i === 2 || st.i === 6) snare(t, 0.22, b);
      hat(t, st.i % 2 ? 0.07 : 0.035, b);
      if (st.last && st.i >= 6) snare(t + STEP / 2, 0.14, b);
    } else {
      if (st.i === 0) kick(t, 0.45, b);
      if (st.i === 4) snare(t, 0.16, b);
      if (st.i % 2 === 0) hat(t, 0.04, b);
      if (st.last && st.i >= 4) { snare(t, 0.12, b); snare(t + STEP / 2, 0.15, b); }
    }
  }
  // the steel band: a pan lead (a bright pulse that rings down; long notes rolled like a real pan), an octave
  // shimmer, off-beat chord skanks, a 3-3-2 calypso bass, congas, a shaker, kick and rim clicks
  const BASS_332 = { 0: 0, 3: 0, 4: 7, 6: 12 };               // boom . . boom boom . boom .
  function playSurf(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7] : [0, 4, 7], f = n => hzOf(n, s.tr);
    if (st.lead !== null) {
      const roll = st.len >= 3 ? st.len : 1;
      for (let k = 0; k < roll; k++) {
        const dur = (roll > 1 ? 1 : st.len) * STEP - 0.02, g0 = k ? 0.075 : 0.12;
        tone(t + k * STEP, f(st.lead), dur, { duty: 0.25, gain: g0, bus: b, echo: k === 0, sustain: 0.32, release: 0.09 });
        tone(t + k * STEP, f(st.lead + 12), Math.min(dur, 0.12), { type: 'sine', gain: g0 * 0.28, bus: b, sustain: 0.2, release: 0.05 });
      }
    }
    if (st.i % 2 === 1) tri.forEach(d => tone(t, f(root_ + 12 + d), 0.07, { duty: 0.5, gain: 0.022, bus: b, sustain: 0.5, release: 0.02 }));
    const bass = st.drums === 'main' ? st.i in BASS_332 : st.i === 0 || st.i === 4;
    if (bass) tone(t, f(root_ + (BASS_332[st.i] || 0)), STEP * (st.i === 0 ? 1.6 : 0.9), { type: 'triangle', gain: 0.27, bus: b, sustain: 0.8, release: 0.03 });
    const conga = (at, high, g) => tone(at, high ? 330 : 220, 0.09, { type: 'triangle', to: high ? 260 : 170, gain: g, bus: b, sustain: 0.4, release: 0.03 });
    for (let k = 0; k < 2; k++) noise(t + k * STEP / 2, 0.035, { gain: k ? 0.022 : 0.035, bus: b, filter: 'highpass', freq: 8000, decay: 0.01 });   // shaker
    if (st.drums === 'main') {
      if (st.i === 0 || st.i === 4) kick(t, 0.42, b);
      if (st.i === 2 || st.i === 6) noise(t, 0.05, { gain: 0.12, bus: b, filter: 'bandpass', freq: 2600, q: 2, decay: 0.015 });   // rim click
      if (st.i === 3 || st.i === 7) conga(t, false, 0.09);
      if (st.i === 5) conga(t, true, 0.08);
      if (st.last && st.i >= 6) conga(t + STEP / 2, true, 0.08);
    } else {
      if (st.i === 0) kick(t, 0.36, b);
      if (st.i === 3 || st.i === 6) conga(t, st.i === 6, 0.07);
    }
  }

  // the desert band: a reedy narrow pulse lead with a fast vibrato and a grace note from above on longer notes, a
  // plucked oud-like answer on the off-beats, a drone (root and fifth) under it all, darbuka dum / tek, finger cymbals
  const MAQSUM = { 0: 'dum', 1: 'tek', 3: 'tek', 4: 'dum', 6: 'tek' };
  function playSand(s, st, t) {
    const STEP = s.step, b = s.bus, [root_] = st.chord, f = n => hzOf(n, s.tr);
    if (st.lead !== null) {
      const dur = st.len * STEP - 0.02, g = st.len >= 2 ? 0.045 : 0;
      if (g) tone(t, f(st.lead + 1), g, { duty: 0.125, gain: 0.08, bus: b, sustain: 1, release: 0.01 });   // grace note
      tone(t + g, f(st.lead), dur - g, { duty: 0.125, gain: 0.12, bus: b, echo: true, vib: g ? 0.018 : 0, sustain: 0.75 });
    }
    if (st.i % 2 === 1 && st.drums === 'main') tone(t, f(root_ + 12 + (st.i === 3 ? 7 : st.i === 7 ? 12 : 0)), 0.09, { duty: 0.25, gain: 0.04, bus: b, sustain: 0.3, release: 0.05 });
    if (st.i === 0) {                                            // the drone: root and fifth held through the bar
      tone(t, f(root_ - 12), STEP * 7.6, { type: 'triangle', gain: 0.2, bus: b, sustain: 0.9, release: 0.06 });
      tone(t, f(root_ - 5), STEP * 7.6, { type: 'triangle', gain: 0.09, bus: b, sustain: 0.9, release: 0.06 });
    }
    if (st.drums === 'main' && st.i === 4) tone(t, f(root_ - 12), STEP * 0.9, { type: 'triangle', gain: 0.14, bus: b, sustain: 0.7, release: 0.03 });
    const dum = (at, g) => { tone(at, 130, 0.16, { type: 'sine', to: 65, gain: g, bus: b, sustain: 1, release: 0.04 }); noise(at, 0.06, { gain: g * 0.25, bus: b, filter: 'lowpass', freq: 900, decay: 0.02 }); };
    const tek = (at, g) => { noise(at, 0.05, { gain: g, bus: b, filter: 'bandpass', freq: 3200, q: 1.5, decay: 0.012 }); tone(at, 720, 0.03, { type: 'triangle', gain: g * 0.5, bus: b, sustain: 0.5, release: 0.01 }); };
    const hit = MAQSUM[st.i];
    if (st.drums === 'main') {
      if (hit === 'dum') dum(t, 0.48); else if (hit === 'tek') tek(t, 0.13);
      if (st.i === 7 || st.i === 2) tek(t + STEP / 2, 0.06);       // the little ka between beats
      if (st.last && st.i >= 6) { tek(t, 0.13); tek(t + STEP / 2, 0.15); }
    } else {
      if (st.i === 0) dum(t, 0.4);
      if (st.i === 4) tek(t, 0.1);
      if (st.i === 6) tek(t, 0.06);
    }
    if (st.i === 7 && st.bar % 2 === 1) for (const fr of [3520, 5280]) tone(t + STEP / 2, fr, 0.25, { type: 'sine', gain: 0.025, bus: b, sustain: 0.3, release: 0.2 });   // zills
  }

  // the jungle band: a marimba lead (a bright pulse that dies away fast, a soft sine under it; long notes rolled),
  // a kalimba plinking chord tones on the off-beats, a syncopated bass, galloping log drums, claps, a shaker, and
  // a bird calling every few bars
  const WOOD_BASS = { 0: 0, 3: 0, 4: 7, 6: 12, 7: 7 };
  function chirp(at, g, bus) { tone(at, 2400, 0.06, { type: 'sine', to: 3300, gain: g, bus, sustain: 1, release: 0.02 }); tone(at + 0.09, 2700, 0.07, { type: 'sine', to: 3600, gain: g, bus, sustain: 1, release: 0.02 }); }
  function playWood(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12], f = n => hzOf(n, s.tr);
    if (st.lead !== null) {
      const roll = st.len >= 3 ? st.len * 2 : 1;                // a long note on a marimba is a roll
      for (let k = 0; k < roll; k++) {
        const at = t + k * STEP / 2, dur = roll > 1 ? STEP / 2 - 0.01 : st.len * STEP - 0.02, g0 = k ? 0.075 - 0.004 * k : 0.12;
        tone(at, f(st.lead), Math.min(dur, 0.22), { duty: 0.25, gain: g0, bus: b, echo: k === 0, sustain: 0.28, release: 0.07 });
        tone(at, f(st.lead - 12), Math.min(dur, 0.18), { type: 'sine', gain: g0 * 0.45, bus: b, sustain: 0.3, release: 0.05 });
      }
    }
    if (st.i % 2 === 1) tone(t, f(root_ + 24 + tri[(st.i >> 1) % 4]), 0.08, { type: 'sine', gain: 0.045, bus: b, sustain: 0.3, release: 0.06 });   // kalimba
    const bass = st.drums === 'main' ? st.i in WOOD_BASS : st.i === 0 || st.i === 4;
    if (bass) tone(t, f(root_ - 12 + (WOOD_BASS[st.i] || 0)), STEP * (st.i === 0 ? 1.4 : 0.85), { type: 'triangle', gain: 0.27, bus: b, sustain: 0.8, release: 0.03 });
    const tom = (at, hi, g) => tone(at, hi ? 260 : 165, 0.13, { type: 'triangle', to: hi ? 190 : 110, gain: g, bus: b, sustain: 0.5, release: 0.04 });
    const clap = (at, g) => { noise(at, 0.06, { gain: g, bus: b, filter: 'bandpass', freq: 1500, q: 0.9, decay: 0.02 }); noise(at + 0.012, 0.06, { gain: g * 0.7, bus: b, filter: 'bandpass', freq: 1700, q: 0.9, decay: 0.025 }); };
    for (let k = 0; k < 2; k++) noise(t + k * STEP / 2, 0.035, { gain: k ? 0.02 : 0.032, bus: b, filter: 'highpass', freq: 8500, decay: 0.01 });   // shaker
    if (st.drums === 'main') {
      if (st.i === 0 || st.i === 4 || (st.i === 7 && st.bar % 2)) kick(t, 0.45, b);
      if (st.i === 2 || st.i === 6) clap(t, 0.14);
      if (st.i === 3 || st.i === 6) tom(t, true, 0.12);
      if (st.i === 5 || st.i === 7) tom(t, false, 0.14);
      if (st.last && st.i >= 4) tom(t + STEP / 2, st.i < 6, 0.12);   // a fill into the next section
      if (st.i === 0 && st.bar % 4 === 2) chirp(t + STEP, 0.03, b);
    } else {
      if (st.i === 0) kick(t, 0.38, b);
      if (st.i === 4) clap(t, 0.1);
      if (st.i === 6 || st.i === 7) tom(t, st.i === 6, 0.08);
      if (st.i === 2 && st.bar % 2 === 0) chirp(t, 0.03, b);
    }
  }

  // the night band: a square lead doubled an octave down on a thinner pulse, a sixteenth-note arpeggio with echo, a
  // sawtooth bass bouncing in octaves, four on the floor, a big clap on the backbeat, open hats on the off-beats
  function playCity(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12], f = n => hzOf(n, s.tr);
    if (st.lead !== null) {
      const dur = st.len * STEP - 0.02;
      tone(t, f(st.lead), dur, { duty: 0.5, gain: 0.1, bus: b, echo: true, vib: st.len >= 3 ? 0.01 : 0, sustain: 0.75 });
      tone(t, f(st.lead - 12), dur, { duty: 0.25, gain: 0.045, bus: b, sustain: 0.6 });
    }
    if (st.drums === 'main') for (let k = 0; k < 2; k++) tone(t + k * STEP / 2, f(root_ + 24 + tri[(st.i * 2 + k) % 4]), STEP / 2 - 0.01, { duty: 0.125, gain: 0.03, bus: b, echo: k === 1, sustain: 0.5, release: 0.02 });
    else if (st.i % 2 === 0) tone(t, f(root_ + 24 + tri[(st.i >> 1) % 4]), STEP - 0.02, { duty: 0.125, gain: 0.03, bus: b, echo: true, sustain: 0.5, release: 0.03 });
    const bass = st.drums === 'main' ? root_ - 12 + (st.i % 2 ? 12 : 0) : st.i % 4 === 0 ? root_ - 12 : null;
    if (bass !== null) tone(t, f(bass), STEP * (st.drums === 'main' ? 0.85 : 1.8), { type: 'sawtooth', gain: 0.07, bus: b, sustain: 0.7, release: 0.03 });
    if (bass !== null) tone(t, f(bass), STEP * (st.drums === 'main' ? 0.85 : 1.8), { type: 'triangle', gain: 0.16, bus: b, sustain: 0.8, release: 0.03 });
    const clap = (at, g) => { noise(at, 0.25, { gain: g, bus: b, filter: 'bandpass', freq: 1400, q: 0.7, decay: 0.07 }); noise(at + 0.01, 0.06, { gain: g * 0.8, bus: b, filter: 'bandpass', freq: 2200, q: 1, decay: 0.02 }); };
    const ohat = (at, g) => noise(at, 0.1, { gain: g, bus: b, filter: 'highpass', freq: 7000, decay: 0.035 });
    if (st.drums === 'main') {
      if (st.i % 2 === 0) kick(t, 0.5, b);
      if (st.i === 2 || st.i === 6) clap(t, 0.2);
      if (st.i % 2 === 1) ohat(t, 0.06);
      hat(t + STEP / 2, 0.025, b);
      if (st.last && st.i >= 6) { snare(t, 0.14, b); snare(t + STEP / 2, 0.17, b); }
    } else {
      if (st.i === 0) kick(t, 0.45, b);
      if (st.i === 4) clap(t, 0.17);
      if (st.i % 2 === 1) hat(t, 0.035, b);
      if (st.last && st.i >= 4) { snare(t, 0.1, b); snare(t + STEP / 2, 0.13, b); }
    }
  }

  // the toy band: a music-box lead (a sine bell with its octave ringing over it, a thin square under it), a
  // glockenspiel sparkle on the off-beats, an oom-pah bass (root, then the fifth up high), woodblocks tick-tocking,
  // claps on the backbeat; a spring boing now and then; a wind-up ratchet into each section
  function spring(t, f0, f1, dur, gain, bus) {                  // a spring: a pitch that leaps and wobbles fast as it rings out
    const ctx = A.ctx, osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.35); osc.frequency.exponentialRampToValueAtTime(f1 * 0.8, t + dur);
    lfo.frequency.value = 22; lg.gain.setValueAtTime(f1 * 0.18, t); lg.gain.linearRampToValueAtTime(f1 * 0.02, t + dur); lfo.connect(lg); lg.connect(osc.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.setTargetAtTime(0, t + 0.02, dur / 3);
    osc.connect(g); g.connect(bus); osc.start(t); lfo.start(t); osc.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  function playToy(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12], f = n => hzOf(n, s.tr);
    if (st.lead !== null) {
      const dur = st.len * STEP - 0.02;
      tone(t, f(st.lead), Math.min(dur, 0.5), { type: 'sine', gain: 0.13, bus: b, echo: true, sustain: 0.25, release: 0.12 });
      tone(t, f(st.lead + 12), Math.min(dur, 0.18), { type: 'sine', gain: 0.045, bus: b, sustain: 0.2, release: 0.08 });
      tone(t, f(st.lead), dur, { duty: 0.25, gain: 0.04, bus: b, sustain: 0.6, vib: st.len >= 3 ? 0.008 : 0 });
    }
    if (st.drums === 'main' && st.i % 2 === 1) tone(t, f(root_ + 24 + tri[(st.i >> 1) % 4]), 0.1, { type: 'sine', gain: 0.04, bus: b, sustain: 0.3, release: 0.1 });   // glockenspiel
    if (st.drums !== 'main' && st.i % 4 === 2) tone(t, f(root_ + 24 + tri[(st.bar + (st.i >> 2)) % 4]), 0.2, { type: 'sine', gain: 0.04, bus: b, echo: true, sustain: 0.3, release: 0.15 });
    if (st.i === 0 || st.i === 4) tone(t, f(root_ - 12 + (st.i === 4 && st.drums === 'main' ? 7 : 0)), STEP * 0.9, { type: 'triangle', gain: 0.27, bus: b, sustain: 0.75, release: 0.03 });   // oom
    if (st.drums === 'main' && (st.i === 2 || st.i === 6)) for (const d of [4, 7]) tone(t, f(root_ + d), 0.08, { duty: 0.5, gain: 0.025, bus: b, sustain: 0.4, release: 0.02 });   // pah
    const wood = (at, hi, g) => tone(at, hi ? 1250 : 880, 0.04, { type: 'sine', gain: g, bus: b, sustain: 0.2, release: 0.02 });
    const clap = (at, g) => { noise(at, 0.08, { gain: g, bus: b, filter: 'bandpass', freq: 1600, q: 0.9, decay: 0.022 }); noise(at + 0.01, 0.06, { gain: g * 0.6, bus: b, filter: 'bandpass', freq: 2400, q: 1, decay: 0.02 }); };
    if (st.drums === 'main') {
      if (st.i === 0 || st.i === 4) kick(t, 0.45, b);
      if (st.i === 2 || st.i === 6) clap(t, 0.13);
      if (st.i % 2 === 1) wood(t, st.i % 4 === 1, 0.07);         // tick, tock
      if (st.last && st.i >= 4) for (let k = 0; k < 4; k++) noise(t + k * STEP / 4, 0.02, { gain: 0.07, bus: b, filter: 'bandpass', freq: 3000, q: 2, decay: 0.006 });   // the wind-up ratchet
      if (st.i === 7 && st.bar % 4 === 3) spring(t, 160, 520, 0.35, 0.05, b);
    } else {
      if (st.i === 0) kick(t, 0.38, b);
      if (st.i === 4) clap(t, 0.1);
      if (st.i % 2 === 1) wood(t, st.i % 4 === 1, 0.05);
    }
  }

  // the old video game band: two square-wave channels (the tune on a half pulse, the chord arpeggiated on a thin one),
  // a triangle bass, drums made of noise
  function playRetro(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12], f = n => hzOf(n, s.tr);
    if (st.lead !== null) tone(t, f(st.lead), st.len * STEP * 0.85, { duty: 0.5, gain: 0.09, bus: b, sustain: 0.8, release: 0.01 });
    for (let k = 0; k < 2; k++) tone(t + k * STEP / 2, f(root_ + 12 + tri[(st.i * 2 + k) % 4]), STEP / 2 - 0.01, { duty: 0.125, gain: 0.035, bus: b, sustain: 0.6, release: 0.01 });
    tone(t, f(root_ - 12 + (st.i % 2 ? 12 : 0)), STEP * 0.8, { type: 'triangle', gain: 0.22, bus: b, sustain: 0.9, release: 0.01 });
    if (st.i % 4 === 0) noise(t, 0.08, { gain: 0.16, bus: b, filter: 'lowpass', freq: 700, decay: 0.03 });
    if (st.i % 4 === 2) noise(t, 0.1, { gain: 0.1, bus: b, filter: 'bandpass', freq: 2500, q: 0.7, decay: 0.04 });
    noise(t + STEP / 2, 0.02, { gain: 0.03, bus: b, filter: 'highpass', freq: 8000, decay: 0.008 });
  }

  // the volcano band: a square lead with an octave below it, power chords (root and fifth on sawtooth) chugging in
  // eighths, a triangle sub, a rock beat (kick on 1, the "and" of 2 and 3; a fat snare on 2 and 4), a crash on each
  // section, a tom fill into the next; down the mine, an anvil ringing on the off-beats
  function playRock(s, st, t) {
    const STEP = s.step, b = s.bus, [root_] = st.chord, f = n => hzOf(n, s.tr);
    if (st.lead !== null) {
      const dur = st.len * STEP - 0.02;
      tone(t, f(st.lead), dur, { duty: 0.5, gain: 0.095, bus: b, echo: true, vib: st.len >= 3 ? 0.014 : 0, sustain: 0.8 });
      tone(t, f(st.lead - 12), dur, { duty: 0.25, gain: 0.045, bus: b, sustain: 0.7 });
    }
    const main = st.drums === 'main', chug = main || st.i % 2 === 0, pm = main && st.i % 4 !== 0;   // palm-muted between the accents
    if (chug) for (const d of [0, 7]) tone(t, f(root_ - 12 + d), STEP * (pm ? 0.45 : main ? 0.9 : 1.8), { type: 'sawtooth', gain: d ? 0.035 : 0.05, bus: b, sustain: pm ? 0.4 : 0.7, release: 0.02 });
    if (chug) tone(t, f(root_ - 24), STEP * (main ? 0.9 : 1.8), { type: 'triangle', gain: 0.22, bus: b, sustain: 0.85, release: 0.03 });
    const crash = at => noise(at, 1.1, { gain: 0.09, bus: b, filter: 'highpass', freq: 5000, decay: 0.35 });
    if (st.bar === 0 && st.i === 0) crash(t);
    if (main) {
      if (st.i === 0 || st.i === 3 || st.i === 5) kick(t, 0.55, b);
      if (st.i === 2 || st.i === 6) { snare(t, 0.26, b); noise(t, 0.12, { gain: 0.06, bus: b, filter: 'lowpass', freq: 900, decay: 0.05 }); }
      hat(t, st.i % 2 ? 0.05 : 0.08, b);
      if (st.last && st.i >= 4) tone(t, [196, 165, 131, 110][st.i - 4], 0.14, { type: 'triangle', to: [150, 125, 100, 80][st.i - 4], gain: 0.2, bus: b, sustain: 0.6, release: 0.04 });   // a tom fill
      if (s.anvil && st.i % 2 === 1) { tone(t, 1760, 0.12, { type: 'square', gain: 0.025, bus: b, sustain: 0.2, release: 0.1 }); tone(t, 2637, 0.1, { type: 'sine', gain: 0.03, bus: b, sustain: 0.2, release: 0.12 }); }
    } else {
      if (st.i === 0) kick(t, 0.5, b);
      if (st.i === 4) snare(t, 0.22, b);
      if (st.i % 2 === 0) hat(t, 0.05, b);
      if (st.last && st.i >= 4) { snare(t, 0.14, b); snare(t + STEP / 2, 0.17, b); }
    }
  }

  // the neon band: a thin square lead with a detuned twin (a chorus) and an echo, a pad of the chord swelling in on each
  // bar, a sixteenth-note octave bass (sawtooth on a triangle), a gated snare with a long bright tail, closed and open
  // hats; floating (airy): the kick only on the bar, the bass softer; overdrive (drive): four on the floor, sixteenth
  // hats, the lead doubled an octave up
  function playSynth(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12], f = n => hzOf(n, s.tr), so = s.song || {};
    if (st.lead !== null) {
      const dur = st.len * STEP - 0.02;
      tone(t, f(st.lead), dur, { duty: 0.25, gain: 0.075, bus: b, echo: true, vib: st.len >= 3 ? 0.012 : 0, sustain: 0.8 });
      tone(t, f(st.lead) * 1.007, dur, { duty: 0.5, gain: 0.045, bus: b, sustain: 0.7 });
      if (so.drive) tone(t, f(st.lead + 12), dur, { duty: 0.125, gain: 0.03, bus: b, sustain: 0.6 });
    }
    if (st.i === 0) for (const d of tri.slice(0, 3)) tone(t, f(root_ + 12 + d), STEP * 7.6, { duty: 0.125, gain: 0.022, bus: b, attack: STEP * 1.5, sustain: 0.9, release: 0.2 });   // the pad
    const half = st.drums !== 'main';
    for (let k = 0; k < 2; k++) {                                  // the bass: sixteenths, root and octave
      const n = root_ - 12 + (k ? 12 : 0), at = t + k * STEP / 2;
      if (half && k) continue;
      tone(at, f(n), STEP / 2 - 0.02, { type: 'sawtooth', gain: so.airy ? 0.028 : 0.045, bus: b, sustain: 0.5, release: 0.02 });
      tone(at, f(n - 12), STEP / 2 - 0.02, { type: 'triangle', gain: so.airy ? 0.11 : 0.16, bus: b, sustain: 0.7, release: 0.02 });
    }
    if (half && st.i % 2 === 1) tone(t, f(root_ + 24 + tri[(st.i >> 1) % 4]), STEP * 0.9, { type: 'triangle', gain: 0.05, bus: b, echo: true, sustain: 0.5, release: 0.05 });   // a sparkle in the quiet bits
    const gsn = (at, g) => { snare(at, g, b); noise(at, 0.32, { gain: g * 0.45, bus: b, filter: 'bandpass', freq: 3200, q: 0.6, decay: 0.16 }); };   // a gated snare, its tail bright
    if (half) {
      if (st.i === 0) kick(t, 0.5, b);
      if (st.i === 4) gsn(t, 0.2);
      if (st.i % 2 === 1) hat(t, 0.04, b);
      if (st.last && st.i >= 6) { snare(t, 0.12, b); snare(t + STEP / 2, 0.15, b); }
      return;
    }
    if (so.drive ? st.i % 2 === 0 : so.airy ? st.i === 0 : st.i === 0 || st.i === 4) kick(t, 0.55, b);
    if (st.i === 2 || st.i === 6) gsn(t, so.airy ? 0.16 : 0.24);
    hat(t, 0.04, b); if (so.drive) hat(t + STEP / 2, 0.03, b);
    if (st.i % 4 === 3) noise(t, 0.12, { gain: 0.05, bus: b, filter: 'highpass', freq: 6500, decay: 0.05 });   // open hat
    if (st.last && st.i >= 4) { snare(t, 0.13, b); snare(t + STEP / 2, 0.16, b); }
  }

  // the data-pop band: a square lead with a bell an octave over it, a music-box arpeggio of the chord in sixteenths,
  // an octave-bouncing bass, kick and clap, and a clock's tick on every step. Backwards (rev): a wobbling tape, no
  // kick, the bell swelling in instead of striking; the blueprint (plan): every note plucked short, a metronome on the
  // beat; floating (airy): the kick only on the bar, long echoes; flat out (drive): four on the floor, the lead doubled
  function playDream(s, st, t) {
    const STEP = s.step, b = s.bus, [root_, q] = st.chord, tri = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12], f = n => hzOf(n, s.tr), so = s.song || {};
    const vib = so.rev ? 0.02 : 0;
    if (st.lead !== null) {
      const dur = so.plan ? Math.min(STEP * 0.6, st.len * STEP - 0.02) : st.len * STEP - 0.02;
      tone(t, f(st.lead), dur, { duty: 0.25, gain: 0.085, bus: b, echo: true, vib: vib || (st.len >= 3 ? 0.01 : 0), sustain: so.plan ? 0.3 : 0.75 });
      tone(t, f(st.lead + 12), Math.min(dur, STEP * 2), { type: 'triangle', gain: 0.05, bus: b, attack: so.rev ? STEP * 0.8 : 0.005, sustain: 0.3, release: 0.12, vib });
      if (so.drive) tone(t, f(st.lead - 12), dur, { duty: 0.5, gain: 0.03, bus: b, sustain: 0.6 });
    }
    const half = st.drums !== 'main';
    if (!half || st.i % 2 === 0) for (let k = 0; k < 2; k++) tone(t + k * STEP / 2, f(root_ + 24 + tri[(st.i * 2 + k) % 4]), STEP / 2 - 0.01, { type: 'triangle', gain: so.airy ? 0.04 : 0.03, bus: b, echo: so.airy, sustain: 0.4, release: 0.03, vib });   // the music box
    const bn = st.i === 7 ? root_ + 7 : st.i % 2 ? root_ + 12 : root_;
    if (!half || st.i % 2 === 0) tone(t, f(bn - 12), STEP * (half ? 1.8 : 0.85), { duty: 0.5, gain: so.airy ? 0.05 : 0.07, bus: b, sustain: 0.7, release: 0.03, vib });
    if (!half || st.i % 2 === 0) tone(t, f(bn - 24), STEP * (half ? 1.8 : 0.85), { type: 'triangle', gain: 0.18, bus: b, sustain: 0.85, release: 0.03 });
    const clap = (at, g) => { noise(at, 0.12, { gain: g, bus: b, filter: 'bandpass', freq: 1500, q: 0.9, decay: 0.04 }); noise(at + 0.012, 0.1, { gain: g * 0.7, bus: b, filter: 'bandpass', freq: 1700, q: 0.9, decay: 0.035 }); };
    const tick = (at, g) => tone(at, 3200, 0.02, { type: 'sine', gain: g, bus: b, sustain: 1, release: 0.01 });
    tick(t, st.i % 2 ? 0.03 : 0.05);                                // the clock
    if (so.plan && st.i % 2 === 0) tone(t, st.i === 0 ? 1760 : 1320, 0.04, { type: 'square', gain: 0.04, bus: b, sustain: 0.5, release: 0.01 });   // the metronome
    if (so.rev) { if (st.i === 4) clap(t, 0.12); if (st.i === 0) noise(t, 0.5, { gain: 0.05, bus: b, filter: 'bandpass', freq: 800, to: 200, decay: 0.25 }); return; }   // (backwards: a swish where the kick was)
    if (half) { if (st.i === 0) kick(t, 0.45, b); if (st.i === 4) clap(t, 0.14); if (st.last && st.i >= 6) { snare(t, 0.12, b); snare(t + STEP / 2, 0.15, b); } return; }
    if (so.drive ? st.i % 2 === 0 : so.airy ? st.i === 0 : st.i === 0 || st.i === 4 || (st.i === 7 && st.bar % 2)) kick(t, 0.5, b);
    if (st.i === 2 || st.i === 6) clap(t, so.airy ? 0.12 : 0.18);
    if (so.drive) hat(t + STEP / 2, 0.035, b);
    if (st.last && st.i >= 4) { snare(t, 0.13, b); snare(t + STEP / 2, 0.16, b); }
  }

  // ------------------------------------------------------------ effects
  const arp = (t, notes, step, dur, o = {}) => notes.forEach((n, i) => tone(t + i * step, 440 * Math.pow(2, (n - 69) / 12), dur, o));
  A.sfx = (type, o = {}) => {
    if (!A.ready) return;
    const t = (o.at ?? A.ctx.currentTime) + 0.005, wet = A.theme === 'water' || A.theme === 'jungle', dry = A.theme === 'desert', wild = A.theme === 'jungle', city = A.theme === 'night', toy = A.theme === 'factory', hot = A.theme === 'volcano', cy = A.theme === 'cyber', ch = A.theme === 'chart';
    switch (type) {
      case 'jump': if (ch) { tone(t, 660, 0.06, { duty: 0.25, gain: 0.08, sustain: 1, release: 0.01 }); tone(t + 0.05, 1320, 0.12, { type: 'triangle', to: 1760, gain: 0.07, sustain: 0.6 }); break; }   // a chime, like a point added to a chart
        if (cy) { tone(t, 520, 0.1, { to: 1400, gain: 0.08, duty: 0.25 }); noise(t, 0.12, { gain: 0.05, filter: 'highpass', freq: 5000, to: 9000 }); break; }   // a zap of the board's magnets
        tone(t, 440, 0.09, { to: 900, gain: 0.1, duty: 0.5 }); break;
      case 'ramp': tone(t, 300, 0.28, { to: 1300, gain: 0.1, duty: 0.25 }); noise(t, 0.5, { gain: 0.08, filter: 'bandpass', freq: wet ? 1200 : 600, to: wet ? 5000 : 2500 }); break;
      case 'land':
        if (wet) { kick(t, 0.25, sfxBus); noise(t, 0.4, { gain: 0.16 + 0.08 * Math.min(1, o.airT || 0.3), filter: 'lowpass', freq: 3200, to: 500, decay: 0.12 }); bubbles(t + 0.05, 3); break; }   // splash
        if (dry) { kick(t, 0.3 + 0.25 * Math.min(1, o.airT || 0.3), sfxBus); noise(t, 0.3, { gain: 0.15, filter: 'lowpass', freq: 1400, to: 500, decay: 0.08 }); break; }   // a soft whump of sand
        kick(t, 0.35 + 0.25 * Math.min(1, (o.airT || 0.3) / 1), sfxBus); noise(t, 0.12, { gain: 0.12, filter: 'lowpass', freq: 1800, decay: 0.03 }); break;
      case 'coin': tone(t, 988, 0.06, { duty: 0.25, gain: 0.085, sustain: 1, release: 0.01 }); tone(t + 0.06, 1319, 0.26, { duty: 0.25, gain: 0.085, sustain: 0.6, release: 0.08 }); break;
      case 'crash': {                                             // cartoon fall: a pulse whistle diving, then a thump (a big splash on water)
        tone(t, 1600, 0.45, { to: 140, gain: 0.07, duty: 0.5, sustain: 0.9 });
        if (wet) { noise(t + 0.05, 0.7, { gain: 0.22, filter: 'lowpass', freq: 4000, to: 400, decay: 0.2 }); bubbles(t + 0.3, 5); kick(t + 0.05, 0.4, sfxBus); break; }
        if (dry) { kick(t + 0.05, 0.5, sfxBus); noise(t, 0.6, { gain: 0.18, filter: 'lowpass', freq: 2200, to: 300, decay: 0.15 }); break; }   // a puff of dust
        if (hot) { kick(t + 0.05, 0.55, sfxBus); noise(t, 0.5, { gain: 0.16, filter: 'lowpass', freq: 1600, to: 300, decay: 0.12 }); noise(t + 0.1, 0.6, { gain: 0.07, filter: 'highpass', freq: 4000, decay: 0.2 }); break; }   // a thud on rock, a hiss of hot ash
        if (ch) { kick(t + 0.05, 0.5, sfxBus); tone(t + 0.05, 880, 0.12, { duty: 0.5, gain: 0.06, sustain: 1, release: 0.01 }); tone(t + 0.19, 440, 0.25, { duty: 0.5, gain: 0.06, sustain: 0.8 }); break; }   // a thud, the two notes of an error
        if (cy) { kick(t + 0.05, 0.5, sfxBus); for (let k = 0; k < 6; k++) tone(t + 0.05 + k * 0.04, 1800 - k * 220, 0.04, { duty: 0.125, gain: 0.05, sustain: 0.5, release: 0.01 }); noise(t, 0.3, { gain: 0.12, filter: 'bandpass', freq: 1600, decay: 0.07 }); break; }   // a thud and a short-circuit crackle
        if (toy) { kick(t + 0.05, 0.45, sfxBus); for (let k = 0; k < 7; k++) noise(t + 0.06 + k * 0.05 + Math.random() * 0.03, 0.03, { gain: 0.12, filter: 'bandpass', freq: 2500 + Math.random() * 2500, q: 2, decay: 0.008 }); spring(t + 0.1, 420, 160, 0.4, 0.06, sfxBus); break; }   // plastic pieces flying, a sprung boing
        kick(t + 0.05, 0.6, sfxBus); noise(t, 0.35, { gain: 0.16, filter: 'lowpass', freq: 1200, decay: 0.08 });
        break;
      }
      case 'rewind': for (let k = 0; k < 3; k++) tone(t + k * 0.08, 300 + k * 200, 0.07, { to: 1200 + k * 300, gain: 0.07, duty: 0.25 }); break;
      case 'wall':
        if (wet) { tone(t, 520, 0.14, { type: 'triangle', to: 820, gain: 0.09, sustain: 0.6 }); noise(t, 0.15, { gain: 0.08, filter: 'bandpass', freq: 1500, decay: 0.04 }); break; }   // squeak on the plastic rim
        if (dry) { noise(t, 0.3, { gain: 0.14, filter: 'bandpass', freq: 1100, q: 0.8, decay: 0.08 }); break; }   // sand spraying off the berm
        noise(t, 0.22, { gain: 0.14, filter: 'bandpass', freq: 700, q: 1.2, decay: 0.06 }); break;
      case 'sink':                                                // quicksand: a gloopy sink
        tone(t, 220, 0.35, { type: 'sine', to: 70, gain: 0.12, sustain: 0.8 }); noise(t, 0.4, { gain: 0.1, filter: 'lowpass', freq: 600, decay: 0.12 });
        tone(t + 0.12, 160, 0.08, { type: 'sine', to: 260, gain: 0.05, sustain: 1 }); break;
      case 'fall':                                                // off the edge: a long whistle down, a splash far below
        if (cy && o.k === 'void') { tone(t, 180, 1.1, { to: 1800, gain: 0.08, duty: 0.5, sustain: 0.9 }); noise(t, 1.2, { gain: 0.08, filter: 'bandpass', freq: 400, to: 4000 }); break; }   // upside down: a whistle rising, falling into the sky
        if (cy) { tone(t, 1500, 0.9, { to: 110, gain: 0.07, duty: 0.25, sustain: 0.9 }); noise(t, 0.9, { gain: 0.07, filter: 'bandpass', freq: 3000, to: 300 }); break; }
        if (hot) { tone(t, 1300, 0.6, { to: 150, gain: 0.08, duty: 0.5, sustain: 0.9 }); noise(t + 0.6, 0.9, { gain: 0.2, filter: 'highpass', freq: 2500, to: 6000, decay: 0.3 }); tone(t + 0.6, 180, 0.3, { type: 'sine', to: 60, gain: 0.12, sustain: 0.8 }); bubbles(t + 0.75, 4); break; }   // down into the lava: a sizzle, a gloop
        if (toy) { tone(t, 1300, 0.45, { to: 180, gain: 0.08, duty: 0.5, sustain: 0.9 }); for (let k = 0; k < 14; k++) tone(t + 0.42 + k * 0.035 + Math.random() * 0.03, 500 + Math.random() * 900, 0.04, { type: 'triangle', gain: 0.05, sustain: 0.3, release: 0.02 }); break; }   // down into the ball pit: balls rattling
        tone(t, 1500, 0.9, { to: 110, gain: 0.08, duty: 0.5, sustain: 0.9 });
        noise(t + 0.95, 0.6, { gain: 0.1, filter: 'lowpass', freq: 1800, to: 300, decay: 0.15 }); break;
      case 'chomp':                                               // a crocodile's jaws: snap snap, then the tumble
        for (const d of [0, 0.13]) { noise(t + d, 0.05, { gain: 0.2, filter: 'bandpass', freq: 2200, q: 1.5, decay: 0.012 }); tone(t + d, 320, 0.07, { duty: 0.5, to: 120, gain: 0.08, sustain: 0.6 }); }
        tone(t + 0.25, 1400, 0.4, { to: 140, gain: 0.06, duty: 0.5, sustain: 0.9 }); kick(t + 0.3, 0.4, sfxBus);
        noise(t + 0.3, 0.6, { gain: 0.2, filter: 'lowpass', freq: 4000, to: 400, decay: 0.2 }); break;
      case 'plunge':                                              // over the edge and straight down: a rising roar
        noise(t, 2.2, { gain: 0.16, filter: 'bandpass', freq: 300, q: 0.8, to: 3800 });
        tone(t, 160, 1.8, { type: 'triangle', to: 900, gain: 0.08, sustain: 0.9 });
        arp(t, [76, 79, 83, 88], 0.05, 0.08, { gain: 0.07, duty: 0.25 }); break;
      case 'flow': noise(t, 0.35, { gain: 0.06, filter: 'bandpass', freq: 600, q: 1, to: 2600 }); break;   // caught by fast water
      case 'slowmo':                                              // over the brink: time stretches, the fall roars
        tone(t, 220, 1.0, { type: 'sine', to: 55, gain: 0.14, sustain: 0.9 });
        noise(t, 1.6, { gain: 0.14, filter: 'lowpass', freq: 1400, to: 250, decay: 0.5 }); break;
      case 'duck': noise(t, 0.08, { gain: 0.06, filter: 'highpass', freq: 3000, to: 1200, decay: 0.03 }); break;
      case 'honk':                                                // a car's horn, twice
        for (const d of [0, 0.22]) { tone(t + d, 415, 0.16, { duty: 0.5, gain: 0.06, sustain: 0.9 }); tone(t + d, 523, 0.16, { duty: 0.5, gain: 0.05, sustain: 0.9 }); } break;
      case 'pass':                                                // a car swishing past, close: the pitch falls as it goes
        noise(t, 0.45, { gain: 0.16, filter: 'bandpass', freq: 2200, q: 1.2, to: 350 }); tone(t, 330, 0.4, { type: 'triangle', to: 120, gain: 0.07, sustain: 0.8 }); break;
      case 'launch':                                              // off the end of the viaduct, up into the sky
        noise(t, 1.2, { gain: 0.2, filter: 'bandpass', freq: 300, q: 0.9, to: 5000 }); tone(t, 180, 0.9, { duty: 0.5, to: 1400, gain: 0.07, sustain: 0.9 });
        arp(t + 0.1, [69, 73, 76, 81, 85, 88], 0.06, 0.1, { gain: 0.07, duty: 0.25 }); break;
      case 'glass': case 'glass2': {                              // a window shattering: a crack, then shards tinkling down
        noise(t, 0.4, { gain: 0.3, filter: 'highpass', freq: 2500, decay: 0.12 }); kick(t, 0.35, sfxBus);
        for (let k = 0; k < 12; k++) tone(t + 0.04 + k * 0.045 + Math.random() * 0.03, 2200 + Math.random() * 4200, 0.07, { type: 'sine', gain: 0.045, sustain: 0.5, release: 0.05 });
        break;
      }
      case 'boing':                                               // off a trampoline
        spring(t, 150, 560, 0.42, 0.11, sfxBus); tone(t, 300, 0.12, { type: 'sine', to: 900, gain: 0.05, sustain: 0.8 }); break;
      case 'boing2':                                              // off the giant trampoline: a big low spring, a whoosh, up up up
        spring(t, 90, 380, 0.7, 0.13, sfxBus); noise(t, 0.9, { gain: 0.12, filter: 'bandpass', freq: 400, q: 0.9, to: 4000 });
        arp(t + 0.08, [72, 76, 79, 84, 88], 0.06, 0.1, { gain: 0.06, duty: 0.25 }); break;
      case 'zoom': {                                              // a wind-up race car whizzing past: a buzzy little motor, falling as it goes
        const ctx = A.ctx, osc = ctx.createOscillator(), g = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(620, t); osc.frequency.exponentialRampToValueAtTime(260, t + 0.45);
        am.frequency.value = 38; ag.gain.value = 0.035; am.connect(ag); ag.connect(g.gain);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.setTargetAtTime(0, t + 0.2, 0.08);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
        osc.connect(lp); lp.connect(g); g.connect(sfxBus); osc.start(t); am.start(t); osc.stop(t + 0.6); am.stop(t + 0.6);
        noise(t, 0.35, { gain: 0.06, filter: 'bandpass', freq: 1800, q: 1, to: 600 }); break;
      }
      case 'tvin':                                                // into the television: the hum of a set coming on, a pop of static, a little start-up jingle
        tone(t, 60, 0.4, { type: 'sine', to: 120, gain: 0.08, sustain: 0.8 }); noise(t, 0.35, { gain: 0.16, filter: 'highpass', freq: 2500, decay: 0.12 });
        arp(t + 0.25, [72, 76, 79, 84], 0.07, 0.09, { gain: 0.08, duty: 0.5 }); break;
      case 'tvout':                                               // out through the screen: glass, a zap of static falling away
        noise(t, 0.4, { gain: 0.25, filter: 'highpass', freq: 2500, decay: 0.12 }); kick(t, 0.3, sfxBus);
        tone(t, 1800, 0.35, { duty: 0.5, to: 120, gain: 0.06, sustain: 0.8 });
        for (let k = 0; k < 10; k++) tone(t + 0.04 + k * 0.045 + Math.random() * 0.03, 2200 + Math.random() * 4200, 0.07, { type: 'sine', gain: 0.04, sustain: 0.5, release: 0.05 }); break;
      case 'squash':                                              // a walker stomped flat: a squelchy boop and a little rising jingle
        tone(t, 520, 0.09, { duty: 0.5, to: 160, gain: 0.1, sustain: 0.7 }); arp(t + 0.08, [79, 84, 91], 0.05, 0.07, { gain: 0.07, duty: 0.25 }); break;
      case 'bomb':                                                // a volcanic bomb: a whistle falling, then the thump and scatter as it lands
        tone(t, 1900, 0.28, { duty: 0.5, to: 380, gain: 0.045, sustain: 0.9 }); kick(t + 0.27, 0.55, sfxBus);
        noise(t + 0.27, 0.7, { gain: 0.2, filter: 'lowpass', freq: 1800, to: 200, decay: 0.2 }); noise(t + 0.3, 0.4, { gain: 0.06, filter: 'highpass', freq: 3500, decay: 0.12 }); break;
      case 'crater':                                              // the crust giving way under her: a crack, a long fall, a scream
        noise(t, 0.3, { gain: 0.25, filter: 'bandpass', freq: 1200, q: 1, decay: 0.08 }); kick(t, 0.4, sfxBus); tone(t + 0.1, 1200, 1.6, { duty: 0.5, to: 120, gain: 0.07, sustain: 0.9 });
        voice(t + 0.15, 1.1, 900, 1200, 'a', 'a', { f2: 700, vib: 10, depth: 0.05, gain: 0.05 }); noise(t + 0.3, 2.0, { gain: 0.1, filter: 'lowpass', freq: 300, decay: 0.8 }); break;
      case 'crust':                                               // through the lake's crust: a crunch, a hiss of lava
        noise(t, 0.12, { gain: 0.3, filter: 'bandpass', freq: 900, q: 1.2, decay: 0.03 }); kick(t, 0.5, sfxBus); noise(t + 0.05, 0.9, { gain: 0.2, filter: 'highpass', freq: 2500, to: 6000, decay: 0.3 }); bubbles(t + 0.2, 4); break;
      case 'quake':                                               // the crater floor shaking: a long low rumble
        noise(t, 2.4, { gain: 0.32, filter: 'lowpass', freq: 160, to: 90, decay: 0.9 }); tone(t, 42, 2.2, { type: 'sine', gain: 0.18, sustain: 0.9 }); break;
      case 'erupt':                                               // the mountain blows: a huge boom, a roar rising
        kick(t, 0.8, sfxBus); kick(t + 0.12, 0.6, sfxBus); noise(t, 3.0, { gain: 0.35, filter: 'lowpass', freq: 400, to: 120, decay: 1.2 });
        noise(t + 0.2, 2.2, { gain: 0.12, filter: 'bandpass', freq: 300, q: 0.7, to: 2500 }); tone(t, 60, 2.4, { type: 'sawtooth', to: 30, gain: 0.08, sustain: 0.9 }); break;
      case 'blast':                                               // thrown up on the eruption: a roaring whoosh, a fanfare climbing
        noise(t, 1.8, { gain: 0.24, filter: 'bandpass', freq: 250, q: 0.8, to: 5000 }); kick(t, 0.6, sfxBus); tone(t, 140, 1.4, { duty: 0.5, to: 1200, gain: 0.07, sustain: 0.9 });
        arp(t + 0.1, [69, 72, 76, 81, 84, 88, 93], 0.07, 0.12, { gain: 0.07, duty: 0.25 }); voice(t + 0.15, 1.2, 480, 900, 'a', 'a', { f2: 650, vib: 7, depth: 0.03, gain: 0.05 }); break;
      case 'steam':                                               // a steam vent: a hiss bursting, a rising whistle
        noise(t, 0.9, { gain: 0.22, filter: 'highpass', freq: 3500, decay: 0.3 }); tone(t, 600, 0.6, { type: 'sine', to: 1600, gain: 0.05, sustain: 0.8 }); kick(t, 0.25, sfxBus); break;
      case 'cart':                                                // into the mine cart: a clank, the wheels starting to roll
        for (const d of [0, 0.09]) { noise(t + d, 0.06, { gain: 0.16, filter: 'bandpass', freq: 1100, q: 2, decay: 0.02 }); tone(t + d, 520, 0.08, { type: 'square', to: 300, gain: 0.04, sustain: 0.5 }); }
        noise(t + 0.15, 0.6, { gain: 0.08, filter: 'lowpass', freq: 500, decay: 0.2 }); break;
      case 'switch':                                              // the cart hopping across to the next rail: a metal clack
        tone(t, 1400, 0.05, { type: 'square', to: 900, gain: 0.05, sustain: 0.6 }); noise(t, 0.05, { gain: 0.12, filter: 'bandpass', freq: 3000, q: 2, decay: 0.015 }); noise(t + 0.08, 0.05, { gain: 0.1, filter: 'bandpass', freq: 2200, q: 2, decay: 0.015 }); break;
      case 'cartjump':                                            // the cart flying off the end of the track: a clank, a whoosh, a "yee-ha!"
        noise(t, 0.08, { gain: 0.2, filter: 'bandpass', freq: 1200, q: 2, decay: 0.02 }); noise(t, 1.2, { gain: 0.18, filter: 'bandpass', freq: 300, q: 0.9, to: 4000 });
        voice(t + 0.1, 0.35, 420, 560, 'i', 'i', { gain: 0.05 }); voice(t + 0.42, 0.6, 520, 820, 'a', 'a', { f2: 620, vib: 8, gain: 0.055 }); break;
      case 'clatter': {                                           // a runaway cart rattling past
        for (let k = 0; k < 8; k++) noise(t + k * 0.05, 0.04, { gain: 0.1 * (1 - k / 10), filter: 'bandpass', freq: 1400 - k * 80, q: 2, decay: 0.012 });
        tone(t, 300, 0.4, { type: 'triangle', to: 120, gain: 0.06, sustain: 0.7 }); break;
      }
      case 'minein':                                              // into the mine: a clang echoing down the tunnel
        for (let k = 0; k < 4; k++) { tone(t + k * 0.22, 440, 0.3, { type: 'triangle', gain: 0.09 * Math.pow(0.5, k), sustain: 0.3, release: 0.2 }); noise(t + k * 0.22, 0.06, { gain: 0.1 * Math.pow(0.5, k), filter: 'bandpass', freq: 2000, q: 3, decay: 0.02 }); } break;
      case 'belt':                                                // onto a conveyor belt: rollers clattering under her
        for (let k = 0; k < 6; k++) noise(t + k * 0.045, 0.03, { gain: 0.07, filter: 'bandpass', freq: 900 + k * 120, q: 3, decay: 0.01 });
        tone(t, 110, 0.3, { duty: 0.25, gain: 0.03, sustain: 0.8, release: 0.05 }); break;
      case 'stomp':                                               // a press slamming down: a heavy clank and a hiss of air (in the temple, stone on stone)
        if (wild) { kick(t, 0.5, sfxBus); noise(t, 0.3, { gain: 0.16, filter: 'lowpass', freq: 900, to: 200, decay: 0.08 }); noise(t + 0.05, 0.4, { gain: 0.05, filter: 'bandpass', freq: 2500, decay: 0.12 }); break; }
        kick(t, 0.32, sfxBus); tone(t, 240, 0.12, { duty: 0.5, to: 90, gain: 0.05, sustain: 0.6 });
        noise(t, 0.12, { gain: 0.1, filter: 'bandpass', freq: 1400, q: 2.5, decay: 0.03 }); noise(t + 0.12, 0.35, { gain: 0.05, filter: 'highpass', freq: 5000, decay: 0.12 }); break;
      case 'loop':                                                // into the loop: a rising whoosh, a "wheee!", a fanfare
        noise(t, 1.6, { gain: 0.14, filter: 'bandpass', freq: 300, q: 0.8, to: 4200 });
        voice(t + 0.1, 1.3, 520, 980, 'i', 'i', { f2: 700, vib: 6, depth: 0.02, gain: 0.05 });
        arp(t + 0.05, [67, 71, 74, 79, 83, 86], 0.07, 0.12, { gain: 0.07, duty: 0.25 }); break;
      case 'scream':                                              // a high scream, wobbling, falling off at the end
        voice(t, 0.75, rnd(820, 980), rnd(1150, 1300), 'e', 'a', { f2: rnd(700, 850), vib: 11, depth: 0.05, gain: 0.06 });
        voice(t + 0.12, 0.55, rnd(600, 700), rnd(900, 1000), 'a', 'a', { f2: rnd(520, 600), vib: 9, depth: 0.04, gain: 0.04 }); break;
      case 'wow':                                                 // a crowd going "哇——!"
        for (let k = 0; k < 5; k++) { const f = rnd(220, 520); voice(t + k * 0.04 + rnd(0, 0.05), rnd(0.55, 0.8), f, f * 1.35, 'u', 'a', { f2: f * 0.9, vib: rnd(5, 7), gain: 0.032 }); }
        noise(t, 0.6, { gain: 0.04, filter: 'bandpass', freq: 900, q: 0.6, decay: 0.25 }); break;
      case 'oh':                                                  // "喔!": a short surprised shout, falling
        for (let k = 0; k < 2; k++) { const f = rnd(260, 420); voice(t + k * 0.09, 0.32, f * 1.3, f * 0.85, 'o', 'o', { vib: 6, gain: 0.05 }); } break;
      case 'ah':                                                  // a few of them at once, startled: a sharp "啊!" jumping up, then a shaky fall
        for (let k = 0; k < 3; k++) { const f = rnd(380, 640); voice(t + k * 0.05 + rnd(0, 0.04), rnd(0.35, 0.5), f, f * 1.5, 'a', 'a', { f2: f * 1.05, vib: rnd(9, 12), depth: 0.05, gain: 0.045 }); } break;
      case 'gasp':                                                // the animals working late jump out of their skins
        for (let k = 0; k < 4; k++) tone(t + k * 0.09, 600 + k * 140, 0.08, { duty: 0.25, to: 1100 + k * 160, gain: 0.05, sustain: 0.8 });
        tone(t + 0.4, 900, 0.25, { duty: 0.5, to: 450, gain: 0.05, sustain: 0.8 }); break;
      case 'gate': if (wild) { chirp(t, 0.05, sfxBus); break; }   // a bird in the trees
        if (hot) { for (let k = 0; k < 6; k++) noise(t + k * 0.04 + Math.random() * 0.03, 0.03, { gain: 0.06, filter: 'bandpass', freq: 1500 + Math.random() * 2500, q: 1.5, decay: 0.01 }); noise(t, 0.4, { gain: 0.04, filter: 'lowpass', freq: 600, decay: 0.15 }); break; }   // braziers crackling
        if (toy) { tone(t, 1760, 0.18, { type: 'sine', gain: 0.045, sustain: 0.3, release: 0.15 }); tone(t + 0.09, 2637, 0.25, { type: 'sine', gain: 0.035, sustain: 0.3, release: 0.2 }); break; }   // a music-box ding-ding
        if (city) { tone(t, 1568, 0.07, { type: 'sine', gain: 0.04, sustain: 0.6 }); tone(t + 0.07, 2349, 0.12, { type: 'sine', gain: 0.035, sustain: 0.5, release: 0.08 }); break; }   // a neon sign blinking on
        noise(t, dry ? 0.5 : 0.25, { gain: 0.035, filter: 'bandpass', freq: wet ? 2400 : dry ? 600 : 900, to: wet ? 6000 : dry ? 1800 : 2400 }); break;
      case 'windup':                                              // the giant key winding her up: a ratchet clicking faster and faster, a spring let go
        for (let k = 0; k < 10; k++) noise(t + k * 0.06 * (1 - k * 0.06), 0.03, { gain: 0.1, filter: 'bandpass', freq: 3000, q: 2, decay: 0.008 });
        spring(t + 0.55, 180, 900, 0.6, 0.08, sfxBus); arp(t + 0.6, [72, 76, 79, 84, 88], 0.05, 0.1, { gain: 0.07, duty: 0.25 }); break;
      case 'unwind': tone(t, 900, 0.7, { type: 'triangle', to: 200, gain: 0.07, vib: 0.05, sustain: 0.8 }); break;   // running down
      case 'screw':                                               // into the corkscrew: a whoosh twisting round
        for (let k = 0; k < 3; k++) noise(t + k * 0.25, 0.35, { gain: 0.09, filter: 'bandpass', freq: 500 + k * 700, q: 3, to: 3000 + k * 600 }); tone(t, 330, 0.9, { duty: 0.25, to: 990, gain: 0.05, vib: 0.06, sustain: 0.9 }); break;
      case 'temple':                                              // into the temple: a great gong, echoing
        tone(t, 98, 2.2, { type: 'triangle', gain: 0.16, sustain: 0.6, release: 0.8, echo: true }); tone(t, 147, 1.8, { type: 'sine', gain: 0.08, sustain: 0.5, release: 0.6 }); noise(t, 1.2, { gain: 0.05, filter: 'bandpass', freq: 600, decay: 0.5 }); break;
      case 'rumble':                                              // the boulder breaking out: a crash of stone, then a deep rolling roar
        kick(t, 0.9, sfxBus); noise(t, 0.6, { gain: 0.2, filter: 'lowpass', freq: 1200, to: 200, decay: 0.2 });
        for (let k = 0; k < 6; k++) kick(t + 0.4 + k * 0.32, 0.45, sfxBus);
        noise(t + 0.3, 2.4, { gain: 0.14, filter: 'lowpass', freq: 160, q: 2 }); break;
      case 'vine':                                                // grabbing the vine off the cliff: a whoosh and a jungle yell, up and down
        noise(t, 0.9, { gain: 0.1, filter: 'bandpass', freq: 500, to: 2500 });
        voice(t + 0.05, 0.35, 330, 520, 'a', 'a', { gain: 0.07 }); voice(t + 0.4, 0.3, 440, 330, 'a', 'a', { gain: 0.07 }); voice(t + 0.72, 0.6, 520, 700, 'a', 'o', { gain: 0.07, vib: 9, depth: 0.06 }); break;
      case 'mag':                                                 // on to the magnetic skyway: a hum winding up, a whoosh
        tone(t, 80, 1.0, { type: 'sawtooth', to: 320, gain: 0.06, sustain: 0.9 }); tone(t, 160, 1.0, { duty: 0.125, to: 640, gain: 0.04, sustain: 0.9 }); noise(t + 0.3, 0.8, { gain: 0.08, filter: 'bandpass', freq: 500, to: 4000 }); break;
      case 'wallride': case 'flip':                               // the track twisting over: a long whoosh sweeping across, a chime
        noise(t, 1.1, { gain: 0.11, filter: 'bandpass', freq: 300, q: 2, to: 3500 }); tone(t, 220, 0.9, { type: 'triangle', to: 880, gain: 0.07, sustain: 0.8 }); arp(t + 0.5, type === 'flip' ? [88, 83, 79, 76] : [76, 79, 83, 88], 0.07, 0.12, { gain: 0.05, duty: 0.25 }); break;
      case 'spiral':                                              // into the ring tunnel: a whoosh wobbling round and round
        for (let k = 0; k < 4; k++) noise(t + k * 0.22, 0.3, { gain: 0.08, filter: 'bandpass', freq: 600 + k * 500, q: 3, to: 2400 + k * 600 }); tone(t, 300, 1.0, { duty: 0.25, to: 1200, gain: 0.05, vib: 0.06, sustain: 0.9 }); break;
      case 'od':                                                  // overdrive: a riser, a fanfare climbing, a drop
        noise(t, 0.8, { gain: 0.12, filter: 'bandpass', freq: 400, to: 6000 }); arp(t, [64, 67, 71, 76, 79, 83, 88], 0.05, 0.1, { gain: 0.08, duty: 0.25 }); kick(t + 0.4, 0.8, sfxBus); tone(t + 0.4, 110, 0.6, { type: 'sawtooth', to: 55, gain: 0.1, sustain: 0.8 }); break;
      case 'odend': tone(t, 880, 0.6, { duty: 0.25, to: 220, gain: 0.06, sustain: 0.8 }); noise(t, 0.5, { gain: 0.05, filter: 'lowpass', freq: 3000, to: 300 }); break;   // powering down
      case 'smash': {                                             // smashed in overdrive: a crunch, bits flying, a low punch
        kick(t, 0.5, sfxBus); noise(t, 0.25, { gain: 0.2, filter: 'bandpass', freq: 1200, q: 0.7, decay: 0.06 });
        for (let k = 0; k < 5; k++) noise(t + 0.03 + k * 0.035 + Math.random() * 0.02, 0.04, { gain: 0.08, filter: 'bandpass', freq: 3000 + Math.random() * 4000, q: 3, decay: 0.01 });
        tone(t, 1200 + Math.random() * 400, 0.12, { duty: 0.125, to: 300, gain: 0.05, sustain: 0.6 }); break;
      }
      case 'whirr':                                               // a drone passing overhead: rotors buzzing, falling away
        tone(t, 260, 0.45, { type: 'sawtooth', to: 170, gain: 0.04, vib: 0.08, sustain: 0.8 }); noise(t, 0.45, { gain: 0.06, filter: 'bandpass', freq: 900, q: 2, to: 500 }); break;
      case 'bridge':                                              // the bridge of data assembling: blips of every pitch, clicks
        for (let k = 0; k < 12; k++) tone(t + k * 0.06, 600 + Math.random() * 1800, 0.04, { duty: 0.125, gain: 0.05, sustain: 0.7, release: 0.01 }); break;
      case 'holojump':                                            // the launch through the hologram: a great swell, a whoosh up
        tone(t, 110, 1.4, { type: 'sawtooth', to: 440, gain: 0.08, sustain: 0.9 }); arp(t + 0.1, [64, 71, 76, 83, 88, 95], 0.08, 0.3, { gain: 0.06, duty: 0.25, echo: true }); noise(t, 1.2, { gain: 0.1, filter: 'bandpass', freq: 300, to: 5000 }); break;
      case 'glitch':                                              // through the hologram: the picture breaking up, bit-crushed
        for (let k = 0; k < 16; k++) tone(t + k * 0.03, [200, 1600, 400, 3200, 800][k % 5] * (0.8 + Math.random() * 0.4), 0.025, { duty: 0.5, gain: 0.05, sustain: 1, release: 0.005 }); noise(t, 0.5, { gain: 0.07, filter: 'highpass', freq: 3000, decay: 0.15 }); break;
      case 'back':                                                // time runs backwards: a tape rewinding, squealing down
        for (let k = 0; k < 5; k++) tone(t + k * 0.12, 1400 - k * 120, 0.11, { type: 'sawtooth', to: 500 - k * 50, gain: 0.05, sustain: 0.9 });
        noise(t, 0.7, { gain: 0.08, filter: 'bandpass', freq: 3000, to: 900, decay: 0.3 }); arp(t + 0.6, [84, 79, 76, 72], 0.07, 0.12, { gain: 0.06, duty: 0.25, echo: true }); break;
      case 'front':                                               // and forwards again: the tape clicks into play
        noise(t, 0.04, { gain: 0.16, filter: 'bandpass', freq: 2500, decay: 0.01 }); tone(t + 0.05, 200, 0.5, { type: 'sawtooth', to: 900, gain: 0.05, sustain: 0.8 }); arp(t + 0.3, [72, 76, 79, 84], 0.06, 0.1, { gain: 0.06, duty: 0.25 }); break;
      case 'shrink':                                              // shrinking: a slide down, sparkles
        tone(t, 1400, 0.7, { type: 'triangle', to: 140, gain: 0.09, sustain: 0.9 }); tone(t, 2100, 0.7, { duty: 0.125, to: 210, gain: 0.03, sustain: 0.9 }); arp(t + 0.1, [96, 91, 88, 84, 79], 0.06, 0.08, { gain: 0.04, duty: 0.25 }); break;
      case 'grow':                                                // back to her size: a slide up
        tone(t, 140, 0.6, { type: 'triangle', to: 1400, gain: 0.09, sustain: 0.9 }); arp(t + 0.3, [79, 84, 88, 91, 96], 0.05, 0.08, { gain: 0.04, duty: 0.25 }); break;
      case 'bull':                                                // off the top of the bull ridge: a till ringing, a fanfare climbing
        noise(t, 0.05, { gain: 0.12, filter: 'bandpass', freq: 3000, decay: 0.01 }); arp(t + 0.04, [88, 93], 0.07, 0.35, { type: 'triangle', gain: 0.09 }); arp(t + 0.2, [72, 76, 79, 84, 88], 0.06, 0.14, { gain: 0.06, duty: 0.25, echo: true }); break;
      case 'rocket':                                              // fired off into space: a rumble, a roar sweeping up
        noise(t, 1.6, { gain: 0.18, filter: 'lowpass', freq: 300, to: 2500, decay: 0.6 }); tone(t, 55, 1.4, { type: 'sawtooth', to: 220, gain: 0.08, sustain: 0.9 }); kick(t, 0.6, sfxBus); arp(t + 0.5, [67, 74, 79, 86, 91], 0.09, 0.3, { gain: 0.05, duty: 0.25, echo: true }); break;
      case 'click':                                               // a link clicked: the mouse, the next page swishing in
        noise(t, 0.025, { gain: 0.22, filter: 'highpass', freq: 3500, decay: 0.015 }); noise(t + 0.06, 0.02, { gain: 0.12, filter: 'highpass', freq: 3000, decay: 0.012 }); noise(t + 0.1, 0.3, { gain: 0.07, filter: 'bandpass', freq: 1500, to: 3500, decay: 0.15 }); break;
      case 'web':                                                 // into the website: a mouse click, a page swishing in, a chime
        noise(t, 0.03, { gain: 0.2, filter: 'highpass', freq: 3000, decay: 0.02 }); noise(t + 0.05, 0.5, { gain: 0.1, filter: 'bandpass', freq: 2000, to: 600, decay: 0.25 }); arp(t + 0.25, [72, 76, 79, 84], 0.07, 0.3, { gain: 0.07, duty: 0.25, echo: true }); break;
      case 'tube':                                                // into the tube: a rush of air, a chord swelling
        noise(t, 1.0, { gain: 0.14, filter: 'bandpass', freq: 300, to: 5000, decay: 0.4 }); arp(t + 0.2, [65, 72, 77, 84], 0.06, 0.25, { gain: 0.06, duty: 0.25, echo: true }); break;
      case 'turn':                                                // thrown up to turn round: a whoosh sweeping across, the tape slowing
        noise(t, 1.2, { gain: 0.12, filter: 'bandpass', freq: 2500, to: 300, decay: 0.5 }); tone(t, 880, 1.0, { type: 'triangle', to: 220, gain: 0.06, sustain: 0.8 }); break;
      case 'jet':                                                 // fired off like a jet: a roar and a blast, sweeping up
        noise(t, 1.4, { gain: 0.24, filter: 'lowpass', freq: 400, to: 3000, decay: 0.5 }); noise(t, 0.9, { gain: 0.12, filter: 'bandpass', freq: 1200, to: 7000, decay: 0.3 }); tone(t, 60, 1.2, { type: 'sawtooth', to: 240, gain: 0.08, sustain: 0.9 }); kick(t, 0.7, sfxBus); break;
      case 'ring':                                                // through a ring of light: a jet's blast, a bright zap
        noise(t, 0.5, { gain: 0.18, filter: 'bandpass', freq: 500, to: 6000, decay: 0.2 }); tone(t, 90, 0.4, { type: 'sawtooth', to: 260, gain: 0.06, sustain: 0.8 }); tone(t, 660, 0.18, { duty: 0.25, to: 1980, gain: 0.07, sustain: 0.7 }); break;
      case 'clone':                                               // copied and pasted: two clicks, the copies glitching in
        for (const d of [0, 0.12]) noise(t + d, 0.03, { gain: 0.14, filter: 'bandpass', freq: 2600, decay: 0.01 });
        for (let k = 0; k < 10; k++) tone(t + 0.25 + k * 0.035, [400, 1600, 800, 2400][k % 4], 0.03, { duty: 0.5, gain: 0.05, sustain: 1, release: 0.005 }); arp(t + 0.6, [72, 72, 79, 79], 0.05, 0.08, { gain: 0.05, duty: 0.25 }); break;
      case 'surge': arp(t, [72, 76, 79, 84, 88, 91, 96], 0.04, 0.1, { gain: 0.07, duty: 0.25 }); noise(t, 0.8, { gain: 0.12, filter: 'bandpass', freq: 400, to: 6000 }); break;   // 暴漲: a run up and a rush
      case 'thin':                                                // on to the line itself: a thin high tone, held
        tone(t, 1760, 1.0, { type: 'sine', gain: 0.05, sustain: 0.8, vib: 0.01 }); tone(t, 2640, 1.0, { type: 'sine', gain: 0.025, sustain: 0.8 }); break;
      case 'liftoff': tone(t, 880, 1.2, { type: 'sine', to: 1760, gain: 0.04, sustain: 0.6, echo: true }); break;   // (out of the air: weightless)
      case 'gravity':                                             // gravity back: a deep whump, a chime
        tone(t, 220, 0.5, { type: 'sine', to: 50, gain: 0.2, sustain: 0.9 }); kick(t, 0.5, sfxBus); arp(t + 0.15, [76, 79, 84], 0.06, 0.2, { gain: 0.05, duty: 0.25 }); break;
      case 'numfall':                                             // a number falling out of the sky: a whistle diving, the thud as it lands
        tone(t, 2400, 0.9, { type: 'triangle', to: 300, gain: 0.06, sustain: 0.95 }); kick(t + 0.9, 0.45, sfxBus); noise(t + 0.9, 0.3, { gain: 0.1, filter: 'lowpass', freq: 1800, decay: 0.08 }); break;
      case 'reveal':                                              // the last launch: everything at once, a great swell, sparkles all the way up
        tone(t, 98, 1.8, { type: 'sawtooth', to: 392, gain: 0.07, sustain: 0.9 }); arp(t + 0.1, [65, 69, 72, 77, 81, 84, 89, 93, 96], 0.07, 0.4, { gain: 0.06, duty: 0.25, echo: true }); noise(t, 1.4, { gain: 0.09, filter: 'bandpass', freq: 300, to: 6000 }); break;
      case 'boost': noise(t, 0.45, { gain: 0.12, filter: 'bandpass', freq: 400, q: 1.2, to: 3500 }); arp(t, [72, 77, 81, 84], 0.04, 0.07, { gain: 0.07, duty: 0.25 }); break;
      case 'count': tone(t, hz(69 - TRANSPOSE), 0.16, { gain: 0.14, sustain: 1 }); break;
      case 'go': tone(t, hz(81 - TRANSPOSE), 0.4, { gain: 0.14, sustain: 0.9 }); break;
      case 'blip': tone(t, 2093, 0.06, { gain: 0.07, duty: 0.5, sustain: 1 }); break;
      case 'deny': tone(t, 220, 0.09, { gain: 0.08, duty: 0.5, sustain: 1 }); tone(t + 0.1, 165, 0.14, { gain: 0.08, duty: 0.5, sustain: 1 }); break;   // that one isn't ready yet
      case 'rtick': tone(t, 1319, 0.07, { gain: 0.07, duty: 0.125, sustain: 0.6, release: 0.04 }); break;          // resume countdown: light, high
      case 'rgo': arp(t, [84, 91], 0.06, 0.1, { gain: 0.09, duty: 0.25 }); break;
      case 'hover': tone(t, 1568, 0.035, { gain: 0.045, duty: 0.25, sustain: 1, release: 0.015 }); tone(t + 0.035, 2093, 0.03, { gain: 0.03, duty: 0.25, sustain: 1, release: 0.015 }); break;
      case 'select': arp(t, [79, 84, 91], 0.06, 0.16, { gain: 0.1 }); break;
      case 'tick': tone(t, 440 * Math.pow(2, (76 + 2 * (o.i || 0) - 69) / 12), 0.07, { duty: 0.25, gain: 0.09, sustain: 1 }); break;
      case 'goal': {
        arp(t, [74, 78, 81, 86], 0.08, 0.12, { gain: 0.12 });
        [74, 78, 81, 86].forEach(n => tone(t + 0.34, 440 * Math.pow(2, (n - 69) / 12), 0.9, { gain: 0.06, duty: 0.5, vib: 0.01, sustain: 0.8, release: 0.3 }));
        noise(t + 0.34, 1.2, { gain: 0.08, filter: 'highpass', freq: 5000, decay: 0.35 });
        if (wet) { noise(t + 0.2, 1.0, { gain: 0.18, filter: 'lowpass', freq: 3500, to: 300, decay: 0.3 }); bubbles(t + 0.5, 6); }   // into the pool
        break;
      }
      case 'rank': arp(t, [74, 78, 81, 86, 90], 0.05, 0.15, { gain: 0.11, duty: 0.25 }); kick(t, 0.4, sfxBus); break;
      case 'best': arp(t, [86, 90, 93, 98, 102, 98, 102], 0.06, 0.12, { gain: 0.09 }); noise(t, 0.8, { gain: 0.07, filter: 'highpass', freq: 6000, decay: 0.25 }); break;
    }
  };

  // the map's flavour of effects and of the ride sound: 'snow', 'water' or 'desert' (gritty sand)
  const RIDE = { snow: [1700, 0.6, 650], water: [900, 0.4, 1300], desert: [2600, 0.5, 1000], jungle: [1100, 0.45, 900], night: [2200, 0.5, 950], factory: [1900, 0.55, 800], volcano: [2400, 0.5, 900], cyber: [3200, 0.6, 1200], chart: [2800, 0.55, 1100] };
  A.setTheme = id => {
    A.theme = id;
    const [hf, hq, sf] = RIDE[id] || RIDE.snow;
    if (ski) { ski.hissF.frequency.value = hf; ski.hissF.Q.value = hq; ski.scrapeF.frequency.value = sf; }
  };
  // continuous sounds: skis on the snow (water rushing down the slide), louder in turns and against a wall; wind in the air
  A.ride = st => {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    if (!ski) {
      const filt = {}, mk = (name, type, freq, q) => { const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0; src.connect(f); f.connect(g); g.connect(sfxBus); src.start(); filt[name] = f; return g; };
      ski = { hiss: mk('hiss', 'bandpass', 1700, 0.6), scrape: mk('scrape', 'bandpass', 650, 1.4), wind: mk('wind', 'lowpass', 500, 0.5) };
      ski.hissF = filt.hiss; ski.scrapeF = filt.scrape;
      A.setTheme(A.theme);
    }
    const on = st && st.active, sp = on ? Math.min(1, st.speed / 30) : 0;
    ski.hiss.gain.setTargetAtTime(on && !st.air ? 0.035 + 0.06 * sp + 0.09 * st.carve : 0, t, 0.05);
    ski.scrape.gain.setTargetAtTime(on && st.wall ? 0.16 : 0, t, 0.04);
    ski.wind.gain.setTargetAtTime(on && st.air ? 0.075 : on ? 0.02 * sp : 0, t, 0.08);
    if (on && st.rail && !st.air && t > (A.clackT || 0)) {             // on rails: the wheels clacking over the joints
      for (const d of [0, 0.07]) noise(t + d, 0.03, { gain: 0.07, filter: 'bandpass', freq: 1600, q: 2.5, decay: 0.01 });
      A.clackT = t + 6 / Math.max(8, st.speed);
    }
    if (on && st.rail) ski.hiss.gain.setTargetAtTime(0.02, t, 0.05);
  };

  // render `secs` of a song offline (for checking the mix / exporting a preview); only before the game has unlocked audio
  A.preview = (name, secs, cues = [], theme = 'snow') => {      // cues: [[time, sfx type, opts], ...]
    const ctx = A.ctx = new OfflineAudioContext(1, Math.ceil(44100 * secs), 44100); waves = {};
    build(ctx); A.ready = true; A.theme = theme;
    if (name) {
      const song = SONGS[name], head = compile(song, song.head), loop = compile(song, song.loop), step = 60 / song.bpm / 2;
      const s = { bus: ctx.createGain(), soft: !!song.soft, step, tr: song.tr, style: song.style, anvil: !!song.anvil, song }; s.bus.gain.value = (s.soft ? 0.7 : 1) * (song.gain || 1); s.bus.connect(musicBus);
      echoDelay.delayTime.value = step * 1.5;
      for (let i = 0, t = 0.05; t < secs - 0.3; i++, t += step) playStep(s, i < head.length ? head[i] : loop[(i - head.length) % loop.length], t);
    }
    for (const [t, type, o] of cues) A.sfx(type, Object.assign({ at: t }, o));
    return ctx.startRendering().then(buf => { A.ctx = null; A.ready = false; A.theme = 'snow'; return buf; });
  };

  A.songs = Object.keys(SONGS);
  root.SkiAudio = A;
})(typeof window !== 'undefined' ? window : globalThis);

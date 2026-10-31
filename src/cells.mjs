// Pi's footer worker cells, shared by extension.ts and src/preview-cells.mjs.
// A running worker is a full braille stack whose color ramps with its age; a free slot
// is a dim ⣀. One two-dot gap travels the whole row on a shared clock: through each
// running cell from the bottom-left, up the left side and down the right, across each
// free cell's two dots, then a short rest before it starts again from the first cell.

export const AGE_FULL_MS = 100 * 60_000;
export const AGES = ['light yellow', 'blue', 'green', 'orange', 'red', 'dark red'];
export const AGE_INSPECT = AGES.indexOf('red'); // From here the manager should look at the worker.
export const STEP_MS = 90, REST_STEPS = 6;

// Braille dot bits. A running cell's path: up the left column, then down the right.
const PATH = [0x40, 0x04, 0x02, 0x01, 0x08, 0x10, 0x20, 0x80], FREE = [0x40, 0x80];
const glyph = bits => String.fromCodePoint(0x2800 + bits);

export function age(ms) {
  const at = Math.max(0, ms) / AGE_FULL_MS * AGES.length;
  return {stage: Math.min(AGES.length, Math.floor(at)), at};
}
export const ageLabel = ms => {
  const {stage} = age(ms);
  return stage >= AGES.length ? 'blinking dark red' : AGES[stage];
};
// What the fleet list and checks say about a running worker the operator sees as red.
export const ageNote = ms => age(ms).stage >= AGE_INSPECT
  ? `; footer ${ageLabel(ms)}: inspect it to be sure it is making progress` : '';

// Light yellow, blue, green, orange, red, dark red, and the final blinking dark red.
const DARK = [[255, 232, 140], [77, 163, 255], [90, 205, 120], [255, 160, 60], [240, 80, 70], [185, 40, 40], [150, 10, 10]];
const LIGHT = [[176, 138, 0], [35, 105, 215], [20, 140, 60], [215, 110, 0], [200, 40, 30], [150, 20, 20], [120, 0, 0]];
// Each color blends into the next over its stretch of the worker's age.
export function tint(at, light = false) {
  const palette = light ? LIGHT : DARK;
  const i = Math.min(Math.floor(at), palette.length - 1), f = Math.min(at - i, 1);
  const next = palette[Math.min(i + 1, palette.length - 1)];
  return palette[i].map((c, k) => Math.round(c + (next[k] - c) * f));
}

// starts: one entry per slot, a running worker's start time or null for a free slot.
// Returns each cell's glyph and, for a running worker, its age position and blink state.
export function row(now, starts) {
  // With nothing running the footer stops animating, so a free row rests without a gap.
  if (starts.every(start => start === null)) return starts.map(() => ({glyph: glyph(0xc0), free: true}));
  const path = starts.flatMap((start, slot) => (start === null ? FREE : PATH).map(bit => ({slot, bit})));
  const step = Math.floor(now / STEP_MS) % (path.length + 1 + REST_STEPS);
  // The gap covers path[step - 1] and path[step]: it slides in and out at the row's ends.
  const gap = new Map();
  for (const i of [step - 1, step]) if (path[i]) gap.set(path[i].slot, (gap.get(path[i].slot) ?? 0) | path[i].bit);
  return starts.map((start, slot) => {
    const bits = (start === null ? 0xc0 : 0xff) & ~(gap.get(slot) ?? 0);
    if (start === null) return {glyph: glyph(bits), free: true};
    const {stage, at} = age(now - start);
    return {glyph: glyph(bits), free: false, at, off: stage >= AGES.length && Math.floor(now / 600) % 2 === 1};
  });
}

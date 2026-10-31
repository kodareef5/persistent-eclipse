// Footer worker cells: the traveling gap, the still row between turns, and the age ramp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { row, tint, age, ageLabel, ageNote, AGE_FULL_MS, IDLE_MS, STEP_MS } from './cells.mjs';

const glyphs = (now, starts, moving) => row(now, starts, moving).map(c => c.glyph).join(' ');
const minute = 60_000;

test('the gap enters bottom-left, climbs the left side, descends the right, and hands off', () => {
  const lap = [];
  for (let step = 0; step < 10; step++) lap.push(glyphs(step * STEP_MS, [0, 0], true));
  assert.deepEqual(lap, ['⢿ ⣿', '⢻ ⣿', '⣹ ⣿', '⣼ ⣿', '⣶ ⣿', '⣧ ⣿', '⣏ ⣿', '⡟ ⣿', '⡿ ⢿', '⣿ ⢻']);
});

test('a free cell flashes its two dots one after the other as the gap passes', () => {
  const seen = new Set();
  for (let step = 0; step < 14; step++) seen.add(row(step * STEP_MS, [0, null], true)[1].glyph);
  assert.deepEqual([...seen].sort(), ['⠀', '⡀', '⢀', '⣀'].sort());
});

test('between turns the row is still: no gap, no blink, ages in IDLE_MS steps', () => {
  const start = 0, at = t => row(t, [start, null], false);
  for (let t = 0; t < IDLE_MS; t += STEP_MS) assert.equal(glyphs(t, [start, null], false), '⣿ ⣀');
  assert.equal(at(IDLE_MS - 1)[0].at, at(0)[0].at, 'a still row changes only once per IDLE_MS');
  assert.ok(at(IDLE_MS)[0].at > at(0)[0].at);
  assert.equal(row(AGE_FULL_MS + 600, [0], false)[0].off, false, 'no blinking while still');
});

test('nothing running: the row rests without a gap even while the manager works', () => {
  for (let step = 0; step < 20; step++) assert.equal(glyphs(step * STEP_MS, [null, null, null], true), '⣀ ⣀ ⣀');
});

test('ages: red from about 67 minutes, blinking dark red from 100', () => {
  assert.equal(ageLabel(66 * minute), 'orange');
  assert.equal(ageLabel(67 * minute), 'red');
  assert.equal(ageLabel(99 * minute), 'dark red');
  assert.equal(ageLabel(100 * minute), 'blinking dark red');
  assert.equal(ageNote(60 * minute), '');
  assert.match(ageNote(70 * minute), /footer red: inspect it/);
  assert.equal(age(-5).at, 0);
  assert.deepEqual(tint(0), [255, 232, 140]);
  assert.deepEqual(tint(0.5), [166, 198, 198], 'colors blend between stages');
  assert.deepEqual(tint(99), [150, 10, 10]);
});

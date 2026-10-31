// Preview Pi's footer worker cells in this terminal: node src/preview-cells.mjs [--fast]
// Sample workers at several ages, with two free slots. --fast runs 100 minutes of age
// in 30 seconds, so the color ramp is visible. Ctrl-C stops.
import {row, tint, ageLabel, AGE_FULL_MS} from './cells.mjs';

const fast = process.argv.includes('--fast');
const minutes = [1, 25, null, 45, 70, null, 105]; // null: a free slot
const began = Date.now(), speed = fast ? AGE_FULL_MS / 30_000 : 1;
const light = process.argv.includes('--light');
const paint = ([r, g, b], text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
const dim = text => `\x1b[2m${text}\x1b[22m`;

process.stdout.write('\x1b[?25l');
const quit = () => { process.stdout.write('\x1b[?25h\n'); process.exit(0); };
process.on('SIGINT', quit);
setInterval(() => {
  const now = Date.now(), aged = (now - began) * speed;
  const starts = minutes.map(m => m === null ? null : now - m * 60_000 - aged);
  const cells = row(now, starts).map(c => c.free || c.off ? dim(c.glyph) : paint(tint(c.at, light), c.glyph)).join(' ');
  const ages = starts.map(s => s === null ? 'free' : `${Math.floor((now - s) / 60_000)}m ${ageLabel(now - s)}`).join(' · ');
  process.stdout.write(`\r\x1b[2K${dim('Persistent Eclipse')} · ${cells} ${paint([90, 205, 120], '+12')}   ${dim(ages)}`);
}, 30);

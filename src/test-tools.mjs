import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import tools from './tools.cjs';

function fixture(t) {
  const lab = mkdtempSync(join(tmpdir(), 'pe-tools-'));
  t.after(() => rmSync(lab, {recursive: true, force: true}));
  const dir = join(lab, '.research/tools'); mkdirSync(dir, {recursive: true});
  return {lab, dir};
}

test('untouched shipments upgrade together; customized files retain a comparison candidate', t => {
  const {lab, dir} = fixture(t);
  const initial = {'history.mjs': 'export const old = true;\n', 'sync.mjs': 'import "./history.mjs";\n'};
  tools.place(lab, initial);
  const next = {'history.mjs': 'export const writeActivity = () => 42;\n', 'sync.mjs': 'import {writeActivity} from "./history.mjs"; console.log(writeActivity());\n'};
  assert.deepEqual(tools.place(lab, next).upgraded.sort(), Object.keys(next).sort());
  assert.equal(execFileSync(process.execPath, [join(dir, 'sync.mjs')], {encoding: 'utf8'}).trim(), '42');
  writeFileSync(join(dir, 'history.mjs'), '// our adapted helper\n');
  assert.deepEqual(tools.place(lab, initial).customized, ['history.mjs']);
  assert.equal(readFileSync(join(dir, 'history.mjs'), 'utf8'), '// our adapted helper\n');
  assert.equal(readFileSync(join(dir, 'history.mjs.shipped'), 'utf8'), initial['history.mjs']);
  writeFileSync(join(dir, 'history.mjs'), initial['history.mjs']);
  tools.place(lab, initial); // Manager accepted the comparison.
  assert.ok(!existsSync(join(dir, 'history.mjs.shipped')));
  assert.deepEqual(tools.place(lab, next).upgraded.sort(), Object.keys(next).sort());
});

test('pre-manifest public helpers upgrade to a coherent current toolset', t => {
  const {lab, dir} = fixture(t), before = '71afe0189510f8d7dcdc585ff42b769a62b0bcba';
  let old;
  try { old = execFileSync('git', ['show', `${before}:src/history.mjs`], {stdio: ['ignore', 'pipe', 'pipe']}); }
  catch { t.skip('Historical Git fixture unavailable in a source-only archive'); return; }
  writeFileSync(join(dir, 'history.mjs'), old);
  writeFileSync(join(dir, 'history.mjs.shipped'), old);
  const shipped = Object.fromEntries(['history.mjs', 'activity.mjs', 'sync.mjs', 'record.cjs', 'push-check.mjs'].map(n => [n, readFileSync(new URL(n, import.meta.url), 'utf8')]));
  const result = tools.place(lab, shipped);
  assert.deepEqual(result.customized, []); assert.deepEqual(result.errors, []);
  assert.equal(readFileSync(join(dir, 'history.mjs'), 'utf8'), shipped['history.mjs']);
  assert.ok(!existsSync(join(dir, 'history.mjs.shipped')), 'a stale upstream comparison is retired');
  execFileSync(process.execPath, ['--input-type=module', '-e', 'await import(process.argv[2])', 'import-probe', join(dir, 'sync.mjs')]);
});

test('unknown old helpers and symlinks are preserved, including with broken shipment metadata', t => {
  const {lab, dir} = fixture(t), outside = join(lab, 'custom.mjs');
  writeFileSync(outside, '// external\n'); symlinkSync(outside, join(dir, 'history.mjs'));
  writeFileSync(join(dir, 'sync.mjs'), '// unknown old version\n');
  mkdirSync(join(lab, '.research/local')); writeFileSync(join(lab, '.research/local/shipped-tools.json'), '{torn');
  const result = tools.place(lab, {'history.mjs': '// new\n', 'sync.mjs': '// new\n'});
  assert.deepEqual(result.customized.sort(), ['history.mjs', 'sync.mjs']);
  assert.equal(readFileSync(outside, 'utf8'), '// external\n');
  assert.equal(readFileSync(join(dir, 'sync.mjs'), 'utf8'), '// unknown old version\n');
});

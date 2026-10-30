import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createIntegrityCheck, runtimeFiles } from './integrity.mjs';

const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pe-integrity-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const source = join(root, 'source'), remote = join(root, 'remote.git'), install = join(root, 'install');
  mkdirSync(source);
  git(root, 'init', '--bare', remote);
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture');
  git(source, 'config', 'user.email', 'fixture@example.test');
  for (const file of runtimeFiles) {
    mkdirSync(dirname(join(source, file)), {recursive: true});
    writeFileSync(join(source, file), `initial ${file}\n`);
  }
  git(source, 'add', '.'); git(source, 'commit', '-m', 'Initial runtime');
  git(source, 'remote', 'add', 'origin', remote); git(source, 'push', 'origin', 'main');
  git(root, 'clone', '-b', 'main', remote, install);
  const advance = () => {
    writeFileSync(join(source, 'extension.ts'), 'updated extension\n');
    git(source, 'add', '.'); git(source, 'commit', '-m', 'Update runtime'); git(source, 'push', 'origin', 'main');
  };
  return {root, source, remote, install, advance};
}

test('clean runtime matches commit hashes and freshly fetched main; generated lockfiles are ignored', async t => {
  const {install} = fixture(t);
  writeFileSync(join(install, 'package-lock.json'), '{}');
  const report = await createIntegrityCheck(install)();
  assert.equal(report.warning, false);
  assert.equal(report.freshness, 'current');
  assert.equal(report.loaded.digest, report.installed.digest);
  assert.match(report.detail, /Loaded runtime SHA-256: [a-f0-9]{64}/);
});

test('staged edits and assume-unchanged files still fail the hash comparison', async t => {
  const {install} = fixture(t);
  const check = createIntegrityCheck(install);
  writeFileSync(join(install, 'extension.ts'), 'edited code');
  git(install, 'add', 'extension.ts');
  git(install, 'update-index', '--assume-unchanged', 'src/history.mjs');
  writeFileSync(join(install, 'src/history.mjs'), 'edited history');
  const report = await check();
  assert.deepEqual(report.localEdits.sort(), ['extension.ts', 'src/history.mjs']);
  assert.equal(report.reload, true);
  assert.match(report.label, /plugin edited/);
});

test('repairing disk does not clear the warning about an edited runtime already loaded', async t => {
  const {install} = fixture(t);
  writeFileSync(join(install, 'extension.ts'), 'edited at load');
  const check = createIntegrityCheck(install);
  git(install, 'restore', 'extension.ts');
  const report = await check();
  assert.deepEqual(report.localEdits, []);
  assert.deepEqual(report.runningEdits, ['extension.ts']);
  assert.equal(report.reload, true);
});

test('missing runtime files are edits, not a clean or crashing check', async t => {
  const {install} = fixture(t);
  const check = createIntegrityCheck(install);
  rmSync(join(install, 'src/retry.mjs'));
  assert.deepEqual((await check()).localEdits, ['src/retry.mjs']);
});

test('new upstream commit is an update; installing it preserves the loaded version and requests reload', async t => {
  const {install, advance} = fixture(t);
  const check = createIntegrityCheck(install);
  advance();
  const behind = await check();
  assert.equal(behind.freshness, 'outdated');
  assert.equal(behind.reload, false);
  assert.match(behind.label, /plugin update/);
  git(install, 'merge', '--ff-only', 'origin/main');
  const updated = await check();
  assert.equal(updated.freshness, 'current');
  assert.equal(updated.loaded.commit, behind.loaded.commit);
  assert.notEqual(updated.installed.commit, updated.loaded.commit);
  assert.equal(updated.reload, true);
  assert.deepEqual(updated.localEdits, []);
  assert.equal((await createIntegrityCheck(install)()).warning, false);
});

test('local commits are reported as different, not mislabelled as an upstream update', async t => {
  const {install} = fixture(t);
  git(install, 'config', 'user.name', 'Fixture'); git(install, 'config', 'user.email', 'fixture@example.test');
  writeFileSync(join(install, 'extension.ts'), 'local commit');
  git(install, 'add', '.'); git(install, 'commit', '-m', 'Local change');
  const report = await createIntegrityCheck(install)();
  assert.equal(report.freshness, 'different');
  assert.deepEqual(report.localEdits, []);
  assert.match(report.label, /plugin differs/);
});

test('unreachable upstream never reports cached refs as a fresh match', async t => {
  const {root, install} = fixture(t);
  git(install, 'remote', 'set-url', 'origin', join(root, 'missing.git'));
  const report = await createIntegrityCheck(install)();
  assert.equal(report.freshness, 'unknown');
  assert.equal(report.upstream, null);
  assert.match(report.label, /version unchecked/);
});

test('a package without Git, even nested in a Git repository, is unverified', async t => {
  const {install} = fixture(t);
  const nested = join(install, 'nested-package');
  mkdirSync(nested);
  const report = await createIntegrityCheck(nested)();
  assert.equal(report.installed.commit, null);
  assert.match(report.label, /plugin unverified/);
});

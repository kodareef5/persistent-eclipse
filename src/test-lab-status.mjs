// The lab status Pi's footer and DSH's card share: disk, the sync remote, and the inbox.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { labRoot, labStatus, mailbox, size, syncTarget } from './lab-status.mjs';

test('labStatus reports disk, commits to pull and push, and this clone\'s inbox', async () => {
  const root = mkdtempSync(join(tmpdir(), 'pe-lab-status-'));
  try {
    const lab = join(root, 'lab'), other = join(root, 'other'), bare = join(root, 'remote.git');
    const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'ignore' });
    mkdirSync(join(lab, '.research', 'inbox'), { recursive: true });
    writeFileSync(join(lab, '.research', 'LAB.md'), '# Lab\n');
    const message = (file, from, to, state) => writeFileSync(join(lab, '.research', 'inbox', file), `---\nfrom: ${from}\nto: [${to}]\nstate: ${state}\n---\n`);
    message('a.md', 'astra', 'tiling', 'open'); message('b.md', 'deeporange', 'all', 'closed'); message('c.md', 'tiling', 'astra', 'open');
    git(root, 'init', '-q', '-b', 'main', lab);
    for (const dir of [lab]) { git(dir, 'config', 'user.email', 'lab@example.invalid'); git(dir, 'config', 'user.name', 'lab'); git(dir, 'config', 'pe.lab', 'tiling'); }
    git(lab, 'add', '-A'); git(lab, 'commit', '-qm', 'start');
    git(root, 'clone', '-q', '--bare', lab, bare); git(lab, 'remote', 'add', 'origin', bare);
    git(root, 'clone', '-q', bare, other); git(other, 'config', 'user.email', 'x@example.invalid'); git(other, 'config', 'user.name', 'x');
    for (const n of [1, 2]) { writeFileSync(join(other, `r${n}`), 'r'); git(other, 'add', '-A'); git(other, 'commit', '-qm', `r${n}`); }
    git(other, 'push', '-q', 'origin', 'main');
    writeFileSync(join(lab, 'local'), 'l'); git(lab, 'add', '-A'); git(lab, 'commit', '-qm', 'local');

    assert.equal(labRoot(join(lab, '.research', 'inbox')), labRoot(lab));
    assert.deepEqual(syncTarget(lab), { remote: 'origin', branch: 'main' });
    assert.deepEqual(mailbox(lab, 'tiling'), { received: 2, open: 1, sent: 1 });
    const first = labStatus(labRoot(lab));
    assert.equal(first.measuring, true);
    assert.deepEqual(first.inbox, { received: 2, open: 1, sent: 1 });
    let now = first;
    for (let i = 0; i < 100 && (now.measuring || !now.remote.bytes); i++) { await new Promise(r => setTimeout(r, 100)); now = labStatus(labRoot(lab)); }
    assert.ok(now.disk > 0 && now.free > 0 && now.name === 'tiling');
    assert.deepEqual({ behind: now.remote.behind, ahead: now.remote.ahead }, { behind: 2, ahead: 1 });
    assert.ok(now.remote.bytes > 0);
    writeFileSync(join(lab, '.research', 'LAB.md'), '# Lab\nSync: off\n');
    const off = labStatus(labRoot(lab));
    assert.equal(off.remote, null); assert.equal(off.inbox, null);
    assert.equal(size(1536 * 1024 * 1024), '1.5G');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

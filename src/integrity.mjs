// Drift detection, not an authentication boundary: this checker and Git are local.
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

export const runtimeFiles = ['extension.ts', 'cordis.patch.yml', 'package.json',
  'src/history.mjs', 'src/retry-pi.ts', 'src/retry.mjs', 'src/integrity.mjs'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = root => ({cwd: root, timeout: 10_000, maxBuffer: 8 * 1024 * 1024,
  env: {...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never'}});
const git = (root, args) => new Promise(resolve => {
  execFile('git', args, options(root), (error, stdout) => resolve(error ? null : stdout.trim()));
});
function capture(root) {
  let commit = null;
  try {
    const opts = {...options(root), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']};
    // A copied package inside a different repository must not borrow its identity.
    if (realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], opts).trim()) === realpathSync(root))
      commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], opts).trim();
  } catch { /* A non-Git install has no local baseline. */ }
  const hashes = Object.fromEntries(runtimeFiles.map(file => {
    try { return [file, lstatSync(join(root, file)).isFile() ? sha(readFileSync(join(root, file))) : null]; }
    catch { return [file, null]; }
  }));
  return {commit, hashes, digest: sha(JSON.stringify(hashes))};
}
async function edits(root, snapshot) {
  if (!snapshot.commit) return [];
  return (await Promise.all(runtimeFiles.map(file => new Promise(resolve => {
    execFile('git', ['show', `${snapshot.commit}:${file}`], {...options(root), encoding: 'buffer'}, (error, bytes) =>
      resolve(error || sha(bytes) !== snapshot.hashes[file] ? file : null));
  })))).filter(Boolean);
}

export function createIntegrityCheck(root) {
  const loaded = capture(root);
  const loadedEdits = edits(root, loaded);
  return async () => {
    const installed = capture(root);
    const [localEdits, runningEdits] = await Promise.all([edits(root, installed), loadedEdits]);
    const reload = loaded.commit !== installed.commit || loaded.digest !== installed.digest;
    let upstream = null, freshness = 'unknown';
    if (installed.commit && await git(root, ['remote', 'get-url', 'origin'])) {
      // Only remote-tracking metadata changes. Never pull, reset, or repair files.
      const fetched = await git(root, ['fetch', '--quiet', '--no-tags', '--no-recurse-submodules',
        '--no-write-fetch-head', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
      if (fetched !== null) {
        upstream = await git(root, ['rev-parse', '--verify', 'refs/remotes/origin/main']);
        if (upstream === installed.commit) freshness = 'current';
        else if (upstream) freshness = await git(root, ['merge-base', '--is-ancestor', installed.commit, upstream]) !== null
          ? 'outdated' : 'different';
      }
    }
    const parts = [], labels = [];
    if (localEdits.length) { parts.push(`installed runtime edited: ${localEdits.join(', ')}`); labels.push('plugin edited'); }
    if (runningEdits.length) { parts.push(`runtime was edited when loaded: ${runningEdits.join(', ')}`); if (!labels.length) labels.push('plugin edited'); }
    if (!installed.commit || !loaded.commit) { parts.push('runtime hashes unverified (no package Git baseline)'); labels.push('plugin unverified'); }
    else if (!localEdits.length && !runningEdits.length) parts.push(`runtime hashes match Git ${installed.commit.slice(0, 7)}`);
    if (reload) { parts.push('installed files changed since load; reload needed'); labels.push('reload needed'); }
    if (freshness === 'outdated') { parts.push(`update available on origin/main (${upstream.slice(0, 7)})`); labels.push('plugin update'); }
    else if (freshness === 'different') { parts.push('installed commit differs from origin/main (local or divergent history)'); labels.push('plugin differs'); }
    else if (freshness === 'unknown') { parts.push('upstream unavailable; freshness unknown'); labels.push('version unchecked'); }
    else parts.push('current with origin/main');
    const summary = `Persistent Eclipse ${loaded.commit?.slice(0, 7) ?? 'unversioned'} · ${parts.join(' · ')}`;
    return {loaded, installed, upstream, freshness, localEdits, runningEdits, reload,
      label: labels.join(' · '), warning: labels.length > 0, summary,
      detail: `${summary}\nPackage: ${root}\nLoaded commit: ${loaded.commit ?? 'unknown'}\nInstalled commit: ${installed.commit ?? 'unknown'}\nUpstream main: ${upstream ?? 'unchecked'}\nLoaded runtime SHA-256: ${loaded.digest}\nInstalled runtime SHA-256: ${installed.digest}\nChecks package runtime files against local Git and configured origin/main; not a signature or dependency audit.`};
  };
}

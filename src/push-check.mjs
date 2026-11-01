// One outgoing-history check for manual lint and background sharing. Read the
// exact candidate commit, never the manager's uncommitted notes or allow-list.
import {execFileSync, spawn} from 'node:child_process';
const LARGE = 5 * 2 ** 20;
const SECRETS = [/sk-or-v1-[A-Za-z0-9]{20,}/, /\bsk-[A-Za-z0-9_-]{32,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/,
  /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /"refresh_token"\s*:\s*"[^"]{8,}/, /\bBearer [A-Za-z0-9._~+\/-]{24,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/];

// Even an intentionally large text artifact gets scanned. Keep a small overlap
// between chunks so a credential crossing an I/O boundary is still recognized.
async function hasCredential(root, object) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', root, 'cat-file', 'blob', object]);
    let tail = '', found = false, error = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      const text = tail + chunk;
      if (SECRETS.some(pattern => pattern.test(text))) found = true;
      tail = text.slice(-512);
    });
    child.stderr.on('data', chunk => { error = (error + chunk).slice(-1000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(found) : reject(new Error(error || 'Cannot scan outgoing blob')));
  });
}

export async function checkPush(root, {head = 'HEAD', base, remote = 'origin', branch = 'main', checkDefault = false} = {}) {
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd();
  const problems = [], advice = [];
  head = git('rev-parse', '--verify', head);
  if (!base) {
    try { base = git('rev-parse', '--verify', `refs/remotes/${remote}/${branch}`); } catch {}
  }
  if (checkDefault) {
    let destination;
    try { destination = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{push}'); } catch {}
    if (!destination) advice.push(`push: git push has no default destination here; push explicitly to ${remote} ${branch}, or set the upstream to ${remote}/${branch}`);
    else if (destination !== `${remote}/${branch}`)
      problems.push(`push: git push would go to ${destination}, but the lab shares ${remote}/${branch}; push explicitly or set the upstream`);
  }
  const current = new Map();
  for (const row of git('ls-tree', '-r', '--full-tree', '-z', head).split('\0').filter(Boolean)) {
    const tab = row.indexOf('\t'), [mode, type, object] = row.slice(0, tab).split(' ');
    current.set(row.slice(tab + 1), {mode, type, object});
  }
  const textAt = name => {
    const entry = current.get(name);
    return entry?.type === 'blob' && /^100/.test(entry.mode) ? git('cat-file', 'blob', entry.object) : '';
  };
  const prefix = git('rev-parse', '--show-prefix'), research = prefix + '.research/';
  const allowed = new Set([...textAt(research + 'LARGE.md').matchAll(/`([^`]+)`/g)].map(match => match[1]));
  const paths = new Map();
  for (const line of git('rev-list', '--objects', head, ...(base ? ['--not', base] : [])).split('\n')) {
    const space = line.indexOf(' ');
    if (space > 0) paths.set(line.slice(0, space), line.slice(space + 1));
  }
  const kinds = !paths.size ? '' : execFileSync('git', ['-C', root, 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], {
    input: [...paths.keys()].join('\n') + '\n', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  for (const row of kinds.split('\n').filter(Boolean)) {
    const [object, type, size] = row.split(' ');
    if (type !== 'blob') continue;
    const path = paths.get(object);
    const where = current.get(path)?.object === object ? path : `${path} (in an outgoing commit, no longer at HEAD)`;
    if (Number(size) > LARGE && !allowed.has(path))
      problems.push(`${where}: ${(Number(size) / 2 ** 20).toFixed(1)} MiB; reference it by origin, size, and sha256, or list it in committed .research/LARGE.md with the reason`);
    if (await hasCredential(root, object))
      problems.push(`${where}: looks like a credential; remove it and rewrite any unpushed commit that carries it before pushing`);
  }
  // Check committed citations, including absent evidence that exists only in a
  // manager's draft. Source submodules have their own pins; these are lab artifacts.
  for (const name of current.keys()) {
    if (!name.startsWith(research + 'notes/') || !name.endsWith('.md')) continue;
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(textAt(name))?.[1] || '';
    const field = /^targets:[ \t]*(.*)((?:\n[ \t]+[^\n]*)*)/m.exec(front);
    const targets = field?.[1].startsWith('[')
      ? field[1].replace(/^\[|\]$/g, '').split(',')
      : (field?.[2] || '').split('\n').map(line => line.replace(/^\s*-\s*/, ''));
    for (const raw of targets) {
      const target = raw.trim().replace(/^['"]|['"]$/g, '');
      const path = target.split('::')[0].replace(/:\d+(?:-\d+)?$/, '');
      if (/^(intel|runs|reports|reviews|notes|scratch|vendor|lean|patches)\//.test(path) &&
          (!current.has(research + path) || path.startsWith('scratch/')))
        advice.push(`${name}: target "${target}" is not committed as shared evidence, so other labs cannot open it`);
    }
  }
  return {problems, advice};
}

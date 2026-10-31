// The DSH web pill: its logic against stub hooks, then, given a DSH bin, a real host that
// installs this package and serves the browser half alongside DSH's own plugins.
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn, execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(repo, 'dsh-client.js'), 'utf8');

// Load the bundle as DSH's module loader would, with a React that renders to plain objects.
let loaded;
globalThis.window = {__ModuleLoader__: {load: entry => { loaded = entry; }}};
globalThis.matchMedia = () => ({matches: false});
new Function(source)();
assert.equal(loaded.id, 'persistent-eclipse');
const react = {
  createElement: (type, props, ...children) => ({type, props: props ?? {}, children: children.flat()}),
  useState: initial => [initial, () => {}], useEffect: () => {},
};
const plugin = loaded.factory(name => { if (name === 'react') return react; throw new Error('unexpected import ' + name); });
const registered = [];
plugin.apply({configForms: {get: id => ({id})}, slots: {inject: (_name, register) => register(), register: (options, component) => registered.push({options, component})}});
const [{options, component: Fleet}] = registered;
assert.equal(options.name, 'conversation.composer.dock');
assert.equal(options.inject().hooks.subagentLimits.id, 'subagent');
console.log('ok   client: registers one pill under the composer, fed by DSH\'s subagent settings');

const text = node => typeof node === 'string' ? node : node ? node.children.map(text).join('') : '';
const svgs = node => !node || typeof node === 'string' ? 0 : (node.type?.name === 'Dots' ? 1 : 0) + node.children.reduce((n, c) => n + svgs(c), 0);
const now = Date.now();
const render = ({preset = 'persistent-eclipse', limit = 6, running = ['w1', 'w2'], catalog = ['w1', 'w2', 'w3']} = {}) => Fleet({
  sessionId: 'manager',
  useProjection: key => key === 'agentPreset' ? preset : catalog.map((id, i) => ({id, label: 'T-' + i, createdAt: now - (i + 1) * 60_000})),
  useSessionStatus: select => select(new Map(running.map(id => [id, {running: true}]))),
  useSessions: select => select({byId: {}}),
  useSubagentLimits: select => select({value: limit === null ? undefined : {maxActiveSubagents: limit}}),
});
const pill = render();
assert.ok(text(pill).startsWith('Persistent Eclipse') && text(pill).endsWith('+1'), text(pill));
assert.equal(svgs(pill), 6);
assert.match(pill.props.title, /2 of 6 researching, 1 done/);
assert.equal(svgs(render({limit: 3})), 3);
assert.equal(svgs(render({limit: null})), 8);
assert.equal(svgs(render({limit: 1, running: ['w1', 'w2', 'w3']})), 3);
assert.equal(render({preset: 'standard'}), null);
console.log('ok   client: one cell per DSH subagent slot (default 8, never fewer than running), completions, PE sessions only');

const bin = process.argv[2];
if (bin) {
  const home = mkdtempSync(join(tmpdir(), 'pe-dsh-client-'));
  try {
    execFileSync('node', [bin, 'plugin', '--profile', 'web', 'add', 'file:' + repo], {env: {...process.env, DSH_HOME: home}, stdio: 'ignore'});
    const pkg = join(home, 'profiles/web/package.json'), profile = JSON.parse(readFileSync(pkg, 'utf8'));
    profile.dsh.profile.bundles.push('persistent-eclipse');
    writeFileSync(pkg, JSON.stringify(profile, null, 2));
    const child = spawn('node', [bin, '--profile', 'web', '--no-open', '--port', '0', '--host', '127.0.0.1'], {env: {...process.env, DSH_HOME: home}, stdio: ['ignore', 'pipe', 'pipe']});
    let log = '';
    child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
    try {
      let url;
      for (let i = 0; i < 300 && !(url = /http:\/\/127\.0\.0\.1:\d+\/\?token=\S+/.exec(log)?.[0]); i++) await new Promise(r => setTimeout(r, 100));
      assert.ok(url, 'DSH web did not start\n' + log.slice(-3000));
      // Give the boot a moment to report any entry that failed to activate.
      await new Promise(r => setTimeout(r, 1500));
      assert.ok(!/did not activate/.test(log), log.slice(-3000));
      const login = await fetch(url, {redirect: 'manual'});
      const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      // The page names each plugin's versioned bundle; fetch ours on its own.
      const page = await (await fetch(new URL('/', url), {headers: {cookie}})).text();
      const bundle = /plugins\/\?\?persistent-eclipse\/client\.js&(?:amp;)?rev=[0-9a-f]+/.exec(page)?.[0].replace('&amp;', '&');
      assert.ok(bundle, 'the page does not load the Persistent Eclipse client');
      const response = await fetch(new URL('/' + bundle, url), {headers: {cookie}});
      const served = await response.text();
      assert.ok(served.includes('id: "persistent-eclipse"'), response.status + ' ' + served.slice(0, 300));
      console.log('ok   client: an installed package activates in DSH web and its browser half is served');
      // The card's route sits behind DSH's browser authentication and speaks its RPC envelope.
      const lab = (headers = {}) => fetch(new URL('/persistent-eclipse/lab', url), {method: 'POST', headers: {'content-type': 'application/json', ...headers},
        body: JSON.stringify({type: 'client-request', rpcId: 'r1', method: 'lab', payload: {sessionId: 'no-such-session'}})});
      assert.equal((await lab()).status, 401);
      const answer = await (await lab({cookie, origin: new URL(url).origin})).json();
      assert.deepEqual({type: answer.type, rpcId: answer.rpcId, ok: answer.result.ok, code: answer.result.error?.code}, {type: 'server-response', rpcId: 'r1', ok: false, code: 'session-not-found'});
      console.log('ok   client: the lab status route answers only an authenticated browser, in DSH\'s RPC envelope');
    } finally { child.kill('SIGKILL'); }
  } finally { rmSync(home, {recursive: true, force: true}); }
}
console.log('PASS');

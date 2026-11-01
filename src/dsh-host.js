import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const packRoot = fileURLToPath(new URL('../packs', import.meta.url));
if (existsSync(packRoot)) globalThis[Symbol.for('persistent-eclipse.packRoot')] = packRoot;
// DSH's host half of Persistent Eclipse as an installed package: it loads the browser half
// (dsh-client.js) and answers the composer card's one question, the lab's status for a
// Session: disk use, the sync remote, and the inbox, as Pi's footer shows them. The lab's
// research behavior lives in cordis.patch.yml.
//
// The route speaks DSH's connection RPC envelope, so the browser uses
// `ctx.connection.rpc.call('/persistent-eclipse', 'lab', {sessionId})`. It mounts on the web
// server directly behind DSH's own browser authentication: in DSH 0.2.1, rpc.handle reaches
// webServer through the connection plugin's context, so plugins outside it cannot use it.
import questions from './questions.cjs';
import record from './record.cjs';
import {provenanceStatus} from './content.cjs';
import {reportData, usageBreakdown, activityView, activityChart} from './history.mjs';
import {syncStatus} from './sync.mjs';
import { labRoot, labStatus } from './lab-status.mjs';

export const name = 'persistent-eclipse';
export const inject = ['connection', 'sessions', 'webServer'];
const CHANNEL = '/persistent-eclipse';
const failure = (code, message, details = {}) => ({ ok: false, error: { code, message, details } });

export function apply(ctx) {
  const answer = (endpoint, payload) => {
    if (!['lab','answer','usage','report'].includes(endpoint) || typeof payload?.sessionId !== 'string') return failure('bad-request', 'expected lab { sessionId }', { issues: [] });
    const session = ctx.sessions.get(payload.sessionId);
    if (!session) return failure('session-not-found', `session "${payload.sessionId}" was not found`, { sessionId: payload.sessionId });
    const cwd = ctx.get('workingDirectory')?.get(session) ?? session.header.cwd;
    const lab = cwd && labRoot(cwd);
    if (!lab) return {ok:true,value:null};
    if (endpoint === 'report') return {ok:true,value:record.refresh(lab).text};
    if (endpoint === 'answer') return {ok:true,value:questions.answer(lab,payload.id,payload.answer)};
    if (endpoint === 'usage') {
      const data = reportData(lab), view = activityView(data, payload.scope || 'all');
      return {ok: true, value: {rows: usageBreakdown(data), calls: data.usage.calls,
        unmetered: data.usage.unmetered, view, chart: activityChart(view)}};
    }
    const live=ctx.get('agents')?.get(payload.sessionId);
    const goalActivation=live?ctx.get('goals')?.get(live)?.activation:'disarmed';
    return {ok:true,value:{...labStatus(lab),questions:questions.list(lab),sync:syncStatus(lab),provenance:provenanceStatus(lab),goalActivation}};
  };
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: CHANNEL, handler: async (req, res) => {
    const rejection = ctx.connection.requestRejection(req);
    if (rejection) { res.writeHead(rejection); res.end(rejection === 401 ? 'unauthorized' : 'forbidden'); return; }
    const endpoint = new URL(req.url, 'http://host').pathname.slice(CHANNEL.length + 1);
    if (req.method !== 'POST' || !/^[a-z-]+$/.test(endpoint)) { res.writeHead(404); res.end('not found'); return; }
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 65_536) { res.writeHead(413); res.end('too large'); return; } }
    let message;
    try { message = JSON.parse(body); } catch { res.writeHead(400); res.end('body is not JSON'); return; }
    let result;
    try {
      result = message?.method === endpoint ? answer(endpoint, message.payload)
        : failure('gateway/bad-request', `method ${JSON.stringify(message?.method)} does not match endpoint ${JSON.stringify(endpoint)}`, { issues: [] });
    } catch (error) {
      result = failure('gateway/internal', String(error));
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ type: 'server-response', rpcId: String(message?.rpcId ?? ''), result }));
  } }), 'persistent-eclipse: lab status route');
}

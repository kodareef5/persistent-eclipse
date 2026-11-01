// Usage: node hn-collect.mjs --out <dir> [--hours 6] [--track 6]
//
// One poll of Hacker News, appended to <dir>/<UTC date>.jsonl:
//   {"t":"item","id":1,"at":...,"created":...,"title":...,"url":...,"by":...}
//       the first time a story is seen
//   {"t":"poll","at":...,"front":[ids, rank 1 first],"new":[[id,points,comments],...]}
//       every run: the front page, and points and comments for young stories
//
// The front page is the first 30 IDs of the official topstories list, job ads
// included. Stories come from the Algolia index: those submitted in the last --hours,
// with points and comments recorded while younger than --track hours. The ledger
// only uses stories first seen young, so a longer --hours just backfills more on a
// first run. Times are Unix seconds.
// Run it from cron every 10 to 15 minutes; it keeps no state outside <dir>.
// A failed request writes nothing and exits 1, so a gap in the file is a real gap.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FIREBASE = process.env.HN_FIREBASE ?? "https://hacker-news.firebaseio.com/v0";
const ALGOLIA = process.env.HN_ALGOLIA ?? "https://hn.algolia.com/api/v1";
const FRONT = 30;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i < 0 ? fallback : argv[i + 1];
};
const out = flag("--out");
const hours = Number(flag("--hours", 6));
const track = Number(flag("--track", 6));
if (!out || !(hours > 0) || !(track > 0) || track > hours) {
  console.error("usage: node hn-collect.mjs --out <dir> [--hours 6] [--track 6]; track must not exceed hours");
  process.exit(2);
}

async function json(url) {
  const res = await fetch(url, { headers: { "user-agent": "pe-signals hn-collect" }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

const day = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);

// Stories already recorded today or yesterday need no second item line.
function seenIds(now) {
  const seen = new Set();
  for (const d of [day(now - 86400), day(now)]) {
    const file = join(out, `${d}.jsonl`);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.startsWith('{"t":"item"')) continue;
      try { seen.add(JSON.parse(line).id); } catch { /* a torn last line from a killed run */ }
    }
  }
  return seen;
}

try {
  const now = Math.floor(Date.now() / 1000);
  const since = now - Math.round(hours * 3600);
  const [top, found] = await Promise.all([
    json(`${FIREBASE}/topstories.json`),
    json(`${ALGOLIA}/search_by_date?tags=story&hitsPerPage=1000&numericFilters=${encodeURIComponent(`created_at_i>${since}`)}`),
  ]);
  if (!Array.isArray(top) || !Array.isArray(found?.hits)) throw new Error("unexpected response shape");
  const seen = seenIds(now);
  const lines = [];
  const young = [];
  for (const h of found.hits) {
    const id = Number(h.objectID);
    if (!Number.isInteger(id) || !Number.isInteger(h.created_at_i)) continue;
    if (!seen.has(id))
      lines.push({ t: "item", id, at: now, created: h.created_at_i, title: h.title ?? "", url: h.url ?? "", by: h.author ?? "" });
    if (now - h.created_at_i <= track * 3600) young.push([id, h.points ?? 0, h.num_comments ?? 0]);
  }
  const poll = { t: "poll", at: now, front: top.slice(0, FRONT), new: young };
  // Algolia returns at most 1000 hits; say so rather than silently thinning the record.
  if (found.nbHits > found.hits.length) poll.truncated = found.nbHits;
  lines.push(poll);
  mkdirSync(out, { recursive: true });
  appendFileSync(join(out, `${day(now)}.jsonl`), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  console.log(`${day(now)}: ${lines.length - 1} new, ${young.length} tracked, front page ${poll.front.length}${poll.truncated ? `, truncated (${poll.truncated} matched)` : ""}`);
} catch (error) {
  console.error(`hn-collect: ${error.message}`);
  process.exit(1);
}

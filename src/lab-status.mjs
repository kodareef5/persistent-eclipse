// The lab's own status, shared by Pi's footer and DSH's composer card: where the lab is,
// its disk use, the remote it syncs with, and its inbox. Pi schedules these itself; DSH
// asks labStatus(), which answers from a cache and refreshes at most every DISK_EVERY.
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statfsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function labRoot(cwd) {
	for (let d = resolve(cwd); ; d = dirname(d)) {
		if (existsSync(join(d, ".research", "LAB.md"))) return realpathSync(d);
		if (d === dirname(d)) return;
	}
}
export const labFile = (lab) => {
	const file = join(lab, ".research", "LAB.md");
	return existsSync(file) ? readFileSync(file, "utf8") : "";
};
// This clone's own settings, which a shared lab cannot keep in LAB.md: pe.lab, pe.workers.
export function localConfig(lab) {
	try {
		const out = execFileSync("git", ["config", "--get-regexp", "^pe\\."], { cwd: lab, encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] });
		return new Map(out.split("\n").filter(Boolean).map((line) => [line.slice(0, line.indexOf(" ")), line.slice(line.indexOf(" ") + 1)]));
	} catch {
		return new Map(); // no matching keys, or no repository
	}
}
// The remote and branch a lab shares: `Sync: <remote> [<branch>]` in LAB.md, origin and
// main by default, none when off. Git's own upstream never decides it.
export function syncTarget(lab) {
	// Each policy is one LAB.md line; `[ \t]` never reads into the next one.
	const m = /^[ \t]*Sync:[ \t]*([^\s(]+)(?:[ \t]+([^\s(]+))?/m.exec(labFile(lab));
	const remote = m?.[1] ?? "origin", branch = m?.[2] ?? "main";
	if (remote.toLowerCase() === "off") return;
	try {
		execFileSync("git", ["remote", "get-url", remote], { cwd: lab, timeout: 2000, stdio: "ignore" });
		return { remote, branch };
	} catch {
		return;
	}
}
// Inbox messages to this lab, or to all, from other labs (how many still open), and
// messages this lab sent.
export function mailbox(lab, here) {
	const box = { received: 0, open: 0, sent: 0 };
	const dir = join(lab, ".research", "inbox");
	if (!here || !existsSync(dir)) return box;
	for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
		const head = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(dir, file), "utf8"))?.[1] ?? "";
		const field = (key) => new RegExp(`^${key}:\\s*(.*)$`, "m").exec(head)?.[1].trim() ?? "";
		const to = field("to").replace(/^\[|\]$/g, "").split(",").map((t) => t.trim());
		if (field("from") === here) box.sent++;
		else if (to.includes(here) || to.includes("all")) {
			box.received++;
			if (field("state") === "open") box.open++;
		}
	}
	return box;
}
// Run background git and du at low priority, without a terminal or Git credential prompts.
const QUIET = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
export function quietly(cmd, args, cwd, done) {
	const [file, argv] = process.platform === "win32" ? [cmd, args] : ["nice", ["-n", "19", cmd, ...args]];
	execFile(file, argv, { cwd, env: QUIET, timeout: 60_000, detached: true, windowsHide: true }, (_error, stdout) => done(String(stdout ?? "")));
}
// Disk use: the whole lab folder, sources and scratch included.
export const DISK_EVERY = 10 * 60_000, LOW_FREE = 20 * 2 ** 30;
export const size = (bytes) => {
	let v = bytes / 1024, i = 0;
	while (v >= 1024 && i < 3) { v /= 1024; i++; }
	return `${v < 10 && i ? v.toFixed(1) : Math.round(v)}${"KMGT"[i]}`;
};
// Free space, and whether it is low: under 20 GiB or a tenth of the volume.
export function freeSpace(lab) {
	try {
		const fs = statfsSync(lab), free = fs.bavail * fs.bsize;
		return { free, low: free < LOW_FREE || free < fs.blocks * fs.bsize * 0.1 };
	} catch {
		return { free: undefined, low: false };
	}
}

// DSH: one status per lab. Each call returns what is known now and, when it is stale,
// starts one background refresh: du, then a fetch of the sync remote and its counts.
const labs = new Map();
export function labStatus(lab) {
	let s = labs.get(lab);
	if (!s) labs.set(lab, s = { at: 0, busy: false, disk: undefined, free: undefined, low: false, remote: undefined });
	const target = syncTarget(lab), here = localConfig(lab).get("pe.lab");
	if (!target) s.remote = undefined;
	else if (s.remote?.name !== target.remote || s.remote?.branch !== target.branch) s.remote = { name: target.remote, branch: target.branch, behind: 0, ahead: 0, bytes: 0 };
	if (!s.busy && Date.now() - s.at >= DISK_EVERY) {
		s.busy = true;
		s.at = Date.now();
		// du exits nonzero on one unreadable folder but still prints the total.
		quietly("du", ["-sk", lab], lab, (out) => {
			const kb = Number(out.split(/\s/)[0]);
			if (out.trim() && kb >= 0) Object.assign(s, { disk: kb * 1024 }, freeSpace(lab));
			if (!s.remote) { s.busy = false; return; }
			const { name, branch } = s.remote;
			const count = (then) => quietly("git", ["rev-list", "--left-right", "--count", `HEAD...refs/remotes/${name}/${branch}`], lab, (counts) => {
				const [ahead, behind] = counts.trim().split(/\s+/).map(Number);
				if (s.remote?.name === name) Object.assign(s.remote, { ahead: ahead || 0, behind: behind || 0 });
				then();
			});
			// A fetch moves only remote-tracking refs. Pulling stays with the agent.
			quietly("git", ["fetch", "--quiet", "--no-recurse-submodules", "--no-write-fetch-head", name], lab, () => count(() =>
				quietly("git", ["rev-list", "--objects", "--disk-usage", `refs/remotes/${name}/${branch}`], lab, (bytes) => {
					if (s.remote?.name === name && Number(bytes) > 0) s.remote.bytes = Number(bytes);
					s.busy = false;
				})));
		});
	}
	return { lab, name: here ?? null, disk: s.disk ?? null, free: s.free ?? null, low: s.low, measuring: s.disk === undefined,
		remote: s.remote ? { ...s.remote } : null, inbox: target ? mailbox(lab, here) : null };
}

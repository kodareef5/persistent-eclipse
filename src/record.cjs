// A readable report assembled from ordinary lab notes. Managers review the
// shared files and commit REPORT.md with them; this module never stages or commits.
// Routine runtime previews do not rewrite the committed page.
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function rootOf(cwd) {
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, ".research/LAB.md"))) return dir;
    if (dir === path.dirname(dir)) throw new Error("Not inside a research lab");
  }
}

// Deliberately small metadata: optional, single-line lab/date/status fields.
// The contribution itself is Markdown, with no schema for its content.
function markdown(text) {
  if (/^<<<<<<< /m.test(text)) throw new Error("unresolved merge conflict");
  const meta = {};
  let body = text;
  if (/^---\r?\n/.test(text)) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!match) throw new Error("unfinished frontmatter");
    for (const line of match[1].split(/\r?\n/)) {
      if (!line.trim() || line.trimStart().startsWith("#")) continue;
      const field = /^([\w-]+):[ \t]*(.*)$/.exec(line);
      if (!field)
        throw new Error("frontmatter needs one field: value per line");
      let value = field[2].trim();
      if (/^[|>]/.test(value))
        throw new Error("put multiline text below the frontmatter");
      if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
      meta[field[1]] = value;
    }
    body = text.slice(match[0].length);
  }
  if (!body.trim()) throw new Error("empty contribution");
  return {
    lab: meta.lab || "Shared",
    date: meta.date || "",
    status: meta.status || "current",
    body,
  };
}

function snapshot(root) {
  const base = path.join(root, ".research");
  const data = {
    updates: [],
    questions: [],
    legacy: [],
    warnings: [],
    feedback: "",
    activity: fs.existsSync(path.join(base, "activity/README.md")),
  };
  const read = (name, parse) => {
    try {
      const file = path.join(base, name);
      if (!fs.lstatSync(file).isFile()) throw new Error("not a regular file");
      return parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      data.warnings.push({ file: name, message: error.message });
    }
  };
  const names = (dir) => {
    try {
      const folder = path.join(base, dir);
      if (!fs.lstatSync(folder).isDirectory())
        throw new Error("not a regular directory");
      return fs.readdirSync(folder).sort();
    } catch (error) {
      if (error.code !== "ENOENT")
        data.warnings.push({ file: dir, message: error.message });
      return [];
    }
  };
  for (const name of names("updates")) {
    const file = "updates/" + name;
    if (name.endsWith(".md")) {
      const update = read(file, markdown);
      if (update) data.updates.push({ ...update, file });
    } else if (name.endsWith(".json")) {
      // Keep the first experimental format readable without preserving its
      // review graph or requiring a migration. Missing peers cannot block a build.
      const old = read(file, JSON.parse);
      if (old)
        data.legacy.push({
          file,
          body: "```json\n" + JSON.stringify(old, null, 2) + "\n```",
        });
    }
  }
  for (const name of names("questions").filter((n) => n.endsWith(".json"))) {
    const file = "questions/" + name;
    const question = read(file, (text) => {
      const value = JSON.parse(text);
      if (
        typeof value.question !== "string" ||
        !["open", "answered"].includes(value.status)
      )
        throw new Error("unreadable question");
      return value;
    });
    if (question?.status === "open") data.questions.push({ ...question, file });
  }
  if (fs.existsSync(path.join(base, "FEEDBACK.md")))
    data.feedback =
      read("FEEDBACK.md", (text) => {
        if (/^<<<<<<< /m.test(text))
          throw new Error("unresolved merge conflict");
        return text;
      }) || "";
  for (const name of [
    "SUMMARY.md",
    "STATUS.md",
    ...names("status-reports")
      .filter((n) => n.endsWith(".md"))
      .map((n) => "status-reports/" + n),
  ])
    if (fs.existsSync(path.join(base, name))) data.legacy.push({ file: name });
  return data;
}

const label = (text) => String(text).replace(/[\r\n<>]/g, "");
const link = (file) =>
  `[${label(file)}](<${file.split("/").map(encodeURIComponent).join("/")}>)`;
// Inline links in a note are relative to that note. Relocate them in the combined
// page, leaving code examples and external URLs alone. Reference definitions work too.
function relocate(body, file) {
  let fence;
  const target = (value) =>
    /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(value)
      ? value
      : value.startsWith("#")
        ? file + value
        : path.posix.join(path.posix.dirname(file), value);
  return body
    .split("\n")
    .map((line) => {
      const edge = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (edge) {
        if (!fence) fence = edge;
        else if (edge[0] === fence[0] && edge.length >= fence.length)
          fence = undefined;
        return line;
      }
      if (fence) return line;
      return line
        .replace(
          /(\]\()([^\s)]+)(\))/g,
          (_all, open, url, close) => open + target(url) + close,
        )
        .replace(
          /^(\s*\[[^\]]+\]:\s*)(\S+)/,
          (_all, prefix, url) => prefix + target(url),
        );
    })
    .join("\n");
}

function render(data) {
  const lines = [
    "# Research report",
    "",
    "Generated from lab updates, feedback, and open questions. Rebuild after editing or merging the inputs.",
    "",
  ];
  if (data.activity) lines.push("[Activity: labs, models, tokens, costs, and research turns](activity/README.md)", "");
  const archived = [],
    active = [];
  for (const update of data.updates)
    (/^(archived|resolved|rejected|superseded)$/i.test(update.status)
      ? archived
      : active
    ).push(update);
  for (const lab of [...new Set(active.map((u) => u.lab))].sort()) {
    lines.push("## " + label(lab), "");
    for (const update of active
      .filter((u) => u.lab === lab)
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.file.localeCompare(b.file),
      )) {
      lines.push(
        `${link(update.file)}${update.date ? " · " + label(update.date) : ""}${update.status !== "current" ? " · " + label(update.status) : ""}`,
        "",
        relocate(update.body.trim(), update.file),
        "",
        "---",
        "",
      );
    }
  }
  if (!active.length) lines.push("No current updates.", "");
  if (data.feedback) lines.push("## Feedback", "", data.feedback.trim(), "");
  if (data.questions.length) {
    lines.push("## Operator questions", "");
    for (const q of data.questions) {
      lines.push(`- ${q.question} (${link(q.file)})`);
      if (q.affected) lines.push("  Affects: " + q.affected);
      if (q.proposedDefault)
        lines.push(
          "  Proposed default, awaiting an answer: " + q.proposedDefault,
        );
    }
    lines.push("");
  }
  if (archived.length || data.legacy.length) {
    lines.push(
      "<details><summary>Earlier contributions and reports</summary>",
      "",
    );
    for (const item of [...archived, ...data.legacy]) {
      lines.push(
        "- " +
          link(item.file) +
          (item.status ? " · " + label(item.status) : ""),
        "",
      );
      if (item.body && !item.status) lines.push(item.body, "");
    }
    lines.push("</details>", "");
  }
  if (data.warnings.length) {
    lines.push(
      "## Entries needing attention",
      "",
      "The rest of the report is available. These inputs could not be included:",
      "",
    );
    for (const warning of data.warnings)
      lines.push(`- ${link(warning.file)}: ${label(warning.message)}`);
    lines.push("");
  }
  return lines.join("\n");
}

function build(root) {
  const data = snapshot(root),
    text = render(data),
    file = path.join(root, ".research/REPORT.md");
  // No HEAD hash or clock in the output: committing a report must not dirty it again.
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = file + "." + randomUUID();
    try {
      fs.writeFileSync(temp, text);
      fs.renameSync(temp, file);
    } finally {
      fs.rmSync(temp, { force: true });
    }
  }
  return { file, text, warnings: data.warnings };
}

function refresh(root) {
  const data = snapshot(root);
  return { text: render(data), warnings: data.warnings };
}

module.exports = { rootOf, snapshot, render, build, refresh };
if (typeof require.main !== "undefined" && require.main === module) {
  try {
    const [command = "build", ...args] = process.argv.slice(2),
      at = args.indexOf("--root");
    if (command !== "build")
      throw new Error(
        "Write Markdown in .research/updates/, then run record.cjs build.",
      );
    console.log(build(rootOf(at >= 0 ? args[at + 1] : process.cwd())).file);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

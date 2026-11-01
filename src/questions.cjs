// Questions are shared; delivery receipts belong to this checkout, not a chat.
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const valid = (id) => typeof id === "string" && /^Q-[a-f0-9-]{36}$/.test(id);
const deliveryId = (q) =>
  q.id + ":" + createHash("sha256").update(q.answer).digest("hex");

function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + "." + randomUUID();
  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n");
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
function readDirectory(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^Q-[a-f0-9-]{36}\.json$/.test(f))
    .sort()
    .map((f) => {
      try {
        const q = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        return valid(q.id) && ["open", "answered"].includes(q.status)
          ? q
          : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
function list(root) {
  return readDirectory(path.join(root, ".research/questions"));
}
function write(root, q) {
  if (!valid(q.id)) throw new Error("Invalid question ID");
  atomic(path.join(root, ".research/questions", q.id + ".json"), q);
  return q;
}
function make({
  question,
  author = "manager",
  task = null,
  affected = "",
  proposedDefault = "",
}) {
  if (typeof question !== "string" || !question.trim())
    throw new Error("A question is required");
  return {
    id: "Q-" + randomUUID(),
    created: new Date().toISOString(),
    author,
    task,
    question,
    affected,
    proposedDefault,
    status: "open",
    answer: null,
  };
}
function submit(root, fields) {
  return write(root, make(fields));
}
function draft(folder, fields) {
  const q = make(fields);
  atomic(path.join(folder, "questions", q.id + ".json"), q);
  return q;
}
// The manager's runtime promotes question drafts, without granting any permission.
// Findings and research edits still require the manager's substantive review.
function integrate(root, folder) {
  const existing = new Set(list(root).map((q) => q.id));
  for (const q of readDirectory(path.join(folder, "questions"))) {
    if (!existing.has(q.id))
      write(root, { ...q, status: "open", answer: null });
  }
}
function integrateDrafts(root) {
  const scratch = path.join(root, ".research/scratch");
  if (!fs.existsSync(scratch)) return;
  for (const e of fs.readdirSync(scratch, { withFileTypes: true }))
    if (e.isDirectory()) integrate(root, path.join(scratch, e.name));
}
function answer(root, id, text) {
  const q = list(root).find((q) => q.id === id);
  if (!q) throw new Error("Question not found");
  if (typeof text !== "string" || !text.trim())
    throw new Error("An answer is required");
  return write(root, {
    ...q,
    status: "answered",
    answer: text,
    answered: new Date().toISOString(),
  });
}
function receiptDir(root) {
  return path.join(root, ".research/local/question-deliveries");
}
function receipt(root, delivery) {
  return path.join(
    receiptDir(root),
    createHash("sha256").update(delivery).digest("hex") + ".json",
  );
}
function acknowledge(root, delivered = []) {
  // Delivery is local to this clone, and never part of shared research.
  const local = path.join(root, ".research/local");
  if (delivered.length && !fs.existsSync(path.join(local, ".gitignore"))) {
    fs.mkdirSync(local, { recursive: true });
    fs.writeFileSync(path.join(local, ".gitignore"), "*\n");
  }
  // One immutable receipt per answer prevents two sessions overwriting a ledger.
  for (const delivery of delivered.filter((d) => typeof d === "string")) {
    const file = receipt(root, delivery);
    if (!fs.existsSync(file))
      atomic(file, { delivery, at: new Date().toISOString() });
  }
}
function pending(root, delivered = []) {
  acknowledge(root, delivered); // Migrate acknowledgments from older session history.
  return list(root)
    .filter((q) => q.status === "answered")
    .map((q) => ({ ...q, delivery: deliveryId(q) }))
    .filter((q) => !fs.existsSync(receipt(root, q.delivery)));
}
module.exports = {
  list,
  submit,
  draft,
  integrate,
  integrateDrafts,
  answer,
  pending,
  acknowledge,
};
if (typeof require.main !== "undefined" && require.main === module) {
  try {
    const [cmd = "list", id, ...text] = process.argv.slice(2),
      root = process.cwd();
    const value =
      cmd === "answer"
        ? answer(root, id, text.join(" "))
        : cmd === "submit"
          ? submit(root, { question: [id, ...text].join(" ") })
          : cmd === "draft"
            ? draft(path.resolve(id), {
                question: text.join(" "),
                author: "worker",
                task: path.basename(id),
              })
            : list(root);
    console.log(JSON.stringify(value, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

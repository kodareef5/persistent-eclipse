// Vary the question rather than repeating a motivational paragraph every turn.
const prompts = {
  capacity: [
    "What independent question could another researcher pursue while this work develops?",
    "Is there a promising connection that nobody has followed far enough yet?",
    "Which assumption would benefit from a fresh reader approaching the source in their own way?",
    "Could a different representation reveal something the current approach hides?",
    "What did the last surprising result make possible? Give that question room to develop.",
    "If the present route is blocked, what part of the obstruction could become a smaller research question?",
  ],
  round: [
    "Carry the most interesting unresolved question forward. A useful discovery may be a change in how we see the problem.",
    "Look at the step that feels inevitable. Which assumption makes it seem so?",
    "Follow a promising alternative far enough to learn where it agrees with the evidence and where it breaks.",
    "What would a neighboring field call this difficulty? Try the translation on a concrete case.",
    "Let a surprise influence the next question. The brief is a starting point for investigation.",
    "A roadblock can be precise without closing the wider problem. What did it teach us about another route?",
  ],
  housekeeping: [
    "Keep the ideas that changed the investigation easy to find. Give a promising unfinished thought back to a researcher.",
    "Step back from the record. Which question now looks more interesting than it did when the work began?",
    "Preserve the evidence and disagreements; let routine bookkeeping make room for the next useful investigation.",
  ],
};
const positions = new Map();
function nudge(kind, index) {
  const choices = prompts[kind] || prompts.round;
  const next = index ?? positions.get(kind) ?? 0;
  positions.set(kind, next + 1);
  return choices[next % choices.length];
}
function duration(text, key, fallback) {
  const m = new RegExp(
    "^" + key + ":[ \\t]*(off|[0-9]+(?:\\.[0-9]+)?)[ \\t]*([hms]?)\\b",
    "im",
  ).exec(text);
  return !m
    ? fallback
    : m[1].toLowerCase() === "off"
      ? 0
      : Math.max(
          1000,
          Number(m[1]) * { s: 1000, m: 60000, h: 3600000 }[m[2] || "m"],
        );
}
function settings(text = "") {
  return {
    capacity: duration(text, "Fleet check", 300000),
    stall: duration(text, "Progress check", 1200000),
  };
}
function delay(text, repeated = 0) {
  const s = settings(text);
  const base = s.capacity || s.stall;
  return !base
    ? 0
    : repeated === 0
      ? Math.min(base, s.stall || base)
      : repeated === 1
        ? Math.max(base, 900000)
        : Math.max(base, 1800000);
}
function inspect({ workers, slots, now = Date.now(), text = "" }) {
  const s = settings(text),
    stalled = s.stall ? workers.filter((w) => now - w.since >= s.stall) : [];
  return {
    reason:
      s.capacity && slots > workers.length
        ? "with free capacity for another useful question"
        : stalled.length
          ? "with workers whose progress needs a look"
          : "",
    stalled,
  };
}
module.exports = { settings, delay, inspect, nudge };

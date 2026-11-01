export const cacheLimitedRoute = (model) =>
  model?.api === "anthropic-messages" || /claude|fable/i.test(model?.id || "");
// Only cache annotations change. Never merge message roles or touch signed blocks.
export function normalizeCacheControl(payload, { limit = 4 } = {}) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.messages)
  )
    return payload;
  const markers = [];
  const add = (parent, key) => {
    if (parent?.[key]?.cache_control)
      markers.push({ parent, key, block: parent[key] });
  };
  // Anthropic tools/system/messages; OpenAI-shaped Claude bridges use message content.
  for (let i = 0; i < (payload.tools?.length || 0); i++) add(payload.tools, i);
  if (Array.isArray(payload.system))
    for (let i = 0; i < payload.system.length; i++) add(payload.system, i);
  for (const message of payload.messages)
    if (Array.isArray(message.content))
      for (let i = 0; i < message.content.length; i++) add(message.content, i);
  if (!markers.length) return payload;
  const copy = structuredClone(payload),
    system = [];
  if (Array.isArray(copy.system))
    for (const block of copy.system)
      if (block.type === "text" && block.cache_control) system.push(block);
  for (const message of copy.messages)
    if (
      ["system", "developer"].includes(message.role) &&
      Array.isArray(message.content)
    )
      for (const block of message.content)
        if (block.type === "text" && block.cache_control) system.push(block);
  // The last existing boundary caches the complete stable prefix, without rewriting it.
  for (const block of system.slice(0, -1)) delete block.cache_control;
  const all = [];
  for (const block of copy.tools || [])
    if (block.cache_control) all.push(block);
  for (const block of Array.isArray(copy.system) ? copy.system : [])
    if (block.cache_control) all.push(block);
  for (const message of copy.messages)
    for (const block of Array.isArray(message.content) ? message.content : [])
      if (block.cache_control) all.push(block);
  const max = Math.max(0, limit - (copy.cache_control ? 1 : 0));
  const stable = system.at(-1);
  const keep = new Set(all.slice(-max));
  if (max === 0) keep.clear();
  if (stable && max > 0 && !keep.has(stable)) {
    keep.delete(keep.values().next().value);
    keep.add(stable);
  }
  for (const block of all) if (!keep.has(block)) delete block.cache_control;
  return copy;
}

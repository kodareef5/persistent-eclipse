import { isContextOverflow } from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { retryDelay, waitForRetry } from "./retry.mjs";

export function installRetry(pi: ExtensionAPI, enabled: (ctx: ExtensionContext) => boolean,
  activity: (text: string, error?: string) => void = () => {}) {
  let attempt = 0, ready = false;
  const reset = (ctx: ExtensionContext) => { attempt = 0; ready = false; ctx.ui.setStatus("pe-retry", undefined); };
  pi.on("session_start", (_event, ctx) => reset(ctx));
  pi.on("session_shutdown", (_event, ctx) => reset(ctx));
  pi.on("agent_settled", (_event, ctx) => reset(ctx));
  pi.on("turn_end", async (event, ctx) => {
    ready = false;
    if (!enabled(ctx) || event.message.stopReason !== "error") { reset(ctx); return; }
    // Leave context repair to Pi. This hook retries requests, never tools.
    if (isContextOverflow(event.message, ctx.model?.contextWindow) || !ctx.signal || ctx.signal.aborted) return;
    const delayMs = retryDelay(++attempt);
    const status = `${ctx.model?.provider ?? "provider"}: retry at ${new Date(Date.now() + delayMs).toLocaleTimeString()}`;
    ctx.ui.setStatus("pe-retry", status);
    // The first wait carries the provider's own words, so a waiting session is not taken for a working one.
    activity(status, attempt === 1 ? event.message.errorMessage || "provider error" : undefined);
    if (attempt === 1) ctx.ui.notify(`Provider request failed; ${status}. Stop the turn to cancel.`, "warning");
    pi.appendEntry("pe-retry", {attempt, delayMs, retryAt: Date.now() + delayMs});
    // The turn's live signal lets Escape, worker cancellation, and shutdown wake this wait.
    if (!await waitForRetry(delayMs, ctx.signal)) { reset(ctx); return; }
    ready = true;
    ctx.ui.setStatus("pe-retry", undefined);
    activity("retrying");
    // Keep the failed attempt in the transcript, out of the next model request.
    return {entries: [...event.entries, {type: "context_edit", targetId: event.messageEntryId, replacement: null}]};
  });
  pi.on("agent_before_settle", event => {
    if (ready && event.outcome === "error") { ready = false; return {continue: true}; }
  });
}

// A failed request stays in its session. Only the wait grows, never the task.
export const backoff = Object.freeze({initialDelayMs: 30_000, maxDelayMs: 30 * 60_000, jitterRatio: 0.1});

export function retryDelay(attempt, random = Math.random) {
  const base = Math.min(backoff.maxDelayMs, backoff.initialDelayMs * 2 ** Math.min(30, Math.max(0, attempt - 1)));
  return Math.min(backoff.maxDelayMs, Math.round(base * (1 - backoff.jitterRatio + 2 * backoff.jitterRatio * random())));
}

export function waitForRetry(delayMs, signal) {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const finish = ready => { clearTimeout(timer); signal.removeEventListener('abort', cancel); resolve(ready); };
    const cancel = () => finish(false);
    const timer = setTimeout(() => finish(true), delayMs);
    signal.addEventListener('abort', cancel, {once: true});
  });
}

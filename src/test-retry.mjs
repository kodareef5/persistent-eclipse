import test from 'node:test';
import assert from 'node:assert/strict';
import {backoff, retryDelay, waitForRetry} from './retry.mjs';

test('long outages keep a finite wait of at most thirty minutes', () => {
  assert.equal(backoff.maxDelayMs, 30 * 60_000);
  assert.equal(retryDelay(1, () => 0.5), 30_000);
  for (const attempt of [1, 2, 8, 100, Number.MAX_SAFE_INTEGER]) {
    for (const random of [0, 0.5, 1]) {
      const delay = retryDelay(attempt, () => random);
      assert.ok(delay > 0 && delay <= 30 * 60_000, `${attempt}: ${delay}`);
    }
  }
});

test('cancelling a long wait wakes it immediately; a finished wait can retry', async () => {
  const controller = new AbortController();
  const pending = waitForRetry(backoff.maxDelayMs, controller.signal);
  controller.abort();
  assert.equal(await pending, false);
  assert.equal(await waitForRetry(backoff.maxDelayMs, controller.signal), false);
  assert.equal(await waitForRetry(1, new AbortController().signal), true);
});

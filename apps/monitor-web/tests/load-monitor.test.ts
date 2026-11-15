import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMonitor } from '../src/features/system-health/load-monitor';

test('all failed requests produce an error instead of silently clearing it', async () => {
  const result = await loadMonitor(new AbortController().signal, async () => {
    throw new Error('offline');
  });
  assert.match(result.error, /Không thể cập nhật/);
  assert.equal(result.snapshot, undefined);
  assert.equal(result.journal, undefined);
  assert.equal(result.activity, undefined);
});
test('partial failure preserves successful data and reports stale sections', async () => {
  const result = await loadMonitor(new AbortController().signal, async <T>(path: string) => {
    if (path === '/monitor/events') throw new Error('offline');
    return { path } as T;
  });
  assert.match(result.error, /Một phần/);
  assert.deepEqual(result.snapshot, { path: '/monitor' });
  assert.equal(result.journal, undefined);
});
test('a successful refresh clears the error and propagates cancellation', async () => {
  const controller = new AbortController();
  const result = await loadMonitor(
    controller.signal,
    async <T>(_path: string, signal?: AbortSignal) => {
      assert.equal(signal, controller.signal);
      return {} as T;
    },
  );
  assert.equal(result.error, '');
});

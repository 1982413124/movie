import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createToastStore, NOTIFICATION_EVENTS, toast, toastStore } from './toast-store.mjs';

test('identical notifications are deduplicated without disturbing subscribers', () => {
  const store = createToastStore();
  let changes = 0;
  const unsubscribe = store.subscribe(() => changes++);
  const first = store.show('保存しました。');
  const snapshot = store.getSnapshot();
  assert.equal(store.show('保存しました。'), first);
  assert.equal(store.getSnapshot(), snapshot);
  assert.equal(changes, 1);
  store.dismiss('missing');
  assert.equal(changes, 1);
  store.dismiss(first);
  assert.equal(store.getSnapshot().length, 0);
  assert.equal(changes, 2);
  assert.notEqual(store.show('保存しました。'), first);
  unsubscribe();
  store.show('次の操作');
  assert.equal(changes, 3);
});

test('the latest three notifications remain bounded with distinct severity and longer errors', () => {
  const store = createToastStore();
  assert.equal(store.show('  '), null);
  store.show('古い通知');
  store.show('成功');
  store.show('失敗', { tone: 'error' });
  store.show('一部未完了', { tone: 'warning' });
  assert.deepEqual(store.getSnapshot().map(({ message, duration }) => [message, duration]), [
    ['成功', 4500], ['失敗', 9000], ['一部未完了', 9000],
  ]);
  assert.deepEqual(store.getServerSnapshot(), []);
});

test('future coupon and favorite events are callable, while server calls never create notices', () => {
  assert.equal(toast.event('reservation.completed'), null);
  assert.deepEqual(toastStore.getSnapshot(), []);
  globalThis.window = {};
  try {
    for (const [name, event] of Object.entries(NOTIFICATION_EVENTS)) {
      const id = toast.event(name);
      const item = toastStore.getSnapshot().find(item => item.id === id);
      assert.equal(item.message, event.message);
      assert.equal(item.tone, name === 'coupon.failed' || name === 'error' ? 'error' : 'success');
      toast.dismiss(id);
    }
    const id = toast.event('coupon.failed', { message: 'このクーポンは期限切れです。' });
    assert.equal(toastStore.getSnapshot()[0].message, 'このクーポンは期限切れです。');
    assert.equal(toastStore.getSnapshot()[0].tone, 'error');
    toast.dismiss(id);
    assert.equal(toast.event('unknown'), null);
  } finally {
    delete globalThis.window;
  }
  assert.deepEqual(toastStore.getSnapshot(), []);
});

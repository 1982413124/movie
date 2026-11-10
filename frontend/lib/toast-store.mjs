/** @typedef {'success' | 'error' | 'warning' | 'info'} ToastTone */
/** @typedef {{ id: string, key: string, message: string, tone: ToastTone, duration: number }} Toast */
/** @typedef {{ tone?: ToastTone, key?: string, duration?: number }} ToastOptions */

/** @type {Record<string, { message: string, tone: ToastTone }>} */
export const NOTIFICATION_EVENTS = Object.freeze({
  'reservation.completed': { message: '予約が完了しました。', tone: 'success' },
  'reservation.cancelled': { message: '予約をキャンセルしました。', tone: 'success' },
  'coupon.applied': { message: 'クーポンを適用しました。', tone: 'success' },
  'coupon.failed': { message: 'クーポンを適用できませんでした。利用条件を確認してください。', tone: 'error' },
  'favorite.added': { message: 'お気に入りに追加しました。', tone: 'success' },
  'profile.updated': { message: '会員情報を保存しました。', tone: 'success' },
  'movie.updated': { message: '映画情報を更新しました。', tone: 'success' },
  'showing.updated': { message: '上映情報を更新しました。', tone: 'success' },
  'error': { message: 'エラーが発生しました。もう一度お試しください。', tone: 'error' },
});

/** @type {Toast[]} */
const EMPTY = [];

// The store lives across client-side navigation. Nothing is persisted to storage.
export function createToastStore(limit = 3) {
  /** @type {Toast[]} */
  let items = EMPTY;
  let sequence = 0;
  const listeners = new Set();
  const emit = () => listeners.forEach(listener => listener());
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => items,
    getServerSnapshot: () => EMPTY,
    /** @param {string} message @param {ToastOptions} options */
    show(message, { tone = 'success', key, duration } = {}) {
      const text = String(message ?? '').trim();
      if (!text) return null;
      const notificationKey = key ?? `${tone}:${text}`;
      const existing = items.find(item => item.key === notificationKey);
      if (existing) return existing.id;
      const id = `toast-${++sequence}`;
      items = [...items, {
        id, key: notificationKey, message: text, tone,
        duration: duration ?? (tone === 'error' || tone === 'warning' ? 9000 : 4500),
      }].slice(-limit);
      emit();
      return id;
    },
    dismiss(id) {
      if (!items.some(item => item.id === id)) return;
      items = items.filter(item => item.id !== id);
      emit();
    },
  };
}

export const toastStore = createToastStore();

/** @param {string} message @param {ToastOptions} options */
function show(message, options = {}) {
  if (typeof window === 'undefined') return null;
  return toastStore.show(message, options);
}

export const toast = {
  /** @param {string} message @param {ToastOptions} options */
  success: (message, options = {}) => show(message, { ...options, tone: 'success' }),
  /** @param {string} message @param {ToastOptions} options */
  error: (message, options = {}) => show(message, { ...options, tone: 'error' }),
  /** @param {string} message @param {ToastOptions} options */
  warning: (message, options = {}) => show(message, { ...options, tone: 'warning' }),
  /** @param {string} name @param {ToastOptions & { message?: string }} options */
  event(name, options = {}) {
    const event = NOTIFICATION_EVENTS[name];
    if (!event) return null;
    return show(options.message ?? event.message, { ...event, ...options });
  },
  dismiss: toastStore.dismiss,
};

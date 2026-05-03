import { create } from 'zustand';

export type NotificationKind = 'error' | 'success' | 'info';

export interface Notification {
  id: string;
  kind: NotificationKind;
  message: string;
}

interface NotificationStoreState {
  notifications: Notification[];
  notify: (kind: NotificationKind, message: string, ttlMs?: number) => void;
  dismiss: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],

  notify(kind, message, ttlMs = 4000) {
    const id = makeId();
    set((s) => ({ notifications: [...s.notifications, { id, kind, message }] }));
    const t = setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      timers.delete(id);
    }, ttlMs);
    timers.set(id, t);
  },

  dismiss(id) {
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },
}));

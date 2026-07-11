import React from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import type { NotificationKind } from '../../stores/notificationStore';

const KIND_CLASSES: Record<NotificationKind, string> = {
  error: 'bg-part-remove text-on-accent',
  success: 'bg-part-keep text-on-accent',
  info: 'bg-raised text-ink',
};

export function NotificationToast(): React.JSX.Element | null {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {notifications.map((n) => (
        <button
          key={n.id}
          data-testid="notification-toast"
          onClick={() => dismiss(n.id)}
          className={`pointer-events-auto px-3 py-2 rounded-[3px] shadow text-xs font-medium text-left max-w-xs cursor-pointer ${KIND_CLASSES[n.kind]}`}
        >
          {n.message}
        </button>
      ))}
    </div>
  );
}

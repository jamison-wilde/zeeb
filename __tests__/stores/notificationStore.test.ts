import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '../../src/stores/notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
    vi.useFakeTimers();
  });

  it('starts empty', () => {
    expect(useNotificationStore.getState().notifications).toEqual([]);
  });

  it('notify() appends an entry with kind and message', () => {
    useNotificationStore.getState().notify('error', 'Boom');
    const list = useNotificationStore.getState().notifications;
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('error');
    expect(list[0].message).toBe('Boom');
    expect(list[0].id).toBeTruthy();
  });

  it('auto-dismisses after the default ttl (4000ms)', () => {
    useNotificationStore.getState().notify('info', 'Hi');
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('auto-dismisses after a custom ttl', () => {
    useNotificationStore.getState().notify('success', 'Done', 1000);
    vi.advanceTimersByTime(999);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('dismiss() removes a specific entry early', () => {
    useNotificationStore.getState().notify('error', 'A');
    useNotificationStore.getState().notify('info', 'B');
    const [first] = useNotificationStore.getState().notifications;
    useNotificationStore.getState().dismiss(first.id);
    const remaining = useNotificationStore.getState().notifications;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('B');
  });
});

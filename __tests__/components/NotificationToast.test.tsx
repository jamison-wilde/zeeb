import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationToast } from '../../src/renderer/components/NotificationToast';
import { useNotificationStore } from '../../src/stores/notificationStore';

describe('NotificationToast', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
    vi.useFakeTimers();
  });

  it('renders nothing when there are no notifications', () => {
    const { container } = render(<NotificationToast />);
    expect(container.querySelector('[data-testid="notification-toast"]')).toBeNull();
  });

  it('renders one element per notification with kind-specific styling', () => {
    render(<NotificationToast />);
    act(() => {
      useNotificationStore.getState().notify('error', 'Boom');
      useNotificationStore.getState().notify('success', 'Yay');
    });
    const toasts = screen.getAllByTestId('notification-toast');
    expect(toasts).toHaveLength(2);
    expect(toasts[0].className).toMatch(/red/);
    expect(toasts[1].className).toMatch(/green/);
    expect(toasts[0]).toHaveTextContent('Boom');
    expect(toasts[1]).toHaveTextContent('Yay');
  });

  it('auto-dismisses after ttl', () => {
    render(<NotificationToast />);
    act(() => {
      useNotificationStore.getState().notify('info', 'Hi', 1000);
    });
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId('notification-toast')).toBeNull();
  });

  it('clicking a toast dismisses it early', () => {
    render(<NotificationToast />);
    act(() => {
      useNotificationStore.getState().notify('error', 'Click me');
    });
    fireEvent.click(screen.getByTestId('notification-toast'));
    expect(screen.queryByTestId('notification-toast')).toBeNull();
  });
});

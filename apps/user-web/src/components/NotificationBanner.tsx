/**
 * @file NotificationBanner.tsx
 * @description Biểu ngữ thông báo lỗi hoặc cảnh báo quyền vị trí/mạng cho du khách
 */

import React from 'react';

interface NotificationBannerProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

export function NotificationBanner({
  message,
  type = 'info',
  actionLabel,
  onAction,
  onClose
}: NotificationBannerProps) {
  if (!message) return null;

  return (
    <div className={`notification-banner banner-${type}`} role="alert">
      <span className="banner-message">{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="banner-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {onClose && (
        <button type="button" className="banner-close" onClick={onClose} aria-label="Đóng">
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * @file Toast.tsx
 * @description Thông báo nổi (Toast notification) cho quản trị viên
 */

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span>{message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Đóng thông báo"
      >
        &times;
      </button>
    </div>
  );
}

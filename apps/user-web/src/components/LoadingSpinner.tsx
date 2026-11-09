/**
 * @file LoadingSpinner.tsx
 * @description Vòng xoay báo hiệu trạng thái tải dữ liệu cho du khách
 */

import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ label = 'Đang tải dữ liệu...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={`loading-wrapper spinner-${size}`} role="status">
      <div className="spinner-circle" aria-hidden="true" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

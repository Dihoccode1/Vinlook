/**
 * @file Button.tsx
 * @description Nút bấm chuẩn với các biến thể giao diện cho Admin Web
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Component Button chuẩn hỗ trợ trạng thái đang tải (loading) và nhiều biến thể
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const baseClasses = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

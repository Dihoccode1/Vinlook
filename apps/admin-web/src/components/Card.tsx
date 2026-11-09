/**
 * @file Card.tsx
 * @description Khung thẻ (Card) hiển thị thông tin thống kê hoặc khối nội dung
 */

import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, action, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`.trim()}>
      {(title || action) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

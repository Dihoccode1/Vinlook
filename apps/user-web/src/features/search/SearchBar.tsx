/**
 * @file SearchBar.tsx
 * @description Thanh tìm kiếm địa điểm tham quan du lịch cho du khách
 */

import React from 'react';
import { Icon } from '../../components/Icon';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchBar({
  value,
  onChange,
  onFocus,
  placeholder = 'Tìm tên điểm đến hoặc địa chỉ...',
  disabled = false
}: SearchBarProps) {
  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <Icon kind="search" size={18} className="search-icon" />
        <input
          type="search"
          aria-label="Tìm kiếm địa điểm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          maxLength={200}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onChange('')}
            aria-label="Xóa nội dung tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

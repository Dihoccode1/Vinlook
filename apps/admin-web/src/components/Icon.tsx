/**
 * @file Icon.tsx
 * @description Tập hợp các biểu tượng SVG vector chuẩn hoá cho hệ thống quản trị
 */

import React from 'react';

export type IconKind = 'grid' | 'pin' | 'eye' | 'photo' | 'draft' | 'search' | 'listen' | 'user' | 'close' | 'plus' | 'refresh' | 'check';

interface IconProps {
  kind: IconKind;
  size?: number;
  className?: string;
}

const ICON_PATHS: Record<IconKind, string> = {
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  listen: 'M4 14v-3a8 8 0 0 1 16 0v3 M4 13H2v7h5v-7z M20 13h2v7h-5v-7z',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  photo: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M15 7h.01',
  draft: 'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h5',
  search: 'M21 21l-5-5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
  close: 'M18 6L6 18 M6 6l12 12',
  plus: 'M12 5v14 M5 12h14',
  refresh: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  check: 'M20 6L9 17l-5-5'
};

/**
 * Hiển thị biểu tượng SVG theo loại
 */
export function Icon({ kind, size = 20, className = '' }: IconProps) {
  const path = ICON_PATHS[kind] || ICON_PATHS.grid;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

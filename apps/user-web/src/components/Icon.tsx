/**
 * @file Icon.tsx
 * @description Tập hợp các biểu tượng SVG vector chuẩn hoá cho giao diện du khách (User Web)
 */

import React from 'react';

export type UserIconKind =
  | 'search'
  | 'map'
  | 'compass'
  | 'location'
  | 'audio'
  | 'route'
  | 'close'
  | 'chevron-up'
  | 'chevron-down'
  | 'share';

interface UserIconProps {
  kind: UserIconKind;
  size?: number;
  className?: string;
}

const ICON_PATHS: Record<UserIconKind, string> = {
  search: 'M21 21l-5-5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
  map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-4v16m8-12v16',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.5 6.5l-2.5 6-6 2.5 2.5-6 6-2.5z',
  location: 'M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
  audio: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm6 7v3a6 6 0 0 1-12 0V9m6 9v4m-4 0h8',
  route: 'M18 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0v6a4 4 0 0 0 4 4h4',
  close: 'M18 6L6 18M6 6l12 12',
  'chevron-up': 'M18 15l-6-6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-9.5-8.5l7-3.5m-7 5l7 3.5'
};

export function Icon({ kind, size = 20, className = '' }: UserIconProps) {
  const path = ICON_PATHS[kind] || ICON_PATHS.map;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

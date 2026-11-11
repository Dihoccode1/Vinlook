/**
 * @file MonitorLayout.tsx
 * @description Khung giao diện (Layout) cho phân hệ Giám sát Hệ thống (Monitor Web)
 */

import React from 'react';

interface MonitorLayoutProps {
  children: React.ReactNode;
}

export function MonitorLayout({ children }: MonitorLayoutProps) {
  return (
    <div className="monitor-layout">
      <header className="monitor-topbar">
        <div className="topbar-brand">
          <a href="/">
            vinlook<span>.</span>
          </a>
          <span className="sub-badge">Giám sát Hệ thống (System Monitoring)</span>
        </div>
        <div className="topbar-actions">
          <a href={import.meta.env.PROD ? '/admin' : 'http://127.0.0.1:5174/'} className="btn-link">
            Quản trị Admin →
          </a>
        </div>
      </header>
      <main className="monitor-main">{children}</main>
      <footer className="monitor-footer">
        <span>© 2026 Vinlook Tourism Platform • Trung tâm điều hành & giám sát</span>
      </footer>
    </div>
  );
}

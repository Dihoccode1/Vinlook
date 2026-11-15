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
      <header className="monitor-topbar flex justify-between items-center py-[1rem] px-[2rem] bg-[var(--card-bg)]">
        <div className="topbar-brand">
          <a href="/">
            vinlook<span>.</span>
          </a>
          <span className="sub-badge ml-[1rem] text-[0.85rem] text-[var(--text-muted)]">
            Giám sát Hệ thống (System Monitoring)
          </span>
        </div>
        <div className="topbar-actions">
          <a
            href={import.meta.env.PROD ? '/admin' : 'http://127.0.0.1:5174/'}
            className="btn-link text-[var(--accent)] text-[0.9rem]"
          >
            Quản trị Admin →
          </a>
        </div>
      </header>
      <main className="monitor-main">{children}</main>
      <footer className="monitor-footer text-center p-[2rem] text-[var(--text-muted)] text-[0.85rem]">
        <span>© 2026 Vinlook Tourism Platform • Trung tâm điều hành & giám sát</span>
      </footer>
    </div>
  );
}

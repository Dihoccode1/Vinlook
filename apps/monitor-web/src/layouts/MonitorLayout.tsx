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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-8">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
          <a href="/" className="text-2xl font-bold tracking-tight text-foreground">
            vinlook<span className="text-brand-dot">.</span>
          </a>
          <span className="text-sm text-muted-foreground">
            Giám sát Hệ thống (System Monitoring)
          </span>
        </div>
        <div className="shrink-0">
          <a
            href={import.meta.env.PROD ? '/admin' : 'http://127.0.0.1:5174/'}
            className="text-sm font-medium text-primary hover:underline"
          >
            Quản trị Admin →
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 sm:p-6">{children}</main>
      <footer className="px-4 py-8 text-center text-xs text-muted-foreground">
        <span>© 2026 Vinlook Tourism Platform • Trung tâm điều hành & giám sát</span>
      </footer>
    </div>
  );
}

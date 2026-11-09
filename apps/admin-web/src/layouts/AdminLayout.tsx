/**
 * @file AdminLayout.tsx
 * @description Khung giao diện chuẩn (Master Layout) cho Phân hệ Quản trị Admin Web
 * Bao gồm Header điều hướng, huy hiệu người dùng, thanh chuyển đổi tab và khu vực nội dung chính.
 */

import React, { useLayoutEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import type { IconKind } from '../components/Icon';

export type AdminViewTab = 'overview' | 'pois' | 'monitor' | 'users' | 'categories' | 'languages';

interface AdminLayoutProps {
  user: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
  };
  currentView: AdminViewTab;
  onViewChange: (view: AdminViewTab) => void;
  onLogout: () => void;
  loggingOut?: boolean;
  toast?: string;
  onClearToast?: () => void;
  children: React.ReactNode;
}

export function AdminLayout({
  user,
  currentView,
  onViewChange,
  onLogout,
  loggingOut = false,
  toast,
  onClearToast,
  children
}: AdminLayoutProps) {
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  const backToTop = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior });
    window.scrollTo({ top: 0, left: 0, behavior });
  };

  const navItems: { id: AdminViewTab; label: string; icon: IconKind; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Tổng quan', icon: 'grid' },
    { id: 'pois', label: 'Điểm tham quan', icon: 'pin' },
    { id: 'categories', label: 'Danh mục', icon: 'photo' },
    { id: 'languages', label: 'Ngôn ngữ', icon: 'listen' },
    { id: 'monitor', label: 'Giám sát hệ thống', icon: 'eye', adminOnly: true },
    { id: 'users', label: 'Quản lý tài khoản', icon: 'user', adminOnly: true }
  ];

  return (
    <div className="admin-app">
      {/* Thanh điều hướng đầu trang (Top Navigation Bar) */}
      <header className="topbar">
        <div className="topbar-left">
          <a className="brand" href="/" title="Trang chủ Vinlook">
            vinlook<span>.</span>
          </a>
          <span className="brand-badge">Không gian điều hành</span>
        </div>

        <nav className="tabs" aria-label="Các phân hệ quản trị">
          {navItems
            .filter((item) => !item.adminOnly || user.role === 'admin')
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={currentView === item.id ? 'active' : ''}
                onClick={() => onViewChange(item.id)}
                aria-current={currentView === item.id ? 'page' : undefined}
              >
                <Icon kind={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
        </nav>

        <div className="topbar-right">
          <div className="user-badge" title={`Đăng nhập dưới quyền ${user.role}`}>
            <span className={`user-role-pill ${user.role}`}>{user.role.toUpperCase()}</span>
            <span className="user-name">{user.username}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
            disabled={loggingOut}
            title="Đăng xuất khỏi hệ thống"
          >
            {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}
          </button>
        </div>
      </header>

      {/* Thông báo dạng Toast nổi */}
      {toast && (
        <div className="toast-banner" role="status">
          <span>{toast}</span>
          {onClearToast && (
            <button type="button" onClick={onClearToast} aria-label="Đóng thông báo">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Khu vực nội dung chính (Main Content Area) */}
      <main ref={mainRef} className="main-content">
        {children}
      </main>

      {/* Chân trang (Footer) */}
      <footer className="admin-footer">
        <div>
          <span>© 2026 Vinlook Tourism Platform. Đồ án Công nghệ Phần mềm.</span>
        </div>
        <div className="footer-links">
          <button type="button" className="link-button" onClick={backToTop}>
            ↑ Lên đầu trang
          </button>
          <a
            href={import.meta.env.VITE_PUBLIC_WEB_URL || (import.meta.env.PROD ? '/' : 'http://127.0.0.1:5173/')}
            target="_blank"
            rel="noreferrer"
          >
            Mở bản đồ du khách ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

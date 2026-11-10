/**
 * @file AdminLayout.tsx
 * @description Khung bố cục chuẩn (.admin-layout) của trang Quản trị (Admin Web).
 * Bao gồm thanh bên (sidebar), thanh trạng thái trên cùng (topbar), tiêu đề trang (page-heading),
 * khu vực nội dung chính, chân trang và nút cuộn nhanh về đầu trang.
 */

import React, { useLayoutEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import type { User } from '../types';

export type AdminViewTab = 'overview' | 'pois' | 'monitor' | 'users';

interface AdminLayoutProps {
  user: Pick<User, 'id' | 'username' | 'role'>;
  current_view: AdminViewTab;
  has_stats: boolean;
  logging_out: boolean;
  toast: string;
  on_view_change: (view: AdminViewTab) => void;
  on_logout: () => void;
  on_create_poi: () => void;
  children: React.ReactNode;
}

export function AdminLayout({
  user,
  current_view,
  has_stats,
  logging_out,
  toast,
  on_view_change,
  on_logout,
  on_create_poi,
  children
}: AdminLayoutProps) {
  const main_ref = useRef<HTMLElement>(null);

  // Tự động cuộn về đầu trang mỗi khi chuyển phân hệ
  useLayoutEffect(() => {
    main_ref.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [current_view]);

  function back_to_top() {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    main_ref.current?.scrollTo({ top: 0, left: 0, behavior });
    window.scrollTo({ top: 0, left: 0, behavior });
  }

  const account_badge = (
    <div className="admin-badge">
      <span className="account-avatar">
        <Icon kind="user" />
      </span>
      <div className="account-greeting">
        <strong>Xin chào, {user.username}</strong>
        <small>Quyền hạn: {user.role === 'admin' ? 'Admin' : 'Staff'}</small>
      </div>
      <button onClick={on_logout} disabled={logging_out}>
        {logging_out ? 'Đang thoát…' : 'Đăng xuất'}
      </button>
    </div>
  );

  const breadcrumb_label =
    current_view === 'users'
      ? 'Quản lý tài khoản'
      : current_view === 'overview'
      ? 'Tổng quan'
      : current_view === 'monitor'
      ? 'Giám sát hệ thống'
      : 'Địa điểm';

  const heading_title =
    current_view === 'users'
      ? 'Quản lý tài khoản'
      : current_view === 'overview'
      ? 'Tổng quan'
      : current_view === 'monitor'
      ? 'Giám sát hệ thống'
      : 'Quản lý địa điểm';

  const heading_description =
    current_view === 'users'
      ? 'Tạo tài khoản, phân quyền và quản lý quyền truy cập dashboard.'
      : current_view === 'overview'
      ? 'Một góc nhìn toàn cảnh về những điểm đến bạn đang xây dựng.'
      : current_view === 'monitor'
      ? 'Theo dõi nhật ký hệ thống, sự kiện sử dụng và trạng thái các dịch vụ.'
      : 'Biên tập câu chuyện, hình ảnh và thông tin của từng điểm đến.';

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <a className="brand" href={import.meta.env.BASE_URL}>
          vinlook<span>.</span>
          <small>Dashboard</small>
        </a>
        <div className="mobile-account">{account_badge}</div>
        <div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div>
        <nav aria-label="Điều hướng quản trị">
          <button
            className={current_view === 'overview' ? 'active' : ''}
            aria-current={current_view === 'overview' ? 'page' : undefined}
            onClick={() => on_view_change('overview')}
          >
            <Icon kind="grid" />
            Tổng quan
          </button>
          <button
            className={current_view === 'pois' ? 'active' : ''}
            aria-current={current_view === 'pois' ? 'page' : undefined}
            onClick={() => on_view_change('pois')}
          >
            <Icon kind="pin" />
            Quản lý địa điểm
          </button>
          {user.role === 'admin' && (
            <>
              <button
                className={current_view === 'users' ? 'active' : ''}
                aria-current={current_view === 'users' ? 'page' : undefined}
                onClick={() => on_view_change('users')}
              >
                <Icon kind="user" />
                Quản lý tài khoản
              </button>
              <button
                className={current_view === 'monitor' ? 'active' : ''}
                aria-current={current_view === 'monitor' ? 'page' : undefined}
                onClick={() => on_view_change('monitor')}
              >
                <Icon kind="eye" />
                Giám sát hệ thống
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className={has_stats ? 'connection online' : 'connection'} />
          {has_stats ? 'Hệ thống sẵn sàng' : 'Đang tải thông tin'}
          <small>Không gian điều hành Vinlook</small>
        </div>
      </aside>

      <main ref={main_ref}>
        <div className="topbar">
          <span className="breadcrumb">
            Quản trị <span className="slash">/</span> {breadcrumb_label}
          </span>
          <div className="desktop-account">{account_badge}</div>
        </div>

        <header className="page-heading">
          <div>
            <span className="eyebrow">KHÁM PHÁ BẮT ĐẦU TỪ NỘI DUNG</span>
            <h1>{heading_title}</h1>
            <p>{heading_description}</p>
          </div>
          <div className="heading-actions">
            {current_view === 'overview' && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                title="Tải lại trang và cập nhật toàn bộ dữ liệu"
              >
                ↻ Tải lại trang
              </button>
            )}
            <a
              href={import.meta.env.VITE_PUBLIC_WEB_URL || (import.meta.env.PROD ? '/' : 'http://127.0.0.1:5173/')}
              target="_blank"
              rel="noreferrer"
            >
              Xem bản đồ ↗
            </a>
            {(current_view === 'overview' || current_view === 'pois') && (
              <button className="primary" onClick={on_create_poi}>
                ＋ Thêm địa điểm
              </button>
            )}
          </div>
        </header>

        {toast && (
          <div className="success-banner" role="status">
            ✓ {toast}
          </div>
        )}

        {children}

        <div className="page-footer">
          VINLOOK <span>Những câu chuyện làm nên hành trình.</span>
        </div>
      </main>

      <button
        type="button"
        className="back-to-top"
        onClick={back_to_top}
        aria-label="Về đầu trang"
        title="Về đầu trang"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20V6M5 13l7-7 7 7M5 3h14" />
        </svg>
      </button>
    </div>
  );
}

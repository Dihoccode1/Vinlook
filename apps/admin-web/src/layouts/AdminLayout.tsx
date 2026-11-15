import { Button } from '@vinlook/ui/button';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconKind } from '../components/Icon';
export type AdminViewTab = 'overview' | 'pois' | 'monitor' | 'users' | 'categories' | 'languages';
interface AdminLayoutProps {
  user: { id: string; username: string; role: 'admin' | 'staff' };
  currentView: AdminViewTab;
  onViewChange: (view: AdminViewTab) => void;
  onLogout: () => void;
  on_change_password: () => void;
  loggingOut?: boolean;
  toast?: string;
  onClearToast?: () => void;
  children: ReactNode;
  onCreatePoi: () => void;
  onRefresh: () => void;
}
const pages: Record<AdminViewTab, { title: string; description: string }> = {
  overview: {
    title: 'Tổng quan',
    description: 'Một góc nhìn trọn vẹn về những điểm đến và hành trình của du khách.',
  },
  pois: {
    title: 'Quản lý địa điểm',
    description: 'Chăm chút từng điểm đến, từ thông tin, hình ảnh đến câu chuyện.',
  },
  users: {
    title: 'Quản lý tài khoản',
    description: 'Quản lý thành viên và quyền truy cập trong không gian của bạn.',
  },
  monitor: {
    title: 'Giám sát hệ thống',
    description: 'Theo dõi hoạt động và tình trạng các dịch vụ theo thời gian thực.',
  },
  categories: {
    title: 'Danh mục địa điểm',
    description: 'Sắp xếp những điểm đến theo từng trải nghiệm khám phá.',
  },
  languages: {
    title: 'Ngôn ngữ',
    description: 'Kết nối những câu chuyện địa phương với du khách khắp thế giới.',
  },
};
const nav_items: { id: AdminViewTab; label: string; icon: IconKind; adminOnly?: boolean }[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'pois', label: 'Quản lý địa điểm', icon: 'pin' },
  { id: 'users', label: 'Quản lý tài khoản', icon: 'user', adminOnly: true },
  { id: 'monitor', label: 'Giám sát hệ thống', icon: 'eye', adminOnly: true },
];
export function AdminLayout({
  user,
  currentView,
  onViewChange,
  onLogout,
  on_change_password,
  loggingOut = false,
  toast,
  onClearToast,
  children,
  onCreatePoi,
  onRefresh,
}: AdminLayoutProps) {
  const main_ref = useRef<HTMLElement>(null);
  function reset_scroll(behavior: ScrollBehavior = 'instant') {
    main_ref.current?.scrollTo({ top: 0, left: 0, behavior });
    window.scrollTo({ top: 0, left: 0, behavior });
  }
  useLayoutEffect(() => {
    reset_scroll();
  }, [currentView]);
  const page = pages[currentView];
  const map_url =
    import.meta.env.VITE_PUBLIC_WEB_URL || (import.meta.env.PROD ? '/' : 'http://127.0.0.1:5173/');
  const account = (
    <>
      <span className="workspace-avatar h-[35px] w-[35px] rounded-[50%] bg-[#eaf0e3] text-[#47704b] shrink-0">
        <Icon kind="user" size={19} />
      </span>
      <div className="workspace-greeting grid gap-[4px] min-w-0">
        <strong>Xin chào, {user.username}</strong>
        <span>Quyền hạn: {user.role === 'admin' ? 'Admin' : 'Staff'}</span>
      </div>
      <div className="workspace-account-actions flex items-center gap-[6px] shrink-0">
        <Button
          variant="custom"
          type="button"
          className="workspace-password-button"
          aria-label="Đổi mật khẩu"
          title="Đổi mật khẩu"
          onClick={on_change_password}
          disabled={loggingOut}
        >
          <Icon kind="key" size={16} />
          <span>Đổi mật khẩu</span>
        </Button>
        <Button
          variant="custom"
          type="button"
          className="workspace-logout"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Đang thoát…' : 'Đăng xuất'}
        </Button>
      </div>
    </>
  );
  return (
    <div className="admin-app grid grid-cols-[246px_minmax(0,_1fr)] bg-[var(--canvas)] text-[14px] [@media(max-width:_1150px)]:grid-cols-[218px_minmax(0,_1fr)] [@media(max-width:_760px)]:grid-cols-[1fr] [@media(max-width:_760px)]:grid-rows-[auto_minmax(0,_1fr)]">
      <aside className="workspace-sidebar flex flex-col min-w-0 min-h-0 bg-vinlook-sidebar text-[#c4d2c7] overflow-y-auto [@media(max-width:_760px)]:overflow-visible [@media(max-width:_760px)]:z-[40] [@media(max-width:_760px)]:shadow-[0_3px_12px_#12342112]">
        <div className="workspace-brand-row [@media(max-width:_760px)]:flex [@media(max-width:_760px)]:justify-between [@media(max-width:_760px)]:items-center [@media(max-width:_760px)]:gap-[12px]">
          <a
            className="workspace-brand flex gap-[11px] items-center text-white text-[30px] font-bold tracking-[-1.3px] leading-[1] [@media(max-width:_1150px)]:text-[28px] [@media(max-width:_760px)]:text-[26px] [@media(max-width:_760px)]:gap-[0] [@media(max-width:_380px)]:text-[24px]"
            href={import.meta.env.BASE_URL}
            aria-label="Vinlook Dashboard"
          >
            <span className="workspace-brand-mark w-[39px] h-[42px] text-[32px] font-semibold bg-[#ffffff0b]">
              v
            </span>
            <span>
              vinlook<i>.</i>
              <small>ĐI ĐỂ HIỂU THÊM</small>
            </span>
          </a>
          <div className="workspace-mobile-account hidden items-center gap-[10px] [@media(max-width:_760px)]:flex [@media(max-width:_760px)]:gap-[7px]">
            {account}
          </div>
        </div>
        <span className="workspace-nav-caption text-[9px] tracking-[1.6px] text-[#94aa9b] [@media(max-width:_760px)]:hidden">
          KHÔNG GIAN LÀM VIỆC
        </span>
        <nav
          className="workspace-nav flex flex-col gap-[7px] [@media(max-width:_760px)]:grid [@media(max-width:_760px)]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_760px)]:gap-[5px]"
          aria-label="Điều hướng quản trị"
        >
          {nav_items
            .filter((item) => !item.adminOnly || user.role === 'admin')
            .map((item) => (
              <Button
                variant="custom"
                type="submit"
                key={item.id}
                className={currentView === item.id ? 'active' : ''}
                aria-current={currentView === item.id ? 'page' : undefined}
                onClick={() => {
                  reset_scroll();
                  onViewChange(item.id);
                }}
              >
                <Icon kind={item.icon} size={19} />
                <span>{item.label}</span>
                {currentView === item.id && (
                  <i className="nav-active-dot h-[5px] w-[5px] rounded-[50%] bg-[#577b49] ml-[auto] shrink-0 [@media(max-width:_760px)]:hidden" />
                )}
              </Button>
            ))}
        </nav>
        <div className="workspace-sidebar-bottom mt-[auto] [@media(max-width:_760px)]:hidden">
          <a href={map_url} target="_blank" rel="noreferrer">
            <Icon kind="pin" size={18} />
            <span>Mở bản đồ du khách</span>
            <span aria-hidden="true">↗</span>
          </a>
          <p>
            Mỗi nơi đến,
            <br />
            <strong>một câu chuyện.</strong>
          </p>
          <small>VINLOOK · DASHBOARD</small>
        </div>
      </aside>
      <div className="workspace-shell flex flex-col min-w-0 min-h-0">
        <header className="workspace-topbar h-[83px] shrink-0 flex justify-between items-center bg-[#fcfdfb] gap-[18px] [@media(max-width:_760px)]:hidden">
          <div className="workspace-breadcrumb text-[11px] text-[#8a958b] flex items-center gap-[14px] [@media(max-width:_940px)]:text-[10px]">
            Không gian quản trị <span>/</span>
            <strong>{page.title}</strong>
          </div>
          <div className="workspace-account flex items-center gap-[10px]">{account}</div>
        </header>
        <main
          ref={main_ref}
          className="main-content min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex-[1]"
          id="admin-main"
        >
          <div className="workspace-page-heading flex items-center justify-between gap-[22px] mb-[27px] [@media(min-width:_1500px)]:mb-[33px] [@media(max-width:_1150px)]:items-start [@media(max-width:_940px)]:flex-wrap [@media(max-width:_760px)]:gap-[15px] [@media(max-width:_760px)]:mb-[22px]">
            <div>
              <span className="eyebrow">VINLOOK / KHÔNG GIAN QUẢN TRỊ</span>
              <h1>{page.title}</h1>
              <p>{page.description}</p>
            </div>
            <div className="workspace-page-actions flex items-center gap-[10px] shrink-0 [@media(max-width:_1150px)]:flex-wrap [@media(max-width:_760px)]:gap-[8px] [@media(max-width:_760px)]:w-full">
              {currentView === 'overview' && (
                <Button
                  variant="custom"
                  type="submit"
                  onClick={onRefresh}
                  aria-label="Làm mới tổng quan"
                >
                  <Icon kind="refresh" size={16} />
                  <span>Làm mới</span>
                </Button>
              )}
              {(currentView === 'overview' || currentView === 'pois') && (
                <Button variant="custom" type="submit" className="primary" onClick={onCreatePoi}>
                  <Icon kind="plus" size={17} />
                  Thêm địa điểm
                </Button>
              )}
            </div>
          </div>
          {toast && (
            <div
              className="workspace-toast flex gap-[10px] items-center bg-[#edf4e7] py-[13px] px-[17px] mb-[20px] text-[12px] text-[#5b8050] [@media(max-width:_760px)]:text-[11px] [@media(max-width:_760px)]:p-[12px]"
              role="status"
            >
              <Icon kind="check" size={18} />
              <span>{toast}</span>
              <Button
                variant="custom"
                type="submit"
                onClick={onClearToast}
                aria-label="Đóng thông báo"
              >
                <Icon kind="close" size={16} />
              </Button>
            </div>
          )}
          {children}
          <footer className="workspace-footer flex items-center justify-between gap-[20px] text-[#99a68f]">
            <span>
              vinlook<span className="brand-dot text-[#c69258]">.</span>
            </span>
            <small>Những câu chuyện làm nên hành trình.</small>
          </footer>
        </main>
      </div>
      <Button
        variant="custom"
        type="button"
        className="workspace-back-top fixed right-[23px] bottom-[22px] z-[30] grid h-[48px] w-[48px] p-[0] text-white shadow-[0_0_0_1px_#809d8a,\n______0_4px_12px_#193f3329] [@media(max-width:_760px)]:right-[calc(16px_+_env(safe-area-inset-right,_0px))] [@media(max-width:_760px)]:bottom-[calc(16px_+_env(safe-area-inset-bottom,_0px))] [@media(max-width:_760px)]:h-[44px] [@media(max-width:_760px)]:w-[44px]"
        aria-label="Về đầu trang"
        title="Về đầu trang"
        onClick={() =>
          reset_scroll(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          )
        }
      >
        <Icon kind="arrow-up" size={22} />
      </Button>
    </div>
  );
}

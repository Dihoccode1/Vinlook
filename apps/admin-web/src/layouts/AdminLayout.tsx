import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Alert } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { cn } from '@vinlook/ui/utils';
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
  function render_account(surface: 'desktop' | 'mobile') {
    const mobile = surface === 'mobile';
    return (
      <>
        {!mobile && (
          <span className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-full bg-[#eaf0e3] text-[#47704b]">
            <Icon kind="user" size={19} />
          </span>
        )}
        <div className="grid min-w-0 gap-0.5">
          <strong
            className={cn(
              'text-[11px] font-semibold [overflow-wrap:anywhere] md:text-xs',
              mobile ? 'text-[10px] text-[#e7efdf]' : 'text-foreground',
            )}
          >
            Xin chào, {user.username}
          </strong>
          <span
            className={cn(
              'text-[10px] md:text-[11px]',
              mobile ? 'text-[9px] text-[#a9bfa7]' : 'text-muted-foreground',
            )}
          >
            Quyền hạn: {user.role === 'admin' ? 'Admin' : 'Staff'}
          </span>
        </div>
        <div className={cn('flex shrink-0 items-center gap-1.5', !mobile && 'ms-1.5')}>
          <Button
            type="button"
            variant="outline"
            size={mobile ? 'icon' : 'xs'}
            aria-label="Đổi mật khẩu"
            title="Đổi mật khẩu"
            onClick={on_change_password}
            disabled={loggingOut}
            className={cn(
              mobile
                ? 'h-9 w-9 rounded-lg border-white/15 bg-white/8 text-[#e4eddf] hover:bg-white/15 hover:text-white'
                : 'h-9 rounded-lg border-[#d5e2cf] bg-[#edf4e9] px-3 text-[11px] font-semibold text-[#254c38] hover:bg-[#e3eedf]',
            )}
          >
            <Icon kind="key" size={16} />
            {!mobile && <span>Đổi mật khẩu</span>}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onLogout}
            disabled={loggingOut}
            className={cn(
              mobile
                ? 'h-9 rounded-lg border-white/15 bg-white/5 px-2.5 text-[10px] text-[#e4eddf] hover:bg-white/15 hover:text-white'
                : 'h-9 rounded-lg border-[#dce4d7] bg-white px-3 text-[11px] text-[#566c53] hover:bg-[#f5f7f3]',
            )}
          >
            {loggingOut ? 'Đang thoát…' : 'Đăng xuất'}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] bg-[#f5f7f3] text-foreground md:grid-cols-[248px_minmax(0,1fr)] md:grid-rows-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="z-40 flex flex-col bg-[#164436] px-4 py-3.5 text-[#c1d4c4] shadow-[0_3px_12px_#12342112] md:sticky md:top-0 md:h-dvh md:px-4 md:py-7 md:shadow-none">
        <div className="mb-3.5 flex items-center justify-between gap-3 md:mb-0 md:px-2">
          <a
            className="flex items-center gap-3 text-white no-underline"
            href={import.meta.env.BASE_URL}
            aria-label="Vinlook Dashboard"
          >
            <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/12 text-lg font-bold text-white md:grid">
              v
            </span>
            <span className="text-[26px] leading-none font-bold tracking-[-1.2px] text-white md:text-[30px]">
              vinlook<i className="not-italic text-[#e6a05c]">.</i>
              <small className="mt-1.5 hidden text-[9.5px] font-medium tracking-[1.8px] text-[#a4bfa8] uppercase md:block">
                ĐI ĐỂ HIỂU THÊM
              </small>
            </span>
          </a>
          <div className="flex items-center gap-2 md:hidden">{render_account('mobile')}</div>
        </div>
        <span className="mt-9 mb-3 hidden px-2.5 text-[10px] font-semibold tracking-[1.5px] text-[#7e9d88] uppercase md:block">
          KHÔNG GIAN LÀM VIỆC
        </span>
        <nav
          className="grid grid-cols-3 gap-1.5 md:grid-cols-1 md:gap-1.5"
          aria-label="Điều hướng quản trị"
        >
          {nav_items
            .filter((item) => !item.adminOnly || user.role === 'admin')
            .map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    reset_scroll();
                    onViewChange(item.id);
                  }}
                  className={cn(
                    'flex min-h-[35px] cursor-pointer items-center justify-start gap-2 rounded-[7px] px-2.5 py-2 text-left text-[10px] leading-tight font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:min-h-[42px] md:gap-3 md:rounded-[10px] md:px-3 md:py-2.5 md:text-[13px]',
                    active
                      ? 'bg-[#eaf0e2] font-semibold text-[#214d39]'
                      : 'bg-transparent text-[#c1d4c4] hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon
                    kind={item.icon}
                    className="h-[15px] w-[15px] shrink-0 md:h-[19px] md:w-[19px]"
                  />
                  <span>{item.label}</span>
                  {active && (
                    <i className="ml-auto hidden h-1.5 w-1.5 shrink-0 rounded-full bg-[#3f7a53] md:block" />
                  )}
                </button>
              );
            })}
        </nav>
        <div className="mt-auto hidden flex-col border-t border-white/10 px-2 pt-4 text-xs text-[#a3bda9] md:flex">
          <a
            href={map_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 py-2 text-[#c1d4c4] no-underline transition-colors hover:text-white"
          >
            <Icon kind="pin" size={18} />
            <span>Mở bản đồ du khách</span>
            <span aria-hidden="true" className="ml-auto">
              ↗
            </span>
          </a>
          <p className="mt-5 mb-2 text-[15px] leading-snug text-[#d9e5d7]">
            Mỗi nơi đến,
            <br />
            <strong className="font-semibold text-white">một câu chuyện.</strong>
          </p>
          <small className="text-[10px] tracking-[1.5px] text-[#789984] uppercase">
            VINLOOK · DASHBOARD
          </small>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="hidden h-[78px] shrink-0 items-center justify-between gap-4 border-b border-[#e2e8dc] bg-[#fcfdfb] px-9 md:flex">
          <div className="flex items-center gap-3 text-xs text-[#8a958b]">
            Không gian quản trị <span className="text-base text-[#c0cab9]">/</span>
            <strong className="font-medium text-[#52654f]">{page.title}</strong>
          </div>
          <div className="flex items-center gap-2.5">{render_account('desktop')}</div>
        </header>
        <main
          ref={main_ref}
          id="admin-main"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6 pb-0 [scrollbar-color:#c5d1bf_transparent] [scrollbar-width:thin] md:px-9 md:pt-8"
        >
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <span className="block text-[9px] font-semibold tracking-[1.7px] text-[#8b9a7c] uppercase">
                VINLOOK / KHÔNG GIAN QUẢN TRỊ
              </span>
              <h1 className="mt-2 mb-2 text-[26px] leading-[1.25] font-semibold tracking-[-0.8px] text-[#263f33] md:text-[30px]">
                {page.title}
              </h1>
              <p className="m-0 max-w-[590px] text-xs leading-[1.75] text-[#85917d] md:text-[13px]">
                {page.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {currentView === 'overview' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRefresh}
                  aria-label="Làm mới tổng quan"
                  className="h-9 rounded-lg border-[#dce3d6] bg-white px-3.5 text-[11px] font-medium text-[#61735a]"
                >
                  <Icon kind="refresh" size={16} />
                  <span>Làm mới</span>
                </Button>
              )}
              {(currentView === 'overview' || currentView === 'pois') && (
                <Button
                  type="button"
                  onClick={onCreatePoi}
                  className="h-9 rounded-lg px-3.5 text-[11px] font-medium shadow-[0_3px_5px_#153f3208]"
                >
                  <Icon kind="plus" size={17} />
                  Thêm địa điểm
                </Button>
              )}
            </div>
          </div>
          {toast && (
            <Alert
              variant="success"
              role="status"
              className="mb-5 flex items-center gap-2.5 rounded-[9px] border-[#dce8cf] bg-[#edf4e7] px-4 py-3 text-xs text-[#5b8050]"
            >
              <Icon kind="check" size={18} className="shrink-0" />
              <span className="flex-1">{toast}</span>
              <button
                type="button"
                onClick={onClearToast}
                aria-label="Đóng thông báo"
                className="cursor-pointer border-0 bg-transparent p-0 text-inherit hover:opacity-75"
              >
                <Icon kind="close" size={16} />
              </button>
            </Alert>
          )}
          {children}
          <footer className="flex flex-wrap items-center justify-between gap-4 py-6 text-[#99a68f]">
            <span className="text-base font-semibold tracking-[-0.6px]">
              vinlook<span className="text-[#c69258]">.</span>
            </span>
            <small className="text-[10px]">Những câu chuyện làm nên hành trình.</small>
          </footer>
        </main>
      </div>
      <Button
        type="button"
        variant="default"
        size="icon"
        className="fixed right-5 bottom-5 z-30 h-12 w-12 rounded-full border-2 border-[#f5f7f3] bg-primary text-white shadow-[0_0_0_1px_#809d8a,0_4px_12px_#193f3329] hover:bg-[#28644d]"
        aria-label="Về đầu trang"
        title="Về đầu trang"
        onClick={() =>
          reset_scroll(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          )
        }
      >
        <Icon kind="arrow-up" size={22} className="[stroke-width:2]" />
      </Button>
    </div>
  );
}

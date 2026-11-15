import { Badge } from '@vinlook/ui/badge';
import { Button } from '@vinlook/ui/button';
import { Card } from '@vinlook/ui/card';
import { cn } from '@vinlook/ui/utils';
import { Input } from '@vinlook/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';
import { Icon } from '../../components/Icon';
import type { useUserManagement } from './useUserManagement';
type Props = Pick<
  ReturnType<typeof useUserManagement>,
  | 'current_user_id'
  | 'users'
  | 'loading'
  | 'set_error'
  | 'set_notice'
  | 'busy'
  | 'set_refresh'
  | 'query'
  | 'set_query'
  | 'changing_id'
  | 'set_pending_status'
  | 'set_password_target'
  | 'edit'
  | 'filtered'
  | 'can_edit'
  | 'is_root_account'
>;
export function UserTable({
  current_user_id,
  users,
  loading,
  set_error,
  set_notice,
  busy,
  set_refresh,
  query,
  set_query,
  changing_id,
  set_pending_status,
  set_password_target,
  edit,
  filtered,
  can_edit,
  is_root_account,
}: Props) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-[21px]">
        <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
          Danh sách tài khoản ({users.length})
        </h2>
        <Button
          type="button"
          disabled={busy}
          onClick={() => edit(null)}
          className="h-9 rounded-lg px-3.5 text-xs font-medium"
        >
          + Tạo tài khoản
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 px-[22px] pb-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            kind="search"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9aa893]"
          />
          <Input
            type="search"
            aria-label="Tìm tài khoản"
            placeholder="Tìm tài khoản hoặc họ tên..."
            value={query}
            onChange={(e) => set_query(e.target.value)}
            className="h-10 rounded-[10px] border-[#dce3d6] bg-[#fcfdf9] pl-9 text-xs md:text-[13px]"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading || busy}
          onClick={() => set_refresh((v) => v + 1)}
          className="h-10 rounded-lg border-[#dce3d6] bg-white px-4 text-xs font-medium text-[#61735a]"
        >
          Làm mới
        </Button>
      </div>

      <div aria-busy={loading} className="px-4 pb-4 md:px-0 md:pb-0">
        <Table className="w-full text-xs">
          <TableHeader className="sr-only md:not-sr-only md:bg-[#fbfcf9]">
            <TableRow className="border-[#edf1e7] hover:bg-transparent">
              <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
                Tài khoản / Họ tên
              </TableHead>
              <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
                Quyền hạn
              </TableHead>
              <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
                Trạng thái
              </TableHead>
              <TableHead className="px-[22px] py-3 text-center text-[11px] font-medium text-[#7e8b75]">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const locked_self_or_root =
                u.username.toLowerCase() === 'admin' && u.status === 'active';
              return (
                <TableRow
                  key={u.id}
                  className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-[#e2e8dc] bg-white p-4 hover:bg-white md:mb-0 md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-[#edf1e7] md:p-0 md:hover:bg-[#fafcf8]"
                >
                  <TableCell className="col-span-2 p-0 md:table-cell md:px-[22px] md:py-4">
                    <strong className="block text-[13px] font-semibold text-foreground">
                      {u.username}
                      {u.id === current_user_id ? ' (Bạn)' : ''}
                    </strong>
                    {u.full_name !== u.username && (
                      <div className="mt-0.5 text-[11px] text-[#6d7e6a]">{u.full_name}</div>
                    )}
                  </TableCell>
                  <TableCell className="flex flex-col items-start gap-1 p-0 md:table-cell md:px-4 md:py-4">
                    <span className="text-[10px] font-medium text-[#7e8b75] md:hidden">
                      Quyền hạn
                    </span>
                    <Badge
                      variant={
                        is_root_account(u) ? 'default' : u.role === 'admin' ? 'info' : 'muted'
                      }
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-medium',
                        is_root_account(u)
                          ? 'bg-[#edf3e6] text-[#2d473a]'
                          : u.role === 'admin'
                            ? 'bg-[#edf4f8] text-[#356377]'
                            : 'bg-[#f4f6ef] text-[#5e6e58]',
                      )}
                    >
                      {is_root_account(u) ? 'Root' : u.role === 'admin' ? 'Admin' : 'Staff'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex flex-col items-start gap-1 p-0 md:table-cell md:px-4 md:py-4">
                    <span className="text-[10px] font-medium text-[#7e8b75] md:hidden">
                      Trạng thái
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] font-medium',
                        u.status === 'active' ? 'text-[#487650]' : 'text-[#9d5a3b]',
                      )}
                    >
                      <i
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          u.status === 'active' ? 'bg-[#4f8459]' : 'bg-[#c57252]',
                        )}
                      />
                      {u.status === 'active'
                        ? 'Hoạt động'
                        : u.login_locked
                          ? 'Đã khóa · Sai mật khẩu 15 lần'
                          : 'Đã khóa'}
                    </span>
                  </TableCell>
                  <TableCell className="col-span-2 p-0 md:table-cell md:px-[22px] md:py-4">
                    <div className="mx-auto grid w-full max-w-[280px] grid-cols-3 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="h-8 rounded-lg border-[#dce3d6] px-1.5 text-[10px] font-medium text-[#3d5642]"
                        disabled={busy || !can_edit(u)}
                        title={
                          !can_edit(u) ? 'Không được chỉnh sửa tài khoản Admin khác' : undefined
                        }
                        onClick={() => edit(u)}
                      >
                        Chỉnh sửa
                      </Button>
                      {can_edit(u) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          className="h-8 rounded-lg border-[#dce3d6] px-1.5 text-[10px] font-medium text-[#3d5642]"
                          disabled={busy}
                          aria-label={`Đổi mật khẩu cho ${u.username}`}
                          onClick={() => set_password_target(u)}
                        >
                          Đổi mật khẩu
                        </Button>
                      )}
                      {!locked_self_or_root && (
                        <Button
                          type="button"
                          variant={u.status === 'active' ? 'destructiveSoft' : 'successSoft'}
                          size="xs"
                          className="h-8 rounded-lg px-1.5 text-[10px] font-medium"
                          disabled={busy}
                          aria-label={`${u.status === 'active' ? 'Khóa' : 'Mở khóa'} tài khoản ${u.username}`}
                          onClick={() => {
                            set_error('');
                            set_notice('');
                            set_pending_status(u);
                          }}
                        >
                          {changing_id === u.id
                            ? 'Đang xử lý...'
                            : u.status === 'active'
                              ? 'Khóa'
                              : 'Mở khóa'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {loading ? (
          <p className="px-4 py-8 text-center text-xs text-[#85917d]">
            Đang tải danh sách tài khoản...
          </p>
        ) : !filtered.length ? (
          <p className="px-4 py-8 text-center text-xs text-[#85917d]">
            Không tìm thấy tài khoản phù hợp.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

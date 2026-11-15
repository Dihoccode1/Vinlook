import { Table } from '@vinlook/ui/table';
import { Input } from '@vinlook/ui/input';
import { Button } from '@vinlook/ui/button';
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
    <>
      <section className="panel overflow-hidden">
        <div className="panel-title justify-between">
          <h2>Danh sách tài khoản ({users.length})</h2>
          <Button
            variant="custom"
            type="submit"
            className="primary"
            disabled={busy}
            onClick={() => edit(null)}
          >
            + Tạo tài khoản
          </Button>
        </div>

        <div className="filters flex items-center [@media(max-width:_760px)]:min-w-0">
          <label className="search flex items-center gap-[8px] flex-[1] text-[#93a383]">
            <Input
              appearance="custom"
              type="search"
              aria-label="Tìm tài khoản"
              placeholder="Tìm tài khoản hoặc họ tên..."
              value={query}
              onChange={(e) => set_query(e.target.value)}
            />
          </label>
          <Button
            variant="custom"
            type="submit"
            disabled={loading || busy}
            onClick={() => set_refresh((v) => v + 1)}
          >
            Làm mới
          </Button>
        </div>

        <div className="table-wrap" aria-busy={loading}>
          <Table>
            <thead>
              <tr>
                <th>Tài khoản / Họ tên</th>
                <th>Quyền hạn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>
                      {u.username}
                      {u.id === current_user_id ? ' (Bạn)' : ''}
                    </strong>
                    {u.full_name !== u.username && <div>{u.full_name}</div>}
                  </td>
                  <td data-label="Quyền hạn">
                    <span className={`role-badge ${u.role}`}>
                      {is_root_account(u) ? 'Root' : u.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </td>
                  <td data-label="Trạng thái">
                    <span
                      className={`publish-status [@media(max-width:_760px)]:max-w-[100%] ${u.status === 'active' ? 'published' : ''}`}
                    >
                      {u.status === 'active'
                        ? 'Hoạt động'
                        : u.login_locked
                          ? 'Đã khóa · Sai mật khẩu 15 lần'
                          : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className="account-actions">
                      <Button
                        variant="custom"
                        type="submit"
                        className="account-edit"
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
                          variant="custom"
                          className="account-password"
                          type="button"
                          disabled={busy}
                          aria-label={`Đổi mật khẩu cho ${u.username}`}
                          onClick={() => set_password_target(u)}
                        >
                          Đổi mật khẩu
                        </Button>
                      )}
                      {!(u.username.toLowerCase() === 'admin' && u.status === 'active') && (
                        <Button
                          variant="custom"
                          type="submit"
                          className={u.status === 'active' ? 'account-lock' : 'account-unlock'}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {loading ? (
            <p className="empty-state p-[25px] text-center text-[#8c9a7f]">
              Đang tải danh sách tài khoản...
            </p>
          ) : !filtered.length ? (
            <p className="empty-state p-[25px] text-center text-[#8c9a7f]">
              Không tìm thấy tài khoản phù hợp.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

import { Table } from '@vinlook/ui/table';
import type { useMonitorDashboard } from './useMonitorDashboard';
type Props = Pick<ReturnType<typeof useMonitorDashboard>, 'journal' | 'journal_error'>;
export function MonitorJournalPanels({ journal, journal_error }: Props) {
  return (
    <>
      {/* Nhật ký hệ thống & Nhật ký sự kiện */}
      {(
        [
          ['system', 'Nhật ký hệ thống'],
          ['usage', 'Sự kiện sử dụng & yêu cầu'],
        ] as const
      ).map(([key, title]) => (
        <section className="panel overflow-hidden" key={key}>
          <div className="panel-title justify-between">
            <div>
              <h2>{title}</h2>
              <p>
                {key === 'system'
                  ? 'Khởi động Gateway, thao tác quản trị và các lỗi API được ghi nhận.'
                  : 'Các yêu cầu xem điểm đến, dịch kịch bản, nghe thuyết minh và tìm đường đi.'}
              </p>
            </div>
          </div>

          {!journal ? (
            <p className="empty-state p-[25px] text-center text-[#8c9a7f]" role="status">
              {journal_error ? 'Chưa có dữ liệu để hiển thị.' : 'Đang tải dữ liệu...'}
            </p>
          ) : journal[key].length === 0 ? (
            <p className="empty-state p-[25px] text-center text-[#8c9a7f]">
              Chưa ghi nhận {key === 'system' ? 'nhật ký' : 'sự kiện nào'}.
            </p>
          ) : (
            <div className="table-wrap">
              <Table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Nội dung sự kiện</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {journal[key].map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.time).toLocaleString('vi-VN')}</td>
                      <td data-label="Nội dung">{entry.message}</td>
                      <td data-label="Kết quả">
                        <span
                          className={`monitor-status inline-block rounded-[20px] font-semibold [@media(max-width:_760px)]:max-w-[100%] ${entry.level === 'error' ? 'unreachable' : 'healthy'}`}
                        >
                          {entry.status === null
                            ? 'Thông tin'
                            : `${entry.status < 400 ? 'Thành công' : 'Lỗi'} • HTTP ${entry.status}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <p className="chart-note">
            Hiển thị tối đa 200 bản ghi mới nhất, tự động làm mới mỗi 5 giây.
          </p>
        </section>
      ))}
    </>
  );
}

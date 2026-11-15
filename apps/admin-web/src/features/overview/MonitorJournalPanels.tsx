import { Badge } from '@vinlook/ui/badge';
import { Card } from '@vinlook/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';
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
        <Card
          className="min-w-0 gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]"
          key={key}
        >
          <div className="px-[22px] py-[21px]">
            <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
              {title}
            </h2>
            <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
              {key === 'system'
                ? 'Khởi động Gateway, thao tác quản trị và các lỗi API được ghi nhận.'
                : 'Các yêu cầu xem điểm đến, dịch kịch bản, nghe thuyết minh và tìm đường đi.'}
            </p>
          </div>

          {!journal ? (
            <p className="px-[22px] py-6 text-center text-xs text-[#85917d]" role="status">
              {journal_error ? 'Chưa có dữ liệu để hiển thị.' : 'Đang tải dữ liệu...'}
            </p>
          ) : journal[key].length === 0 ? (
            <p className="px-[22px] py-6 text-center text-xs text-[#85917d]">
              Chưa ghi nhận {key === 'system' ? 'nhật ký' : 'sự kiện nào'}.
            </p>
          ) : (
            <Table className="w-full text-xs">
              <TableHeader className="sr-only sm:not-sr-only sm:bg-[#fbfcf9]">
                <TableRow className="border-[#edf1e7] hover:bg-transparent">
                  <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
                    Thời gian
                  </TableHead>
                  <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
                    Nội dung sự kiện
                  </TableHead>
                  <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
                    Kết quả
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journal[key].map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="grid grid-cols-1 gap-1.5 border-b border-[#edf1e7] px-[22px] py-3.5 sm:table-row sm:p-0"
                  >
                    <TableCell className="p-0 whitespace-nowrap text-[#667862] sm:px-[22px] sm:py-3.5">
                      {new Date(entry.time).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className="flex flex-col gap-0.5 p-0 sm:table-cell sm:px-4 sm:py-3.5">
                      <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                        Nội dung
                      </span>
                      <span>{entry.message}</span>
                    </TableCell>
                    <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-[22px] sm:py-3.5">
                      <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                        Kết quả
                      </span>
                      <Badge
                        variant={entry.level === 'error' ? 'destructive' : 'success'}
                        className="px-2 py-1 text-[10px]"
                      >
                        {entry.status === null
                          ? 'Thông tin'
                          : `${entry.status < 400 ? 'Thành công' : 'Lỗi'} • HTTP ${entry.status}`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="mx-[22px] mt-3 mb-[19px] text-[10px] leading-[1.8] text-[#a1aa98]">
            Hiển thị tối đa 200 bản ghi mới nhất, tự động làm mới mỗi 5 giây.
          </p>
        </Card>
      ))}
    </>
  );
}

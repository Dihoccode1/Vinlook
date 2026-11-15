import { useState } from 'react';
import { Alert, AlertDescription } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@vinlook/ui/dialog';
import { Label } from '@vinlook/ui/label';
import { Select } from '@vinlook/ui/select';
import { cn } from '@vinlook/ui/utils';
import type { Poi } from '../../types/poi';
import { PoiImage } from '../poi/PoiImage';

interface Props {
  stops: Poi[];
  origin_label: string;
  on_apply: (ids: string[]) => boolean;
  on_close: () => void;
}

export function RouteStopOrderDialog({
  stops,
  origin_label: origin_label,
  on_apply: on_apply,
  on_close: on_close,
}: Props) {
  const [order, set_order] = useState(() => stops.map((poi) => poi.id));
  const [dragged, set_dragged] = useState<string | null>(null);
  const [error, set_error] = useState('');
  const by_id = new Map(stops.map((poi) => [poi.id, poi]));

  function move(id: string, destination: number) {
    set_order((previous) => {
      const source = previous.indexOf(id);
      if (source < 0 || destination < 0 || destination >= previous.length) return previous;
      const next = [...previous];
      next.splice(source, 1);
      next.splice(destination, 0, id);
      return next;
    });
    set_error('');
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) on_close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88dvh] w-[min(700px,calc(100vw-32px))] max-w-none flex-col gap-0 overflow-hidden rounded-[18px] border-[#dae3d1] bg-[#fbfcf8] p-0 text-[#223c32]"
      >
        <DialogHeader className="shrink-0 flex-row items-start justify-between gap-4 px-6 pt-6 max-[600px]:px-4 max-[600px]:pt-4">
          <div>
            <span className="text-[10px] font-medium tracking-[1.6px] text-muted-foreground uppercase">
              HÀNH TRÌNH THEO Ý BẠN
            </span>
            <DialogTitle className="mt-2 text-[25px] font-semibold tracking-tight text-foreground max-[600px]:text-xl">
              Sắp xếp lộ trình
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đóng sắp xếp lộ trình"
            onClick={on_close}
            className="size-8 shrink-0 rounded-full bg-[#edf2e6] text-xl text-[#64785b]"
          >
            ×
          </Button>
        </DialogHeader>

        <DialogDescription className="mt-3 mb-5 shrink-0 px-6 text-[11px] leading-[1.9] text-[#7d8974] max-[600px]:px-4">
          Đường đi sẽ được vẽ từ điểm xuất phát qua lần lượt các POI theo thứ tự dưới đây.
        </DialogDescription>

        <div className="mx-6 flex shrink-0 items-center gap-3.5 rounded-[10px] bg-[#edf2e6] p-4 max-[600px]:mx-4 max-[600px]:p-3">
          <span className="text-xs text-primary" aria-hidden="true">
            ●
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <small className="text-[9px] font-semibold tracking-wider text-muted-foreground">
              ĐIỂM XUẤT PHÁT
            </small>
            <strong className="truncate text-xs font-semibold text-foreground">
              {origin_label}
            </strong>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#5c7155]">
            Giữ nguyên
          </span>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between px-6 text-xs text-muted-foreground max-[600px]:px-4">
          <span className="font-medium">{order.length} điểm dừng</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                set_order((previous) => [...previous].reverse());
                set_error('');
              }}
            >
              Đảo thứ tự
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                set_order(stops.map((poi) => poi.id));
                set_error('');
              }}
            >
              Khôi phục
            </Button>
          </div>
        </div>

        <ol
          className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 pb-4 max-[600px]:px-4"
          aria-label="Thứ tự các điểm dừng"
        >
          {order.map((id, index) => {
            const poi = by_id.get(id);
            if (!poi) return null;
            return (
              <li
                key={id}
                draggable
                onDragStart={(event) => {
                  set_dragged(id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', id);
                }}
                onDragEnd={() => set_dragged(null)}
                onDragOver={(event) => {
                  if (dragged) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged) move(dragged, index);
                  set_dragged(null);
                }}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-xl border border-[#dce4d5] bg-white p-3 transition-opacity',
                  dragged === id && 'opacity-50',
                )}
              >
                <span className="cursor-grab text-muted-foreground select-none" aria-hidden="true">
                  ⠿
                </span>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <PoiImage
                  class_name="size-11 shrink-0 rounded-lg"
                  src={poi.image_url}
                  name={poi.name}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <strong className="truncate text-[13px] font-semibold text-foreground">
                    {poi.name}
                  </strong>
                  <small className="text-[10px] text-muted-foreground">
                    {index === order.length - 1 ? 'Điểm đến cuối' : 'Điểm ghé thăm'}
                  </small>
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    Vị trí
                    <Select
                      size="sm"
                      aria-label={`Vị trí của ${poi.name}`}
                      value={index}
                      onChange={(event) => move(id, Number(event.target.value))}
                      wrapperClassName="w-16"
                      className="h-8 rounded-lg pr-7 text-xs"
                    >
                      {order.map((_, position) => (
                        <option key={position} value={position}>
                          {position + 1}
                        </option>
                      ))}
                    </Select>
                  </Label>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={index === 0}
                    aria-label={`Di chuyển ${poi.name} lên`}
                    onClick={() => move(id, index - 1)}
                    className="size-8 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={index === order.length - 1}
                    aria-label={`Di chuyển ${poi.name} xuống`}
                    onClick={() => move(id, index + 1)}
                    className="size-8 p-0"
                  >
                    ↓
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>

        {error && (
          <Alert variant="destructive" className="mx-6 mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="shrink-0 flex-row items-end justify-between gap-3 border-t border-[#e1e8da] bg-white px-6 py-4 max-[600px]:px-4 max-[600px]:py-3.5">
          <span className="text-[11px] text-muted-foreground max-[600px]:max-w-[110px] max-[600px]:text-[10px]">
            Điểm xuất phát và phương tiện được giữ nguyên.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={on_close}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (on_apply(order)) on_close();
                else set_error('Danh sách điểm dừng đã thay đổi. Hãy khôi phục rồi sắp xếp lại.');
              }}
            >
              Áp dụng &amp; vẽ đường
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

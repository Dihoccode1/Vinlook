import { NativeDialog } from '@vinlook/ui/dialog';
import { NativeSelect } from '@vinlook/ui/native-select';
import { Button } from '@vinlook/ui/button';
import { useEffect, useRef, useState } from 'react';
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [order, set_order] = useState(() => stops.map((poi) => poi.id));
  const [dragged, set_dragged] = useState<string | null>(null);
  const [error, set_error] = useState('');
  const by_id = new Map(stops.map((poi) => [poi.id, poi]));
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      focused?.focus();
    };
  }, []);

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
    <NativeDialog
      ref={dialog}
      className="stop-order-dialog w-[min(700px,_calc(100vw_-_32px))] max-h-[88dvh] p-[0] text-vinlook-ink shadow-[0_20px_80px_#16342645]"
      aria-labelledby="stop-order-title"
      onCancel={(event) => {
        event.preventDefault();
        on_close();
      }}
    >
      <header className="stop-order-header flex justify-between items-start shrink-0">
        <div>
          <span className="eyebrow text-[9px] tracking-[1.8px] font-bold text-vinlook-sage">
            HÀNH TRÌNH THEO Ý BẠN
          </span>
          <h2 id="stop-order-title">Sắp xếp lộ trình</h2>
        </div>
        <Button
          variant="custom"
          type="submit"
          aria-label="Đóng sắp xếp lộ trình"
          onClick={on_close}
        >
          ×
        </Button>
      </header>
      <p className="stop-order-description py-[0] px-[26px] text-[11px] leading-[1.9] text-[#7d8974] shrink-0 [@media(max-width:_540px)]:py-[0] [@media(max-width:_540px)]:px-[16px] [@media(max-width:_540px)]:text-[10px]">
        Đường đi sẽ được vẽ từ điểm xuất phát qua lần lượt các POI theo thứ tự dưới đây.
      </p>
      <div className="stop-order-origin flex items-center gap-[14px] my-[0] mx-[26px] p-[16px] bg-[#edf2e6] rounded-[10px] shrink-0 [@media(max-width:_540px)]:my-[0] [@media(max-width:_540px)]:mx-[16px] [@media(max-width:_540px)]:p-[12px]">
        <span aria-hidden="true">●</span>
        <div>
          <small>ĐIỂM XUẤT PHÁT</small>
          <strong>{origin_label}</strong>
        </div>
        <span className="stop-order-fixed text-[9px] text-[#829075]">Giữ nguyên</span>
      </div>
      <div className="stop-order-toolbar flex justify-between items-center text-[11px] shrink-0">
        <span>{order.length} điểm dừng</span>
        <div>
          <Button
            variant="custom"
            type="submit"
            onClick={() => {
              set_order((previous) => [...previous].reverse());
              set_error('');
            }}
          >
            Đảo thứ tự
          </Button>
          <Button
            variant="custom"
            type="submit"
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
        className="stop-order-list p-[0] overflow-auto min-h-0 flex-[1]"
        aria-label="Thứ tự các điểm dừng"
      >
        {order.map((id, index) => {
          const poi = by_id.get(id);
          if (!poi) return null;
          return (
            <li
              key={id}
              draggable
              className={dragged === id ? 'is-dragging' : ''}
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
            >
              <span
                className="stop-drag-handle text-[#a1af96] text-[23px] [@media(max-width:_540px)]:hidden"
                aria-hidden="true"
              >
                ⠿
              </span>
              <span className="route-stop-number grid w-[24px] h-[24px] shrink-0 rounded-[50%] bg-[#e5ecde] text-vinlook-forest text-[10px]">
                {index + 1}
              </span>
              <PoiImage
                class_name="stop-order-photo w-[48px] h-[48px] object-cover rounded-[8px] shrink-0 [@media(max-width:_540px)]:hidden"
                src={poi.image_url}
                name={poi.name}
              />
              <div className="stop-order-name flex-[1] min-w-0 flex flex-col gap-[6px]">
                <strong>{poi.name}</strong>
                <small>{index === order.length - 1 ? 'Điểm đến cuối' : 'Điểm ghé thăm'}</small>
              </div>
              <label className="stop-order-position flex items-center gap-[6px] text-[9px] text-[#819276] [@media(max-width:_540px)]:flex-col [@media(max-width:_540px)]:gap-[3px]">
                Vị trí
                <NativeSelect
                  aria-label={`Vị trí của ${poi.name}`}
                  value={index}
                  onChange={(event) => move(id, Number(event.target.value))}
                >
                  {order.map((_, position) => (
                    <option key={position} value={position}>
                      {position + 1}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <div className="stop-order-arrows flex gap-[3px] [@media(max-width:_540px)]:flex-col">
                <Button
                  variant="custom"
                  type="submit"
                  disabled={index === 0}
                  aria-label={`Di chuyển ${poi.name} lên`}
                  onClick={() => move(id, index - 1)}
                >
                  ↑
                </Button>
                <Button
                  variant="custom"
                  type="submit"
                  disabled={index === order.length - 1}
                  aria-label={`Di chuyển ${poi.name} xuống`}
                  onClick={() => move(id, index + 1)}
                >
                  ↓
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {error && (
        <p
          className="route-error text-[11px] leading-[1.8] text-[#9d4c37] p-[12px] bg-[#fcf1e9] rounded-[8px]"
          role="alert"
        >
          {error}
        </p>
      )}
      <footer className="stop-order-footer py-[17px] px-[26px] m-[0] flex items-center gap-[14px] justify-between bg-[#f5f8f0] tracking-[0] shrink-0 [@media(max-width:_540px)]:py-[14px] [@media(max-width:_540px)]:px-[16px] [@media(max-width:_540px)]:items-end">
        <span>Điểm xuất phát và phương tiện được giữ nguyên.</span>
        <div>
          <Button variant="custom" type="submit" onClick={on_close}>
            Hủy
          </Button>
          <Button
            variant="custom"
            type="submit"
            className="stop-order-apply"
            onClick={() => {
              if (on_apply(order)) on_close();
              else set_error('Danh sách điểm dừng đã thay đổi. Hãy khôi phục rồi sắp xếp lại.');
            }}
          >
            Áp dụng &amp; vẽ đường
          </Button>
        </div>
      </footer>
    </NativeDialog>
  );
}

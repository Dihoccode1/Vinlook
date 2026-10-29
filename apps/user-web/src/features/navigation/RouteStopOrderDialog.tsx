import { useEffect, useRef, useState } from 'react';
import type { Poi } from '../../types/poi';
import { PoiImage } from '../poi/PoiImage';

interface Props {
  stops: Poi[];
  origin_label: string;
  on_apply: (ids: string[]) => boolean;
  on_close: () => void;
}

export function RouteStopOrderDialog({ stops, origin_label: origin_label, on_apply: on_apply, on_close: on_close }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [order, set_order] = useState(() => stops.map(poi => poi.id));
  const [dragged, set_dragged] = useState<string | null>(null);
  const [error, set_error] = useState('');
  const by_id = new Map(stops.map(poi => [poi.id, poi]));
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); focused?.focus(); };
  }, []);

  function move(id: string, destination: number) {
    set_order(previous => {
      const source = previous.indexOf(id);
      if (source < 0 || destination < 0 || destination >= previous.length) return previous;
      const next = [...previous];
      next.splice(source, 1);
      next.splice(destination, 0, id);
      return next;
    });
    set_error('');
  }

  return <dialog ref={dialog} className="stop-order-dialog" aria-labelledby="stop-order-title" onCancel={event => { event.preventDefault(); on_close(); }}>
    <header className="stop-order-header"><div><span className="eyebrow">HÀNH TRÌNH THEO Ý BẠN</span><h2 id="stop-order-title">Sắp xếp lộ trình</h2></div><button aria-label="Đóng sắp xếp lộ trình" onClick={on_close}>×</button></header>
    <p className="stop-order-description">Đường đi sẽ được vẽ từ điểm xuất phát qua lần lượt các POI theo thứ tự dưới đây.</p>
    <div className="stop-order-origin"><span aria-hidden="true">●</span><div><small>ĐIỂM XUẤT PHÁT</small><strong>{origin_label}</strong></div><span className="stop-order-fixed">Giữ nguyên</span></div>
    <div className="stop-order-toolbar"><span>{order.length} điểm dừng</span><div><button onClick={() => { set_order(previous => [...previous].reverse()); set_error(''); }}>Đảo thứ tự</button><button onClick={() => { set_order(stops.map(poi => poi.id)); set_error(''); }}>Khôi phục</button></div></div>
    <ol className="stop-order-list" aria-label="Thứ tự các điểm dừng">
      {order.map((id, index) => {
        const poi = by_id.get(id);
        if (!poi) return null;
        return <li key={id} draggable className={dragged === id ? 'is-dragging' : ''}
          onDragStart={event => { set_dragged(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }}
          onDragEnd={() => set_dragged(null)}
          onDragOver={event => { if (dragged) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }}
          onDrop={event => { event.preventDefault(); if (dragged) move(dragged, index); set_dragged(null); }}>
          <span className="stop-drag-handle" aria-hidden="true">⠿</span><span className="route-stop-number">{index + 1}</span>
          <PoiImage class_name="stop-order-photo" src={poi.image_url} name={poi.name} />
          <div className="stop-order-name"><strong>{poi.name}</strong><small>{index === order.length - 1 ? 'Điểm đến cuối' : 'Điểm ghé thăm'}</small></div>
          <label className="stop-order-position">Vị trí<select aria-label={`Vị trí của ${poi.name}`} value={index} onChange={event => move(id, Number(event.target.value))}>{order.map((_, position) => <option key={position} value={position}>{position + 1}</option>)}</select></label>
          <div className="stop-order-arrows"><button disabled={index === 0} aria-label={`Di chuyển ${poi.name} lên`} onClick={() => move(id, index - 1)}>↑</button><button disabled={index === order.length - 1} aria-label={`Di chuyển ${poi.name} xuống`} onClick={() => move(id, index + 1)}>↓</button></div>
        </li>;
      })}
    </ol>
    {error && <p className="route-error" role="alert">{error}</p>}
    <footer className="stop-order-footer"><span>Điểm xuất phát và phương tiện được giữ nguyên.</span><div><button onClick={on_close}>Hủy</button><button className="stop-order-apply" onClick={() => { if (on_apply(order)) on_close(); else set_error('Danh sách điểm dừng đã thay đổi. Hãy khôi phục rồi sắp xếp lại.'); }}>Áp dụng &amp; vẽ đường</button></div></footer>
  </dialog>;
}

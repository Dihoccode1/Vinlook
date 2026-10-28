import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

export interface MobileSheetHandle { expand(): void; collapse(): void }
const collapsed = 25;
const expanded = 100;
export const MobileSheet = forwardRef<MobileSheetHandle, { children: ReactNode }>(function MobileSheet({ children }, ref) {
  const [height, setHeight] = useState(collapsed);
  const [dragging, setDragging] = useState(false);
  const element = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; y: number; height: number; lastY: number; time: number; velocity: number; moved: boolean; viewport: number } | null>(null);
  const suppressClick = useRef(false);
  const isExpanded = height >= (collapsed + expanded) / 2;
  const snap = (value: number) => { setHeight(value); setDragging(false); };
  useImperativeHandle(ref, () => ({ expand: () => snap(expanded), collapse: () => snap(collapsed) }), []);
  useLayoutEffect(() => {
    const app = element.current?.parentElement;
    app?.style.setProperty('--mobile-sheet-height', `${height}dvh`);
    app?.setAttribute('data-sheet-dragging', String(dragging));
  }, [height, dragging]);
  useLayoutEffect(() => {
    const app = element.current?.parentElement;
    return () => { app?.style.removeProperty('--mobile-sheet-height'); app?.removeAttribute('data-sheet-dragging'); };
  }, []);
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false || window.innerWidth > 760) return;
    suppressClick.current = false;
    drag.current = { id: event.pointerId, y: event.clientY, height, lastY: event.clientY, time: event.timeStamp, velocity: 0, moved: false, viewport: window.visualViewport?.height ?? window.innerHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    current.moved ||= Math.abs(event.clientY - current.y) > 6;
    if (!current.moved) return;
    current.velocity = (current.lastY - event.clientY) / Math.max(1, event.timeStamp - current.time);
    current.lastY = event.clientY; current.time = event.timeStamp;
    setHeight(Math.max(collapsed, Math.min(expanded, current.height + (current.y - event.clientY) / current.viewport * 100)));
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    suppressClick.current = current.moved;
    const finalHeight = cancelled ? height : Math.max(collapsed, Math.min(expanded, current.height + (current.y - event.clientY) / current.viewport * 100));
    const flick = !cancelled && current.moved && event.timeStamp - current.time < 120 && Math.abs(current.velocity) > 0.5;
    const destination = flick ? (current.velocity > 0 ? expanded : collapsed) : (finalHeight >= (collapsed + expanded) / 2 ? expanded : collapsed);
    if (current.moved || cancelled) snap(destination); else setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <aside ref={element} className={`sidebar mobile-sheet${dragging ? ' is-dragging' : ''}`} data-sheet-state={isExpanded ? 'expanded' : 'collapsed'} aria-label="Khám phá và lộ trình">
    <button type="button" className="sheet-handle" aria-controls="sidebar-content" aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Thu gọn bảng khám phá để xem bản đồ' : 'Mở bảng khám phá toàn màn hình'}
      onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
      onClick={event => { if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; } snap(isExpanded ? collapsed : expanded); }}
      onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) { event.preventDefault(); snap(event.key === 'ArrowUp' || event.key === 'End' ? expanded : collapsed); } }}>
      <span className="sheet-grip" aria-hidden="true"/><span className="sheet-hint">{isExpanded ? 'Kéo xuống để xem bản đồ' : 'Kéo lên để khám phá'}</span><span className="sheet-chevron" aria-hidden="true">{isExpanded ? '⌄' : '⌃'}</span>
    </button>
    <div id="sidebar-content" className="sidebar-content" onFocusCapture={event => { if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) snap(expanded); }}>{children}</div>
  </aside>;
});

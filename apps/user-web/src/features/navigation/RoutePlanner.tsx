import { useState } from 'react';
import { Alert, AlertDescription } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Label } from '@vinlook/ui/label';
import { Select } from '@vinlook/ui/select';
import { cn } from '@vinlook/ui/utils';
import type { Poi } from '../../types/poi';
import type { use_route_plan } from './use-route-plan';
import { format_distance, format_duration, vehicle_labels, type VehicleProfile } from './types';
import { RouteStopOrderDialog } from './RouteStopOrderDialog';

interface Props {
  plan: ReturnType<typeof use_route_plan>;
  pois: Poi[];
  on_explore: () => void;
  on_calculate: () => void;
  on_show_route: () => void;
}

export function RoutePlanner({
  plan,
  pois,
  on_explore: on_explore,
  on_calculate: on_calculate,
  on_show_route: on_show_route,
}: Props) {
  const [order_open, set_order_open] = useState(false);
  return (
    <section
      data-sheet-collapsible=""
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pr-0.5"
      aria-label="Lập lộ trình"
    >
      <span className="text-[10px] font-medium tracking-[1.6px] text-muted-foreground uppercase">
        HÀNH TRÌNH CỦA BẠN
      </span>
      {plan.stops.length ? (
        <h2 className="my-2.5 text-[22px] leading-snug font-bold tracking-tight text-foreground">
          Đến {plan.stops.at(-1)?.name}
        </h2>
      ) : (
        <h2 className="my-2.5 text-[30px] leading-[1.18] font-bold tracking-[-0.7px] text-foreground max-[760px]:text-xl">
          Đi qua những nơi
          <br />
          bạn yêu thích.
        </h2>
      )}

      <Label htmlFor="route-origin" className="mt-2 mb-2 text-xs font-semibold text-foreground">
        Điểm xuất phát
      </Label>
      <Select
        id="route-origin"
        value={plan.origin_id}
        onChange={(event) => {
          on_show_route();
          plan.set_origin_id(event.target.value);
        }}
        className="h-11 rounded-[10px] border-[#dce3d9] bg-white text-xs text-[#223c32]"
      >
        <option value="gps">Vị trí GPS hiện tại</option>
        {pois.map((poi) => (
          <option key={poi.id} value={poi.id}>
            {poi.name}
          </option>
        ))}
      </Select>

      <div className="my-3.5 grid grid-cols-3 gap-2" role="group" aria-label="Phương tiện">
        {(Object.keys(vehicle_labels) as VehicleProfile[]).map((mode) => {
          const active = plan.profile === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={active}
              onClick={() => {
                on_show_route();
                plan.set_profile(mode);
              }}
              className={cn(
                'rounded-[10px] border py-2.5 text-center text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary font-semibold text-primary-foreground'
                  : 'border-[#dce3d9] bg-white text-foreground hover:bg-muted',
              )}
            >
              {vehicle_labels[mode]}
            </button>
          );
        })}
      </div>

      {plan.route && (
        <div
          className="mb-3.5 rounded-xl border border-[#cfdfc6] bg-[#edf5e8] px-3.5 py-3 text-primary"
          role="status"
        >
          <span className="text-[10px] font-medium">
            {vehicle_labels[plan.route.profile]} · Ngắn nhất theo quãng đường
          </span>
          <div className="mt-1 flex items-center justify-between text-primary">
            <strong className="text-[25px] font-semibold">
              {format_distance(plan.route.distance)}
            </strong>
            <span className="text-[15px]">Khoảng {format_duration(plan.route.duration)}</span>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">Điểm dừng · {plan.stops.length}/9</h3>
        <Button
          variant="outline"
          size="xs"
          onClick={on_explore}
          className="rounded-lg border-primary/40 bg-white font-semibold text-primary"
        >
          + Thêm POI vào lộ trình
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <Button
          variant="outline"
          size="xs"
          disabled={plan.stops.length < 2}
          onClick={() => set_order_open(true)}
          className="rounded-lg bg-white text-xs"
        >
          ⇅ Sắp xếp lộ trình
        </Button>
        {plan.stops.length < 2 && (
          <small className="text-[9px] text-[#8b9681]">Thêm ít nhất 2 POI để sắp xếp.</small>
        )}
      </div>

      {plan.stops.length === 0 ? (
        <p className="mt-3 text-[10px] leading-[1.8] text-[#7b8875]">
          Chọn địa điểm trên bản đồ rồi bấm “Thêm vào lộ trình”.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {plan.stops.map((poi, index) => (
            <li
              key={poi.id}
              className="flex items-center gap-2.5 rounded-lg border border-[#e0e6da] bg-white px-3 py-2"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {poi.name}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={index === 0}
                  aria-label={`Đưa ${poi.name} lên trước`}
                  onClick={() => plan.move_stop(index, -1)}
                  className="size-7 p-0"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={index === plan.stops.length - 1}
                  aria-label={`Đưa ${poi.name} xuống sau`}
                  onClick={() => plan.move_stop(index, 1)}
                  className="size-7 p-0"
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label={`Xóa ${poi.name} khỏi lộ trình`}
                  onClick={() => plan.remove_stop(poi.id)}
                  className="size-7 p-0 text-destructive"
                >
                  ×
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-[18px] text-[9px] leading-[1.8] text-[#7b8875]">
        Tìm đường {vehicle_labels[plan.profile].toLowerCase()} ngắn nhất theo quãng đường, giữ thứ
        tự POI bạn chọn. Tọa độ được gửi tới dịch vụ chỉ đường khi bạn yêu cầu tìm tuyến.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={plan.loading || !plan.stops.length}
          onClick={on_calculate}
          className="h-auto rounded-lg px-3.5 py-2.5 text-[11px] font-semibold"
        >
          {plan.loading ? 'Đang vẽ đường…' : 'Vẽ đường theo lộ trình'}
        </Button>
        {plan.stops.length > 0 && (
          <Button
            variant="outline"
            onClick={plan.clear}
            className="h-auto rounded-lg border-[#cfd9c6] bg-white px-3.5 py-2.5 text-[11px] text-primary"
          >
            Xóa lộ trình
          </Button>
        )}
      </div>

      {plan.waiting_for_gps && (
        <p className="mt-3 text-[10px] leading-[1.8] text-[#7b8875]" role="status">
          Đang chờ vị trí GPS. Sau khi bạn cấp quyền, tuyến sẽ tự hiển thị.
        </p>
      )}
      {plan.error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{plan.error}</AlertDescription>
        </Alert>
      )}
      {plan.loading && (
        <p className="mt-3 text-[10px] leading-[1.8] text-[#7b8875]" role="status">
          Đang tính đường qua các điểm dừng theo thứ tự đã chọn…
        </p>
      )}

      {plan.route && (
        <section className="mt-6 border-t border-[#dce4d5] pt-5" aria-label="Kết quả chỉ đường">
          <p className="text-[10px] leading-[1.8] text-[#7b8875]">
            Từ {plan.route.origin_label} · Tính lúc{' '}
            {new Date(plan.route.calculated_at).toLocaleTimeString('vi-VN')}
          </p>
          <p className="text-[10px] leading-[1.8] text-[#7b8875]">
            Thời gian ước tính, chưa có giao thông trực tiếp. Tuyến không tự tính lại khi bạn di
            chuyển.
          </p>
          {plan.route.legs.map((leg, index) => (
            <details
              key={index}
              open={index === 0}
              className="mt-3.5 border-t border-[#e1e7dc] pt-3.5"
            >
              <summary className="cursor-pointer text-[11px] leading-[1.8] font-semibold">
                Chặng {index + 1}: {plan.stops[index]?.name}{' '}
                <span className="ml-2 text-[10px] font-normal text-[#839279]">
                  {format_distance(leg.distance)}
                </span>
              </summary>
              <ol className="list-decimal pl-[22px] text-[11px] leading-[1.8] text-[#5e7158]">
                {leg.steps.map((step, step_index) => (
                  <li key={step_index} className="border-b border-[#e9ede4] py-2">
                    <span className="block">{step.instruction}</span>
                    <small className="text-[10px] text-[#839279]">
                      {format_distance(step.distance)}
                    </small>
                  </li>
                ))}
              </ol>
            </details>
          ))}
          <p className="mt-3 text-[10px] leading-[1.8] text-[#7b8875]">
            Tuyến đường: Valhalla · Dữ liệu © OpenStreetMap contributors
          </p>
        </section>
      )}

      {order_open && (
        <RouteStopOrderDialog
          stops={plan.stops}
          origin_label={
            plan.origin_id === 'gps'
              ? 'Vị trí GPS của bạn'
              : (pois.find((poi) => poi.id === plan.origin_id)?.name ?? 'Điểm xuất phát')
          }
          on_apply={(ids) => {
            const valid = plan.reorder_stops(ids);
            if (valid) on_show_route();
            return valid;
          }}
          on_close={() => set_order_open(false)}
        />
      )}
    </section>
  );
}

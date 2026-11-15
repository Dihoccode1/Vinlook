/**
 * @file ActivityChart.tsx
 * @description Biểu đồ đo lường hoạt động thời gian thực (Activity Chart)
 * Hiển thị số lượng phiên truy cập và lượt nghe thuyết minh trong 5 phút gần nhất qua SVG.
 */

import React, { useRef } from 'react';
import { Card } from '@vinlook/ui/card';
import type { ActivitySample } from '../../types';

interface ActivityChartProps {
  samples: ActivitySample[];
}

const time_label = (time: number) =>
  new Date(time).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export function ActivityChart({ samples }: ActivityChartProps) {
  const first_sample_time = useRef<number | null>(null);
  if (first_sample_time.current === null && samples.length) {
    first_sample_time.current = samples[0]!.time;
  }

  const end = samples.at(-1)?.time ?? Date.now();
  const start = Math.max(first_sample_time.current ?? end, end - 300000);
  const maximum = Math.max(
    4,
    ...samples.flatMap((point) => [point.visitors ?? 0, point.listeners ?? 0]),
  );
  const ceiling = Math.ceil(maximum / 4) * 4;

  const x = (time: number) => 44 + ((time - start) / 300000) * 628;
  const y = (value: number) => 194 - (value / ceiling) * 160;

  function path(field: 'visitors' | 'listeners') {
    let connected = false;
    return samples
      .map((point, index) => {
        const value = point[field];
        if (value === null) {
          connected = false;
          return '';
        }
        if (index && point.time - samples[index - 1]!.time > 15000) {
          connected = false;
        }
        const segment = `${connected ? 'L' : 'M'}${x(point.time)},${y(value)}`;
        connected = true;
        return segment;
      })
      .join(' ');
  }

  return (
    <Card className="flex min-w-0 flex-col justify-between gap-0 rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
      <div className="flex flex-wrap items-start justify-between gap-2.5 px-[22px] py-[21px]">
        <div>
          <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
            Hoạt động theo thời gian thực
          </h2>
          <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
            5 phút gần nhất · Cập nhật mỗi 5 giây
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] leading-[1.7] text-[#7c8b74] md:text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#246d9b]" /> Đang truy cập
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#ca762c]" /> Đang lắng nghe
          </span>
        </div>
      </div>

      {!samples.some((point) => point.visitors !== null) ? (
        <p className="px-[22px] py-10 text-center text-xs text-[#85917d]" role="status">
          Chưa nhận được dữ liệu hoạt động.
        </p>
      ) : (
        <svg
          className="my-auto max-h-[245px] w-full px-[15px] [&_text]:fill-[#94a18d] [&_text]:text-[13px] md:[&_text]:text-[15px]"
          viewBox="0 0 700 240"
          role="img"
          aria-label="Biểu đồ số phiên truy cập và số phiên nghe thuyết minh trong 5 phút gần nhất"
        >
          {[0, 1, 2, 3, 4].map((tick) => (
            <g key={tick}>
              <line
                x1="44"
                x2="672"
                y1={y((ceiling / 4) * tick)}
                y2={y((ceiling / 4) * tick)}
                stroke="#e6ebe6"
              />
              <text x="32" y={y((ceiling / 4) * tick) + 4} textAnchor="end">
                {(ceiling / 4) * tick}
              </text>
            </g>
          ))}
          {[0, 1, 2].map((tick) => (
            <text
              key={tick}
              x={44 + tick * 314}
              y="221"
              textAnchor={tick === 0 ? 'start' : tick === 2 ? 'end' : 'middle'}
            >
              {time_label(start + tick * 150000)}
            </text>
          ))}
          <path d={path('visitors')} stroke="#246d9b" strokeWidth="2.5" fill="none" />
          <path
            d={path('listeners')}
            stroke="#ca762c"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            fill="none"
          />
          {samples.flatMap((point) =>
            (['visitors', 'listeners'] as const).map((field) =>
              point[field] === null ? null : (
                <circle
                  key={`${point.time}-${field}`}
                  cx={x(point.time)}
                  cy={y(point[field]!)}
                  r="3"
                  fill={field === 'visitors' ? '#246d9b' : '#ca762c'}
                >
                  <title>
                    {time_label(point.time)} • {field === 'visitors' ? 'Truy cập' : 'Đang nghe'}:{' '}
                    {point[field]}
                  </title>
                </circle>
              ),
            ),
          )}
        </svg>
      )}

      <p className="mx-[22px] mt-2.5 mb-[19px] text-[10px] leading-[1.8] text-[#a1aa98]">
        Dữ liệu được ghi nhận từ khi mở trang. Khoảng mất kết nối được để trống.
      </p>
    </Card>
  );
}

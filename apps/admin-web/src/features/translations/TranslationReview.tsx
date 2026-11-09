/**
 * @file TranslationReview.tsx
 * @description Phân hệ Kiểm duyệt Bản dịch & Thuyết minh (Translations Review Feature)
 * Theo dõi tiến độ dịch thuật và tổng hợp âm thanh giọng đọc của các điểm tham quan.
 */

import React from 'react';
import type { Poi } from '../../types';

interface TranslationReviewProps {
  pois: Poi[];
  onSelectPoi: (poi: Poi) => void;
}

export function TranslationReview({ pois, onSelectPoi }: TranslationReviewProps) {
  return (
    <section className="panel translation-review">
      <div className="panel-title">
        <div>
          <h2>Tiến độ thuyết minh & Bản dịch</h2>
          <p>Kiểm tra tình trạng kịch bản gốc, các bản dịch đa ngữ và file âm thanh WAV đã sẵn sàng.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Điểm tham quan</th>
              <th>Ngôn ngữ gốc</th>
              <th>Trạng thái xuất bản</th>
              <th>Độ dài kịch bản</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pois.map((poi) => (
              <tr key={poi.id}>
                <td>
                  <strong>{poi.name}</strong>
                  <small className="monitor-service-id">{poi.slug}</small>
                </td>
                <td>
                  <code>{poi.source_language.toUpperCase()}</code>
                </td>
                <td>
                  <span className={`publish-status ${poi.is_published ? 'published' : ''}`}>
                    {poi.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                </td>
                <td>
                  {poi.description ? `${poi.description.length} ký tự` : 'Chưa có kịch bản'}
                </td>
                <td>
                  <button type="button" onClick={() => onSelectPoi(poi)}>
                    Xem & sửa kịch bản
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

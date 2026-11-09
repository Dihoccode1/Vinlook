/**
 * @file SectionEditor.tsx
 * @description Phân hệ Quản lý Phân đoạn Thuyết minh (POI Sections Feature)
 * Cho phép phân tách nội dung thuyết minh một điểm tham quan thành các phân đoạn nhỏ (ví dụ: Cổng vào, Điện chính, Khu vườn,...).
 */

import React from 'react';
import type { Poi } from '../../types';

interface SectionEditorProps {
  poi: Poi;
  onClose: () => void;
}

export function SectionEditor({ poi, onClose }: SectionEditorProps) {
  return (
    <div className="section-editor panel">
      <div className="panel-title">
        <div>
          <h2>Phân đoạn thuyết minh chi tiết: {poi.name}</h2>
          <p>Chia nhỏ kịch bản thuyết minh theo từng trạm dừng chân hoặc khu vực tham quan cụ thể.</p>
        </div>
        <button type="button" onClick={onClose}>
          Đóng
        </button>
      </div>

      <div className="section-list">
        <p className="field-note">
          Hiện tại kịch bản đang được quản lý dưới dạng nội dung toàn diện thống nhất (single comprehensive narrative).
          Hệ thống sẵn sàng mở rộng phân chia theo các trạm dừng chân khi có bản vẽ mặt bằng chi tiết.
        </p>
      </div>
    </div>
  );
}

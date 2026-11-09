/**
 * @file PoiQrDialog.tsx
 * @description Dialog tạo và tải mã QR cho từng điểm tham quan
 * Mã QR chứa liên kết dẫn trực tiếp du khách đến trang bản đồ và thuyết minh tự động.
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../services/api';
import { default_public_url, qr_link } from '../../services/qr';
import type { Poi, QrData } from '../../types';

interface PoiQrDialogProps {
  poi: Poi;
  on_close: () => void;
}

export function PoiQrDialog({ poi, on_close }: PoiQrDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [qr, set_qr] = useState<QrData | null>(null);
  const [base_url, set_base_url] = useState(() => {
    try {
      return (
        localStorage.getItem('vinlook.public_web_url') ||
        default_public_url(window.location.origin, import.meta.env.VITE_PUBLIC_WEB_URL)
      );
    } catch {
      return default_public_url(window.location.origin, import.meta.env.VITE_PUBLIC_WEB_URL);
    }
  });

  const [png, set_png] = useState('');
  const [link, set_link] = useState('');
  const [error, set_error] = useState('');
  const [notice, set_notice] = useState('');
  const [retry, set_retry] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  // Gọi API tạo hoặc lấy mã QR token cho điểm tham quan
  useEffect(() => {
    const controller = new AbortController();
    set_error('');

    api<{ data: QrData }>(`/pois/${encodeURIComponent(poi.id)}/qr`, {
      method: 'POST',
      signal: controller.signal
    })
      .then((result) => {
        if (!controller.signal.aborted) set_qr(result.data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          set_error(failure instanceof Error ? failure.message : 'Không thể tạo mã QR cho điểm này.');
        }
      });

    return () => controller.abort();
  }, [poi.id, retry]);

  // Tạo ảnh QR PNG chất lượng cao
  useEffect(() => {
    let cancelled = false;
    set_png('');
    set_link('');
    set_notice('');
    if (!qr) return;

    let target: string;
    try {
      target = qr_link(base_url.trim(), qr.qr_token);
    } catch {
      set_error('Nhập địa chỉ web bản đồ hợp lệ (ví dụ: https://vinlook.vn)');
      return;
    }

    set_error('');
    set_link(target);

    QRCode.toDataURL(target, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#153f32', light: '#ffffff' }
    })
      .then((data) => {
        if (!cancelled) {
          set_png(data);
          try {
            localStorage.setItem('vinlook.public_web_url', base_url.trim());
          } catch {
            // Lưu tùy chọn người dùng nếu localStorage khả dụng
          }
        }
      })
      .catch(() => {
        if (!cancelled) set_error('Không tạo được ảnh mã QR. Vui lòng thử lại.');
      });

    return () => {
      cancelled = true;
    };
  }, [qr, base_url]);

  const local_link = link && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(link).hostname);

  async function copy_link() {
    try {
      if (!navigator.clipboard) throw new Error('Unavailable');
      await navigator.clipboard.writeText(link);
      set_notice('Đã sao chép đường dẫn vào bộ nhớ tạm.');
    } catch {
      set_notice('Không thể tự động sao chép. Bạn có thể chọn và sao chép thủ công.');
    }
  }

  return (
    <dialog ref={dialog} className="qr-dialog" aria-labelledby="qr-dialog-title">
      <header className="qr-dialog-header">
        <div>
          <h2 id="qr-dialog-title">Mã QR điểm tham quan</h2>
          <p>{poi.name}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Đóng cửa sổ" onClick={on_close}>
          ✕
        </button>
      </header>

      <div className="qr-dialog-body">
        {error && (
          <div className="error-banner" role="alert">
            {error}
            {!qr && (
              <button type="button" className="retry-button" onClick={() => set_retry((v) => v + 1)}>
                Thử lại
              </button>
            )}
          </div>
        )}

        <label className="qr-base-input">
          Địa chỉ web bản đồ du khách
          <input
            type="url"
            required
            value={base_url}
            onChange={(e) => set_base_url(e.target.value)}
            placeholder="https://vinlook.vn"
          />
          <small>Mã QR sẽ mở trang web này khi du khách quét bằng điện thoại.</small>
        </label>

        {local_link && (
          <p className="field-note warning">
            Liên kết hiện tại là địa chỉ nội bộ (localhost), điện thoại thật sẽ không truy cập được trừ khi cùng mạng LAN hoặc dùng domain public.
          </p>
        )}

        {png ? (
          <div className="qr-preview">
            <img src={png} alt={`Mã QR cho ${poi.name}`} />
            <div className="qr-link-box">
              <code>{link}</code>
              <button type="button" onClick={copy_link}>
                Sao chép link
              </button>
            </div>
            {notice && <p className="qr-copy-notice">{notice}</p>}
          </div>
        ) : !error ? (
          <p className="empty-state">Đang tạo mã QR độ phân giải cao...</p>
        ) : null}
      </div>

      <footer className="qr-dialog-footer">
        <button type="button" onClick={on_close}>
          Đóng
        </button>
        {png && (
          <a className="primary button-link" href={png} download={`qr-${poi.slug}.png`}>
            Tải ảnh QR (PNG 1024px)
          </a>
        )}
      </footer>
    </dialog>
  );
}

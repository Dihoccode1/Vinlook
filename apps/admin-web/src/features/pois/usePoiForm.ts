import { useGeocoding } from './useGeocoding';

import React, { useEffect, useRef, useState } from 'react';
import { api, categories } from '../../services/api';
import type { Poi } from '../../types';

/**
 * Danh mục ngôn ngữ nguồn hỗ trợ thuyết minh với tên hiển thị chuẩn tiếng Việt
 */
const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  ar: 'العربية',
  hi: 'हिन्दी',
};

interface PoiEditorProps {
  poi: Poi | null;
  on_close: () => void;
  on_saved: () => void;
}

export function usePoiForm({ poi, on_close, on_saved }: PoiEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [form, set_form] = useState({
    name: poi?.name ?? '',
    description: poi?.description ?? '',
    address: poi?.address ?? '',
    visitor_description: poi?.visitor_description ?? '',
    latitude: poi ? String(poi.latitude) : '',
    longitude: poi ? String(poi.longitude) : '',
    category: poi?.category ?? 'architecture',
    source_language: poi?.source_language ?? 'vi',
    is_published: poi?.is_published ?? false,
    image_credit: poi?.image_credit ?? '',
    image_source_url: poi?.image_source_url ?? '',
    image_license_url: poi?.image_license_url ?? '',
  });

  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState('');
  const [error, set_error] = useState('');
  const [saving, set_saving] = useState(false);
  const {
    locating,
    matches,
    set_matches,
    location_note,
    set_location_note,
    set_address_revision,
    set,
    choose_location,
  } = useGeocoding(form, set_form, saving, poi?.address ?? '');
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  // Xử lý chiều cao viewport động (tránh bàn phím ảo che khuất trên mobile/tablet)
  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    const update_viewport = () => {
      const layout_height = Math.min(
        window.innerHeight,
        document.documentElement.clientHeight || window.innerHeight,
      );
      const visible_height = Math.min(viewport?.height ?? layout_height, layout_height);
      element?.style.setProperty('--editor-visible-height', `${visible_height}px`);
      element?.style.setProperty('--editor-visible-top', `${viewport?.offsetTop ?? 0}px`);
    };

    update_viewport();
    viewport?.addEventListener('resize', update_viewport);
    viewport?.addEventListener('scroll', update_viewport);
    window.addEventListener('resize', update_viewport);

    return () => {
      viewport?.removeEventListener('resize', update_viewport);
      viewport?.removeEventListener('scroll', update_viewport);
      window.removeEventListener('resize', update_viewport);
    };
  }, []);

  // Tạo URL xem trước ảnh tải lên
  useEffect(() => {
    if (!file) {
      set_preview('');
      return;
    }
    const url = URL.createObjectURL(file);
    set_preview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /**
   * Gửi form lưu dữ liệu POI
   */
  async function save(event: React.FormEvent) {
    event.preventDefault();
    set_error('');

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      set_error('Tọa độ không hợp lệ. Vĩ độ phải từ -90 đến 90, kinh độ từ -180 đến 180.');
      return;
    }

    set_saving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        visitor_description: form.visitor_description.trim(),
        address: form.address.trim(),
        category: form.category,
        source_language: form.source_language,
        is_published: form.is_published,
        latitude: lat,
        longitude: lng,
        image_credit: form.image_credit.trim() || null,
        image_source_url: form.image_source_url.trim() || null,
        image_license_url: form.image_license_url.trim() || null,
      };

      const path = poi ? `/pois/${encodeURIComponent(poi.id)}` : '/pois';
      const method = poi ? 'PUT' : 'POST';
      const result = await api<{ data: Poi }>(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Tải ảnh lên nếu có chọn file mới
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('image_credit', form.image_credit.trim());
        if (form.image_source_url.trim())
          formData.append('image_source_url', form.image_source_url.trim());
        if (form.image_license_url.trim())
          formData.append('image_license_url', form.image_license_url.trim());

        await api(`/pois/${encodeURIComponent(result.data.id)}/image`, {
          method: 'POST',
          body: formData,
        });
      }

      on_saved();
    } catch (failure) {
      set_error(failure instanceof Error ? failure.message : 'Không thể lưu địa điểm.');
    } finally {
      set_saving(false);
    }
  }

  return {
    dialog,
    form,
    set_form,
    file,
    set_file,
    preview,
    error,
    set_error,
    saving,
    locating,
    matches,
    set_matches,
    location_note,
    set_location_note,
    set_address_revision,
    set,
    choose_location,
    save,
    LANGUAGE_NAMES,
    poi,
    on_close,
    categories,
  };
}

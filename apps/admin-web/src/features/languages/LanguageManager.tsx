/**
 * @file LanguageManager.tsx
 * @description Phân hệ Quản lý Ngôn ngữ Thuyết minh (Languages Feature)
 * Hiển thị danh sách các ngôn ngữ được hỗ trợ trong hệ thống thuyết minh đa ngôn ngữ.
 */

import React from 'react';

interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  ttsEngine: string;
  status: 'active' | 'beta';
}

const SUPPORTED_LANGUAGES: LanguageItem[] = [
  {
    code: 'vi',
    name: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    ttsEngine: 'Azure Neural / Gemini TTS',
    status: 'active',
  },
  {
    code: 'en',
    name: 'Tiếng Anh',
    nativeName: 'English',
    ttsEngine: 'Google Standard / Azure Neural',
    status: 'active',
  },
  {
    code: 'fr',
    name: 'Tiếng Pháp',
    nativeName: 'Français',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'de',
    name: 'Tiếng Đức',
    nativeName: 'Deutsch',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'es',
    name: 'Tiếng Tây Ban Nha',
    nativeName: 'Español',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'it',
    name: 'Tiếng Ý',
    nativeName: 'Italiano',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'pt',
    name: 'Tiếng Bồ Đào Nha',
    nativeName: 'Português',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'ru',
    name: 'Tiếng Nga',
    nativeName: 'Русский',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'ja',
    name: 'Tiếng Nhật',
    nativeName: '日本語',
    ttsEngine: 'Azure Neural / Google',
    status: 'active',
  },
  {
    code: 'ko',
    name: 'Tiếng Hàn',
    nativeName: '한국어',
    ttsEngine: 'Azure Neural / Google',
    status: 'active',
  },
  {
    code: 'zh-CN',
    name: 'Tiếng Trung (Giản thể)',
    nativeName: '简体中文',
    ttsEngine: 'Azure Neural / Google',
    status: 'active',
  },
  {
    code: 'th',
    name: 'Tiếng Thái',
    nativeName: 'ไทย',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'id',
    name: 'Tiếng Indonesia',
    nativeName: 'Bahasa Indonesia',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'ms',
    name: 'Tiếng Mã Lai',
    nativeName: 'Bahasa Melayu',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'ar',
    name: 'Tiếng Ả Rập',
    nativeName: 'العربية',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
  {
    code: 'hi',
    name: 'Tiếng Hindi',
    nativeName: 'हिन्दी',
    ttsEngine: 'Azure Neural',
    status: 'active',
  },
];

export function LanguageManager() {
  return (
    <section className="panel language-manager">
      <div className="panel-title">
        <div>
          <h2>Danh sách ngôn ngữ thuyết minh ({SUPPORTED_LANGUAGES.length})</h2>
          <p>Các ngôn ngữ được dịch tự động và tổng hợp giọng đọc AI cho du khách quốc tế.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã ngôn ngữ</th>
              <th>Tên tiếng Việt</th>
              <th>Tên bản ngữ</th>
              <th>Công nghệ giọng đọc (TTS)</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <tr key={lang.code}>
                <td>
                  <code>{lang.code}</code>
                </td>
                <td>
                  <strong>{lang.name}</strong>
                </td>
                <td>{lang.nativeName}</td>
                <td>
                  <small>{lang.ttsEngine}</small>
                </td>
                <td>
                  <span className="publish-status published">Sẵn sàng</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

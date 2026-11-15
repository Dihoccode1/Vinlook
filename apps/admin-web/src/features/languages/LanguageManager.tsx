/**
 * @file LanguageManager.tsx
 * @description Phân hệ Quản lý Ngôn ngữ Thuyết minh (Languages Feature)
 * Hiển thị danh sách các ngôn ngữ được hỗ trợ trong hệ thống thuyết minh đa ngôn ngữ.
 */

import React from 'react';
import { Badge } from '@vinlook/ui/badge';
import { Card } from '@vinlook/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';

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
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
      <div className="px-[22px] py-[21px]">
        <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
          Danh sách ngôn ngữ thuyết minh ({SUPPORTED_LANGUAGES.length})
        </h2>
        <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
          Các ngôn ngữ được dịch tự động và tổng hợp giọng đọc AI cho du khách quốc tế.
        </p>
      </div>

      <Table className="w-full text-xs">
        <TableHeader className="sr-only sm:not-sr-only sm:bg-[#fbfcf9]">
          <TableRow className="border-[#edf1e7] hover:bg-transparent">
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Mã ngôn ngữ
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Tên tiếng Việt
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Tên bản ngữ
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Công nghệ giọng đọc (TTS)
            </TableHead>
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Trạng thái
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TableRow
              key={lang.code}
              className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0"
            >
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-[22px] sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Mã</span>
                <code className="rounded bg-[#f0f4eb] px-1.5 py-0.5 font-mono text-[11px] text-[#2d473a]">
                  {lang.code}
                </code>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                  Tên tiếng Việt
                </span>
                <strong className="font-semibold text-foreground">{lang.name}</strong>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                  Tên bản ngữ
                </span>
                <span>{lang.nativeName}</span>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">TTS</span>
                <small className="text-[11px] text-[#6a7c66]">{lang.ttsEngine}</small>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-[22px] sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Trạng thái</span>
                <Badge variant="success" className="px-2 py-1 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3f7a53]" />
                  Sẵn sàng
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

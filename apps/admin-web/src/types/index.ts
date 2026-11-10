/**
 * @file index.ts
 * @description Định nghĩa các kiểu dữ liệu dùng chung cho phân hệ quản trị (Admin Web)
 * Đồ án Công nghệ Phần mềm - Nền tảng du lịch đa ngôn ngữ Vinlook
 */

/**
 * Thông tin điểm tham quan (Point of Interest)
 */
export interface Poi {
  id: string;
  name: string;
  slug: string;
  description: string;
  visitor_description?: string;
  address: string;
  category: string;
  latitude: number;
  longitude: number;
  source_language: string;
  is_published: boolean;
  updated_at: string;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  image_license_url: string | null;
}

/**
 * Thống kê tổng quan hệ thống điểm tham quan
 */
export interface Stats {
  total: number;
  published: number;
  drafts: number;
  with_images: number;
  categories: {
    category: string;
    total: number;
  }[];
}

/**
 * Tài khoản người dùng nội bộ (Quản trị viên / Nhân viên)
 */
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'staff';
  status: 'active' | 'disabled';
  login_locked: boolean;
  created_at: string;
}

/**
 * Mẫu dữ liệu đo lường hoạt động theo thời gian
 */
export interface ActivitySample {
  time: number;
  visitors: number | null;
  listeners: number | null;
}

/**
 * Dữ liệu mã QR điểm tham quan
 */
export interface QrData {
  poi_id: string;
  qr_token: string;
  qr_path: string;
}

/**
 * Kết quả khớp địa chỉ tọa độ địa lý
 */
export interface AddressMatch {
  label: string;
  latitude: number;
  longitude: number;
}

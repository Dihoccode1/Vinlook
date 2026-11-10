/**
 * @file main.tsx
 * @description Điểm khởi tạo (entry point) của ứng dụng Quản trị (Admin Web).
 * Gắn cây giao diện React vào phần tử #root và bọc cổng xác thực AdminAccess.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminAccess } from './features/auth/AdminAccess';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminAccess />
  </StrictMode>
);

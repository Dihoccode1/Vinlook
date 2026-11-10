/**
 * @file main.tsx
 * @description Điểm khởi chạy ứng dụng React cho giao diện du khách Vinlook (User Web).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { App } from './App.jsx';
import './styles.css';
import { LocaleProvider } from './i18n/provider.jsx';
import { Admin } from './staff/Admin.jsx';
const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/staff/*', element: <Admin /> },
]);
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminAccess } from './AdminAccess';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><AdminAccess/></StrictMode>);

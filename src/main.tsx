import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { storageEvents } from './lib/storage';
import { toast } from './store/toastStore';

storageEvents.onSaveFailed = () =>
  toast(
    { tone: 'error', title: 'Changes can’t be saved', body: 'This browser blocked storage or it is full. Changes last until you close the page; export a backup in Settings.' },
    8000,
  );

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
);

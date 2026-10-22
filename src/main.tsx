import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for offline PWA support and cache-first shell loading in production
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.info('[SomaSikolo PWA] New update available, updating service worker...');
        updateSW(true);
      },
      onOfflineReady() {
        console.info('[SomaSikolo PWA] Application ready for full offline operation.');
      },
      onRegisterError(error) {
        console.warn('[SomaSikolo PWA] Service Worker registration warning:', error);
      }
    });
  } catch (err) {
    console.debug('[SomaSikolo PWA] Service Worker registration skipped:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

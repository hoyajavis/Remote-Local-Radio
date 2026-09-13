/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/translations.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

// Register PWA Service Worker for standalone/offline support in production;
// In development, actively unregister any stale service workers and clear cache storage.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('[TimeShift PWA] Unregistered Service Worker for development');
        });
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          registration.update();
          console.log('[TimeShift PWA] Service Worker registered with scope:', registration.scope);
        },
        (error) => {
          console.warn('[TimeShift PWA] Service Worker registration failed:', error);
        }
      );
    });
  }
}


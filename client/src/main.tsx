import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.js';
import './index.css';

// Seamless Service Worker auto-upgrade:
// Visitors who previously installed the legacy CacheFirst SW (which showed only 2 games)
// get upgraded immediately on controllerchange without requiring a manual browser refresh.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadExistingController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadExistingController || refreshing) return;
    // Never interrupt an active live multiplayer round mid-turn
    if (document.documentElement.hasAttribute('data-in-live-match')) return;

    const lastReload = Number(sessionStorage.getItem('sekou_sw_reload_ts') || '0');
    if (Date.now() - lastReload < 10_000) return;

    refreshing = true;
    sessionStorage.setItem('sekou_sw_reload_ts', String(Date.now()));
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registration.update().catch(() => {});
      window.setInterval(() => {
        registration.update().catch(() => {});
      }, 60_000);
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


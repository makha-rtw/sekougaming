import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.js';
import './index.css';

// Seamless Service Worker auto-upgrade:
// Whenever a new version is deployed, the new Service Worker activates and claims control.
// The page automatically reloads to display the latest version without requiring a manual refresh.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    // Never interrupt an active live multiplayer round mid-turn
    if (document.documentElement.hasAttribute('data-in-live-match')) return;

    const lastReload = Number(sessionStorage.getItem('sekou_sw_reload_ts') || '0');
    if (Date.now() - lastReload < 6_000) return;

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
      }, 30_000);
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


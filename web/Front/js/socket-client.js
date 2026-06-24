/* ============================================================
   SENTINEL AI — Socket.IO client → /dashboard namespace
   Dispatches DocumentEvent "sentinel:socket" with { event, payload }
   ============================================================ */

'use strict';

(function () {
  const DASHBOARD_EVENTS = [
    'alert:created',
    'alert:updated',
    'incident:created',
    'incident:updated',
    'incident:deleted',
    'incident:restored',
    'camera:statusChanged',
    'camera:toggled',
    'user:active'
  ];

  let socket = null;

  function getServerOrigin() {
    const base =
      (typeof window !== 'undefined' && window.API_BASE) ||
      'http://localhost:3000/dashboard/api';
    try {
      const u = new URL(base, typeof window !== 'undefined' ? window.location.origin : undefined);
      return u.origin;
    } catch (_) {
      return 'http://localhost:3000';
    }
  }

  function disconnect() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  }

  function connect() {
    if (typeof window.io !== 'function') return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    if (socket && socket.connected) return;

    disconnect();

    const origin = getServerOrigin();
    const url = origin + '/dashboard';
    socket = window.io(url, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('[socket] connected', socket.id);
      const uid = typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : null;
      if (uid) socket.emit('user:connected', uid);
    });

    socket.on('connect_error', err => {
      console.warn('[socket] connect_error', err && err.message);
    });

    socket.on('disconnect', reason => {
      console.log('[socket] disconnected', reason);
    });

    const alertSound = new Audio('dontopen/faaah.mp3');

    DASHBOARD_EVENTS.forEach(ev => {
      socket.on(ev, payload => {
        let shouldPlay = false;

        if (ev === 'camera:statusChanged' && payload && payload.status === 'offline') {
          shouldPlay = true;
        } else if (ev === 'alert:created') {
          shouldPlay = true;
        } else if (ev === 'incident:created' || ev === 'incident:updated') {
          const role = typeof window.getCurrentUserRole === 'function' ? window.getCurrentUserRole() : '';
          const uid = typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : '';
          if (role === 'security') {
            const hid = payload?.handledBy && typeof payload.handledBy === 'object' ? payload.handledBy._id : payload?.handledBy;
            if (String(hid) === String(uid)) {
              shouldPlay = true;
            }
          }
        }

        if (shouldPlay && localStorage.getItem('isMuted') !== 'true') {
          alertSound.currentTime = 0;
          alertSound.play().catch(err => console.warn('Audio play failed:', err));
        }

        document.dispatchEvent(
          new CustomEvent('sentinel:socket', {
            bubbles: true,
            detail: { event: ev, payload }
          })
        );
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) connect();
  });

  window.__sentinelSocketConnect = connect;
  window.__sentinelSocketDisconnect = disconnect;
})();

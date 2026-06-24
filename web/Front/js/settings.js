/* ============================================================
   SENTINEL AI — Settings — SPA + standalone
   ============================================================ */

'use strict';

function bootSettingsPage() {
  State.currentPage = 'settings';
  if (typeof hideLoader === 'function') hideLoader();
  renderSettingsPage();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) {
    if (typeof hideLoader === 'function') hideLoader();
    return;
  }
  applyTheme(State.theme);
  applyLang(State.lang);
  bindTopbarActions();
  bindSidebarToggle();
  if (window.__SPA_ENABLED__) {
    document.addEventListener('spa:route', e => {
      if (e.detail.page === 'settings') bootSettingsPage();
    });
  } else {
    hideLoader();
    bootSettingsPage();
  }
});

function updateLiveBadges() {}

function renderSettingsPage() {
  const el = document.getElementById('langSelect');
  if (el) el.value = State.lang;
  const th = document.getElementById('themeSelect');
  if (th) th.value = State.theme;

  /* Sync mute toggle with localStorage */
  const muteToggle = document.getElementById('muteSoundToggle');
  if (muteToggle) muteToggle.checked = localStorage.getItem('isMuted') === 'true';
}

function applySettings() {
  const lang = document.getElementById('langSelect')?.value;
  const theme = document.getElementById('themeSelect')?.value;
  if (lang) applyLang(lang);
  if (theme) applyTheme(theme);
  showToast('Settings saved successfully', 'success');
}

function toggleMuteSound() {
  const muteToggle = document.getElementById('muteSoundToggle');
  if (!muteToggle) return;
  const muted = muteToggle.checked;
  localStorage.setItem('isMuted', muted ? 'true' : 'false');
  showToast(muted ? 'Alert sounds muted' : 'Alert sounds unmuted', muted ? 'warning' : 'success');
}

window.applySettings = applySettings;
window.toggleMuteSound = toggleMuteSound;
window.toggleTheme = toggleTheme;
window.applyLang = applyLang;
window.showToast = showToast;

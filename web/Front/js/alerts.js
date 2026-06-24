/* ============================================================
   SENTINEL AI — Alerts page (SPA + standalone)
   ============================================================ */

'use strict';

function alertIsWeaponType(type) {
  return String(type || '').toLowerCase() === 'weapon';
}

function bootAlertsPage() {
  State.currentPage = 'alerts';
  bindAlertFilters();
  loadAlerts();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) {
    hideLoader();
    return;
  }
  applyTheme(State.theme);
  applyLang(State.lang);
  bindTopbarActions();
  bindSidebarToggle();
  if (window.__SPA_ENABLED__) {
    document.addEventListener('spa:route', e => {
      if (e.detail.page === 'alerts') {
        if (!State._alertsBooted) {
          State._alertsBooted = true;
          bootAlertsPage();        // first visit: fetch + render
        } else {
          State.currentPage = 'alerts';
          renderAlertsPage();      // subsequent visits: re-render from State
        }
      }
    });
  } else {
    hideLoader();
    bootAlertsPage();
  }
});

function updateLiveBadges() {}

function loadAlerts() {
  console.trace('loadAlerts');

  return Promise.all([apiRequest('/alert/'), apiRequest('/camera/')])
    .then(([alertRes, camRes]) => {
      State.cameraList = asArray(camRes).map(c => mapCameraFromApi(c));
      const alerts = asArray(alertRes);
      State.alertList = alerts.map(a => {
        const camAi = String(a.cameraAiId || a.camera?.cameraAiId || '').trim();
        return {
          id: a.id || a._id,
          sid: a.sid,
          isDeleted: a.isDeleted === true,
          cameraAiId: camAi || '—',
          cam: camAi || '—',
          camId: a.cameraId != null ? String(a.cameraId) : (a.camera?.id != null ? String(a.camera.id) : ''),
          type: a.type || a.alertType || 'unknown',
          typeLabel: alertTypeLabel(a.type || a.alertType),
          status: a.status || 'new',
          time: (a.createdAt || a.timestamp || a.time || '').toString().replace('T', ' ').slice(0, 19),
          confidence: alertConfidencePercent(a.confidence != null ? a.confidence : a.score),
          details: a.details || a.description || 'No details provided.',
          frameImageUrl: a.frameImageUrl || ''
        };
      });
      const cnt = document.getElementById('alertCount');
      if (cnt) cnt.textContent = String(State.alertList.filter(x => !x.isDeleted).length);
      updateCameraFilterOptions();
      renderAlertsPage();
    })
    .catch(err => handleApiCatch(err, 'Failed to fetch alerts.'))
    .finally(() => hideLoader());
}

let alertFilters = { date: '', camera: '', type: '', search: '' };

function renderAlertsPage() {
  const filtered = filterAlerts();
  buildAlertsTable(filtered);
}

function filterAlerts() {
  return State.alertList.filter(a => {
    const f = alertFilters;
    if (f.date && !a.time.startsWith(f.date)) return false;
    if (f.camera && String(a.camId) !== String(f.camera)) return false;
    if (f.type && String(a.type).toLowerCase() !== String(f.type).toLowerCase()) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const sidStr = a.sid != null && a.sid !== '' ? String(a.sid) : '';
      const hay = `${a.id} ${sidStr} ${a.cam} ${a.cameraAiId || ''} ${a.type}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function restoreAlertById(id) {
  if (!userIsSuperAdmin()) return;
  apiRequest(`/alert/${id}/restore`, { method: 'PATCH' })
    .then(() => {
      showToast('Alert restored.', 'success');
      // Update state locally, no re-fetch needed
      const a = State.alertList.find(x => String(x.id) === String(id));
      if (a) a.isDeleted = false;
      renderAlertsPage();
    })
    .catch(err => handleApiCatch(err, 'Restore failed.'));
}

function buildAlertsTable(alerts) {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;
  const isSuper = userIsSuperAdmin();
  const canArchiveRestore = isSuper;
  const canInc = userCanOpenIncident();
  const canFalse = userCanMarkFalseAlert();
  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-bell-slash"></i><h5>No Alerts Found</h5><p>No alerts match your current filters.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = alerts.map(a => {
    const idDisp = a.sid != null && a.sid !== '' ? a.sid : a.id;
    const rowCls = `clickable-row ${deletedRowClassForSuper(a.isDeleted)}`.trim();
    const delBadge = deletedRowBadgeForSuper(a.isDeleted);
    return `
    <tr class="${rowCls}" role="button" tabindex="0" onclick="viewAlertDetail('${a.id}')">
      <td><span class="font-mono text-primary-custom">${idDisp}</span>${delBadge}</td>
      <td>${formatDateTime(a.time)}</td>
      <td><span>${a.cam}</span></td>
      <td><span class="badge-status ${alertIsWeaponType(a.type) ? 'badge-weapon' : 'badge-harassment'}">${a.typeLabel}</span></td>
      <td><span class="badge fw-600">${a.confidence}%</span></td>
      <td>${statusBadge(a.status)}</td>
      <td onclick="event.stopPropagation()">
        <div class="d-flex gap-1 flex-wrap">
          <button type="button" class="btn-icon" title="View Details" onclick="viewAlertDetail('${a.id}')"><i class="fas fa-eye"></i></button>
          ${canInc && !a.isDeleted && !alertLocksAfterIncident(a.status) ? `<button type="button" class="btn-icon" title="Open incident" onclick="openIncidentFromAlert('${a.id}')"><i class="fas fa-folder-open"></i></button>` : ''}
          ${canFalse && !a.isDeleted && !alertLocksAfterIncident(a.status) ? `<button type="button" class="btn-icon" title="Mark False Alert" onclick="markFalseAlert('${a.id}')"><i class="fas fa-times"></i></button>` : ''}
          ${canArchiveRestore && !a.isDeleted ? `<button type="button" class="btn-icon danger" title="Archive alert" onclick="softDeleteAlert('${a.id}')"><i class="fas fa-box-archive"></i></button>` : ''}
          ${canArchiveRestore && a.isDeleted ? `<button type="button" class="btn-icon" title="Restore alert" onclick="restoreAlertById('${a.id}')"><i class="fas fa-rotate-left"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function updateCameraFilterOptions() {
  const sel = document.getElementById('filterCamera');
  if (!sel) return;
  const cur = sel.value;
  const list = State.cameraList.filter(c => !c.isDeleted);
  sel.innerHTML = '<option value="">All Cameras</option>' +
    list.map(c => `<option value="${c.id}" ${String(cur) === String(c.id) ? 'selected' : ''}>${c.name}</option>`).join('');
}

window.bindAlertFilters = function() {
  const apply = () => {
    alertFilters.date = document.getElementById('filterDate')?.value || '';
    alertFilters.camera = document.getElementById('filterCamera')?.value || '';
    alertFilters.type = document.getElementById('filterType')?.value || '';
    renderAlertsPage();
  };
  ['filterDate', 'filterCamera', 'filterType'].forEach(id => document.getElementById(id)?.addEventListener('change', apply));
  document.getElementById('alertSearch')?.addEventListener('input', e => {
    alertFilters.search = e.target.value;
    renderAlertsPage();
  });
};

window.loadAlerts = loadAlerts;
window.renderAlertsPage = renderAlertsPage;
window.restoreAlertById = restoreAlertById;
window.updateCameraFilterOptions = updateCameraFilterOptions;
window.toggleTheme = toggleTheme;
window.applyLang = applyLang;
window.showToast = showToast;

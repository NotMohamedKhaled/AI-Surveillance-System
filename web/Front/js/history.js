/* ============================================================
   SENTINEL AI — Incidents — SPA + standalone
   ============================================================ */

'use strict';

function bootIncidentsPage() {
  State.currentPage = 'incidents';
  loadIncidents();
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
      if (e.detail.page === 'incidents') bootIncidentsPage();
    });
  } else {
    hideLoader();
    bootIncidentsPage();
  }
});

function updateLiveBadges() {}

function mapIncidentRow(i) {
  const cam = i.cameraId;
  const alertDoc = i.alertId;
  const handler = i.handledBy;
  const camObj = cam && typeof cam === 'object' ? cam : {};
  const alertObj = alertDoc && typeof alertDoc === 'object' ? alertDoc : {};
  const handlerObj = handler && typeof handler === 'object' ? handler : null;
  const cameraAiId = String(camObj.cameraAiId || '').trim();
  const handledById = handlerObj ? String(handlerObj._id) : String(i.handledBy || '');
  const alertSid = alertObj.sid != null ? String(alertObj.sid) : (i.alertSid != null ? String(i.alertSid) : '');
  const conf = alertObj.confidence != null ? alertObj.confidence : i.confidence;
  return {
    id: String(i._id || i.id),
    sid: i.sid != null ? String(i.sid) : '',
    alertSid,
    alertId: alertObj._id ? String(alertObj._id) : (alertObj.id ? String(alertObj.id) : (i.alertId != null && typeof i.alertId !== 'object' ? String(i.alertId) : '')),
    cam: cameraAiId || camObj.name || '—',
    cameraAiId: cameraAiId || '—',
    type: 'incident',
    typeLabel: 'Incident',
    status: i.status || 'open',
    statusLabel: incidentStatusLabel(i.status),
    time: (i.createdAt || i.time || '').toString().replace('T', ' ').slice(0, 19),
    confidence: alertConfidencePercent(conf != null ? conf : 0),
    details: i.responseNotes && i.responseNotes !== 'N/A' ? i.responseNotes : '',
    frameImageUrl: i.frameImageUrl || alertObj.frameImageUrl || '',
    responseNotes: i.responseNotes === 'N/A' ? '' : (i.responseNotes || ''),
    handledById,
    handledByName: (handlerObj && handlerObj.name) || '—',
    isDeleted: i.isDeleted === true
  };
}

function loadIncidents() {
  return apiRequest('/incident/')
    .then(res => {
      const incidents = asArray(res);
      const role = getCurrentUserRole();
      const uid = getCurrentUserId();
      
      let mapped = incidents.map(mapIncidentRow);
      if (role === 'security') {
        mapped = mapped.filter(a => a.handledById === uid);
      }
      
      State.incidentList = mapped;
      renderIncidentsPage();
    })
    .catch(err => handleApiCatch(err, 'Failed to fetch incidents.'))
    .finally(() => hideLoader());
}

function renderIncidentsPage() {
  const role = getCurrentUserRole();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSecurity = role === 'security';

  const theadTr = document.querySelector('#page-incidents table thead tr');
  if (theadTr && theadTr.children[3]) {
    theadTr.children[3].innerText = 'Handled By';
  }

  const search = document.getElementById('histSearch')?.value?.toLowerCase() || '';
  const type = document.getElementById('histType')?.value || '';
  const status = document.getElementById('histStatus')?.value || '';
  const filtered = State.incidentList.filter(a => {
    if (type && String(a.type).toLowerCase() !== String(type).toLowerCase()) return false;
    if (status && String(a.status) !== String(status)) return false;
    if (search) {
      const hay = `${a.id} ${a.sid || ''} ${a.alertSid || ''} ${a.cam} ${a.cameraAiId || ''} ${a.handledByName || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (State.incidentFilterHour != null) {
      if (!a.time) return false;
      const h = new Date(a.time).getHours();
      const binLabel = String(Math.floor(h / 2) * 2).padStart(2, '0');
      if (binLabel !== State.incidentFilterHour) return false;
    }
    return true;
  });
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-inbox"></i><h5>No incidents</h5><p>No records match your filters.</p></div></td></tr>`;
  } else {
    const canArchiveInc = userIsSuperAdmin() || userIsAdmin();
    tbody.innerHTML = filtered.map((a, i) => `
      <tr class="animate-in clickable-row ${deletedRowClassForSuper(a.isDeleted)}" style="animation-delay:${i * 0.03}s;cursor:pointer" role="button" tabindex="0"
          onclick="viewIncidentDetail('${a.id}')">
        <td><span class=" text-primary-custom">${a.sid || a.id}</span>${deletedRowBadgeForSuper(a.isDeleted)}</td>
        <td>${formatDateTime(a.time)}</td>
        <td><span>${a.cameraAiId || a.cam}</span></td>
        <td><span>${a.handledByName || '—'} ${a.handledById === getCurrentUserId() ? '(You)' : ''}</span></td>
        <td><span class="badge fw-600">${a.confidence}%</span></td>
        <td><span class="badge-status ${a.status === 'closed' ? 'badge-resolved' : a.status === 'open' ? 'badge-pending' : 'badge-warning'}">${a.statusLabel || incidentStatusLabel(a.status)}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="d-flex gap-1 flex-wrap align-items-center">
            <button type="button" class="btn-icon" title="View details" onclick="viewIncidentDetail('${a.id}')"><i class="fas fa-eye"></i></button>
            ${canArchiveInc && !a.isDeleted ? `<button type="button" class="btn-icon danger" title="Archive" onclick="event.stopPropagation();deleteIncidentById('${a.id}')"><i class="fas fa-box-archive"></i></button>` : ''}
            ${canArchiveInc && a.isDeleted ? `<button type="button" class="btn-icon" title="Restore" onclick="event.stopPropagation();restoreIncidentById('${a.id}')"><i class="fas fa-rotate-left"></i></button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  }
  setTimeout(renderIncidentsChart, 100);
}

function renderIncidentsChart() {
  const ctx = document.getElementById('historyLineChart');
  if (!ctx) return;
  if (State.charts.line) State.charts.line.destroy();
  const isDark = State.theme === 'dark';
  const groupedByHour = {};
  State.incidentList.forEach(a => {
    if (!a.time) return;
    const h = new Date(a.time).getHours();
    const binLabel = String(Math.floor(h / 2) * 2).padStart(2, '0');
    groupedByHour[binLabel] = (groupedByHour[binLabel] || 0) + 1;
  });
  const labels = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
  const counts = labels.map(h => groupedByHour[h] || 0);
  
  const pointBgColors = labels.map(h => h === State.incidentFilterHour ? (isDark ? '#ff3b5c' : '#dc2626') : '#00d4ff');
  const pointRadii = labels.map(h => h === State.incidentFilterHour ? 6 : 4);

  State.charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Incidents',
        data: counts,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0,212,255,0.08)',
        borderWidth: 2,
        pointRadius: pointRadii,
        pointBackgroundColor: pointBgColors,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onHover: (e, elements) => {
        e.native.target.style.cursor = elements && elements.length ? 'pointer' : 'default';
      },
      onClick: (e, elements) => {
        if (elements && elements.length > 0) {
          const clickedLabel = labels[elements[0].index];
          if (State.incidentFilterHour === clickedLabel) {
            State.incidentFilterHour = null;
          } else {
            State.incidentFilterHour = clickedLabel;
          }
          renderIncidentsPage();
        }
      },
      scales: {
        x: {
          grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
          ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } }
        },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
          ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } },
          beginAtZero: true
        }
      }
    }
  });
}

function viewIncidentDetail(id) {
  apiRequest(`/incident/${id}`)
    .then(res => {
      const raw = res?.data || res;
      const a = mapIncidentRow(raw);
      const content = document.getElementById('alertDetailContent');
      if (!content) return;
      const camShow = a.cameraAiId && a.cameraAiId !== '—' ? a.cameraAiId : a.cam;
      const role = getCurrentUserRole();
      const uid = getCurrentUserId();
      const isHandler = role === 'security' && a.handledById && uid && a.handledById === uid;
      const canElevated = role === 'admin' || role === 'super_admin';
      const canEdit = isHandler || canElevated;

      let actionsHtml = '';
      if (canEdit && !a.isDeleted) {
        const statusOpts = ['open', 'in_progress', 'closed']
          .map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${incidentStatusLabel(s)}</option>`)
          .join('');
        const reassignBlock =
          canElevated
            ? `<div class="mb-2"><label class="form-label small">Reassign handler (security)</label><select class="form-select form-select-sm" id="incidentEditHandler"><option value="">— keep —</option></select></div>`
            : '';
        actionsHtml += `
          <div class="mt-3">
            <label class="form-label small">Status</label>
            <select class="form-select form-select-sm" id="incidentEditStatus">${statusOpts}</select>
            <label class="form-label small mt-2">Response notes</label>
            <textarea class="form-control form-control-sm" id="incidentEditNotes" rows="3" placeholder="Notes"></textarea>
            ${reassignBlock}
            <button type="button" class="btn-primary-custom btn-sm mt-2" onclick="submitIncidentPatch('${a.id}')"><i class="fas fa-save"></i> Save</button>
          </div>`;
      }

      content.innerHTML = `
    <div class="row g-4">
      <div class="col-12">
        <div class="card"><div class="card-body">
          <h6 class="card-title mb-3" style="font-size:0.85rem">Incident</h6>
          <div class="d-flex flex-column gap-3">
            ${detailRow('fas fa-fingerprint', 'Incident ID', `<span class=" text-primary-custom">${a.sid || a.id}</span>${deletedRowBadgeForSuper(a.isDeleted)}`)}
            ${detailRow('fas fa-bell', 'Alert #', a.alertId ? `<span class=" text-primary-custom" style="cursor:pointer;text-decoration:underline;" onclick="viewAlertDetail('${a.alertId}')">${a.alertSid || 'View Alert'}</span>` : `<span class="font-mono">${a.alertSid || '—'}</span>`)}
            ${detailRow('fas fa-user', 'Handled by', `${a.handledByName}`)}
            ${detailRow('fas fa-fingerprint', 'Camera AI ID', `<span>${camShow}</span>`)}
            ${detailRow('fas fa-clock', 'Opened', formatDateTime(a.time))}
            ${detailRow('fas fa-percentage', 'Confidence', `${a.confidence}%`)}
            ${detailRow('fas fa-circle-half-stroke', 'Status', a.statusLabel || incidentStatusLabel(a.status))}
          </div>
          ${actionsHtml}
        </div></div>
      </div>
    </div>`;

      if (canElevated && !a.isDeleted && canEdit) {
        apiRequest('/user/')
          .then(ur => {
            const sel = document.getElementById('incidentEditHandler');
            if (!sel) return;
            const users = asArray(ur).filter(
              u => String(u.role || '').replace(/\s+/g, '_') === 'security'
            );
            sel.innerHTML =
              '<option value="">— keep —</option>' +
              users
                .map(u => {
                  const oid = String(u.id || u._id);
                  return `<option value="${oid}" ${oid === a.handledById ? 'selected' : ''}>${u.name || u.email}</option>`;
                })
                .join('');
          })
          .catch(() => {});
      }

      const modalEl = document.getElementById('alertDetailModal');
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
      const ta = document.getElementById('incidentEditNotes');
      if (ta) ta.value = a.responseNotes || '';
    })
    .catch(err => handleApiCatch(err, 'Could not load incident.'));
}

function submitIncidentPatch(id) {
  const status = document.getElementById('incidentEditStatus')?.value;
  const notes = document.getElementById('incidentEditNotes')?.value;
  const handlerSel = document.getElementById('incidentEditHandler');
  const body = {};
  if (status) body.status = status;
  if (notes !== undefined && notes !== null) body.responseNotes = notes;
  if (handlerSel && handlerSel.value) body.handledBy = handlerSel.value;

  apiRequest(`/incident/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    .then(() => {
      showToast('Incident updated.', 'success');
      bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide();
      loadIncidents();
    })
    .catch(err => handleApiCatch(err, 'Update failed.'));
}

function deleteIncidentById(id) {
  openConfirmModal({
    title: 'Archive this incident?',
    message: 'You can restore it later from this list.',
    confirmText: 'Archive',
    onConfirm: () => {
      apiRequest(`/incident/${id}`, { method: 'DELETE' })
        .then(() => {
          showToast('Incident archived.', 'success');
          bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide();
          loadIncidents();
        })
        .catch(err => handleApiCatch(err, 'Delete failed.'));
    }
  });
}

function restoreIncidentById(id) {
  apiRequest(`/incident/${id}/restore`, { method: 'PATCH' })
    .then(() => {
      showToast('Incident restored.', 'success');
      bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide();
      loadIncidents();
    })
    .catch(err => handleApiCatch(err, 'Restore failed.'));
}

window.loadIncidents = loadIncidents;
window.renderHistoryPage = renderIncidentsPage;
window.renderHistoryChart = renderIncidentsChart;
window.viewIncidentDetail = viewIncidentDetail;
window.submitIncidentPatch = submitIncidentPatch;
window.deleteIncidentById = deleteIncidentById;
window.restoreIncidentById = restoreIncidentById;
window.toggleTheme = toggleTheme;
window.applyLang = applyLang;
window.showToast = showToast;

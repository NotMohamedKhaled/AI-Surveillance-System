/* ============================================================
   SENTINEL AI — Cameras page (SPA + standalone)
   ============================================================ */

'use strict';

function applyCameraRbac() {
  const addBtn = document.getElementById('btnAddCamera');
  if (addBtn) addBtn.classList.toggle('d-none', !cameraRoleCanCreate());
}

function bootCamerasPage() {
  State.currentPage = 'cameras';
  applyCameraRbac();
  loadCameras();
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
      if (e.detail.page === 'cameras') bootCamerasPage();
    });
  } else {
    hideLoader();
    bootCamerasPage();
  }
});

function updateLiveBadges() {}

function loadCameras() {
  apiRequest('/camera/')
    .then(res => {
      const cameras = asArray(res);
      State.cameraList = cameras.map(c => mapCameraFromApi(c));
      renderCamerasPage();
    })
    .catch(err => showToast(err.message || 'Failed to fetch cameras.', 'danger'))
    .finally(() => hideLoader());
}

function renderCamerasPage() {
  const tbody = document.getElementById('camerasTableBody');
  if (!tbody) return;
  const searchValue = (document.getElementById('cameraSearchInput')?.value || '').trim().toLowerCase();
  const filteredCameras = State.cameraList.filter(c => {
    if (!searchValue) return true;
    const hay = `${c.name} ${c.status} ${c.ip} ${c.rtspUrl} ${c.cameraAiId} ${c.location}`.toLowerCase();
    return hay.includes(searchValue);
  });

  const canUpdate = cameraRoleCanUpdate();
  const canTog = cameraRoleCanToggle();
  const canArchiveDelete = userIsSuperAdmin();

  if (filteredCameras.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-video-slash"></i><h5>No Cameras</h5><p>Add your first camera to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filteredCameras.map(c => {
    const enabled =c.isEnabled? `Enabled`:`Disabled`;
    const delBadge = deletedRowBadgeForSuper(c.isDeleted);
    const restoreBtn = canArchiveDelete && c.isDeleted
      ? `<button type="button" class="btn-icon" title="Restore camera" onclick="event.stopPropagation();restoreCamera('${c.id}')"><i class="fas fa-rotate-left"></i></button>`
      : '';
    const archiveBtn = canArchiveDelete && !c.isDeleted
      ? `<button type="button" class="btn-icon danger" title="Archive (soft delete)" onclick="event.stopPropagation();deleteCamera('${c.id}')"><i class="fas fa-box-archive"></i></button>`
      : '';
    return `
    <tr class="clickable-row ${deletedRowClassForSuper(c.isDeleted)}" role="button" tabindex="0" onclick="openCameraDetailModalById('${c.id}')">
      <td><div class="d-flex align-items-center gap-2">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--primary-glow);display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:var(--primary)"><i class="fas fa-video"></i></div>
        <div><div style="font-weight:600;font-size:0.85rem">${c.name}${delBadge ? ' ' + delBadge : ''}</div><div style="font-size:0.7rem;color:var(--text-muted)">${c.cameraAiId || '—'}</div></div>
      </div></td>
      <td><span class="badge-status badge-cam-${c.isEnabled}">${enabled}</span></td>
      <td>${c.location}</td>
      <td><span class="badge-status badge-${c.status}">${c.status.charAt(0).toUpperCase()+c.status.slice(1)}</span></td>
      <td>${c.alerts}</td>
      <td>${c.added}</td>
      <td onclick="event.stopPropagation()">
        <div class="d-flex gap-1 flex-wrap">
          <button type="button" class="btn-icon" title="Details" onclick="openCameraDetailModalById('${c.id}')"><i class="fas fa-eye"></i></button>
          ${canTog && !c.isDeleted ? `<button type="button" class="btn-icon" title="Enable / disable" onclick="testCamera('${c.id}')"><i class="fas fa-power-off"></i></button>` : ''}
          ${canUpdate && !c.isDeleted ? `<button type="button" class="btn-icon" title="Edit" onclick="editCamera('${c.id}')"><i class="fas fa-pen"></i></button>` : ''}
          ${archiveBtn}
          ${restoreBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
  updateCameraFilterOptions();
}

function editCamera(id) {
  if (!cameraRoleCanUpdate()) {
    showToast('You do not have permission to edit cameras.', 'warning');
    return;
  }
  const cam = State.cameraList.find(c => String(c.id) === String(id));
  if (!cam) return;
  State.editingCamera = id;
  document.getElementById('camModalTitle').textContent = 'Edit Camera';
  document.getElementById('camAiId').value = cam.cameraAiId || '';
  document.getElementById('camName').value = cam.name;
  document.getElementById('camIpv4').value = cam.ip;
  document.getElementById('camRtspUrl').value = cam.rtspUrl || '';
  document.getElementById('camLocation').value = cam.location;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('cameraModal')).show();
}

function openAddCamera() {
  if (!cameraRoleCanCreate()) {
    showToast('Only a super admin can add cameras.', 'warning');
    return;
  }
  State.editingCamera = null;
  document.getElementById('camModalTitle').textContent = 'Add New Camera';
  document.getElementById('cameraForm').reset();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('cameraModal')).show();
}

function saveCamera() {
  const cameraAiRaw = document.getElementById('camAiId').value.trim().toUpperCase();
  const name = document.getElementById('camName').value.trim();
  const ip = document.getElementById('camIpv4').value.trim();
  const rtspUrl = document.getElementById('camRtspUrl').value.trim();
  const location = document.getElementById('camLocation').value.trim();

  const elAi = document.getElementById('camAiId');
  const elIp = document.getElementById('camIpv4');
  const elRtsp = document.getElementById('camRtspUrl');
  let valid = true;
  ['camName', 'camLocation'].forEach(fid => {
    const el = document.getElementById(fid);
    el.classList.toggle('is-invalid', !el.value.trim());
    if (!el.value.trim()) valid = false;
  });
  const aiOk = window.CAM_AI_ID_RE.test(cameraAiRaw);
  elAi.classList.toggle('is-invalid', !aiOk);
  if (!aiOk) valid = false;
  const ipOk = window.IPV4_RE.test(ip);
  elIp.classList.toggle('is-invalid', !ipOk);
  if (!ipOk) valid = false;
  let rtspOk = false;
  try {
    const u = new URL(rtspUrl);
    rtspOk = u.protocol === 'rtsp:' || u.protocol === 'rtsps:';
  } catch (_) {
    rtspOk = false;
  }
  elRtsp.classList.toggle('is-invalid', !rtspOk);
  if (!rtspOk) valid = false;
  if (!valid) return;

  if (State.editingCamera && !cameraRoleCanUpdate()) {
    showToast('You do not have permission to edit cameras.', 'warning');
    return;
  }
  if (!State.editingCamera && !cameraRoleCanCreate()) {
    showToast('Only a super admin can add cameras.', 'warning');
    return;
  }

  const endpoint = State.editingCamera ? `/camera/${State.editingCamera}` : '/camera/';
  const method = State.editingCamera ? 'PUT' : 'POST';
  const body = State.editingCamera
    ? { cameraAiId: cameraAiRaw, name, ip, rtspUrl, location }
    : { cameraAiId: cameraAiRaw, name, ip, rtspUrl, location, isEnabled: true };
  apiRequest(endpoint, {
    method,
    body: JSON.stringify(body)
  })
    .then(() => {
      bootstrap.Modal.getInstance(document.getElementById('cameraModal')).hide();
      showToast(State.editingCamera ? 'Camera updated successfully' : 'Camera added successfully', 'success');
      loadCameras();
      window.loadAlerts?.();
    })
    .catch(err => handleApiCatch(err, 'Camera save failed.'));
}

function deleteCamera(id) {
  if (!userIsSuperAdmin()) {
    showToast('Only a super admin can archive cameras.', 'warning');
    return;
  }
  openConfirmModal({
    title: 'Archive this camera?',
    message: 'It will be hidden until you restore it from the list.',
    confirmText: 'Archive',
    onConfirm: () => {
      apiRequest(`/camera/${id}`, { method: 'DELETE' })
        .then(() => {
          showToast('Camera archived.', 'success');
          Promise.all([loadCameras(), window.loadAlerts?.() || Promise.resolve()]).then(() => {
            if (State.currentPage === 'dashboard') {
              window.renderDashboardOverview?.();
              window.renderDashboardCharts?.();
            }
          });
        })
        .catch(err => handleApiCatch(err, 'Archive failed.'));
    }
  });
}

function restoreCamera(id) {
  if (!userIsSuperAdmin()) {
    showToast('Only a super admin can restore cameras.', 'warning');
    return;
  }
  apiRequest(`/camera/${id}/restore`, { method: 'PATCH', body: '{}' })
    .then(() => {
      showToast('Camera restored.', 'success');
      Promise.all([loadCameras(), window.loadAlerts?.() || Promise.resolve()]).then(() => {
        if (State.currentPage === 'dashboard') {
          window.renderDashboardOverview?.();
          window.renderDashboardCharts?.();
        }
      });
    })
    .catch(err => handleApiCatch(err, 'Restore failed.'));
}

function testCamera(id) {
  if (!cameraRoleCanToggle()) {
    showToast('You do not have permission to toggle cameras.', 'warning');
    return;
  }
  const cam = State.cameraList.find(c => String(c.id) === String(id));
  if (!cam) return;
  const nextEnabled = !cam.isEnabled;
  apiRequest(`/camera/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled: nextEnabled })
  })
    .then(() => {
      cam.isEnabled = nextEnabled;
      const apiOnline = cam.apiStatus === 'online';
      cam.status = apiOnline && nextEnabled ? 'online' : 'offline';
      renderCamerasPage();
      showToast(`Camera ${nextEnabled ? 'enabled' : 'disabled'} successfully.`, 'success');
      window.loadAlerts?.();
    })
    .catch(err => handleApiCatch(err, 'Toggle failed.'));
}

function updateCameraFilterOptions() {
  const sel = document.getElementById('filterCamera');
  if (!sel) return;
  const cur = sel.value;
  const list = State.cameraList.filter(c => !c.isDeleted);
  sel.innerHTML = '<option value="">All Cameras</option>' +
    list.map(c => `<option value="${c.id}" ${String(cur) === String(c.id) ? 'selected' : ''}>${c.name}</option>`).join('');
}

window.openAddCamera = openAddCamera;
window.editCamera = editCamera;
window.deleteCamera = deleteCamera;
window.saveCamera = saveCamera;
window.testCamera = testCamera;
window.loadCameras = loadCameras;
window.renderCamerasPage = renderCamerasPage;
window.restoreCamera = restoreCamera;
window.toggleTheme = toggleTheme;
window.applyLang = applyLang;
window.showToast = showToast;

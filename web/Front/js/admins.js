/* ============================================================
   SENTINEL AI — Admin management — SPA + standalone
   ============================================================ */

'use strict';

let adminRoleEditingId = null;

function gateAdminsAccess() {
  if (typeof userCanManageUsers === 'function' && userCanManageUsers()) return true;
  showToast('You do not have access to this page.', 'danger');
  if (window.__SPA_ENABLED__) {
    navigateTo('dashboard');
  } else {
    window.location.href = '../index.html';
  }
  return false;
}

function applyAdminsRbac() {
  const addBtn = document.getElementById('btnAddAdmin');
  if (addBtn) addBtn.classList.toggle('d-none', !userIsSuperAdmin());
}

function bootAdminsPage() {
  if (!gateAdminsAccess()) {
    if (typeof hideLoader === 'function') hideLoader();
    return;
  }
  State.currentPage = 'admins';
  applyAdminsRbac();
  loadUsers();
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
      if (e.detail.page === 'admins') bootAdminsPage();
    });
  } else {
    if (!gateAdminsAccess()) return;
    hideLoader();
    bootAdminsPage();
  }
});

document.addEventListener('sentinel:socket', e => {
  if (State.currentPage !== 'admins') return;
  const { event, payload } = e.detail;
  if (event === 'user:active' && payload?.userId) {
    const user = State.adminList?.find(x => String(x.id) === String(payload.userId));
    if (user) {
      if (payload.timestamp) {
        user.last = String(payload.timestamp).replace('T', ' ').slice(0, 16);
      }
      user.isOnline = payload.isOnline === true;
      renderAdminsPage();
    }
  }
});

function updateLiveBadges() {}

function updateAdminStats() {
  const list = State.adminList || [];
  const totalEl = document.getElementById('adminStatTotal');
  const activeEl = document.getElementById('adminStatActive');
  const superEl = document.getElementById('adminStatSuper');
  const active = list.filter(u => !u.isDeleted && u.status !== 'Inactive').length;
  const supers = list.filter(u => u.role === 'super_admin' && !u.isDeleted).length;
  if (totalEl) totalEl.textContent = String(list.length);
  if (activeEl) activeEl.textContent = String(active);
  if (superEl) superEl.textContent = String(supers);
}

function loadUsers() {
  apiRequest('/user/')
    .then(res => {
      const users = asArray(res);
      State.adminList = users.map(u => ({
        id: u.id || u._id,
        name: u.name || u.fullName || 'Unknown User',
        email: u.email || '-',
        role: String(u.role || 'security')
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/^viewer$/, 'security'),
        isDeleted: u.isDeleted === true,
        status:
          u.isDeleted === true ? 'Deleted' : u.isActive === false ? 'Inactive' : 'Active',
        isOnline: u.isOnline === true,
        added: (u.createdAt || '').slice(0, 10),
        last: u.lastActiveAt ? String(u.lastActiveAt).replace('T', ' ').slice(0, 16) : 'Never'
      }));
      renderAdminsPage();
    })
    .catch(err => handleApiCatch(err, 'Failed to fetch users.'))
    .finally(() => hideLoader());
}

function normalizeAdminRoles() {
  State.adminList = State.adminList.map(admin => ({
    ...admin,
    role: String(admin.role || 'security')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/^viewer$/, 'security')
  }));
}

function roleLabel(role) {
  return String(role || 'security')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function canEditRole(actorRole, _targetRole, newRole) {
  if (actorRole !== 'super_admin') return false;
  return newRole === 'admin' || newRole === 'security';
}

function canDeleteAdmin(actorRole, targetRole) {
  if (actorRole !== 'super_admin') return false;
  return targetRole !== 'super_admin';
}

function renderAdminsPage() {
  const tbody = document.getElementById('adminsTableBody');
  if (!tbody) return;
  normalizeAdminRoles();
  const currentRole = getCurrentUserRole();
  const isSuper = userIsSuperAdmin();
  tbody.innerHTML = State.adminList
    .map(a => {
      const statusClass =
        a.status === 'Active' ? 'online' : a.status === 'Deleted' ? 'offline' : 'offline';
      const delBadge = deletedRowBadgeForSuper(a.isDeleted);
      const isSelf = String(a.id) === String(window.getCurrentUserId ? window.getCurrentUserId() : '');
      const actions =
        isSuper && a.isDeleted
          ? `<button type="button" class="btn-icon" title="Restore user" onclick="restoreUserAccount('${a.id}')"><i class="fas fa-rotate-left"></i></button>`
          : isSuper
            ? `<div class="d-flex gap-1">
          <button type="button" class="btn-icon ${isSelf ? 'disabled' : ''}" onclick="${isSelf ? '' : `editAdminRole('${a.id}')`}" title="Edit Role"><i class="fas fa-user-pen"></i></button>
          <button type="button" class="btn-icon ${(!canDeleteAdmin(currentRole, a.role) || isSelf) ? 'disabled' : 'danger'}" onclick="${isSelf ? '' : `deleteAdmin('${a.id}')`}"><i class="fas fa-trash"></i></button>
        </div>`
            : '—';
      return `
    <tr class="${deletedRowClassForSuper(a.isDeleted)}">
      <td>
        <div class="d-flex align-items-center gap-3">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.8rem;flex-shrink:0">${initials(a.name)}</div>
          <div><div style="font-weight:600;font-size:0.85rem">${a.name}${delBadge ? ' ' + delBadge : ''}</div><div style="font-size:0.72rem;color:var(--text-muted)">${a.email}</div></div>
        </div>
      </td>
      <td><span class="badge rounded-pill ${a.role === 'super_admin' ? 'bg-danger' : a.role === 'admin' ? 'bg-primary' : 'bg-secondary'}" style="font-size:0.7rem">${roleLabel(a.role)}</span></td>
      <td><span class="badge-status badge-${statusClass}">${a.status}</span></td>
      <td>${a.added}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">
        ${a.isOnline ? '<span class="badge bg-success" style="font-size:0.7rem">Online</span>' : a.last}
      </td>
      <td>${actions}</td>
    </tr>`;
    })
    .join('');
  updateAdminStats();
}

function restoreUserAccount(id) {
  if (!userIsSuperAdmin()) return;
  apiRequest(`/user/${id}/restore`, { method: 'PATCH' })
    .then(() => {
      showToast('User restored.', 'success');
      loadUsers();
    })
    .catch(err => handleApiCatch(err, 'Restore failed.'));
}

function editAdminRole(id) {
  if (!userIsSuperAdmin()) {
    showToast('Only a super admin can edit roles.', 'warning');
    return;
  }
  const selfId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : '';
  if (String(id) === String(selfId)) {
    showToast('You cannot edit your own role.', 'warning');
    return;
  }
  normalizeAdminRoles();
  const admin = State.adminList.find(x => String(x.id) === String(id));
  if (!admin || admin.isDeleted) return;

  const currentRole = getCurrentUserRole();
  const availableRoles = ['admin', 'security'].filter(r => canEditRole(currentRole, admin.role, r));
  if (availableRoles.length === 0) {
    showToast('You do not have permission to edit this role.', 'warning');
    return;
  }

  adminRoleEditingId = id;
  const roleSelect = document.getElementById('editRoleSelect');
  const targetName = document.getElementById('editRoleTargetName');
  if (!roleSelect || !targetName) return;

  targetName.textContent = admin.name;
  roleSelect.innerHTML = availableRoles
    .map(
      role => `
    <option value="${role}" ${role === admin.role ? 'selected' : ''}>${roleLabel(role)}</option>
  `
    )
    .join('');

  bootstrap.Modal.getOrCreateInstance(document.getElementById('editRoleModal')).show();
}

function deleteAdmin(id) {
  if (!userIsSuperAdmin()) return;
  const selfId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : '';
  if (String(id) === String(selfId)) {
    showToast('You cannot delete your own account.', 'warning');
    return;
  }
  normalizeAdminRoles();
  const admin = State.adminList.find(x => String(x.id) === String(id));
  const currentRole = getCurrentUserRole();
  if (admin && !canDeleteAdmin(currentRole, admin.role)) return;
  openConfirmModal({
    title: 'Delete this user?',
    message: 'The account will be soft-deleted. You can restore it later from this list.',
    confirmText: 'Delete',
    onConfirm: () => {
      apiRequest(`/user/${id}`, { method: 'DELETE' })
        .then(() => {
          showToast('User deleted successfully.', 'success');
          loadUsers();
        })
        .catch(err => handleApiCatch(err, 'Delete failed.'));
    }
  });
}

function openAddAdmin() {
  if (!userIsSuperAdmin()) {
    showToast('Only a super admin can add users.', 'warning');
    return;
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('addAdminModal')).show();
}

const EGYPT_PHONE_RE = /^(?:\+20|0)1[0125][0-9]{8}$/;

function saveAdmin() {
  if (!userIsSuperAdmin()) {
    showToast('Only a super admin can create users.', 'warning');
    return;
  }
  const name = document.getElementById('adminName')?.value.trim();
  const email = document.getElementById('adminEmail')?.value.trim();
  const role = document.getElementById('adminRole')?.value;
  const pass = document.getElementById('adminPass')?.value;
  const phone = document.getElementById('adminPhone')?.value.trim() || '';
  let valid = true;
  ['adminName', 'adminEmail', 'adminRole', 'adminPass'].forEach(fid => {
    const el = document.getElementById(fid);
    if (!el) return;
    el.classList.toggle('is-invalid', !el.value.trim());
    if (!el.value.trim()) valid = false;
  });
  const phoneEl = document.getElementById('adminPhone');
  if (phoneEl) {
    const phoneOk = EGYPT_PHONE_RE.test(phone);
    phoneEl.classList.toggle('is-invalid', !phoneOk);
    if (!phoneOk) valid = false;
  }
  if (!valid) return;
  apiRequest('/user/', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      password: pass,
      role: String(role).toLowerCase(),
      phone
    })
  })
    .then(() => {
      bootstrap.Modal.getInstance(document.getElementById('addAdminModal')).hide();
      document.getElementById('addAdminModal').querySelector('form')?.reset();
      showToast(`${roleLabel(role)} added successfully`, 'success');
      loadUsers();
    })
    .catch(err => handleApiCatch(err, 'Create user failed.'));
}

function saveAdminRoleChange() {
  if (!userIsSuperAdmin()) return;
  if (!adminRoleEditingId) return;
  normalizeAdminRoles();

  const selectedRole = document.getElementById('editRoleSelect')?.value;
  const admin = State.adminList.find(x => String(x.id) === String(adminRoleEditingId));
  if (!admin || !selectedRole) return;

  apiRequest(`/user/${adminRoleEditingId}`, {
    method: 'PUT',
    body: JSON.stringify({ role: selectedRole })
  })
    .then(() => {
      admin.role = selectedRole;
      bootstrap.Modal.getInstance(document.getElementById('editRoleModal'))?.hide();
      renderAdminsPage();
      showToast('Role updated successfully.', 'success');
    })
    .catch(err => handleApiCatch(err, 'Role update failed.'));
}

window.openAddAdmin = openAddAdmin;
window.saveAdmin = saveAdmin;
window.editAdminRole = editAdminRole;
window.saveAdminRoleChange = saveAdminRoleChange;
window.deleteAdmin = deleteAdmin;
window.restoreUserAccount = restoreUserAccount;
window.toggleTheme = toggleTheme;
window.applyLang = applyLang;
window.showToast = showToast;

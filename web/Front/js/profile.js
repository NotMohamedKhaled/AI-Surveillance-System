/* ============================================================
   SENTINEL AI — Profile — SPA + standalone
   ============================================================ */

'use strict';

let profileUser = null;

function bootProfilePage() {
  State.currentPage = 'profile';
  loadProfileData();
}

function loadProfileData() {
  const nameDisplay = document.getElementById('profileNameDisplay');
  const emailDisplay = document.getElementById('profileEmailDisplay');
  apiRequest('/user/me')
    .then(res => {
      profileUser = res?.data || res?.user || res;
      if (nameDisplay) nameDisplay.textContent = profileUser?.name || profileUser?.fullName || '';
      if (emailDisplay) emailDisplay.textContent = profileUser?.email || '';
      localStorage.setItem(
        'currentUser',
        JSON.stringify({
          id: profileUser?.id || profileUser?._id,
          name: profileUser?.name || profileUser?.fullName || '',
          email: profileUser?.email || '',
          role: profileUser?.role || 'viewer'
        })
      );
      syncCurrentUserUI();
    })
    .catch(err => handleApiCatch(err, 'Failed to load profile.'))
    .finally(() => {
      if (typeof hideLoader === 'function') hideLoader();
    });
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

  /* ── Toggle password section visibility ── */
  const toggleBtn = document.getElementById('togglePasswordSection');
  const passwordSection = document.getElementById('passwordChangeSection');
  const placeholder = document.getElementById('passwordSectionPlaceholder');
  if (toggleBtn && passwordSection) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = passwordSection.classList.contains('d-none');
      passwordSection.classList.toggle('d-none', !isHidden);
      if (placeholder) placeholder.classList.toggle('d-none', isHidden);
      toggleBtn.innerHTML = isHidden
        ? '<i class="fas fa-chevron-up me-2"></i>Cancel'
        : '<i class="fas fa-key me-2"></i>Change Password';
      toggleBtn.classList.toggle('btn-outline-danger', isHidden);
      toggleBtn.classList.toggle('btn-outline-custom', !isHidden);
    });
  }

  /* ── Toggle password visibility ── */
  document.querySelectorAll('.toggle-pw-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-group')?.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  });

  /* ── Password strength indicator ── */
  const newPwInput = document.getElementById('profileNewPassword');
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');
  if (newPwInput && strengthBar) {
    newPwInput.addEventListener('input', () => {
      const val = newPwInput.value;
      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      const levels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
      const colors = ['', '#ff3b5c', '#ff9800', '#ffc107', '#00e676', '#00d4ff'];
      const pct = Math.min(score * 20, 100);
      strengthBar.style.width = pct + '%';
      strengthBar.style.background = colors[score] || '';
      if (strengthText) {
        strengthText.textContent = val ? levels[score] || '' : '';
        strengthText.style.color = colors[score] || '';
      }
    });
  }

  /* ── Submit password change ── */
  document.getElementById('passwordChangeForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const currentPasswordInput = document.getElementById('profileCurrentPassword');
    const newPasswordInput = document.getElementById('profileNewPassword');
    const confirmPasswordInput = document.getElementById('profileConfirmNewPassword');
    const savedText = document.getElementById('profileSavedText');

    const currentPassword = currentPasswordInput?.value || '';
    const newPassword = newPasswordInput?.value || '';
    const confirmPassword = confirmPasswordInput?.value || '';

    /* Validate */
    let valid = true;
    [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(el => {
      if (!el) return;
      el.classList.toggle('is-invalid', !el.value);
      if (!el.value) valid = false;
    });
    if (!valid) {
      showToast('Please fill in all password fields.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      newPasswordInput?.classList.add('is-invalid');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.', 'danger');
      confirmPasswordInput?.classList.add('is-invalid');
      return;
    }

    const submitBtn = document.getElementById('submitPasswordChange');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving…';
    }

    apiRequest('/user/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword })
    })
      .then(() => {
        if (savedText) {
          savedText.textContent =
            State.lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح.' : 'Password changed successfully.';
        }
        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        /* Reset strength bar */
        if (strengthBar) strengthBar.style.width = '0';
        if (strengthText) strengthText.textContent = '';
        /* Collapse password section */
        const passwordSection = document.getElementById('passwordChangeSection');
        const toggleBtn = document.getElementById('togglePasswordSection');
        if (passwordSection) passwordSection.classList.add('d-none');
        if (toggleBtn) {
          toggleBtn.innerHTML = '<i class="fas fa-key me-2"></i>Change Password';
          toggleBtn.classList.remove('btn-outline-danger');
          toggleBtn.classList.add('btn-outline-custom');
        }
        showToast(
          State.lang === 'ar' ? 'تم تغيير كلمة المرور.' : 'Password changed successfully.',
          'success'
        );
      })
      .catch(err => handleApiCatch(err, 'Password change failed.'))
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Password';
        }
      });
  });

  if (window.__SPA_ENABLED__) {
    document.addEventListener('spa:route', e => {
      if (e.detail.page === 'profile') bootProfilePage();
    });
  } else {
    hideLoader();
    bootProfilePage();
  }
});

window.toggleTheme = toggleTheme;
window.applyLang = applyLang;
window.showToast = showToast;

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('loginLangSelect');
  if (langSelect) {
    langSelect.value = State.lang || 'en';
    langSelect.addEventListener('change', (e) => {
      applyLang(e.target.value);
    });
  }
  applyLang(State.lang || 'en');
});

function redirectAfterLogin() {
  let h = sessionStorage.getItem('postLoginHash') || '#/dashboard';
  sessionStorage.removeItem('postLoginHash');
  if (!h.startsWith('#')) h = '#' + h;
  window.location.href = 'index.html' + h;
}


document.getElementById('togglePass').addEventListener('click', () => {
  const inp = document.getElementById('loginPass');
  const eye = document.getElementById('passEye');
  if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fas fa-eye'; }
});

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  let valid = true;

  document.getElementById('emailErr').textContent = '';
  document.getElementById('passErr').textContent = '';
  document.getElementById('loginEmail').classList.remove('is-invalid');
  document.getElementById('loginPass').classList.remove('is-invalid');

  if (!email) {
    document.getElementById('emailErr').textContent = 'Email is required.';
    document.getElementById('loginEmail').classList.add('is-invalid');
    valid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    document.getElementById('emailErr').textContent = 'Enter a valid email address.';
    document.getElementById('loginEmail').classList.add('is-invalid');
    valid = false;
  }
  if (!pass) {
    document.getElementById('passErr').textContent = 'Password is required.';
    document.getElementById('loginPass').classList.add('is-invalid');
    valid = false;
  } else if (pass.length < 6) {
    document.getElementById('passErr').textContent = 'Password must be at least 6 characters (same as the API).';
    document.getElementById('loginPass').classList.add('is-invalid');
    valid = false;
  }
  if (!valid) return;

  // Show loader
  document.getElementById('loginBtnText').style.display = 'none';
  document.getElementById('loginBtnLoader').style.display = 'inline';
  document.getElementById('loginBtn').disabled = true;

  apiRequest('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password: pass })
  })
    .then(res => {
      const token = res?.token || res?.data?.token || res?.accessToken;
      if (!token) throw new Error('Token not found in login response');
      const remember = document.getElementById('rememberMe').checked;
      const storageObj = remember ? localStorage : sessionStorage;
      storageObj.setItem('token', token);
      return apiRequest('/user/me');
    })
    .then(userRes => {
      const user = userRes?.data || userRes?.user || userRes;
      if (user) {
        const uid = user.id || user._id;
        const remember = document.getElementById('rememberMe').checked;
        const storageObj = remember ? localStorage : sessionStorage;
        storageObj.setItem('currentUser', JSON.stringify({
          id: uid != null ? String(uid) : '',
          name: user.name || user.fullName || '',
          email: user.email || email,
          role: user.role || 'viewer'
        }));
      }
      redirectAfterLogin();
    })
    .catch(err => {
      if (typeof handleApiCatch === 'function') handleApiCatch(err, 'Login failed.');
      else console.error(err);
    })
    .finally(() => {
      document.getElementById('loginBtnText').style.display = 'inline';
      document.getElementById('loginBtnLoader').style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
    });
}

// Enter key
document.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

window.doLogin = doLogin;

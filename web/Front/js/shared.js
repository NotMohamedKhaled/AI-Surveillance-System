/* ============================================================
   SENTINEL AI — Shared Client Utilities
   (loaded before page-specific JS)

   This shared file owns the shared app `State/MOCK/I18N` and common helpers.
   Page-specific scripts load after this file and should not duplicate those helpers.
   ============================================================ */

'use strict';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3000/dashboard/api';

function getCurrentUserId() {
  try {
    return String(JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}')).id || '');
  } catch (_) {
    return '';
  }
}

/** After 401 redirect; suppress toast in catch handlers. */
function handleApiCatch(err, fallbackMsg) {
  if (err && String(err.message) === 'SESSION_EXPIRED') return;
  showToast(err.message || fallbackMsg, 'danger');
}

let confirmModalCallback = null;
function setupConfirmModal() {
  const el = document.getElementById('confirmActionModal');
  if (!el) return;
  const btn = document.getElementById('confirmModalConfirmBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const fn = confirmModalCallback;
    confirmModalCallback = null;
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
    if (fn) fn();
  });
  el.addEventListener('hidden.bs.modal', () => {
    confirmModalCallback = null;
  });
}
setupConfirmModal();

function openConfirmModal(opts) {
  const el = document.getElementById('confirmActionModal');
  if (!el) {
    if (opts && opts.onConfirm) opts.onConfirm();
    return;
  }
  const titleEl = document.getElementById('confirmModalTitle');
  const bodyEl = document.getElementById('confirmModalBody');
  const btn = document.getElementById('confirmModalConfirmBtn');
  if (titleEl) titleEl.textContent = opts.title || 'Confirm';
  if (bodyEl) bodyEl.textContent = opts.message || '';
  if (btn) {
    btn.textContent = opts.confirmText || 'Confirm';
    btn.className = opts.danger === false ? 'btn-primary-custom' : 'btn btn-danger';
  }
  confirmModalCallback = opts.onConfirm || null;
  bootstrap.Modal.getOrCreateInstance(el).show();
}

// ── App State ──────────────────────────────────────────────
const State = {
  theme: localStorage.getItem('theme') || 'light',
  lang: localStorage.getItem('lang') || 'en',
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  _dashboardBooted: false,
  _alertsBooted:false ,
  charts: {},
  cameraList: [],
  alertList: [],
  incidentList: [],
  adminList: [],
  editingCamera: null,
  notifications: []
};








/// CAMERA RBAC

const ROLE_OPTIONS = ['super_admin', 'admin', 'security'];

window.IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
window.CAM_AI_ID_RE = /^[A-Z0-9_-]+$/;

function cameraRoleCanCreate() {
  const r = JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}')).role;
  return r === 'super_admin';
}
function cameraRoleCanUpdate() {
  const r = JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}')).role;
  return r === 'super_admin' || r === 'admin';
}
function cameraRoleCanCrud() {
  return cameraRoleCanCreate();
}
function cameraRoleCanToggle() {
  const r = JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}')).role;
  return r === 'super_admin' || r === 'admin';
}
window.cameraRoleCanCreate = cameraRoleCanCreate;
window.cameraRoleCanUpdate = cameraRoleCanUpdate;
window.cameraRoleCanCrud = cameraRoleCanCrud;
window.cameraRoleCanToggle = cameraRoleCanToggle;








// ── I18n ────────────────────────────────────────────────────
const translations = {
  en: {
    dashboard: 'Dashboard',
    alerts: 'Alerts',
    cameras: 'Cameras',
    incidents: 'Incidents',
    admins: 'Admins',
    settings: 'Settings',
    profile: 'Profile',
    search: 'Search...',
    notifications: 'Notifications',
    account: 'Account',
    welcome: 'Welcome',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Sign in to access the surveillance dashboard',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    rememberMe: 'Remember me',
    signIn: 'Sign In',
    backToDashboard: 'Back to Dashboard',
    accountInformation: 'Account Information',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    emailAddress: 'Email Address',
    emailPlaceholder: 'name@example.com',
    saveChanges: 'Save Changes',
    overview: 'OVERVIEW',
    management: 'MANAGEMENT',
    system: 'SYSTEM',
    totalCameras: 'Total Cameras',
    activeCameras: 'Active Cameras',
    totalAlerts: 'Total Alerts',
    todayAlerts: "Today's Alerts",
    recentAlerts: 'Recent Alerts',
    cameraStatus: 'Camera Status',
    livePreview: 'Live Camera Preview',
    alertsChart: 'Alerts Per Day',
    logout: 'Logout',
    camera: 'Camera',
    rtspIp: 'RTSP / IP',
    location: 'Location',
    status: 'Status',
    actions: 'Actions',
    role: 'Role',
    editRole: 'Edit Role',
    saveRole: 'Save Role',
    close: 'Close',
    changeRole: 'Change Role',
    selectRole: 'Select Role',
    totalUsers: 'Total users',
    superAdmins: 'Super admins',
    activeUsers: 'Active',
    theme: 'Theme',
    language: 'Language',
    saveAppearance: 'Save Appearance',
    muteSounds: 'Mute system alert sounds',
    muteSoundsDesc: 'Toggle whether the notification sound (faaah.mp3) plays on incoming alerts and messages.',
    changePassHelp: 'Click "Change Password" above to update your credentials.',
    notificationsTitle: 'Notifications',
    noNotifications: 'No notifications yet',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    adminRole: 'Admin',
    securityRole: 'Security'
  },
  ar: {
    dashboard: 'لوحة التحكم',
    alerts: 'التنبيهات',
    cameras: 'الكاميرات',
    incidents: 'الحوادث',
    admins: 'المشرفين',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    search: 'بحث...',
    notifications: 'الإشعارات',
    account: 'الحساب',
    welcome: 'مرحبا',
    loginTitle: 'مرحباً بك',
    loginSubtitle: 'سجل دخولك للوصول إلى لوحة تحكم المراقبة',
    password: 'كلمة المرور',
    passwordPlaceholder: 'كلمة المرور الخاصة بك',
    rememberMe: 'تذكرني',
    signIn: 'تسجيل الدخول',
    backToDashboard: 'العودة إلى لوحة التحكم',
    accountInformation: 'معلومات الحساب',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'اكتب اسمك الكامل',
    emailAddress: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.com',
    saveChanges: 'حفظ التغييرات',
    overview: 'نظرة عامة',
    management: 'الإدارة',
    system: 'النظام',
    totalCameras: 'إجمالي الكاميرات',
    activeCameras: 'الكاميرات النشطة',
    totalAlerts: 'إجمالي التنبيهات',
    todayAlerts: 'تنبيهات اليوم',
    recentAlerts: 'التنبيهات الأخيرة',
    cameraStatus: 'حالة الكاميرا',
    livePreview: 'معاينة الكاميرا المباشرة',
    alertsChart: 'التنبيهات يومياً',
    logout: 'تسجيل الخروج',
    camera: 'الكاميرا',
    rtspIp: 'RTSP / IP',
    location: 'الموقع',
    status: 'الحالة',
    actions: 'الإجراءات',
    role: 'الدور',
    editRole: 'تعديل الدور',
    saveRole: 'حفظ الدور',
    close: 'إغلاق',
    changeRole: 'تغيير الدور',
    selectRole: 'اختر دوراً',
    totalUsers: 'إجمالي المستخدمين',
    superAdmins: 'مسؤولو النظام الخارقون',
    activeUsers: 'نشط',
    theme: 'المظهر',
    language: 'اللغة',
    saveAppearance: 'حفظ المظهر',
    muteSounds: 'كتم أصوات التنبيهات في النظام',
    muteSoundsDesc: 'تبديل تشغيل صوت الإشعار (faaah.mp3) للتنبيهات والرسائل الواردة.',
    changePassHelp: 'انقر على "تغيير كلمة المرور" أعلاه لتحديث بياناتك.',
    notificationsTitle: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات بعد',
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
    adminRole: 'مسؤول',
    securityRole: 'أمن'
  }
};

const dynamicPhraseMap = {
  'Dashboard': 'لوحة التحكم',
  'Alerts': 'التنبيهات',
  'Cameras': 'الكاميرات',
  Incidents: 'الحوادث',
  'Admin Management': 'إدارة المشرفين',
  'Settings': 'الإعدادات',
  'Logout': 'تسجيل الخروج',
  'View All Alerts': 'عرض كل التنبيهات',
  'System Online': 'النظام متصل',
  'Live Camera Preview': 'المعاينة المباشرة للكاميرات',
  'Recent Alerts': 'التنبيهات الأخيرة',
  'Camera Status': 'حالة الكاميرات',
  'All Alerts': 'كل التنبيهات',
  'All Cameras': 'كل الكاميرات',
  'Incidents': 'الحوادث',
  'Search': 'بحث',
  'Date': 'التاريخ',
  'Camera': 'الكاميرا',
  'Type': 'النوع',
  'Actions': 'الإجراءات',
  'Notifications': 'الإشعارات',
  'Account': 'الحساب',
  'Profile': 'الملف الشخصي',
  'Total Cameras': 'إجمالي الكاميرات',
  'Active Cameras': 'الكاميرات النشطة',
  'Total Alerts': 'إجمالي التنبيهات',
  "Today's Alerts": 'تنبيهات اليوم',
  'Alerts Per Day': 'التنبيهات يومياً',
  'Alert Types': 'أنواع التنبيهات',
  'View All': 'عرض الكل',
  'Manage': 'إدارة',
  'Enabled/Disabled': 'مفعل/معطل',
  'Location': 'الموقع',
  'Added': 'تمت الإضافة',
  'Search by name, IP, or AI ID…': 'البحث بالاسم أو IP أو المعرف...',
  'Search by ID, camera AI ID...': 'البحث بالمعرف أو معرف الكاميرا...',
  'Confidence': 'الدقة',
  'Date & Time': 'التاريخ والوقت',
  'System Administrators': 'مسؤولو النظام',
  'User': 'المستخدم',
  'Last Active': 'آخر نشاط',
  'Date Added': 'تاريخ الإضافة',
  'Overview': 'نظرة عامة',
  'Incidents by hour': 'الحوادث بالساعة',
  'Incident records': 'سجلات الحوادث',
  'Appearance': 'المظهر',
  'Notification Settings': 'إعدادات الإشعارات',
  'Status': 'الحالة',
  'Role': 'الدور',
  'INITIALIZING SENTINEL AI': 'جاري تهيئة النظام',
  'No notifications yet': 'لا توجد إشعارات بعد',
  'Weapon': 'سلاح',
  'Harassment': 'تحرش',
  'Changes the UI text direction and language.': 'يغير اتجاه النص ولغة واجهة المستخدم.',
  'Mute system alert sounds': 'كتم أصوات التنبيهات في النظام',
  'Toggle whether the notification sound (faaah.mp3) plays on incoming alerts and messages.': 'تبديل تشغيل صوت الإشعار للتنبيهات والرسائل الواردة.',
  'Change Password': 'تغيير كلمة المرور',
  'Current Password': 'كلمة المرور الحالية',
  'New Password': 'كلمة المرور الجديدة',
  'Confirm New Password': 'تأكيد كلمة المرور الجديدة',
  'Update Password': 'تحديث كلمة المرور',
  'Click "Change Password" above to update your credentials.': 'انقر على "تغيير كلمة المرور" أعلاه لتحديث بياناتك.',
  'Assign security officer': 'تعيين ضابط أمن',
  'Security officer': 'ضابط الأمن',
  'Cancel': 'إلغاء',
  'Open incident': 'فتح بلاغ',
  'Alert Details': 'تفاصيل التنبيه',
  'Add Camera': 'إضافة كاميرا',
  'Camera AI ID *': 'معرف الكاميرا الذكي *',
  'Camera name *': 'اسم الكاميرا *',
  'IPv4 address *': 'عنوان IPv4 *',
  'RTSP URL *': 'رابط RTSP *',
  'Location *': 'الموقع *',
  'Save Camera': 'حفظ الكاميرا',
  'Camera details': 'تفاصيل الكاميرا',
  'Close': 'إغلاق',
  'Add New Admin': 'إضافة مسؤول جديد',
  'Full Name *': 'الاسم الكامل *',
  'Email Address *': 'البريد الإلكتروني *',
  'Role *': 'الدور *',
  'Phone *': 'رقم الهاتف *',
  'Password *': 'كلمة المرور *',
  'Create Admin': 'إنشاء مسؤول',
  'Confirm': 'تأكيد',
  'Search ID, camera AI ID...': 'البحث بالمعرف أو معرف الكاميرا...',
  'Enter current password': 'أدخل كلمة المرور الحالية',
  'Min. 6 characters': '6 أحرف كحد أدنى',
  'Repeat new password': 'تكرار كلمة المرور الجديدة',
  'e.g. CAM_GATE_A': 'مثل: CAM_GATE_A',
  'e.g. Main Entrance': 'مثل: المدخل الرئيسي',
  '192.168.1.100': '192.168.1.100',
  'rtsp://192.168.1.100:554/stream1': 'rtsp://192.168.1.100:554/stream1',
  'e.g. Floor 1, Gate A': 'مثل: الطابق 1، البوابة أ',
  'John Doe': 'فلان الفلاني',
  'admin@sentinel.ai': 'admin@sentinel.ai',
  '+201234567890': '+201234567890',
  'Min. 8 characters': '8 أحرف كحد أدنى',
  'All Types': 'كل الأنواع',
  'All Statuses': 'كل الحالات',
  'Open': 'مفتوح',
  'In progress': 'قيد التقدم',
  'Closed': 'مغلق',
  'Reset': 'إعادة ضبط',
  'Uppercase letters, numbers, underscores, hyphens only.': 'أحرف كبيرة، أرقام، شرطة سفلية، شرطة فقط.',
  'Camera name is required.': 'اسم الكاميرا مطلوب.',
  'Valid IPv4 required.': 'مطلوب عنوان IPv4 صالح.',
  'Valid RTSP URL required.': 'مطلوب رابط RTSP صالح.',
  'Location is required.': 'الموقع مطلوب.',
  'Name is required.': 'الاسم مطلوب.',
  'Valid email is required.': 'مطلوب بريد إلكتروني صالح.',
  'Please select a role.': 'يرجى اختيار دور.',
  'Valid Egypt-format phone required.': 'مطلوب رقم هاتف مصري صالح.',
  'Password is required.': 'كلمة المرور مطلوبة.',
  'Toggle Theme': 'تبديل المظهر',
  'Light Mode': 'الوضع الفاتح',
  'Dark Mode': 'الوضع الداكن',
  'English': 'الإنجليزية',
  'Select Role': 'اختر دوراً',
  'Admin': 'مسؤول',
  'Security': 'أمن'
};






//TRANSLATIONS functions
function t(key) {
  return translations[State.lang]?.[key] || key;
}





// ── Shared UI Lifecycle ─────────────────────────────────────
function hideLoader() {
  console.trace('hideLoader');
  const l = document.getElementById('loadingOverlay');
  if (!l) return;
  setTimeout(() => {
    l.classList.add('hide');
    setTimeout(() => l.remove(), 400);
  }, 800);
}



// ── Theme ───────────────────────────────────────────────────
function applyTheme(theme) {
  // `State` is defined in each page JS for now.
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

  window.refreshCharts?.();
}

function toggleTheme() {
  applyTheme(State.theme === 'dark' ? 'light' : 'dark');
}


// ── Language ────────────────────────────────────────────────
function applyLang(lang) {
  State.lang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  applyTranslations(lang);
}


//??????????????????????????????????
function updateI18nDOM() {
  const navKeys = { dashboard: 'dashboard', alerts: 'alerts', cameras: 'cameras', incidents: 'incidents', admins: 'admins', settings: 'settings' };
  document.querySelectorAll('.sidebar .nav-link[data-page] .nav-label').forEach(el => {
    const page = el.closest('.nav-link')?.getAttribute('data-page');
    if (page && navKeys[page]) el.setAttribute('data-i18n', navKeys[page]);
  });

  const notifTitle = document.querySelector('.notif-dropdown .border-bottom span');
  if (notifTitle) notifTitle.setAttribute('data-i18n', 'notifications');

  const accountHeader = document.querySelector('.dropdown-menu .dropdown-header');
  if (accountHeader) accountHeader.setAttribute('data-i18n', 'account');

  const phraseKeyMap = {
    Dashboard: 'dashboard',
    Alerts: 'alerts',
    Cameras: 'cameras',
    Incidents: 'incidents',
    Settings: 'settings',
    Logout: 'logout',
    Camera: 'camera',
    Status: 'status',
    Actions: 'actions',
    Role: 'role',
    'Edit Role': 'editRole',
    'Save Role': 'saveRole',
    Close: 'close',
    'Change Role': 'changeRole',
    'Select Role': 'selectRole'
  };

  document.querySelectorAll('button, th, label, .card-title, .nav-label, .dropdown-item').forEach(el => {
    if (el.hasAttribute('data-i18n')) return;
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const key = phraseKeyMap[text];
    if (key) el.setAttribute('data-i18n', key);
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = translated;
    else el.textContent = translated;
  });

  // Update sidebar active label.
  const activeLink = document.querySelector('.nav-link.active .nav-label');
  if (activeLink) {
    const key = activeLink.closest('[data-page]')?.getAttribute('data-page');
    if (key) activeLink.textContent = t(key);
  }
}
//??????????????????????????????????



function applyTranslations(lang) {
  State.lang = lang;
  updateI18nDOM();
  applyDynamicTextTranslations(lang);
}


//??????????????????????????????????
function applyDynamicTextTranslations(lang) {
  const candidates = document.querySelectorAll('h1,h2,h3,h4,h5,h6,label,button,a,span,p,th,option,div,input');
  candidates.forEach(el => {
    if (el.hasAttribute('data-i18n')) return;

    if (el.tagName === 'INPUT' && el.placeholder) {
      if (!el.dataset.originalPlaceholder) el.dataset.originalPlaceholder = el.placeholder.trim();
      const baseText = el.dataset.originalPlaceholder;
      if (lang === 'ar' && dynamicPhraseMap[baseText]) {
        el.placeholder = dynamicPhraseMap[baseText];
      } else if (lang === 'en') {
        el.placeholder = baseText;
      }
    }

    if (el.title) {
      if (!el.dataset.originalTitle) el.dataset.originalTitle = el.title.trim();
      const baseText = el.dataset.originalTitle;
      if (lang === 'ar' && dynamicPhraseMap[baseText]) {
        el.title = dynamicPhraseMap[baseText];
      } else if (lang === 'en') {
        el.title = baseText;
      }
    }

    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.trim();
        if (!text) return;
        if (!node.originalText) node.originalText = text;
        const baseText = node.originalText;
        if (lang === 'ar' && dynamicPhraseMap[baseText]) {
          node.nodeValue = node.nodeValue.replace(text, dynamicPhraseMap[baseText]);
        } else if (lang === 'en') {
          node.nodeValue = node.nodeValue.replace(text, baseText);
        }
      }
    });
  });
}
//??????????????????????????????????






// ── Sidebar ──────────────────────────────────────────────────
function bindSidebarToggle() {
  const btn = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  if (btn?.dataset.boundSidebarToggle === '1') return;
  if (btn) btn.dataset.boundSidebarToggle = '1';

  if (btn) {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 991) {
        document.getElementById('sidebar').classList.toggle('mobile-open');
        overlay?.classList.toggle('show');
      } else {
        State.sidebarCollapsed = !State.sidebarCollapsed;
        document.getElementById('sidebar').classList.toggle('collapsed', State.sidebarCollapsed);
        document.getElementById('mainContent').classList.toggle('expanded', State.sidebarCollapsed);
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
  }
}




// ── Topbar ───────────────────────────────────────────────────
function bindTopbarActions() {
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn && themeBtn.dataset.boundTheme !== '1') {
    themeBtn.dataset.boundTheme = '1';
    themeBtn.addEventListener('click', toggleTheme);
  }
  ensureCurrentUser();
  ensureProfileLink();
  bindLogoutActions();
  syncCurrentUserUI();
  if (!bindTopbarActions._hydrateStarted) {//??????????????????????????????????
    bindTopbarActions._hydrateStarted = true;
    hydrateCurrentUser();//??????????????????????????????????
  }
  applySidebarRbac();
  bindNotificationsDropdown();
}

function getProfileHref() {
  if (window.__SPA_ENABLED__) return '#/profile';
  return 'index.html#/profile'; //??????????????????????????????????
}

function ensureProfileLink() {
  const profileHref = getProfileHref();
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    const profileLink = menu.querySelector('.dropdown-item .fa-user')?.closest('.dropdown-item');
    if (!profileLink) return;
    profileLink.setAttribute('href', profileHref);
    profileLink.setAttribute('data-i18n', 'profile');
    profileLink.innerHTML = `<i class="fas fa-user"></i> ${t('profile')}`;
  });
}






function ensureCurrentUser() {
  const current = JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}'));
  if (!current.name) return;
  let changed = false;
  if (current.role === 'viewer') {
    current.role = 'security';
    changed = true;
  }
  if (!ROLE_OPTIONS.includes(current.role)) {
    current.role = 'security';
    changed = true;
  }
  if (changed) localStorage.setItem('currentUser', JSON.stringify(current));
}

function getLoginHref() {
  return 'login.html';
}

function checkAuth() {
  const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
  if (!token) {
    hideLoader();
    if (window.__SPA_ENABLED__ && /index\.html/i.test(window.location.pathname)) {//??????????????????????????????????
      const h = window.location.hash;//??????????????????????????????????
      sessionStorage.setItem('postLoginHash', h && h !== '#' ? h : '#/dashboard');//??????????????????????????????????
    }
    window.location.href = getLoginHref();
    return false;
  }
  return true;
}

function logout() {
  if (typeof window.__sentinelSocketDisconnect === 'function') window.__sentinelSocketDisconnect();
  State._dashboardBooted = false;  // ← add this
  State._alertsBooted = false;   // ← add this

  localStorage.removeItem('token'); sessionStorage.removeItem('token');
  localStorage.removeItem('currentUser'); sessionStorage.removeItem('currentUser');
  window.location.href = getLoginHref();
}

function bindLogoutActions() {
  document.querySelectorAll('a[href$="login.html"]').forEach(link => {
    if (link.dataset.boundLogout === '1') return;
    link.dataset.boundLogout = '1';
    link.addEventListener('click', e => {
      e.preventDefault();
      logout();
    });
  });
}




function syncCurrentUserUI() {
  const currentUser = JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}'));
  if (!currentUser.name) return;

  document.querySelectorAll('.u-name, .user-name').forEach(el => {
    el.textContent = currentUser.name;
  });

  const userInitials = initials(currentUser.name);
  document.querySelectorAll('.topbar-avatar, .sidebar-avatar').forEach(el => {
    el.textContent = userInitials;
  });

  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle && State.currentPage === 'dashboard') {
    topbarTitle.textContent = `${t('welcome')}, ${currentUser.name}`;
  }

  const roleLabel = (currentUser.role || 'security').replace('_', ' ');
  document.querySelectorAll('.u-role, .user-role').forEach(el => {
    el.textContent = roleLabel.replace(/\b\w/g, c => c.toUpperCase());
  });
}





//editsssssssssssssssssssssssssssssssssssssss
async function apiRequest(path, options = {}) {
  const skipAuth = options.skipAuth === true;
  const timeoutMs = options.timeoutMs ?? 25000;
  const fetchOpts = { ...options };
  delete fetchOpts.skipAuth; //???????????????????????????????????????????????????
  delete fetchOpts.timeoutMs;//?????????????????????????????????????????????????????

  const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
  const headers = { ...(fetchOpts.headers || {}) };
  if (!headers['Content-Type'] && !(fetchOpts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token && !skipAuth) headers.Authorization = `Bearer ${token}`;

  let abortTimer = null;
  const ownAbort = !fetchOpts.signal && timeoutMs > 0 ? new AbortController() : null;
  if (ownAbort) {
    abortTimer = setTimeout(() => ownAbort.abort(), timeoutMs);
  }
  const signal = fetchOpts.signal || (ownAbort ? ownAbort.signal : undefined);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers, signal });
  } catch (e) {
    if (ownAbort && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      throw new Error(
        'Request timed out or the API is unreachable. Start the backend or set window.__API_BASE__.'
      );
    }
    throw e;
  } finally {
    if (abortTimer) clearTimeout(abortTimer);
  }
  if (response.status === 401 && !skipAuth && token) {
    localStorage.removeItem('token'); sessionStorage.removeItem('token');
    localStorage.removeItem('currentUser'); sessionStorage.removeItem('currentUser');
    if (typeof window !== 'undefined' && window.__SPA_ENABLED__ && /index\.html/i.test(window.location.pathname)) {
      const h = window.location.hash;
      sessionStorage.setItem('postLoginHash', h && h !== '#' ? h : '#/dashboard');
    }
    window.location.href = getLoginHref();
    throw new Error('SESSION_EXPIRED');
  }
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    let message = payload?.message || payload?.error || 'Request failed';
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      const detail = payload.errors.map(e => e?.message || e).filter(Boolean).join('; ');
      if (detail) message = `${message}: ${detail}`;
    }
    throw new Error(message);
  }
  return payload;
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

/** Normalize GET /camera/ document for UI (matches backend camera model). */
function mapCameraFromApi(c) {
  const apiOnline = String(c.status || '').toLowerCase() === 'online';
  const isEnabled = c.isEnabled !== false;
  const isDeleted = c.isDeleted === true;
  const displayOnline = !isDeleted && apiOnline && isEnabled;
  return {
    id: c.id || c._id,
    cameraAiId: String(c.cameraAiId || '').toUpperCase(),
    name: c.name || 'Camera',
    ip: c.ip || '-',
    rtspUrl: c.rtspUrl || '',
    location: c.location || '-',
    apiStatus: String(c.status || 'offline').toLowerCase(),
    isEnabled,
    isDeleted,
    status: displayOnline ? 'online' : 'offline',
    added: (c.createdAt || '').slice(0, 10),
    alerts: c.alertCount != null ? c.alertCount : 0
  };
}

function getCurrentUserRole() {
  try {
    return String(JSON.parse((localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}')).role || '');
  } catch (_) {
    return '';
  }
}

function userIsSuperAdmin() {
  return getCurrentUserRole() === 'super_admin';
}

function userIsAdmin() {
  return getCurrentUserRole() === 'admin';
}

function userCanManageUsers() {
  const r = getCurrentUserRole();
  return r === 'super_admin' || r === 'admin';
}

function userCanMarkFalseAlert() {
  const r = getCurrentUserRole();
  return r === 'super_admin' || r === 'admin';
}

function userCanOpenIncident() {
  const r = getCurrentUserRole();
  return r === 'super_admin' || r === 'admin' || r === 'security';
}

function alertLocksAfterIncident(status) {
  return String(status || '').toLowerCase() === 'incident_created';
}

function deletedRowClassForSuper(isDeleted) {
  return userIsSuperAdmin() && isDeleted ? 'table-row-deleted-super' : '';
}

function deletedRowBadgeForSuper(isDeleted) {
  if (!userIsSuperAdmin() || !isDeleted) return '';
  return '<span class="badge-deleted-framed">Deleted</span>';
}

function applySidebarRbac() {
  const r = getCurrentUserRole();
  document.querySelectorAll('.sidebar .nav-link[data-page="admins"]').forEach(el => {
    el.classList.toggle('d-none', r === 'security');
  });
}










/** SPA: main app is index.html with hash routes; login stays separate. */
const SPA_ROUTE_PAGES = ['dashboard', 'alerts', 'cameras', 'incidents', 'admins', 'settings', 'profile'];
const SPA_TITLES = {
  dashboard: 'Dashboard',
  alerts: 'Alerts',
  cameras: 'Cameras',
  incidents: 'Incidents',
  admins: 'Admin Management',
  settings: 'Settings',
  profile: 'Profile'
};

function navigateTo(page) {
  if (window.__SPA_ENABLED__ && SPA_ROUTE_PAGES.includes(page)) {
    const hash = page === 'dashboard' ? '#/dashboard' : '#/' + page;
    if (window.location.hash !== hash) window.location.hash = hash;
    else applySpaRouteFromHash();
    return;
  }
  const routes = {
    dashboard: 'index.html#/dashboard',
    alerts: 'index.html#/alerts',
    cameras: 'index.html#/cameras',
    incidents: 'index.html#/incidents',
    admins: 'index.html#/admins',
    settings: 'index.html#/settings',
    profile: 'index.html#/profile'
  };
  const url = routes[page];
  if (url) window.location.href = url;
}



//????????????????????????????????????????????????????????????????????????????????????????????????????
function applySpaRouteFromHash() {
  if (!window.__SPA_ENABLED__) return;
  let p = (window.location.hash || '#/dashboard').replace(/^#\/?/, '').split('/')[0];
  if (p === 'history') p = 'incidents';
  if (!SPA_ROUTE_PAGES.includes(p)) p = 'dashboard';
  document.querySelectorAll('.page-content .page').forEach(el => el.classList.remove('active'));
  const pageEl = document.getElementById('page-' + p);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === p);
  });
  const tb = document.getElementById('topbarTitle');
  if (tb) tb.textContent = SPA_TITLES[p] || 'Sentinel';
  State.currentPage = p;
  // Dispatch on document so listeners registered on document receive the event
  // (window.dispatch + default bubbles:false does not reach document).
  document.dispatchEvent(new CustomEvent('spa:route', { bubbles: true, detail: { page: p } }));
}



//????????????????????????????????????????????????????????????????????????????????????????????????????
function initSpaShell() {
  if (!window.__SPA_ENABLED__) return;
  if (!(localStorage.getItem('token') || sessionStorage.getItem('token'))) {
    sessionStorage.setItem(
      'postLoginHash',
      window.location.hash && window.location.hash !== '#' ? window.location.hash : '#/dashboard'
    );
    hideLoader();
    window.location.href = getLoginHref();
    return;
  }
  window.addEventListener('hashchange', applySpaRouteFromHash);
  if (!window.location.hash || window.location.hash === '#') window.location.hash = '#/dashboard';
  else applySpaRouteFromHash();
}



document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initSpaShell, 0);
});

function updateSidebarBadges() {}

const NOTIF_MAX = 40;

function notifTimeAgo(ts) {
  const t = typeof ts === 'number' ? ts : new Date(ts || Date.now()).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function notifIconHtml(kind) {
  if (kind === 'weapon') {
    return '<div class="notif-icon" style="background:var(--danger-glow);color:var(--danger)"><i class="fas fa-gun fa-xs"></i></div>';
  }
  if (kind === 'harassment') {
    return '<div class="notif-icon" style="background:rgba(168,85,247,0.12);color:#a855f7"><i class="fas fa-person-rays fa-xs"></i></div>';
  }
  if (kind === 'incident') {
    return '<div class="notif-icon" style="background:rgba(0,212,255,0.12);color:var(--primary)"><i class="fas fa-triangle-exclamation fa-xs"></i></div>';
  }
  if (kind === 'camera') {
    return '<div class="notif-icon" style="background:rgba(148,163,184,0.1);color:var(--text-muted)"><i class="fas fa-video fa-xs"></i></div>';
  }
  return '<div class="notif-icon" style="background:var(--success-glow);color:var(--success)"><i class="fas fa-bell fa-xs"></i></div>';
}

function pushNotification(entry) {
  const id = 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  State.notifications.unshift({
    id,
    read: false,
    at: Date.now(),
    ...entry
  });
  State.notifications = State.notifications.slice(0, NOTIF_MAX);
  renderNotificationsDropdown();
  updateNotifDotAndCount();
}

function updateNotifDotAndCount() {
  const unread = State.notifications.filter(n => !n.read).length;
  const label = unread > 99 ? '99+' : String(unread);
  const countEl = document.getElementById('notifCount');
  if (countEl) {
    countEl.textContent = label;
    countEl.classList.toggle('d-none', unread === 0);
  }
  const navBadge = document.getElementById('notifNavBadge');
  if (navBadge) {
    navBadge.textContent = label;
    navBadge.classList.toggle('d-none', unread === 0);
    document.querySelectorAll('.notif-dot').forEach(dot => dot.classList.add('d-none'));
  } else {
    document.querySelectorAll('.notif-dot').forEach(dot => {
      dot.classList.toggle('d-none', unread === 0);
    });
  }
}

function markAllNotificationsRead() {
  State.notifications.forEach(n => {
    n.read = true;
  });
  updateNotifDotAndCount();
  renderNotificationsDropdown();
}

function handleNotificationClick(n) {
  n.read = true;
  updateNotifDotAndCount();
  renderNotificationsDropdown();

  if (n.incidentId) {
    navigateTo('incidents');
    const iid = n.incidentId;
    if (typeof window.loadIncidents === 'function') {
      window.loadIncidents().then(() => {
        if (typeof window.viewIncidentDetail === 'function') window.viewIncidentDetail(iid);
      });
    } else {
      setTimeout(() => {
        if (typeof window.viewIncidentDetail === 'function') window.viewIncidentDetail(iid);
      }, 350);
    }
    return;
  }
  if (n.alertId) {
    navigateTo('alerts');
    const aid = n.alertId;
    if (typeof window.loadAlerts === 'function') {
      window.loadAlerts().then(() => {
        if (typeof viewAlertDetail === 'function') viewAlertDetail(aid);
      });
    } else if (typeof viewAlertDetail === 'function') {
      viewAlertDetail(aid);
    }
    return;
  }
  if (n.cameraId) {
    navigateTo('cameras');
    const cid = n.cameraId;
    if (typeof window.loadCameras === 'function') window.loadCameras();
    setTimeout(() => {
      if (typeof openCameraDetailModalById === 'function') openCameraDetailModalById(cid);
    }, 350);
  }
}

function renderNotificationsDropdown() {
  const listEl = document.getElementById('notificationsList');
  if (!listEl) return;
  const items = State.notifications;
  if (!items.length) {
    listEl.innerHTML = `<div class="px-3 py-4 text-center text-muted small" data-i18n="noNotifications">${t('noNotifications')}</div>`;
    return;
  }
  listEl.innerHTML = items
    .map(
      n => `
    <div class="notif-item${n.read ? '' : ' unread'}" role="button" tabindex="0" data-notif-id="${n.id}">
      ${notifIconHtml(n.kind)}
      <div class="notif-text"><p>${n.title}</p><span>${notifTimeAgo(n.at)}</span></div>
    </div>`
    )
    .join('');
  listEl.querySelectorAll('[data-notif-id]').forEach(el => {
    el.addEventListener('click', () => {
      const nid = el.getAttribute('data-notif-id');
      const found = State.notifications.find(x => x.id === nid);
      if (found) handleNotificationClick(found);
    });
  });
}

function bindNotificationsDropdown() {
  const btn = document.getElementById('notificationsDropdownToggle');
  if (!btn || btn.dataset.notifBound === '1') return;
  btn.dataset.notifBound = '1';
  btn.addEventListener('show.bs.dropdown', () => markAllNotificationsRead());
  renderNotificationsDropdown();
  updateNotifDotAndCount();
}

function mergeSocketAlertIntoState(doc) {
  if (!doc) return;
  const id = String(doc._id || doc.id);
  const camAi = String(doc.cameraAiId || '').trim();
  const item = {
    id,
    sid: doc.sid,
    isDeleted: doc.isDeleted === true,
    cameraAiId: camAi || '—',
    cam: camAi || '—',
    camId: doc.cameraId != null ? String(doc.cameraId) : '',
    type: doc.type || 'unknown',
    typeLabel: alertTypeLabel(doc.type),
    status: doc.status || 'new',
    time: (doc.createdAt || doc.timestamp || doc.time || '')
      .toString()
      .replace('T', ' ')
      .slice(0, 19),
    confidence: alertConfidencePercent(doc.confidence != null ? doc.confidence : doc.score),
    details: doc.details || doc.description || 'No details provided.',
    frameImageUrl: doc.frameImageUrl || ''
  };
  const list = Array.isArray(State.alertList) ? State.alertList : [];
  const idx = list.findIndex(x => String(x.id) === id);
  if (idx >= 0) list[idx] = { ...list[idx], ...item };
  else list.unshift(item);
  State.alertList = list;
  const cnt = document.getElementById('alertCount');
  if (cnt) cnt.textContent = String(State.alertList.filter(x => !x.isDeleted).length);
}

function mergeSocketCameraIntoState(doc) {
  if (!doc || typeof mapCameraFromApi !== 'function') return;
  try {
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const mapped = mapCameraFromApi({ ...plain, id: plain._id || plain.id });
    const list = Array.isArray(State.cameraList) ? State.cameraList : [];
    const idx = list.findIndex(c => String(c.id) === String(mapped.id));
    if (idx >= 0) list[idx] = mapped;
    else list.push(mapped);
    State.cameraList = list;
    if (State.currentPage === 'cameras' && typeof window.renderCamerasPage === 'function') {
      window.renderCamerasPage();
    }
  } catch (_) {
    /* ignore */
  }
}

function handleDashboardSocketEvent(eventName, payload) {
  console.log('[socket event]', eventName, 'currentPage:', State.currentPage, 'dashboardBooted:', State._dashboardBooted);

  const p = payload;
  const notifKind =
    String(p?.type || '').toLowerCase() === 'weapon'
      ? 'weapon'
      : p?.type === 'harassment'
        ? 'harassment'
        : 'alert';

  // if (eventName === 'alert:created') {
  //   mergeSocketAlertIntoState(p);
  //   pushNotification({
  //     kind: notifKind,
  //     title: `New ${alertTypeLabel(p.type)} · ${String(p.cameraAiId || '').trim() || 'Alert'}${p.sid != null ? ' #' + p.sid : ''}`,
  //     alertId: String(p._id || p.id)
  //   });
  //   window.renderAlertsPage?.();
  //   if (typeof window.updateCameraFilterOptions === 'function') window.updateCameraFilterOptions();
  //   if (State.currentPage === 'dashboard') {
  //     window.renderDashboardOverview?.();
  //     window.renderDashboardCharts?.();
  //   }
  //   return;
  // }
  if (eventName === 'alert:created') {
    mergeSocketAlertIntoState(p);
    pushNotification({
        kind: notifKind,
        title: `New ${alertTypeLabel(p.type)} · ${String(p.cameraAiId || '').trim() || 'Alert'}${p.sid != null ? ' #' + p.sid : ''}`,
        alertId: String(p._id || p.id)
    });

    // Only re-render the alerts page if the user is actually on it
    if (State.currentPage === 'alerts') {
        window.renderAlertsPage?.();
        if (typeof window.updateCameraFilterOptions === 'function') window.updateCameraFilterOptions();
    }

    if (State.currentPage === 'dashboard') {
        if (window.renderDashboardAlertsOnly) window.renderDashboardAlertsOnly();
        else window.renderDashboardOverview?.();
        window.renderDashboardCharts?.();
    }

    return;
}

if (eventName === 'alert:updated') {
  mergeSocketAlertIntoState(p);
  pushNotification({
    kind: 'alert',
    title: `Alert updated · ${alertStatusLabel(p.status)} (AI ID ${String(p.cameraAiId || '—')})`,
    alertId: String(p._id || p.id)
  });
  if (State.currentPage === 'alerts') {      // ← add this guard
    window.renderAlertsPage?.();
  }
  if (State.currentPage === 'dashboard') {
    if (window.renderDashboardAlertsOnly) window.renderDashboardAlertsOnly();
    else window.renderDashboardOverview?.();
    window.renderDashboardCharts?.();
  }
  return;
}

  if (eventName === 'incident:created') {
    const incId = String(p._id || p.id);
    pushNotification({
      kind: 'incident',
      title: `Incident opened · ${p.sid != null ? 'INC #' + p.sid : incId.slice(-6)}`,
      incidentId: incId
    });
    if (State.currentPage === 'incidents') window.loadIncidents?.();
    return;
  }

  if (eventName === 'incident:updated') {
    pushNotification({
      kind: 'incident',
      title: `Incident updated · ${p.sid != null ? '#' + p.sid : String(p._id || '').slice(-6)}`,
      incidentId: String(p._id || p.id)
    });
    if (State.currentPage === 'incidents') window.loadIncidents?.();
    return;
  }

  if (eventName === 'incident:deleted') {
    pushNotification({
      kind: 'incident',
      title: `Incident archived · ${p.sid != null ? '#' + p.sid : ''}`,
      incidentId: String(p._id || p.id)
    });
    if (State.currentPage === 'incidents') window.loadIncidents?.();
    return;
  }

  if (eventName === 'incident:restored') {
    pushNotification({
      kind: 'incident',
      title: `Incident restored · ${p.sid != null ? '#' + p.sid : ''}`,
      incidentId: String(p._id || p.id)
    });
    if (State.currentPage === 'incidents') window.loadIncidents?.();
    return;
  }

  if (eventName === 'camera:statusChanged') {
    mergeSocketCameraIntoState(p);
    const name = p.name || 'Camera';
    const st = p.status || 'unknown';
    pushNotification({
      kind: 'camera',
      title: `${name} · ${st}`,
      cameraId: String(p._id || p.id)
    });
    if (State.currentPage === 'dashboard') window.renderDashboardOverview?.();
    return;
  }

  if (eventName === 'camera:toggled') {
    mergeSocketCameraIntoState(p);
    pushNotification({
      kind: 'camera',
      title: `${p.name || 'Camera'} · ${p.isEnabled ? 'enabled' : 'disabled'}`,
      cameraId: String(p._id || p.id)
    });
    if (State.currentPage === 'dashboard') window.renderDashboardOverview?.();
  }
}

document.addEventListener('sentinel:socket', ev => {
  const d = ev.detail;
  if (!d || !d.event) return;
  try {
    handleDashboardSocketEvent(d.event, d.payload);
  } catch (err) {
    console.warn('[socket handler]', err);
  }
});

//????????????????????????????????????????????????????????????????????????????????????????????????????
function detailRow(icon, label, value) {
  return `<div>
    <div class="d-flex align-items-center gap-2 mb-1">
      <i class="${icon}" style="color:var(--primary);font-size:0.75rem;width:14px"></i>
      <span style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-weight:600">${label}</span>
    </div>
    <div style="font-size:0.83rem;color:var(--text-primary);padding-left:22px">${value}</div>
  </div>`;
}

// function refreshAlertsAfterMutation() {
//   // const p = window.loadAlerts?.();
//   const after = () => {
//     if (State.currentPage === 'dashboard') {
//       window.renderDashboardOverview?.();
//       window.renderDashboardCharts?.();
//     }
//   };
//   if (p && typeof p.then === 'function') p.then(after).catch(() => {});
//   else after();
// }
function refreshAlertsAfterMutation() {
  if (State.currentPage === 'alerts') {
    window.renderAlertsPage?.();
    window.updateCameraFilterOptions?.();
  }
  if (State.currentPage === 'dashboard') {
    if (window.renderDashboardAlertsOnly) window.renderDashboardAlertsOnly();
    else window.renderDashboardOverview?.();
    window.renderDashboardCharts?.();
  }
}

function markFalseAlert(id) {
  const a = State.alertList.find(x => String(x.id) === String(id));
  if (a && alertLocksAfterIncident(a.status)) {
    showToast('Cannot mark false: an incident is already opened for this alert.', 'warning');
    return;
  }
  apiRequest(`/alert/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'false' })
  })
    .then(() => {
      const a = State.alertList.find(x => String(x.id) === String(id));
      if (a) a.status = 'false';
      refreshAlertsAfterMutation();
      window.renderAlertsPage?.();
      showToast('Alert marked as false', 'warning');
    })
    .catch(err => handleApiCatch(err, 'Status update failed.'));
}

function softDeleteAlert(id) {
  if (!userIsSuperAdmin()) {
    showToast('Only a super admin can archive alerts.', 'warning');
    return;
  }
  openConfirmModal({
    title: 'Archive this alert?',
    message: 'You can restore it later from the alerts list.',
    confirmText: 'Archive',
    onConfirm: () => {
      apiRequest(`/alert/${id}`, { method: 'DELETE' })
        .then(() => {
          showToast('Alert archived.', 'success');
          const a = State.alertList.find(x => String(x.id) === String(id));
          if (a) a.isDeleted = true;
          refreshAlertsAfterMutation();
          window.renderAlertsPage?.();
          bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide();
        })
        .catch(err => handleApiCatch(err, 'Archive failed.'));
    }
  });
}

let pendingIncidentAlertId = null;

function submitCreateIncident(alertId, handledByUserId) {
  const a = State.alertList.find(x => String(x.id) === String(alertId));
  if (!a || !a.camId) {
    showToast('Missing camera linkage for this alert.', 'danger');
    return;
  }
  const frameImageUrl = a.frameImageUrl || 'https://via.placeholder.com/640x360.png';
  const body = {
    alertId: String(alertId),
    cameraId: String(a.camId),
    frameImageUrl
  };
  const r = getCurrentUserRole();
  if (r === 'admin' || r === 'super_admin') {
    if (!handledByUserId) {
      showToast('Select a security officer to assign.', 'warning');
      return;
    }
    body.handledBy = String(handledByUserId);
  }
  apiRequest('/incident/', {
    method: 'POST',
    body: JSON.stringify(body)
  })
    .then(() => {
      showToast('Incident created.', 'success');
      bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide();
      bootstrap.Modal.getInstance(document.getElementById('assignIncidentModal'))?.hide();
      refreshAlertsAfterMutation();
      navigateTo('incidents');
    })
    .catch(err => handleApiCatch(err, 'Could not create incident.'));
}

function openIncidentFromAlert(id) {
  if (!userCanOpenIncident()) {
    showToast('You do not have permission to open incidents.', 'warning');
    return;
  }
  const a = State.alertList.find(x => String(x.id) === String(id));
  if (!a || !a.camId) {
    showToast('Missing camera linkage for this alert.', 'danger');
    return;
  }
  if (a.isDeleted) {
    showToast('This alert is archived.', 'warning');
    return;
  }
  if (alertLocksAfterIncident(a.status)) {
    showToast('An incident already exists for this alert.', 'warning');
    return;
  }
  const r = getCurrentUserRole();
  if (r === 'security') {
    submitCreateIncident(id, null); // how can the request get the sec id since in submit if handled by is null ot returns
    return;
  }
  pendingIncidentAlertId = id;
  apiRequest('/user/')
    .then(res => {
      const users = asArray(res).filter(u => String(u.role || '').replace(/\s+/g, '_') === 'security');
      const sel = document.getElementById('assignIncidentHandledBy');
      if (!sel) {
        showToast('Assignment UI missing.', 'danger');
        return;
      }
      if (users.length === 0) {
        showToast('No security users found. Create a security user first.', 'warning');
        return;
      }
      sel.innerHTML = users
        .map(u => {
          const uid = u.id || u._id;
          return `<option value="${uid}">${u.name || u.email || uid}</option>`;
        })
        .join('');
      bootstrap.Modal.getOrCreateInstance(document.getElementById('assignIncidentModal')).show();
    })
    .catch(err => handleApiCatch(err, 'Could not load users.'));
}









//????????????????????????????????????????????????????????????????????????????????????????????????????


function confirmOpenIncidentFromAlert() {
  const sel = document.getElementById('assignIncidentHandledBy');
  const v = sel?.value;
  if (!pendingIncidentAlertId || !v) {
    showToast('Select a security officer.', 'warning');
    return;
  }
  submitCreateIncident(pendingIncidentAlertId, v);
  pendingIncidentAlertId = null;
}





async function viewAlertDetail(id) {
  let a = State.alertList && State.alertList.find(x => String(x.id) === String(id));
  if (!a) {
    try {
      const res = await apiRequest(`/alert/${id}`);
      const doc = res?.data || res;
      if (doc) {
        if (!State.alertList) State.alertList = [];
        mergeSocketAlertIntoState(doc);
        a = State.alertList.find(x => String(x.id) === String(id));
      }
    } catch (err) {
      console.warn("Could not fetch alert:", err);
    }
  }

  if (!a) {
    showToast('Alert could not be loaded.', 'warning');
    return;
  }
  const content = document.getElementById('alertDetailContent');
  if (!content) return;
  const frame = a.frameImageUrl
    ? `<img src="http://localhost:3000${a.frameImageUrl}" alt="" class="img-fluid rounded" style="max-height:280px;width:100%;object-fit:contain;background:#000">`
    : `<i class="fas fa-video" style="font-size:3rem;color:rgba(0,212,255,0.15)"></i>`;
  const camLabel = a.cameraAiId && a.cameraAiId !== '—' ? a.cameraAiId : a.cam;
  const idLabel = a.sid != null && a.sid !== '' ? String(a.sid) : String(a.id);
  const canArchive = userIsSuperAdmin() && !a.isDeleted;
  const canRestore = userIsSuperAdmin() && a.isDeleted;
  const locked = alertLocksAfterIncident(a.status);
  const canInc = userCanOpenIncident() && !a.isDeleted && !locked;
  const canFalse = userCanMarkFalseAlert() && !a.isDeleted && !locked;
  content.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="detection-frame mb-3">
          <div class="detection-frame-bg d-flex align-items-center justify-content-center">
            <div class="detection-overlay"><span class="detection-overlay-label">${String(a.typeLabel || '').toUpperCase()}</span></div>
            ${frame}
          </div>
        </div>
        <div class="d-flex gap-2 flex-wrap align-items-center">
          <span class="badge-status badge-${String(a.type).toLowerCase() === 'weapon' ? 'danger' : 'warning'} px-3 py-2">${a.typeLabel}</span>
          ${statusBadge(a.status)}
          <span class="badge-status badge-warning px-3 py-2"><i class="fas fa-chart-bar me-1"></i>${a.confidence}% Confidence</span>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="card h-100"><div class="card-body">
          <h6 class="card-title mb-3" style="font-size:0.85rem">Alert Information</h6>
          <div class="d-flex flex-column gap-3">
            ${detailRow('fas fa-fingerprint', 'Alert ID', `<span class=" text-primary-custom">${idLabel}</span>${deletedRowBadgeForSuper(a.isDeleted)}`)}
            ${detailRow('fas fa-fingerprint', 'Camera AI ID', `<span>${camLabel}</span>`)}
            ${detailRow('fas fa-clock', 'Date & Time', formatDateTime(a.time))}
            ${detailRow('fas fa-crosshairs', 'Detection Type', a.typeLabel)}
            ${detailRow('fas fa-percentage', 'Confidence', `${a.confidence}%`)}
            ${detailRow('fas fa-circle-info', 'Description', a.details || '—')}
          </div>
          <div class="d-flex flex-wrap gap-2 mt-4">
            ${canFalse ? `<button type="button" class="btn-outline-custom" onclick="markFalseAlert('${a.id}');bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide()">
              <i class="fas fa-times"></i> False Alert
            </button>` : ''}
            ${canInc ? `<button type="button" class="btn-outline-custom" style="border-color:var(--primary);color:var(--primary)" onclick="openIncidentFromAlert('${a.id}')"><i class="fas fa-folder-open"></i> Open incident</button>` : ''}
            ${canArchive ? `<button type="button" class="btn-outline-custom text-danger border-danger" onclick="softDeleteAlert('${a.id}')"><i class="fas fa-box-archive"></i> Archive</button>` : ''}
            ${canRestore ? `<button type="button" class="btn-outline-custom" style="border-color:var(--primary);color:var(--primary)" onclick="restoreAlertById('${a.id}');bootstrap.Modal.getInstance(document.getElementById('alertDetailModal'))?.hide()"><i class="fas fa-rotate-left"></i> Restore</button>` : ''}
          </div>
        </div></div>
      </div>
    </div>`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('alertDetailModal')).show();
}





function openCameraDetailModal(cam) {
  const el = document.getElementById('cameraDetailContent');
  const modal = document.getElementById('cameraDetailModal');
  if (!el || !modal || !cam) return;
  const archived = deletedRowBadgeForSuper(cam.isDeleted);
  el.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">${detailRow('fas fa-fingerprint', 'Camera AI ID', `<span class="font-mono">${cam.cameraAiId || '—'}</span>`)}</div>
      <div class="col-md-6">${detailRow('fas fa-video', 'Name', `${cam.name}${archived ? ' ' + archived : ''}`)}</div>
      <div class="col-md-6">${detailRow('fas fa-network-wired', 'IPv4', `<span class="font-mono">${cam.ip}</span>`)}</div>
      <div class="col-12">${detailRow('fas fa-link', 'RTSP URL', `<span class="font-mono small text-break">${cam.rtspUrl || '—'}</span>`)}</div>
      <div class="col-md-6">${detailRow('fas fa-location-dot', 'Location', cam.location)}</div>
      <div class="col-md-6">${detailRow('fas fa-signal', 'Status', cam.status.charAt(0).toUpperCase() + cam.status.slice(1) + (cam.isEnabled === false ? ' (disabled)' : ''))}</div>
      <div class="col-md-6">${detailRow('fas fa-bell', 'Alert count', String(cam.alerts ?? 0))}</div>
    </div>`;
  bootstrap.Modal.getOrCreateInstance(modal).show();
}

function openCameraDetailModalById(id) {
  const cam = State.cameraList.find(c => String(c.id) === String(id));
  if (!cam) {
    showToast('Camera not found in the current list.', 'warning');
    return;
  }
  openCameraDetailModal(cam);
}

async function hydrateCurrentUser() {
  try {
    if (!(localStorage.getItem('token') || sessionStorage.getItem('token'))) return;
    const data = await apiRequest('/user/me');
    const user = data?.data || data?.user || data;
    if (user && (user.name || user.email)) {
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id || user._id,
        name: user.name || user.fullName || '',
        email: user.email || '',
        role: user.role === 'viewer' ? 'security' : (user.role || 'security')
      }));
      syncCurrentUserUI();
    }
  } catch (_) {
    // Keep UI stable if profile endpoint fails.
  }
}






// ── Helpers ──────────────────────────────────────────────────
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}



function alertTypeLabel(t) {
  const s = String(t || '').toLowerCase();
  if (s === 'weapon') return 'Weapon';
  if (s === 'harassment') return 'Harassment';
  return t ? String(t) : '—';
}




/** IncidentStatus from backend */
function incidentStatusLabel(s) {
  const v = String(s || '');
  const map = { open: 'Open', in_progress: 'In progress', closed: 'Closed' };
  return map[v] || v || '—';
}

function alertConfidencePercent(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

/** Backend AlertStatus → display label */
function alertStatusLabel(status) {
  const s = status == null ? '' : String(status);
  const labels = { new: 'Pending', false: 'False alert', incident_created: 'Incident opened' };
  if (labels[s] !== undefined) return labels[s];
  return s || '—';
}

function statusBadge(status) {
  const key = status == null ? '' : String(status);
  const cssMap = {
    new: 'badge-pending',
    false: 'badge-false',
    incident_created: 'badge-resolved',
    Pending: 'badge-pending',//?
    Resolved: 'badge-resolved',//?
    'False alert': 'badge-false',
    'False Alert': 'badge-false'
  };
  const label = alertStatusLabel(key);
  const cls = cssMap[key] || cssMap[label] || 'badge-pending';
  return `<span class="badge-status ${cls} px-2 py-1 rounded-pill" style="font-size:0.7rem;font-weight:600">${label}</span>`;
}

function formatDateTime(dt) {
  const [d, tStr] = dt.split(' ');
  return `<div style="font-size:0.8rem;font-weight:500">${d}</div><div style="font-size:0.72rem;color:var(--text-muted)">${tStr}</div>`;
}

function timeAgo(dtStr) {
  const then = new Date(dtStr);
  const now = new Date('2025-01-22T15:00:00');
  const diff = Math.floor((now - then) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const colors = { success: '#00e676', danger: '#ff3b5c', warning: '#ffb020', info: '#00d4ff' };
  const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };

  const toast = document.createElement('div');
  toast.style.cssText = `background:var(--bg-card);border:1px solid var(--border);border-left:3px solid ${colors[type]};border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:0.82rem;color:var(--text-primary);box-shadow:0 4px 20px rgba(0,0,0,0.15);min-width:260px;max-width:340px;opacity:0;transform:translateX(20px);transition:all 0.25s ease;font-family:'DM Sans',sans-serif;`;
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]};flex-shrink:0"></i><span style="flex:1">${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 4px;font-size:1rem">&times;</button>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'none';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

window.checkAuth = checkAuth;
window.logout = logout;
window.apiRequest = apiRequest;
window.asArray = asArray;
window.mapCameraFromApi = mapCameraFromApi;
window.API_BASE = API_BASE;
window.hydrateCurrentUser = hydrateCurrentUser;
window.alertStatusLabel = alertStatusLabel;
window.alertTypeLabel = alertTypeLabel;
window.alertConfidencePercent = alertConfidencePercent;
window.incidentStatusLabel = incidentStatusLabel;
window.navigateTo = navigateTo;
window.detailRow = detailRow;
window.viewAlertDetail = viewAlertDetail;
window.markFalseAlert = markFalseAlert;
window.softDeleteAlert = softDeleteAlert;
window.openIncidentFromAlert = openIncidentFromAlert;
window.confirmOpenIncidentFromAlert = confirmOpenIncidentFromAlert;
window.openCameraDetailModal = openCameraDetailModal;
window.openCameraDetailModalById = openCameraDetailModalById;
window.getCurrentUserRole = getCurrentUserRole;
window.userIsSuperAdmin = userIsSuperAdmin;
window.userCanOpenIncident = userCanOpenIncident;
window.userIsAdmin = userIsAdmin;
window.userCanManageUsers = userCanManageUsers;
window.userCanMarkFalseAlert = userCanMarkFalseAlert;
window.handleApiCatch = handleApiCatch;
window.updateSidebarBadges = updateSidebarBadges;
window.getCurrentUserId = getCurrentUserId;
window.alertLocksAfterIncident = alertLocksAfterIncident;
window.openConfirmModal = openConfirmModal;
window.deletedRowBadgeForSuper = deletedRowBadgeForSuper;
window.deletedRowClassForSuper = deletedRowClassForSuper;



/* ============================================================
   SENTINEL AI — Dashboard (SPA shell) — does not overwrite shared globals
   ============================================================ */

   'use strict';

   function alertIsWeapon(type) {
     return String(type || '').toLowerCase() === 'weapon';
   }
   
   function bootDashboard() {
     State.currentPage = 'dashboard';
     loadDashboardData();
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
     setInterval(updateLiveBadges, 3000);
   
     if (window.__SPA_ENABLED__) {
       document.addEventListener('spa:route', e => {
         if (e.detail.page === 'dashboard') {
           if (!State._dashboardBooted) {
             State._dashboardBooted = true;
             bootDashboard();           // first visit — fetch + render
           } else {
             State.currentPage = 'dashboard';
             renderDashboardOverview(); // subsequent visits — just re-render from State
             renderDashboardCharts();
           }
         }
       });
     } else {
       hideLoader();
       bootDashboard();
     }
   });
   
   function loadDashboardData(opts) {
    console.trace('loadDashboardData called from:');  // ← add this

     const skipLoader = opts?.skipLoader ?? false;
     if (!skipLoader) {
       // only show loader on first real boot — it's already visible from page load
     }
     return Promise.all([apiRequest('/camera/'), apiRequest('/alert/')])
       .then(([camRes, alertRes]) => {
         State.cameraList = asArray(camRes).map(c => mapCameraFromApi(c));
         State.alertList = asArray(alertRes).map(a => ({
           id: a.id || a._id,
           sid: a.sid,
           isDeleted: a.isDeleted === true,
           cameraAiId: a.cameraAiId || '—',
           cam: String(a.cameraAiId || '').trim() || '—',
           camId: a.cameraId != null ? String(a.cameraId) : '',
           type: a.type,
           typeLabel: alertTypeLabel(a.type),
           status: a.status || 'new',
           time: (a.createdAt || a.timestamp || '').toString().replace('T', ' ').slice(0, 19),
           confidence: alertConfidencePercent(a.confidence != null ? a.confidence : a.score),
           details: a.details || a.description || 'No details provided.',
           frameImageUrl: a.frameImageUrl || ''
         }));
         renderDashboard();
       })
       .catch(err => handleApiCatch(err, 'Failed to load dashboard data.'))
       .finally(() => {
         if (!skipLoader) hideLoader();
       });
   }
   
   function renderDashboardAlertsOnly() {
     if (State.currentPage !== 'dashboard') return;
     const alertsActive = State.alertList.filter(a => !a.isDeleted);
     const totalAlerts = alertsActive.length;
     const todayStr = new Date().toISOString().slice(0, 10);
     const todayAlerts = alertsActive.filter(a => (a.time || '').startsWith(todayStr)).length;
   
     setHTML('stat-totalAlerts', `<div class="stat-value">${totalAlerts}</div><div class="stat-label" data-i18n="totalAlerts">${t('totalAlerts')}</div><div class="stat-trend down"><i class="fas fa-bell fa-xs"></i> Loaded</div>`);
     setHTML('stat-todayAlerts', `<div class="stat-value">${todayAlerts}</div><div class="stat-label" data-i18n="todayAlerts">${t('todayAlerts')}</div><div class="stat-trend neutral"><i class="fas fa-calendar fa-xs"></i> ${todayStr}</div>`);
   
     const recents = alertsActive.slice(0, 5);
     setHTML('recentAlertsList', recents.map(a => `
       <div class="alert-item alert-item--clickable" role="button" tabindex="0" onclick="viewAlertDetail('${a.id}')">
         <div class="alert-item-icon ${alertIsWeapon(a.type) ? 'weapon' : 'harassment'}">
           <i class="${alertIsWeapon(a.type) ? 'fas fa-gun' : 'fas fa-person-rays'}"></i>
         </div>
         <div class="flex-1">
           <div class="alert-item-title">${a.typeLabel}</div>
           <div class="alert-item-meta"><span class="font-mono">${a.cameraAiId || a.cam}</span> · ${a.confidence}% confidence</div>
         </div>
         <div class="d-flex flex-column align-items-end gap-1">
           <div class="alert-item-time">${timeAgo(a.time)}</div>
           ${statusBadge(a.status)}
         </div>
       </div>
     `).join(''));
   }

   /** Stats, recent alerts, camera status table, live preview grid (no charts). */
   function renderDashboardOverview() {
     if (State.currentPage !== 'dashboard') return;
     
     // Render alert-related parts
     renderDashboardAlertsOnly();

     // Render camera-related parts
     const camsActive = State.cameraList.filter(c => !c.isDeleted);
     const online = camsActive.filter(c => c.status === 'online').length;
     const total = camsActive.length;
   
     setHTML('stat-totalCameras', `<div class="stat-value">${total}</div><div class="stat-label" data-i18n="totalCameras">${t('totalCameras')}</div><div class="stat-trend neutral"><i class="fas fa-minus fa-xs"></i> —</div>`);
     setHTML('stat-activeCameras', `<div class="stat-value">${online}</div><div class="stat-label" data-i18n="activeCameras">${t('activeCameras')}</div><div class="stat-trend up"><i class="fas fa-arrow-up fa-xs"></i> ${total ? Math.round(online / total * 100) : 0}% uptime</div>`);
   
     const camRows = camsActive.slice(0, 6).map(c =>
       `
       <tr class="clickable-row" role="button" tabindex="0" onclick="openCameraDetailModalById('${c.id}')">
         <td><div class="d-flex align-items-center gap-2"><i class="fas fa-video text-muted-custom" style="font-size:0.8rem"></i>${c.name}</div></td>
         <td><span class="badge-status badge-cam-${c.isEnabled}">${c.isEnabled}</span></td>
         <td>${c.location}</td>
         <td><span class="badge-status badge-${c.status}">${c.status.charAt(0).toUpperCase()+c.status.slice(1)}</span></td>
         <td>${c.alerts}</td>
       </tr>
     `).join('');
     setHTML('cameraStatusBody', camRows);
   
     setHTML('livePreviews', camsActive.slice(0, 4).map(c => buildCameraCard(c)).join(''));
   }
   
   function renderDashboardCharts() {
     if (State.currentPage !== 'dashboard') return;
     setTimeout(() => {
       renderBarChart();
       renderDonutChart();
     }, 100);
   }
   
   function renderDashboard() {
     renderDashboardOverview();
     renderDashboardCharts();
   }
   
   function renderBarChart() {
     const ctx = document.getElementById('alertsBarChart');
     if (!ctx) return;
     const isDark = State.theme === 'dark';
     const grouped = {};
     State.alertList.filter(a => !a.isDeleted).forEach(a => {
       const day = (a.time || '').slice(0, 10);
       if (!day) return;
       if (!grouped[day]) grouped[day] = { weapon: 0, harassment: 0 };
       if (String(a.type).toLowerCase().includes('weapon')) grouped[day].weapon += 1;
       else grouped[day].harassment += 1;
     });
     const labels = Object.keys(grouped).sort().slice(-7);
     const weaponData = labels.map(l => grouped[l].weapon);
     const harassmentData = labels.map(l => grouped[l].harassment);
   
     // Update in place — no flash, no canvas blank
     if (State.charts.bar) {
       State.charts.bar.data.labels = labels;
       State.charts.bar.data.datasets[0].data = weaponData;
       State.charts.bar.data.datasets[1].data = harassmentData;
       State.charts.bar.update('none');
       return;
     }
   
     State.charts.bar = new Chart(ctx, {
       type: 'bar',
       data: {
         labels,
         datasets: [
           { label: 'Weapon', data: weaponData, backgroundColor: 'rgba(255,59,92,0.7)', borderColor: '#ff3b5c', borderWidth: 1, borderRadius: 4 },
           { label: 'Harassment', data: harassmentData, backgroundColor: 'rgba(168,85,247,0.7)', borderColor: '#a855f7', borderWidth: 1, borderRadius: 4 }
         ]
       },
       options: {
         responsive: true, maintainAspectRatio: false,
         plugins: { legend: { labels: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 } } } },
         scales: {
           x: { grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }, ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } } },
           y: { grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }, ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } }, beginAtZero: true }
         }
       }
     });
   }
   
   function renderDonutChart() {
     const ctx = document.getElementById('alertsDonutChart');
     if (!ctx) return;
     const isDark = State.theme === 'dark';
     const act = State.alertList.filter(a => !a.isDeleted);
     const weapon = act.filter(a => alertIsWeapon(a.type)).length;
     const harassment = act.filter(a => String(a.type || '').toLowerCase() === 'harassment').length;
   
     // Update in place — no flash, no canvas blank
     if (State.charts.donut) {
       State.charts.donut.data.datasets[0].data = [weapon, harassment];
       State.charts.donut.update('none');
       return;
     }
   
     State.charts.donut = new Chart(ctx, {
       type: 'doughnut',
       data: {
         labels: ['Weapon', 'Harassment'],
         datasets: [{ data: [weapon, harassment], backgroundColor: ['rgba(255,59,92,0.85)', 'rgba(168,85,247,0.85)'], borderWidth: 0, hoverOffset: 4 }]
       },
       options: {
         responsive: true, maintainAspectRatio: false, cutout: '72%',
         plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 }, padding: 16 } } }
       }
     });
   }
   
   function refreshCharts() {
     if (State.currentPage === 'dashboard') renderDashboardCharts();
     if (State.currentPage === 'incidents') {
       setTimeout(() => window.renderHistoryChart?.(), 100);
     }
   }
   
   function buildCameraCard(cam) {
     const rtspShort = (cam.rtspUrl || '').replace(/^rtsp:\/\//, '').slice(0, 36);
     return `
       <div class="col-12 col-md-6 col-xl-3">
         <div class="camera-card camera-card--clickable" role="button" tabindex="0" onclick="openCameraDetailModalById('${cam.id}')">
           <div class="camera-preview">
             <div class="camera-preview-bg">
               ${cam.status === 'online' ? '<div class="scan-line"></div>' : ''}
               <i class="fas fa-video camera-preview-icon"></i>
             </div>
             ${cam.status === 'online' ? `<div class="camera-live-badge"><div class="live-dot"></div> LIVE</div>` : ''}
             <div class="camera-status-badge"><span class="badge-status badge-${cam.status}">${cam.status.charAt(0).toUpperCase()+cam.status.slice(1)}</span></div>
           </div>
           <div class="camera-info">
             <h6>${cam.name}</h6>
             <div class="cam-ip font-mono small text-muted">${cam.ip}${rtspShort ? ` · ${rtspShort}${(cam.rtspUrl || '').length > 40 ? '…' : ''}` : ''}</div>
           </div>
         </div>
       </div>`;
   }
   
   function updateLiveBadges() {}
   
   window.loadDashboardData = loadDashboardData;
   window.renderDashboardOverview = renderDashboardOverview;
   window.renderDashboardAlertsOnly = renderDashboardAlertsOnly;
   window.renderDashboardCharts = renderDashboardCharts;
   window.refreshCharts = refreshCharts;
   window.toggleTheme = toggleTheme;
   window.applyLang = applyLang;
   window.showToast = showToast;

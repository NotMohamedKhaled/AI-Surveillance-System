# Sentinel AI — Surveillance System Dashboard

An AI-powered surveillance system frontend for detecting weapons and harassment incidents in real time.

---

## File structure (simplified)

```
Front/
├── index.html          ← SPA entry: dashboard, alerts, cameras, incidents, admins, settings, profile
├── login.html          ← Login only
├── css/                ← shared.css + per-page styles
├── js/
│   ├── shared.js       ← API, auth, SPA router, i18n
│   ├── index.js        ← Dashboard
│   ├── alerts.js, cameras.js, history.js, admins.js, settings.js, profile.js
│   └── login.js
├── explaination.md     ← File-by-file overview (note spelling)
└── README.md           ← This file
```

---

## Running locally

1. **Open** `index.html` in a browser, or use a static server (recommended):

```bash
python -m http.server 8080
# or
npx serve .
```

2. Point the UI at your API (see `window.__API_BASE__` in `js/shared.js` if you need to override the default).

---

## Features (SPA routes)

| Hash route | Area |
|------------|------|
| `#/dashboard` | Stats, charts, recent alerts, cameras preview |
| `#/alerts` | Alerts table, filters, detail modal |
| `#/cameras` | Cameras CRUD (per RBAC) |
| `#/incidents` | Incidents list and management |
| `#/admins` | Users (super admin / admin per RBAC) |
| `#/settings` | Theme & language |
| `#/profile` | Account & password |

Login: `login.html`. **Profile** is opened from the user dropdown (`#/profile`).

---

## Dependencies (CDN)

- Bootstrap 5.3.3  
- Chart.js 4.4.4  
- Font Awesome 6.5.1  
- Google Fonts (Rajdhani, DM Sans)

---

More detail: **[explaination.md](./explaination.md)**.

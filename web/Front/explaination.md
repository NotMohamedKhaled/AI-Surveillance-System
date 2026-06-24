# Sentinel AI — Front-end explanation

Paths and filenames are relative to this folder: `Front/` (the web root for the static UI).

---

## How the app is wired

1. **`index.html`** is the **main SPA**: one HTML file with **all “pages”** as hidden `<div class="page">` sections. The URL hash (`#/dashboard`, `#/alerts`, `#/profile`, …) decides which section is visible (`shared.js` dispatches `spa:route`).
2. **`shared.js`** loads **first**: API client, auth, routing, i18n, shared UI helpers. Other scripts extend behavior.
3. **`login.html`** is the **only separate auth entry** (not inside the SPA shell). Registration UI was removed; super admins create users from **Admin Management** in the SPA.

---

## HTML files

| File | Role |
|------|------|
| **`index.html`** | SPA shell: loading overlay, sidebar, topbar, **seven views** (`page-dashboard`, `page-alerts`, `page-cameras`, `page-incidents`, `page-admins`, `page-settings`, `page-profile`), modals, etc. Sets `window.__SPA_ENABLED__ = true`. Scripts: `shared.js` → `cameras.js`, `index.js`, `alerts.js`, `history.js`, `admins.js`, `settings.js`, `profile.js`. |
| **`login.html`** | Auth page: email/password form. Uses `shared.js` + `login.js`. After login, redirects to `index.html` + saved hash (see [Auth & bookmarks](#auth--bookmarks)). |

---

## JavaScript files

| File | Role |
|------|------|
| **`js/shared.js`** | **Core library:** `API_BASE`, `State`, `apiRequest`, `checkAuth` / `logout`, **SPA** (`navigateTo`, `applySpaRouteFromHash`, `initSpaShell`, `spa:route`), **i18n**, theme, **RBAC helpers**, camera/alert/incident helpers, modals, `showToast`, `hydrateCurrentUser`, `bindTopbarActions`, `getProfileHref` → `#/profile` for SPA. |
| **`js/index.js`** | **Dashboard:** `loadDashboardData`, charts, `bootDashboard` when route is `dashboard`. |
| **`js/alerts.js`** | **Alerts** route. |
| **`js/cameras.js`** | **Cameras** route. |
| **`js/history.js`** | **Incidents** route (`#/incidents`). |
| **`js/admins.js`** | **Admins** route. |
| **`js/settings.js`** | **Settings** route. |
| **`js/profile.js`** | **Profile** route (`#/profile`): loads `GET /user/me`, `PUT /user/:id` for profile + password. |
| **`js/login.js`** | Login, **`redirectAfterLogin()`** reads `postLoginHash` from `sessionStorage`, optional mock login block. |

---

## CSS files

| File | Role |
|------|------|
| **`css/shared.css`** | Design system and global layout. |
| **`css/index.css`** | Dashboard-specific. |
| **`css/alerts.css`**, **`cameras.css`**, **`history.css`**, **`admins.css`**, **`settings.css`** | Per-route extras (used by SPA sections in `index.html`). |
| **`css/login.css`** | Login page. |
| **`css/profile.css`** | Profile form/card (SPA `#/profile`). |

**External CSS:** Bootstrap 5, Font Awesome, Google Fonts.

---

## Auth & bookmarks

- If you open **`index.html` with a hash** (e.g. `#/alerts`) **without a token**, `checkAuth()` / `initSpaShell()` saves that hash to **`sessionStorage.postLoginHash`** and sends you to **`login.html`**.
- After a successful login, **`redirectAfterLogin()`** sends you to **`index.html` + the saved hash** (default `#/dashboard`), then clears the key.

---

## Practical mental model

- **One app** = `index.html` + `shared.js` + the seven feature scripts (including profile).
- **Auth** = `login.html` → `localStorage.token` → hash routes on `index.html`.

---

## Common questions (historical)

### Register page

**Removed.** The backend only allows **`POST /user/`** for **super admin** with a valid token. User creation is done from **Admin Management** in the SPA.

### Standalone `pages/` folder

**Removed.** The SPA in `index.html` is the only maintained shell; duplicate `pages/*.html` files are no longer in the repo.

---

*End of document.*

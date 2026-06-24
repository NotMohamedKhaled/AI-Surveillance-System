# GradWHD Backend API

This document provides a frontend-facing summary of all currently active API endpoints.

## Base URL

`http://<HOST>:<PORT>/dashboard/api`

## Authentication

- Dashboard endpoints use JWT:
  - `Authorization: Bearer <JWT>`
- AI endpoints use API key middleware:
  - `x-api-key: <AI_KEY>`

---

## Auth

### `POST /auth/login`

- Auth: Public
- Description: Login and receive token
- Body:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

---

## Users

### `GET /user/`

- Auth: `super_admin`
- Description: Get all users

### `GET /user/me`

- Auth: Any authenticated user
- Description: Get current logged-in user profile

### `GET /user/:id`

- Auth: `super_admin`
- Description: Get user by id

### `POST /user/`

- Auth: `super_admin`
- Description: Create user

### `PUT /user/:id`

- Auth: `super_admin`
- Description: Update user

### `DELETE /user/:id`

- Auth: `super_admin`
- Description: Soft delete user

### `PATCH /user/:id/restore`

- Auth: `super_admin`
- Description: Restore soft-deleted user

---

## Cameras

### AI Endpoints

### `GET /camera/ai`

- Auth: AI (`x-api-key`)
- Description: AI fetches available cameras

### `POST /camera/ai/:cameraAiId/alerts`

- Auth: AI (`x-api-key`)
- Content-Type: `multipart/form-data`
- Upload field: `frame`
- Description: AI sends detection alert for a camera

### `POST /camera/ai/:cameraAiId/heartbeat`

- Auth: AI (`x-api-key`)
- Description: AI heartbeat per camera

### Dashboard Endpoints

### `GET /camera/`

- Auth: `super_admin`, `admin`
- Description: Get all cameras

### `POST /camera/`

- Auth: `super_admin`
- Description: Create camera

### `GET /camera/:id`

- Auth: `super_admin`, `admin`
- Description: Get camera by id

### `PUT /camera/:id`

- Auth: `super_admin`
- Description: Update camera

### `DELETE /camera/:id`

- Auth: `super_admin`
- Description: Soft delete camera

### `PATCH /camera/:id/restore`

- Auth: `super_admin`
- Description: Restore soft-deleted camera

### `PATCH /camera/:id/toggle`

- Auth: `super_admin`, `admin`
- Description: Enable or disable camera
- Body:

```json
{
  "isEnabled": true
}
```

---

## Alerts

### `GET /alert/`

- Auth: `super_admin`, `admin`, `security`
- Description: Get all alerts

### `GET /alert/:id`

- Auth: `super_admin`, `admin`, `security`
- Description: Get alert by id

### `PATCH /alert/:id/status`

- Auth: `super_admin`, `admin`
- Description: Update alert status (e.g. mark false alarm)

### `DELETE /alert/:id`

- Auth: `super_admin`
- Description: Soft delete alert

### `PATCH /alert/:id/restore`

- Auth: `super_admin`
- Description: Restore soft-deleted alert

> Note: Direct `POST /alert` is currently commented out in route file (inactive).

---

## Incidents

### `POST /incident/`

- Auth: `security`, `admin`, `super_admin`
- Description: Create incident

### `GET /incident/`

- Auth: `security`, `admin`, `super_admin`
- Description: Get all incidents

### `GET /incident/:id`

- Auth: `security`, `admin`, `super_admin`
- Description: Get incident by id

### `GET /incident/camera/:cameraId`

- Auth: `security`, `admin`, `super_admin`
- Description: Get incidents by camera

### `GET /incident/alert/:alertId`

- Auth: `security`, `admin`, `super_admin`
- Description: Get incidents by alert

### `PATCH /incident/:id`

- Auth: `security`, `admin`, `super_admin`
- Description: Update incident (status/notes/etc.)

### `DELETE /incident/:id`

- Auth: `super_admin`
- Description: Soft delete incident

### `PATCH /incident/:id/restore`

- Auth: `super_admin`
- Description: Restore soft-deleted incident


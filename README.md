# ChroniCare Backend

REST API for **ChroniCare**, a mobile app that helps people living with chronic conditions (diabetes, hypertension, asthma) log their health data, keep track of lab results, and stay on top of their care.

Built with **Node.js, Express 5, Prisma and PostgreSQL**. The companion mobile client lives in [ChroniCareFlutterFront](https://github.com/userman105/ChroniCareFlutterFront).

---

## Table of contents

- [Features](#features)
- [System architecture](#system-architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Authentication flow](#authentication-flow)
- [Data model](#data-model)
- [OCR service contract](#ocr-service-contract)
- [Known limitations & roadmap](#known-limitations--roadmap)

---

## Features

- **Email-verified accounts**: registration sends a 6-digit OTP; accounts stay inactive until verified.
- **JWT auth with refresh tokens**: short-lived access token (15 min by default), refresh token stored hashed, bound to a device fingerprint.
- **Password reset by OTP**: responses never reveal whether an email exists; a successful reset revokes every active session.
- **Health logging**: blood pressure, blood glucose, and weight/height with automatic BMI, each recorded in a unified `UserLogs` timeline.
- **Lab report upload**: JPG/PNG upload (≤ 5 MB) forwarded to an OCR service; the extracted text is returned to the app.
- **Medical profile**: link users to supported diseases (`DIABETES`, `HYPERTENSION`, `ASTHMA`) and allergies.
- **Guest mode**: requests without a token (or with `guest_access_token`) are treated as guests, so the app can use OCR without an account.
- **Health check** endpoint at `GET /health` (used by the app to detect connectivity).

## System architecture

![ChroniCare system architecture](docs/architecture.svg)

```mermaid
flowchart LR
    A["Flutter app<br/>(ChroniCareFlutterFront)"] -- "HTTP REST / JSON" --> B["Express API :3000"]
    B --> M["Middleware<br/>JWT auth · Multer upload"]
    M --> C["Controllers<br/>auth · user"]
    C --> P["Prisma Client"]
    P --> D[("PostgreSQL")]
    C --> E["email.service<br/>Nodemailer"]
    E --> G["Gmail SMTP"]
    C -- "multipart image" --> O["OCR service<br/>FastAPI :8000"]
    M --> U[("src/uploads<br/>local disk")]
```

**Request lifecycle:** `app.js` (CORS, body parsers) → route → middleware (`auth.middleware`, `upload.middleware`) → controller → Prisma → PostgreSQL. Unhandled errors fall through to a central handler that returns `500`.

## Tech stack

| Concern | Choice |
| --- | --- |
| Runtime / framework | Node.js, Express 5 |
| Database / ORM | PostgreSQL, Prisma 6 (migrations in `prisma/migrations`) |
| Auth | `jsonwebtoken`, `bcrypt` |
| Email | `nodemailer` (Gmail SMTP, STARTTLS on 587) |
| File upload | `multer` (disk storage) |
| HTTP client | `axios` + `form-data` (to the OCR service) |
| Dev tooling | `nodemon` |

## Project structure

```
ChroniCareBackend/
├── prisma/
│   ├── schema.prisma          # Data model
│   └── migrations/            # SQL migrations (init → disease enum)
├── prisma.config.ts           # Prisma CLI config (reads DATABASE_URL)
├── src/
│   ├── server.js              # Loads .env, starts HTTP server
│   ├── app.js                 # Express app, middleware, route mounting
│   ├── config/
│   │   ├── prisma.js          # Shared PrismaClient
│   │   └── db.js              # Raw pg Pool (not used by controllers)
│   ├── routes/                # auth.routes.js · user.routes.js
│   ├── controllers/           # auth.controller.js · user.controller.js
│   ├── middleware/            # auth.middleware.js · upload.middleware.js
│   ├── services/              # email.service.js
│   ├── utils/                 # otp.js
│   └── uploads/               # Uploaded lab images (runtime)
└── package.json
```

## Getting started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- A Gmail account with an [app password](https://support.google.com/accounts/answer/185833) for sending OTP emails
- *(Optional)* the OCR service running on port 8000 for lab-report scanning

### Installation

```bash
git clone https://github.com/userman105/ChroniCareBackend.git
cd ChroniCareBackend
npm install
```

Create a `.env` file (see [Environment variables](#environment-variables)), then set up the database:

```bash
npx prisma migrate deploy     # apply migrations
npx prisma generate           # generate the Prisma client
```

> **Seed data required.** `POST /api/user/diseases` looks up rows in `Diseases` (`DIABETES`, `HYPERTENSION`, `ASTHMA`) and `POST /api/user/allergies` expects existing `Allergies` rows. No seed script is included yet, so insert these rows manually (or add a `prisma/seed.js`).

### Run

```bash
npm run dev     # nodemon, auto-reload
npm start       # node src/server.js
```

The server listens on `0.0.0.0:${PORT:-3000}`. Verify with:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | yes | — | Secret for signing access tokens |
| `JWT_EXPIRES_IN` | no | `15m` | Access token lifetime |
| `REFRESH_TOKEN_DAYS` | no | `7` | Refresh token / session lifetime in days |
| `EMAIL_USER` | yes | — | Gmail address used as sender |
| `EMAIL_PASS` | yes | — | Gmail app password |
| `PORT` | no | `3000` | HTTP port |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | no | — | Only used by `config/db.js` (raw `pg` pool) |

Example `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/chronicare"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_DAYS=7
EMAIL_USER="you@gmail.com"
EMAIL_PASS="your-gmail-app-password"
PORT=3000
```

## API reference

Base URL: `http://localhost:3000/api` · Content type: `application/json` (except lab upload, which is `multipart/form-data`).

### Auth, `/api/auth` (public)

| Method | Endpoint | Body | Description |
| --- | --- | --- | --- |
| POST | `/register` | `first_name, last_name, email, password, gender?` (`male`/`female`), `date_of_birth?` (`YYYY-MM-DD`) | Create an inactive account and email an OTP. `201`, or `409` if the email exists |
| POST | `/verify-otp` | `email, otp` | Activate the account |
| POST | `/resend-otp` | `email` | Issue a fresh OTP |
| POST | `/login` | `email, password` | Returns `access_token`, `refresh_token`, `expires_in`, `user`. Returns `403` (and re-sends an OTP) if not activated |
| POST | `/refresh-token` | `refresh_token` | Returns a new `access_token` |
| POST | `/logout` | `refresh_token` | Revokes that session |
| POST | `/forgot-password` | `email` | Sends a reset OTP (same response whether or not the email exists) |
| POST | `/reset-password` | `email, otp, new_password` | Sets the password and revokes all sessions |

### User, `/api/user`

All routes pass through `authMiddleware`. Send `Authorization: Bearer <access_token>`. With no header, or the token `guest_access_token`, the request runs as a **guest** (`user_id = null`).

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/logs` | user | Record a daily log (see below) |
| GET | `/logs/blood-pressure` | user | List blood-pressure readings (ascending by date) |
| GET | `/logs/glucose` | user | List glucose readings |
| GET | `/logs/health-metrics` | user | List weight/height/BMI records |
| POST | `/lab-test` | user / guest | Upload a lab image (`file`), run OCR, and (for users) save a `LabTests` row |
| POST | `/diseases` | user | Attach a disease: `{ "disease_name": "DIABETES" }` |
| POST | `/allergies` | user | Attach an allergy: `{ "allergy_id": 1, "notes": "..." }` |

> Read endpoints return `{ "data": [] }` for guests. `POST /diseases` and `/allergies` need a real user id, so guests will fail on the database call.

**`POST /api/user/logs` payloads**

```jsonc
// Blood pressure
{ "type": "blood_pressure", "data": { "systolic": 120, "diastolic": 80, "notes": "after walk" } }

// Glucose
{ "type": "glucose", "data": { "glucose_level": 110.5, "notes": "fasting" } }

// Weight / height (BMI is computed server-side when both are present)
{ "type": "health_metrics", "data": { "height_cm": 175, "weight_kg": 72 } }
```

Each call writes the measurement row **and** a `UserLogs` entry pointing at it, and responds with `{ message, log_id, type }`.

**`POST /api/user/lab-test`** (`multipart/form-data`)

| Field | Type | Notes |
| --- | --- | --- |
| `file` | image | JPG / JPEG / PNG, max 5 MB |
| `test_type` | string | e.g. `HbA1c` |
| `result_value` | string | optional |
| `result_date` | date string | required for users |

Response: `{ message, lab_test_id?, ocr_text, ocr_lines[] }`.

### Health

`GET /health` → `200 {"status":"ok"}`

## Authentication flow

```mermaid
sequenceDiagram
    participant App
    participant API
    participant DB as PostgreSQL
    participant Mail as Gmail SMTP

    App->>API: POST /auth/register
    API->>DB: create Users(is_activated=false) + UserOtp(hash, +10 min)
    API->>Mail: send OTP
    App->>API: POST /auth/verify-otp
    API->>DB: activate user, delete OTPs
    App->>API: POST /auth/login
    API->>DB: replace session for this device fingerprint
    API-->>App: access_token (JWT, 15 m) + refresh_token (UUID)
    App->>API: any /user/* request (Bearer access_token)
    API-->>App: 401 "Access token expired"
    App->>API: POST /auth/refresh-token
    API-->>App: new access_token
```

- The **refresh token** is a random UUID; only its bcrypt hash is stored in `UserSession`.
- `token_fingerprint` is `SHA-256(user-agent | ip)`. A new login from the same fingerprint replaces the old session; expired sessions are pruned on login.
- OTPs are 6 digits, bcrypt-hashed, valid for 10 minutes, and deleted after use.

## Data model

Defined in [`prisma/schema.prisma`](prisma/schema.prisma).

```mermaid
erDiagram
    Users ||--o{ UserOtp : has
    Users ||--o{ UserSession : has
    Users ||--o{ BloodPressure : records
    Users ||--o{ GlucoseLevels : records
    Users ||--o{ HealthMetrics : records
    Users ||--o{ UserLogs : timeline
    Users ||--o{ LabTests : uploads
    Users ||--o{ Appointments : schedules
    Users ||--o{ NutritionGuidelines : receives
    Users ||--o{ UserDisease : has
    Diseases ||--o{ UserDisease : "linked via"
    Users ||--o{ UserAllergies : has
    Allergies ||--o{ UserAllergies : "linked via"
    Users ||--o{ UserMedications : takes
    Medications ||--o{ UserMedications : "linked via"
    MedicationTypes ||--o{ Medications : classifies
    UserMedications ||--o{ MedicationReminder : triggers
    BloodPressure ||--o{ UserLogs : "referenced by"
    GlucoseLevels ||--o{ UserLogs : "referenced by"
    HealthMetrics ||--o{ UserLogs : "referenced by"
```

Notes:

- `Users.gender` is a `Boolean` (`true` = male, `false` = female), mapped from the strings `male` / `female` at registration.
- `Diseases.disease_name` is the enum `DiseaseName { DIABETES, HYPERTENSION, ASTHMA }`.
- `UserOtp` and `UserSession` cascade-delete with their user.
- Appointments, medications, nutrition guidelines and medication reminders exist in the schema but do not have API endpoints yet.

## OCR service contract

`POST /api/user/lab-test` forwards the uploaded image to an **external** OCR service. This service is not part of this repository. The backend expects:

```
POST http://127.0.0.1:8000/ocr          (multipart/form-data, field "file")
→ 200 { "text": "full extracted text", "lines": ["line 1", "line 2", ...] }
```

The URL is currently hard-coded in `src/controllers/user.controller.js`. If the OCR service is unreachable, the request returns `500` (see [roadmap](#known-limitations--roadmap)).

## Known limitations & roadmap

Things worth tightening before a production release:

- [ ] **Move the OCR URL to an env var** (`OCR_SERVICE_URL`) and return a graceful error or skip OCR if the service is down.
- [ ] **Auth middleware treats a missing header as a guest.** Protected writes (`/diseases`, `/allergies`, `/logs`) should reject guests explicitly with `401`.
- [ ] **Refresh/logout scan all sessions**: both endpoints load every unexpired session and bcrypt-compare each. Use an indexed lookup instead (for example a session id in the token, or a deterministic hash).
- [ ] **Gmail transport sets `tls.rejectUnauthorized: false`**: remove it, or use a transactional email provider.
- [ ] **Uploaded files live on local disk** (`src/uploads`) and are committed to the repo. Add the folder to `.gitignore` and move to object storage (S3 / GCS) for deployments.
- [ ] **Remove `tree.txt`** (contains the full `node_modules` listing) and make sure `.env` is git-ignored.
- [ ] Add input validation (e.g. `zod` / `express-validator`), rate limiting on auth endpoints, and `helmet`.
- [ ] Add a Prisma **seed script** for diseases, allergies and medications.
- [ ] Remove the unused `crypto` npm package (Node's built-in `crypto` is used) and the unused `config/db.js` / `models/user.models.js`.
- [ ] Expose endpoints for appointments, medications, reminders, and nutrition guidelines; add DELETE/PUT for logs.
- [ ] Add automated tests (`npm test` is a placeholder).

## License

ISC (see `package.json`).

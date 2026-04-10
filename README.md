# Eduverse — Modern Learning Management System

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p align="center">
  A production-ready, multi-tenant Learning Management System built for schools, academies, and education businesses — with role-based portals, AI tutoring, proctored exams, real-time messaging, and full internationalization support.
</p>

---

## 📋 Table of Contents

- [Description](#-description)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 📖 Description

**Eduverse** is a full-stack, multi-tenant Learning Management System (LMS) designed to serve diverse educational organizations — from K-12 schools to professional training institutes. It supports five distinct user roles (Student, Teacher, Admin, Parent, Proctor) each with a purpose-built portal and tailored feature set.

Key differentiators:

- **Multi-tenancy**: each organization gets its own isolated environment, branding, and billing plan.
- **AI-powered learning**: study buddy chat, content generation, and mistake remediation.
- **Proctored exams**: real-time anti-cheat monitoring, webcam/screen recording, and integrity scoring.
- **Real-time communication**: WebSocket-powered messaging, study groups, and live sessions.
- **Full i18n**: RTL support, per-tenant locale configuration, and translated content.

---

## ✨ Features

### 🎓 Student Portal
- Personalized dashboard with progress tracking and study streaks
- Course enrollment via invite or join code
- Multi-format lesson viewer (PDF, video, documents)
- Assignment submission with file upload
- Proctored exam-taking with anti-cheat enforcement
- Exam retake system with mistake-based adaptive questions
- Real-time messaging and study group collaboration
- AI Study Buddy for on-demand tutoring
- Attendance tracking and schedule view
- Report cards and grade history

### 🏫 Teacher Portal
- Course creation and lesson management (file upload, ordering)
- Assignment creation with rubrics, due dates, and publishing control
- Exam builder with 7 question types (MCQ, True/False, Short Answer, Essay, Code, Matching, Fill-in-the-Blank)
- Live session management with Zoom webhook integration
- Class attendance marking (QR, Zoom, Manual)
- Submission review and grade management
- Analytics dashboard with class performance insights
- Mistake analytics and student risk scoring
- Parent–teacher messaging

### 🛡️ Admin Portal
- Organization-wide user management (create, invite, deactivate)
- Multi-organization management with plan and billing controls
- Attendance KPI reports and analytics
- Announcement broadcasting
- Calendar and events management
- Custom branding (logo, colors, domain)
- Subscription and payment management (Paymob integration)
- Audit-ready reports and export

### 👨‍👩‍👧 Parent Portal
- View enrolled children's progress, grades, and attendance
- Direct messaging with teachers
- Assignment and exam results visibility
- Calendar and upcoming event awareness

### 🔐 Security & Compliance
- JWT + refresh token authentication
- Anti-cheat event logging (tab switches, clipboard, DevTools, face detection)
- Integrity scoring per exam attempt
- Rate limiting, Helmet, XSS sanitization
- GDPR-compliant data retention settings
- IP whitelisting for exams

### 🌍 Other
- Full internationalization (i18n) with RTL support
- Push notifications (Web Push / VAPID)
- Cloudinary media storage
- SendGrid / SMTP email delivery
- Sentry error monitoring
- Dark/Light mode

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Radix UI |
| **State / Data** | TanStack Query v5, React Hook Form + Zod |
| **Animations** | Framer Motion |
| **Backend** | Express 4, TypeScript, Node.js 20 |
| **Database** | PostgreSQL (Neon / self-hosted), Drizzle ORM |
| **Real-time** | Socket.IO, WebSocket (ws) |
| **Auth** | JWT, bcrypt, Passport.js |
| **AI** | OpenAI API, Google Generative AI |
| **Storage** | Cloudinary, local `multer` |
| **Email** | SendGrid, Nodemailer (SMTP) |
| **Payments** | Paymob |
| **Monitoring** | Sentry, Winston logging |
| **Deployment** | Vercel (frontend), Render / Railway (backend) |

---

## 📁 Project Structure

```
eduverse/
├── client/                    # React + Vite frontend
│   └── src/
│       ├── components/        # Shared UI components (shadcn/ui + custom)
│       ├── hooks/             # Custom React hooks (TanStack Query)
│       ├── pages/             # Route-level page components (~135 pages)
│       │   ├── student-*.tsx  # Student portal pages
│       │   ├── teacher-*.tsx  # Teacher portal pages
│       │   ├── admin-*.tsx    # Admin portal pages
│       │   └── parent-*.tsx   # Parent portal pages
│       ├── contexts/          # React context providers
│       ├── lib/               # Utilities (cn, api client, etc.)
│       ├── i18n/              # Translation files and i18n config
│       └── styles/            # Global CSS and theme tokens
│
├── server/                    # Express + TypeScript backend
│   └── src/
│       ├── api/               # Route handlers (~50 route files)
│       ├── db/
│       │   └── schema.ts      # Drizzle ORM schema (single source of truth)
│       ├── services/          # Business logic services
│       ├── middleware/        # Auth, rate-limit, error handlers
│       ├── repositories/      # Data access layer
│       ├── utils/             # Logger, helpers
│       └── websocket.ts       # Socket.IO real-time server
│
├── shared/                    # Shared types & Zod schemas
│   ├── schema.ts              # Re-exports from shared schema
│   └── permissions.ts         # Role-based permission definitions
│
├── docs/                      # Architecture and API documentation
├── migrations/                # Drizzle migration files
├── drizzle.config.ts          # Drizzle Kit configuration
├── vite.config.ts             # Vite build configuration
└── package.json               # Root scripts
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **PostgreSQL** database (local or managed, e.g. [Neon](https://neon.tech))

### 1. Clone the repository

```bash
git clone https://github.com/your-username/eduverse.git
cd eduverse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)
```

### 4. Push the database schema

```bash
npm run db:push
```

### 5. Start the development server

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend (Vite) | `http://localhost:5173` |
| Backend (Express) | `http://localhost:3001` |

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in the following values:

```env
# ── REQUIRED ──────────────────────────────────────────
DATABASE_URL=postgres://user:password@localhost:5432/eduverse
JWT_SECRET=your-jwt-secret-min-32-chars
SESSION_SECRET=your-session-secret

# ── PRODUCTION ────────────────────────────────────────
CORS_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
PORT=3001

# ── AI FEATURES (optional) ────────────────────────────
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
SEARCH_ENGINE_ID=...

# ── EMAIL ─────────────────────────────────────────────
SENDGRID_API_KEY=...           # Or use SMTP:
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...

# ── FILE UPLOADS (Cloudinary) ─────────────────────────
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# ── PAYMENTS (Paymob) ────────────────────────────────
PAYMOB_API_KEY=...
PAYMOB_INTEGRATION_ID=...
PAYMOB_IFRAME_ID=...
PAYMOB_HMAC_SECRET=...

# ── PUSH NOTIFICATIONS ────────────────────────────────
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# ── ERROR MONITORING (Sentry) ────────────────────────
SENTRY_DSN=https://...
```

> **Never commit your `.env` file.** It is gitignored by default.

---

## 💻 Usage

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend with hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript for production |
| `npm run start` | Run compiled production server |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate-join-code` | Apply join-code migration script |

### Role-Based Portals

| Role | Base Route | Entry Point |
|---|---|---|
| Student | `/student/*` | `/student/dashboard` |
| Teacher | `/teacher/*` | `/teacher/dashboard` |
| Admin | `/admin/*` | `/admin/dashboard` |
| Parent | `/parent/*` | `/parent/dashboard` |
| Super Admin | `/admin/organizations` | Multi-tenant management |

### Onboarding a New Organization

1. An **Admin** registers the organization via `/admin/organizations`.
2. Admin invites users by email (role: student / teacher / parent).
3. Users accept the invite and set their password via the activation link.
4. Students can optionally join courses using a **join code** shared by the teacher.

---

## 📡 API Reference

The full REST API is documented in:

- **OpenAPI spec**: [`docs/openapi.yaml`](./docs/openapi.yaml)
- **Postman collection**: [`docs/Eduverse-API.postman_collection.json`](./docs/Eduverse-API.postman_collection.json)
- **Markdown API docs**: [`docs/API-DOCS.md`](./docs/API-DOCS.md)

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

Tokens are obtained from `POST /api/auth/login` and refreshed via `POST /api/auth/refresh`.

### Key Endpoint Groups

| Prefix | Description |
|---|---|
| `/api/auth` | Login, register, refresh, password reset |
| `/api/courses` | Course CRUD and enrollment |
| `/api/lessons` | Lesson upload and ordering |
| `/api/assignments` | Assignments and submissions |
| `/api/exams` | Exam creation, scheduling, attempts |
| `/api/anti-cheat` | Anti-cheat event logging and review |
| `/api/attendance` | Session and attendance management |
| `/api/analytics` | Dashboards and performance reports |
| `/api/admin` | Admin-only operations |
| `/api/ai-chat` | AI study buddy conversation |

---

## 📸 Screenshots

> Screenshots available in the [`screenshots/`](./screenshots/) directory.

| View | Description |
|---|---|
| Portal Landing | Role-selection landing page |
| Student Dashboard | Progress overview, streaks, upcoming tasks |
| Teacher Dashboard | Class performance, quick actions |
| Exam Builder | Question editor with anti-cheat settings |
| Admin Panel | Organization and user management |

---

## 🏗️ Deployment

### Frontend → Vercel

1. Connect the repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `client/`.
3. Add environment variables:
   - `VITE_API_URL=https://your-backend.onrender.com`
   - `VITE_WS_URL=wss://your-backend.onrender.com`

### Backend → Render / Railway

1. Set **Start Command** to `npm run start`.
2. Set **Build Command** to `npm run build`.
3. Add all backend environment variables from `.env.example`.

> Detailed steps in [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) and [`docs/RENDER_DEPLOYMENT_GUIDE.md`](./docs/RENDER_DEPLOYMENT_GUIDE.md).

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Make changes in small, focused vertical slices.
4. Run type-checks before committing: `npm run check`.
5. Open a Pull Request with:
   - A description of what changed and why.
   - Before/after screenshots for any UI changes.

### Guidelines

- **Backend contracts must not change** unless explicitly required — existing API routes, services, and data shapes are stable.
- Follow the naming conventions in [`AGENTS.md`](./AGENTS.md).
- Use path aliases (`@/`, `@shared/`) for all imports.
- Never commit secrets or `.env` files.

---

## 🗺️ Roadmap

- [ ] **Mobile App** — React Native companion app for students and parents
- [ ] **Question Bank** — reusable, taggable question library shared across exams
- [ ] **Augmented Reality** — AR lesson modules (foundation page already built)
- [ ] **Offline Mode** — PWA with service worker for low-connectivity environments
- [ ] **LTI Integration** — connect with external platforms (Google Classroom, Canvas)
- [ ] **Advanced Analytics** — predictive at-risk scoring and intervention workflows
- [ ] **Zoom Native SDK** — deeper synchronous learning integration
- [ ] **SSO / OAuth** — Google, Microsoft, and SAML login support

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

## 👤 Author

Built and maintained with ❤️ by the Eduverse team.

- GitHub: [@your-username](https://github.com/your-username)
- Email: contact@eduverse.app
- Docs: [`docs/`](./docs/)

---

<p align="center">
  <sub>Additional documentation: <a href="./docs/DEVELOPER_WORKFLOW.md">Developer Workflow</a> · <a href="./docs/ADD_PAGE_TRANSLATION_GUIDE.md">Adding Pages & Translations</a> · <a href="./docs/RELEASE_CHECKLIST.md">Release Checklist</a></sub>
</p>

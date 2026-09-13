# PRIVEX — Autonomous AI Privacy Guardian

> **Vision4X · Bit N Build 2026 Hackathon**

PRIVEX is a full-stack AI-powered application that autonomously discovers where your personal data is exposed online, assesses the risk, generates professional data-removal requests, and tracks the entire lifecycle — all driven by a multi-agent LLM workflow.

---

## Problem

Personal data is scattered across hundreds of data brokers, public directories, leaked databases, and social aggregators. Most people have no idea how much of their information is publicly accessible, and the process of requesting its removal is manual, time-consuming, and legally complex.

## Solution

PRIVEX deploys a team of five autonomous AI agents that work in sequence:

1. **ORCHESTRATOR** — plans the workflow using LLM reasoning
2. **SCOUT** — scans approved data sources to discover exposed PII
3. **RISK** — scores each exposure and explains the risk in plain English
4. **RIGHTS** — generates professional GDPR/DPDP data-erasure request letters
5. **GUARDIAN** — schedules follow-ups and tracks the removal lifecycle

Every step is streamed live to the frontend via Socket.IO — users watch their privacy being protected in real time.

---

## Key Features

- **5-agent LangGraph workflow** — orchestrated multi-agent pipeline with state management
- **Real-time agent activity feed** — Socket.IO streaming of every agent step
- **Privacy Protection Score** — dynamic score based on exposure severity and resolution status
- **Attack Graph visualisation** — interactive SVG showing data exposure relationships
- **Automated removal letters** — LLM-generated GDPR/DPDP-compliant erasure requests
- **Email dispatch** — sends privacy request emails via Nodemailer (Ethereal demo SMTP)
- **Demo processing workflow** — simulates the full acknowledgement → processing → verification → completion lifecycle
- **Follow-up tracking** — auto-schedules 14-day follow-ups for sent requests
- **JWT authentication** — secure session management with bcrypt password hashing
- **Graceful LLM fallback** — all agent outputs have deterministic fallbacks when Ollama is unavailable

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| React Router v6 | Client-side routing |
| Recharts | Dashboard charts |
| Socket.IO Client | Real-time agent events |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server |
| TypeScript | Type safety |
| Socket.IO | Real-time bidirectional events |
| Prisma ORM | Database access |
| SQLite (dev) / PostgreSQL (prod) | Database |
| LangGraph (`@langchain/langgraph`) | Multi-agent workflow graph |
| LangChain (`@langchain/community`) | LLM integration |
| Ollama (`@langchain/ollama`) | Local LLM inference |
| JWT + bcryptjs | Authentication |
| Nodemailer | Email dispatch |
| Helmet + express-rate-limit | Security |
| Zod + express-validator | Input validation |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Dashboard · Exposures · Scan · Requests · Activity  │
└──────────────┬──────────────┬───────────────────────┘
               │ REST API     │ Socket.IO
┌──────────────▼──────────────▼───────────────────────┐
│              Express + Socket.IO Server              │
│  Auth · Privacy · Agents · Dashboard routes          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              LangGraph Multi-Agent Pipeline          │
│                                                      │
│  ORCHESTRATOR → SCOUT → RISK → RIGHTS → GUARDIAN     │
│                                                      │
│  Each agent:                                         │
│   • Reads/writes Prisma DB                           │
│   • Calls Ollama (LLM) with deterministic fallback   │
│   • Emits live events via Socket.IO                  │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼────────────┐
         │   Prisma ORM + SQLite    │
         │   (PostgreSQL in prod)   │
         └──────────────────────────┘
```

---

## Project Structure

```
vision4x-privex/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, Sidebar
│   │   │   └── ui/             # Badge, Card, ErrorBoundary, etc.
│   │   ├── hooks/
│   │   │   ├── useAuth.ts      # JWT auth state
│   │   │   └── useAgentEvents.ts  # Socket.IO event listener
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ScanPage.tsx
│   │   │   ├── ExposuresPage.tsx
│   │   │   ├── ExposureDetailPage.tsx
│   │   │   ├── RiskAnalysisPage.tsx
│   │   │   ├── PrivacyRequestsPage.tsx
│   │   │   ├── AttackGraphPage.tsx
│   │   │   ├── AgentActivityPage.tsx
│   │   │   ├── FollowUpsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts          # REST API client
│   │   │   └── socket.ts       # Socket.IO client
│   │   └── types/index.ts      # Shared TypeScript types
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── agents/
│   │   │   ├── orchestrator/   # Plans the workflow
│   │   │   ├── scout/          # Discovers PII exposures
│   │   │   ├── risk/           # Scores and explains risk
│   │   │   ├── rights/         # Generates removal letters
│   │   │   └── guardian/       # Tracks follow-ups
│   │   ├── controllers/
│   │   │   ├── privacyController.ts
│   │   │   ├── authController.ts
│   │   │   └── agentController.ts
│   │   ├── graph/
│   │   │   └── privacyGraph.ts # LangGraph state machine
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT middleware
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── privacy.ts
│   │   │   ├── agents.ts
│   │   │   └── dashboard.ts
│   │   ├── scripts/
│   │   │   └── seed.ts         # Demo data seeder
│   │   ├── services/
│   │   │   ├── emailService.ts
│   │   │   ├── ollamaService.ts
│   │   │   └── requestWorkflow.ts
│   │   ├── tools/
│   │   │   └── demoDataset.ts  # Controlled demo PII findings
│   │   ├── types/index.ts
│   │   └── utils/
│   │       ├── jwt.ts
│   │       ├── logger.ts
│   │       ├── prisma.ts
│   │       └── socketEmitter.ts
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── prisma/
│   └── schema.prisma           # Database schema (7 models)
│
├── .env.example                # Root env template (Prisma CLI)
├── .gitignore
├── render.yaml                 # Render.com deployment config
├── package.json                # Workspace root
└── README.md
```

---

## Quick Start (Local Demo)

### Prerequisites

- Node.js 18+
- npm 9+
- *(Optional)* [Ollama](https://ollama.com) for local LLM — app works without it using fallback text

### 1. Clone the repository

```bash
git clone https://github.com/rameshdhanush512-lab/Vision4X-Bit-N-Build-2026.git
cd Vision4X-Bit-N-Build-2026
```

### 2. Install dependencies

```bash
# Install all workspaces
npm install
cd server && npm install --legacy-peer-deps && cd ..
cd client && npm install && cd ..
```

### 3. Configure environment

```bash
# Server environment
cp server/.env.example server/.env
# Edit server/.env — the defaults work for local SQLite demo
```

### 4. Set up the database

```bash
# Push schema to create local SQLite database
npx prisma db push --schema prisma/schema.prisma

# Seed with demo data (creates demo user + pre-populated dashboard)
cd server && npx ts-node src/scripts/seed.ts && cd ..
```

### 5. Run the application

```bash
# Start both server and client concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

### 6. Log in with demo credentials

```
Email:    alex.kumar@demo.privex
Password: demo1234
```

---

## Environment Variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3001`) |
| `NODE_ENV` | No | `development` or `production` |
| `DATABASE_URL` | Yes | SQLite: `file:../prisma/dev.db` or PostgreSQL connection string |
| `DIRECT_URL` | Prod only | Direct PostgreSQL URL (bypasses PgBouncer for migrations) |
| `JWT_SECRET` | Yes | Min 32-char random string for signing JWTs |
| `JWT_EXPIRES_IN` | No | JWT expiry (default: `7d`) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | No | Model name (default: `llama3.2`) |
| `CLIENT_ORIGIN` | Yes | Frontend URL for CORS (default: `http://localhost:5173`) |

---

## Ollama / LLM Setup (Optional)

PRIVEX uses Ollama for local LLM inference. All agent outputs have deterministic fallbacks — the app works fully without Ollama.

```bash
# Install Ollama from https://ollama.com
ollama pull llama3.2
ollama serve
```

The server auto-detects Ollama at `OLLAMA_BASE_URL`. If unavailable, agents use built-in template responses.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/dashboard` | Privacy score + summary stats |
| `POST` | `/api/privacy/scan` | Start 5-agent privacy scan |
| `GET` | `/api/privacy/exposures` | List all exposures |
| `GET` | `/api/privacy/exposures/:id` | Exposure detail |
| `POST` | `/api/privacy/analyze` | Re-analyse a specific exposure |
| `GET` | `/api/privacy/requests` | List privacy requests |
| `POST` | `/api/privacy/request` | Create a new request |
| `GET` | `/api/privacy/requests/:id` | Request detail |
| `POST` | `/api/privacy/requests/:id/send` | Send request via email |
| `PATCH` | `/api/privacy/requests/:id/status` | Update request status |
| `GET` | `/api/privacy/followups` | List follow-ups |
| `POST` | `/api/privacy/verify` | Record verification result |
| `GET` | `/api/agents/runs` | Agent run history |
| `GET` | `/health` | Server health check |

All protected endpoints require `Authorization: Bearer <token>`.

---

## Deployment

### Backend — Render.com

1. Connect your GitHub repository to [Render](https://render.com)
2. Render auto-detects `render.yaml` — it configures a Node.js web service
3. Add environment variables in Render dashboard:
   - `DATABASE_URL` — your PostgreSQL/Supabase connection string
   - `DIRECT_URL` — direct database URL
4. After first deploy, open Render shell and run:
   ```bash
   npx prisma db push --schema ../prisma/schema.prisma
   npx ts-node src/scripts/seed.ts
   ```

### Frontend — Vercel

1. Import repository in [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. Add environment variable:
   - `VITE_API_URL` = `https://your-render-service.onrender.com`
4. Deploy

---

## Demo

The seed script pre-populates the dashboard with:

- **6 privacy exposures** across realistic data sources (PublicRecords Directory, Leaked Forum Archive, Marketing Data Exchange, etc.)
- **Risk assessments** for each exposure (2 CRITICAL, 2 HIGH, 1 MEDIUM, 1 LOW)
- **2 data-removal requests** ready to send
- **Follow-up reminders** scheduled 14 days out
- **1 resolved exposure** to demonstrate the full lifecycle
- **5 agent run records** showing the complete workflow history

> **Note:** All demo data is entirely fictional. No real personal information is used or collected.

---

## Team

**Vision4X** — Bit N Build 2026 Hackathon

---

## Disclaimer

PRIVEX is a hackathon demonstration project. The privacy removal requests generated are templates and do not constitute legal advice. For real data removal, consult a qualified privacy professional.

# PRIVEX — Autonomous AI Privacy Guardian

> **Team Vision4X** | Hackathon 2026

PRIVEX is a multi-agent AI privacy guardian that discovers exposed personal information, evaluates privacy risk, prepares legal-grade removal requests, tracks follow-ups, and verifies resolutions — fully autonomously.

---

## 🏆 Problem We Solve

Ordinary people have no practical way to:
- Know where their personal data is exposed
- Understand how risky each exposure actually is
- Submit professional data-removal requests
- Track whether those requests were honoured

PRIVEX automates this entire lifecycle using a coordinated team of AI agents.

---

## 🤖 Agent Architecture

```
USER INPUT
    ↓
ORCHESTRATOR AGENT  — plans, routes, handles failures
    ↓
SCOUT AGENT         — discovers exposed personal data
    ↓
RISK AGENT          — scores severity, explains WHY it matters
    ↓
RIGHTS AGENT        — generates professional removal requests
    ↓
GUARDIAN AGENT      — tracks, schedules follow-ups, verifies resolution
    ↓
MEMORY (PostgreSQL) — persists every decision
    ↓
UPDATED PRIVACY STATUS
```

---

## 🛠 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React + Vite + TypeScript + Tailwind |
| Backend    | Node.js + Express + TypeScript       |
| AI/Agents  | LangGraph.js + Ollama (local LLM)   |
| Database   | PostgreSQL + Prisma ORM             |
| Auth       | JWT + bcrypt                         |
| Realtime   | Socket.IO                            |

**Cost: ₹0** — runs entirely locally using Ollama.

---

## 📁 Project Structure

```
vision4x-privex/
├── client/          # React frontend
├── server/          # Express backend + agents
├── prisma/          # Database schema
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Ollama installed with `llama3.2` or `mistral` pulled

### 1. Clone & Install
```bash
git clone https://github.com/your-org/vision4x-privex.git
cd vision4x-privex
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment
```bash
cp server/.env.example server/.env
# Edit server/.env with your DB credentials and JWT secret
```

### 3. Database Setup
```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Pull Ollama Model
```bash
ollama pull llama3.2
# or: ollama pull mistral
```

### 5. Run
```bash
# From root
npm run dev
```

Frontend: http://localhost:5173  
Backend:  http://localhost:3001

---

## 🎯 Demo Mode

Login with the demo account or register, then press **"Run Privacy Scan"**.

The system will visibly execute the full 5-agent workflow in real time:
1. Scout discovers 6 fictional exposures for demo user "Alex Kumar"
2. Risk Agent scores and explains each one
3. Rights Agent generates removal requests for HIGH/CRITICAL exposures
4. Guardian Agent creates follow-up schedules
5. Dashboard updates with Privacy Protection Score

---

## 🔐 Security

- Passwords hashed with bcrypt (12 rounds)
- JWT auth on all protected routes
- No real personal data collected
- Demo uses entirely fictional data
- `.env` never committed

---

## 👥 Team Vision4X

Built in 24 hours for the Digital Identity & Sovereign Privacy Protection hackathon track.

# Vision4X

Our project for Bit N Build Around the World 2026, built by Team Vision4X.

## Team
- Vision4X Team

## Hackathon
Bit N Build Around the World 2026 – Karnataka

## Project
Details will be updated after the hackathon problem statement is released.

## Status
🚧 In development

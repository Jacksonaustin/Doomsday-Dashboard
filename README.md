# Doomsday Dashboard

## Overview

Doomsday Dashboard is a full-stack emergency preparedness management application designed to help users evaluate and improve household readiness for disasters and long-term emergency scenarios.

Users can:

- Track emergency supplies and inventory
- Estimate resource coverage during disasters
- Identify preparedness gaps
- Receive AI-generated preparedness recommendations
- Manage action checklists for improving readiness

The system combines inventory management, disaster simulation, and machine learning recommendations into a single platform.

---

## Problem Statement

Many households do not know whether they are adequately prepared for emergency situations. Existing tools often provide static checklists or generic advice but do not account for a user's actual inventory, household size, or disaster scenario.

Doomsday Dashboard provides personalized preparedness assessments using stored inventory data, simulation calculations, and machine-learning-generated recommendations.

---

## Core User Workflows

### 1. Inventory Management

Users can:

- Add supplies
- Edit supplies
- Delete supplies
- View inventory status

Inventory data persists in MongoDB.

---

### 2. Disaster Simulation

Users select a disaster scenario and the system:

- Evaluates available inventory
- Calculates estimated resource duration
- Identifies shortages
- Calculates preparedness metrics

---

### 3. AI-Powered Recommendations

The system:

- Analyzes preparedness deficiencies
- Sends inventory gap data to the AI service
- Returns prioritized recommendations
- Allows users to save recommendations to a checklist

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Axios

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### AI / Machine Learning

- Python
- FastAPI
- Sentence Transformers
- Scikit-learn
- NumPy

### DevOps

- Docker
- Git
- GitHub

---

## Architecture

Frontend (React)
↓
Express REST API
↓
MongoDB Database

Express REST API
↓
FastAPI AI Service
↓
Sentence Transformer Recommendation Engine

---

## User Roles

### User

Can:

- Manage inventory
- Run simulations
- View recommendations
- Manage checklist

### Administrator

Can:

- Manage recommendation datasets
- Review system data
- Manage users

---

## Local Development

### Quick start (Docker)

The fastest way to run everything is Docker Compose. See
[Documentation/DOCKER_SETUP.md](Documentation/DOCKER_SETUP.md).

```bash
cp backend/.env.example backend/.env   # then set MONGO_URI and JWT_SECRET
docker compose up -d --build
```

Open http://localhost:8080. To use a local MongoDB instead of Atlas, set
`MONGO_URI=mongodb://mongo:27017/doomsday` in `backend/.env` and add
`--profile local-db` to the `docker compose` command.

### Prerequisites (running each service by hand)

- Node.js 18+
- Python 3.12 (the version the Docker image uses; 3.11+ works)
- MongoDB (Atlas or local)

Start the services in this order: AI service, backend, frontend.

### AI Service

The FastAPI service is in `ml-recommend/`. The first start downloads the
`all-MiniLM-L6-v2` model (about 90 MB); after that it is cached.

```bash
cd ml-recommend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000
```

`GET http://localhost:8000/health` reports `"method": "semantic"` when the model
loaded, or `"tfidf"` if it fell back to keyword matching. Set
`AI_FORCE_FALLBACK=1` to force the fallback.

| Endpoint | Purpose |
| --- | --- |
| `POST /recommendations` | Ranks advice for each shortage from a simulation |
| `POST /food/classify` | Guesses resource type, quantity and shelf life from a typed item name |

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

The Express API is in `backend/` and requires Node.js 18+ and a running MongoDB
instance.

```bash
cd backend
npm install
npm run dev
```

Before starting, copy `backend/.env.example` to `backend/.env` (use
`Copy-Item backend/.env.example backend/.env` in PowerShell or
`cp backend/.env.example backend/.env` on macOS/Linux). Update `MONGO_URI` if
MongoDB is not using the local default. Replace `JWT_SECRET` with a random value
at least 32 characters long. Keep `AI_SERVICE_URL` pointing at the AI service
(`http://127.0.0.1:8000` by default). The API starts on port `5050` by default
(macOS uses 5000 for AirPlay); set `PORT` to change it.

The initial readiness endpoint is `GET http://localhost:5050/api/health`. It
reports whether the API can reach MongoDB. Accounts can be created with
`POST /api/auth/register` (`name`, `email`, and `password`) and used to sign in
with `POST /api/auth/login` (`email` and `password`). Successful registration
and login issue an HTTP-only session cookie; `GET /api/auth/me` verifies it and
`POST /api/auth/logout` clears it. Login allows up to five requests per IP per
15-minute window; further attempts receive HTTP 429 until the window resets.
The inventory page redirects to sign-in when there is no valid session.
Authenticated users can list and add inventory with
`GET /api/inventory` and `POST /api/inventory`, update an item with
`PUT /api/inventory/:id`, or delete one with `DELETE /api/inventory/:id`.
`POST /api/inventory/classify` (`name`) asks the AI service what a typed item is
and returns a `suggestion` (resource type, category, unit, quantity) for the form
to prefill; if the AI service is down it returns `matched: false` and the form
still works by hand.
Inventory items require a name, positive quantity, resource type, and supported
unit; items are scoped to their owner and use the same resource types as disaster
simulations. Checklist items are persisted per user with `GET /api/checklist`
and `POST /api/checklist`; update completion with `PATCH /api/checklist/:id`
(`completed` boolean) or remove an item with `DELETE /api/checklist/:id`.
Inventory and checklist data are cached in the browser's IndexedDB as soon as
it changes. Pending changes sync immediately when possible, are retried every
five minutes, and sync again when connectivity returns. In production, the
service worker caches the application shell so previously loaded inventory and
checklists remain usable offline. Offline edits are associated with the signed-in
user and retained until the server confirms the change.
Unknown routes return a JSON 404 response.

## Testing

```bash
# Backend (from backend/)
npm test

# AI service (from ml-recommend/)
.venv/bin/python -m pytest
```

`npm test` skips the live backend-to-AI tests. To run them against the real
model, start the AI service and then run:

```bash
AI_INTEGRATION_URL=http://127.0.0.1:8000 npm test
```

`ml-recommend/tests/test_contract.py` reads the backend's config and fails if the
resource, scenario or food type names drift apart between the two services.

### AI evaluation

Both models are scored against hand-labeled test sets and simpler baselines
(from ml-recommend/):

```bash
.venv/bin/python -m eval.run_eval --method both       # recommendation ranker
.venv/bin/python -m eval.run_food_eval                 # food classifier
```

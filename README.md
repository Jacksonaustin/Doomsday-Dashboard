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

### Prerequisites

- Node.js
- Python 3.11+
- MongoDB
- Docker (recommended)

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
at least 32 characters long. The API starts on port `5000` by default; set
`PORT` to change it.

The initial readiness endpoint is `GET http://localhost:5000/api/health`. It
reports whether the API can reach MongoDB. Accounts can be created with
`POST /api/auth/register` (`name`, `email`, and `password`) and used to sign in
with `POST /api/auth/login` (`email` and `password`). Successful registration
and login issue an HTTP-only session cookie; `GET /api/auth/me` verifies it and
`POST /api/auth/logout` clears it. The inventory page redirects to sign-in when
there is no valid session. Authenticated users can list and add inventory with
`GET /api/inventory` and `POST /api/inventory`, update an item with
`PUT /api/inventory/:id`, or delete one with `DELETE /api/inventory/:id`.
Inventory items require a name, positive quantity, resource type, and supported
unit; items are scoped to their owner and use the same resource types as disaster
simulations. Unknown routes return a JSON 404 response. Run the backend test
command with `npm test`.

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
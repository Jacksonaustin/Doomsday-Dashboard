# Doomsday Dashboard — Project Workflow Specification

## Project Purpose

Doomsday Dashboard is an emergency preparedness application that helps users determine whether their household is prepared for disasters.

The system maintains persistent inventory data, simulates disaster scenarios, identifies preparedness gaps, and generates intelligent recommendations.

The goal is NOT to be a chatbot.

The goal is to provide data-driven preparedness analysis based on actual user inventory and household information.

---

# Primary Product Goal

Allow a user to answer:

"Am I prepared for this disaster and what should I improve?"

through inventory management, disaster simulation, and AI recommendations.

---

# System Overview

Frontend:
React

Backend:
Node.js
Express

Database:
MongoDB

AI Service:
Python FastAPI

ML Model:
Sentence Transformers (all-MiniLM-L6-v2)

Fallback:
TF-IDF + Logistic Regression

---

# Core Workflow 1: Inventory Management

User Action:
Add inventory item

Required Data:

- Item name
- Quantity
- Category
- Unit

System Behavior:

1. Validate input.
2. Store record in MongoDB.
3. Associate item with current user.
4. Return updated inventory.

Expected Outcome:

User can create, edit, read, and delete inventory items.

---

# Core Workflow 2: Disaster Simulation

User Action:

Select disaster scenario.

Examples:

- Tornado
- Winter Storm
- Long-Term Power Outage
- Flood

System Behavior:

1. Load user inventory.
2. Load household profile.
3. Calculate consumption requirements.
4. Estimate supply duration.
5. Identify shortages.

Expected Output:

{
  preparednessScore: number,
  shortages: [],
  resourceCoverage: []
}

---

# Core Workflow 3: Preparedness Recommendation Engine

User Action:

Request recommendations.

System Behavior:

1. Analyze shortages from simulation.
2. Generate deficiency descriptions.
3. Send descriptions to AI service.
4. AI service ranks recommendations.
5. Return top recommendations.

Expected Output:

{
  recommendations: [
    {
      title: "",
      explanation: "",
      priority: ""
    }
  ]
}

---

# AI Requirements

Use semantic similarity matching.

Model:

all-MiniLM-L6-v2

Recommendation catalog should contain preparedness actions covering:

- Water
- Food
- Medical
- Communication
- Lighting
- Sanitation
- Shelter

Ranking Method:

Cosine Similarity

---

# AI Reliability Rules

AI recommendations are advisory only.

Never claim recommendations are guaranteed to be correct.

Display confidence information when available.

Show multiple recommendations.

Top 3 recommendations preferred.

---

# Failure Cases

Case 1:
Model unavailable.

Response:
Use TF-IDF fallback model.

Case 2:
Low confidence scores.

Response:
Display warning message.

Case 3:
No matching recommendations.

Response:
Display generic preparedness advice.

---

# Security Requirements

JWT authentication.

Roles:

USER
ADMIN

Protected endpoints require authentication.

Users can only access their own inventory.

Administrators can manage recommendation datasets.

---

# API Expectations

All endpoints return:

{
  success: boolean,
  data: {},
  message: string
}

Error format:

{
  success: false,
  message: "Explanation"
}

---

# Database Collections

User

InventoryItem

SimulationResult

Recommendation

ChecklistItem

---

# User Experience Requirements

Every async operation must include:

- Loading state
- Empty state
- Success state
- Error state

Mobile support required.

Desktop support required.

Accessible design recommended.

---

# Development Priorities

Priority 1

Authentication

Priority 2

Inventory CRUD

Priority 3

Simulation Calculations

Priority 4

Preparedness Scoring

Priority 5

AI Recommendations

Priority 6

Checklist Management

Priority 7

Administrative Features

---

# AI Assistant Instructions

When generating code:

1. Follow existing architecture.
2. Keep business logic in backend services.
3. Keep React components focused.
4. Validate inputs on both frontend and backend.
5. Do not bypass authentication.
6. Prefer reusable modules.
7. Include unit tests when generating major functionality.
8. Do not introduce paid services or proprietary APIs.
9. Preserve Docker compatibility.
10. Maintain end-to-end integration between React, Express, MongoDB, and FastAPI.

Success is measured by whether a user can:

1. Manage inventory.
2. Simulate disaster readiness.
3. Receive preparedness recommendations.
4. Persist data between sessions.
5. Complete workflows without AI failures breaking the application.
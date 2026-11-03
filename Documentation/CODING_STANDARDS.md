# Doomsday Dashboard Coding Standards

## Purpose

This document defines the development standards used throughout the project.

---

# General Standards

## Source Control

- Every feature must be developed in a separate branch.
- No direct commits to main.
- Pull requests are required.
- At least one team member review is required before merging.

### Branch Naming Examples

feature/user-authentication

bugfix/inventory-delete

hotfix/login-validation

backend/Scaffolding

frontend/Schaffolding

---

# Naming Conventions

## Variables

Use camelCase.

Example:

```javascript
const inventoryItem = {};
```

## Functions

Use camelCase.

Example:

```javascript
function calculatePreparednessScore() {}
```

## React Components

Use PascalCase.

Examples:

```text
InventoryTable.jsx
RecommendationCard.jsx
```

## Files

### Page Components

```text
DashboardPage.jsx
InventoryPage.jsx
```

### Utility Files

```text
inventoryService.js
authService.js
```

### Backend Controllers

```text
inventoryController.js
userController.js
```

---

# Frontend Standards

## Component Structure

- One responsibility per component.
- Avoid components larger than 300 lines.
- Reusable UI should be extracted into shared components.

---

## React Rules

Use:

- Functional Components
- React Hooks
- React Router
- Context API when appropriate

Avoid:

- Class Components
- Duplicated state
- Excessive prop drilling

---

## Validation

All forms must validate:

- Required fields
- Number ranges
- Invalid input formats
- Data type correctness

Validation must occur:

1. Client side
2. Server side

---

## UI Requirements

Every API request must include:

- Loading state
- Success state
- Error state
- Empty state

Example:

- Loading Spinner
- Success Notification
- Error Alert
- No Data Message

---

# Backend Standards

## API Design

Follow REST conventions.

Examples:

```http
GET /api/inventory

GET /api/inventory/:id

POST /api/inventory

PUT /api/inventory/:id

DELETE /api/inventory/:id
```

---

## Controllers

Controllers should:

- Validate requests
- Call services
- Return responses

Controllers should NOT:

- Contain business logic
- Directly manipulate database models excessively

---

## Services

Services should:

- Handle business rules
- Process calculations
- Coordinate model operations
- Communicate with AI services

Example:

```text
inventoryService.js
simulationService.js
recommendationService.js
```

---

## Error Responses

Use consistent error responses.

Example:

```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

---

## Authorization

Protected routes must:

- Validate JWT token
- Verify user ownership
- Verify role permissions

Never rely solely on frontend authorization.

Server-side authorization is mandatory.

---

# Database Standards

## MongoDB Collections

Use singular model names.

Examples:

```text
User
InventoryItem
SimulationResult
Recommendation
ChecklistItem
```

---

## Schema Rules

Every schema must contain:

```javascript
createdAt

updatedAt
```

Use Mongoose timestamps whenever possible.

Example:

```javascript
{
    timestamps: true
}
```

---

# AI Service Standards

## Service Separation

AI logic must remain inside FastAPI.

The Express backend communicates with the AI service through HTTP requests.

Architecture:

React

↓

Express API

↓

MongoDB

and

Express API

↓

FastAPI AI Service

---

## Recommendation Responses

Every AI response should follow:

```json
{
  "recommendations": [],
  "confidenceScores": [],
  "fallbackUsed": false
}
```

---

## Failure Handling

If AI service is unavailable:

1. Return fallback recommendations
2. Log the failure
3. Notify the user gracefully
4. Prevent application crashes

---

# Security Standards

## Authentication

Use:

- JWT Access Tokens
- Password Hashing (bcrypt)

Never store:

- Plain text passwords
- API secrets in source code
- Database credentials in repositories

---

## Environment Variables

Sensitive values belong in:

```text
.env
```

Examples:

```text
PORT=5000

MONGO_URI=xxxxx

JWT_SECRET=xxxxx

AI_SERVICE_URL=http://localhost:8000
```

The `.env` file must never be committed to Git.

---

# Testing Standards

## Minimum Coverage Targets

| Area | Coverage Goal |
|--------|--------|
| Business Logic | 80% |
| Utility Functions | 80% |
| Controllers | 70% |

---

## Required Tests

### Unit Tests

Must cover:

- Authentication
- Preparedness calculations
- Simulation calculations
- Recommendation rankings
- Validation functions

---

### Integration Tests

Must cover:

- API endpoints
- Database interactions
- Authentication flows
- AI service communication

---

### End-to-End Tests

At minimum:

1. Login Workflow
2. Inventory CRUD Workflow
3. Disaster Simulation Workflow
4. Recommendation Workflow

---

# Code Review Standards

Before approving a pull request:

- Code compiles successfully
- Tests pass
- Naming conventions followed
- Security concerns addressed
- Documentation updated
- No hardcoded secrets
- No dead code

---

# Definition of Done

A backlog item is considered DONE when:

- Acceptance criteria are satisfied
- Code is reviewed by another team member
- Automated tests pass
- Validation is implemented
- Authorization rules are enforced
- Error handling is implemented
- Documentation is updated
- Feature functions using documented setup instructions
- Feature is merged into the main branch

The application should remain deployable and functional after every completed story.
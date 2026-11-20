
# Doomsday Dashboard — Docker Setup

## Overview

Doomsday Dashboard runs using three Docker containers:

1. Frontend — React served by Nginx
2. Backend — Node.js and Express
3. AI Service — Python and FastAPI

MongoDB Atlas is hosted externally.

Docker Compose manages all three services.

## Requirements

- Docker Engine with Docker Compose
- A MongoDB Atlas connection
- A valid JWT secret

## First-Time Setup

1. Clone the repository.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `MONGO_URI` to your MongoDB connection string.
4. Set `JWT_SECRET` to a random secret of at least 32 characters.
5. Run the application:

    docker compose up -d --build

6. Visit http://localhost:8080

The AI model may download files during its first startup.

## Useful Docker Commands

Start or update containers:

    docker compose up -d --build

Stop and remove containers:

    docker compose down

View running containers:

    docker compose ps

View logs:

    docker compose logs --tail=50

Follow live logs:

    docker compose logs -f

## Updating the Application

After changes have been merged into main:

    git switch main
    git pull --ff-only origin main
    docker compose up -d --build

Docker Compose rebuilds the images and recreates
containers when needed.

MongoDB data remains stored in MongoDB Atlas.

The AI model cache is stored in a Docker volume.

## Production Deployment

The current configuration is intended for local
HTTP testing.

Before public deployment:

- Configure a domain and HTTPS.
- Create a `.env` file beside `compose.yaml` containing
  `NODE_ENV=production` before deploying publicly.
  Docker Compose reads this value from the root `.env`
  file or the server environment.

  The `backend/.env` file supplies MongoDB and JWT
  credentials, but does not control this Compose override.
- Configure trusted HTTPS routing.
- Restrict public access to internal services.
- Provide production environment credentials.
- Ensure MongoDB Atlas permits the server connection.

The deployment host must support Docker Compose.

Do not commit .env files containing real credentials.

# Doomsday Dashboard — Frontend Foundation

This patch changes **only the `client/` directory**. It is designed for Team 5's React + Vite + Tailwind v4 + Axios scaffold.

## Branch first

From the repository root (`Doomsday-Dashboard`):

```powershell
git status
git switch -c feature/frontend-foundation
```

If this branch already exists, use `git switch feature/frontend-foundation` instead. Work on your own branch and open a pull request; do not push directly to `main`.

## Install the only additional dependency

From the `client` folder:

```powershell
cd client
npm install react-router-dom
npm run dev
```

Vite should serve the app at `http://localhost:5173/`. `npm install react-router-dom` will update `client/package.json` and `client/package-lock.json`; **commit both updated files**. Do not delete other team files.

## Pages

- `/` — public landing page, feature overview, illustrative UI preview
- `/login` — validated login form
- `/register` — validated registration form
- `*` — not-found page

Navigation and forms are responsive. The homepage dashboard preview uses clearly labeled **sample values**, not real API data.

## Backend integration — agreed contract still needed

The existing backend only has `GET /api/health` at this stage. Forms propose these endpoints, but **the backend developer must confirm them**:

- `POST /api/auth/login` with `{ email, password }`
- `POST /api/auth/register` with `{ name, email, password }`

The frontend's Axios client is in `src/services/api.js`. Vite proxies `/api` to `http://localhost:5000` in development. If those endpoints aren't implemented yet, forms show an honest error; they **do not simulate a successful login or store fake accounts**.

Session persistence, protected dashboard, profile, inventory, and API auth response handling remain future work after the team agrees on backend endpoints and JWT handling.

For deployment, configure the actual web server to proxy `/api` to Express and provide a SPA fallback for non-root URLs; Vite's proxy is development-only.

## What has not been touched

- `backend/`
- Existing documentation
- Existing unused template assets and package lock (until you run the npm command above)

## Quick check before PR

```powershell
npm run lint
npm run build
```

Review the six moderate `npm audit` reports separately; avoid `npm audit fix --force` without understanding changes. All copied source files should be reviewed and understood by the team before merging.

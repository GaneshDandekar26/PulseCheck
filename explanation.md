# PulseCheck — Project Explanation

## 1. What Is PulseCheck?

**PulseCheck** is a full-stack **API Health Monitoring Dashboard** built using the **MERN Stack** (MongoDB, Express.js, React, Node.js).

It lets developers register their API endpoints and automatically monitors them at regular intervals — checking if they're **up or down**, how **fast** they respond, and what **HTTP status code** they return. If something goes wrong (e.g., an API goes down or response time spikes), PulseCheck sends **email alerts** to the user.

Think of it like a simplified, self-hosted version of tools like UptimeRobot or Pingdom.

---

## 2. What Problem Does It Solve?

When you deploy APIs in production, you need to know:

- **Is my API still running?** (Uptime monitoring)
- **Is it getting slower?** (Latency tracking)
- **When did it go down and come back up?** (Historical logs)
- **Can I get notified when something breaks?** (Alerting)

PulseCheck solves all of this from a single dashboard — users register, add their API URLs, and the system handles the rest automatically.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Single-page application (SPA) |
| **UI Routing** | React Router v6 | Client-side navigation |
| **Charts** | Recharts | Latency/uptime visualizations |
| **HTTP Client** | Axios | API calls from frontend → backend |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | MongoDB (Mongoose ODM) | Stores users, endpoints, ping logs, alerts |
| **Auth** | JWT (JSON Web Tokens) + bcrypt | Secure authentication & password hashing |
| **Scheduler** | node-cron | Background job to ping endpoints periodically |
| **Email Alerts** | Nodemailer (SMTP) | Sends alert emails when endpoints go down |
| **Security** | Helmet + CORS | HTTP header hardening |
| **Containerization** | Docker + Docker Compose | Packaging the full stack into containers |
| **CI/CD** | Jenkins | Automated build, test, scan & deploy pipeline |
| **Code Quality** | SonarQube | Static code analysis + test coverage tracking |

---

## 4. Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                              │
│                              │                                      │
│                              ▼                                      │
│                   ┌──────────────────┐                               │
│                   │  React Frontend  │   (Vite dev / Nginx prod)    │
│                   │  - Login/Register│                               │
│                   │  - Dashboard     │                               │
│                   │  - Endpoints CRUD│                               │
│                   │  - Latency Charts│                               │
│                   └────────┬─────────┘                               │
│                            │  /api/*                                 │
│                            ▼                                         │
│                   ┌──────────────────┐                               │
│                   │  Express Backend │   (Node.js)                   │
│                   │  - Auth routes   │                               │
│                   │  - Endpoints API │                               │
│                   │  - Dashboard API │                               │
│                   │  - Alerts API    │                               │
│                   │  - Ping Scheduler│  ← runs every minute          │
│                   │  - Alert Service │  ← sends emails               │
│                   └────────┬─────────┘                               │
│                            │                                         │
│                            ▼                                         │
│                   ┌──────────────────┐                               │
│                   │    MongoDB       │                               │
│                   │  - Users         │                               │
│                   │  - Endpoints     │                               │
│                   │  - PingLogs      │                               │
│                   │  - AlertRules    │                               │
│                   │  - AlertEvents   │                               │
│                   └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Key Features

### 5.1 Authentication System
- User **registration** and **login** with email/password
- Passwords hashed using **bcrypt** (never stored in plain text)
- **JWT tokens** issued on login, sent with every API request via `Authorization` header
- Protected routes — only logged-in users can access dashboard/endpoints

### 5.2 Endpoint Management (CRUD)
- Users can **Add** a new endpoint (URL, method, check interval)
- **View** all their registered endpoints with current status
- **Edit** endpoint configuration
- **Delete** endpoints they no longer want to monitor
- **Pause/Resume** monitoring on individual endpoints

### 5.3 Automated Health Checks
- A **cron-based scheduler** (`node-cron`) runs in the background
- Every interval (configurable per endpoint), it sends an HTTP request to the registered URL
- Records the **response status code**, **response time (ms)**, and **timestamp** in the `PingLog` collection
- Detects if the endpoint is **up** (2xx/3xx) or **down** (4xx/5xx/timeout)

### 5.4 Dashboard & Analytics
- Aggregated view showing **total endpoints**, **uptime percentage**, **average latency**
- Per-endpoint detail page with **latency charts** (Recharts line graphs)
- Historical **ping logs** in a table

### 5.5 Alerting System
- Users create **alert rules** (e.g., "notify me if endpoint is down for > 2 minutes")
- When triggered, the system sends an **email notification** via Nodemailer/SMTP
- Alert events logged in the database for audit trail

---

## 6. Backend API Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/register` | ✗ | Create a new user account |
| POST | `/api/auth/login` | ✗ | Login and receive a JWT token |
| GET | `/api/endpoints` | ✓ | List all endpoints for the logged-in user |
| POST | `/api/endpoints` | ✓ | Add a new endpoint to monitor |
| PUT | `/api/endpoints/:id` | ✓ | Update an endpoint's configuration |
| DELETE | `/api/endpoints/:id` | ✓ | Remove an endpoint |
| PATCH | `/api/endpoints/:id/pause` | ✓ | Pause/resume monitoring |
| GET | `/api/endpoints/:id/logs` | ✓ | Fetch ping history for an endpoint |
| GET | `/api/dashboard` | ✓ | Get aggregated stats (uptime, latency) |
| GET | `/api/alerts` | ✓ | List alert rules & events |
| POST | `/api/alerts` | ✓ | Create a new alert rule |
| GET | `/health` | ✗ | Health check (used by Docker/load balancers) |

---

## 7. Database Models

```
Users                Endpoints              PingLogs
┌──────────┐        ┌──────────────┐        ┌──────────────┐
│ _id      │        │ _id          │        │ _id          │
│ email    │───┐    │ userId    ───│───┐    │ endpointId──│──┐
│ password │   │    │ url          │   │    │ statusCode   │  │
│ createdAt│   └───▶│ method       │   │    │ responseTime │  │
└──────────┘        │ interval     │   └───▶│ status (up/  │  │
                    │ status       │        │   down)      │  │
                    │ isPaused     │        │ checkedAt    │  │
                    │ lastCheckedAt│        └──────────────┘  │
                    └──────────────┘                          │
                                                              │
AlertRules                    AlertEvents                     │
┌──────────────┐              ┌──────────────┐                │
│ _id          │              │ _id          │                │
│ endpointId──│──────────────│ ruleId       │                │
│ type         │              │ endpointId──│────────────────┘
│ threshold    │              │ message      │
│ email        │              │ triggeredAt  │
└──────────────┘              └──────────────┘
```

---

## 8. Frontend Pages

| Page | Route | What It Shows |
|------|-------|--------------|
| **Login** | `/login` | Email + password form, redirects to dashboard on success |
| **Register** | `/register` | Sign-up form, redirects to login after registration |
| **Dashboard** | `/` | Overview cards (total endpoints, uptime %, avg latency) |
| **Endpoints** | `/endpoints` | Table of all endpoints with status badges, add/edit/delete actions |
| **Endpoint Detail** | `/endpoints/:id` | Latency chart, ping log history, alert configuration |

---

## 9. DevOps — Containerization (Docker)

### What We Did

We containerized the entire application so that **anyone can run the full stack with a single command** — no need to manually install Node.js, MongoDB, or configure anything.

### Files Created

| File | What It Does |
|------|-------------|
| `backend/Dockerfile` | **Multi-stage build** for the Node.js backend. Stage 1 installs only production dependencies (`npm ci --omit=dev`). Stage 2 copies them into a slim `node:20-alpine` image and runs as the built-in `node` user (not root) for security. |
| `frontend/Dockerfile` | **Multi-stage build** for the React frontend. Stage 1 builds the production bundle using `npm run build` (Vite). Stage 2 copies the built static files into an `nginx:alpine` image — nginx is a high-performance web server that serves the files. |
| `frontend/nginx.conf` | Custom nginx configuration that does two things: **(a)** reverse-proxies any `/api/*` request to the backend container (so the frontend and backend communicate inside Docker's network), and **(b)** implements SPA fallback — any unknown route serves `index.html` so React Router handles it client-side. |
| `docker-compose.yml` | Wires up **3 services** as a single stack: MongoDB (with a persistent named volume so data survives container restarts), the backend (waits for MongoDB to be healthy before starting), and the frontend (waits for the backend). |
| `.dockerignore` files | Prevents `node_modules`, `.env`, `.git`, and other local files from being copied into Docker images — keeps images small and secure. |

### How It Works

```
docker compose up --build
         │
         ├── Starts MongoDB (port 27017, data in named volume)
         │      │
         │      ├── Healthcheck: waits until MongoDB is ready
         │      │
         ├── Starts Backend (port 4000, connects to MongoDB)
         │      │
         ├── Starts Frontend (port 3000 → nginx)
         │      │
         │      ├── Serves React app on http://localhost:3000
         │      └── Proxies /api/* → http://backend:4000
         │
         └── All 3 containers on the same Docker network
```

### Why Multi-Stage Builds?

- **Smaller images** — the final image only contains what's needed to run, not build tools
- **Security** — no source code or dev dependencies in the production image
- **Speed** — Docker layer caching means rebuilds are fast (only changed layers rebuild)

### Why Non-Root User?

If the container is somehow compromised, the attacker has limited permissions — they can't install software or modify system files.

---

## 10. DevOps — CI/CD Pipeline (Jenkins + SonarQube)

### What Is CI/CD?

- **CI (Continuous Integration)** — Every time code is pushed to GitHub, it's automatically built, tested, and scanned for bugs
- **CD (Continuous Delivery)** — After passing all checks, Docker images are automatically built and pushed to DockerHub, ready for deployment

### What We Built

A fully automated **7-stage Jenkins pipeline** that runs on every push to `main`:

```
 Push to GitHub
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    JENKINS PIPELINE                          │
│                                                             │
│  Stage 1: CHECKOUT                                          │
│  └── Pulls the latest code from GitHub                      │
│                                                             │
│  Stage 2: INSTALL DEPENDENCIES                              │
│  └── Runs 'npm ci' to install exact versions from lockfile  │
│                                                             │
│  Stage 3: TEST                                              │
│  └── Runs Jest unit tests with --coverage flag              │
│  └── Generates lcov coverage report                         │
│  └── Publishes HTML coverage report in Jenkins              │
│                                                             │
│  Stage 4: SONARQUBE SCAN                                    │
│  └── Sends source code + coverage data to SonarQube         │
│  └── SonarQube checks for:                                  │
│       • Code smells (bad practices)                         │
│       • Bugs (potential runtime errors)                     │
│       • Security vulnerabilities                            │
│       • Duplicate code                                      │
│       • Test coverage percentage                            │
│                                                             │
│  Stage 5: QUALITY GATE                                      │
│  └── Waits for SonarQube to return its verdict              │
│  └── FAILS the build if:                                    │
│       • Test coverage < 60%                                 │
│       • Critical security issues found                     │
│                                                             │
│  Stage 6: BUILD DOCKER IMAGE                                │
│  └── Builds backend + frontend Docker images                │
│  └── Tags them with the git commit SHA (e.g., a3f7b2c)     │
│      so every build is uniquely traceable                   │
│                                                             │
│  Stage 7: PUSH TO DOCKERHUB                                 │
│  └── Pushes images to DockerHub registry                    │
│  └── Available for deployment anywhere                      │
│                                                             │
│  ✅ SUCCESS — or ❌ FAIL (team gets notified)                │
└─────────────────────────────────────────────────────────────┘
```

### What Is SonarQube?

SonarQube is a **static code analysis tool**. It reads through the source code (without running it) and identifies:

| Category | Example |
|----------|---------|
| **Bugs** | Using a variable before it's initialized |
| **Code Smells** | Functions that are too long or complex |
| **Vulnerabilities** | SQL injection risks, hardcoded passwords |
| **Duplications** | Copy-pasted code blocks |
| **Coverage** | % of code covered by unit tests |

We configured SonarQube to scan only `src/` and exclude `node_modules/`. The coverage data comes from Jest's lcov report.

### Why Tag Docker Images with Git SHA?

```
ganeshdandekar26/pulsecheck-backend:a3f7b2c   ← this specific commit
ganeshdandekar26/pulsecheck-backend:latest     ← always the newest
```

If something breaks in production, we can look at the image tag, find the exact commit in GitHub, and know exactly which code change caused the issue. This is called **traceability**.

### Files Created for CI/CD

| File | Purpose |
|------|---------|
| `Jenkinsfile` | Declarative pipeline definition — Jenkins reads this to know what stages to run |
| `backend/sonar-project.properties` | SonarQube scanner config — project key, source paths, exclusions, coverage report location |
| `backend/tests/app.test.js` | Smoke test (Jest) — baseline test for the CI pipeline |
| `backend/package.json` *(updated)* | Added `jest`, `supertest` as dev dependencies and `npm test` script with 60% coverage threshold |

---

## 11. Project Structure (Final)

```
PulseCheck/
├── docker-compose.yml              ← Orchestrates all 3 containers
├── Jenkinsfile                      ← CI/CD pipeline definition
├── .env.docker                      ← Docker env template
│
├── backend/
│   ├── Dockerfile                   ← Multi-stage Node.js image
│   ├── .dockerignore
│   ├── sonar-project.properties     ← SonarQube config
│   ├── package.json
│   ├── tests/
│   │   └── app.test.js              ← Jest smoke test
│   └── src/
│       ├── server.js                ← Entry point (starts Express + scheduler)
│       ├── app.js                   ← Express app (routes, middleware)
│       ├── config/
│       │   └── db.js                ← MongoDB connection
│       ├── middleware/
│       │   └── authenticateToken.js ← JWT auth middleware
│       ├── models/
│       │   ├── User.js
│       │   ├── Endpoint.js
│       │   ├── PingLog.js
│       │   ├── AlertRule.js
│       │   └── AlertEvent.js
│       ├── routes/
│       │   ├── auth.js              ← Register/Login
│       │   ├── endpoints.js         ← CRUD + pause + logs
│       │   ├── dashboard.js         ← Aggregated stats
│       │   └── alerts.js            ← Alert rules & events
│       ├── scheduler/
│       │   └── pingScheduler.js     ← Cron job: pings all endpoints
│       └── alerts/
│           └── alertService.js      ← Evaluates rules, sends emails
│
└── frontend/
    ├── Dockerfile                   ← Multi-stage: Vite build → nginx
    ├── .dockerignore
    ├── nginx.conf                   ← Reverse proxy + SPA fallback
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx                 ← React entry point
        ├── App.jsx                  ← Router setup
        ├── api/
        │   └── http.js              ← Axios instance with JWT interceptor
        ├── context/
        │   └── AuthContext.jsx       ← Global auth state
        ├── components/
        │   ├── Navbar.jsx
        │   ├── PrivateRoute.jsx
        │   ├── EndpointModal.jsx
        │   └── ConfirmModal.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── Endpoints.jsx
            └── EndpointDetail.jsx
```

---

## 12. How to Run Everything

### Development Mode (Without Docker)

```bash
# Terminal 1: Start MongoDB (must be installed/running)
# Terminal 2: Backend
cd backend && npm install && npm run dev

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

### Production Mode (With Docker — Single Command)

```bash
cp .env.docker backend/.env
docker compose up --build -d

# App runs at http://localhost:3000
```

---

## 13. Summary

| What | How |
|------|-----|
| **Application** | MERN stack API health monitoring dashboard |
| **Core Feature** | Automated endpoint pinging + latency tracking + alerts |
| **Containerization** | Multi-stage Dockerfiles (backend + frontend) + Docker Compose with MongoDB |
| **CI/CD** | Jenkins pipeline: checkout → test → SonarQube scan → quality gate → Docker build → DockerHub push |
| **Code Quality** | SonarQube static analysis + Jest coverage (60% threshold) |
| **Security** | Non-root containers, bcrypt password hashing, JWT auth, Helmet headers |
| **Traceability** | Docker images tagged with git commit SHA |

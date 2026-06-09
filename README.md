# AI Travel Hub

Planning a group trip is complex: coordinating destinations, budgets, itineraries, and expenses across multiple people typically requires juggling spreadsheets, messaging apps, and booking sites. We solved this by centralizing the entire workflow into one platform enhanced with artificial intelligence.

AI Travel Hub is a collaborative trip-planning platform powered by AI agents. It enables groups of travelers to organize trips together, generate smart itineraries, manage shared expenses, and communicate in real time, all through a single web application.

---

## Table of Contents

- [Project Description](#project-description)
- [Main Functionalities](#main-functionalities)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Automated Tests](#automated-tests)
- [CI/CD](#cicd)

---

## Main Functionalities

### User Authentication
- Email/password registration and login with JWT-based authentication.
- Automatic user profile creation on signup with preferred currency, avatar, and push notification token storage.
- Google OAuth integration.

### Group Management
- Create travel groups with auto-generated 8-character alphanumeric invite codes.
- Join existing groups by entering an invite code.
- Role-based access: admin and member roles per group.
- Copy invite codes to clipboard for easy sharing.

### Trip Planning
- Create trips within groups with destination, date range, budget, currency, and description.
- View all trips in a group with duration badges and budget summaries.
- Detailed trip page with tabbed navigation (Itinerary, Expenses, Checklist, Concierge).

### AI Itinerary Generation (Pathfinder)
- Generate complete day-by-day itineraries from a text prompt.
- Activities include title, description, location, start time, and duration.
- Generated itineraries are automatically saved to the trip database.
- Robust JSON parsing with multiple fallback strategies for malformed LLM output.
- Rate-limited: 3 requests/minute and 10 requests/hour per user.

### AI Travel Concierge
- In-trip chatbot for real-time travel assistance via SSE streaming.
- Context-aware responses based on trip destination, dates, and budget.
- Can suggest itinerary additions in a structured format for direct import.
- Available both as a trip tab and as a floating widget on the landing page.

### AI Chat Moderation
- Automatic content moderation for group chat messages.
- Blocks hate speech, harassment, explicit content, spam, and doxxing.
- Allows normal travel discussion, friendly conversation, and banter.

### Expense Management
- Log expenses with amount, currency, description, and category.
- Equal or custom split among group members.
- Per-member debt tracking with pending/paid status.
- Debt simplification algorithm that minimizes the number of transfers needed (e.g., if A owes B 20 and B owes C 20, it resolves to A owes C 20 directly).
- Multi-currency support with real-time conversion via the Frankfurter API (cached for 6 hours).

### Shared Checklists
- Create, complete, and delete pre-trip task items.
- Track who completed each item and when.
- Real-time sidebar preview of pending tasks.

### Group Chat
- Persistent message history stored in the database.
- Message types: text, system, and AI-generated messages.
- AI moderation applied before message persistence.

### Push Notifications
- Web Push notifications via VAPID (pywebpush).
- Per-user notification preferences for each event type (itinerary ready, new expense, member joined, chat message, checklist update).
- Automatic cleanup of stale push tokens.

---

## Live Demo

[![Watch the Demo](https://img.shields.io/badge/YouTube-Watch%20Demo-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=E3LgWTgIFA4)


---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Django 5.1, Python 3.11 |
| **Frontend** | Django Templates, HTML, CSS, Vanilla JavaScript |
| **Database** | PostgreSQL 15 (production), SQLite (development) |
| **AI / LLM** | OpenAI-compatible API (Groq Llama 3 / Gemini), async streaming |
| **Authentication** | JWT (PyJWT), Google OAuth |
| **Task Queue** | Celery 5.4 + Redis 7 |
| **Push Notifications** | Web Push (pywebpush + VAPID) |
| **Currency API** | Frankfurter API (free, no key required) |
| **Containerization** | Docker, Docker Compose |
| **Reverse Proxy** | Nginx (Alpine) |
| **WSGI Server** | Gunicorn |
| **E2E Testing** | Playwright (Chromium + Firefox) |
| **CI/CD** | GitHub Actions |
| **Deployment** | VPS via SSH (Docker Compose) |

---

## Automated Tests

The project includes a comprehensive end-to-end (E2E) test suite built with **Playwright**, covering all major user flows across **Chromium** and **Firefox** browsers.

### Test Structure

All test files are located in the `e2e/` directory:

```
e2e/
  helpers.js              # Shared utilities (signUpUser, createGroup, createTrip)
  landing.spec.js         # Landing page rendering and floating AI chat widget
  login.spec.js           # Sign in/sign up forms, registration, logout
  dashboard.spec.js       # Dashboard layout, group cards, clipboard copy
  group_actions.spec.js   # Create Group and Join Group modals
  trip_actions.spec.js    # Trip creation, validation, and navigation
  itinerary.spec.js       # Itinerary tab, AI generator toggle, mocked AI generation
  expenses.spec.js        # Expense logging, total calculations, sidebar updates
  checklist.spec.js       # Checklist CRUD lifecycle (add, complete, delete)
  ai_concierge.spec.js    # AI Concierge chat with mocked SSE streaming
```

### Test Coverage

| Test Suite | Scenarios Covered |
|---|---|
| **Landing Page** | Hero rendering, feature/destination cards, navigation to login, floating AI chat widget open/close/send |
| **Login & Sign Up** | Form rendering, tab switching, successful registration with redirect, invalid login error, logout flow |
| **Dashboard** | Layout validation, group/trip section toggling, invite code clipboard copy |
| **Group Actions** | Create Group modal open/close/submit, Join Group modal with invalid code error |
| **Trip Actions** | Trip modal validation, trip creation with dates/budget/currency, trip card badges, navigation to trip detail |
| **Itinerary** | Empty state rendering, AI generator toggle, mocked AI itinerary generation with activity card verification |
| **Expenses** | Expense tab rendering, initial zero totals, expense form submission, total and sidebar updates |
| **Checklist** | Empty state, item creation via Enter key, checkbox completion with strikethrough, sidebar sync, item deletion |
| **AI Concierge** | Concierge tab greeting, mocked SSE streaming response, user/assistant message display, cursor cleanup |

### Running Tests Locally

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Run all tests (requires Django server)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

### Playwright Configuration Highlights

- **Base URL:** `http://127.0.0.1:8000`
- **Auto-start:** Django dev server is launched automatically via `webServer` config
- **Retries:** 2 retries in CI, 0 locally
- **Artifacts on failure:** Screenshots, video recordings, and traces are captured automatically
- **Parallel execution:** Fully parallel locally, single worker in CI for stability

---

## CI/CD

The project uses **GitHub Actions** with two automated workflows.

### 1. Playwright E2E Tests (`playwright.yml`)

**Triggers:** On every `push` and `pull_request` to `main` and `rebase` branches.

**Pipeline steps:**

1. **Checkout** the repository.
2. **Provision PostgreSQL 15** as a service container with health checks.
3. **Set up Python 3.11** with pip caching.
4. **Install backend dependencies** from `requirements.txt`.
5. **Run Django migrations** against the ephemeral PostgreSQL database.
6. **Set up Node.js** (LTS) with npm caching.
7. **Install frontend dependencies** and Playwright browsers.
8. **Execute the full Playwright test suite.**
9. **Upload the HTML test report** as a build artifact (retained for 30 days).

```yaml
# Environment variables injected for the CI database
env:
  DB_NAME: travel_db
  DB_USER: test_user
  DB_PASSWORD: test_pass
  DB_HOST: localhost
  DB_PORT: 5432
```

### 2. Deploy to VPS (`deploy.yml`)

**Triggers:** On every `push` to the `rebase` branch.

**Pipeline steps:**

1. **Install SSH tools** (openssh-client, sshpass).
2. **Add VPS to known_hosts** via ssh-keyscan.
3. **SSH into the VPS** and execute the deployment script:
   - `git fetch origin` and `git reset --hard origin/rebase` to force-sync the repository.
   - `docker compose down` to stop running containers.
   - `docker compose up -d --build --force-recreate` to rebuild and restart all services.
   - `docker image prune -af` to clean up unused images.

**Secrets used:** `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD` (stored in GitHub repository secrets).

### Deployment Architecture

```
GitHub (push to rebase)
        |
        v
  GitHub Actions Runner
        |
        v (SSH)
  VPS Server
        |
        v
  Docker Compose
    ├── backend    (Django + Gunicorn)
    ├── redis      (Redis 7 Alpine)
    └── nginx      (Nginx Alpine, port 80)
```
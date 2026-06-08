# AI Travel Agent

## Project Description

AI Travel Agent is a collaborative group travel planning platform which leverages artificial intelligence to streamline every aspect of organizing trips with friends, family, or colleagues. The application brings together itinerary generation, real-time group communication, shared expense management, and in-trip assistance — all powered by AI — into a single, cohesive web experience.

Built as a full-stack application with a **Django REST** backend and a **React (Vite)** frontend, AI Travel Agent enables users to create travel groups, invite members via shareable codes, and collaboratively plan trips from start to finish. The AI backbone, powered by **Groq's Llama 3.1** model, provides two specialized agents: **Pathfinder** for generating detailed day-by-day itineraries, and **Concierge** for real-time in-trip assistance with local recommendations, emergency contacts, and travel tips.

Real-time collaboration is at the core of the platform. Using **Django Channels** and WebSocket connections, group members can chat, update shared checklists, and receive AI-generated content simultaneously — all with live synchronization and presence tracking.

## Live Demo

[FUN LITTLE DEMO FOR YOU](https://youtu.be/E3LgWTgIFA4)

## Main Functionalities

### 1. Authentication & User Management
- **Google OAuth 2.0** sign-in for seamless, one-click authentication
- **Demo login** mode for quick testing without external providers
- **JWT-based session management** with automatic token refresh (15-minute access / 30-day refresh)
- **User profiles** with preferred currency and avatar support, auto-created on registration

### 2. Group Management
- Create travel groups with auto-generated **8-character alphanumeric invite codes**
- Join existing groups using shareable invite codes
- **Role-based access** (Admin / Member) with appropriate permissions
- Real-time **member join notifications** broadcast to the group

### 3. Trip Planning & Itinerary
- Create trips with destination, dates, budget, and currency
- **AI-powered itinerary generation (Pathfinder Agent):** generates a full day-by-day itinerary with timed activities, locations, and descriptions
- AI responses are **streamed in real-time** via WebSocket to all group members
- Generated itinerary items are **automatically saved** to the database for persistent access
- **Manual editing** of itinerary items (drag, reorder, add, and delete activities)

### 4. AI Concierge (In-Trip Assistant)
- Context-aware **real-time travel assistant** accessible during trips
- Provides local recommendations, emergency contacts, and travel tips
- Domain-restricted: only answers travel-related questions
- Can suggest itinerary additions in a structured, actionable format
- Streamed responses via WebSocket for a fluid conversational experience

### 5. Real-Time Group Chat
- **WebSocket-powered group messaging** with persistent message history
- Support for text, system, and AI message types
- **Typing indicators** showing when group members are composing messages
- **Online/offline presence tracking** for all group members
- AI system messages posted automatically when itineraries are generated

### 6. Collaborative Checklists
- Shared pre-trip task lists synced in **real-time via WebSocket**
- Add, toggle (complete/uncomplete), and delete checklist items
- Tracks who completed each task and when
- Optimistic UI updates with live synchronization across all connected members

### 7. Expense Management & Debt Splitting
- Log group expenses with payer, amount, currency, and description
- **Equal split** with remainder-cent precision (extra cent goes to the payer)
- **Custom split** for unequal expense distribution
- **Debt simplification algorithm** that minimizes the number of transfers needed (e.g., A→B→C becomes A→C)
- Mark individual debts as settled with timestamp tracking
- **Receipt image upload** support (JPEG, PNG, WebP — max 5 MB)

### 8. Multi-Currency Support
- Users set a **preferred display currency** in their profile
- Real-time currency conversion using the **Frankfurter API** (free, updated daily)
- Exchange rates cached for 6 hours to minimize API calls
- Amounts stored in original currency, converted **only for display**

### 9. Push Notifications
- **Web Push notifications** via VAPID protocol
- Configurable per-event preferences (itinerary ready, new expense, member joined, chat message, checklist update)
- Automatic **stale token cleanup** when push subscriptions expire or are revoked

### 10. Rate Limiting
- AI request throttling to prevent abuse: **3 requests/minute**, **10 requests/hour** per user
- Graceful error responses with `retry_after` countdown for the client

## Technical Architecture
- **Backend:** Django 5.1 + Django REST Framework + Django Channels (ASGI via Daphne)
- **Frontend:** React 19 + React Router 7 + Vite 8
- **AI:** Groq Llama 3.1 8B Instant (async streaming)
- **Real-time:** WebSockets via Django Channels with Redis (or in-memory) channel layer
- **Task Queue:** Celery with Redis broker (falls back to eager mode without Redis)
- **Database:** SQLite (development) — designed for easy migration to PostgreSQL
- **Auth:** Google OAuth via `django-allauth` + JWT via `djangorestframework-simplejwt`

## AI Agents

The application integrates two specialized AI agents, both powered by **Groq's Llama 3.1 8B Instant** model through the Groq API. Communication with both agents happens over **WebSockets** (via Django Channels), enabling real-time token-by-token streaming so that all group members see the AI output as it is being generated.

### Pathfinder -- Itinerary Generator

Pathfinder is the trip-planning agent. Given a destination, trip duration, budget, currency, and optional user preferences, it generates a complete day-by-day itinerary with morning, afternoon, and evening activities.

**How it works:**
1. The user triggers itinerary generation from the Trip page.
2. A WebSocket message (`generate_itinerary`) is sent to the `AIStreamConsumer`.
3. Pathfinder builds a structured prompt and streams the response from Groq.
4. Each token is broadcast in real-time to every connected group member.
5. Once the response is complete, the agent parses the AI output to extract a JSON array of activities (with fallback regex parsing for malformed responses).
6. The parsed activities are automatically persisted as `ItineraryItem` records in the database.
7. A system message is posted to the group chat notifying members that a new itinerary is ready.

**Output format per activity:**
| Field              | Type    | Description                          |
|--------------------|---------|--------------------------------------|
| `day`              | integer | Day number within the trip (1-indexed) |
| `order`            | integer | Position within the day (0-indexed)  |
| `title`            | string  | Activity name                        |
| `description`      | string  | Brief description                    |
| `location`         | string  | Specific location or address         |
| `start_time`       | string  | Suggested time (HH:MM, 24hr)        |
| `duration_minutes` | integer | Estimated duration in minutes        |

### Concierge -- In-Trip Assistant

Concierge is a context-aware travel assistant designed to help users **during** their trip. It answers questions about local recommendations, emergency contacts, travel tips, and practical information.

**How it works:**
1. The user opens the AI Concierge chat (floating panel or dedicated tab).
2. A WebSocket message (`concierge`) is sent with the user's question and the current trip ID.
3. The agent builds a dynamic context that includes:
   - Current trip destination and dates
   - Trip budget and currency
   - Current UTC date and time
   - The last 5 messages from the conversation for continuity
4. The response is streamed token-by-token directly to the requesting user.
5. If the response contains an itinerary suggestion (detected via the `[ITINERARY_SUGGESTION]` marker), the frontend can offer to add it to the trip plan.

**Domain restriction:** Concierge is prompt-engineered to only answer travel-related questions. Any off-topic query receives a polite redirect: *"I am specialized in travel assistance. How can I help with your trip?"*

### Shared Infrastructure

Both agents share the following infrastructure:

- **Model:** `llama-3.1-8b-instant` served via the Groq API (async client with `AsyncGroq`)
- **Streaming:** Responses are streamed using the Groq SDK's native streaming mode, with each chunk forwarded over WebSocket as an `ai.token` event
- **Rate limiting:** Both agents are governed by a unified rate limiter -- **3 requests per minute** and **10 requests per hour** per user. When a limit is exceeded, the client receives an error with a `retry_after` value in seconds
- **Error handling:** All AI calls are wrapped in try/except blocks. On failure, a user-friendly error message is sent over the WebSocket instead of exposing internal details
- **WebSocket consumer:** Both agents are handled by a single `AIStreamConsumer` class that routes requests based on the `action` field (`generate_itinerary` or `concierge`)

## AI Tools Used in Development

### About the Team

AI Travel Agent was built by a team of five Computer Science students during their 4th semester as part of the Software Development Methods (MDS) course. With varying levels of experience across frontend, backend, and DevOps, the team relied heavily on AI-powered development tools to accelerate the process, bridge individual knowledge gaps, and maintain a consistent code quality standard across all modules.

None of us had prior production experience combining Django Channels, WebSocket streaming, and AI API integration in a single project. AI tools were instrumental in helping the team navigate unfamiliar territory while keeping the codebase cohesive and well-structured.

### Tools and How They Were Used

**GitHub Copilot** was used by all team members as the primary code-completion assistant inside VS Code. It was especially useful for:
- Writing repetitive boilerplate code (Django models, serializers, REST views)
- Auto-completing WebSocket consumer handlers and channel layer message routing
- Generating consistent patterns across similar modules (e.g., each app follows the same model-serializer-view-url structure, and Copilot helped maintain that uniformity once the first module was written)
- Writing CSS rules and React component markup faster by predicting layout patterns from context

**ChatGPT (GPT-4)** served as the team's on-demand technical consultant. It was used for:
- Architectural decisions early in the project (choosing between Django REST Framework vs. FastAPI, deciding on JWT over session-based auth, structuring the WebSocket layer)
- Debugging complex issues such as ASGI/WSGI configuration conflicts when running Daphne alongside Django, and resolving CORS problems between the Vite dev server and the Django backend
- Understanding and implementing the debt simplification algorithm -- the greedy creditor-debtor matching approach was designed collaboratively with ChatGPT, starting from a description of the Splitwise-style problem
- Writing and refining the system prompts for both AI agents (Pathfinder and Concierge), iterating on prompt engineering to get structured JSON output from the LLM reliably
- Drafting documentation, including portions of this README

**Claude** was used selectively for:
- Reviewing larger code sections and getting architectural feedback on the Django project structure
- Generating and refining documentation content
- Analyzing the full codebase to produce accurate, detailed descriptions of project features

**Gemini** was occasionally used for:
- Quick research on library APIs and configuration options (e.g., `pywebpush` VAPID setup, `django-allauth` social login configuration)
- Comparing alternative approaches for specific implementation details

### Our Policy on AI Usage

The team treated AI tools as accelerators, not replacements for understanding. Every AI-generated code suggestion was reviewed, tested, and adapted before being merged. In several cases, AI output served as a starting point that was then significantly modified to fit the project's specific requirements.

Key principles we followed:
- **No blind copy-paste.** Every suggestion was reviewed for correctness and adapted to the project's conventions.
- **AI for learning, not bypassing.** When an AI tool introduced an unfamiliar concept (e.g., Django Channels consumer lifecycle, async generators for streaming), team members took the time to understand the underlying mechanism before using it.
- **Human-driven architecture.** All high-level design decisions (database schema, module boundaries, API contracts, WebSocket message protocols) were made by the team. AI tools helped implement those decisions, not make them.

## Automated Tests

The project uses **Playwright** for end-to-end (E2E) browser testing. All test files live in the `e2e/` directory and are executed against a running Django backend with an ephemeral PostgreSQL database.

### Test Configuration

The Playwright configuration (`playwright.config.js`) defines:
- **Test directory:** `./e2e`
- **Timeout:** 30 seconds per test, 5 seconds for assertions
- **Browsers:** Chromium and Firefox (parallel execution locally, sequential in CI)
- **Retries:** 2 retries in CI, none locally
- **Evidence capture:** HTML report, screenshots on failure, video retained on failure, trace on first retry
- **Web server:** Playwright auto-starts the Django dev server at `http://127.0.0.1:8000` before running tests

### Test Helper Utilities

The file `e2e/helpers.js` provides reusable functions shared across all test suites:
- `signUpUser(page, firstName)` -- registers a new user with a unique timestamped email, fills the signup form, and waits for redirect to the dashboard
- `createGroup(page, name)` -- opens the Create Group modal, fills in the name, submits, and verifies the group card appears
- `createTrip(page, groupName, destination)` -- creates a trip within a group, filling destination, dates, budget, currency, and description

### Test Suites

| Test File | Module Covered | What It Tests |
|---|---|---|
| `landing.spec.js` | Landing Page | Page rendering, hero section content, navigation links, CTA buttons |
| `login.spec.js` | Authentication | Signup form validation, successful registration with redirect, login/logout flow |
| `dashboard.spec.js` | Dashboard | Layout rendering (header, welcome, quick actions), group card toggling between groups/trips views, invite code copy-to-clipboard |
| `group_actions.spec.js` | Group Management | Create Group modal open/close/validation, Join Group modal with invalid code error handling |
| `trip_actions.spec.js` | Trip Creation | Trip modal validation, full trip creation with all fields, trip card rendering with duration badge and budget, navigation to trip detail page |
| `itinerary.spec.js` | AI Itinerary | Mocked WebSocket AI streaming, itinerary generation progress feedback, parsed activity cards rendered after completion |
| `expenses.spec.js` | Expense Tracking | Expense tab rendering, logging an expense with amount/description/category, summary and sidebar total updates |
| `checklist.spec.js` | Checklists | Empty state placeholder, adding items via Enter key, checkbox toggling with strikethrough style, sidebar preview sync, item deletion |
| `ai_concierge.spec.js` | AI Concierge | Concierge tab greeting, mocked SSE streaming response, user/assistant message display, cursor removal on stream completion |

### Running Tests Locally

```bash
npx playwright install --with-deps    # first time only
npx playwright test                   # run all suites
npx playwright test e2e/login.spec.js # run a single suite
npx playwright show-report            # open the HTML report
```

## CI/CD Workflows

The project uses **GitHub Actions** with two workflows defined in `.github/workflows/`.

### 1. Playwright E2E Tests (`playwright.yml`)

**Trigger:** Runs on every push and pull request to the `main` and `rebase` branches.

**What it does:**
1. Spins up an **ephemeral PostgreSQL 15** service container with a throwaway `travel_db` database (test credentials injected via environment variables)
2. Sets up **Python 3.11** and installs backend dependencies from `requirements.txt`
3. Runs `python backend/manage.py migrate` to create tables in the throwaway database
4. Sets up **Node.js** (LTS) and installs frontend dependencies
5. Installs **Playwright browsers** with system dependencies
6. Executes `npx playwright test` (single worker in CI, 2 retries on failure)
7. Uploads the **Playwright HTML report** as a build artifact (retained for 30 days)

The workflow ensures that no pull request can be merged without all E2E tests passing against a fresh database.

### 2. Deploy to VPS (`deploy.yml`)

**Trigger:** Runs on every push to the `rebase` branch.

**What it does:**
1. Installs SSH tools (`openssh-client`, `sshpass`)
2. Adds the VPS host to `known_hosts`
3. Connects to the VPS via SSH using credentials stored in **GitHub Secrets** (`VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`)
4. On the server:
   - Fetches the latest code and hard-resets to `origin/rebase`
   - Tears down existing Docker containers (`docker compose down`)
   - Rebuilds and starts all services (`docker compose up -d --build --force-recreate`)
   - Prunes unused Docker images to reclaim disk space

### Deployment Infrastructure

The production environment is containerized using **Docker Compose** with three services:

| Service | Image | Role |
|---|---|---|
| `redis` | `redis:7-alpine` | Channel layer backend and Celery broker |
| `backend` | Custom (Python 3.11 slim) | Django application served by Gunicorn (3 workers, 3 threads) |
| `nginx` | `nginx:alpine` | Reverse proxy, static/media file serving, request routing |

**Backend Dockerfile** (`backend/Dockerfile`):
- Base image: `python:3.11-slim`
- Installs system dependencies, Python packages from `requirements.txt`
- Runs via `entrypoint.sh` which handles migrations, static file collection, and starts Gunicorn

**Nginx** (`nginx/nginx.conf`):
- Serves the application on port 80 for `ilovemds.com`
- Routes `/api/` and `/admin/` to the Django backend with proxy buffering disabled (required for SSE streaming)
- Serves `/static/` and `/media/` directly from Docker volumes with aggressive caching (1-year expiry)
- All other routes are proxied to the backend (SPA fallback)

**Data persistence** is handled through four named Docker volumes: `redis_data`, `db_data`, `staticfiles_data`, and `media_data`.



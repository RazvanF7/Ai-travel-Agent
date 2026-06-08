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

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

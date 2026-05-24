# SQLite to MongoDB Online & Groq to Hostinger LLM Migration Guide

This guide details the exact steps and code modifications required to:
1. Migrate the Django database from **SQLite** to **MongoDB Atlas (Online)**.
2. Migrate the LLM integration from **Groq** to a self-hosted LLM running on **Hostinger Cloud**.

---

## Part 1: Migrating from SQLite to MongoDB Online (Atlas)

Django is traditionally built for SQL databases. To use MongoDB as the primary database backend, the officially supported [django-mongodb-backend](https://github.com/mongodb/django-mongodb-backend) package is recommended. It works with Django 5.x by translating Django ORM queries into MongoDB aggregation pipelines.

### 1. Set Up MongoDB Atlas
1. Sign up/log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Free/Shared Cluster.
3. In **Network Access**, whitelist your IP addresses (or `0.0.0.0/0` if deploying to a dynamic environment like Hostinger, though restrict this where possible).
4. In **Database Access**, create a database user and password.
5. Go to **Database** -> **Connect** -> **Drivers**, select **Python**, and copy the Connection URI. It will look like this:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Update Python Dependencies
Add `django-mongodb-backend` (matching your Django 5.1 version) and `dnspython` (required to parse `mongodb+srv://` URIs) to your `backend/requirements.txt`.

Modify [requirements.txt](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/backend/requirements.txt):
```diff
 django-cors-headers>=4.4,<5.0
 django-allauth[socialaccount]>=65.0,<66.0
 dj-rest-auth[with_social]>=7.0,<8.0
 djangorestframework-simplejwt>=5.3,<6.0
 channels>=4.1,<5.0
 channels-redis>=4.2,<5.0
 celery>=5.4,<6.0
 redis>=5.0,<6.0
-groq>=0.9,<1.0
+django-mongodb-backend>=5.1,<5.2
+dnspython>=2.0,<3.0
+openai>=1.0,<2.0
 pywebpush>=2.0,<3.0
```
> [!NOTE]
> We also added `openai` here for the self-hosted LLM setup in Part 2.

### 3. Configure Environment Variables
Update your environment files with the MongoDB credentials.

Add to [.env](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/.env) and [.env.example](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/.env.example):
```ini
# MongoDB Configuration
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority"
MONGODB_NAME="ai_travel_agent_db"
```

### 4. Update Django Settings
Modify the `DATABASES` configuration to use the MongoDB backend engine.

Modify [settings.py](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/backend/config/settings.py):
```diff
 # ──────────────────────────────────────────────
 # Database
 # ──────────────────────────────────────────────
-DATABASES = {
-    'default': {
-        'ENGINE': 'django.db.backends.sqlite3',
-        'NAME': BASE_DIR / 'db.sqlite3',
-    }
-}
+DATABASES = {
+    'default': {
+        'ENGINE': 'django_mongodb_backend',
+        'HOST': os.getenv('MONGODB_URI', 'mongodb://localhost:27017'),
+        'NAME': os.getenv('MONGODB_NAME', 'ai_travel_agent_db'),
+    }
+}
```

> [!IMPORTANT]
> If you want to use MongoDB's native 12-byte `ObjectId` instead of standard Django integer auto-increment keys for your models, update the default auto-field setting in [settings.py](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/backend/config/settings.py):
> ```python
> DEFAULT_AUTO_FIELD = 'django_mongodb_backend.fields.ObjectIdAutoField'
> ```

### 5. Apply Migrations
Because we are switching to a new database (MongoDB Atlas), you must run migrations to set up the collection structures:
```powershell
python backend/manage.py migrate
```

---

## Part 2: Migrating from Groq to a Cloud LLM on Hostinger

To host your own LLM on Hostinger Cloud (usually on a VPS), you will need a lightweight inference framework that provides an OpenAI-compatible API.

### 1. Setup options for Hostinger VPS
Hostinger VPS packages run Linux (usually Ubuntu). You have two main routes:
1. **Ollama (Recommended for ease & CPUs/GPUs)**: Extremely simple to set up and runs models like `Llama-3.1-8b` efficiently.
2. **vLLM (Recommended for high performance with GPU)**: Fast throughput but requires a VPS with dedicated GPU resources.

#### To run Ollama on your Hostinger VPS:
1. SSH into your Hostinger VPS.
2. Install Ollama:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
3. Pull your target model (e.g., Llama 3.1 8B):
   ```bash
   ollama pull llama3.1
   ```
4. By default, Ollama binds to `127.0.0.1:11434`. To allow connections from your Django backend, modify the Ollama systemd service environment to expose port `11434` (`OLLAMA_HOST=0.0.0.0`).
5. Ensure your Hostinger firewall allows traffic to port `11434` (only whitelist your Django backend's IP for security).

### 2. Configure Environment Variables
Add variables to manage connection credentials for your self-hosted LLM.

Add to [.env](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/.env) and [.env.example](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/.env.example):
```ini
# Self-Hosted Cloud LLM (Hostinger)
LLM_API_BASE_URL="http://<your-hostinger-vps-ip>:11434/v1"
LLM_API_KEY="your-optional-api-key-or-any-string"
LLM_MODEL_NAME="llama3.1"
```

### 3. Update Django Settings
Update [settings.py](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/backend/config/settings.py) to read the new self-hosted LLM configuration:
```diff
 # ──────────────────────────────────────────────
 # AI / Groq
 # ──────────────────────────────────────────────
-GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
-GROQ_MODEL = 'llama-3.1-8b-instant'
+LLM_API_BASE_URL = os.getenv('LLM_API_BASE_URL', 'http://localhost:11434/v1')
+LLM_API_KEY = os.getenv('LLM_API_KEY', 'not-needed')
+LLM_MODEL_NAME = os.getenv('LLM_MODEL_NAME', 'llama3.1')
```

### 4. Update the Agents Code
We will change `AsyncGroq` client to `AsyncOpenAI` client. Since both Groq and Ollama/vLLM use standard OpenAI-compatible JSON formats, the parameters remain exactly the same.

#### A. Pathfinder Agent
Modify [pathfinder.py](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/backend/ai_agents/pathfinder.py):
```diff
 async def stream_itinerary(destination, duration_days, budget=None, currency='EUR', preferences=''):
     """
     Stream itinerary generation from Gemini (US-005 AC-2).
     Yields token chunks as they arrive.
     """
     try:
-        from groq import AsyncGroq
-
-        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
-        model = settings.GROQ_MODEL
+        from openai import AsyncOpenAI
+
+        client = AsyncOpenAI(
+            api_key=settings.LLM_API_KEY,
+            base_url=settings.LLM_API_BASE_URL
+        )
+        model = settings.LLM_MODEL_NAME
 
         user_prompt = generate_itinerary_prompt(
             destination, duration_days, budget, currency, preferences
         )
 
         messages = [
             {"role": "system", "content": ITINERARY_SYSTEM_PROMPT},
             {"role": "user", "content": user_prompt}
         ]
 
         stream = await client.chat.completions.create(
             model=model,
             messages=messages,
             stream=True,
         )
```

#### B. Concierge Agent
Modify [concierge.py](file:///c:/Users/stefa/OneDrive/Desktop/travelagent/Ai-travel-Agent/backend/ai_agents/concierge.py):
```diff
 async def stream_concierge_response(question, trip=None, recent_messages=None):
     """
     Stream concierge response from Gemini (US-013 AC-1).
     Yields token chunks as they arrive.
     """
     try:
-        from groq import AsyncGroq
-
-        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
-        model = settings.GROQ_MODEL
+        from openai import AsyncOpenAI
+
+        client = AsyncOpenAI(
+            api_key=settings.LLM_API_KEY,
+            base_url=settings.LLM_API_BASE_URL
+        )
+        model = settings.LLM_MODEL_NAME
 
         context = build_concierge_context(trip, recent_messages)
         system_content = f"{CONCIERGE_SYSTEM_PROMPT}\n\nContext:\n{context}"
```

---

## Part 3: Verification & Next Steps

### Verification Plan
1. **Database Connections**:
   - Start the backend server: `python manage.py runserver`.
   - Verify that Django boots without database configuration errors.
   - Access the Django Admin panel or hit an authenticated endpoint to write user/session data to MongoDB Atlas. Check the MongoDB Atlas console to verify that collections are created and populated.
2. **AI Stream Responses**:
   - Ensure the Hostinger VPS is running and accessible over your whitelisted network/port.
   - Run a test prompt through the Pathfinder or Concierge agent endpoints and confirm that streaming tokens are returned from your cloud LLM.

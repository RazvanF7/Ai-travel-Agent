# Migration Guide: Groq AI → Self-Hosted Ollama on RunPod

This guide walks you through every step to replace the Groq cloud API in this project with a
self-hosted LLM running inside an **Ollama** container on **RunPod.com**.

The migration touches exactly **5 files** in the rebased codebase:

| File | Change |
|---|---|
| `backend/requirements.txt` | Swap `groq` → `openai` |
| `backend/config/settings.py` | Swap Groq settings → Ollama/OpenAI-compat settings |
| `backend/ai_agents/concierge.py` | Swap `AsyncGroq` → `AsyncOpenAI` |
| `backend/ai_agents/pathfinder.py` | Swap `AsyncGroq` → `AsyncOpenAI` |
| `.env` | Swap `GROQ_API_KEY` → `OLLAMA_*` variables |

> [!NOTE]
> Ollama exposes an **OpenAI-compatible REST API** at `/v1/`. That means the streaming
> interface (`chat.completions.create(stream=True)`) works exactly the same way — the only
> things that change are the `base_url`, `api_key`, and `model` name. No logic changes required.

---

## Part 1 — Deploy Ollama on RunPod

### 1.1 Choose a Pod Template

1. Go to [runpod.io](https://www.runpod.io) and log in.
2. Click **+ Deploy** → **GPU Pod**.
3. In the template search box type **`ollama`** — RunPod has an official Ollama template.
   If you don't find it, click **Custom Template** and use the Docker image:
   ```
   ollama/ollama:latest
   ```
4. Pick a GPU. For `llama3.1:8b` (the model this project was using on Groq) a good balance is:
   | GPU | VRAM | Fits model? | Cost |
   |---|---|---|---|
   | RTX 3090 | 24 GB | ✅ comfortably | ~$0.44/hr |
   | RTX 4090 | 24 GB | ✅ fast | ~$0.74/hr |
   | A40 | 48 GB | ✅ + room for larger | ~$0.79/hr |

   For **testing/development** you can even use a **Secure Cloud** Spot instance to cut costs.

### 1.2 Configure the Pod

Under **Container Configuration**:

| Setting | Value |
|---|---|
| Container Image | `ollama/ollama:latest` |
| Expose HTTP Port | `11434` |
| Container Disk | 20 GB (enough for an 8B model) |
| Volume Disk | 20 GB (mount at `/root/.ollama` to persist model weights) |

Under **Environment Variables** (optional but recommended):

```
OLLAMA_HOST=0.0.0.0
OLLAMA_ORIGINS=*
```

> [!IMPORTANT]
> Set `OLLAMA_HOST=0.0.0.0` so Ollama listens on all interfaces — otherwise it will only
> bind to `127.0.0.1` and the RunPod proxy won't be able to reach it.

Click **Deploy**.

### 1.3 Get Your RunPod Endpoint URL

Once the pod is **Running**:

1. Click the pod name → **Connect** tab.
2. You will see an **HTTP Service** entry for port `11434`. It looks like:
   ```
   https://<pod-id>-11434.proxy.runpod.net
   ```
   Copy this URL — it is your `OLLAMA_BASE_URL`.

### 1.4 Pull the Model

RunPod gives you a **Web Terminal**. Open it and run:

```bash
# Pull Llama 3.1 8B (same family as the Groq llama-3.1-8b-instant model)
ollama pull llama3.1:8b

# Verify it loaded correctly
ollama list
```

Wait for the download to complete (≈4.7 GB). The model is now cached in your volume.

> [!TIP]
> If you want a **smaller/faster** model for development, try `llama3.2:3b` (≈2 GB).
> For **higher quality**, try `llama3.1:70b` but you'll need an A100 (80 GB VRAM).

---

## Part 2 — Update the Codebase

### 2.1 `backend/requirements.txt`

Remove the `groq` SDK and replace it with the `openai` SDK (which Ollama is compatible with).

```diff
 Django>=5.1,<5.2
 PyJWT>=2.8,<3.0
 django-cors-headers>=4.4,<5.0
 celery>=5.4,<6.0
 redis>=5.0,<6.0
-groq>=0.9,<1.0
+openai>=1.0,<2.0
 pywebpush>=2.0,<3.0
 py-vapid>=1.9,<2.0
 python-dotenv>=1.0,<2.0
 Pillow>=10.0,<11.0
 requests>=2.32,<3.0
 gunicorn>=22.0,<23.0
```

### 2.2 `backend/config/settings.py`

Replace the Groq section (lines 119–122) with Ollama-compatible settings:

```diff
 # ──────────────────────────────────────────────
-# AI / Groq
+# AI / Ollama (self-hosted via RunPod)
 # ──────────────────────────────────────────────
-GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
-GROQ_MODEL = 'llama-3.1-8b-instant'
+LLM_BASE_URL  = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')
+LLM_API_KEY   = os.getenv('OLLAMA_API_KEY', 'ollama')   # Ollama ignores this; required by the openai SDK
+LLM_MODEL     = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
```

### 2.3 `backend/ai_agents/pathfinder.py`

The `stream_itinerary` function imports `AsyncGroq` — replace it with `AsyncOpenAI`.

```diff
 async def stream_itinerary(destination, duration_days, budget=None, currency='EUR', preferences=''):
     """
-    Stream itinerary generation from Gemini (US-005 AC-2).
+    Stream itinerary generation from self-hosted Ollama (US-005 AC-2).
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
+            base_url=settings.LLM_BASE_URL,
+            api_key=settings.LLM_API_KEY,
+        )
+        model = settings.LLM_MODEL
 
         user_prompt = generate_itinerary_prompt(
```

Also update the module docstring at the top of the file:

```diff
 """
-Pathfinder Agent — AI-Generated Itinerary (US-005).
-Uses Groq Llama 3 to generate a full day-by-day itinerary.
+Pathfinder Agent — AI-Generated Itinerary (US-005).
+Uses a self-hosted Ollama LLM (via RunPod) to generate a full day-by-day itinerary.
 """
```

### 2.4 `backend/ai_agents/concierge.py`

The `stream_concierge_response` function imports `AsyncGroq` — replace it with `AsyncOpenAI`.

```diff
 async def stream_concierge_response(question, trip=None, recent_messages=None):
     """
-    Stream concierge response from Gemini (US-013 AC-1).
+    Stream concierge response from self-hosted Ollama (US-013 AC-1).
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
+            base_url=settings.LLM_BASE_URL,
+            api_key=settings.LLM_API_KEY,
+        )
+        model = settings.LLM_MODEL
 
         context = build_concierge_context(trip, recent_messages)
```

Also update the module docstring:

```diff
 """
-Concierge Agent — In-Trip Assistance (US-013).
-Uses Groq Llama 3 for local recommendations, emergency contacts, and travel tips.
+Concierge Agent — In-Trip Assistance (US-013).
+Uses a self-hosted Ollama LLM (via RunPod) for local recommendations, emergency contacts, and travel tips.
 """
```

### 2.5 `.env`

Remove the old Groq key and add the three Ollama variables:

```diff
-# Groq AI (US-005, US-013)
-GROQ_API_KEY=your-groq-api-key-here
+# Ollama on RunPod (US-005, US-013)
+OLLAMA_BASE_URL=https://<your-pod-id>-11434.proxy.runpod.net/v1
+OLLAMA_API_KEY=ollama
+OLLAMA_MODEL=llama3.1:8b
```

> [!CAUTION]
> Never commit your `.env` file to git. Make sure `.env` is in `.gitignore` (it already is in
> this project). The `OLLAMA_API_KEY` value is a dummy placeholder; Ollama doesn't validate it,
> but the `openai` Python SDK requires a non-empty string.

---

## Part 3 — Rebuild & Restart

### Local development

```powershell
# Inside the backend virtualenv
pip install -r backend/requirements.txt

# Start Django dev server
python backend/manage.py runserver
```

### Docker / docker-compose

```powershell
# Rebuild the backend image to pick up the new dependency
docker compose build backend

# Restart everything
docker compose up -d
```

---

## Part 4 — Verify the Migration

### 4.1 Check Ollama is reachable

```powershell
# Replace with your actual RunPod URL
$base = "https://<your-pod-id>-11434.proxy.runpod.net"

# Should return {"status":"ok"}
Invoke-RestMethod "$base/api/tags"
```

Or via curl (WSL / Git Bash):

```bash
curl https://<your-pod-id>-11434.proxy.runpod.net/api/tags
```

### 4.2 Quick Python smoke test

Run this from inside your `backend/` venv before touching Django:

```python
# save as backend/test_ollama.py and run: python test_ollama.py
import asyncio
from openai import AsyncOpenAI

BASE_URL = "https://<your-pod-id>-11434.proxy.runpod.net/v1"
MODEL    = "llama3.1:8b"

async def main():
    client = AsyncOpenAI(base_url=BASE_URL, api_key="ollama")
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": "Say hello in one sentence."}],
        stream=True,
    )
    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)
    print()

asyncio.run(main())
```

Expected output: a short greeting sentence streamed token-by-token.

### 4.3 Test the Pathfinder endpoint

With the Django server running, send a POST request to the itinerary endpoint:

```powershell
$headers = @{ Authorization = "Bearer <your-jwt-token>"; "Content-Type" = "application/json" }
$body    = '{"destination":"Paris","duration_days":3,"currency":"EUR"}'

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8000/api/ai/generate-itinerary/" `
  -Headers $headers `
  -Body $body
```

You should see `event: token` SSE chunks flowing in, followed by an `event: complete` with the
parsed `activities` array.

---

## Part 5 — Cost & Lifecycle Tips for RunPod

| Scenario | Recommendation |
|---|---|
| **Active development** | Keep the pod running; stop it when not coding |
| **Production (low traffic)** | Use a **Serverless** RunPod endpoint — you only pay per inference second |
| **Production (high traffic)** | Keep a persistent pod and add a load balancer |
| **Saving model weights** | Always use a **Volume** mounted at `/root/.ollama` so you don't re-download on restart |
| **Reducing cost** | Spot/interruptible instances are up to 50% cheaper for dev use |

### Stopping vs Terminating

- **Stop pod** → GPU is released, disk is retained, billed at storage rate only.
- **Terminate pod** → Everything is deleted. Only do this if you have a Volume with weights.

---

## Quick Reference: What Changed Where

```
Ai-travel-Agent-rebased/
├── .env                                  ← GROQ_API_KEY removed; OLLAMA_* added
└── backend/
    ├── requirements.txt                  ← groq removed; openai added
    ├── config/
    │   └── settings.py  (L119-122)      ← GROQ_* → LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
    └── ai_agents/
        ├── pathfinder.py  (L75-78)      ← AsyncGroq → AsyncOpenAI
        └── concierge.py   (L59-62)      ← AsyncGroq → AsyncOpenAI
```

The rest of the codebase — views, rate limiter, SSE streaming bridge, Docker, Nginx — is
**completely unchanged**. The OpenAI-compatible streaming format Ollama uses is byte-for-byte
identical to Groq's, so the SSE consumer on the React frontend also needs no changes.

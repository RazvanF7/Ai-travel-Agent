"""
Concierge Agent — In-Trip Assistance (US-013).
Uses Groq Llama 3 for local recommendations, emergency contacts, and travel tips.
"""
from django.conf import settings
from django.utils import timezone


CONCIERGE_SYSTEM_PROMPT = """You are the AI Travel Concierge for AI Travel Hub.
You help travelers during their trip with local recommendations, emergency contacts, 
travel tips, and practical information.

RULES:
1. Only answer travel-related questions. If a question is outside the travel domain, 
   respond with: "I am specialized in travel assistance. How can I help with your trip?"
2. Consider the current location, timezone, and local time when giving recommendations.
3. Be concise but helpful. Prioritize actionable information.
4. If suggesting activities, format them clearly so the user can add them to their itinerary.
5. For emergency situations, always provide local emergency numbers first.

When suggesting an itinerary addition, format it as:
**[ITINERARY_SUGGESTION]**
Title: <activity name>
Location: <specific location>
Time: <suggested time HH:MM>
Duration: <minutes>
Description: <brief description>
"""


def build_concierge_context(trip=None, recent_messages=None):
    """Build context for the Concierge Agent (US-013)."""
    context_parts = []

    if trip:
        context_parts.append(f"Current trip: {trip.destination}")
        context_parts.append(f"Trip dates: {trip.start_date} to {trip.end_date}")
        if trip.budget:
            context_parts.append(f"Budget: {trip.budget} {trip.currency}")

    # Inject timezone and local date/time
    now = timezone.now()
    context_parts.append(f"Current UTC time: {now.strftime('%Y-%m-%d %H:%M')}")

    if recent_messages:
        context_parts.append("Recent conversation:")
        for msg in recent_messages[-5:]:  # Last 5 messages (~500 tokens)
            context_parts.append(f"  {msg}")

    return "\n".join(context_parts)


async def stream_concierge_response(question, trip=None, recent_messages=None):
    """
    Stream concierge response from Gemini (US-013 AC-1).
    Yields token chunks as they arrive.
    """
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
        )
        model = settings.LLM_MODEL

        context = build_concierge_context(trip, recent_messages)
        system_content = f"{CONCIERGE_SYSTEM_PROMPT}\n\nContext:\n{context}"

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question}
        ]

        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
        )

        full_text = ''
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_text += content
                yield {'type': 'token', 'content': content}

        # Check if response contains itinerary suggestion
        has_suggestion = '[ITINERARY_SUGGESTION]' in full_text
        yield {'type': 'complete', 'full_text': full_text, 'has_suggestion': has_suggestion}

    except Exception as e:
        yield {'type': 'error', 'message': str(e)}

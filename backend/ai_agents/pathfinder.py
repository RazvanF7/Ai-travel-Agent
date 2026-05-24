"""
Pathfinder Agent — AI-Generated Itinerary (US-005).
Uses Groq Llama 3 to generate a full day-by-day itinerary.
"""
import json
import re
from django.conf import settings


ITINERARY_SYSTEM_PROMPT = """You are Pathfinder, an expert AI travel planner. 
Generate a detailed day-by-day travel itinerary based on the user's request.

IMPORTANT: Return your response as a JSON array of activities. Each activity must have:
- "day": integer (1-indexed day number)
- "order": integer (position within the day, 0-indexed)  
- "title": string (activity name)
- "description": string (brief description)
- "location": string (specific location/address)
- "start_time": string (HH:MM format, 24hr)
- "duration_minutes": integer

After the JSON, you may add a brief summary paragraph.

Example format:
```json
[
  {"day": 1, "order": 0, "title": "Arrival & Check-in", "description": "Check into hotel and freshen up", "location": "Hotel Grand, City Center", "start_time": "14:00", "duration_minutes": 60},
  {"day": 1, "order": 1, "title": "Welcome Dinner", "description": "Traditional local cuisine", "location": "Restaurant La Belle, Old Town", "start_time": "19:00", "duration_minutes": 120}
]
```

Make the itinerary practical, well-paced, and include local hidden gems. Consider travel time between locations.
Budget should influence restaurant and activity choices.
"""


def generate_itinerary_prompt(destination, duration_days, budget=None, currency='EUR', preferences=''):
    """Build the user prompt for itinerary generation."""
    prompt = f"Plan a {duration_days}-day trip to {destination}."
    if budget:
        prompt += f" Budget: {budget} {currency}."
    if preferences:
        prompt += f" Preferences: {preferences}."
    prompt += " Include morning, afternoon, and evening activities for each day."
    return prompt


def parse_itinerary_json(text):
    """Extract JSON array of activities from AI response."""
    # Try to find JSON block
    json_match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find raw JSON array
    json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', text)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    return []


async def stream_itinerary(destination, duration_days, budget=None, currency='EUR', preferences=''):
    """
    Stream itinerary generation from Gemini (US-005 AC-2).
    Yields token chunks as they arrive.
    """
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
        )
        model = settings.LLM_MODEL

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

        full_text = ''
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_text += content
                yield {'type': 'token', 'content': content}

        # Parse final result
        activities = parse_itinerary_json(full_text)
        yield {'type': 'complete', 'activities': activities, 'full_text': full_text}

    except Exception as e:
        yield {'type': 'error', 'message': str(e)}

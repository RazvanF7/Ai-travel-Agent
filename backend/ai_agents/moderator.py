"""
Chat Moderator — AI-powered message moderation using Groq.
Uses Groq's Llama 3.1 to check messages for inappropriate content
before they are saved to the database.
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

MODERATOR_SYSTEM_PROMPT = """You are a chat moderator for a travel group planning app.
Your job is to review each user message and decide if it should be ALLOWED or BLOCKED.

BLOCK a message if it contains:
- Hate speech, slurs, or discriminatory language
- Harassment, threats, or bullying
- Sexually explicit content
- Spam or phishing links
- Personally identifiable information shared maliciously (doxxing)

ALLOW a message if it is:
- Normal travel discussion, planning, or coordination
- Casual friendly conversation (even off-topic)
- Travel-related disagreements or debates
- Jokes, banter, or slang (as long as not hateful)
- Questions, suggestions, or opinions

Respond with ONLY a valid JSON object, no extra text:
{"allowed": true}
or
{"allowed": false, "reason": "Brief explanation of why the message was blocked"}
"""


def moderate_message(content, sender_name=None):
    """
    Check a chat message using Groq AI moderation.

    Returns:
        dict: {"allowed": True} or {"allowed": False, "reason": "..."}

    On any error, returns {"allowed": True} (fail-open policy).
    """
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        # No Groq key configured — allow all messages
        return {'allowed': True}

    try:
        from openai import OpenAI

        client = OpenAI(
            base_url=settings.GROQ_BASE_URL,
            api_key=api_key,
        )

        user_content = f"Message from {sender_name}: {content}" if sender_name else content

        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": MODERATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
            max_tokens=100,
        )

        reply = response.choices[0].message.content.strip()

        # Parse the JSON response
        result = json.loads(reply)
        if isinstance(result.get('allowed'), bool):
            return result

        # Unexpected format — fail open
        logger.warning(f"Unexpected moderation response format: {reply}")
        return {'allowed': True}

    except json.JSONDecodeError as e:
        logger.warning(f"Moderation response was not valid JSON: {e}")
        return {'allowed': True}
    except Exception as e:
        logger.error(f"Chat moderation failed (fail-open): {e}")
        return {'allowed': True}

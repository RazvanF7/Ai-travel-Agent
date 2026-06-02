"""
Rate limiter for AI requests (US-005 AC-5).
3 requests/minute per user, 10 requests/hour per user.
"""
import time
from collections import defaultdict

# In-memory rate limiting (use Redis in production)
_user_requests = defaultdict(list)


def check_rate_limit(user_id):
    """
    Check if user is within rate limits.
    Returns (allowed: bool, retry_after: int seconds)
    """
    now = time.time()
    requests = _user_requests[user_id]

    # Clean old entries
    _user_requests[user_id] = [t for t in requests if now - t < 3600]
    requests = _user_requests[user_id]

    # Check per-minute limit (3/min)
    recent_minute = [t for t in requests if now - t < 60]
    if len(recent_minute) >= 3:
        retry_after = int(60 - (now - recent_minute[0]))
        return False, max(retry_after, 1)

    # Check per-hour limit (10/hour)
    if len(requests) >= 10:
        retry_after = int(3600 - (now - requests[0]))
        return False, max(retry_after, 1)

    return True, 0


def record_request(user_id):
    """Record a new AI request for rate limiting."""
    _user_requests[user_id].append(time.time())

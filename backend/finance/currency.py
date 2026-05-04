"""
Currency conversion using Frankfurter API (US-015).
Free, no API key required, updated daily.
Cache exchange rates for 6 hours.
Never convert the stored amount — only convert for display.
"""
import time
import requests

# Simple in-memory cache (use Redis in production)
_rate_cache = {}
_cache_ttl = 6 * 60 * 60  # 6 hours in seconds


def get_exchange_rate(from_currency, to_currency):
    """Get exchange rate from Frankfurter API with caching."""
    if from_currency == to_currency:
        return 1.0

    cache_key = f'{from_currency}_{to_currency}'
    now = time.time()

    # Check cache
    if cache_key in _rate_cache:
        rate, cached_at = _rate_cache[cache_key]
        if now - cached_at < _cache_ttl:
            return rate

    # Fetch from API
    try:
        response = requests.get(
            f'https://api.frankfurter.app/latest',
            params={'from': from_currency, 'to': to_currency},
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
        rate = data['rates'][to_currency]

        # Cache the result
        _rate_cache[cache_key] = (rate, now)
        return rate
    except Exception:
        # Fallback: return 1.0 if API fails
        return 1.0


def convert_amount(amount, from_currency, to_currency):
    """Convert amount for display purposes only (US-015)."""
    from decimal import Decimal, ROUND_HALF_UP
    rate = get_exchange_rate(from_currency, to_currency)
    converted = Decimal(str(amount)) * Decimal(str(rate))
    return converted.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .rate_limiter import check_rate_limit


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_status(request):
    """Check AI rate limit status for the current user."""
    allowed, retry_after = check_rate_limit(request.user.id)
    return Response({
        'allowed': allowed,
        'retry_after': retry_after,
    })

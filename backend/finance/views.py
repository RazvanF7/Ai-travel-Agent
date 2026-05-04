from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Transaction, DebtSplit
from .serializers import TransactionSerializer, CreateExpenseSerializer, DebtSplitSerializer
from .debt_simplifier import compute_net_balances, simplify_debts
from .currency import convert_amount
from groups.models import GroupMembership


class ExpenseListView(generics.ListAPIView):
    """List expenses for a trip (US-009 AC-3)."""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        trip_id = self.kwargs['trip_id']
        return Transaction.objects.filter(
            trip_id=trip_id
        ).select_related('payer').prefetch_related('splits__debtor')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_expense(request):
    """Log an expense and create debt splits (US-009, US-010)."""
    serializer = CreateExpenseSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    trip_id = data['trip_id']

    # Get group members for equal split
    from trips.models import Trip
    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found.'}, status=status.HTTP_404_NOT_FOUND)

    members = GroupMembership.objects.filter(
        group=trip.group
    ).select_related('user')

    # Create transaction
    transaction = Transaction.objects.create(
        trip=trip,
        payer=request.user,
        amount=data['amount'],
        currency=data['currency'],
        description=data['description'],
        split_type=data['split_type'],
    )

    if data['split_type'] == 'equal':
        # Equal split (US-010): remainder cent goes to payer
        member_count = members.count()
        if member_count == 0:
            member_count = 1

        per_person = (data['amount'] / member_count).quantize(
            Decimal('0.01'), rounding=ROUND_DOWN
        )
        remainder = data['amount'] - (per_person * member_count)

        for membership in members:
            split_amount = per_person
            # Assign remainder cent to payer
            if membership.user == request.user:
                split_amount += remainder

            DebtSplit.objects.create(
                transaction=transaction,
                debtor=membership.user,
                amount=split_amount,
                status='pending',
            )

    elif data['split_type'] == 'custom':
        # Custom split (US-010)
        for split_data in data.get('custom_splits', []):
            user_id = split_data.get('user_id')
            amount = Decimal(str(split_data.get('amount', 0))).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            if user_id and amount > 0:
                DebtSplit.objects.create(
                    transaction=transaction,
                    debtor_id=user_id,
                    amount=amount,
                    status='pending',
                )

    # Return full transaction with splits
    transaction = Transaction.objects.prefetch_related(
        'splits__debtor'
    ).select_related('payer').get(id=transaction.id)

    return Response(
        TransactionSerializer(transaction).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def debt_summary(request, trip_id):
    """
    View simplified debt summary (US-011).
    Uses debt simplification algorithm to minimize transfers.
    """
    balances = compute_net_balances(trip_id)
    transfers = simplify_debts(balances)

    # Get user info for the response
    user_ids = set()
    for from_id, to_id, amount in transfers:
        user_ids.add(from_id)
        user_ids.add(to_id)

    users = {u.id: u for u in User.objects.filter(id__in=user_ids)}

    # Get user's preferred currency for conversion
    preferred_currency = 'EUR'
    if hasattr(request.user, 'profile'):
        preferred_currency = request.user.profile.preferred_currency

    result = []
    for from_id, to_id, amount in transfers:
        from_user = users.get(from_id)
        to_user = users.get(to_id)

        # Get the original currency from the transactions
        entry = {
            'from_user': {
                'id': from_id,
                'name': from_user.first_name or from_user.username if from_user else 'Unknown',
                'email': from_user.email if from_user else '',
            },
            'to_user': {
                'id': to_id,
                'name': to_user.first_name or to_user.username if to_user else 'Unknown',
                'email': to_user.email if to_user else '',
            },
            'amount': str(amount),
            'currency': 'EUR',  # Default; will be enhanced with multi-currency
            'converted_amount': str(convert_amount(amount, 'EUR', preferred_currency)),
            'converted_currency': preferred_currency,
        }
        result.append(entry)

    # Check if user is all settled up (US-011 AC-2)
    user_balance = balances.get(request.user.id, Decimal('0.00'))
    is_settled = user_balance == Decimal('0.00')

    return Response({
        'transfers': result,
        'is_settled': is_settled,
        'user_balance': str(user_balance),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_debt_paid(request, split_id):
    """Mark a debt split as paid (US-011 AC-4)."""
    try:
        split = DebtSplit.objects.get(id=split_id)
    except DebtSplit.DoesNotExist:
        return Response({'error': 'Debt not found.'}, status=status.HTTP_404_NOT_FOUND)

    if split.transaction.payer != request.user:
        return Response(
            {'error': 'Only the person who paid the expense can mark this debt as settled.'},
            status=status.HTTP_403_FORBIDDEN
        )

    split.status = 'paid'
    split.paid_at = timezone.now()
    split.save()

    return Response(DebtSplitSerializer(split).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_receipt_url(request):
    """
    Generate a local upload path for receipt images (US-012).
    In production, this would generate a presigned URL for R2/S3.
    """
    import uuid
    import os
    from django.conf import settings

    filename = request.data.get('filename', 'receipt.jpg')
    content_type = request.data.get('content_type', 'image/jpeg')

    # Validate file type
    if content_type not in settings.ALLOWED_UPLOAD_TYPES:
        return Response(
            {'error': f'File type {content_type} not allowed. Use JPEG, PNG, or WebP.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate unique filename
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'jpg'
    unique_name = f'receipts/{uuid.uuid4()}.{ext}'
    upload_path = os.path.join(settings.MEDIA_ROOT, unique_name)

    # Ensure directory exists
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)

    return Response({
        'upload_url': f'/media/{unique_name}',
        'receipt_url': f'{request.build_absolute_uri("/media/")}{unique_name}',
    })

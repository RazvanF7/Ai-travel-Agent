import json
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Transaction, DebtSplit
from .debt_simplifier import compute_net_balances, simplify_debts
from .currency import convert_amount
from groups.models import GroupMembership
from trips.models import Trip
from accounts.auth import jwt_required

def serialize_debt_split(split):
    return {
        'id': split.id,
        'transaction': split.transaction.id,
        'debtor': {
            'id': split.debtor.id,
            'username': split.debtor.username,
        } if split.debtor else None,
        'amount': str(split.amount),
        'status': split.status,
        'paid_at': split.paid_at.isoformat() if split.paid_at else None,
    }

def serialize_transaction(transaction):
    return {
        'id': transaction.id,
        'trip': transaction.trip.id,
        'payer': {
            'id': transaction.payer.id,
            'username': transaction.payer.username,
        } if transaction.payer else None,
        'amount': str(transaction.amount),
        'currency': transaction.currency,
        'description': transaction.description,
        'split_type': transaction.split_type,
        'receipt_url': transaction.receipt_url,
        'created_at': transaction.created_at.isoformat(),
        'splits': [serialize_debt_split(split) for split in transaction.splits.all()]
    }


@method_decorator(jwt_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class ExpenseListView(View):
    """List expenses for a trip (US-009 AC-3)."""
    
    def get(self, request, trip_id, *args, **kwargs):
        qs = Transaction.objects.filter(
            trip_id=trip_id
        ).select_related('payer').prefetch_related('splits__debtor')
        
        data = [serialize_transaction(tx) for tx in qs]
        return JsonResponse(data, safe=False)


@csrf_exempt
@jwt_required
def create_expense(request):
    """Log an expense and create debt splits (US-009, US-010)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    trip_id = data.get('trip_id')
    amount = data.get('amount')
    currency = data.get('currency', 'EUR')
    description = data.get('description', '')
    split_type = data.get('split_type', 'equal')
    
    if not trip_id or not amount:
        return JsonResponse({'error': 'trip_id and amount are required'}, status=400)
        
    try:
        amount = Decimal(str(amount))
    except Exception:
        return JsonResponse({'error': 'Invalid amount format'}, status=400)

    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return JsonResponse({'error': 'Trip not found.'}, status=404)

    members = GroupMembership.objects.filter(
        group=trip.group
    ).select_related('user')

    # Create transaction
    transaction = Transaction.objects.create(
        trip=trip,
        payer=request.user,
        amount=amount,
        currency=currency,
        description=description,
        split_type=split_type,
    )

    if split_type == 'equal':
        # Equal split (US-010): remainder cent goes to payer
        member_count = members.count()
        if member_count == 0:
            member_count = 1

        per_person = (amount / member_count).quantize(
            Decimal('0.01'), rounding=ROUND_DOWN
        )
        remainder = amount - (per_person * member_count)

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

    elif split_type == 'custom':
        # Custom split (US-010)
        for split_data in data.get('custom_splits', []):
            user_id = split_data.get('user_id')
            split_amt = Decimal(str(split_data.get('amount', 0))).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            if user_id and split_amt > 0:
                DebtSplit.objects.create(
                    transaction=transaction,
                    debtor_id=user_id,
                    amount=split_amt,
                    status='pending',
                )

    # Return full transaction with splits
    transaction = Transaction.objects.prefetch_related(
        'splits__debtor'
    ).select_related('payer').get(id=transaction.id)

    return JsonResponse(serialize_transaction(transaction), status=201)


@csrf_exempt
@jwt_required
def debt_summary(request, trip_id):
    """
    View simplified debt summary (US-011).
    Uses debt simplification algorithm to minimize transfers.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
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

    return JsonResponse({
        'transfers': result,
        'is_settled': is_settled,
        'user_balance': str(user_balance),
    })


@csrf_exempt
@jwt_required
def mark_debt_paid(request, split_id):
    """Mark a debt split as paid (US-011 AC-4)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        split = DebtSplit.objects.get(id=split_id)
    except DebtSplit.DoesNotExist:
        return JsonResponse({'error': 'Debt not found.'}, status=404)

    if split.transaction.payer != request.user:
        return JsonResponse(
            {'error': 'Only the person who paid the expense can mark this debt as settled.'},
            status=403
        )

    split.status = 'paid'
    split.paid_at = timezone.now()
    split.save()

    return JsonResponse(serialize_debt_split(split))


@csrf_exempt
@jwt_required
def upload_receipt_url(request):
    """
    Generate a local upload path for receipt images (US-012).
    In production, this would generate a presigned URL for R2/S3.
    """
    import uuid
    import os
    from django.conf import settings

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = {}
        
    filename = data.get('filename', 'receipt.jpg')
    content_type = data.get('content_type', 'image/jpeg')

    # Validate file type
    if content_type not in getattr(settings, 'ALLOWED_UPLOAD_TYPES', []):
        return JsonResponse(
            {'error': f'File type {content_type} not allowed. Use JPEG, PNG, or WebP.'},
            status=400
        )

    # Generate unique filename
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'jpg'
    unique_name = f'receipts/{uuid.uuid4()}.{ext}'
    upload_path = os.path.join(settings.MEDIA_ROOT, unique_name)

    # Ensure directory exists
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)

    return JsonResponse({
        'upload_url': f'/media/{unique_name}',
        'receipt_url': f'{request.build_absolute_uri("/media/")}{unique_name}',
    })

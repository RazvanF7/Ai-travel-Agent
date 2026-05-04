from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Transaction, DebtSplit


class DebtSplitSerializer(serializers.ModelSerializer):
    debtor_name = serializers.CharField(source='debtor.first_name', read_only=True)
    debtor_email = serializers.CharField(source='debtor.email', read_only=True)

    class Meta:
        model = DebtSplit
        fields = ['id', 'transaction', 'debtor', 'debtor_name', 'debtor_email',
                  'amount', 'status', 'paid_at']
        read_only_fields = ['id', 'transaction', 'paid_at']


class TransactionSerializer(serializers.ModelSerializer):
    splits = DebtSplitSerializer(many=True, read_only=True)
    payer_name = serializers.CharField(source='payer.first_name', read_only=True)
    payer_email = serializers.CharField(source='payer.email', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'trip', 'payer', 'payer_name', 'payer_email',
            'amount', 'currency', 'description', 'receipt_url',
            'split_type', 'splits', 'created_at',
        ]
        read_only_fields = ['id', 'payer', 'created_at']


class CreateExpenseSerializer(serializers.Serializer):
    """Create an expense with automatic or custom splits (US-009, US-010)."""
    trip_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(max_length=3, default='EUR')
    description = serializers.CharField(max_length=255)
    split_type = serializers.ChoiceField(choices=['equal', 'custom'], default='equal')
    # For custom splits: [{"user_id": 1, "amount": "10.00"}, ...]
    custom_splits = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )

    def validate_amount(self, value):
        """US-009 AC-4: Reject negative or zero amounts."""
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        # US-009 AC-2: Round to 2 decimal places
        return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

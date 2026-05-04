"""
Debt Simplification Algorithm (US-011).

Instead of showing raw transactions, reduce to the minimum number of
transfers needed. E.g. if A owes B 20 and B owes C 20, show A owes C 20 directly.
"""
from decimal import Decimal
from collections import defaultdict


def simplify_debts(balances):
    """
    Given a dict of {user_id: net_balance}, compute the minimum set of transfers.
    Positive balance = is owed money. Negative balance = owes money.

    Returns: list of (from_user_id, to_user_id, amount)
    """
    # Separate into creditors (positive) and debtors (negative)
    creditors = []  # [(user_id, amount)]
    debtors = []    # [(user_id, amount)]

    for user_id, balance in balances.items():
        if balance > 0:
            creditors.append([user_id, balance])
        elif balance < 0:
            debtors.append([user_id, -balance])  # Store as positive

    # Sort by amount descending for greedy matching
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    transfers = []
    i, j = 0, 0

    while i < len(creditors) and j < len(debtors):
        creditor_id, credit = creditors[i]
        debtor_id, debt = debtors[j]

        transfer_amount = min(credit, debt)
        if transfer_amount > Decimal('0.00'):
            transfers.append((debtor_id, creditor_id, transfer_amount))

        creditors[i][1] -= transfer_amount
        debtors[j][1] -= transfer_amount

        if creditors[i][1] == 0:
            i += 1
        if debtors[j][1] == 0:
            j += 1

    return transfers


def compute_net_balances(trip_id):
    """
    Compute net balances for all members in a trip.
    Positive = owed money, Negative = owes money.
    """
    from .models import Transaction, DebtSplit

    balances = defaultdict(Decimal)

    transactions = Transaction.objects.filter(trip_id=trip_id)

    for txn in transactions:
        # Payer is owed money
        balances[txn.payer_id] += txn.amount

        # Each debtor owes their share
        splits = DebtSplit.objects.filter(transaction=txn, status='pending')
        for split in splits:
            balances[split.debtor_id] -= split.amount

        # Payer's own share (they owe themselves, which cancels out)
        payer_split = DebtSplit.objects.filter(transaction=txn, debtor=txn.payer).first()
        if payer_split:
            # The payer's own share is already subtracted above, no adjustment needed
            pass

    return dict(balances)

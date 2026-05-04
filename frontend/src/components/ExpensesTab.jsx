import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { finance } from '../services/api';

export default function ExpensesTab({ trip }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [debtSummary, setDebtSummary] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [activeView, setActiveView] = useState('expenses');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [trip.id]);

  async function loadData() {
    try {
      const [exp, debts] = await Promise.all([
        finance.expenses(trip.id).catch(() => []),
        finance.debtSummary(trip.id).catch(() => null),
      ]);
      setExpenses(Array.isArray(exp) ? exp : exp.results || []);
      setDebtSummary(debts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="glass-card-static" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Total Spent</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-tertiary)' }}>{totalSpent.toFixed(2)} {trip.currency}</div>
        </div>
        <div className="glass-card-static" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{expenses.length}</div>
        </div>
        <div className="glass-card-static" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: debtSummary?.is_settled ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
            {debtSummary?.is_settled ? '✓ All settled!' : 'Outstanding debts'}
          </div>
        </div>
      </div>

      {/* Toggle View */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)', padding: 4, border: '1px solid var(--border-subtle)' }}>
        <button className={`tab ${activeView === 'expenses' ? 'active' : ''}`} onClick={() => setActiveView('expenses')}> Expenses</button>
        <button className={`tab ${activeView === 'debts' ? 'active' : ''}`} onClick={() => setActiveView('debts')}> Debt Summary</button>
      </div>

      {activeView === 'expenses' ? (
        <div>
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)} style={{ marginBottom: 20 }}>
             Log Expense
          </button>

          {showAddExpense && (
            <AddExpenseForm trip={trip} onSaved={() => { setShowAddExpense(false); loadData(); }} onCancel={() => setShowAddExpense(false)} />
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
            </div>
          ) : expenses.length === 0 ? (
            <div className="glass-card-static empty-state">
              <div className="icon"></div>
              <h3>No expenses yet</h3>
              <p>Log your first shared expense to start tracking costs</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenses.map(exp => (
                <div key={exp.id} className="glass-card" style={{ padding: '14px 20px' }}>
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{exp.description}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        Paid by {exp.payer_name || 'Unknown'} · {exp.split_type} split
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-tertiary)' }}>
                        {parseFloat(exp.amount).toFixed(2)} {exp.currency}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                        {new Date(exp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Splits Breakdown */}
                  {exp.splits && exp.splits.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                      <div style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Split Details:</div>
                      {exp.splits.map(split => {
                        const isPayer = user?.id === exp.payer;
                        const isPending = split.status === 'pending';
                        
                        // Don't show "mark paid" if the debtor is the payer themselves
                        const isSelf = split.debtor === exp.payer;

                        return (
                          <div key={split.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div>
                              <span>{split.debtor_name || split.debtor_email || 'Unknown'} {isSelf ? '(You)' : ''}</span>
                              <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>{parseFloat(split.amount).toFixed(2)} {exp.currency}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isPending ? (
                                <span style={{ color: 'var(--accent-warning)', fontSize: '0.75rem', fontWeight: 600 }}>Pending</span>
                              ) : (
                                <span style={{ color: 'var(--accent-success)', fontSize: '0.75rem', fontWeight: 600 }}>Paid</span>
                              )}
                              {isPayer && isPending && !isSelf && (
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                  onClick={async () => {
                                    try {
                                      await finance.markPaid(split.id);
                                      loadData();
                                    } catch (err) {
                                      alert(err.message || 'Failed to mark as paid');
                                    }
                                  }}
                                >
                                  Check Off
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DebtSummaryView summary={debtSummary} userId={user?.id} onRefresh={loadData} />
      )}
    </div>
  );
}

function AddExpenseForm({ trip, onSaved, onCancel }) {
  const [form, setForm] = useState({ amount: '', currency: trip.currency, description: '', split_type: 'equal' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than zero.'); return; }
    if (!form.description) { setError('Description is required.'); return; }
    setLoading(true); setError('');
    try {
      await finance.createExpense({ trip_id: trip.id, ...form, amount: parseFloat(form.amount) });
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  return (
    <div className="glass-card-static" style={{ marginBottom: 20 }}>
      <h4 style={{ marginBottom: 16, fontWeight: 600 }}> Log Expense</h4>
      <form onSubmit={handleSubmit} className="flex-col gap-sm">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="input-group">
            <label>Amount</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="25.50" value={form.amount} onChange={e => update('amount', e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Currency</label>
            <select className="input" value={form.currency} onChange={e => update('currency', e.target.value)}>
              {['EUR', 'USD', 'GBP', 'RON', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="input-group">
          <label>Description</label>
          <input className="input" placeholder="Dinner at the beach restaurant" value={form.description} onChange={e => update('description', e.target.value)} required />
        </div>
        <div className="input-group">
          <label>Split Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn btn-sm ${form.split_type === 'equal' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => update('split_type', 'equal')}>Equal Split</button>
            <button type="button" className={`btn btn-sm ${form.split_type === 'custom' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => update('split_type', 'custom')}>Custom Split</button>
          </div>
        </div>
        {error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.875rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Saving...' : 'Log Expense'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function DebtSummaryView({ summary, userId, onRefresh }) {
  if (!summary) return <div className="glass-card-static empty-state"><div className="icon"></div><h3>Loading debts...</h3></div>;

  if (summary.is_settled) {
    return (
      <div className="glass-card-static" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}></div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-success)', marginBottom: 8 }}>All settled up!</h3>
        <p style={{ color: 'var(--text-secondary)' }}>No outstanding debts in this trip.</p>
      </div>
    );
  }

  const handleMarkPaid = async (splitId) => {
    try { await finance.markPaid(splitId); onRefresh(); } catch (e) { console.error(e); }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Simplified Transfers</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(summary.transfers || []).map((t, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 20px' }}>
            <div className="flex-between">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                  {t.from_user.name[0]}
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>{t.from_user.name}</span>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 8px' }}>→</span>
                  <span style={{ fontWeight: 600 }}>{t.to_user.name}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{t.amount} {t.currency}</div>
                {t.converted_currency !== t.currency && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>≈ {t.converted_amount} {t.converted_currency}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

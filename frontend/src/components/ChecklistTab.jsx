import { useState, useEffect, useCallback } from 'react';
import { checklists as checklistApi } from '../services/api';

const POLL_INTERVAL = 10000; // 10 seconds

export default function ChecklistTab({ trip }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch items
  const fetchItems = useCallback(() => {
    checklistApi.list(trip.id)
      .then(data => {
        setItems(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trip.id]);

  // Initial load
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Poll for updates from other users
  useEffect(() => {
    const interval = setInterval(fetchItems, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const title = newItem.trim();
    setNewItem('');

    try {
      const item = await checklistApi.create(trip.id, { title });
      setItems(prev => [...prev, item]);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleToggle = async (itemId) => {
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, is_completed: !i.is_completed } : i
    ));

    try {
      const updated = await checklistApi.toggle(trip.id, itemId);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error('Failed to toggle item:', err);
      fetchItems(); // Revert on error
    }
  };

  const handleDelete = async (itemId) => {
    // Optimistic update
    setItems(prev => prev.filter(i => i.id !== itemId));

    try {
      await checklistApi.remove(trip.id, itemId);
    } catch (err) {
      console.error('Failed to delete item:', err);
      fetchItems(); // Revert on error
    }
  };

  const completedCount = items.filter(i => i.is_completed).length;

  return (
    <div className="glass-card-static">
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}> Trip Checklist</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
            {completedCount}/{items.length} completed
          </p>
        </div>
        {items.length > 0 && (
          <div style={{ width: 120, height: 6, background: 'var(--bg-glass)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
              height: '100%', background: 'var(--gradient-primary)', borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {/* Add Item */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Add a checklist item..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newItem.trim()}>
          Add
        </button>
      </div>

      {/* Items */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="icon"></div>
          <h3>No items yet</h3>
          <p>Add tasks your group needs to complete before the trip</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                background: item.is_completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-glass)',
                border: `1px solid ${item.is_completed ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-subtle)'}`,
                transition: 'all var(--transition-fast)',
              }}
            >
              <button
                onClick={() => handleToggle(item.id)}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: 'none',
                  background: item.is_completed ? 'var(--accent-success)' : 'var(--bg-input)',
                  color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0,
                  borderWidth: 2, borderStyle: 'solid',
                  borderColor: item.is_completed ? 'var(--accent-success)' : 'var(--border-medium)',
                }}
              >
                {item.is_completed && '✓'}
              </button>
              <div style={{ flex: 1 }}>
                <span style={{
                  textDecoration: item.is_completed ? 'line-through' : 'none',
                  color: item.is_completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontSize: '0.9375rem',
                }}>
                  {item.title}
                </span>
                {item.is_completed && item.completed_by_name && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--accent-success)', marginTop: 2 }}>
                    ✓ by {item.completed_by_name}
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)} style={{ padding: '4px 8px', color: 'var(--text-tertiary)' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { itinerary as itineraryApi } from '../services/api';
import AiItineraryGenerator from './AiItineraryGenerator';

const ACTIVITY_ICONS = ['🏛️', '🍽️', '🚶', '🎭', '🛍️', '🌅', '☕', '🏞️', '🎵', '⛩️'];

function getActivityIcon(title, index) {
  const t = (title || '').toLowerCase();
  if (t.includes('breakfast') || t.includes('lunch') || t.includes('dinner') || t.includes('food') || t.includes('eat') || t.includes('restaurant') || t.includes('café') || t.includes('cafe')) return '🍽️';
  if (t.includes('museum') || t.includes('gallery') || t.includes('palace') || t.includes('castle') || t.includes('monument') || t.includes('temple') || t.includes('church') || t.includes('cathedral')) return '🏛️';
  if (t.includes('walk') || t.includes('stroll') || t.includes('hike') || t.includes('tour')) return '🚶';
  if (t.includes('shop') || t.includes('market') || t.includes('mall') || t.includes('bazaar')) return '🛍️';
  if (t.includes('sunset') || t.includes('sunrise') || t.includes('beach') || t.includes('view')) return '🌅';
  if (t.includes('coffee') || t.includes('tea') || t.includes('brunch')) return '☕';
  if (t.includes('park') || t.includes('garden') || t.includes('nature') || t.includes('lake') || t.includes('mountain')) return '🏞️';
  if (t.includes('show') || t.includes('theater') || t.includes('theatre') || t.includes('concert') || t.includes('music') || t.includes('perform')) return '🎭';
  if (t.includes('arrival') || t.includes('check-in') || t.includes('check in') || t.includes('hotel') || t.includes('accommodation')) return '🏨';
  if (t.includes('depart') || t.includes('airport') || t.includes('train') || t.includes('bus') || t.includes('travel') || t.includes('transfer')) return '✈️';
  return ACTIVITY_ICONS[index % ACTIVITY_ICONS.length];
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  // Handle "HH:MM:SS" or "HH:MM"
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

export default function ItineraryTab({ trip, onRefresh }) {
  const [items, setItems] = useState(trip.itinerary_items || []);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    setItems(trip.itinerary_items || []);
  }, [trip]);

  // Group items by day
  const dayGroups = {};
  items.forEach(item => {
    if (!dayGroups[item.day]) dayGroups[item.day] = [];
    dayGroups[item.day].push(item);
  });

  const days = Object.keys(dayGroups).sort((a, b) => a - b);

  const handleDelete = async (itemId) => {
    try {
      await itineraryApi.delete(trip.id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItineraryGenerated = () => {
    setShowGenerator(false);
    onRefresh();
  };

  return (
    <div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-teal" onClick={() => setShowGenerator(!showGenerator)}>
           {showGenerator ? 'Hide AI Generator' : '🗺️ Generate with AI'}
        </button>
        <button className="btn" style={{ background: 'white', color: '#0f172a', border: '1px solid #cbd5e1' }} onClick={() => setEditingItem({ day: 1, order: items.length, title: '', description: '', location: '', start_time: '', duration_minutes: 60 })}>
           ＋ Add Manually
        </button>
      </div>

      {/* AI Generator */}
      {showGenerator && (
        <div style={{ marginBottom: 24 }}>
          <AiItineraryGenerator trip={trip} onGenerated={handleItineraryGenerated} />
        </div>
      )}

      {/* Manual Add/Edit Form */}
      {editingItem && (
        <AddItemForm
          trip={trip}
          item={editingItem}
          onSaved={(newItem) => {
            setItems(prev => [...prev, newItem]);
            setEditingItem(null);
          }}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {/* Itinerary Items by Day */}
      {days.length === 0 ? (
        <div className="glass-card-static empty-state">
          <div className="icon">🗺️</div>
          <h3>No itinerary yet</h3>
          <p>Use the AI generator or add activities manually to build your trip plan!</p>
        </div>
      ) : (
        days.map(day => (
          <div key={day} style={{ marginBottom: 28 }}>
            <h3 className="itinerary-day-header">
              <span>📅</span> Day {day}
              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.875rem', marginLeft: 8 }}>
                — {dayGroups[day].length} {dayGroups[day].length === 1 ? 'activity' : 'activities'}
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayGroups[day].sort((a, b) => a.order - b.order).map((item, idx) => (
                <div key={item.id} className="activity-card">
                  <div className="activity-icon-circle">
                    {getActivityIcon(item.title, idx)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{item.title}</div>
                    {item.location && <div className="activity-location">📍 {item.location}</div>}
                    {item.description && <div className="activity-desc">{item.description}</div>}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(item.id)}
                      style={{ color: '#ef4444', padding: '4px 0', alignSelf: 'flex-start', marginTop: '8px', fontSize: '0.75rem' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  <div className="activity-meta">
                    {item.start_time && (
                      <div className="activity-time-badge">
                        🕐 {formatTime(item.start_time)}
                      </div>
                    )}
                    {item.duration_minutes && (
                      <div className="activity-duration-badge">
                        {item.duration_minutes}min
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AddItemForm({ trip, item, onSaved, onCancel }) {
  const [form, setForm] = useState(item);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await itineraryApi.create(trip.id, {
        ...form,
        trip: trip.id,
        day: parseInt(form.day) || 1,
        order: parseInt(form.order) || 0,
        duration_minutes: parseInt(form.duration_minutes) || null,
        start_time: form.start_time || null,
      });
      onSaved(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="glass-card-static" style={{ marginBottom: 20 }}>
      <h4 style={{ marginBottom: 16, fontWeight: 600 }}> Add Activity</h4>
      <form onSubmit={handleSubmit} className="flex-col gap-sm">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
          <div className="input-group">
            <label>Day</label>
            <input className="input" type="number" min="1" value={form.day} onChange={e => update('day', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Time</label>
            <input className="input" type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Title</label>
            <input className="input" placeholder="Visit the Grand Palace" value={form.title} onChange={e => update('title', e.target.value)} required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="input-group">
            <label>Location</label>
            <input className="input" placeholder="Grand Palace, Bangkok" value={form.location} onChange={e => update('location', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Duration (min)</label>
            <input className="input" type="number" value={form.duration_minutes} onChange={e => update('duration_minutes', e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label>Description</label>
          <textarea className="input" placeholder="Brief description..." value={form.description} onChange={e => update('description', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? 'Saving...' : 'Add Activity'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

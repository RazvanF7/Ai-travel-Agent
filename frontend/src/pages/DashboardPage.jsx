import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { groups as groupsApi, trips as tripsApi } from '../services/api';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groupList, setGroupList] = useState([]);
  const [tripList, setTripList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [gData, tData] = await Promise.all([
        groupsApi.list().catch(() => ({ results: [] })),
        tripsApi.list().catch(() => ({ results: [] })),
      ]);
      setGroupList(gData.results || gData || []);
      setTripList(tData.results || tData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon"></span>
          AI Travel Hub
        </div>
        <div className="user-menu">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {user?.firstName || user?.email}
          </span>
          <div className="user-avatar">
            {(user?.firstName || user?.email || '?')[0].toUpperCase()}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="content-wrapper">
        {/* Welcome Section */}
        <div className="animate-slide-up" style={{ marginBottom: 40, paddingTop: 20 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
            Welcome back, <span style={{
              background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>{user?.firstName || 'Traveler'}</span> 
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
            Plan your next adventure with your group
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowCreateGroup(true)}>
             Create Group
          </button>
          <button className="btn btn-secondary" onClick={() => setShowJoinGroup(true)}>
             Join with Code
          </button>
        </div>

        {/* Groups Grid */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
             Your Groups
            <span className="badge badge-primary">{groupList.length}</span>
          </h2>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 160 }} />
              ))}
            </div>
          ) : groupList.length === 0 ? (
            <div className="glass-card-static empty-state">
              <div className="icon"></div>
              <h3>No groups yet</h3>
              <p>Create a group and invite your travel companions!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {groupList.map((group, idx) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={idx}
                  onCreateTrip={() => { setSelectedGroup(group); setShowCreateTrip(true); }}
                  onViewTrips={() => navigate(`/trip/${group.id}`)}
                  trips={tripList.filter(t => t.group === group.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Trips */}
        {tripList.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
               Your Trips
              <span className="badge badge-primary">{tripList.length}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {tripList.map((trip, idx) => (
                <TripCard key={trip.id} trip={trip} index={idx} onClick={() => navigate(`/trip/${trip.id}`)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(group) => { setGroupList(prev => [group, ...prev]); setShowCreateGroup(false); }}
        />
      )}
      {showJoinGroup && (
        <JoinGroupModal
          onClose={() => setShowJoinGroup(false)}
          onJoined={(group) => { setGroupList(prev => [group, ...prev]); setShowJoinGroup(false); }}
        />
      )}
      {showCreateTrip && selectedGroup && (
        <CreateTripModal
          group={selectedGroup}
          onClose={() => setShowCreateTrip(false)}
          onCreated={(trip) => { setTripList(prev => [trip, ...prev]); setShowCreateTrip(false); }}
        />
      )}
    </div>
  );
}

/* ═══ Group Card ═══ */
function GroupCard({ group, index, onCreateTrip, trips }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="glass-card"
      style={{ animationDelay: `${index * 80}ms`, cursor: 'default' }}
    >
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{group.name}</h3>
        <span className="badge badge-primary">{group.member_count || group.members?.length || 0} members</span>
      </div>

      {/* Invite Code (US-002 AC-2) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)'
      }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 500 }}>INVITE</span>
        <code style={{ color: 'var(--accent-primary-light)', fontWeight: 700, letterSpacing: '0.1em', flex: 1 }}>
          {group.invite_code}
        </code>
        <button className="btn btn-ghost btn-sm" onClick={copyInviteCode} style={{ padding: '4px 10px' }}>
          {copied ? '✓ Copied' : ' Copy'}
        </button>
      </div>

      {/* Trip count */}
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
        {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onCreateTrip}>
          + New Trip
        </button>
        {trips.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/trip/${trips[0].id}`)}>
            View Trip
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══ Trip Card ═══ */
function TripCard({ trip, index, onClick }) {
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const days = trip.duration_days || Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div
      className="glass-card"
      style={{ animationDelay: `${index * 80}ms`, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
           {trip.destination}
        </h3>
        <span className="badge badge-success">{days} days</span>
      </div>

      <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 12 }}>
        <span> {startDate.toLocaleDateString()}</span>
        <span>→</span>
        <span>{endDate.toLocaleDateString()}</span>
      </div>

      {trip.budget && (
        <div style={{ color: 'var(--accent-tertiary)', fontWeight: 600, fontSize: '0.9375rem' }}>
           {trip.budget} {trip.currency}
        </div>
      )}

      <div style={{
        marginTop: 12, padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-accent)'
      }}>
        {trip.itinerary_items?.length || 0} itinerary items
      </div>
    </div>
  );
}

/* ═══ Create Group Modal (US-002) ═══ */
function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.length < 3 || name.length > 100) {
      setError('Group name must be 3-100 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const group = await groupsApi.create({ name });
      onCreated(group);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2> Create a Group</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <label htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              className="input"
              placeholder="Summer Trip Squad "
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
              {name.length}/100 characters
            </span>
          </div>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══ Join Group Modal (US-003) ═══ */
function JoinGroupModal({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 8) {
      setError('Invite code must be 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const group = await groupsApi.join(code);
      onJoined(group);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2> Join a Group</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <label htmlFor="invite-code">Invite Code</label>
            <input
              id="invite-code"
              className="input"
              placeholder="ABCD1234"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ letterSpacing: '0.15em', fontWeight: 700, fontSize: '1.125rem', textAlign: 'center' }}
              autoFocus
            />
          </div>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading || code.length !== 8}>
            {loading ? 'Joining...' : 'Join Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══ Create Trip Modal (US-004) ═══ */
function CreateTripModal({ group, onClose, onCreated }) {
  const [form, setForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'EUR',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination || !form.start_date || !form.end_date) {
      setError('Destination and dates are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const trip = await tripsApi.create({
        ...form,
        group: group.id,
        budget: form.budget ? parseFloat(form.budget) : null,
      });
      onCreated(trip);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2> Plan a Trip</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
          for <strong>{group.name}</strong>
        </p>
        <form onSubmit={handleSubmit} className="flex-col gap-md">
          <div className="input-group">
            <label htmlFor="trip-dest">Destination</label>
            <input id="trip-dest" className="input" placeholder="Tokyo, Japan " value={form.destination} onChange={e => update('destination', e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label htmlFor="trip-start">Start Date</label>
              <input id="trip-start" className="input" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
            </div>
            <div className="input-group">
              <label htmlFor="trip-end">End Date</label>
              <input id="trip-end" className="input" type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label htmlFor="trip-budget">Budget</label>
              <input id="trip-budget" className="input" type="number" placeholder="1500" value={form.budget} onChange={e => update('budget', e.target.value)} />
            </div>
            <div className="input-group">
              <label htmlFor="trip-currency">Currency</label>
              <select id="trip-currency" className="input" value={form.currency} onChange={e => update('currency', e.target.value)}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="RON">RON</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="trip-desc">Description (optional)</label>
            <textarea id="trip-desc" className="input" placeholder="Notes about the trip..." value={form.description} onChange={e => update('description', e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.875rem' }}>{error}</div>}
          <button className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Creating...' : ' Create Trip'}
          </button>
        </form>
      </div>
    </div>
  );
}

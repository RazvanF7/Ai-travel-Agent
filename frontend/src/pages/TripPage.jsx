import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { trips as tripsApi } from '../services/api';
import ItineraryTab from '../components/ItineraryTab';
import ChatTab from '../components/ChatTab';
import ChecklistTab from '../components/ChecklistTab';
import ExpensesTab from '../components/ExpensesTab';
import AiConcierge from '../components/AiConcierge';
import TravelToolsSidebar from '../components/TravelToolsSidebar';
import '../trip.css';

const TABS = [
  { id: 'itinerary', label: ' Itinerary', icon: '' },
  { id: 'chat', label: ' Chat', icon: '' },
  { id: 'checklist', label: ' Checklist', icon: '' },
  { id: 'expenses', label: ' Expenses', icon: '' },
  { id: 'concierge', label: ' AI Concierge', icon: '' },
];

export default function TripPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [trip, setTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  async function loadTrip() {
    try {
      const data = await tripsApi.get(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <header className="app-header">
          <div className="app-logo"><span className="logo-icon"></span> AI Travel Hub</div>
        </header>
        <div className="content-wrapper">
          <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="page-container">
        <header className="app-header">
          <div className="app-logo"><span className="logo-icon"></span> AI Travel Hub</div>
        </header>
        <div className="content-wrapper">
          <div className="glass-card-static empty-state">
            <div className="icon"></div>
            <h3>Trip not found</h3>
            <p>This trip may have been deleted or you may not have access.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);

  return (
    <div className="trip-dashboard">
      {/* Header */}
      <header className="trip-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ color: 'white' }}>
            ← Back
          </button>
          <div className="trip-logo">
            <span className="trip-logo-icon">▲</span>
            Travel Hub
          </div>
        </div>
        <div className="trip-user-menu">
          <span style={{ fontSize: '0.875rem' }}>{user?.firstName || 'Demo User'}</span>
          <div className="trip-user-avatar">
            {(user?.firstName || '?')[0].toUpperCase()}
          </div>
          <button className="btn btn-sm" style={{ background: '#d4af37', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', fontWeight: 600, cursor: 'pointer' }} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="trip-layout-grid">
        {/* Main Content Column */}
        <div>
          {/* Trip Hero */}
          <div className="trip-hero" style={{ backgroundImage: "url('/images/act_train.png')" }}>
            <div className="trip-hero-content">
              <h1 className="trip-hero-title">{trip.destination}</h1>
              <div className="trip-hero-meta">
                <span>{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="trip-hero-badge">{trip.duration_days} days</span>
                <span>Sigma star</span>
              </div>
            </div>
            {trip.budget && (
              <div className="trip-budget-coin">
                <span style={{ fontSize: '2rem' }}>💰</span>
                <span className="trip-budget-coin-label">Budget</span>
                <span className="trip-budget-coin-value">{Number(trip.budget).toLocaleString()} {trip.currency}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="trip-tabs-container">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`trip-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in" key={activeTab}>
            {activeTab === 'itinerary' && <ItineraryTab trip={trip} onRefresh={loadTrip} />}
            {activeTab === 'chat' && <ChatTab trip={trip} />}
            {activeTab === 'checklist' && <ChecklistTab trip={trip} />}
            {activeTab === 'expenses' && <ExpensesTab trip={trip} />}
            {activeTab === 'concierge' && <AiConcierge trip={trip} />}
          </div>
        </div>

        {/* Sidebar Column */}
        <div>
          <TravelToolsSidebar trip={trip} />
        </div>
      </div>
      
      {/* Footer */}
      <footer style={{ background: 'linear-gradient(180deg, #1e1e1e 0%, #2a2a2a 100%)', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '40px' }}>
        © 2028 AI Travel Hub
      </footer>
    </div>
  );
}

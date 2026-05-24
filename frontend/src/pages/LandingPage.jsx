import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import FloatingAiChat from '../components/FloatingAiChat';
import '../landing.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section" style={{ backgroundImage: "url('/images/hero_bg.png')" }}>
        <header className="hero-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1.5rem', fontWeight: 800 }}>
            <span>🌐</span> Voyage AI Travel
          </div>
          <nav className="hero-nav">
            <a href="#destinations">Destinations</a>
            <a href="#how-it-works">Bookings</a>
            <a href="#ai">AI Agent</a>
            <a href="#blog">Blog</a>
            <a href="#account" onClick={(e) => { e.preventDefault(); handleCTA(); }}>Account</a>
            <button className="btn btn-primary" onClick={handleCTA}>Plan a Trip</button>
          </nav>
        </header>

        <div className="hero-content">
          <h1 className="hero-title">
            Your Personal AI Travel Agentt.<br />
            Effortlessly Plan & Book Your Next Journey.
          </h1>

          <div className="search-bar-wrapper">
            <div className="search-bar-label">Where do you want to go?</div>
            <div className="search-inputs">
              <div className="search-input-group">
                <span>📍</span>
                <input type="text" placeholder="Kyoto, Japan" defaultValue="Kyoto, Japan" />
              </div>
              <div className="search-divider"></div>
              <div className="search-input-group">
                <span>📅</span>
                <select defaultValue="dates">
                  <option value="dates">Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>
              </div>
              <div className="search-divider"></div>
              <div className="search-input-group">
                <span>👤</span>
                <select defaultValue="all">
                  <option value="all">All Guests</option>
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                </select>
              </div>
              <button className="btn-discover" onClick={handleCTA}>Discover with AI</button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-wrapper" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            🗺️
          </div>
          <h3>AI-Powered Planning</h3>
          <p>Optimized itineraries tailored to your preferences, time, and budget.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrapper" style={{ background: '#dbeafe', color: '#2563eb' }}>
            💬
          </div>
          <h3>24/7 Assistance</h3>
          <p>Your on-the-go concierge for local tips, restaurants, and emergencies.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrapper" style={{ background: '#dcfce7', color: '#16a34a' }}>
            📋
          </div>
          <h3>Personalized Itineraries</h3>
          <p>Smart checklists and expense tracking seamlessly integrated.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrapper" style={{ background: '#ffedd5', color: '#ea580c' }}>
            🏷️
          </div>
          <h3>Smart Deals</h3>
          <p>Price drop alerts and travel deals found automatically.</p>
        </div>
      </section>

      {/* Content Section (Destinations & How It Works) */}
      <section className="content-section" id="destinations">
        <div>
          <div className="section-header">
            <h2>Recommended Destinations</h2>
            <a href="#all" className="view-all">View all</a>
          </div>
          <div className="destinations-grid">
            <div className="destination-card">
              <img src="/images/kyoto.png" alt="Kyoto" />
              <div className="overlay"><h4>Kyoto</h4></div>
            </div>
            <div className="destination-card">
              <img src="/images/italy.png" alt="Italy" />
              <div className="overlay"><h4>Italy</h4></div>
            </div>
            <div className="destination-card">
              <img src="/images/iceland.png" alt="Iceland" />
              <div className="overlay"><h4>Iceland</h4></div>
            </div>
            <div className="destination-card">
              <img src="/images/tokyo.png" alt="Tokyo" />
              <div className="overlay"><h4>Tokyo</h4></div>
            </div>
            <div className="destination-card">
              <img src="/images/paris.png" alt="Paris" />
              <div className="overlay"><h4>Paris</h4></div>
            </div>
          </div>
        </div>

        <div id="how-it-works">
          <div className="section-header">
            <h2>How It Works</h2>
          </div>
          <div className="how-it-works-list">
            <div className="how-it-works-item">
              <div className="step-number">1</div>
              <div className="step-text">Share your dream destination and travel style with our AI.</div>
            </div>
            <div className="how-it-works-item">
              <div className="step-number">2</div>
              <div className="step-text">Review your personalized, optimized itinerary in seconds.</div>
            </div>
            <div className="how-it-works-item">
              <div className="step-number">3</div>
              <div className="step-text">Invite friends, track expenses, and manage checklists together.</div>
            </div>
            <div className="how-it-works-item">
              <div className="step-number">4</div>
              <div className="step-text">Travel stress-free with 24/7 AI Concierge assistance.</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        © 2026 Voyage AI Travel | <a href="#privacy">Privacy Policy</a> | <a href="#terms">Terms of Service</a> | <a href="#contact">Contact</a>
      </footer>

      {/* Floating AI Chat */}
      <FloatingAiChat />
    </div>
  );
}

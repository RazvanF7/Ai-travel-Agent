import { useState, useRef } from 'react';
import { ai, readSSEStream } from '../services/api';

export default function AiItineraryGenerator({ trip, onGenerated }) {
  const [preferences, setPreferences] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const textRef = useRef('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStreamedText('');
    setError(null);
    textRef.current = '';

    try {
      const response = await ai.generateItinerary({
        destination: trip.destination,
        duration_days: trip.duration_days,
        budget: trip.budget ? parseFloat(trip.budget) : null,
        currency: trip.currency,
        preferences,
        trip_id: trip.id,
      });

      await readSSEStream(response, (data) => {
        if (data.type === 'token') {
          textRef.current += data.content;
          setStreamedText(textRef.current);
        } else if (data.type === 'complete') {
          setIsGenerating(false);
          setTimeout(() => onGenerated?.(), 1000);
        } else if (data.type === 'error') {
          setIsGenerating(false);
          setError(data.message);
          setStreamedText(prev => prev + `\n\n❌ Error: ${data.message}`);
        }
      });

      // Stream ended
      setIsGenerating(false);
    } catch (err) {
      setIsGenerating(false);
      setError(err.message);
      setStreamedText(prev => prev + `\n\n❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="glass-card-static">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>🗺️</span>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pathfinder AI</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
            Generate a full itinerary for {trip.destination}
          </p>
        </div>
      </div>

      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="ai-preferences">Preferences (optional)</label>
        <textarea
          id="ai-preferences"
          className="input"
          placeholder="e.g. focus on food tours, avoid crowded tourist spots, include local markets..."
          value={preferences}
          onChange={e => setPreferences(e.target.value)}
          rows={2}
        />
      </div>

      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <span className="animate-pulse">⏳</span>
            Generating...
          </>
        ) : (
          '🗺️ Generate Itinerary'
        )}
      </button>

      {/* Streaming Output */}
      {streamedText && (
        <div style={{
          marginTop: 16, padding: 20, background: 'var(--bg-glass)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
          maxHeight: 400, overflow: 'auto', fontFamily: 'monospace',
          fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap',
        }}>
          {streamedText}
          {isGenerating && <span className="animate-pulse" style={{ color: 'var(--accent-primary)' }}>▊</span>}
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function AiItineraryGenerator({ trip, onGenerated }) {
  const [preferences, setPreferences] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const textRef = useRef('');

  const wsUrl = `ws://localhost:8000/ws/ai/${trip.group}/`;

  const { send, status } = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data.type === 'ai.token') {
        textRef.current += data.content;
        setStreamedText(textRef.current);
      } else if (data.type === 'ai.complete') {
        setIsGenerating(false);
        setTimeout(() => onGenerated?.(), 1000);
      } else if (data.type === 'error') {
        setIsGenerating(false);
        setStreamedText(prev => prev + `\n\n Error: ${data.message}`);
      } else if (data.type === 'ai.status') {
        // Status update — show generating indicator
      }
    },
    enabled: true,
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setStreamedText('');
    textRef.current = '';

    send({
      action: 'generate_itinerary',
      destination: trip.destination,
      duration_days: trip.duration_days,
      budget: trip.budget ? parseFloat(trip.budget) : null,
      currency: trip.currency,
      preferences,
      trip_id: trip.id,
    });
  };

  return (
    <div className="glass-card-static">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}></span>
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
        disabled={isGenerating || status !== 'connected'}
      >
        {isGenerating ? (
          <>
            <span className="animate-pulse"></span>
            Generating...
          </>
        ) : status !== 'connected' ? (
          ' Connecting...'
        ) : (
          ' Generate Itinerary'
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

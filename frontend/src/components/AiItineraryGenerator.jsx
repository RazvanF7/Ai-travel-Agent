import { useState, useRef, useCallback } from 'react';
import { ai, readSSEStream } from '../services/api';

/**
 * Try to extract a JSON array of activities from the accumulated text so far.
 * Returns [] if the text doesn't contain a valid array yet.
 */
function tryParseActivities(text) {
  // Try fenced JSON block first
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch { /* fall through */ }
  }

  // Try to find a raw JSON array (even partial — look for the outermost [ ... ])
  const start = text.indexOf('[');
  if (start === -1) return [];

  // Walk from the end backwards looking for the last ]
  let end = text.lastIndexOf(']');
  if (end <= start) {
    // Array hasn't closed yet — try to "fix" partial JSON by adding ] and see if it parses
    const partial = text.slice(start) + ']';
    // Remove trailing comma before ]
    const cleaned = partial.replace(/,\s*\]$/, ']');
    try { return JSON.parse(cleaned); } catch { return []; }
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
}

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

export default function AiItineraryGenerator({ trip, onGenerated }) {
  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [liveActivities, setLiveActivities] = useState([]);
  const [generationDone, setGenerationDone] = useState(false);
  const [statusText, setStatusText] = useState('');
  const textRef = useRef('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setLiveActivities([]);
    setGenerationDone(false);
    setStatusText('Connecting to Pathfinder AI...');
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

      setStatusText('Generating your itinerary...');

      await readSSEStream(response, (data) => {
        if (data.type === 'token') {
          textRef.current += data.content;
          // Try to parse activities from the accumulated text
          const parsed = tryParseActivities(textRef.current);
          if (parsed.length > 0) {
            setLiveActivities(parsed);
            setStatusText(`Found ${parsed.length} activities so far...`);
          }
        } else if (data.type === 'complete') {
          // Use the server-parsed activities (authoritative) if available
          const finalActivities = data.activities && data.activities.length > 0
            ? data.activities
            : tryParseActivities(textRef.current);
          setLiveActivities(finalActivities);
          setIsGenerating(false);
          setGenerationDone(true);
          setStatusText(`✅ Generated ${finalActivities.length} activities!`);

          // Delay then notify parent to refresh trip data
          setTimeout(() => onGenerated?.(), 1500);
        } else if (data.type === 'error') {
          setIsGenerating(false);
          setError(data.message);
          setStatusText('');
        }
      });

      // Stream ended (in case 'complete' event wasn't fired)
      if (!generationDone) {
        const finalActivities = tryParseActivities(textRef.current);
        if (finalActivities.length > 0) {
          setLiveActivities(finalActivities);
          setGenerationDone(true);
          setStatusText(`✅ Generated ${finalActivities.length} activities!`);
          setTimeout(() => onGenerated?.(), 1500);
        }
      }
      setIsGenerating(false);
    } catch (err) {
      setIsGenerating(false);
      setError(err.message);
      setStatusText('');
    }
  };

  // Group live activities by day
  const dayGroups = {};
  liveActivities.forEach(act => {
    const day = act.day || 1;
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(act);
  });
  const days = Object.keys(dayGroups).sort((a, b) => a - b);

  return (
    <div className="glass-card-static">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>🗺️</span>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pathfinder AI</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
            Generate a full itinerary for {trip.destination}
          </p>
        </div>
      </div>

      {/* Preferences input */}
      {!isGenerating && !generationDone && (
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
      )}

      {/* Generate / Regenerate button */}
      {!generationDone && (
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{ width: '100%' }}
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
      )}

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: 12, padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.875rem',
        }}>
          ❌ {error}
        </div>
      )}

      {/* Status bar */}
      {statusText && (
        <div style={{
          marginTop: 12, padding: '10px 16px',
          background: generationDone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.08)',
          border: `1px solid ${generationDone ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.2)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem', fontWeight: 600,
          color: generationDone ? '#10b981' : 'var(--accent-primary-light)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {isGenerating && (
            <span style={{
              display: 'inline-block', width: 16, height: 16,
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {statusText}
        </div>
      )}

      {/* Live activity preview */}
      {days.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {days.map(day => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div className="ai-gen-day-header">
                <span>📅</span> Day {day}
                <span className="ai-gen-day-count">{dayGroups[day].length} activities</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayGroups[day]
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((act, idx) => (
                    <div
                      key={`${day}-${idx}`}
                      className="ai-gen-activity-card"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="ai-gen-activity-icon">
                        {getActivityIcon(act.title, idx)}
                      </div>
                      <div className="ai-gen-activity-body">
                        <div className="ai-gen-activity-title">{act.title}</div>
                        {act.location && (
                          <div className="ai-gen-activity-location">📍 {act.location}</div>
                        )}
                        {act.description && (
                          <div className="ai-gen-activity-desc">{act.description}</div>
                        )}
                      </div>
                      <div className="ai-gen-activity-time">
                        {act.start_time && <span>{act.start_time}</span>}
                        {act.duration_minutes && (
                          <span className="ai-gen-activity-duration">{act.duration_minutes}min</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* After generation is done — message that items are saved */}
      {generationDone && (
        <div style={{
          marginTop: 16, textAlign: 'center',
          fontSize: '0.8125rem', color: 'var(--text-tertiary)',
        }}>
          Activities have been saved to your itinerary. They will appear below shortly.
        </div>
      )}
    </div>
  );
}

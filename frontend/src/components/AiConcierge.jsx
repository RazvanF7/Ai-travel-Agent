import { useState, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function AiConcierge({ trip }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const streamRef = useRef('');

  const wsUrl = `ws://localhost:8000/ws/ai/${trip.group}/`;

  const { send, status } = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data.type === 'ai.token') {
        streamRef.current += data.content;
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].streaming) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: streamRef.current };
          }
          return updated;
        });
      } else if (data.type === 'ai.complete') {
        setIsThinking(false);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
          }
          return updated;
        });
      } else if (data.type === 'error') {
        setIsThinking(false);
        setMessages(prev => [...prev, { role: 'assistant', content: ` ${data.message}`, streaming: false }]);
      } else if (data.type === 'status') {
        setIsThinking(true);
      }
    },
    enabled: true,
  });

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const question = input.trim();
    setInput('');
    streamRef.current = '';

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', streaming: true },
    ]);

    send({ action: 'concierge', question, trip_id: trip.id });
  };

  return (
    <div className="glass-card-static" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 340px)', minHeight: 400 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem' }}></span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Travel Concierge</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
              Ask about local tips, restaurants, emergency contacts, and more
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="icon"></div>
            <h3>Ask me anything about your trip</h3>
            <p>I can help with local recommendations, directions, emergency info, and travel tips</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Best restaurants nearby?', 'Emergency contacts?', 'Local customs to know?'].map(q => (
                <button key={q} className="btn btn-secondary btn-sm" onClick={() => { setInput(q); }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: msg.role === 'user' ? '75%' : '90%',
          }}>
            <div style={{
              padding: '12px 16px',
              background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-glass-hover)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
            }}>
              {msg.content || (msg.streaming && <span className="animate-pulse">Thinking...</span>)}
              {msg.streaming && msg.content && <span className="animate-pulse" style={{ color: 'var(--accent-primary)' }}>▊</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Ask the AI Concierge..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isThinking}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || isThinking || status !== 'connected'}>
          {isThinking ? '' : 'Ask'}
        </button>
      </div>
    </div>
  );
}

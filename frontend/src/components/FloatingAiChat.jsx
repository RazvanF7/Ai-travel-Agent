import { useState, useRef, useEffect } from 'react';
import { ai, readSSEStream } from '../services/api';

export default function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your personal AI Travel Assistant. Where would you like to go today?', streaming: false }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const streamRef = useRef('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Open the chat by default to match mockup, but allow closing
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const question = input.trim();
    setInput('');
    streamRef.current = '';

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', streaming: true },
    ]);

    setIsThinking(true);

    try {
      const response = await ai.concierge({ question, trip_id: null });

      await readSSEStream(response, (data) => {
        if (data.type === 'token') {
          streamRef.current += data.content;
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].streaming) {
              updated[updated.length - 1] = { ...updated[updated.length - 1], content: streamRef.current };
            }
            return updated;
          });
        } else if (data.type === 'complete') {
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
          setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.message}`, streaming: false }]);
        }
      });

      // Stream ended
      setIsThinking(false);
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
        }
        return updated;
      });
    } catch (err) {
      setIsThinking(false);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${err.message}`, streaming: false }]);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 60, height: 60, borderRadius: '50%',
          background: '#2563eb', color: 'white', border: 'none',
          boxShadow: '0 10px 25px rgba(37,99,235,0.4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', transition: 'transform 0.3s'
        }}
      >
        <span>💬</span>
      </button>
    );
  }

  return (
    <div className="floating-chat-container">
      <div className="floating-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✈️</span> AI Travel Assistant
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ×
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === 'assistant' && i === 0 && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>M Reaven</div>
            )}
            <div className="message-bubble">
              {msg.content || (msg.streaming && <span style={{ opacity: 0.6 }}>Thinking...</span>)}
              {msg.streaming && msg.content && <span style={{ opacity: 0.6 }}>▊</span>}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', marginTop: 2 }}>
              {msg.role === 'user' ? 'You' : ''} Just now
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isThinking}
          />
          <button className="btn-send" onClick={handleSend} disabled={!input.trim() || isThinking}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

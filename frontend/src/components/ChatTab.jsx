import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { chat as chatApi } from '../services/api';

const POLL_INTERVAL = 3000; // 3 seconds

export default function ChatTab({ trip }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const pollRef = useRef(null);

  const groupId = trip.group;

  // Load initial message history
  useEffect(() => {
    chatApi.history(groupId)
      .then(data => {
        const msgs = Array.isArray(data) ? data : [];
        setMessages(msgs);
        if (msgs.length > 0) {
          lastTimestampRef.current = msgs[msgs.length - 1].created_at;
        }
      })
      .catch(() => {});
  }, [groupId]);

  // Poll for new messages
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (!lastTimestampRef.current) return;

      chatApi.poll(groupId, lastTimestampRef.current)
        .then(newMessages => {
          if (Array.isArray(newMessages) && newMessages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const unique = newMessages.filter(m => !existingIds.has(m.id));
              if (unique.length === 0) return prev;
              return [...prev, ...unique];
            });
            lastTimestampRef.current = newMessages[newMessages.length - 1].created_at;
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, [groupId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      const msg = await chatApi.send(groupId, content);
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      lastTimestampRef.current = msg.created_at;
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-card-static" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 340px)', minHeight: 400 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Group Chat</h3>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="online-dot" /> Connected
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}><div className="icon"></div><h3>No messages yet</h3><p>Start the conversation!</p></div>
        ) : messages.map((msg, i) => {
          const isMe = msg.sender?.id === user?.id || msg.sender_id === user?.id;
          const isSystem = msg.message_type === 'system' || msg.message_type === 'ai';
          if (isSystem) return <div key={msg.id || i} style={{ textAlign: 'center', padding: '8px 16px', fontSize: '0.8125rem', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', alignSelf: 'center' }}>{msg.content}</div>;
          return (
            <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2, paddingLeft: 12 }}>{msg.sender_name || msg.sender?.first_name || msg.sender?.username}</span>}
              <div style={{ padding: '10px 16px', background: isMe ? 'var(--accent-primary)' : 'var(--bg-glass-hover)', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', color: isMe ? 'white' : 'var(--text-primary)', fontSize: '0.9375rem', border: isMe ? 'none' : '1px solid var(--border-subtle)' }}>{msg.content}</div>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginTop: 2, padding: '0 12px' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />
        <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || sending}>Send</button>
      </div>
    </div>
  );
}

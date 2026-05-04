import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { chat as chatApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function ChatTab({ trip }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const lastTypingSent = useRef(0);

  const groupId = trip.group;
  const wsUrl = `ws://localhost:8000/ws/chat/${groupId}/`;

  const { send, status } = useWebSocket(wsUrl, {
    onMessage: useCallback((data) => {
      if (data.type === 'chat.message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'typing.indicator') {
        if (data.is_typing) {
          setTypingUsers(prev => ({ ...prev, [data.user_id]: data.username }));
          setTimeout(() => {
            setTypingUsers(prev => { const n = { ...prev }; delete n[data.user_id]; return n; });
          }, 3000);
        } else {
          setTypingUsers(prev => { const n = { ...prev }; delete n[data.user_id]; return n; });
        }
      } else if (data.type === 'member.joined') {
        setMessages(prev => [...prev, { id: Date.now(), sender_name: 'System', content: data.message, message_type: 'system', created_at: new Date().toISOString() }]);
      }
    }, []),
    enabled: true,
  });

  useEffect(() => {
    chatApi.history(groupId).then(data => setMessages(Array.isArray(data) ? data : [])).catch(() => {});
  }, [groupId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    send({ type: 'chat.message', message: input.trim() });
    setInput('');
    send({ type: 'typing.stop' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    const now = Date.now();
    if (now - lastTypingSent.current > 300) { send({ type: 'typing.start' }); lastTypingSent.current = now; }
  };

  const typingNames = Object.values(typingUsers);

  return (
    <div className="glass-card-static" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 340px)', minHeight: 400 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Group Chat</h3>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {status === 'connected' ? <><span className="online-dot" /> Connected</> : status === 'reconnecting' ? <><span className="animate-pulse"></span> Reconnecting...</> : <><span className="offline-dot" /> Disconnected</>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}><div className="icon"></div><h3>No messages yet</h3><p>Start the conversation!</p></div>
        ) : messages.map((msg, i) => {
          const isMe = msg.sender === user?.id || msg.sender_id === user?.id;
          const isSystem = msg.message_type === 'system' || msg.message_type === 'ai';
          if (isSystem) return <div key={msg.id || i} style={{ textAlign: 'center', padding: '8px 16px', fontSize: '0.8125rem', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', alignSelf: 'center' }}>{msg.content}</div>;
          return (
            <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2, paddingLeft: 12 }}>{msg.sender_name}</span>}
              <div style={{ padding: '10px 16px', background: isMe ? 'var(--accent-primary)' : 'var(--bg-glass-hover)', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', color: isMe ? 'white' : 'var(--text-primary)', fontSize: '0.9375rem', border: isMe ? 'none' : '1px solid var(--border-subtle)' }}>{msg.content}</div>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginTop: 2, padding: '0 12px' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {typingNames.length > 0 && <div className="typing-indicator"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /><span style={{ marginLeft: 4 }}>{typingNames.join(', ')} typing...</span></div>}

      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />
        <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || status !== 'connected'}>Send</button>
      </div>
    </div>
  );
}

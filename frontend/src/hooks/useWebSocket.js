import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * WebSocket hook with reconnection logic (US-007 AC-3).
 * Backoff: 1s, 2s, 4s
 */
export function useWebSocket(url, { onMessage, onOpen, onClose, enabled = true } = {}) {
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | reconnecting
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const backoffs = [1000, 2000, 4000];

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    setStatus('connecting');
    const token = localStorage.getItem('access_token');
    const wsUrl = token ? `${url}?token=${token}` : url;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      onClose?.();

      // Auto-reconnect with backoff (US-007 AC-3)
      if (retriesRef.current < maxRetries && enabled) {
        const delay = backoffs[retriesRef.current] || 4000;
        setStatus('reconnecting');
        retriesRef.current += 1;
        setTimeout(() => connect(), delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}

/**
 * useSSE — Server-Sent Events hook with auto-reconnect and exponential backoff.
 *
 * Features:
 *  - Auto-reconnects on connection drop with exponential backoff (1s → 2s → 4s → 8s → 30s max)
 *  - Exposes connection status: 'connecting' | 'connected' | 'disconnected'
 *  - Cleans up EventSource + timers on unmount
 *  - Supports dynamic URL changes (rebuilds connection)
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export type SSEStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEOptions {
  /** Called with each parsed JSON event from the stream */
  onEvent: (event: { type: string; payload: unknown; timestamp: string }) => void;
  /** Whether to actively connect (set false to pause) */
  enabled?: boolean;
}

export function useSSE(url: string | null, options: UseSSEOptions): SSEStatus {
  const { onEvent, enabled = true } = options;
  const [status, setStatus] = useState<SSEStatus>('disconnected');

  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref stable so reconnect closure doesn't need re-creation
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    // Clean up any existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setStatus('connecting');

    const token = localStorage.getItem('xia_auth_token');
    const fullUrl = token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;

    const es = new EventSource(fullUrl);
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        // Ignore heartbeat (server sends `: heartbeat` which EventSource filters)
        if (parsed?.type === 'connected') {
          setStatus('connected');
          retryCountRef.current = 0; // Reset backoff on successful connect
          return;
        }
        onEventRef.current(parsed);
      } catch {
        // Ignore malformed messages
      }
    };

    es.onopen = () => {
      setStatus('connected');
      retryCountRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setStatus('disconnected');

      if (!enabled) return;

      // Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (cap)
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000);
      retryCountRef.current += 1;

      console.warn(`[SSE] Connection lost. Reconnecting in ${delay / 1000}s... (attempt ${retryCountRef.current})`);
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [url, enabled]);

  useEffect(() => {
    if (!url || !enabled) {
      esRef.current?.close();
      setStatus('disconnected');
      return;
    }

    connect();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, url, enabled]);

  return status;
}

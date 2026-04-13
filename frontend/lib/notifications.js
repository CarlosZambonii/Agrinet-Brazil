'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

export function useNotifications() {
  const [unread, setUnread]       = useState(0);
  const [notifs, setNotifs]       = useState([]);
  const socketRef                 = useRef(null);
  const pollRef                   = useRef(null);

  const fetchUnread = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await api('/notifications?limit=1&unread=true');
      setUnread(data.unread_count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!getToken()) return;

    // Initial fetch
    fetchUnread();

    // Try WebSocket first
    trySocket();

    // Polling fallback every 30s
    pollRef.current = setInterval(fetchUnread, 30000);

    return () => {
      clearInterval(pollRef.current);
      socketRef.current?.disconnect?.();
    };
  }, [fetchUnread]);

  function trySocket() {
    try {
      import('socket.io-client').then(({ io }) => {
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');
        if (!base) return;
        const socket = io(base, {
          auth: { token: getToken() },
          transports: ['websocket'],
          reconnectionAttempts: 3,
        });
        socketRef.current = socket;

        socket.on('notification', (n) => {
          setNotifs(prev => [n, ...prev].slice(0, 50));
          setUnread(prev => prev + 1);
        });

        socket.on('notifications_read', () => {
          setUnread(0);
        });
      }).catch(() => {});
    } catch {}
  }

  const markRead = useCallback(async () => {
    if (!unread) return;
    try {
      await api('/notifications/read-all', 'POST');
      setUnread(0);
      socketRef.current?.emit?.('mark_notifications_read');
    } catch {}
  }, [unread]);

  return { unread, notifs, markRead };
}

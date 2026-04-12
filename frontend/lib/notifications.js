'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

export function useNotifications() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    const poll = async () => {
      try {
        const data = await api('/notifications?limit=1&unread=true');
        setUnread(data.unread_count || 0);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  return { unread };
}

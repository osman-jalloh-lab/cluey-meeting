import { useState, useEffect, useCallback } from 'react';

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
}

export function useGmail(isAuthenticated: boolean) {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/gmail-messages', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to fetch messages');
      }
    } catch (err) {
      setError('Network error');
      console.error('[useGmail] error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
    }
  }, [isAuthenticated, fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages };
}

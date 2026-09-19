import { useState, useEffect, useCallback, useRef } from 'react';
import { Notice, Department } from '../types';
import { fetchNotices, fetchDepartments } from '../lib/api';

export function useRealtimeNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [latestLiveEvent, setLatestLiveEvent] = useState<{ type: string; title?: string; time: string } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [noticeList, deptList] = await Promise.all([
        fetchNotices({ includeArchived: true }),
        fetchDepartments(),
      ]);
      setNotices(noticeList);
      setDepartments(deptList);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Setup Server-Sent Events listener
    const connectSSE = () => {
      setConnectionStatus('connecting');
      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
      };

      es.onerror = () => {
        setConnectionStatus('disconnected');
        es.close();
        // Reconnect after 3 seconds
        setTimeout(connectSSE, 3000);
      };

      es.addEventListener('notice_created', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const newNotice: Notice = payload.payload;
          setNotices((prev) => [newNotice, ...prev.filter((n) => n.id !== newNotice.id)]);
          setLatestLiveEvent({
            type: 'New Announcement Published',
            title: newNotice.title,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        } catch (err) {
          console.error('Failed to parse SSE notice_created:', err);
        }
      });

      es.addEventListener('notice_updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const updatedNotice: Notice = payload.payload;
          setNotices((prev) =>
            prev.map((n) => (n.id === updatedNotice.id ? updatedNotice : n))
          );
          setLatestLiveEvent({
            type: 'Circular Updated',
            title: updatedNotice.title,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        } catch (err) {
          console.error('Failed to parse SSE notice_updated:', err);
        }
      });

      es.addEventListener('notice_pinned', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { id, isPinned } = payload.payload;
          setNotices((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isPinned } : n))
          );
        } catch (err) {
          console.error('Failed to parse SSE notice_pinned:', err);
        }
      });

      es.addEventListener('notice_archived', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { id } = payload.payload;
          setNotices((prev) =>
            prev.map((n) => (n.id === id ? { ...n, status: 'archived' } : n))
          );
        } catch (err) {
          console.error('Failed to parse SSE notice_archived:', err);
        }
      });

      es.addEventListener('notice_deleted', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { id } = payload.payload;
          setNotices((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
          console.error('Failed to parse SSE notice_deleted:', err);
        }
      });

      es.addEventListener('notice_expired_batch', () => {
        // Refresh when auto-expiration triggers
        loadData();
      });
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [loadData]);

  return {
    notices,
    departments,
    isLoading,
    connectionStatus,
    latestLiveEvent,
    refreshNotices: loadData,
  };
}

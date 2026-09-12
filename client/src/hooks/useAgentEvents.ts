import { useState, useEffect } from 'react';
import { AgentEvent } from '../types';
import { onAgentEvent } from '../services/socket';

export function useAgentEvents(scanId?: string) {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  useEffect(() => {
    const off = onAgentEvent((event) => {
      if (!scanId || event.scanId === scanId) {
        setEvents((prev) => [event, ...prev].slice(0, 100));
      }
    });
    return off;
  }, [scanId]);

  const clear = () => setEvents([]);

  return { events, clear };
}

import { io, Socket } from 'socket.io-client';
import { AgentEvent } from '../types';

let socket: Socket | null = null;

const agentListeners = new Set<(event: AgentEvent) => void>();

function dispatchAgentEvent(event: AgentEvent): void {
  agentListeners.forEach((listener) => {
    listener(event);
  });
}

export function connectSocket(token: string): Socket {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const serverUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[PRIVEX] Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[PRIVEX] Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[PRIVEX] Socket error:', err.message);
  });

  socket.on('agent:event', dispatchAgentEvent);

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  agentListeners.clear();
}

export function onAgentEvent(
  cb: (event: AgentEvent) => void
): () => void {
  // Register the listener even if the socket hasn't initialized yet.
  // When the socket connects, dispatchAgentEvent will deliver events.
  agentListeners.add(cb);

  return () => {
    agentListeners.delete(cb);
  };
}

export function getSocket(): Socket | null {
  return socket;
}
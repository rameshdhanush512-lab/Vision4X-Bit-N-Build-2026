import { io, Socket } from 'socket.io-client';
import { AgentEvent } from '../types';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('[PRIVEX] Socket connected'));
  socket.on('disconnect', () => console.log('[PRIVEX] Socket disconnected'));
  socket.on('connect_error', (err) => console.warn('[PRIVEX] Socket error:', err.message));

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function onAgentEvent(cb: (event: AgentEvent) => void): () => void {
  if (!socket) return () => {};
  socket.on('agent:event', cb);
  return () => socket?.off('agent:event', cb);
}

export function getSocket(): Socket | null {
  return socket;
}

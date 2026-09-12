import { Server as SocketServer } from 'socket.io';
import { AgentEvent } from '../types';

let _io: SocketServer | null = null;

export function initSocketEmitter(io: SocketServer): void {
  _io = io;
}

export function emitAgentEvent(event: AgentEvent): void {
  if (_io) {
    _io.emit('agent:event', event);
  }
}

export function emitToUser(userId: string, eventName: string, data: unknown): void {
  if (_io) {
    _io.to(`user:${userId}`).emit(eventName, data);
  }
}

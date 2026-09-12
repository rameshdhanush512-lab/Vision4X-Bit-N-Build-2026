import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { connectDB, disconnectDB } from './utils/prisma';
import { initSocketEmitter } from './utils/socketEmitter';
import { logger } from './utils/logger';
import { verifyToken } from './utils/jwt';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function bootstrap(): Promise<void> {
  // 1. Connect database
  await connectDB();

  // 2. Create HTTP server from Express app
  const server = http.createServer(app);

  // 3. Attach Socket.IO
  const io = new SocketServer(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    logger.info('Socket connected', { userId, socketId: socket.id });

    // Join a personal room for targeted events
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  // 4. Make Socket.IO available to agents
  initSocketEmitter(io);

  // 5. Start listening
  server.listen(PORT, () => {
    logger.info(`PRIVEX server running on port ${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
  });

  // 6. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});

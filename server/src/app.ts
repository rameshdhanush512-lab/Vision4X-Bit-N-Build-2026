import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import privacyRoutes from './routes/privacy';
import agentRoutes from './routes/agents';
import dashboardRoutes from './routes/dashboard';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ── Security headers
app.use(helmet());

// ── CORS — only allow the React dev server
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// ── Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check (no auth needed)
app.get('/health', async (_req, res) => {
  const { checkOllamaHealth } = await import('./services/ollamaService');
  const ollama = await checkOllamaHealth();
  res.json({
    status: 'ok',
    service: 'privex-server',
    ts: new Date().toISOString(),
    ollama,
  });
});

// ── API Routes
app.use('/api/auth', authRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── 404 + global error handler (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;

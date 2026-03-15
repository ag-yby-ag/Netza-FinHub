import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { runMigrations } from './db/migrations';
import { runSeed } from './db/seed';

// Routes
import authRoutes from './routes/auth';
import suppliersRoutes from './routes/suppliers';
import quotesRoutes from './routes/quotes';
import uploadsRoutes from './routes/uploads';
import notificationsRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import dashboardRoutes from './routes/dashboard';
import analyticsRoutes from './routes/analytics';
import aiRoutes from './routes/ai';
import reportsRoutes from './routes/reports';
import settingsRoutes from './routes/settings';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.VERCEL
  ? true // allow all origins on Vercel (same-domain requests)
  : ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean);
app.use(cors({ origin: allowedOrigins as cors.CorsOptions['origin'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for exports
app.use('/data/exports', express.static(path.join(__dirname, '../data/exports')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/preferences', settingsRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Error handler
app.use((err: Error & { code?: string }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'Arquivo muito grande. Máximo 10MB.' });
  }
  return res.status(500).json({ success: false, error: err.message || 'Erro interno do servidor' });
});

// Initialize DB
runMigrations();
runSeed();

// Only listen in non-serverless environments
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`🚀 Netza FinHub server running on http://localhost:${PORT}`);
  });
}

export default app;

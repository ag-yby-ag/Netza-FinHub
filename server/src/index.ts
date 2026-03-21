import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './database/migrations';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import suppliersRouter from './routes/suppliers';
import dashboardRouter from './routes/dashboard';
import uploadsRouter from './routes/uploads';
import aiRouter from './routes/ai';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import preferencesRouter from './routes/preferences';
import settingsRouter from './routes/settings';
import reportsRouter from './routes/reports';
import remoteControlRouter from './routes/remoteControl';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Run database migrations
runMigrations();

// Routes
app.use('/api/suppliers', suppliersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/remote-control', remoteControlRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Netza FinHub server running on http://localhost:${PORT}`);
});

export default app;

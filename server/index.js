import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { startScheduler, subscribeToSystemEvents } from './engines/schedulerEngine.js';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import medicationRoutes from './routes/medications.js';
import memoryRoutes from './routes/memories.js';
import caregiverRoutes from './routes/caregivers.js';
import echoRoutes from './routes/echo.js';
import notificationRoutes from './routes/notifications.js';
import observationRoutes from './routes/observations.js';
import handoverRoutes from './routes/handovers.js';
import timelineRoutes from './routes/timeline.js';
import auditRoutes from './routes/audit.js';
import databaseRoutes from './routes/database.js';
import emergencyRoutes from './routes/emergency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Initialize Database & Background Scheduler
initDatabase();
startScheduler();

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/echo', echoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/db', databaseRoutes);
app.use('/api', emergencyRoutes);

// Real-Time System Event Bus via Server-Sent Events (SSE)
app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'EchoCare Event Stream connected' })}\n\n`);

  const unsubscribe = subscribeToSystemEvents(res);
  req.on('close', () => unsubscribe());
});

// Root Landing endpoint to prevent "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'EchoCare Backend API Server',
    message: 'Welcome to EchoCare API. Access the frontend application at http://localhost:5173',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'EchoCare Orchestrator & Action Engine',
    timestamp: new Date().toISOString(),
  });
});

// Start Server
const server = app.listen(config.port, () => {
  console.log(`🚀 EchoCare Server running on http://localhost:${config.port}`);
});

export { app, server };

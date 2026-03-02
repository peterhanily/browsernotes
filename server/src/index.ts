import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';

import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import investigationRoutes from './routes/investigations.js';
import feedRoutes from './routes/feed.js';
import llmRoutes from './routes/llm.js';
import fileRoutes from './routes/files.js';
import auditRoutes from './routes/audit.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import { handleWSConnection, handleWSMessage, handleWSClose } from './ws/handler.js';

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Global middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));
app.use('*', logger());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/sync', syncRoutes);
app.route('/api/investigations', investigationRoutes);
app.route('/api/feed', feedRoutes);
app.route('/api/llm', llmRoutes);
app.route('/api/files', fileRoutes);
app.route('/api/audit', auditRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/users', userRoutes);

// WebSocket endpoint
app.get('/ws', upgradeWebSocket((c) => {
  const token = c.req.query('token') || '';
  return {
    onOpen: (_event, ws) => {
      handleWSConnection(ws, token);
    },
    onMessage: (event, ws) => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      handleWSMessage(ws, data);
    },
    onClose: (_event, ws) => {
      handleWSClose(ws);
    },
  };
}));

const port = parseInt(process.env.PORT || '3001', 10);

const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`ThreatCaddy server running on http://localhost:${info.port}`);
});

injectWebSocket(server);

export default app;

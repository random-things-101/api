/**
 * Route aggregator - exports all route modules
 */
import { Hono } from 'hono';
import { errorHandler } from '../middleware/error.js';
import { authMiddleware } from '../middleware/auth.js';
import playersRouter from './players.js';
import grantsRouter from './grants.js';
import ranksRouter from './ranks.js';
import punishmentsRouter from './punishments.js';

const api = new Hono();

// Apply error handling to all routes
api.use('*', errorHandler);

// Health check endpoint (no auth required)
api.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route modules
api.route('/players', playersRouter);
api.route('/grants', grantsRouter);
api.route('/ranks', ranksRouter);
api.route('/punishments', punishmentsRouter);

export default api;

/**
 * Core API - Main entry point
 * REST API for Minecraft Core plugin
 */
import { serve } from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from 'dotenv';
import { testConnection, closePool } from './db/connection.js';
import { playerService } from './services/player.service.js';
import { grantService } from './services/grant.service.js';
import { rankService } from './services/rank.service.js';
import { punishmentService } from './services/punishment.service.js';
import { wsManager } from './ws/server.js';
import api from './routes/index.js';

// Load environment variables
config();

const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

// Create main app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  credentials: true,
}));

// Mount API routes
app.route('/api', api);

// WebSocket info endpoint
app.get('/ws', (c) => {
  return c.json({
    websocket: {
      url: `ws://${host}:${port}/ws`,
      path: '/ws',
      authentication: 'api_key query parameter',
      parameters: {
        api_key: 'Your API key (required)',
        type: 'Server type (required): bungee or paper',
        name: 'Server name (optional identifier)'
      },
      types: {
        proxy: 'BungeeCord proxy (type=bungee)',
        server: 'Paper game server (type=paper)'
      },
      examples: [
        `ws://${host}:${port}/ws?api_key=YOUR_KEY&type=bungee&name=main-proxy`,
        `ws://${host}:${port}/ws?api_key=YOUR_KEY&type=paper&name=survival`
      ],
      connectedServers: wsManager.getConnectedServers(),
      counts: {
        total: wsManager.getConnectionCount(),
        servers: wsManager.getServerCount(),
        proxies: wsManager.getProxyCount()
      }
    }
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Core API',
    version: '1.0.0',
    description: 'REST API for Minecraft Core plugin (BungeeCord + Paper)',
    features: {
      rest: 'REST API',
      websocket: 'WebSocket for real-time updates',
      database: 'SQLite'
    },
    supportedServers: {
      proxy: 'BungeeCord',
      servers: 'Paper'
    },
    endpoints: {
      api: '/api',
      websocket: '/ws',
      players: '/api/players',
      grants: '/api/grants',
      ranks: '/api/ranks',
      punishments: '/api/punishments',
      health: '/api/health',
      websocketInfo: '/ws'
    },
    connections: {
      http: `http://${host}:${port}`,
      websocket: `ws://${host}:${port}/ws`,
      connectedServers: wsManager.getConnectionCount(),
      servers: wsManager.getServerCount(),
      proxies: wsManager.getProxyCount()
    }
  });
});

// Start server
async function start() {
  console.log('🚀 Starting Core API...');

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Create tables if they don't exist
  console.log('📋 Ensuring database tables exist...');
  await playerService.createTable();
  await grantService.createTable();
  await rankService.createTable();
  await punishmentService.createTable();
  console.log('✅ Database tables ready');

  // Start HTTP server with WebSocket support
  const server = serve({
    fetch: app.fetch,
    hostname: host,
    port: port,
  });

  // Attach WebSocket server to HTTP server
  wsManager.attach(server);

  console.log(`✨ Core API is running at http://${host}:${port}`);
  console.log(`🔌 WebSocket server at ws://${host}:${port}/ws`);
  console.log(`📚 API documentation: http://${host}:${port}/`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.stop();
    await closePool();
    console.log('👋 Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('❌ Fatal error starting server:', error);
  process.exit(1);
});

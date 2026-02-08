/**
 * WebSocket Server for real-time cross-server communication
 */

import { WebSocketServer, WebSocket } from 'ws';
import { config } from 'dotenv';
import type { Server } from 'http';

// Load environment
config();

const API_KEY = process.env.API_KEY || '';
const WS_PORT = parseInt(process.env.WS_PORT || '3001');

interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  serverType?: 'proxy' | 'server';  // proxy = Bungee, server = Bukkit/Paper
  serverName?: string;
  authenticated: boolean;
}

export class WebSocketManager {
  private wss?: WebSocketServer;
  private clients: Set<AuthenticatedWebSocket> = new Set();

  /**
   * Attach WebSocket server to HTTP server
   */
  attach(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      const client = ws as AuthenticatedWebSocket;
      client.isAlive = true;
      client.authenticated = false;

      // Extract authentication from URL query params
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const apiKey = url.searchParams.get('api_key');

      if (apiKey !== API_KEY) {
        console.warn('⚠️  WebSocket connection rejected: Invalid API key');
        client.send(JSON.stringify({ type: 'ERROR', message: 'Authentication failed' }));
        client.close(1008, 'Authentication failed');
        return;
      }

      // Extract server type - must be explicitly provided
      const typeParam = url.searchParams.get('type');
      if (!typeParam) {
        console.warn('⚠️  WebSocket connection rejected: Missing type parameter');
        client.send(JSON.stringify({ type: 'ERROR', message: 'Missing type parameter' }));
        client.close(1008, 'Missing type parameter');
        return;
      }

      // Only accept bungee (proxy) and paper (server)
      if (typeParam === 'bungee') {
        client.serverType = 'proxy';
      } else if (typeParam === 'paper') {
        client.serverType = 'server';
      } else {
        console.warn('⚠️  WebSocket connection rejected: Invalid type parameter');
        client.send(JSON.stringify({ type: 'ERROR', message: 'Invalid type parameter. Use: bungee or paper' }));
        client.close(1008, 'Invalid type parameter');
        return;
      }

      client.authenticated = true;
      client.serverName = url.searchParams.get('name') || 'unknown';

      console.log(`✅ WebSocket connected: ${client.serverType}/${client.serverName}`);

      // Add to clients set
      this.clients.add(client);

      // Send welcome message
      client.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to Core API WebSocket',
        serverType: client.serverType,
        serverName: client.serverName
      }));

      // Handle ping/pong for keepalive
      client.on('pong', () => {
        client.isAlive = true;
      });

      // Handle incoming messages
      client.on('message', (data: Buffer) => {
        this.handleMessage(client, data);
      });

      // Handle close
      client.on('close', () => {
        console.log(`❌ WebSocket disconnected: ${client.serverType}/${client.serverName}`);
        this.clients.delete(client);
      });

      // Handle error
      client.on('error', (error) => {
        console.error(`❌ WebSocket error for ${client.serverType}/${client.serverName}:`, error);
        this.clients.delete(client);
      });
    });

    // Keepalive check every 30 seconds
    const interval = setInterval(() => {
      this.clients.forEach((client) => {
        if (client.isAlive === false) {
          console.log(`⚠️  Terminating inactive WebSocket: ${client.serverType}/${client.serverName}`);
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log(`🔌 WebSocket server listening on /ws`);
  }

  /**
   * Handle incoming message from a server
   */
  private handleMessage(client: AuthenticatedWebSocket, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());

      console.log(`📨 Received ${message.type} from ${client.serverType}/${client.serverName}`);

      // Broadcast the message to all other clients
      this.broadcast(message, client);
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Broadcast message to all connected servers (except sender)
   */
  broadcast(message: any, excludeClient?: AuthenticatedWebSocket) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Send message to all game servers (Bukkit/Paper), excluding proxy
   */
  sendToServers(message: any) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.serverType === 'server' && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Send message to proxy only (Bungee)
   */
  sendToProxy(message: any) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.serverType === 'proxy' && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Send message to a specific server type
   */
  sendToType(type: 'proxy' | 'server', message: any) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.serverType === type && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Notify all game servers about a grant change
   * (Only servers need to update player permissions)
   */
  notifyGrantChange(playerUuid: string) {
    this.sendToServers({
      type: 'GRANT_CHANGE',
      playerUuid: playerUuid,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify all game servers and proxy about a rank change
   * (Servers need to refresh rank cache, proxy needs to know)
   */
  notifyRankChange(rankId: string) {
    this.broadcast({
      type: 'RANK_CHANGE',
      rankId: rankId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify all game servers about a player update
   * (Only servers have the actual players)
   */
  notifyPlayerUpdate(playerUuid: string) {
    this.sendToServers({
      type: 'PLAYER_UPDATE',
      playerUuid: playerUuid,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify proxy to execute a punishment (kick player)
   * (Only proxy can kick players)
   */
  notifyPunishmentExecute(playerUuid: string, punishmentType: string, reason: string | null) {
    this.sendToProxy({
      type: 'PUNISH_EXECUTE',
      playerUuid: playerUuid,
      punishmentType: punishmentType,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send private message to specific player
   * (Sends to all servers, target server will handle it)
   */
  sendPrivateMessage(targetPlayer: string, senderName: string, message: string) {
    this.sendToServers({
      type: 'PRIVATE_MESSAGE',
      targetPlayer: targetPlayer,
      senderName: senderName,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected servers info
   */
  getConnectedServers() {
    return Array.from(this.clients).map(client => ({
      type: client.serverType,
      name: client.serverName,
      alive: client.isAlive
    }));
  }

  /**
   * Get number of connected clients
   */
  getConnectionCount() {
    return this.clients.size;
  }

  /**
   * Get count of connected game servers
   */
  getServerCount() {
    return Array.from(this.clients).filter(c => c.serverType === 'server').length;
  }

  /**
   * Get count of connected proxies
   */
  getProxyCount() {
    return Array.from(this.clients).filter(c => c.serverType === 'proxy').length;
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();

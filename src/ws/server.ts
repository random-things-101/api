/**
 * WebSocket Server for real-time cross-server communication
 * Using Bun's native WebSocket support
 */

const API_KEY = process.env.API_KEY || '';

interface AuthenticatedWebSocket {
  socket: WebSocket;
  isAlive: boolean;
  serverType?: 'proxy' | 'server';  // proxy = Bungee, server = Bukkit/Paper
  serverName?: string;
  authenticated: boolean;
}

export class WebSocketManager {
  private clients: Set<AuthenticatedWebSocket> = new Set();

  /**
   * Attach WebSocket server to HTTP server
   */
  attach(server: any) {
    // Bun's server handles WebSocket upgrades through the fetch handler
    console.log(`🔌 WebSocket server configured for /ws`);
  }

  /**
   * Handle WebSocket connection
   */
  handleConnection(ws: WebSocket, req: Request) {
    const url = new URL(req.url);
    const typeParam = url.searchParams.get('type');
    const nameParam = url.searchParams.get('name');

    const client: AuthenticatedWebSocket = {
      socket: ws,
      isAlive: true,
      authenticated: true,
      serverType: typeParam === 'bungee' ? 'proxy' : 'server',
      serverName: nameParam || 'unknown'
    };

    console.log(`✅ WebSocket connected: ${client.serverType}/${client.serverName}`);

    // Add to clients set
    this.clients.add(client);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      message: 'Connected to Core API WebSocket',
      serverType: client.serverType,
      serverName: client.serverName
    }));

    // Handle messages
    ws.addEventListener('message', (event) => {
      this.handleMessage(client, event.data);
    });

    // Handle close
    ws.addEventListener('close', () => {
      console.log(`❌ WebSocket disconnected: ${client.serverType}/${client.serverName}`);
      this.clients.delete(client);
    });

    // Handle error
    ws.addEventListener('error', (error) => {
      console.error(`❌ WebSocket error for ${client.serverType}/${client.serverName}:`, error);
      this.clients.delete(client);
    });

    // Setup ping interval for this client
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  /**
   * Handle incoming message from a server
   */
  private handleMessage(client: AuthenticatedWebSocket, data: BufferSource) {
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
      if (client !== excludeClient && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    });
  }

  /**
   * Send message to all game servers (Bukkit/Paper), excluding proxy
   */
  sendToServers(message: any) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.serverType === 'server' && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    });
  }

  /**
   * Send message to proxy only (Bungee)
   */
  sendToProxy(message: any) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.serverType === 'proxy' && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    });
  }

  /**
   * Send message to a specific server type
   */
  sendToType(type: 'proxy' | 'server', message: any) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.serverType === type && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
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
      alive: client.socket.readyState === WebSocket.OPEN
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

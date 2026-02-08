/**
 * Player service - handles all player-related database operations
 */
import { query, execute } from '../db/connection.js';
import { PlayerRow, playerRowToApi, playerApiToRow } from '../types/index.js';
import { notFound } from '../middleware/error.js';
import type { Player, CreatePlayerDto } from '../types/index.js';
import { wsManager } from '../ws/server.js';

export class PlayerService {
  /**
   * Find player by UUID
   */
  async findByUuid(uuid: string): Promise<Player | null> {
    const rows = await query<PlayerRow>(
      'SELECT * FROM players WHERE uuid = ?',
      [uuid]
    );
    if (rows.length === 0) return null;
    return playerRowToApi(rows[0]);
  }

  /**
   * Find player by username
   */
  async findByUsername(username: string): Promise<Player | null> {
    const rows = await query<PlayerRow>(
      'SELECT * FROM players WHERE username = ?',
      [username]
    );
    if (rows.length === 0) return null;
    return playerRowToApi(rows[0]);
  }

  /**
   * Get all online players
   */
  async findOnlinePlayers(): Promise<Player[]> {
    const rows = await query<PlayerRow>(
      'SELECT * FROM players WHERE is_online = 1'
    );
    return rows.map(row => playerRowToApi(row));
  }

  /**
   * Get top players by playtime
   */
  async findTopByPlaytime(limit: number): Promise<Player[]> {
    const rows = await query<PlayerRow>(
      'SELECT * FROM players ORDER BY playtime_ticks DESC LIMIT ?',
      [Math.min(Math.max(limit, 1), 100)] // Clamp between 1-100
    );
    return rows.map(row => playerRowToApi(row));
  }

  /**
   * Save (create or update) player
   */
  async save(dto: CreatePlayerDto): Promise<void> {
    const row = playerApiToRow(dto);
    await execute(
      `INSERT INTO players (uuid, username, playtime_ticks, first_login, last_login, is_online, additional_permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
       username = excluded.username,
       playtime_ticks = excluded.playtime_ticks,
       first_login = COALESCE(excluded.first_login, first_login),
       last_login = excluded.last_login,
       is_online = excluded.is_online,
       additional_permissions = excluded.additional_permissions`,
      [
        row.uuid,
        row.username,
        row.playtime_ticks ?? 0,
        row.firstLogin,
        row.lastLogin,
        row.isOnline ?? 0,
        row.additionalPermissions,
      ]
    );

    // Notify all servers of player update
    wsManager.notifyPlayerUpdate(row.uuid);
  }

  /**
   * Update player online status
   */
  async updateOnlineStatus(uuid: string, isOnline: boolean): Promise<void> {
    const result = await execute(
      'UPDATE players SET is_online = ? WHERE uuid = ?',
      [isOnline ? 1 : 0, uuid]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Player not found: ${uuid}`);
    }

    // Notify all servers of player update
    wsManager.notifyPlayerUpdate(uuid);
  }

  /**
   * Update player last login timestamp
   */
  async updateLastLogin(uuid: string): Promise<void> {
    const result = await execute(
      'UPDATE players SET last_login = datetime("now") WHERE uuid = ?',
      [uuid]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Player not found: ${uuid}`);
    }
  }

  /**
   * Set first login if not already set
   */
  async setFirstLoginIfNotSet(uuid: string): Promise<void> {
    await execute(
      'UPDATE players SET first_login = datetime("now") WHERE uuid = ? AND first_login IS NULL',
      [uuid]
    );
  }

  /**
   * Increment player playtime
   */
  async incrementPlaytime(uuid: string, ticks: number): Promise<void> {
    const result = await execute(
      'UPDATE players SET playtime_ticks = playtime_ticks + ? WHERE uuid = ?',
      [ticks, uuid]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Player not found: ${uuid}`);
    }
  }

  /**
   * Delete player by UUID
   */
  async deleteByUuid(uuid: string): Promise<void> {
    const result = await execute(
      'DELETE FROM players WHERE uuid = ?',
      [uuid]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Player not found: ${uuid}`);
    }
  }

  /**
   * Create players table if not exists
   */
  async createTable(): Promise<void> {
    await execute(`
      CREATE TABLE IF NOT EXISTS players (
        uuid TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        playtime_ticks INTEGER DEFAULT 0,
        first_login TEXT,
        last_login TEXT,
        is_online INTEGER DEFAULT 0,
        additional_permissions TEXT
      )
    `);

    // Create index for username lookups
    await execute(`CREATE INDEX IF NOT EXISTS idx_players_username ON players(username)`);
  }
}

// Export singleton instance
export const playerService = new PlayerService();

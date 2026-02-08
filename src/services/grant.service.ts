/**
 * Grant service - handles all grant-related database operations
 */
import { query, execute } from '../db/connection.js';
import { GrantRow, grantRowToApi, Grant } from '../types/index.js';
import { notFound } from '../middleware/error.js';
import { wsManager } from '../ws/server.js';

export class GrantService {
  /**
   * Find grant by ID
   */
  async findById(id: number): Promise<Grant | null> {
    const rows = await query<GrantRow>(
      'SELECT * FROM grants WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return grantRowToApi(rows[0]);
  }

  /**
   * Find all grants for a player (ordered by granted_at DESC)
   */
  async findByPlayer(playerUuid: string): Promise<Grant[]> {
    const rows = await query<GrantRow>(
      'SELECT * FROM grants WHERE player_uuid = ? ORDER BY granted_at DESC',
      [playerUuid]
    );
    return rows.map(row => grantRowToApi(row));
  }

  /**
   * Find active grants for a player
   */
  async findActiveByPlayer(playerUuid: string): Promise<Grant[]> {
    const rows = await query<GrantRow>(
      `SELECT * FROM grants
       WHERE player_uuid = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY granted_at DESC`,
      [playerUuid]
    );
    return rows.map(row => grantRowToApi(row));
  }

  /**
   * Find active grants for a player (including expired ones that are still active)
   */
  async findActiveByPlayerIncludingExpired(playerUuid: string): Promise<Grant[]> {
    const rows = await query<GrantRow>(
      `SELECT * FROM grants
       WHERE player_uuid = ? AND is_active = 1
       ORDER BY granted_at DESC`,
      [playerUuid]
    );
    return rows.map(row => grantRowToApi(row));
  }

  /**
   * Find all grants for a specific rank
   */
  async findByRank(rankId: string): Promise<Grant[]> {
    const rows = await query<GrantRow>(
      'SELECT * FROM grants WHERE rank_id = ? ORDER BY granted_at DESC',
      [rankId]
    );
    return rows.map(row => grantRowToApi(row));
  }

  /**
   * Save (create) a new grant
   */
  async save(grant: Omit<Grant, 'id'>): Promise<number> {
    const result = await execute(
      `INSERT INTO grants (player_uuid, rank_id, granter_uuid, granter_name, granted_at, expires_at, reason, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        grant.playerUuid,
        grant.rankId,
        grant.granterUuid,
        grant.granterName,
        grant.grantedAt,
        grant.expiresAt,
        grant.reason,
        grant.isActive ? 1 : 0,
      ]
    );

    // Notify all servers of grant change
    wsManager.notifyGrantChange(grant.playerUuid);

    return result.insertId;
  }

  /**
   * Update grant active status
   */
  async updateActiveStatus(grantId: number, active: boolean): Promise<void> {
    // First get the grant to find player UUID
    const grant = await this.findById(grantId);
    if (!grant) {
      throw notFound(`Grant with ID ${grantId} not found`);
    }

    const result = await execute(
      'UPDATE grants SET is_active = ? WHERE id = ?',
      [active ? 1 : 0, grantId]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Grant with ID ${grantId} not found`);
    }

    // Notify all servers of grant change
    wsManager.notifyGrantChange(grant.playerUuid);
  }

  /**
   * Delete grant by ID
   */
  async deleteById(grantId: number): Promise<void> {
    // First get the grant to find player UUID
    const grant = await this.findById(grantId);
    if (!grant) {
      throw notFound(`Grant with ID ${grantId} not found`);
    }

    const result = await execute(
      'DELETE FROM grants WHERE id = ?',
      [grantId]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Grant with ID ${grantId} not found`);
    }

    // Notify all servers of grant change
    wsManager.notifyGrantChange(grant.playerUuid);
  }

  /**
   * Delete all grants for a player
   */
  async deleteByPlayer(playerUuid: string): Promise<void> {
    await execute(
      'DELETE FROM grants WHERE player_uuid = ?',
      [playerUuid]
    );

    // Notify all servers of grant change
    wsManager.notifyGrantChange(playerUuid);
  }

  /**
   * Mark expired grants as inactive
   */
  async cleanupExpiredGrants(): Promise<number> {
    // First find all players with expired grants
    const expiredGrants = await query<GrantRow>(
      `SELECT DISTINCT player_uuid FROM grants
       WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')`
    );

    // Update the grants
    const result = await execute(
      `UPDATE grants SET is_active = 0
       WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')`
    );

    // Notify all affected players
    for (const row of expiredGrants) {
      wsManager.notifyGrantChange(row.player_uuid);
    }

    return result.affectedRows;
  }

  /**
   * Create grants table if not exists
   */
  async createTable(): Promise<void> {
    await execute(`
      CREATE TABLE IF NOT EXISTS grants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        rank_id TEXT NOT NULL,
        granter_uuid TEXT NOT NULL,
        granter_name TEXT NOT NULL,
        granted_at TEXT NOT NULL,
        expires_at TEXT,
        reason TEXT,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Create indexes for performance
    await execute(`CREATE INDEX IF NOT EXISTS idx_grants_player_uuid ON grants(player_uuid)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_grants_rank_id ON grants(rank_id)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_grants_is_active ON grants(is_active)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_grants_expires_at ON grants(expires_at)`);
  }
}

export const grantService = new GrantService();

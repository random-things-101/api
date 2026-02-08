/**
 * Punishment service - handles all punishment-related database operations
 */
import { query, execute } from '../db/connection.js';
import { PunishmentRow, punishmentRowToApi, Punishment } from '../types/index.js';
import { notFound } from '../middleware/error.js';
import { wsManager } from '../ws/server.js';

export class PunishmentService {
  /**
   * Find punishment by ID
   */
  async findById(id: number): Promise<Punishment | null> {
    const rows = await query<PunishmentRow>(
      'SELECT * FROM punishments WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return punishmentRowToApi(rows[0]);
  }

  /**
   * Find all punishments for a player (ordered by created_at DESC)
   */
  async findByPlayer(playerUuid: string): Promise<Punishment[]> {
    const rows = await query<PunishmentRow>(
      'SELECT * FROM punishments WHERE player_uuid = ? ORDER BY created_at DESC',
      [playerUuid]
    );
    return rows.map(row => punishmentRowToApi(row));
  }

  /**
   * Find active punishments for a player
   */
  async findActiveByPlayer(playerUuid: string): Promise<Punishment[]> {
    const rows = await query<PunishmentRow>(
      `SELECT * FROM punishments
       WHERE player_uuid = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY created_at DESC`,
      [playerUuid]
    );
    return rows.map(row => punishmentRowToApi(row));
  }

  /**
   * Find active punishments for a player (including expired ones that are still active)
   */
  async findActiveByPlayerIncludingExpired(playerUuid: string): Promise<Punishment[]> {
    const rows = await query<PunishmentRow>(
      `SELECT * FROM punishments
       WHERE player_uuid = ? AND is_active = 1
       ORDER BY created_at DESC`,
      [playerUuid]
    );
    return rows.map(row => punishmentRowToApi(row));
  }

  /**
   * Save (create) a new punishment
   */
  async save(punishment: Omit<Punishment, 'id'>): Promise<number> {
    const result = await execute(
      `INSERT INTO punishments (player_uuid, punished_by_uuid, punished_by_name, type, reason, duration_seconds, created_at, expires_at, is_active, executed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        punishment.playerUuid,
        punishment.punishedByUuid,
        punishment.punishedByName,
        punishment.type,
        punishment.reason,
        punishment.durationSeconds,
        punishment.createdAt,
        punishment.expiresAt,
        punishment.isActive ? 1 : 0,
        punishment.executed ? 1 : 0,
      ]
    );

    return result.insertId;
  }

  /**
   * Update punishment active status
   */
  async updateActiveStatus(punishmentId: number, active: boolean): Promise<void> {
    const result = await execute(
      'UPDATE punishments SET is_active = ? WHERE id = ?',
      [active ? 1 : 0, punishmentId]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Punishment with ID ${punishmentId} not found`);
    }
  }

  /**
   * Delete punishment by ID
   */
  async deleteById(punishmentId: number): Promise<void> {
    const result = await execute(
      'DELETE FROM punishments WHERE id = ?',
      [punishmentId]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Punishment with ID ${punishmentId} not found`);
    }
  }

  /**
   * Delete all punishments for a player
   */
  async deleteByPlayer(playerUuid: string): Promise<void> {
    await execute(
      'DELETE FROM punishments WHERE player_uuid = ?',
      [playerUuid]
    );
  }

  /**
   * Mark expired punishments as inactive
   */
  async cleanupExpiredPunishments(): Promise<number> {
    // First find all players with expired punishments
    const expiredPunishments = await query<PunishmentRow>(
      `SELECT DISTINCT player_uuid FROM punishments
       WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')`
    );

    // Update the punishments
    const result = await execute(
      `UPDATE punishments SET is_active = 0
       WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')`
    );

    // Notify all affected players via WebSocket
    for (const row of expiredPunishments) {
      wsManager.notifyPlayerUpdate(row.player_uuid);
    }

    return result.affectedRows;
  }

  /**
   * Execute a punishment (kick player via proxy if needed)
   * Note: Mutes and warns don't kick, they're handled by game servers
   */
  async execute(punishmentId: number): Promise<{ success: boolean; message: string; kicked: boolean | null }> {
    const punishment = await this.findById(punishmentId);
    if (!punishment) {
      throw notFound(`Punishment with ID ${punishmentId} not found`);
    }

    // Only BAN, TEMPBAN, and KICK should result in a kick (handled by proxy)
    // MUTE, TEMP_MUTE, and WARN don't kick (handled by game servers)
    const shouldKick = punishment.type === 'BAN' || punishment.type === 'TEMPBAN' || punishment.type === 'KICK';

    let kicked = false;
    if (shouldKick) {
      // Send message to proxy to kick the player
      wsManager.notifyPunishmentExecute(punishment.playerUuid, punishment.type, punishment.reason);
      kicked = true;
    }

    // Mark as executed
    await execute(
      'UPDATE punishments SET executed = 1 WHERE id = ?',
      [punishmentId]
    );

    return {
      success: true,
      message: `Punishment executed successfully`,
      kicked: kicked,
    };
  }

  /**
   * Create punishments table if not exists
   */
  async createTable(): Promise<void> {
    await execute(`
      CREATE TABLE IF NOT EXISTS punishments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        punished_by_uuid TEXT,
        punished_by_name TEXT,
        type TEXT NOT NULL,
        reason TEXT,
        duration_seconds INTEGER,
        created_at TEXT,
        expires_at TEXT,
        is_active INTEGER DEFAULT 1,
        executed INTEGER DEFAULT 0
      )
    `);

    // Create indexes for performance
    await execute(`CREATE INDEX IF NOT EXISTS idx_punishments_player_uuid ON punishments(player_uuid)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_punishments_type ON punishments(type)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_punishments_is_active ON punishments(is_active)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_punishments_expires_at ON punishments(expires_at)`);
  }
}

export const punishmentService = new PunishmentService();

/**
 * Rank service - handles all rank-related database operations
 */
import { query, execute } from '../db/connection.js';
import { RankRow, rankRowToApi, rankApiToRow } from '../types/index.js';
import { notFound } from '../middleware/error.js';
import type { Rank, CreateRankDto } from '../types/index.js';
import { wsManager } from '../ws/server.js';

export class RankService {
  /**
   * Find rank by ID
   */
  async findById(id: string): Promise<Rank | null> {
    const rows = await query<RankRow>(
      'SELECT * FROM ranks WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return rankRowToApi(rows[0]);
  }

  /**
   * Find default rank
   */
  async findDefaultRank(): Promise<Rank | null> {
    const rows = await query<RankRow>(
      'SELECT * FROM ranks WHERE is_default = 1 LIMIT 1'
    );
    if (rows.length === 0) return null;
    return rankRowToApi(rows[0]);
  }

  /**
   * Get all ranks ordered by priority DESC
   */
  async findAll(): Promise<Rank[]> {
    const rows = await query<RankRow>(
      'SELECT * FROM ranks ORDER BY priority DESC'
    );
    return rows.map(row => rankRowToApi(row));
  }

  /**
   * Save (create or update) rank
   */
  async save(dto: CreateRankDto): Promise<void> {
    const row = rankApiToRow(dto);
    await execute(
      `INSERT INTO ranks (id, name, display_name, prefix, suffix, priority, is_default, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       display_name = excluded.display_name,
       prefix = excluded.prefix,
       suffix = excluded.suffix,
       priority = excluded.priority,
       is_default = excluded.is_default,
       permissions = excluded.permissions`,
      [
        row.id,
        row.name,
        row.displayName,
        row.prefix,
        row.suffix,
        row.priority ?? 0,
        row.isDefault ? 1 : 0,
        row.permissions,
      ]
    );

    // Notify all servers of rank change
    wsManager.notifyRankChange(row.id);
  }

  /**
   * Delete rank by ID
   */
  async deleteById(id: string): Promise<void> {
    const result = await execute(
      'DELETE FROM ranks WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw notFound(`Rank not found: ${id}`);
    }

    // Notify all servers of rank change
    wsManager.notifyRankChange(id);
  }

  /**
   * Create ranks table if not exists
   */
  async createTable(): Promise<void> {
    await execute(`
      CREATE TABLE IF NOT EXISTS ranks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT,
        prefix TEXT,
        suffix TEXT,
        priority INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        permissions TEXT
      )
    `);
  }
}

// Export singleton instance
export const rankService = new RankService();

/**
 * SQLite database connection management
 */
const Database = require('better-sqlite3');
import path from 'path';

// Get database path from environment or use default
const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'core.db');

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Set busy timeout for concurrent access
db.pragma('busy_timeout = 5000');

console.log(`✅ SQLite database connected: ${dbPath}`);

// Type-safe query wrapper
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const stmt = db.prepare(sql);
  return stmt.all(...(params || [])) as T[];
}

// Execute wrapper for INSERT/UPDATE/DELETE
export async function execute(
  sql: string,
  params?: any[]
): Promise<{ affectedRows: number; insertId: number }> {
  const stmt = db.prepare(sql);
  const result = stmt.run(...(params || []));
  return {
    affectedRows: result.changes,
    insertId: result.lastInsertRowid,
  };
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    db.prepare('SELECT 1').get();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  try {
    db.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

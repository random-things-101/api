/**
 * SQLite database connection management
 */
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Get database path from environment or use default
const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'core.db');

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

// Initialize database connection
export async function initDb(): Promise<void> {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Set busy timeout for concurrent access
  await db.exec('PRAGMA busy_timeout = 5000');

  console.log(`✅ SQLite database connected: ${dbPath}`);
}

// Type-safe query wrapper
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  if (!db) await initDb();
  return db!.all(sql, params || []) as T[];
}

// Execute wrapper for INSERT/UPDATE/DELETE
export async function execute(
  sql: string,
  params?: any[]
): Promise<{ affectedRows: number; insertId: number }> {
  if (!db) await initDb();
  const result = await db!.run(sql, params || []);
  return {
    affectedRows: result.changes,
    insertId: result.lastID || 0,
  };
}

// Get single row
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | undefined> {
  if (!db) await initDb();
  return db!.get(sql, params || []) as T | undefined;
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    if (!db) await initDb();
    await db!.get('SELECT 1');
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
    if (db) {
      await db.close();
      db = null;
      console.log('🔌 Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

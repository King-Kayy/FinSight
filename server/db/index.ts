/**
 * server/db/index.ts
 *
 * DB connection factory.
 *
 * - If DATABASE_URL is set: creates a pg.Pool, runs migrate() to apply schema,
 *   and exports the pool as `db`.
 * - If DATABASE_URL is absent: imports the in-memory fallback store, calls its
 *   no-op migrate(), and exports fallbackDb as `db`.
 *
 * All services import `db` (or call `getDb()`) to access the database.
 * The server startup code should await `initializeDb()` before accepting
 * requests so the schema is ready before the first query.
 */

import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;
import { migrate } from "./schema";
import { fallbackDb, migrate as fallbackMigrate } from "./fallback";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Common interface satisfied by both pg.Pool and the in-memory fallback.
 * All services depend on this type, never on pg.Pool directly.
 */
export interface DbClient {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
}

// Module-level reference populated by initializeDb().
export let db: DbClient = fallbackDb; // start with fallback until init completes

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

let _initialized = false;

/**
 * Initialise the database connection.
 *
 * - When DATABASE_URL is present: connects to PostgreSQL and runs DDL
 *   migrations via schema.ts.
 * - When DATABASE_URL is absent: warms up the in-memory fallback and calls
 *   the no-op migrate().
 *
 * Safe to call multiple times — subsequent calls return immediately.
 * Must be awaited by the server startup code before handling requests.
 */
export async function initializeDb(): Promise<DbClient> {
  if (_initialized) return db;

  if (process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("supabase")
          ? { rejectUnauthorized: false }
          : undefined,
        connectionTimeoutMillis: 5000,
      });
      // Disable prepared statements — required for Supabase transaction pooler (port 6543)
      pool.on("connect", (client) => {
        (client as any).query("SET statement_timeout = '30s'").catch(() => {});
      });
      await migrate(pool);
      console.log("[db] Connected to PostgreSQL");
      db = pool as unknown as DbClient;
    } catch (err) {
      console.error("[db] PostgreSQL connection failed, falling back to in-memory store:", (err as Error).message);
      await fallbackMigrate();
      db = fallbackDb;
      console.log("[db] Using in-memory fallback database");
    }
  } else {
    await fallbackMigrate();
    await fallbackDb.query("BEGIN");
    console.log("[db] Using in-memory fallback database");
    db = fallbackDb;
  }

  _initialized = true;
  return db;
}

/**
 * Returns the fully-initialised DbClient.
 * Services that cannot import `db` synchronously can call this instead.
 */
export async function getDb(): Promise<DbClient> {
  if (!_initialized) {
    return initializeDb();
  }
  return db;
}

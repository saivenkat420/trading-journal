// Database connection module
import pg from 'pg';
import dotenv from 'dotenv';

// Ensure environment variables are loaded before reading them
dotenv.config();

// Try config/config.js first, fallback to config.js
let config;
try {
  config = (await import('./config/config.js')).default;
} catch (e) {
  config = (await import('./config.js')).default;
}

const { Pool } = pg;

// Support Supabase connection string or traditional config
let poolConfig;
if (process.env.DATABASE_URL) {
  // Connection string format
  const cs = process.env.DATABASE_URL;
  // Detect local connections to avoid forcing SSL
  // Examples considered local: localhost, 127.0.0.1
  let isLocal = false;
  try {
    const url = new URL(cs);
    isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    // Fallback: naive check
    isLocal = cs.includes("localhost") || cs.includes("127.0.0.1");
  }

  poolConfig = {
    connectionString: cs,
    // Only enable SSL for non-local hosts (e.g., Supabase/Neon/Render)
    ssl: isLocal ? false : { rejectUnauthorized: false }
  };

  // Helpful debug log (sanitized)
  try {
    const u = new URL(cs);
    const safeInfo = {
      host: u.hostname,
      port: Number(u.port) || (isLocal ? 5432 : 6543),
      database: u.pathname?.replace(/^\//, "") || "postgres",
      user: decodeURIComponent(u.username || "postgres"),
      ssl: isLocal ? false : "enabled",
      mode: isLocal ? "local" : "remote",
    };
    console.log("DB connection (sanitized):", safeInfo);
  } catch {
    console.log("DB connection: using connection string (unable to parse for debug)");
  }
} else if (config.supabase?.connectionString) {
  // Supabase connection string from config
  poolConfig = {
    connectionString: config.supabase.connectionString,
    ssl: { rejectUnauthorized: false }
  };
} else {
  // Traditional database config
  poolConfig = config.database;
  // If using Supabase URL, ensure SSL is enabled
  if (config.supabase?.url && !poolConfig.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

// Helper function for queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
}

// Helper function for transactions
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

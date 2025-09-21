import { Pool } from 'pg';
import { config } from '../config';

let pool: Pool;

export async function initializeDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: config.database.url,
    max: config.database.poolSize,
    connectionTimeoutMillis: config.database.connectionTimeout,
  });

  // Test connection and wait for database to be ready
  let retries = 0;
  const maxRetries = 30;

  while (retries < maxRetries) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      break;
    } catch (error) {
      console.log(`Waiting for database... (attempt ${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
  }

  if (retries === maxRetries) {
    throw new Error(`Database connection failed after ${maxRetries} attempts`);
  }

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
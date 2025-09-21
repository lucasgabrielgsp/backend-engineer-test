import { Pool } from 'pg';

export async function runMigrations(pool: Pool): Promise<void> {
  console.log('Running database migrations...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      height INTEGER UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outputs (
      id SERIAL PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      output_index INTEGER NOT NULL,
      address TEXT NOT NULL,
      value NUMERIC NOT NULL,
      spent BOOLEAN DEFAULT FALSE,
      spent_by_tx TEXT,
      spent_by_index INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tx_id, output_index)
    );
  `);

  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_outputs_address ON outputs(address);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_outputs_spent ON outputs(spent);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_outputs_tx_id ON outputs(tx_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(height);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_block_id ON transactions(block_id);
  `);

  console.log('Database migrations completed');
}
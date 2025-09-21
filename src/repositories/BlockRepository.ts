import { Pool, PoolClient } from 'pg';
import { Block } from '../types';

export class BlockRepository {
  constructor(private pool: Pool) {}

  async getCurrentHeight(): Promise<number> {
    const result = await this.pool.query(
      'SELECT COALESCE(MAX(height), 0) as max_height FROM blocks'
    );
    return parseInt(result.rows[0].max_height);
  }

  async createBlock(client: PoolClient, block: Block): Promise<void> {
    await client.query(
      'INSERT INTO blocks (id, height) VALUES ($1, $2)',
      [block.id, block.height]
    );
  }

  async deleteBlocksAboveHeight(client: PoolClient, height: number): Promise<void> {
    await client.query('DELETE FROM blocks WHERE height > $1', [height]);
  }

  async getBlocksAboveHeight(client: PoolClient, height: number): Promise<{ id: string }[]> {
    const result = await client.query(
      'SELECT id FROM blocks WHERE height > $1 ORDER BY height DESC',
      [height]
    );
    return result.rows;
  }

  async blockExists(blockId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM blocks WHERE id = $1',
      [blockId]
    );
    return result.rows.length > 0;
  }
}
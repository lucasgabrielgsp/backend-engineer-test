import { Pool, PoolClient } from 'pg';
import { Transaction } from '../types';

export class TransactionRepository {
  constructor(private pool: Pool) {}

  async createTransaction(
    client: PoolClient,
    transaction: Transaction,
    blockId: string
  ): Promise<void> {
    await client.query(
      'INSERT INTO transactions (id, block_id) VALUES ($1, $2)',
      [transaction.id, blockId]
    );
  }

  async getTransactionsByBlockId(
    client: PoolClient,
    blockId: string
  ): Promise<{ id: string }[]> {
    const result = await client.query(
      'SELECT id FROM transactions WHERE block_id = $1',
      [blockId]
    );
    return result.rows;
  }

  async transactionExists(txId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM transactions WHERE id = $1',
      [txId]
    );
    return result.rows.length > 0;
  }
}
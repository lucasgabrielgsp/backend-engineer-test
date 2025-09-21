import { Pool, PoolClient } from 'pg';
import { Output } from '../types';

export interface OutputRecord {
  tx_id: string;
  output_index: number;
  address: string;
  value: number;
  spent: boolean;
}

export class OutputRepository {
  constructor(private pool: Pool) {}

  async createOutput(
    client: PoolClient,
    txId: string,
    index: number,
    output: Output
  ): Promise<void> {
    await client.query(
      'INSERT INTO outputs (tx_id, output_index, address, value, spent) VALUES ($1, $2, $3, $4, FALSE)',
      [txId, index, output.address, output.value]
    );
  }

  async getOutput(txId: string, index: number): Promise<OutputRecord | null> {
    const result = await this.pool.query(
      'SELECT tx_id, output_index, address, value, spent FROM outputs WHERE tx_id = $1 AND output_index = $2',
      [txId, index]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      value: parseFloat(result.rows[0].value),
    };
  }

  async markOutputAsSpent(
    client: PoolClient,
    txId: string,
    index: number,
    spentByTx: string,
    spentByIndex: number
  ): Promise<void> {
    const result = await client.query(
      'UPDATE outputs SET spent = TRUE, spent_by_tx = $1, spent_by_index = $2 WHERE tx_id = $3 AND output_index = $4 AND spent = FALSE',
      [spentByTx, spentByIndex, txId, index]
    );

    if (result.rowCount === 0) {
      throw new Error(`Output ${txId}:${index} not found or already spent`);
    }
  }

  async unspendOutputsByTransaction(
    client: PoolClient,
    txId: string
  ): Promise<void> {
    await client.query(
      'UPDATE outputs SET spent = FALSE, spent_by_tx = NULL, spent_by_index = NULL WHERE spent_by_tx = $1',
      [txId]
    );
  }

  async getBalanceForAddress(address: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COALESCE(SUM(value), 0) as balance FROM outputs WHERE address = $1 AND spent = FALSE',
      [address]
    );
    return parseFloat(result.rows[0].balance);
  }

  async isOutputSpent(txId: string, index: number): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT spent FROM outputs WHERE tx_id = $1 AND output_index = $2',
      [txId, index]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].spent;
  }
}
import { Pool } from 'pg';
import { createHash } from 'crypto';
import { Block, Transaction } from '../types';
import { BlockRepository } from '../repositories/BlockRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { OutputRepository } from '../repositories/OutputRepository';
import { ValidationError, BlockchainError, ConflictError } from '../errors';
import { config } from '../config';

export class BlockchainService {
  private blockRepo: BlockRepository;
  private txRepo: TransactionRepository;
  private outputRepo: OutputRepository;

  constructor(private pool: Pool) {
    this.blockRepo = new BlockRepository(pool);
    this.txRepo = new TransactionRepository(pool);
    this.outputRepo = new OutputRepository(pool);
  }

  async processBlock(block: Block): Promise<void> {
    // Validate block
    await this.validateBlock(block);

    // Process in transaction
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create block
      await this.blockRepo.createBlock(client, block);

      // Process transactions
      for (const tx of block.transactions) {
        await this.processTransaction(client, tx, block.id);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async processTransaction(
    client: any,
    tx: Transaction,
    blockId: string
  ): Promise<void> {
    // Create transaction record
    await this.txRepo.createTransaction(client, tx, blockId);

    // Process inputs (spend outputs)
    for (let i = 0; i < tx.inputs.length; i++) {
      const input = tx.inputs[i];
      await this.outputRepo.markOutputAsSpent(
        client,
        input.txId,
        input.index,
        tx.id,
        i
      );
    }

    // Create new outputs
    for (let i = 0; i < tx.outputs.length; i++) {
      await this.outputRepo.createOutput(client, tx.id, i, tx.outputs[i]);
    }
  }

  private async validateBlock(block: Block): Promise<void> {
    const currentHeight = await this.blockRepo.getCurrentHeight();

    // Validate height
    if (block.height !== currentHeight + 1) {
      throw new ValidationError(
        `Invalid height. Expected ${currentHeight + 1}, got ${block.height}`,
        'INVALID_HEIGHT'
      );
    }

    // Validate block hash
    const expectedHash = this.calculateBlockHash(
      block.height,
      block.transactions.map(tx => tx.id)
    );

    if (block.id !== expectedHash) {
      throw new ValidationError(
        `Invalid block ID. Expected ${expectedHash}, got ${block.id}`,
        'INVALID_BLOCK_ID'
      );
    }

    // Validate transaction balances
    await this.validateTransactionBalances(block);
  }

  private async validateTransactionBalances(block: Block): Promise<void> {
    let totalInputValue = 0;
    let totalOutputValue = 0;

    for (const tx of block.transactions) {
      // Calculate input values
      for (const input of tx.inputs) {
        const output = await this.outputRepo.getOutput(input.txId, input.index);
        if (!output) {
          throw new ValidationError(
            `Input references non-existent output: ${input.txId}:${input.index}`,
            'INVALID_INPUT'
          );
        }
        if (output.spent) {
          throw new ConflictError(
            `Output already spent: ${input.txId}:${input.index}`,
            'DOUBLE_SPEND'
          );
        }
        totalInputValue += output.value;
      }

      // Calculate output values
      for (const output of tx.outputs) {
        totalOutputValue += output.value;
      }
    }

    // First block (genesis) can have outputs without inputs
    if (block.height > 1 && Math.abs(totalInputValue - totalOutputValue) > 0.000001) {
      throw new ValidationError(
        `Input/Output value mismatch. Inputs: ${totalInputValue}, Outputs: ${totalOutputValue}`,
        'VALUE_MISMATCH'
      );
    }
  }

  private calculateBlockHash(height: number, transactionIds: string[]): string {
    const data = height.toString() + transactionIds.join('');
    return createHash('sha256').update(data).digest('hex');
  }

  async getBalance(address: string): Promise<number> {
    return this.outputRepo.getBalanceForAddress(address);
  }

  async rollback(targetHeight: number): Promise<void> {
    const currentHeight = await this.blockRepo.getCurrentHeight();

    // Validate rollback
    if (targetHeight < 0) {
      throw new ValidationError('Invalid height parameter', 'INVALID_HEIGHT');
    }

    if (targetHeight > currentHeight) {
      throw new ValidationError(
        `Cannot rollback to future height. Current: ${currentHeight}, Target: ${targetHeight}`,
        'FUTURE_HEIGHT'
      );
    }

    if (currentHeight - targetHeight > config.blockchain.maxRollbackBlocks) {
      throw new ValidationError(
        `Cannot rollback more than ${config.blockchain.maxRollbackBlocks} blocks. Current: ${currentHeight}, Target: ${targetHeight}`,
        'EXCESSIVE_ROLLBACK'
      );
    }

    // Perform rollback in transaction
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get blocks to delete
      const blocksToDelete = await this.blockRepo.getBlocksAboveHeight(
        client,
        targetHeight
      );

      // Unspend outputs for each transaction
      for (const block of blocksToDelete) {
        const transactions = await this.txRepo.getTransactionsByBlockId(
          client,
          block.id
        );

        for (const tx of transactions) {
          await this.outputRepo.unspendOutputsByTransaction(client, tx.id);
        }
      }

      // Delete blocks (cascades to transactions and outputs)
      await this.blockRepo.deleteBlocksAboveHeight(client, targetHeight);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCurrentHeight(): Promise<number> {
    return this.blockRepo.getCurrentHeight();
  }
}
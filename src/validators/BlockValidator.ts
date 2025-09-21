import { Block, Transaction, Input, Output } from '../types';
import { ValidationError } from '../errors';

export class BlockValidator {
  static validateBlockSchema(data: any): Block {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid block data');
    }

    if (typeof data.id !== 'string' || !data.id) {
      throw new ValidationError('Block ID must be a non-empty string');
    }

    if (typeof data.height !== 'number' || data.height < 1) {
      throw new ValidationError('Block height must be a positive number');
    }

    if (!Array.isArray(data.transactions)) {
      throw new ValidationError('Block transactions must be an array');
    }

    const transactions = data.transactions.map((tx: any) =>
      this.validateTransactionSchema(tx)
    );

    return {
      id: data.id,
      height: data.height,
      transactions,
    };
  }

  static validateTransactionSchema(data: any): Transaction {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid transaction data');
    }

    if (typeof data.id !== 'string' || !data.id) {
      throw new ValidationError('Transaction ID must be a non-empty string');
    }

    if (!Array.isArray(data.inputs)) {
      throw new ValidationError('Transaction inputs must be an array');
    }

    if (!Array.isArray(data.outputs)) {
      throw new ValidationError('Transaction outputs must be an array');
    }

    const inputs = data.inputs.map((input: any) =>
      this.validateInputSchema(input)
    );

    const outputs = data.outputs.map((output: any) =>
      this.validateOutputSchema(output)
    );

    return {
      id: data.id,
      inputs,
      outputs,
    };
  }

  static validateInputSchema(data: any): Input {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid input data');
    }

    if (typeof data.txId !== 'string' || !data.txId) {
      throw new ValidationError('Input txId must be a non-empty string');
    }

    if (typeof data.index !== 'number' || data.index < 0) {
      throw new ValidationError('Input index must be a non-negative number');
    }

    return {
      txId: data.txId,
      index: data.index,
    };
  }

  static validateOutputSchema(data: any): Output {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid output data');
    }

    if (typeof data.address !== 'string' || !data.address) {
      throw new ValidationError('Output address must be a non-empty string');
    }

    if (typeof data.value !== 'number' || data.value < 0) {
      throw new ValidationError('Output value must be a non-negative number');
    }

    return {
      address: data.address,
      value: data.value,
    };
  }

  static validateRollbackHeight(height: any): number {
    const parsed = parseInt(height);

    if (isNaN(parsed) || parsed < 0) {
      throw new ValidationError('Invalid height parameter');
    }

    return parsed;
  }
}
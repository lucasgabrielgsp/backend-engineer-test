import { expect, test, describe } from 'bun:test';
import { BlockValidator } from '../../../src/validators/BlockValidator';

describe('BlockValidator', () => {
  describe('validateBlockSchema', () => {
    test('should validate a valid block', () => {
      const validBlock = {
        id: 'abc123',
        height: 1,
        transactions: [
          {
            id: 'tx1',
            inputs: [],
            outputs: [
              {
                address: 'addr1',
                value: 100,
              },
            ],
          },
        ],
      };

      const result = BlockValidator.validateBlockSchema(validBlock);
      expect(result).toEqual(validBlock);
    });

    test('should throw error for missing block id', () => {
      const invalidBlock = {
        height: 1,
        transactions: [],
      };

      expect(() => BlockValidator.validateBlockSchema(invalidBlock)).toThrow(
        'Block ID must be a non-empty string'
      );
    });

    test('should throw error for invalid height', () => {
      const invalidBlock = {
        id: 'abc123',
        height: 0,
        transactions: [],
      };

      expect(() => BlockValidator.validateBlockSchema(invalidBlock)).toThrow(
        'Block height must be a positive number'
      );
    });

    test('should throw error for non-array transactions', () => {
      const invalidBlock = {
        id: 'abc123',
        height: 1,
        transactions: 'not an array',
      };

      expect(() => BlockValidator.validateBlockSchema(invalidBlock)).toThrow(
        'Block transactions must be an array'
      );
    });
  });

  describe('validateTransactionSchema', () => {
    test('should validate a valid transaction', () => {
      const validTx = {
        id: 'tx1',
        inputs: [{ txId: 'prev_tx', index: 0 }],
        outputs: [{ address: 'addr1', value: 100 }],
      };

      const result = BlockValidator.validateTransactionSchema(validTx);
      expect(result).toEqual(validTx);
    });

    test('should throw error for missing transaction id', () => {
      const invalidTx = {
        inputs: [],
        outputs: [],
      };

      expect(() => BlockValidator.validateTransactionSchema(invalidTx)).toThrow(
        'Transaction ID must be a non-empty string'
      );
    });
  });

  describe('validateInputSchema', () => {
    test('should validate a valid input', () => {
      const validInput = {
        txId: 'tx1',
        index: 0,
      };

      const result = BlockValidator.validateInputSchema(validInput);
      expect(result).toEqual(validInput);
    });

    test('should throw error for negative index', () => {
      const invalidInput = {
        txId: 'tx1',
        index: -1,
      };

      expect(() => BlockValidator.validateInputSchema(invalidInput)).toThrow(
        'Input index must be a non-negative number'
      );
    });
  });

  describe('validateOutputSchema', () => {
    test('should validate a valid output', () => {
      const validOutput = {
        address: 'addr1',
        value: 100,
      };

      const result = BlockValidator.validateOutputSchema(validOutput);
      expect(result).toEqual(validOutput);
    });

    test('should throw error for negative value', () => {
      const invalidOutput = {
        address: 'addr1',
        value: -100,
      };

      expect(() => BlockValidator.validateOutputSchema(invalidOutput)).toThrow(
        'Output value must be a non-negative number'
      );
    });

    test('should throw error for empty address', () => {
      const invalidOutput = {
        address: '',
        value: 100,
      };

      expect(() => BlockValidator.validateOutputSchema(invalidOutput)).toThrow(
        'Output address must be a non-empty string'
      );
    });
  });

  describe('validateRollbackHeight', () => {
    test('should validate valid height', () => {
      expect(BlockValidator.validateRollbackHeight('10')).toBe(10);
      expect(BlockValidator.validateRollbackHeight(5)).toBe(5);
      expect(BlockValidator.validateRollbackHeight('0')).toBe(0);
    });

    test('should throw error for invalid height', () => {
      expect(() => BlockValidator.validateRollbackHeight('abc')).toThrow(
        'Invalid height parameter'
      );
      expect(() => BlockValidator.validateRollbackHeight(-1)).toThrow(
        'Invalid height parameter'
      );
      expect(() => BlockValidator.validateRollbackHeight(null)).toThrow(
        'Invalid height parameter'
      );
    });
  });
});
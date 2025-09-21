import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BlockchainService } from '../services/BlockchainService';
import { BlockValidator } from '../validators/BlockValidator';
import { AppError } from '../errors';
import { Block } from '../types';
import {
  blockSchema,
  errorSchema,
  successSchema,
  balanceSchema,
  healthSchema,
} from '../schemas';

export async function blockchainRoutes(
  fastify: FastifyInstance,
  options: { blockchainService: BlockchainService }
) {
  const { blockchainService } = options;

  // Health check endpoint
  fastify.get(
    '/',
    {
      schema: {
        description: 'Health check endpoint to verify API status and get current blockchain height',
        tags: ['Health'],
        summary: 'Get API health status',
        response: {
          200: {
            description: 'API is healthy',
            ...healthSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const currentHeight = await blockchainService.getCurrentHeight();
      return { status: 'ok', currentHeight };
    }
  );

  // Process new block endpoint
  fastify.post<{ Body: Block }>(
    '/blocks',
    {
      schema: {
        description: `Submit a new block to the blockchain. The block must:
        - Have a height exactly one unit higher than the current height
        - Have a valid ID (SHA256 hash of height + transaction IDs)
        - Have balanced inputs and outputs (except for genesis block)
        - Not double-spend any outputs`,
        tags: ['Blockchain'],
        summary: 'Submit a new block',
        body: blockSchema,
        response: {
          200: {
            description: 'Block successfully processed',
            ...successSchema,
          },
          400: {
            description: 'Invalid block data',
            ...errorSchema,
            examples: [
              {
                error: 'Invalid height. Expected 2, got 3',
                code: 'INVALID_HEIGHT',
              },
              {
                error: 'Invalid block ID. Expected abc123..., got xyz789...',
                code: 'INVALID_BLOCK_ID',
              },
              {
                error: 'Input/Output value mismatch. Inputs: 100, Outputs: 150',
                code: 'VALUE_MISMATCH',
              },
              {
                error: 'Output already spent: tx1:0',
                code: 'DOUBLE_SPEND',
              },
            ],
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const block = BlockValidator.validateBlockSchema(request.body);
        await blockchainService.processBlock(block);
        return reply.status(200).send({
          success: true,
          height: block.height,
        });
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // Get balance endpoint
  fastify.get<{ Params: { address: string } }>(
    '/balance/:address',
    {
      schema: {
        description: 'Get the current unspent balance for a specific address',
        tags: ['Blockchain'],
        summary: 'Get address balance',
        params: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The address to query',
            },
          },
          required: ['address'],
        },
        response: {
          200: {
            description: 'Balance retrieved successfully',
            ...balanceSchema,
            examples: [
              {
                address: 'addr1',
                balance: 100,
              },
              {
                address: 'unknown_addr',
                balance: 0,
              },
            ],
          },
          400: {
            description: 'Invalid request',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { address } = request.params;

        if (!address) {
          throw new AppError('Address parameter is required', 400);
        }

        const balance = await blockchainService.getBalance(address);
        return reply.status(200).send({
          address,
          balance,
        });
      } catch (error) {
        handleError(error, reply);
      }
    }
  );

  // Rollback endpoint
  fastify.post<{ Querystring: { height: string } }>(
    '/rollback',
    {
      schema: {
        description: `Rollback the blockchain to a specific height.
        This will undo all blocks after the target height and restore spent outputs.
        Maximum rollback is limited to 2000 blocks from current height.`,
        tags: ['Blockchain'],
        summary: 'Rollback blockchain to target height',
        querystring: {
          type: 'object',
          properties: {
            height: {
              type: 'string',
              description: 'Target height to rollback to',
            },
          },
          required: ['height'],
        },
        response: {
          200: {
            description: 'Rollback successful',
            ...successSchema,
            examples: [
              {
                success: true,
                height: 100,
              },
            ],
          },
          400: {
            description: 'Invalid rollback request',
            ...errorSchema,
            examples: [
              {
                error: 'Cannot rollback to future height. Current: 100, Target: 200',
                code: 'FUTURE_HEIGHT',
              },
              {
                error: 'Cannot rollback more than 2000 blocks. Current: 2500, Target: 0',
                code: 'EXCESSIVE_ROLLBACK',
              },
              {
                error: 'Invalid height parameter',
                code: 'INVALID_HEIGHT',
              },
            ],
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const targetHeight = BlockValidator.validateRollbackHeight(
          request.query.height
        );

        await blockchainService.rollback(targetHeight);

        return reply.status(200).send({
          success: true,
          height: targetHeight,
        });
      } catch (error) {
        handleError(error, reply);
      }
    }
  );
}

function handleError(error: any, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
    });
  }

  console.error('Unexpected error:', error);
  return reply.status(500).send({
    error: 'Internal server error',
  });
}
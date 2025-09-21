import type { SwaggerOptions } from '@fastify/swagger';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

export const swaggerConfig: SwaggerOptions = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Blockchain Indexer API',
      description: `
# Blockchain Indexer API

A UTXO-based blockchain indexer that tracks balances and processes blocks.

## Overview

This API implements a blockchain indexer following the UTXO (Unspent Transaction Output) model, similar to Bitcoin. It tracks:
- Block processing with validation
- Address balances
- Transaction inputs and outputs
- Blockchain rollback capabilities

## Key Concepts

### UTXO Model
- **Outputs**: When a transaction creates outputs, it assigns value to addresses
- **Inputs**: References to previous outputs that are being spent
- **Balance**: Sum of all unspent outputs for an address
- **Double-spending**: Prevented by tracking spent outputs

### Block Validation Rules
1. **Sequential Height**: Each block must have height = current_height + 1
2. **Valid Hash**: Block ID must be SHA256(height + transaction_ids)
3. **Balanced Value**: Total input value must equal total output value (except genesis)
4. **No Double-Spending**: Cannot spend already-spent outputs

### Example Flow

\`\`\`
Block 1 (Genesis):
  Transaction: Create 100 coins for addr1
  Result: addr1 balance = 100

Block 2:
  Transaction: addr1 sends 40 to addr2, 60 to addr3
  Result: addr1 = 0, addr2 = 40, addr3 = 60

Block 3:
  Transaction: addr3 sends 20 to addr4, 40 change to addr3
  Result: addr1 = 0, addr2 = 40, addr3 = 40, addr4 = 20
\`\`\`

## Getting Started

1. Start with the health check endpoint to verify the API is running
2. Submit the genesis block (height 1) with initial outputs
3. Process subsequent blocks with valid transactions
4. Query balances using the balance endpoint
5. Rollback if needed (max 2000 blocks)

## Error Handling

All errors follow a consistent format with error message and optional error code for programmatic handling.
      `,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    externalDocs: {
      description: 'GitHub Repository',
      url: 'https://github.com/your-repo/blockchain-indexer',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Docker container',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'API health and status endpoints',
      },
      {
        name: 'Blockchain',
        description: 'Blockchain operations (blocks, balances, rollback)',
      },
    ],
    components: {
      schemas: {
        Output: {
          type: 'object',
          required: ['address', 'value'],
          properties: {
            address: {
              type: 'string',
              description: 'The address receiving the output',
              example: 'addr1',
            },
            value: {
              type: 'number',
              minimum: 0,
              description: 'The value being transferred',
              example: 100,
            },
          },
        },
        Input: {
          type: 'object',
          required: ['txId', 'index'],
          properties: {
            txId: {
              type: 'string',
              description: 'The transaction ID of the output being spent',
              example: 'tx1',
            },
            index: {
              type: 'number',
              minimum: 0,
              description: 'The index of the output in the transaction',
              example: 0,
            },
          },
        },
        Transaction: {
          type: 'object',
          required: ['id', 'inputs', 'outputs'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique transaction identifier',
              example: 'tx1',
            },
            inputs: {
              type: 'array',
              description: 'List of inputs (references to previous outputs being spent)',
              items: {
                $ref: '#/components/schemas/Input',
              },
            },
            outputs: {
              type: 'array',
              description: 'List of outputs (new unspent transaction outputs)',
              items: {
                $ref: '#/components/schemas/Output',
              },
            },
          },
        },
        Block: {
          type: 'object',
          required: ['id', 'height', 'transactions'],
          properties: {
            id: {
              type: 'string',
              description: 'Block hash (SHA256 of height + transaction IDs)',
              example: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
            },
            height: {
              type: 'number',
              minimum: 1,
              description: 'Block height (sequential number starting from 1)',
              example: 1,
            },
            transactions: {
              type: 'array',
              description: 'List of transactions in the block',
              items: {
                $ref: '#/components/schemas/Transaction',
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid height. Expected 2, got 3',
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling',
              example: 'INVALID_HEIGHT',
            },
          },
          required: ['error'],
        },
      },
    },
  },
};

export const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      next();
    },
    preHandler: function (request, reply, next) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject, request, reply) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
};
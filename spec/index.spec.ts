import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { createHash } from 'crypto';

const API_URL = 'http://localhost:3000';

async function resetDatabase() {
  const response = await fetch(`${API_URL}/rollback?height=0`, {
    method: 'POST'
  });
  return response;
}

function calculateBlockHash(height: number, transactionIds: string[]): string {
  const data = height.toString() + transactionIds.join('');
  return createHash('sha256').update(data).digest('hex');
}

describe('Blockchain Indexer API', () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('POST /blocks', () => {
    test('should accept the first block with height 1', async () => {
      await resetDatabase();

      const block = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      const response = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.height).toBe(1);
    });

    test('should reject block with incorrect height', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block3 = {
        id: calculateBlockHash(3, ['tx2']),
        height: 3,
        transactions: [{
          id: 'tx2',
          inputs: [],
          outputs: [{
            address: 'addr2',
            value: 50
          }]
        }]
      };

      const response = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block3)
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid height');
    });

    test('should reject block with incorrect hash', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: 'invalid_hash',
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 100
          }]
        }]
      };

      const response = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid block ID');
    });

    test('should reject block with input/output value mismatch', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 50
          }]
        }]
      };

      const response = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Input/Output value mismatch');
    });

    test('should process valid UTXO transactions', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 40
          }, {
            address: 'addr3',
            value: 60
          }]
        }]
      };

      const response = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      expect(response.status).toBe(200);
    });

    test('should reject double spending', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      const block3 = {
        id: calculateBlockHash(3, ['tx3']),
        height: 3,
        transactions: [{
          id: 'tx3',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr3',
            value: 100
          }]
        }]
      };

      const response = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block3)
      });

      expect(response.status).toBe(409);  // 409 Conflict for double-spending
      const data = await response.json();
      expect(data.error).toContain('Output already spent');
    });
  });

  describe('GET /balance/:address', () => {
    test('should return correct balance for address', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const response = await fetch(`${API_URL}/balance/addr1`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.address).toBe('addr1');
      expect(data.balance).toBe(100);
    });

    test('should return 0 for unknown address', async () => {
      const response = await fetch(`${API_URL}/balance/unknown_addr`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.address).toBe('unknown_addr');
      expect(data.balance).toBe(0);
    });

    test('should update balance after spending', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 40
          }, {
            address: 'addr3',
            value: 60
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      const addr1Response = await fetch(`${API_URL}/balance/addr1`);
      const addr1Data = await addr1Response.json();
      expect(addr1Data.balance).toBe(0);

      const addr2Response = await fetch(`${API_URL}/balance/addr2`);
      const addr2Data = await addr2Response.json();
      expect(addr2Data.balance).toBe(40);

      const addr3Response = await fetch(`${API_URL}/balance/addr3`);
      const addr3Data = await addr3Response.json();
      expect(addr3Data.balance).toBe(60);
    });
  });

  describe('POST /rollback', () => {
    test('should rollback to specified height', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 40
          }, {
            address: 'addr3',
            value: 60
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      const block3 = {
        id: calculateBlockHash(3, ['tx3']),
        height: 3,
        transactions: [{
          id: 'tx3',
          inputs: [{
            txId: 'tx2',
            index: 1
          }],
          outputs: [{
            address: 'addr4',
            value: 20
          }, {
            address: 'addr5',
            value: 20
          }, {
            address: 'addr6',
            value: 20
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block3)
      });

      const rollbackResponse = await fetch(`${API_URL}/rollback?height=2`, {
        method: 'POST'
      });

      expect(rollbackResponse.status).toBe(200);

      const addr1Response = await fetch(`${API_URL}/balance/addr1`);
      const addr1Data = await addr1Response.json();
      expect(addr1Data.balance).toBe(0);

      const addr2Response = await fetch(`${API_URL}/balance/addr2`);
      const addr2Data = await addr2Response.json();
      expect(addr2Data.balance).toBe(40);

      const addr3Response = await fetch(`${API_URL}/balance/addr3`);
      const addr3Data = await addr3Response.json();
      expect(addr3Data.balance).toBe(60);

      const addr4Response = await fetch(`${API_URL}/balance/addr4`);
      const addr4Data = await addr4Response.json();
      expect(addr4Data.balance).toBe(0);
    });

    test('should reject rollback to future height', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const response = await fetch(`${API_URL}/rollback?height=5`, {
        method: 'POST'
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot rollback to future height');
    });

    test('should reject rollback more than 2000 blocks', async () => {
      await resetDatabase();

      // Create exactly 2001 blocks to test the limit
      for (let i = 1; i <= 2001; i++) {
        // First block has genesis transaction, rest are empty
        const transactions = i === 1
          ? [{
              id: `tx${i}`,
              inputs: [],
              outputs: [{
                address: `addr${i}`,
                value: 100
              }]
            }]
          : [];

        const transactionIds = transactions.map(tx => tx.id);
        const block = {
          id: calculateBlockHash(i, transactionIds),
          height: i,
          transactions: transactions
        };

        await fetch(`${API_URL}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(block)
        });
      }

      // Try to rollback to height 0, which would be rolling back 2001 blocks (more than 2000)
      const response = await fetch(`${API_URL}/rollback?height=0`, {
        method: 'POST'
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot rollback more than 2000 blocks');

      // Clean up by resetting the database
      await resetDatabase();
    });

    test('should restore spent outputs after rollback', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 100
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      await fetch(`${API_URL}/rollback?height=1`, {
        method: 'POST'
      });

      const addr1Response = await fetch(`${API_URL}/balance/addr1`);
      const addr1Data = await addr1Response.json();
      expect(addr1Data.balance).toBe(100);

      const addr2Response = await fetch(`${API_URL}/balance/addr2`);
      const addr2Data = await addr2Response.json();
      expect(addr2Data.balance).toBe(0);
    });
  });

  describe('Example scenario from README', () => {
    test('should handle the example scenario correctly', async () => {
      await resetDatabase();

      const block1 = {
        id: calculateBlockHash(1, ['tx1']),
        height: 1,
        transactions: [{
          id: 'tx1',
          inputs: [],
          outputs: [{
            address: 'addr1',
            value: 10
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block1)
      });

      let addr1Balance = await fetch(`${API_URL}/balance/addr1`);
      let addr1Data = await addr1Balance.json();
      expect(addr1Data.balance).toBe(10);

      const block2 = {
        id: calculateBlockHash(2, ['tx2']),
        height: 2,
        transactions: [{
          id: 'tx2',
          inputs: [{
            txId: 'tx1',
            index: 0
          }],
          outputs: [{
            address: 'addr2',
            value: 4
          }, {
            address: 'addr3',
            value: 6
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block2)
      });

      addr1Balance = await fetch(`${API_URL}/balance/addr1`);
      addr1Data = await addr1Balance.json();
      expect(addr1Data.balance).toBe(0);

      let addr2Balance = await fetch(`${API_URL}/balance/addr2`);
      let addr2Data = await addr2Balance.json();
      expect(addr2Data.balance).toBe(4);

      let addr3Balance = await fetch(`${API_URL}/balance/addr3`);
      let addr3Data = await addr3Balance.json();
      expect(addr3Data.balance).toBe(6);

      const block3 = {
        id: calculateBlockHash(3, ['tx3']),
        height: 3,
        transactions: [{
          id: 'tx3',
          inputs: [{
            txId: 'tx2',
            index: 1
          }],
          outputs: [{
            address: 'addr4',
            value: 2
          }, {
            address: 'addr5',
            value: 2
          }, {
            address: 'addr6',
            value: 2
          }]
        }]
      };

      await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block3)
      });

      addr1Balance = await fetch(`${API_URL}/balance/addr1`);
      addr1Data = await addr1Balance.json();
      expect(addr1Data.balance).toBe(0);

      addr2Balance = await fetch(`${API_URL}/balance/addr2`);
      addr2Data = await addr2Balance.json();
      expect(addr2Data.balance).toBe(4);

      addr3Balance = await fetch(`${API_URL}/balance/addr3`);
      addr3Data = await addr3Balance.json();
      expect(addr3Data.balance).toBe(0);

      let addr4Balance = await fetch(`${API_URL}/balance/addr4`);
      let addr4Data = await addr4Balance.json();
      expect(addr4Data.balance).toBe(2);

      let addr5Balance = await fetch(`${API_URL}/balance/addr5`);
      let addr5Data = await addr5Balance.json();
      expect(addr5Data.balance).toBe(2);

      let addr6Balance = await fetch(`${API_URL}/balance/addr6`);
      let addr6Data = await addr6Balance.json();
      expect(addr6Data.balance).toBe(2);

      await fetch(`${API_URL}/rollback?height=2`, {
        method: 'POST'
      });

      addr1Balance = await fetch(`${API_URL}/balance/addr1`);
      addr1Data = await addr1Balance.json();
      expect(addr1Data.balance).toBe(0);

      addr2Balance = await fetch(`${API_URL}/balance/addr2`);
      addr2Data = await addr2Balance.json();
      expect(addr2Data.balance).toBe(4);

      addr3Balance = await fetch(`${API_URL}/balance/addr3`);
      addr3Data = await addr3Balance.json();
      expect(addr3Data.balance).toBe(6);
    });
  });
});
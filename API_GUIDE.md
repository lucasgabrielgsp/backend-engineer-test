# Blockchain Indexer API Guide

## Quick Start

### 1. Start the Application

```bash
# Using Docker
docker-compose up -d --build

# Or using Bun directly
bun install
bun start
```

### 2. Access Swagger Documentation

Once running, visit: **http://localhost:3000/documentation**

This provides an interactive API explorer where you can:
- View all endpoints with detailed descriptions
- See request/response schemas
- Try out API calls directly
- View example requests and responses

## API Endpoints

### Health Check
**GET** `/`

Check if the API is running and get the current blockchain height.

```bash
curl http://localhost:3000/
```

Response:
```json
{
  "status": "ok",
  "currentHeight": 0
}
```

---

### Submit Block
**POST** `/blocks`

Submit a new block to the blockchain.

#### Request Body:
```json
{
  "id": "hash_of_block",
  "height": 1,
  "transactions": [
    {
      "id": "tx1",
      "inputs": [],
      "outputs": [
        {
          "address": "addr1",
          "value": 100
        }
      ]
    }
  ]
}
```

#### Validation Rules:
1. **Height**: Must be exactly `current_height + 1`
2. **Block ID**: Must be SHA256 hash of `height + transaction_ids`
3. **Balance**: Total inputs must equal total outputs (except genesis block)
4. **No Double-Spending**: Cannot spend already-spent outputs

#### Example - Genesis Block:
```bash
curl -X POST http://localhost:3000/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    "height": 1,
    "transactions": [{
      "id": "tx1",
      "inputs": [],
      "outputs": [{
        "address": "addr1",
        "value": 1000
      }]
    }]
  }'
```

#### Example - Transfer Transaction:
```bash
# Block 2: Transfer from addr1 to addr2 and addr3
curl -X POST http://localhost:3000/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_CALCULATED_HASH",
    "height": 2,
    "transactions": [{
      "id": "tx2",
      "inputs": [{
        "txId": "tx1",
        "index": 0
      }],
      "outputs": [{
        "address": "addr2",
        "value": 400
      }, {
        "address": "addr3",
        "value": 600
      }]
    }]
  }'
```

---

### Get Balance
**GET** `/balance/:address`

Get the current unspent balance for an address.

```bash
curl http://localhost:3000/balance/addr1
```

Response:
```json
{
  "address": "addr1",
  "balance": 1000
}
```

---

### ⏪ Rollback Blockchain
**POST** `/rollback?height=:targetHeight`

Rollback the blockchain to a specific height.

```bash
curl -X POST "http://localhost:3000/rollback?height=5"
```

Response:
```json
{
  "success": true,
  "height": 5
}
```

**Limitations:**
- Cannot rollback more than 2000 blocks
- Cannot rollback to a future height

## Understanding UTXO Model

### Key Concepts:

1. **Outputs**: Assign value to addresses
2. **Inputs**: References to previous outputs being spent
3. **Balance**: Sum of all unspent outputs for an address
4. **Spending**: When an input references an output, that output becomes "spent"

### Example Flow:

```
Block 1 (Genesis):
  TX: Create 1000 coins for addr1
  Result: addr1 = 1000

Block 2:
  TX: addr1 sends 400 to addr2, 600 to addr3
  Inputs: [tx1:0] (spends addr1's 1000)
  Outputs: addr2=400, addr3=600
  Result: addr1 = 0, addr2 = 400, addr3 = 600

Block 3:
  TX: addr2 sends 100 to addr4, 300 back to addr2
  Inputs: [tx2:0] (spends addr2's 400)
  Outputs: addr4=100, addr2=300
  Result: addr1 = 0, addr2 = 300, addr3 = 600, addr4 = 100
```

## Calculating Block Hash

The block ID must be the SHA256 hash of: `height + transaction_ids`

### JavaScript Example:
```javascript
const crypto = require('crypto');

function calculateBlockHash(height, transactionIds) {
  const data = height.toString() + transactionIds.join('');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Example
const hash = calculateBlockHash(1, ['tx1']);
// Result: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
```

## Error Handling

All errors follow this format:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes:
- `INVALID_HEIGHT`: Block height is not sequential
- `INVALID_BLOCK_ID`: Block hash doesn't match expected value
- `VALUE_MISMATCH`: Input/output values don't balance
- `DOUBLE_SPEND`: Attempting to spend already-spent output
- `FUTURE_HEIGHT`: Rollback target is ahead of current height
- `EXCESSIVE_ROLLBACK`: Rollback exceeds 2000 block limit

## Testing the API

### 1. Complete Example Sequence:

```bash
# 1. Check API health
curl http://localhost:3000/

# 2. Submit genesis block
curl -X POST http://localhost:3000/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    "height": 1,
    "transactions": [{
      "id": "tx1",
      "inputs": [],
      "outputs": [{
        "address": "alice",
        "value": 1000
      }]
    }]
  }'

# 3. Check Alice's balance
curl http://localhost:3000/balance/alice

# 4. Transfer from Alice to Bob and Charlie
# First, calculate the hash for height=2 and tx_id="tx2"
# Hash = SHA256("2tx2") = "cd372fb85148700fa88095e3492d3f9f5beb43e555e5ff26d95f5a6adc36f8e6"

curl -X POST http://localhost:3000/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cd372fb85148700fa88095e3492d3f9f5beb43e555e5ff26d95f5a6adc36f8e6",
    "height": 2,
    "transactions": [{
      "id": "tx2",
      "inputs": [{
        "txId": "tx1",
        "index": 0
      }],
      "outputs": [{
        "address": "bob",
        "value": 300
      }, {
        "address": "charlie",
        "value": 700
      }]
    }]
  }'

# 5. Check all balances
curl http://localhost:3000/balance/alice    # Should be 0
curl http://localhost:3000/balance/bob      # Should be 300
curl http://localhost:3000/balance/charlie  # Should be 700

# 6. Rollback to block 1
curl -X POST "http://localhost:3000/rollback?height=1"

# 7. Check balances after rollback
curl http://localhost:3000/balance/alice    # Should be 1000 again
curl http://localhost:3000/balance/bob      # Should be 0
```

### 2. Testing Error Cases:

```bash
# Invalid height (skipping block)
curl -X POST http://localhost:3000/blocks \
  -H "Content-Type: application/json" \
  -d '{"id": "abc", "height": 5, "transactions": []}'

# Invalid block hash
curl -X POST http://localhost:3000/blocks \
  -H "Content-Type: application/json" \
  -d '{"id": "wrong_hash", "height": 2, "transactions": []}'

# Double spending
# Try to spend the same output twice
```

## Docker Commands

```bash
# Start the application
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Run tests
docker exec backend-engineer-test-api-1 bun test

# Stop the application
docker-compose down

# Reset everything (including database)
docker-compose down -v
```

## Environment Variables

Create a `.env` file to customize configuration:

```env
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/blockchain
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000

# Server
PORT=3000
HOST=0.0.0.0

# Blockchain
MAX_ROLLBACK_BLOCKS=2000

# Logging
LOG_LEVEL=info
```

## Additional Resources

- **Swagger UI**: http://localhost:3000/documentation
- **OpenAPI JSON**: http://localhost:3000/documentation/json
- **OpenAPI YAML**: http://localhost:3000/documentation/yaml
- **Architecture Documentation**: See `ARCHITECTURE.md`
- **README**: See `README.md` for setup instructions

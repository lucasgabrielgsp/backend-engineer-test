export const outputSchema = {
  type: 'object',
  required: ['address', 'value'],
  properties: {
    address: {
      type: 'string',
      description: 'The address receiving the output',
    },
    value: {
      type: 'number',
      minimum: 0,
      description: 'The value being transferred',
    },
  },
  additionalProperties: false,
};

export const inputSchema = {
  type: 'object',
  required: ['txId', 'index'],
  properties: {
    txId: {
      type: 'string',
      description: 'The transaction ID of the output being spent',
    },
    index: {
      type: 'number',
      minimum: 0,
      description: 'The index of the output in the transaction',
    },
  },
  additionalProperties: false,
};

export const transactionSchema = {
  type: 'object',
  required: ['id', 'inputs', 'outputs'],
  properties: {
    id: {
      type: 'string',
      description: 'Unique transaction identifier',
    },
    inputs: {
      type: 'array',
      description: 'List of inputs (references to previous outputs being spent)',
      items: inputSchema,
    },
    outputs: {
      type: 'array',
      description: 'List of outputs (new unspent transaction outputs)',
      items: outputSchema,
    },
  },
  additionalProperties: false,
};

export const blockSchema = {
  type: 'object',
  required: ['id', 'height', 'transactions'],
  properties: {
    id: {
      type: 'string',
      description: 'Block hash (SHA256 of height + transaction IDs)',
    },
    height: {
      type: 'number',
      minimum: 1,
      description: 'Block height (sequential number starting from 1)',
    },
    transactions: {
      type: 'array',
      description: 'List of transactions in the block',
      items: transactionSchema,
    },
  },
  additionalProperties: false,
};

export const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'string',
      description: 'Error message',
    },
    code: {
      type: 'string',
      description: 'Error code for programmatic handling',
    },
  },
  required: ['error'],
};

export const successSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Operation success status',
    },
    height: {
      type: 'number',
      description: 'Current blockchain height',
    },
  },
  required: ['success'],
};

export const balanceSchema = {
  type: 'object',
  properties: {
    address: {
      type: 'string',
      description: 'The address queried',
    },
    balance: {
      type: 'number',
      description: 'Current unspent balance for the address',
    },
  },
  required: ['address', 'balance'],
};

export const healthSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      description: 'API health status',
    },
    currentHeight: {
      type: 'number',
      description: 'Current blockchain height',
    },
  },
  required: ['status', 'currentHeight'],
};
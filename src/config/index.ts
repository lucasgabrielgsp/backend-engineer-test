export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/blockchain',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
  },
  blockchain: {
    maxRollbackBlocks: parseInt(process.env.MAX_ROLLBACK_BLOCKS || '2000'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
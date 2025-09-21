import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initializeDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migrations';
import { BlockchainService } from './services/BlockchainService';
import { blockchainRoutes } from './routes/blockchain';
import { config } from './config';
import { swaggerConfig, swaggerUiConfig } from './config/swagger';

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register Swagger
  await fastify.register(swagger, swaggerConfig);
  await fastify.register(swaggerUi, swaggerUiConfig);

  // Initialize database
  const pool = await initializeDatabase();
  await runMigrations(pool);

  // Initialize services
  const blockchainService = new BlockchainService(pool);

  // Register routes
  await fastify.register(blockchainRoutes, { blockchainService });

  // Graceful shutdown
  const closeGracefully = async () => {
    await fastify.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', closeGracefully);
  process.on('SIGINT', closeGracefully);

  return fastify;
}

export async function startServer() {
  try {
    const fastify = await createServer();

    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   Blockchain Indexer API                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║     Server running at:                                        ║
║     http://${config.server.host}:${config.server.port}                                    ║
║                                                                ║
║     API Documentation:                                        ║
║     http://${config.server.host}:${config.server.port}/documentation                      ║
║                                                                ║
║     OpenAPI Specification:                                    ║
║     http://${config.server.host}:${config.server.port}/documentation/json                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

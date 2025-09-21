# Architecture Documentation

## Overview
This blockchain indexer has been refactored to follow a clean, modular architecture with proper separation of concerns.

## Folder Structure

```
src/
├── config/           # Configuration management
│   ├── index.ts      # Centralized config with environment variables
│   └── swagger.ts    # Swagger/OpenAPI configuration
├── db/              # Database layer
│   ├── connection.ts # Connection pool management
│   └── migrations.ts # Database schema migrations
├── errors/          # Custom error classes
│   └── index.ts     # Error hierarchy (AppError, ValidationError, etc.)
├── repositories/    # Data access layer
│   ├── BlockRepository.ts
│   ├── TransactionRepository.ts
│   └── OutputRepository.ts
├── schemas/         # API schemas for Swagger/validation
│   └── index.ts     # OpenAPI schema definitions
├── services/        # Business logic layer
│   └── BlockchainService.ts
├── validators/      # Input validation
│   └── BlockValidator.ts
├── routes/          # API routes/controllers with Swagger docs
│   └── blockchain.ts # Routes with OpenAPI annotations
├── types.ts         # TypeScript type definitions
├── server.ts        # Server setup with Swagger UI integration
└── index.ts         # Application entry point

spec/
├── unit/           # Unit tests
│   └── validators/ # Validator tests
└── integration/    # Integration tests (existing tests)
```

## Architecture Improvements

### 1. **Separation of Concerns**
- **Repository Pattern**: Data access is isolated in repository classes
- **Service Layer**: Business logic is separated from API routes
- **Validation Layer**: Input validation is extracted to dedicated validators
- **Error Handling**: Custom error classes for different error types

### 2. **Database Management**
- **Connection Pooling**: Proper pool management with configurable size
- **Migrations**: Separate migration system for schema management
- **Transaction Support**: All operations use database transactions
- **Retry Logic**: Automatic retry for database connection

### 3. **Configuration**
- **Environment Variables**: All configuration via env vars
- **Centralized Config**: Single source of truth for configuration
- **Type Safety**: Typed configuration object

### 4. **Error Handling**
- **Error Hierarchy**: Different error types for different scenarios
  - `ValidationError`: Input validation failures (400)
  - `NotFoundError`: Resource not found (404)
  - `ConflictError`: Conflicts like double-spending (409)
  - `BlockchainError`: Blockchain-specific errors (400)
- **Proper HTTP Status Codes**: Each error type maps to appropriate status

### 5. **Testing**
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test full API functionality
- **Test Organization**: Tests organized by type and component

### 6. **Type Safety**
- **Strong Typing**: All functions and data structures are typed
- **Input Validation**: Runtime validation matches TypeScript types
- **No `any` Types**: Minimal use of `any` for better type safety

### 7. **API Documentation**
- **Swagger UI**: Interactive API documentation at `/documentation`
- **OpenAPI 3.0 Specification**: Auto-generated spec available as JSON/YAML
- **Schema Definitions**: All request/response schemas defined in `src/schemas/`
- **Interactive Testing**: "Try it out" functionality in Swagger UI
- **Error Documentation**: All error codes and scenarios documented with examples
- **Comprehensive Guide**: Detailed API usage guide in `API_GUIDE.md`

## Key Design Patterns

### Repository Pattern
- Encapsulates database queries
- Makes testing easier (can mock repositories)
- Separates business logic from data access

### Service Layer Pattern
- Contains all business logic
- Orchestrates repositories
- Handles transactions and complex operations

### Dependency Injection
- Services receive dependencies via constructor
- Makes testing and mocking easier
- Reduces coupling between components

### Error Boundary Pattern
- Centralized error handling in routes
- Consistent error response format
- Proper logging of unexpected errors

## Performance Optimizations

### Database
- **Connection Pooling**: Reuses database connections
- **Indexes**: Optimized queries with proper indexes
- **Batch Operations**: Processes multiple operations in single transaction
- **Prepared Statements**: Uses parameterized queries

### Application
- **Async/Await**: Non-blocking operations
- **Early Validation**: Fails fast on invalid input
- **Resource Cleanup**: Proper connection release in finally blocks

## Security Improvements

### Input Validation
- Validates all input before processing
- Type checking and range validation
- SQL injection prevention via parameterized queries

### Error Messages
- Doesn't leak internal implementation details
- Consistent error format
- Proper error codes for client handling

## Scalability Considerations

### Horizontal Scaling
- Stateless application (can run multiple instances)
- Database as single source of truth
- Connection pool sizing for concurrent requests

### Monitoring & Logging
- Structured logging with Pino
- Different log levels (configurable)
- Request/response logging

## Future Improvements

1. **Caching Layer**: Add Redis for balance queries
2. **Message Queue**: Process blocks asynchronously
3. **Rate Limiting**: Prevent abuse
4. **Metrics**: Prometheus metrics for monitoring
5. **Database Indexes**: Additional indexes based on query patterns
6. **Event Sourcing**: Store all state changes as events
7. **GraphQL API**: Alternative to REST for flexible queries

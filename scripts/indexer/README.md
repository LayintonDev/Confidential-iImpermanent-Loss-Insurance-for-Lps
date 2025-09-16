# Event Indexer

## Overview

The Event Indexer is a Node.js service that listens for blockchain events from the Confidential IL Insurance contracts and processes claim requests through the Fhenix service.

## Features

- **Real-time Event Listening**: Monitors `PolicyCreated` and `ClaimRequested` events
- **Automatic Claim Processing**: Forwards claim data to Fhenix service for IL calculation
- **Retry Logic**: Robust error handling with configurable retry attempts
- **Past Events Catch-up**: Processes historical events on startup
- **Memory Storage**: Simple in-memory storage for MVP (database integration in production)

## Quick Start

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Configure Environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and Run**:
   ```bash
   npm run build
   npm start
   ```

## Configuration

### Environment Variables

| Variable                 | Description                             | Default                 |
| ------------------------ | --------------------------------------- | ----------------------- |
| `RPC_URL`                | Blockchain RPC endpoint                 | `http://localhost:8545` |
| `HOOK_CONTRACT_ADDRESS`  | ConfidentialILHook contract address     | Required                |
| `POLICY_MANAGER_ADDRESS` | PolicyManager contract address          | Required                |
| `FHENIX_SERVICE_URL`     | Fhenix service endpoint                 | `http://localhost:3001` |
| `MAX_RETRIES`            | Maximum retry attempts for Fhenix calls | `3`                     |
| `RETRY_DELAY`            | Delay between retries (ms)              | `5000`                  |

### Example .env

```bash
# Blockchain Configuration
RPC_URL=http://localhost:8545
HOOK_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
POLICY_MANAGER_ADDRESS=0x0987654321098765432109876543210987654321

# Fhenix Service Configuration
FHENIX_SERVICE_URL=http://localhost:3001
MAX_RETRIES=3
RETRY_DELAY=5000
```

## Architecture

### Event Flow

1. **PolicyCreated Event**: Stores policy metadata for future claim processing
2. **ClaimRequested Event**: Triggers IL calculation workflow:
   - Retrieves policy data and entry commitment
   - Calls Fhenix service with encrypted data
   - Logs results (Phase 5 will integrate with AVS)

### Data Structures

```typescript
interface PolicyCreatedEvent {
  policyId: bigint;
  lp: string;
  pool: string;
  epoch: bigint;
}

interface ClaimRequestedEvent {
  policyId: bigint;
  commitmentC: string;
}
```

### Fhenix Service Integration

The indexer communicates with the Fhenix service using standardized request/response formats:

```typescript
interface FhenixRequest {
  policyId: number;
  entryCommit: string;
  exitCommit: string;
  publicRefs: {
    twapRoot: string;
    pool: string;
  };
}

interface FhenixResponse {
  policyId: number;
  payout: string;
  auditHash: string;
  fhenixSignature: string;
  workerId: string;
}
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled indexer
- `npm run dev` - Run in development mode with ts-node
- `npm run clean` - Clean build artifacts

## Development

### Running in Development

```bash
npm run dev
```

### CLI Usage

The indexer can be run directly:

```bash
npx ts-node src/cli.ts
```

### Status Monitoring

The indexer logs status information every minute:

- Number of processed events
- Number of policies tracked
- Number of claim requests processed

## Error Handling

- **Network Issues**: Automatic retry with exponential backoff
- **Invalid Events**: Logged and skipped
- **Fhenix Service Failures**: Retry logic with configurable attempts
- **Missing Policy Data**: Graceful error handling with detailed logging

## Future Enhancements

- **Database Integration**: Replace in-memory storage with persistent database
- **AVS Integration**: Phase 5 will add attestation workflow
- **Metrics & Monitoring**: Prometheus metrics and health checks
- **Load Balancing**: Multiple indexer instances for high availability
- **Event Filtering**: Advanced filtering based on policy criteria

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check RPC_URL and network connectivity
2. **Contract Not Found**: Verify contract addresses in .env
3. **Fhenix Service Unavailable**: Ensure service is running on configured URL

### Logs

The indexer provides detailed logging with emojis for easy identification:

- 🚀 Startup information
- 📡 Event listening setup
- 🎯 Claim request processing
- ❌ Error conditions
- ✅ Successful operations

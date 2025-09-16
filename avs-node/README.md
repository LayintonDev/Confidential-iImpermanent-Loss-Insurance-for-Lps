# Confidential IL Insurance AVS Node

This is the EigenLayer AVS (Actively Validated Service) node implementation for the Confidential Impermanent Loss Insurance protocol.

## Overview

The AVS Node is responsible for:

- Participating in multi-operator consensus for claim validation
- Verifying Fhenix signatures for confidential computation results
- Aggregating operator signatures for threshold consensus
- Processing claim settlements through the EigenAVS Manager contract
- Monitoring operator behavior and handling slashing events

## Architecture

### Core Components

1. **AVSNode**: Main node implementation handling operator registration and attestation processing
2. **AVSRegistry**: Service for monitoring on-chain events and operator status
3. **SignatureAggregator**: Handles signature aggregation for threshold consensus (planned for Phase 5 Day 3)
4. **P2PNetwork**: Peer-to-peer communication between operators (planned for Phase 5 Day 3)

### Key Features

- **Operator Management**: Registration, deregistration, and stake updates
- **Attestation Processing**: Verification of Fhenix signatures and claim validation
- **Consensus Participation**: Multi-operator threshold signatures
- **Settlement Integration**: Automatic claim processing after consensus
- **Slashing Protection**: Fraud detection and penalty mechanisms
- **Health Monitoring**: Node status and performance tracking

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Access to Ethereum RPC endpoint
- Operator private key with sufficient stake

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

### Required Environment Variables

- `OPERATOR_PRIVATE_KEY`: Private key for the operator account
- `OPERATOR_ADDRESS`: Ethereum address of the operator
- `AVS_MANAGER_ADDRESS`: Address of the EigenAVSManager contract
- `RPC_URL`: Ethereum RPC endpoint URL

### Optional Configuration

- `MINIMUM_STAKE`: Minimum stake required (default: 1 ETH)
- `SIGNATURE_THRESHOLD`: Number of signatures required for consensus
- `API_PORT`: Port for the health check API (default: 3000)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Health Check

The node exposes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response example:

```json
{
  "status": "healthy",
  "uptime": 3600000,
  "lastActivity": "2024-01-15T10:30:00.000Z",
  "operator": {
    "isActive": true,
    "stake": "1000000000000000000",
    "slashingHistory": 0
  },
  "errors": []
}
```

## API Reference

### Events

The AVS Node emits the following events:

#### Attestation Events

- `attestation-request`: Incoming claim validation request
- `attestation-response`: Operator's attestation response
- `consensus-reached`: Threshold consensus achieved

#### Operator Events

- `operator-registered`: Operator successfully registered
- `operator-slashed`: Operator penalized for misbehavior

#### Settlement Events

- `settlement-processed`: Claim settlement completed

### Methods

#### Core Operations

- `start()`: Initialize and start the AVS node
- `stop()`: Gracefully shutdown the node
- `registerOperator(config)`: Register as an AVS operator
- `submitAttestation(request)`: Process attestation request

#### Status Queries

- `getOperatorStatus()`: Get current operator information
- `getHealth()`: Get node health and performance metrics

## Consensus Mechanism

### Phase 5 MVP Implementation

1. **Attestation Request**: Fhenix service submits IL calculation with signature
2. **Signature Verification**: Each operator verifies the Fhenix signature
3. **Operator Attestation**: Operators submit their approval/rejection
4. **Threshold Consensus**: Aggregate signatures when threshold is met
5. **Settlement**: Execute claim payout through AVS Manager contract

### Future Enhancements

- BLS signature aggregation for efficiency
- Advanced fraud detection algorithms
- Dynamic threshold adjustment
- Cross-chain settlement support

## Security Considerations

### Operator Requirements

- Minimum stake of 1 ETH (configurable)
- Valid registration with EigenLayer
- Secure key management practices

### Slashing Conditions

- Invalid signature generation
- Failure to participate in consensus
- Malicious behavior detection
- Downtime penalties

### Best Practices

- Use hardware security modules for key storage
- Monitor node health and performance
- Keep software updated
- Maintain reliable network connectivity

## Monitoring

### Logs

The node generates structured logs for:

- Attestation processing events
- Consensus participation
- Error conditions and recoveries
- Performance metrics

### Metrics

Key metrics to monitor:

- Attestation success rate
- Consensus participation rate
- Node uptime and availability
- Signature verification latency

## Troubleshooting

### Common Issues

1. **Registration Failed**

   - Check operator has sufficient stake
   - Verify AVS Manager contract address
   - Ensure operator is not already registered

2. **Signature Verification Failed**

   - Validate Fhenix signature format
   - Check policy ID and payout amounts
   - Verify network connectivity

3. **Consensus Timeout**
   - Check other operators are online
   - Verify signature threshold configuration
   - Monitor network latency

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

## Development

### Project Structure

```
src/
├── interfaces.ts          # Core interfaces and types
├── AVSNode.ts            # Main node implementation
├── AVSRegistry.ts        # Event monitoring service
├── utils/
│   └── Logger.ts         # Logging utility
└── index.ts              # Entry point and configuration
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

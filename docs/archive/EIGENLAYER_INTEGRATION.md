# EigenLayer Integration Configuration

## Environment Variables for Real EigenLayer Integration

```bash
# EigenLayer Core Contract Addresses (Holesky Testnet)
EIGENLAYER_DELEGATION_MANAGER=0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A
EIGENLAYER_AVS_DIRECTORY=0x055733000064333CaDDbC92763c58BF0192fFeBf
EIGENLAYER_REGISTRY_COORDINATOR=0x53012C69A189cfA2D9d29eb6F19B32e0A2EA3490
EIGENLAYER_STAKE_REGISTRY=0x006124Ae7976137266feeBFb3F4043C3101820BA

# Mainnet Addresses (for production)
# EIGENLAYER_DELEGATION_MANAGER=0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A
# EIGENLAYER_AVS_DIRECTORY=0x135DDa560e946695d6f155dACaFC6f1F25C1F5AF
# EIGENLAYER_REGISTRY_COORDINATOR=0x0BAAc79acD45A023E19345c352C0a519b82C2Ad1
# EIGENLAYER_STAKE_REGISTRY=0x006124Ae7976137266feeBFb3F4043C3101820BA

# Operator Configuration
OPERATOR_PRIVATE_KEY=your_operator_private_key_here
OPERATOR_ADDRESS=your_operator_address_here
MINIMUM_STAKE=1000000000000000000  # 1 ETH in wei

# AVS Configuration
AVS_MANAGER_ADDRESS=your_deployed_service_manager_address
SIGNATURE_THRESHOLD=6700  # 67% in basis points
CONSENSUS_THRESHOLD=2
OPERATOR_COUNT=3

# Network Configuration
RPC_URL=https://ethereum-holesky.publicnode.com
WS_URL=wss://ethereum-holesky.publicnode.com
CHAIN_ID=17000

# P2P Configuration (for multi-operator coordination)
P2P_PORT=9000
P2P_PEERS=operator1:9000,operator2:9000,operator3:9000
MAX_CONNECTIONS=50

# API Configuration
API_ENABLED=true
API_PORT=3000
CORS_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/avs-node.log
```

## Deployment Steps

### 1. Deploy EigenLayer Service Manager

```bash
# Deploy the service manager contract
forge script script/DeployEigenLayerServiceManager.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

### 2. Register as EigenLayer Operator

```bash
# Set environment variables
export OPERATOR_PRIVATE_KEY="your_private_key"
export EIGENLAYER_DELEGATION_MANAGER="0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A"

# Run the AVS node registration
cd avs-node
npm run register-operator
```

### 3. Start AVS Node

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the node
npm start
```

## Integration Checklist

### ✅ Completed

- [x] Real BLS signature aggregation using noble-curves
- [x] EigenLayer operator registration flow
- [x] Service manager contract integration
- [x] Task creation and response system
- [x] Updated smart contracts for BLS verification

### 🔄 Next Steps (Production Requirements)

- [ ] Deploy to EigenLayer Holesky testnet
- [ ] Register with actual EigenLayer contracts
- [ ] Set up multiple operator nodes
- [ ] Implement P2P networking for consensus
- [ ] Add slashing mechanism integration
- [ ] Production monitoring and alerting

## Key Changes Made

1. **Dependencies**: Added BLS12-381 cryptography libraries
2. **Contracts**: Created EigenLayerServiceManager.sol and EigenAVSManagerV2.sol
3. **Operator SDK**: Implemented real EigenLayer operator registration
4. **Signature Aggregation**: Replaced ECDSA with BLS signatures
5. **Task System**: Implemented EigenLayer's task-based attestation model

## Testing

```bash
# Run AVS node tests
cd avs-node
npm test

# Test BLS signature aggregation
npm run test:bls

# Integration test with EigenLayer
npm run test:integration
```

## Production Deployment

For production deployment, ensure:

1. Sufficient operator stake (minimum 32 ETH recommended)
2. Proper key management and security
3. Multiple geographically distributed operators
4. Monitoring and alerting setup
5. Slashing protection mechanisms

# ConfidentialInsuranceSpec - EigenCompute Integration

This project contains auto-generated **Rust server** and **Solidity contracts** for integrating **ConfidentialInsuranceSpec** with the EigenCompute network.

## 📁 Project Structure

```
ConfidentialInsuranceSpec/
├── src/                                 # Rust Server
│   ├── main.rs                          # YOUR CODE HERE (see marked sections)
│   ├── lib.rs                           # Library exports (auto-generated)
│   └── gen/                             # Auto-generated code (DO NOT EDIT)
│       ├── mod.rs                       # Server setup and utilities
│       ├── server.rs                    # Server trait definitions
│       ├── types.rs                     # Generated types
│       ├── IConfidentialInsuranceSpec.openrpc.json        # OpenRPC specification
│       └── IConfidentialInsuranceSpec.abi.json                 # Contract ABI
├── contracts/                           # Solidity Contracts
│   ├── src/
│   │   ├── ConfidentialInsurance.sol # YOUR CONTRACT CODE
│   │   └── gen/                         # Auto-generated (DO NOT EDIT)
│   │       ├── ConfidentialInsuranceReceiver.sol    # Abstract receiver contract
│   │       └── interfaces/
│   │           ├── IConfidentialInsurance.sol # Async interface
│   │           └── IExecutionCallback.sol # Callback interface
│   ├── script/
│   │   └── DeployConfidentialInsurance.s.sol # Deployment script
│   └── foundry.toml                     # Foundry configuration
├── Cargo.toml                           # Rust dependencies
├── Dockerfile                           # Container setup
└── README.md                           # This file
```

## 🚀 Quick Start

### Prerequisites
- [Rust](https://rustup.rs/) 1.70+
- [Foundry](https://getfoundry.sh/) installed
- Docker (optional)

### Run Rust Server
```bash
# Run locally
cargo run

# Or with Docker
docker build -t confidentialinsurance-server .
docker run -p 8080:8080 confidentialinsurance-server
```

### Setup Solidity Contracts
```bash
cd contracts
git init # if not in a git repo
forge soldeer install
forge build
forge test
```

## 🦀 Rust Server

### Implementation
The server implements JSON-RPC methods with `compute_` prefix:

#### `compute_aggregateAttestations`
Function aggregateAttestations from IConfidentialInsuranceSpec

* **Parameters**: `Vec<U256> attestations`, `Vec<Bytes> signatures`, `Vec<Bytes> operator_public_keys`, `U256 threshold`
* **Returns**: `(U256, bool)`

#### `compute_calculateImpermanentLoss`
Function calculateImpermanentLoss from IConfidentialInsuranceSpec

* **Parameters**: `U256 initial_token_a_amount`, `U256 initial_token_b_amount`, `U256 current_token_a_price`, `U256 current_token_b_price`, `U256 initial_token_a_price`, `U256 initial_token_b_price`, `U256 pool_fee_rate`
* **Returns**: `(U256, bool)`

#### `compute_calculatePayout`
Function calculatePayout from IConfidentialInsuranceSpec

* **Parameters**: `U256 policy_id`, `U256 impermanent_loss`, `U256 coverage_amount`, `U256 deductible`, `U256 coverage_ratio`
* **Returns**: `U256`

#### `compute_validateOraclePrices`
Function validateOraclePrices from IConfidentialInsuranceSpec

* **Parameters**: `Vec<U256> price_data`, `Vec<U256> timestamps`, `U256 deviation_threshold`
* **Returns**: `(bool, Vec<U256>)`

#### `compute_verifyEncryptedAttestation`
Function verifyEncryptedAttestation from IConfidentialInsuranceSpec

* **Parameters**: `Bytes encrypted_attestation`, `Bytes proof`, `Vec<U256> public_inputs`
* **Returns**: `(bool, U256)`


### Server Endpoints
- **JSON-RPC**: `http://localhost:8080/`
- **Health Check**: Call `system_health` method

### Example Client Calls
```bash
# Call the aggregateAttestations method
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compute_aggregateAttestations",
    "params": ["example_attestations", "example_signatures", "example_operator_public_keys", "example_threshold"],
    "id": 1
  }'
```
```bash
# Call the calculateImpermanentLoss method
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compute_calculateImpermanentLoss",
    "params": ["example_initial_token_a_amount", "example_initial_token_b_amount", "example_current_token_a_price", "example_current_token_b_price", "example_initial_token_a_price", "example_initial_token_b_price", "example_pool_fee_rate"],
    "id": 1
  }'
```
```bash
# Call the calculatePayout method
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compute_calculatePayout",
    "params": ["example_policy_id", "example_impermanent_loss", "example_coverage_amount", "example_deductible", "example_coverage_ratio"],
    "id": 1
  }'
```
```bash
# Call the validateOraclePrices method
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compute_validateOraclePrices",
    "params": ["example_price_data", "example_timestamps", "example_deviation_threshold"],
    "id": 1
  }'
```
```bash
# Call the verifyEncryptedAttestation method
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compute_verifyEncryptedAttestation",
    "params": ["example_encrypted_attestation", "example_proof", "example_public_inputs"],
    "id": 1
  }'
```

### Customize Implementation
Edit the trait implementation in `src/main.rs`:

```rust
impl ConfidentialInsuranceRpcServer for ConfidentialInsuranceServer {
    async fn aggregate_attestations(&self, attestations: Vec<U256>, signatures: Vec<Bytes>, operator_public_keys: Vec<Bytes>, threshold: U256) -> RpcResult<(U256, bool)> {
        // TODO: Implement your aggregateAttestations logic here
        
        // Example implementation:
        // 1. Process input parameters
        // 2. Perform computation
        // 3. Return result
        
        Err(ErrorObject::owned(-32603, "Method not implemented", None::<()>).into())
    }

    async fn calculate_impermanent_loss(&self, initial_token_a_amount: U256, initial_token_b_amount: U256, current_token_a_price: U256, current_token_b_price: U256, initial_token_a_price: U256, initial_token_b_price: U256, pool_fee_rate: U256) -> RpcResult<(U256, bool)> {
        // TODO: Implement your calculateImpermanentLoss logic here
        
        // Example implementation:
        // 1. Process input parameters
        // 2. Perform computation
        // 3. Return result
        
        Err(ErrorObject::owned(-32603, "Method not implemented", None::<()>).into())
    }

    async fn calculate_payout(&self, policy_id: U256, impermanent_loss: U256, coverage_amount: U256, deductible: U256, coverage_ratio: U256) -> RpcResult<U256> {
        // TODO: Implement your calculatePayout logic here
        
        // Example implementation:
        // 1. Process input parameters
        // 2. Perform computation
        // 3. Return result
        
        Err(ErrorObject::owned(-32603, "Method not implemented", None::<()>).into())
    }

    async fn validate_oracle_prices(&self, price_data: Vec<U256>, timestamps: Vec<U256>, deviation_threshold: U256) -> RpcResult<(bool, Vec<U256>)> {
        // TODO: Implement your validateOraclePrices logic here
        
        // Example implementation:
        // 1. Process input parameters
        // 2. Perform computation
        // 3. Return result
        
        Err(ErrorObject::owned(-32603, "Method not implemented", None::<()>).into())
    }

    async fn verify_encrypted_attestation(&self, encrypted_attestation: Bytes, proof: Bytes, public_inputs: Vec<U256>) -> RpcResult<(bool, U256)> {
        // TODO: Implement your verifyEncryptedAttestation logic here
        
        // Example implementation:
        // 1. Process input parameters
        // 2. Perform computation
        // 3. Return result
        
        Err(ErrorObject::owned(-32603, "Method not implemented", None::<()>).into())
    }

}
```

## 📋 Solidity Contracts

### ConfidentialInsuranceReceiver
**Abstract receiver contract** that handles EigenCompute integration:
- ✅ Implements `IExecutionCallback` for async result handling
- ✅ Implements `IConfidentialInsurance` for the async interface
- ✅ Routes all function calls through EigenCompute network
- ✅ Provides abstract callback methods for result handling

### ConfidentialInsurance
**Concrete implementation** ready for customization:
- ✅ Extends `ConfidentialInsuranceReceiver`
- ✅ Provides template implementations for all callback methods
- 🔧 **TODO**: Implement your business logic in the callback methods

### `aggregateAttestations(uint256[] attestations, bytes[] signatures, bytes[] operator_public_keys, uint256 threshold) → uint256 taskId`
Function aggregateAttestations from IConfidentialInsuranceSpec

**Callback Method**: `_onAggregateAttestations(uint256 taskId, (uint256,bool) result, string memory error)`

### `calculateImpermanentLoss(uint256 initial_token_a_amount, uint256 initial_token_b_amount, uint256 current_token_a_price, uint256 current_token_b_price, uint256 initial_token_a_price, uint256 initial_token_b_price, uint256 pool_fee_rate) → uint256 taskId`
Function calculateImpermanentLoss from IConfidentialInsuranceSpec

**Callback Method**: `_onCalculateImpermanentLoss(uint256 taskId, (uint256,bool) result, string memory error)`

### `calculatePayout(uint256 policy_id, uint256 impermanent_loss, uint256 coverage_amount, uint256 deductible, uint256 coverage_ratio) → uint256 taskId`
Function calculatePayout from IConfidentialInsuranceSpec

**Callback Method**: `_onCalculatePayout(uint256 taskId, uint256 result, string memory error)`

### `validateOraclePrices(uint256[] price_data, uint256[] timestamps, uint256 deviation_threshold) → uint256 taskId`
Function validateOraclePrices from IConfidentialInsuranceSpec

**Callback Method**: `_onValidateOraclePrices(uint256 taskId, (bool,uint256[]) result, string memory error)`

### `verifyEncryptedAttestation(bytes encrypted_attestation, bytes proof, uint256[] public_inputs) → uint256 taskId`
Function verifyEncryptedAttestation from IConfidentialInsuranceSpec

**Callback Method**: `_onVerifyEncryptedAttestation(uint256 taskId, (bool,uint256) result, string memory error)`


## 🔄 Code Regeneration

This project uses a clean separation between generated code and user code:

### ✅ Safe to Edit (Your Code)
- **`src/main.rs`** - Implement your logic in the trait methods
- **`contracts/src/ConfidentialInsurance.sol`** - Your Solidity contract customizations

### ⚠️ Auto-Generated (DO NOT EDIT)
- `src/gen/` - All generated Rust code (server traits, types, setup)
- `contracts/src/gen/` - All generated Solidity contracts and interfaces
- `Cargo.toml`, `Dockerfile`, `package.json` - Build configurations
- `contracts/foundry.toml`, `contracts/script/` - Contract deployment setup

### 📝 How to Edit main.rs
After first generation, `src/main.rs` becomes **your file**. Simply implement your logic in the trait methods:
```rust
#[async_trait::async_trait]
impl MyServiceRpcServer for ServerImpl {
    async fn my_method(&self, param: String) -> RpcResult<String> {
        // Replace not_implemented() with your actual logic
        Ok("Hello World".to_string())
    }
}
```
**The file won't be overwritten on regeneration** - only `src/gen/` gets updated.

### Regenerating Your Project
When you need to update your project (e.g., after changing your Solidity interface):

```bash
# This will regenerate all auto-generated files while preserving your code
npm run regenerate
```

Your implementations in `src/main.rs` and `contracts/src/ConfidentialInsurance.sol` will be preserved.

## 🔧 Implementation Workflow

### 1. Implement Rust Server Logic
```rust
// In src/main.rs (between the marked sections)
#[async_trait::async_trait]
impl ConfidentialInsuranceRpcServer for ServerImpl {
    async fn aggregate_attestations(&self, attestations: Vec<U256>, signatures: Vec<Bytes>, operator_public_keys: Vec<Bytes>, threshold: U256) -> RpcResult<(U256, bool)> {
        // Your computation logic here
        Ok(result)
    }
    async fn calculate_impermanent_loss(&self, initial_token_a_amount: U256, initial_token_b_amount: U256, current_token_a_price: U256, current_token_b_price: U256, initial_token_a_price: U256, initial_token_b_price: U256, pool_fee_rate: U256) -> RpcResult<(U256, bool)> {
        // Your computation logic here
        Ok(result)
    }
    async fn calculate_payout(&self, policy_id: U256, impermanent_loss: U256, coverage_amount: U256, deductible: U256, coverage_ratio: U256) -> RpcResult<U256> {
        // Your computation logic here
        Ok(result)
    }
    async fn validate_oracle_prices(&self, price_data: Vec<U256>, timestamps: Vec<U256>, deviation_threshold: U256) -> RpcResult<(bool, Vec<U256>)> {
        // Your computation logic here
        Ok(result)
    }
    async fn verify_encrypted_attestation(&self, encrypted_attestation: Bytes, proof: Bytes, public_inputs: Vec<U256>) -> RpcResult<(bool, U256)> {
        // Your computation logic here
        Ok(result)
    }
}
```

### 2. Customize Solidity Callbacks
```solidity
// In contracts/src/ConfidentialInsurance.sol
function _onAggregateAttestations(
    uint256 taskId, 
    (uint256,bool) result, 
    string memory error
) internal override {
    if (bytes(error).length > 0) {
        emit AggregateAttestationsError(taskId, error);
        return;
    }
    
    // Handle successful result
    emit AggregateAttestationsSuccess(taskId, result);
}
function _onCalculateImpermanentLoss(
    uint256 taskId, 
    (uint256,bool) result, 
    string memory error
) internal override {
    if (bytes(error).length > 0) {
        emit CalculateImpermanentLossError(taskId, error);
        return;
    }
    
    // Handle successful result
    emit CalculateImpermanentLossSuccess(taskId, result);
}
function _onCalculatePayout(
    uint256 taskId, 
    uint256 result, 
    string memory error
) internal override {
    if (bytes(error).length > 0) {
        emit CalculatePayoutError(taskId, error);
        return;
    }
    
    // Handle successful result
    emit CalculatePayoutSuccess(taskId, result);
}
function _onValidateOraclePrices(
    uint256 taskId, 
    (bool,uint256[]) result, 
    string memory error
) internal override {
    if (bytes(error).length > 0) {
        emit ValidateOraclePricesError(taskId, error);
        return;
    }
    
    // Handle successful result
    emit ValidateOraclePricesSuccess(taskId, result);
}
function _onVerifyEncryptedAttestation(
    uint256 taskId, 
    (bool,uint256) result, 
    string memory error
) internal override {
    if (bytes(error).length > 0) {
        emit VerifyEncryptedAttestationError(taskId, error);
        return;
    }
    
    // Handle successful result
    emit VerifyEncryptedAttestationSuccess(taskId, result);
}
```

### 3. Deploy Your Service

This project includes pre-configured npm scripts for easy deployment using the EigenCompute CLI:

```bash
# Set your private key (recommended approach)
export PRIVATE_KEY=0x123...

# Interactive deployment (recommended) - prompts for deployment type
npm run deploy

# Deploy only offchain component (Docker to EigenDA)
npm run deploy:offchain

# Deploy only onchain component (smart contracts)
npm run deploy:onchain

# Deploy both components
npm run deploy:both
```

**Alternative: Direct CLI usage**
```bash
# Interactive deployment - prompts to choose between offchain, onchain, or both
export PRIVATE_KEY=0x123...
npx @eigenlayer/compute-cli deploy --dockerfile ./Dockerfile --contract-path ./contracts/src/ConfidentialInsurance.sol

# Deploy to custom network
export PRIVATE_KEY=0x123...
npx @eigenlayer/compute-cli deploy --dockerfile ./Dockerfile --contract-path ./contracts/src/ConfidentialInsurance.sol --network 1337 --rpc http://localhost:8545
```

**Manual contract deployment (if needed)**
```bash
cd contracts
forge script script/DeployConfidentialInsurance.s.sol --rpc-url <rpc_url> --private-key <private_key> --broadcast
```

### 4. Test Integration
```solidity
// Call aggregateAttestations async function
uint256 taskId = ConfidentialInsurance.aggregateAttestations(exampleAggregateAttestations, exampleAggregateAttestations, exampleAggregateAttestations, exampleAggregateAttestations);
// Result delivered via _onAggregateAttestations callback automatically
```
```solidity
// Call calculateImpermanentLoss async function
uint256 taskId = ConfidentialInsurance.calculateImpermanentLoss(exampleCalculateImpermanentLoss, exampleCalculateImpermanentLoss, exampleCalculateImpermanentLoss, exampleCalculateImpermanentLoss, exampleCalculateImpermanentLoss, exampleCalculateImpermanentLoss, exampleCalculateImpermanentLoss);
// Result delivered via _onCalculateImpermanentLoss callback automatically
```
```solidity
// Call calculatePayout async function
uint256 taskId = ConfidentialInsurance.calculatePayout(exampleCalculatePayout, exampleCalculatePayout, exampleCalculatePayout, exampleCalculatePayout, exampleCalculatePayout);
// Result delivered via _onCalculatePayout callback automatically
```
```solidity
// Call validateOraclePrices async function
uint256 taskId = ConfidentialInsurance.validateOraclePrices(exampleValidateOraclePrices, exampleValidateOraclePrices, exampleValidateOraclePrices);
// Result delivered via _onValidateOraclePrices callback automatically
```
```solidity
// Call verifyEncryptedAttestation async function
uint256 taskId = ConfidentialInsurance.verifyEncryptedAttestation(exampleVerifyEncryptedAttestation, exampleVerifyEncryptedAttestation, exampleVerifyEncryptedAttestation);
// Result delivered via _onVerifyEncryptedAttestation callback automatically
```

## 📊 Package Information
- **Package Name**: `confidentialinsurance-server`
- **Version**: `1.0.0`
- **Generated**: 2025-09-18T08:58:42.901Z

## 📚 Learn More

- [EigenCompute Documentation](https://docs.eigencloud.xyz/)
- [Rust JSON-RPC Guide](https://docs.rs/jsonrpsee/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Documentation](https://docs.soliditylang.org/)

---

*Generated by [EigenCompute Codegen](https://github.com/Layr-Labs/compute-app-avs) on 2025-09-18T08:58:42.901Z*

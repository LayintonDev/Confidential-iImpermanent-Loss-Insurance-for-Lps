# IConfidentialInsuranceSpec Contracts

Generated Solidity contracts for IConfidentialInsuranceSpec.

## Setup

1. Initialize git repository (required for Foundry):
   ```bash
   git init
   ```

2. Install dependencies:
   ```bash
   forge soldeer install
   ```

3. Build contracts:
   ```bash
   forge build
   ```

4. Run tests:
   ```bash
   forge test
   ```

## Deployment

Deploy the ConfidentialInsurance contract:

```bash
forge script script/DeployConfidentialInsurance.s.sol --rpc-url <RPC_URL> --private-key <PRIVATE_KEY> --broadcast
```

## Generated Files

- `src/ConfidentialInsurance.sol` - Main contract implementation
- `src/spec/IConfidentialInsuranceSpec.sol` - Contract interface specification
- `src/gen/ConfidentialInsuranceReceiver.sol` - Base receiver contract
- `src/gen/interfaces/IExecutionCallback.sol` - Execution callback interface
- `script/DeployConfidentialInsurance.s.sol` - Deployment script

## Generated on

2025-09-18T08:58:42.978Z

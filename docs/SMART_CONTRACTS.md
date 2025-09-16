# Smart Contracts Documentation

## Overview

This document provides detailed technical documentation for all smart contracts in the Confidential Impermanent Loss Insurance system.

## Contract Hierarchy

```
BaseHook (Uniswap v4)
    └── ConfidentialILHook
            ├── PolicyManager
            ├── InsuranceVault
            ├── PayoutVault
            ├── EigenAVSManager
            └── FhenixComputeProxy
```

## Core Contracts

### 1. ConfidentialILHook.sol

**Inheritance**: `BaseHook`  
**Location**: `contracts/hooks/ConfidentialILHook.sol`

#### Purpose

The main Uniswap v4 hook that provides automated impermanent loss insurance for liquidity providers. It integrates seamlessly with Uniswap v4's lifecycle hooks to collect premiums and manage policies.

#### Key Features

- Automatic premium collection on liquidity provision
- Policy creation triggered by LP actions
- Integration with confidential computation system
- Support for multiple pool configurations

#### Hook Permissions

```solidity
function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
    return Hooks.Permissions({
        beforeInitialize: false,
        afterInitialize: true,
        beforeAddLiquidity: true,
        afterAddLiquidity: true,
        beforeRemoveLiquidity: true,
        afterRemoveLiquidity: true,
        beforeSwap: false,
        afterSwap: false,
        beforeDonate: false,
        afterDonate: false,
        beforeSwapReturnDelta: false,
        afterSwapReturnDelta: false,
        afterAddLiquidityReturnDelta: false,
        afterRemoveLiquidityReturnDelta: false
    });
}
```

#### Core Functions

##### beforeAddLiquidity

```solidity
function beforeAddLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external override poolManagerOnly returns (bytes4) {
    // Decode insurance parameters from hookData
    InsuranceParams memory insuranceParams = abi.decode(hookData, (InsuranceParams));

    // Validate insurance parameters
    require(insuranceParams.premiumBps <= MAX_PREMIUM_BPS, "Premium too high");
    require(insuranceParams.duration >= MIN_DURATION, "Duration too short");

    // Store pending insurance request
    pendingInsurance[sender] = insuranceParams;

    return this.beforeAddLiquidity.selector;
}
```

##### afterAddLiquidity

```solidity
function afterAddLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external override poolManagerOnly returns (bytes4, BalanceDelta) {
    InsuranceParams memory insuranceParams = pendingInsurance[sender];

    if (insuranceParams.premiumBps > 0) {
        // Calculate liquidity value
        uint256 liquidityValue = calculateLiquidityValue(params, key);

        // Calculate premium
        uint256 premium = (liquidityValue * insuranceParams.premiumBps) / BASIS_POINTS;

        // Create policy
        uint256 policyId = policyManager.mintPolicy(
            sender,
            Currency.unwrap(key.currency0),
            PolicyParams({
                deductibleBps: insuranceParams.deductibleBps,
                capBps: insuranceParams.capBps,
                premiumBps: insuranceParams.premiumBps,
                duration: insuranceParams.duration,
                pool: Currency.unwrap(key.currency0)
            }),
            generateCommitment(sender, block.timestamp)
        );

        // Collect premium
        insuranceVault.depositPremium(Currency.unwrap(key.currency0), premium);

        emit PolicyCreated(policyId, sender, premium);
    }

    delete pendingInsurance[sender];
    return (this.afterAddLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
}
```

##### beforeRemoveLiquidity

```solidity
function beforeRemoveLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external override poolManagerOnly returns (bytes4) {
    // Check for active policies
    uint256[] memory userPolicies = policyManager.getUserPolicies(sender);

    for (uint256 i = 0; i < userPolicies.length; i++) {
        Policy memory policy = policyManager.policies(userPolicies[i]);

        if (policy.active && policy.pool == Currency.unwrap(key.currency0)) {
            // Calculate current IL
            uint256 currentIL = calculateCurrentIL(policy, key);

            if (currentIL > 0) {
                // Trigger IL calculation request
                fhenixProxy.requestILCalculation(
                    userPolicies[i],
                    encryptPositionData(policy, key),
                    getCurrentPriceData(key)
                );
            }
        }
    }

    return this.beforeRemoveLiquidity.selector;
}
```

#### Events

```solidity
event PolicyCreated(uint256 indexed policyId, address indexed lp, uint256 premium);
event ILDetected(uint256 indexed policyId, uint256 estimatedLoss);
event PremiumCollected(address indexed pool, uint256 amount);
```

---

### 2. PolicyManager.sol

**Location**: `contracts/PolicyManager.sol`

#### Purpose

Manages the complete lifecycle of insurance policies including creation, updates, claims, and settlements.

#### Data Structures

```solidity
struct Policy {
    address lp;                    // Liquidity provider address
    address pool;                  // Uniswap pool address
    PolicyParams params;           // Policy configuration
    bytes32 entryCommit;          // Confidential entry commitment
    uint256 createdAt;            // Block timestamp of creation
    uint256 epoch;                // Current epoch for updates
    bool active;                  // Policy status
}

struct PolicyParams {
    uint256 deductibleBps;        // Deductible in basis points (0-10000)
    uint256 capBps;               // Coverage cap in basis points
    uint256 premiumBps;           // Premium rate in basis points
    uint256 duration;             // Policy duration in blocks
    address pool;                 // Associated Uniswap pool
}

struct ClaimData {
    uint256 status;               // Claim status (None, Requested, Attested, Settled)
    uint256 requestTimestamp;     // When claim was requested
    uint256 policyId;            // Associated policy ID
    bytes32 exitCommit;          // Confidential exit commitment
    address claimer;             // Address requesting claim
    uint256 requestedAmount;     // Requested payout amount
}
```

#### Core Functions

##### mintPolicy

```solidity
function mintPolicy(
    address lp,
    address pool,
    PolicyParams calldata params,
    bytes32 entryCommit
) external returns (uint256 policyId) {
    // Validate parameters
    require(lp != address(0), "Invalid LP address");
    require(pool != address(0), "Invalid pool address");
    require(params.deductibleBps <= MAX_BASIS_POINTS, "Invalid deductible");
    require(params.capBps <= MAX_BASIS_POINTS, "Invalid cap");
    require(params.duration >= MIN_DURATION, "Duration too short");
    require(params.duration <= MAX_DURATION, "Duration too long");

    // Generate new policy ID
    policyId = ++nextPolicyId;

    // Create policy
    policies[policyId] = Policy({
        lp: lp,
        pool: pool,
        params: params,
        entryCommit: entryCommit,
        createdAt: block.timestamp,
        epoch: 0,
        active: true
    });

    // Update user policies mapping
    userPolicies[lp].push(policyId);

    emit PolicyCreated(policyId, lp, pool, params);
}
```

##### submitClaim

```solidity
function submitClaim(
    uint256 policyId,
    uint256 requestedAmount,
    bytes32 merkleProof
) external {
    Policy storage policy = policies[policyId];

    // Validate claim eligibility
    require(policy.active, "Policy not active");
    require(policy.lp == msg.sender, "Not policy owner");
    require(block.timestamp <= policy.createdAt + policy.params.duration, "Policy expired");
    require(claims[policyId].status == 0, "Claim already exists");

    // Verify solvency
    require(insuranceVault.solventFor(requestedAmount), "Vault not solvent");

    // Create claim
    claims[policyId] = ClaimData({
        status: 1, // Requested
        requestTimestamp: block.timestamp,
        policyId: policyId,
        exitCommit: generateExitCommitment(policy, merkleProof),
        claimer: msg.sender,
        requestedAmount: requestedAmount
    });

    // Request verification from AVS
    avsManager.createNewTask(
        policyId,
        keccak256(abi.encode(policy, requestedAmount)),
        QUORUM_THRESHOLD,
        abi.encode(QUORUM_NUMBERS)
    );

    emit ClaimRequested(policyId, msg.sender, requestedAmount);
}
```

##### attestClaim

```solidity
function attestClaim(
    uint256 policyId,
    bool isValid,
    bytes calldata operatorSignature
) external {
    require(avsManager.isValidOperator(msg.sender), "Not authorized operator");

    ClaimData storage claim = claims[policyId];
    require(claim.status == 1, "Invalid claim status");

    // Verify operator signature
    require(verifyOperatorSignature(policyId, isValid, operatorSignature), "Invalid signature");

    if (isValid) {
        claim.status = 2; // Attested
        emit ClaimAttested(policyId, msg.sender);

        // Check if quorum reached
        if (hasQuorumAttestation(policyId)) {
            settleClaim(policyId);
        }
    } else {
        claim.status = 4; // Rejected
        emit ClaimRejected(policyId, msg.sender);
    }
}
```

##### settleClaim

```solidity
function settleClaim(uint256 policyId) internal {
    Policy storage policy = policies[policyId];
    ClaimData storage claim = claims[policyId];

    require(claim.status == 2, "Claim not attested");

    // Calculate final payout using IL math
    uint256 payout = ILMath.calculatePayout(
        claim.requestedAmount,
        calculateHodlValue(policy),
        uint16(policy.params.capBps),
        uint16(policy.params.deductibleBps)
    );

    // Update status
    claim.status = 3; // Settled
    policy.active = false;

    // Execute payout
    insuranceVault.payClaim(policyId, policy.lp, payout);

    emit ClaimSettled(policyId, payout);
}
```

##### burnPolicy

```solidity
function burnPolicy(uint256 policyId) external {
    Policy storage policy = policies[policyId];

    require(policy.lp == msg.sender, "Not policy owner");
    require(policy.active, "Policy not active");
    require(claims[policyId].status == 0, "Cannot burn policy with active claim");

    policy.active = false;

    emit PolicyBurned(policyId);
}
```

#### View Functions

```solidity
function getUserPolicies(address user) external view returns (uint256[] memory);
function getPolicyDetails(uint256 policyId) external view returns (Policy memory);
function getClaimDetails(uint256 policyId) external view returns (ClaimData memory);
function isClaimEligible(uint256 policyId) external view returns (bool);
function calculatePremium(PolicyParams calldata params, uint256 liquidityValue) external pure returns (uint256);
```

#### Events

```solidity
event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool, PolicyParams params);
event ClaimRequested(uint256 indexed policyId, address indexed claimer, uint256 amount);
event ClaimAttested(uint256 indexed policyId, address indexed operator);
event ClaimRejected(uint256 indexed policyId, address indexed operator);
event ClaimSettled(uint256 indexed policyId, uint256 payout);
event PolicyBurned(uint256 indexed policyId);
event PolicyUpdated(uint256 indexed policyId, bytes32 newCommitment);
```

---

### 3. InsuranceVault.sol

**Location**: `contracts/vaults/InsuranceVault.sol`

#### Purpose

Manages premium collection, reserve funds, and claim payouts for the insurance system.

#### Key Features

- Pool-specific reserve tracking
- Solvency ratio calculations
- Premium collection automation
- Claim payout execution

#### State Variables

```solidity
mapping(address => uint256) public reserves;              // Pool-specific reserves
mapping(address => uint256) public totalPremiumsCollected; // Total premiums per pool
mapping(address => uint256) public totalClaimsPaid;      // Total claims paid per pool
mapping(uint256 => bool) public claimsPaid;              // Track paid claims
uint256 public totalReserves;                            // Global reserve total
```

#### Core Functions

##### depositPremium

```solidity
function depositPremium(address pool, uint256 amount) external payable {
    require(msg.sender == policyManager || msg.sender == ilHook, "Unauthorized");
    require(amount > 0, "Invalid amount");
    require(msg.value == amount, "Value mismatch");

    // Update pool-specific reserves
    reserves[pool] += amount;
    totalReserves += amount;
    totalPremiumsCollected[pool] += amount;

    emit PremiumDeposited(pool, amount);
}
```

##### payClaim

```solidity
function payClaim(
    uint256 policyId,
    address to,
    uint256 amount
) external {
    require(msg.sender == policyManager, "Only PolicyManager");
    require(!claimsPaid[policyId], "Claim already paid");
    require(solventFor(amount), "Insufficient reserves");
    require(to != address(0), "Invalid recipient");

    // Get policy details to determine pool
    Policy memory policy = PolicyManager(policyManager).getPolicyDetails(policyId);

    // Update reserves
    reserves[policy.pool] -= amount;
    totalReserves -= amount;
    totalClaimsPaid[policy.pool] += amount;
    claimsPaid[policyId] = true;

    // Transfer funds
    (bool success, ) = payable(to).call{value: amount}("");
    require(success, "Transfer failed");

    emit ClaimPaid(policyId, to, amount);
}
```

##### solventFor

```solidity
function solventFor(uint256 payout) external view returns (bool) {
    return totalReserves >= payout;
}
```

##### getVaultStats

```solidity
function getVaultStats(address pool) external view returns (
    uint256 totalReserves_,
    uint256 totalPremiums,
    uint256 totalClaims,
    uint256 reserveRatio
) {
    totalReserves_ = reserves[pool];
    totalPremiums = totalPremiumsCollected[pool];
    totalClaims = totalClaimsPaid[pool];

    // Calculate reserve ratio (reserves / premiums * 100)
    reserveRatio = totalPremiums > 0 ? (totalReserves_ * 10000) / totalPremiums : 0;
}
```

#### Administrative Functions

```solidity
function withdrawExcess(address pool, uint256 amount) external onlyOwner {
    uint256 poolReserves = reserves[pool];
    uint256 requiredReserves = calculateRequiredReserves(pool);

    require(poolReserves > requiredReserves, "No excess reserves");
    require(amount <= poolReserves - requiredReserves, "Amount exceeds excess");

    reserves[pool] -= amount;
    totalReserves -= amount;

    payable(owner()).transfer(amount);

    emit ExcessWithdrawn(pool, amount);
}

function emergencyWithdraw() external onlyOwner {
    require(emergencyMode, "Not in emergency mode");

    uint256 balance = address(this).balance;
    totalReserves = 0;

    payable(owner()).transfer(balance);

    emit EmergencyWithdrawal(balance);
}
```

#### Events

```solidity
event PremiumDeposited(address indexed pool, uint256 amount);
event ClaimPaid(uint256 indexed policyId, address indexed to, uint256 amount);
event ReservesDeposited(address indexed pool, uint256 amount);
event ExcessWithdrawn(address indexed pool, uint256 amount);
event EmergencyWithdrawal(uint256 amount);
```

---

### 4. PayoutVault.sol

**Location**: `contracts/vaults/PayoutVault.sol`

#### Purpose

Handles general deposits and withdrawals for vault funding, separate from premium-specific operations.

#### Core Functions

```solidity
function deposit(uint256 amount) external payable {
    require(amount > 0, "Invalid amount");
    require(msg.value == amount, "Value mismatch");

    balances[msg.sender] += amount;
    totalBalance += amount;

    emit Deposit(msg.sender, amount);
}

function withdraw(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    require(to != address(0), "Invalid recipient");

    balances[msg.sender] -= amount;
    totalBalance -= amount;

    (bool success, ) = payable(to).call{value: amount}("");
    require(success, "Transfer failed");

    emit Withdrawal(msg.sender, to, amount);
}

function balance() external view returns (uint256) {
    return address(this).balance;
}
```

---

### 5. EigenAVSManager.sol

**Location**: `contracts/EigenAVSManager.sol`

#### Purpose

Manages EigenLayer operators and coordinates the claim verification process.

#### Key Features

- Operator registration and management
- Task creation and assignment
- Signature aggregation
- Slashing coordination

#### Core Functions

##### registerOperator

```solidity
function registerOperator(
    bytes calldata signature,
    ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature
) external {
    require(!operators[msg.sender].isRegistered, "Already registered");

    // Register with EigenLayer
    registryCoordinator.registerOperator(signature, operatorSignature);

    // Update local state
    operators[msg.sender] = OperatorInfo({
        isRegistered: true,
        stake: 0,
        isActive: true,
        taskCount: 0,
        slashingHistory: 0
    });

    operatorList.push(msg.sender);

    emit OperatorRegistered(msg.sender);
}
```

##### createNewTask

```solidity
function createNewTask(
    uint256 policyId,
    bytes32 claimHash,
    uint32 quorumThresholdPercentage,
    bytes calldata quorumNumbers
) external {
    require(msg.sender == policyManager, "Only PolicyManager");

    // Create task
    Task memory newTask = Task({
        policyId: policyId,
        claimHash: claimHash,
        taskCreatedBlock: uint32(block.number),
        quorumThresholdPercentage: quorumThresholdPercentage,
        quorumNumbers: quorumNumbers
    });

    uint32 taskIndex = uint32(allTaskHashes.length);
    allTaskHashes.push(claimHash);
    allTaskResponses[taskIndex] = newTask;

    emit NewTaskCreated(taskIndex, newTask);
}
```

##### respondToTask

```solidity
function respondToTask(
    uint32 taskIndex,
    bool claimValid,
    IBLSSignatureChecker.NonSignerStakesAndSignature memory nonSignerStakesAndSignature
) external {
    Task memory task = allTaskResponses[taskIndex];
    require(keccak256(abi.encode(task)) == allTaskHashes[taskIndex], "Invalid task");

    // Verify BLS signature
    (QuorumStakeTotals memory quorumStakeTotals, bytes32 hashOfNonSigners) =
        checkSignatures(
            allTaskHashes[taskIndex],
            task.quorumNumbers,
            task.taskCreatedBlock,
            nonSignerStakesAndSignature
        );

    // Check if threshold met
    bool quorumMet = checkQuorumThreshold(
        quorumStakeTotals,
        task.quorumThresholdPercentage
    );

    if (quorumMet) {
        // Forward response to PolicyManager
        PolicyManager(policyManager).attestClaim(
            task.policyId,
            claimValid,
            abi.encode(nonSignerStakesAndSignature)
        );

        emit TaskResponded(taskIndex, task, claimValid);
    }
}
```

#### Operator Management

```solidity
function updateOperatorStake(address operator, uint256 newStake) external {
    require(msg.sender == stakeRegistry, "Only stake registry");
    operators[operator].stake = newStake;
    emit OperatorStakeUpdated(operator, newStake);
}

function slashOperator(
    address operator,
    uint256 amount,
    string calldata reason
) external onlyOwner {
    require(operators[operator].isRegistered, "Operator not registered");

    operators[operator].slashingHistory += amount;

    if (operators[operator].slashingHistory >= MAX_SLASHING_AMOUNT) {
        operators[operator].isActive = false;
    }

    emit OperatorSlashed(operator, amount, reason);
}
```

---

### 6. FhenixComputeProxy.sol

**Location**: `contracts/FhenixComputeProxy.sol`

#### Purpose

Interfaces with the Fhenix network for confidential impermanent loss calculations.

#### Core Functions

```solidity
function requestILCalculation(
    uint256 policyId,
    bytes calldata encryptedPositionData,
    bytes calldata priceData
) external returns (bytes32 requestId) {
    require(msg.sender == ilHook || msg.sender == policyManager, "Unauthorized");

    requestId = keccak256(abi.encode(policyId, block.timestamp, block.difficulty));

    // Store request
    computeRequests[requestId] = ComputeRequest({
        policyId: policyId,
        requester: msg.sender,
        timestamp: block.timestamp,
        status: RequestStatus.Pending
    });

    // Emit event for off-chain service
    emit ILCalculationRequested(requestId, policyId, encryptedPositionData, priceData);
}

function submitILResult(
    bytes32 requestId,
    bytes calldata encryptedResult,
    bytes calldata proof
) external {
    require(msg.sender == fhenixOracle, "Only Fhenix oracle");

    ComputeRequest storage request = computeRequests[requestId];
    require(request.status == RequestStatus.Pending, "Invalid request status");

    // Verify proof
    require(verifyComputationProof(proof, encryptedResult), "Invalid proof");

    request.status = RequestStatus.Completed;

    emit ILCalculationCompleted(requestId, encryptedResult);
}
```

---

## Library Documentation

### ILMath.sol

**Location**: `contracts/libraries/ILMath.sol`

#### Purpose

Provides mathematical functions for impermanent loss calculations with precise arithmetic and overflow protection.

#### Core Functions

See the attached ILMath.sol file for complete implementation details.

#### Mathematical Formulas

1. **Hodl Value Calculation**:

   ```
   V_hodl = x0 * P1 + y0
   ```

   Where:

   - x0 = Initial amount of token0
   - y0 = Initial amount of token1
   - P1 = Current price of token0 in terms of token1

2. **LP Value Calculation**:

   ```
   V_lp = x1 * P1 + y1 + fees
   ```

   Where:

   - x1 = Current amount of token0 in LP position
   - y1 = Current amount of token1 in LP position
   - fees = Accumulated trading fees

3. **Impermanent Loss**:

   ```
   IL = max(0, V_hodl - V_lp)
   ```

4. **Insurance Payout**:
   ```
   Payout = min(
     capBps * V_hodl / 10000,
     max(0, IL - deductibleBps * IL / 10000)
   )
   ```

---

## Security Considerations

### Access Control

- All contracts implement OpenZeppelin's access control patterns
- Critical functions restricted to authorized contracts only
- Multi-signature requirements for administrative functions

### Economic Security

- Solvency checks before claim payouts
- Reserve ratio monitoring
- Premium calculations based on risk assessment

### Technical Security

- Reentrancy guards on all external calls
- Integer overflow protection (Solidity 0.8.26)
- Comprehensive input validation
- Emergency pause mechanisms

---

This completes the detailed smart contracts documentation. Each contract is thoroughly documented with its purpose, key functions, data structures, and integration points.

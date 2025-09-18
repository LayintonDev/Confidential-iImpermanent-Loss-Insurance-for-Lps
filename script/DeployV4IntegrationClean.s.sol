// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {V4Router} from "v4-periphery/V4Router.sol";
import {PositionManager} from "v4-periphery/PositionManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

// Import our contracts
import {PolicyManager} from "../contracts/PolicyManager.sol";
import {InsuranceVault} from "../contracts/vaults/InsuranceVault.sol";
import {FeeSplitter} from "../contracts/FeeSplitter.sol";
import {ConfidentialILHook} from "../contracts/hooks/ConfidentialILHook.sol";
import {EigenAVSManagerV2} from "../contracts/EigenAVSManagerV2.sol";
import {FhenixComputeProxy} from "../contracts/FhenixComputeProxy.sol";

// Import test tokens for pool creation
import {MockERC20} from "solmate/test/utils/mocks/MockERC20.sol";

/**
 * @title DeployV4Integration
 * @notice Deploy complete Uniswap V4 integration with IL insurance
 * @dev This script deploys V4 infrastructure + our insurance system
 */
contract DeployV4Integration is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // V4 Infrastructure
    PoolManager public poolManager;
    V4Router public router;
    PositionManager public positionManager;

    // Test tokens for demo pool
    MockERC20 public token0; // USDC
    MockERC20 public token1; // WETH

    // Insurance System Contracts
    InsuranceVault public insuranceVault;
    PolicyManager public policyManager;
    FeeSplitter public feeSplitter;
    ConfidentialILHook public hook;
    EigenAVSManagerV2 public avsManager;
    FhenixComputeProxy public fhenixProxy;

    // Configuration
    uint24 public constant FEE_TIER = 3000; // 0.3%
    int24 public constant TICK_SPACING = 60;
    uint160 public constant INITIAL_SQRT_PRICE = 79228162514264337593543950336; // 1:1 price

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("\n== V4 Integration Deployment ==");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        // Deploy components in order
        console.log("\n    Deploying V4 Core Infrastructure...");
        _deployV4Core();

        console.log("\n    Deploying Test Tokens...");
        _deployTestTokens();

        console.log("\n    Deploying Insurance System...");
        _deployInsuranceSystem();

        console.log("\n    Deploying and Registering Hook...");
        _deployHook();

        console.log("\n    Setting up Roles and Permissions...");
        _setupPermissions();

        console.log("\n    Initializing Test Pool...");
        _initializePool();

        console.log("\n    Adding Initial Liquidity...");
        _addInitialLiquidity();

        vm.stopBroadcast();

        _printSummary();
    }

    function _deployV4Core() internal {
        // Deploy PoolManager - core V4 contract
        poolManager = new PoolManager();
        console.log("OK PoolManager deployed:", address(poolManager));

        // Deploy V4Router for swap operations
        router = new V4Router(poolManager);
        console.log("OK V4Router deployed:", address(router));

        // Deploy PositionManager for liquidity operations
        positionManager = new PositionManager(poolManager, address(0), address(0));
        console.log("OK PositionManager deployed:", address(positionManager));
    }

    function _deployTestTokens() internal {
        // Deploy USDC token (6 decimals)
        token0 = new MockERC20("USD Coin", "USDC", 6);
        console.log("OK USDC (token0) deployed:", address(token0));

        // Deploy WETH token (18 decimals)
        token1 = new MockERC20("Wrapped Ether", "WETH", 18);
        console.log("OK ETH (token1) deployed:", address(token1));

        // Ensure proper V4 token ordering (token0 < token1)
        if (address(token0) > address(token1)) {
            (token0, token1) = (token1, token0);
            console.log("NOTE Swapped token order for V4 compatibility");
        }
    }

    function _deployInsuranceSystem() internal {
        // Deploy InsuranceVault
        insuranceVault = new InsuranceVault();
        console.log("OK InsuranceVault deployed:", address(insuranceVault));

        // Deploy PolicyManager
        policyManager = new PolicyManager(address(insuranceVault));
        console.log("OK PolicyManager deployed:", address(policyManager));

        // Deploy FeeSplitter
        feeSplitter = new FeeSplitter();
        console.log("OK FeeSplitter deployed:", address(feeSplitter));

        // Deploy FhenixComputeProxy
        fhenixProxy = new FhenixComputeProxy();
        console.log("OK FhenixComputeProxy deployed:", address(fhenixProxy));

        // Deploy EigenAVSManagerV2 with real addresses from your project
        avsManager = new EigenAVSManagerV2(
            0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A, // delegation manager
            0x0bAAC79ACD45A023E19345C352c58E7B2Ad3a06e, // avs directory
            0x5dC91d01290f08079C7C0e7D55465190B5e7Ec36, // strategy manager
            0x54945180dB7943c0ed0FEE7EdaB2Bd24620256bc, // eigen pod manager
            0x2520C6b2C1FBE1813ab5C7c1018CDdcC2c569654, // rewards coordinator
            0x4A4a80CBa7B2b2a3c26F7B56D0dE9E7fd4b95efd // slashing manager
        );
        console.log("OK EigenAVSManagerV2 deployed:", address(avsManager));
    }

    function _deployHook() internal {
        // Calculate hook permissions - we need afterAddLiquidity and afterSwap
        uint160 flags = uint160(Hooks.AFTER_ADD_LIQUIDITY_FLAG | Hooks.AFTER_SWAP_FLAG);

        // Deploy hook with the calculated address prefix matching flags
        // In production, you'd use CREATE2 to ensure the address has the right prefix
        hook = new ConfidentialILHook(
            IPoolManager(address(poolManager)),
            address(policyManager),
            address(insuranceVault),
            address(feeSplitter),
            address(avsManager)
        );

        console.log("OK ConfidentialILHook deployed:", address(hook));
        console.log("INFO Hook flags:", flags);

        // Verify hook address has correct permissions prefix
        // In V4, hook address must match the permissions in the lower bits
        require(uint160(address(hook)) & uint160(0x3FF) == flags, "Hook address prefix doesn't match permissions");
        console.log("OK Hook address validation passed");
    }

    function _setupPermissions() internal {
        // Grant HOOK_ROLE to the deployed hook
        bytes32 HOOK_ROLE = policyManager.HOOK_ROLE();
        policyManager.grantRole(HOOK_ROLE, address(hook));

        // Set up insurance vault permissions
        insuranceVault.grantRole(insuranceVault.VAULT_MANAGER_ROLE(), address(policyManager));
        insuranceVault.grantRole(insuranceVault.VAULT_MANAGER_ROLE(), address(hook));

        console.log("OK Permissions configured");
    }

    function _initializePool() internal {
        // Create pool key
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: FEE_TIER,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });

        // Initialize the pool
        poolManager.initialize(key, INITIAL_SQRT_PRICE);

        console.log("OK Pool initialized");
        console.log("INFO Pool ID:", PoolId.unwrap(key.toId()));
    }

    function _addInitialLiquidity() internal {
        // Mint tokens for initial liquidity
        uint256 amount0 = 100_000 * 10 ** token0.decimals(); // 100k USDC
        uint256 amount1 = 100 * 10 ** token1.decimals(); // 100 ETH

        token0.mint(address(this), amount0);
        token1.mint(address(this), amount1);

        // Approve tokens for PositionManager
        token0.approve(address(positionManager), amount0);
        token1.approve(address(positionManager), amount1);

        console.log("OK Initial liquidity prepared");
        console.log("INFO Token0 balance:", token0.balanceOf(address(this)));
        console.log("INFO Token1 balance:", token1.balanceOf(address(this)));
    }

    function _printSummary() internal view {
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("V4 Core:");
        console.log("  PoolManager:", address(poolManager));
        console.log("  V4Router:", address(router));
        console.log("  PositionManager:", address(positionManager));

        console.log("\nTest Tokens:");
        console.log("  Token0:", address(token0));
        console.log("  Token1:", address(token1));

        console.log("\nInsurance System:");
        console.log("  InsuranceVault:", address(insuranceVault));
        console.log("  PolicyManager:", address(policyManager));
        console.log("  FeeSplitter:", address(feeSplitter));
        console.log("  Hook:", address(hook));
        console.log("  AVS Manager:", address(avsManager));
        console.log("  Fhenix Proxy:", address(fhenixProxy));

        console.log("\n=== READY FOR FRONTEND INTEGRATION ===");
        console.log("Use V4Router for liquidity operations");
        console.log("Hook will automatically create insurance when liquidity is added");
    }
}

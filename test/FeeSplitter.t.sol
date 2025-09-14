import {PremiumMath} from "../contracts/libraries/PremiumMath.sol";
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {FeeSplitter} from "../contracts/FeeSplitter.sol";
import {InsuranceVault} from "../contracts/vaults/InsuranceVault.sol";
import {PolicyManager} from "../contracts/PolicyManager.sol";

/**
 * @title FeeSplitterTest
 * @notice Test suite for FeeSplitter contract
 * @dev Tests premium extraction and fee splitting logic
 */
contract FeeSplitterTest is Test {

    function testEstimatePremiumMatchesLibrary() public {
        // Initialize pool
        vm.prank(hook);
        feeSplitter.initializePool(pool1, 1000, 2000);

        // Simulate fee growth
        uint256 newFeeGrowth0 = 1100;
        uint256 newFeeGrowth1 = 2200;
        uint256 premiumRate = feeSplitter.getPremiumRate(pool1);

        // Use contract's estimatePremium
        uint256 contractEstimate = feeSplitter.estimatePremium(pool1, newFeeGrowth0, newFeeGrowth1);

        // Use library directly
        uint256 libEstimate = PremiumMath.calculatePremium(1000, 2000, newFeeGrowth0, newFeeGrowth1, premiumRate);

        assertEq(contractEstimate, libEstimate, "estimatePremium should match PremiumMath");
    }

    function testEstimatePremiumUninitializedPool() public {
        // Should return 0 for uninitialized pool
        uint256 estimate = feeSplitter.estimatePremium(pool1, 1000, 2000);
        assertEq(estimate, 0);
    }

    function testPremiumMathHandlesZeroDelta() public {
        // No fee growth, should be zero premium
        uint256 premium = PremiumMath.calculatePremium(1000, 2000, 1000, 2000, 3);
        assertEq(premium, 0);
    }

    function testPremiumMathHandlesNonZeroDelta() public {
        // Fee growth, should calculate correct premium
        uint256 premium = PremiumMath.calculatePremium(1000, 2000, 1100, 2200, 3);
        // delta0 = 100, delta1 = 200, avg = 150, rate = 3 bps
        // premium = 150 * 3 / 10000 = 0.045 -> truncated to 0 (uint256)
        assertEq(premium, 0);

        // Use higher rate to get nonzero
        premium = PremiumMath.calculatePremium(1000, 2000, 1100, 2200, 1000); // 10%
        // premium = 150 * 1000 / 10000 = 15
        assertEq(premium, 15);
    }

    function testExtractPremiumInitializesPoolOnFirstCall() public {
        uint256 feeGrowth0 = 1000;
        uint256 feeGrowth1 = 2000;

        vm.prank(hook);
        uint256 premium = feeSplitter.extractPremium(pool1, feeGrowth0, feeGrowth1);

        // First call should initialize and return 0 premium
        assertEq(premium, 0);
        assertTrue(feeSplitter.poolInitialized(pool1));
        assertEq(feeSplitter.getPremiumRate(pool1), 3); // DEFAULT_PREMIUM_BPS
    }

    function testExtractPremiumCalculatesCorrectAmount() public {
        // Initialize pool
        vm.prank(hook);
        feeSplitter.extractPremium(pool1, 1000, 2000);

        // Set higher premium rate for testing
        vm.prank(admin);
        feeSplitter.setPremiumRate(pool1, 1000); // 10%

        // Extract premium with fee growth
        vm.prank(hook);
        uint256 premium = feeSplitter.extractPremium(pool1, 1100, 2200);

        // Expected: delta0=100, delta1=200, avg=150, rate=10% => 150*1000/10000=15
        assertEq(premium, 15);
    }

    function testExtractPremiumRequiresHookRole() public {
        vm.prank(admin);
        vm.expectRevert();
        feeSplitter.extractPremium(pool1, 1000, 2000);
    }

    function testExtractPremiumRejectsInvalidPool() public {
        vm.prank(hook);
        vm.expectRevert(abi.encodeWithSelector(FeeSplitter.InvalidPool.selector));
        feeSplitter.extractPremium(address(0), 1000, 2000);
    }

    function testSetPremiumRateRejectsHighRates() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(FeeSplitter.InvalidAmount.selector));
        feeSplitter.setPremiumRate(pool1, 1001); // > 1000 (10%)
    }

    function testUpdateInsuranceVaultRejectsZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(FeeSplitter.InvalidAmount.selector));
        feeSplitter.updateInsuranceVault(address(0));
    }

    function testExtractPremiumWithLargeFeeGrowth() public {
        // Test with large numbers to check for overflow
        uint256 largeFeeGrowth0 = 2**128 - 1000;
        uint256 largeFeeGrowth1 = 2**128 - 2000;

        vm.prank(hook);
        feeSplitter.extractPremium(pool1, largeFeeGrowth0, largeFeeGrowth1);

        // Should not revert and should initialize correctly
        assertTrue(feeSplitter.poolInitialized(pool1));
    }

    function testConsecutivePremiumExtractions() public {
        // Initialize
        vm.prank(hook);
        uint256 premium1 = feeSplitter.extractPremium(pool1, 1000, 2000);
        assertEq(premium1, 0); // First call initializes

        // Set premium rate
        vm.prank(admin);
        feeSplitter.setPremiumRate(pool1, 100); // 1%

        // Multiple extractions
        vm.startPrank(hook);
        uint256 premium2 = feeSplitter.extractPremium(pool1, 1100, 2100);
        uint256 premium3 = feeSplitter.extractPremium(pool1, 1200, 2200);
        uint256 premium4 = feeSplitter.extractPremium(pool1, 1200, 2200); // No growth
        vm.stopPrank();

        // Verify calculations
        assertEq(premium2, 100 * 100 / 10000); // (100+100)/2 * 1% = 1
        assertEq(premium3, 100 * 100 / 10000); // (100+100)/2 * 1% = 1  
        assertEq(premium4, 0); // No fee growth = no premium
    }
    FeeSplitter public feeSplitter;
    InsuranceVault public vault;
    PolicyManager public policyManager;

    address public admin = address(0x1);
    address public hook = address(0x2);
    address public pool1 = address(0x3);
    address public pool2 = address(0x4);

    event PremiumExtracted(address indexed pool, uint256 amount, uint256 premium);
    event PoolInitialized(address indexed pool, uint256 premiumRate);
    event PremiumRateUpdated(address indexed pool, uint256 oldRate, uint256 newRate);

    function setUp() public {
        vm.startPrank(admin);

        // Deploy vault
        vault = new InsuranceVault(admin);

        // Deploy policy manager
        policyManager = new PolicyManager(admin, "https://api.example.com/policy/");

        // Deploy fee splitter - constructor takes (admin, vault)
        feeSplitter = new FeeSplitter(admin, address(vault));

        // Grant roles
        vault.grantHookRole(address(feeSplitter));
        feeSplitter.grantRole(feeSplitter.HOOK_ROLE(), hook);

        vm.stopPrank();
    }

    function testInitializePool() public {
        uint256 feeGrowthGlobal0 = 1000;
        uint256 feeGrowthGlobal1 = 2000;

        vm.prank(hook);
        feeSplitter.initializePool(pool1, feeGrowthGlobal0, feeGrowthGlobal1);

        assertTrue(feeSplitter.poolInitialized(pool1));
        // Should use default premium rate (3 basis points = 0.03%)
        assertEq(feeSplitter.getPremiumRate(pool1), 3);
    }

    function testCannotInitializePoolAsNonHook() public {
        vm.prank(admin);
        vm.expectRevert();
        feeSplitter.initializePool(pool1, 1000, 2000);
    }

    function testSetPremiumRate() public {
        // First initialize
        vm.prank(hook);
        feeSplitter.initializePool(pool1, 1000, 2000);

        uint256 newRate = 200; // 2%

        vm.prank(admin);
        feeSplitter.setPremiumRate(pool1, newRate);

        assertEq(feeSplitter.getPremiumRate(pool1), newRate);
    }

    function testCannotSetPremiumRateAsNonAdmin() public {
        vm.prank(hook);
        feeSplitter.initializePool(pool1, 1000, 2000);

        vm.prank(hook);
        vm.expectRevert();
        feeSplitter.setPremiumRate(pool1, 200);
    }

    function testGetPremiumRateForUninitializedPool() public {
        // Should return default rate for uninitialized pool
        uint256 defaultRate = feeSplitter.getPremiumRate(pool1);
        assertEq(defaultRate, 3); // DEFAULT_PREMIUM_BPS
    }

    function testMultiplePoolInitialization() public {
        vm.startPrank(hook);

        feeSplitter.initializePool(pool1, 1000, 2000);
        feeSplitter.initializePool(pool2, 3000, 4000);

        vm.stopPrank();

        assertTrue(feeSplitter.poolInitialized(pool1));
        assertTrue(feeSplitter.poolInitialized(pool2));

        // Both should have default premium rate initially
        assertEq(feeSplitter.getPremiumRate(pool1), 3);
        assertEq(feeSplitter.getPremiumRate(pool2), 3);

        // Set different rates
        vm.startPrank(admin);
        feeSplitter.setPremiumRate(pool1, 100); // 1%
        feeSplitter.setPremiumRate(pool2, 200); // 2%
        vm.stopPrank();

        assertEq(feeSplitter.getPremiumRate(pool1), 100);
        assertEq(feeSplitter.getPremiumRate(pool2), 200);
    }

    function testUpdateInsuranceVault() public {
        address newVault = address(0x999);

        vm.prank(admin);
        feeSplitter.updateInsuranceVault(newVault);

        // Note: We can't easily test this without exposing the vault address
        // In a real implementation, we'd have a getter for the vault address
    }

    function testCannotUpdateVaultAsNonAdmin() public {
        address newVault = address(0x999);

        vm.prank(hook);
        vm.expectRevert();
        feeSplitter.updateInsuranceVault(newVault);
    }

    function testFuzzPremiumRates(uint256 rate1, uint256 rate2) public {
        // Bound to reasonable premium rates (0.01% to 10%)
        rate1 = bound(rate1, 1, 1000);
        rate2 = bound(rate2, 1, 1000);

        // Initialize pools
        vm.startPrank(hook);
        feeSplitter.initializePool(pool1, 1000, 2000);
        feeSplitter.initializePool(pool2, 3000, 4000);
        vm.stopPrank();

        // Set premium rates
        vm.startPrank(admin);
        feeSplitter.setPremiumRate(pool1, rate1);
        feeSplitter.setPremiumRate(pool2, rate2);
        vm.stopPrank();

        // Verify rates are set correctly
        assertEq(feeSplitter.getPremiumRate(pool1), rate1);
        assertEq(feeSplitter.getPremiumRate(pool2), rate2);
    }
}

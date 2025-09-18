// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/vaults/InsuranceVault.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/EigenAVSManager.sol";
import "../contracts/FeeSplitter.sol";

/**
 * @title DeployInsuranceVault
 * @notice Deploy script for InsuranceVault and integrate with existing contracts
 */
contract DeployInsuranceVault is Script {
    // Configuration - Use placeholder addresses that are valid
    address constant ADMIN = 0x1234567890123456789012345678901234567890; // Replace with actual admin address
    address constant POLICY_MANAGER = 0x2345678901234567890123456789012345678901; // Replace with deployed PolicyManager address
    address constant AVS_MANAGER = 0x3456789012345678901234567890123456789012; // Replace with deployed EigenAVSManager address
    address constant FEE_SPLITTER = 0x4567890123456789012345678901234567890123; // Replace with deployed FeeSplitter address

    // Deployment parameters
    uint256 constant MINIMUM_RESERVE_RATIO = 2000; // 20%
    uint256 constant MAX_CLAIM_RATIO = 8000; // 80%
    uint256 constant INITIAL_FUNDING = 10 ether; // Initial vault funding

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying InsuranceVault...");
        console.log("Deployer:", deployer);
        console.log("Admin:", ADMIN);
        console.log("PolicyManager:", POLICY_MANAGER);

        // Deploy InsuranceVault
        InsuranceVault vault = new InsuranceVault(ADMIN);

        console.log("InsuranceVault deployed at:", address(vault));

        // Initial configuration
        // Vault is deployed and ready

        console.log("InsuranceVault initialization complete");

        // Provide initial funding to the vault
        if (INITIAL_FUNDING > 0) {
            vault.depositFunds{value: INITIAL_FUNDING}();
            console.log("Deposited initial funding:", INITIAL_FUNDING / 1e18, "ETH");
        }

        // Optional: Update EigenAVSManager with vault address if needed
        // This would require the AVS manager to have an updateVault function
        // EigenAVSManager(AVS_MANAGER).updateVault(address(vault));

        vm.stopBroadcast();

        console.log("=== Deployment Summary ===");
        console.log("InsuranceVault:", address(vault));
        console.log("Admin:", ADMIN);
        console.log("PolicyManager:", POLICY_MANAGER);
        console.log("FeeSplitter (Premium Depositor):", FEE_SPLITTER);
        console.log("EigenAVSManager (Claim Payer):", AVS_MANAGER);
        console.log("Initial Funding:", INITIAL_FUNDING / 1e18, "ETH");

        console.log("\n=== Next Steps ===");
        console.log("1. Update frontend CONTRACT_ADDRESSES with vault address");
        console.log("2. Verify contracts on block explorer");
        console.log("3. Test claim flow end-to-end");
        console.log("4. Set up monitoring for vault reserves");
    }
}

/**
 * @title DeployFullSystem
 * @notice Complete deployment script for all contracts in proper order
 */
contract DeployFullSystem is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying complete IL Insurance system...");
        console.log("Deployer:", deployer);

        // 1. Deploy PolicyManager
        PolicyManager policyManager = new PolicyManager(
            deployer, // admin
            "https://api.il-insurance.com/metadata/" // metadata URI
        );
        console.log("PolicyManager deployed at:", address(policyManager));

        // 2. Deploy InsuranceVault (initially with deployer as admin)
        InsuranceVault vault = new InsuranceVault(
            deployer // admin
        );
        console.log("InsuranceVault deployed at:", address(vault));

        // 3. Deploy EigenAVSManager
        EigenAVSManager avsManager = new EigenAVSManager(
            address(vault),
            address(0), // serviceManager (update later)
            address(0), // fhenix proxy (update later)
            1 ether, // minimum stake
            3 // signature threshold
        );
        console.log("EigenAVSManager deployed at:", address(avsManager));

        // 4. Deploy FeeSplitter
        FeeSplitter feeSplitter = new FeeSplitter(deployer, address(vault));
        console.log("FeeSplitter deployed at:", address(feeSplitter));

        // 5. Grant proper roles
        vault.grantAVSRole(address(avsManager));
        vault.grantHookRole(address(feeSplitter));

        // Grant hook role to contracts that need to mint policies (check if this method exists)
        // policyManager.grantRole(policyManager.HOOK_ROLE(), address(feeSplitter));

        // Provide initial funding
        vault.depositFunds{value: 5 ether}();

        vm.stopBroadcast();

        console.log("\n=== Complete Deployment Summary ===");
        console.log("PolicyManager:", address(policyManager));
        console.log("InsuranceVault:", address(vault));
        console.log("EigenAVSManager:", address(avsManager));
        console.log("FeeSplitter:", address(feeSplitter));
        console.log("Initial Vault Funding: 5 ETH");

        console.log("\n=== Frontend Contract Addresses ===");
        console.log("POLICY_MANAGER:", address(policyManager));
        console.log("INSURANCE_VAULT:", address(vault));
        console.log("AVS_MANAGER:", address(avsManager));
        console.log("FEE_SPLITTER:", address(feeSplitter));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import "../src/ConfidentialInsurance.sol";
import "../src/gen/interfaces/IReservationRegistry.sol";

contract DeployConfidentialInsurance is Script {
    ConfidentialInsurance confidentialinsurance;

    function setUp() public {}

    function run(uint256 reservationID) public {
        vm.startBroadcast();

        // Deploy the ConfidentialInsurance contract
        confidentialinsurance = new ConfidentialInsurance(reservationID);

        IReservationRegistry registry = IReservationRegistry(address(0x117EC6594264cFA1c6B06Ff2a04df9F9c445fa7D));
        IReservationRegistry.Reservation memory reservation = registry.getReservation(reservationID);

        // Set permissions for the confidentialinsurance contract if the reservation is owned by the sender
        if (reservation.account == msg.sender) {
            registry.permissionController().setAppointee(
                msg.sender,
                address(confidentialinsurance),
                address(0xb1bc0253B3823f5f9fDC9DF04FcF8aDB8d2855E2), // Execution endpoint
                bytes4(keccak256("requestExecution((bytes32,address,string,bytes))"))
            );
        } else {
            console2.log("Permission error: Reservation # %s owned by %s not sender", reservationID, reservation.account);
            console2.log("Fix: Owner must grant %s permission via permissionController.setAppointee()", address(confidentialinsurance));
        }

        console2.log("ConfidentialInsurance deployed to: %s", address(confidentialinsurance));
        console2.log("Using reservationID: %s", reservationID);

        vm.stopBroadcast();
    }
}

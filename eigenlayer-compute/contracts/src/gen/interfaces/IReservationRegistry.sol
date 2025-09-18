// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

import "./IPermissionController.sol";

interface IReservationRegistry {
    struct Reservation {
        address account;
        uint32 createdAtBlock;
        uint32 createdAt;
        uint32 updatedAt;
        uint32 lastWeekPaid;
        uint256 balance;
    }

    function getReservation(uint256 reservationID) external view returns (Reservation memory);
    function permissionController() external view returns (IPermissionController);
}

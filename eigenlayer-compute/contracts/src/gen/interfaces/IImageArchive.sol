// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

interface IImageArchive {
    /**
     * @notice Gets the config ID using a reservation ID
     * @param reservationID The reservation ID
     * @return configID The config ID
     */
    function getReservationConfigID(uint256 reservationID) external view returns (bytes32 configID);
}

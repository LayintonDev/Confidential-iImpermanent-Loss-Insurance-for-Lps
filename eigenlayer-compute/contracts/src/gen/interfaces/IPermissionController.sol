// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

interface IPermissionController {
    function setAppointee(address grantor, address appointee, address target, bytes4 selector) external;
}

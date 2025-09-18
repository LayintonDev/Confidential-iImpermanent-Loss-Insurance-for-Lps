// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

/**
 * @title IExecutionCallback
 * @notice Interface for receiving execution callbacks with structured error handling
 */
interface IExecutionCallback {
    /**
     * @notice Called when an execution request completes successfully
     * @param taskId The ID of the completed task
     * @param functionName The name of the function that was executed
     * @param result Combined data containing original args and execution result (args, result)
     */
    function onExecutionResult(uint256 taskId, string memory functionName, bytes memory result) external;

    /**
     * @notice Called when an execution request fails or encounters an error
     * @param taskId The ID of the failed task
     * @param functionName The name of the function that was attempted
     * @param error The error message or reason for failure
     */
    function onExecutionError(uint256 taskId, string memory functionName, string memory error) external;
}

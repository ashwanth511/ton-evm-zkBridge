// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Bridge2 is Ownable {

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error Bridge2_ValueIsZero();
    error Bridge2_InvalidTONAddress();
    error Bridge2_InsufficientBalance();
    error Bridge2_WithdrawFailed();

    /*//////////////////////////////////////////////////////////////
                                 EVENT
    //////////////////////////////////////////////////////////////*/

    event DepositEvent(
        uint256 indexed queryId,
        address indexed sender,
        bytes tonAddress,
        uint256 amount
    );

    event WithdrawEvent(
        address indexed recipient,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                               VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 private _nonce;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function Deposit(bytes calldata _tonAddress) public payable {
        if(msg.value == 0) {
            revert Bridge2_ValueIsZero();
        }
        if(_tonAddress.length == 0) {
            revert Bridge2_InvalidTONAddress();
        }

        uint256 queryId = _nonce++;
        
        emit DepositEvent(
            queryId,
            msg.sender,
            _tonAddress,
            msg.value
        );
    }

    function Withdraw(address _to, uint256 _amount) external onlyOwner {
        if (_amount == 0) {
            revert Bridge2_ValueIsZero();
        }
        if (_amount > address(this).balance) {
            revert Bridge2_InsufficientBalance();
        }
        
        (bool success, ) = _to.call{value: _amount}("");
        if (!success) {
            revert Bridge2_WithdrawFailed();
        }

        emit WithdrawEvent(
            _to,
            _amount
        );
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTION
    //////////////////////////////////////////////////////////////*/
}
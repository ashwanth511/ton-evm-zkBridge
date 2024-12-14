// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[6] memory input
    ) external view returns (bool);
}

contract Bridge is ReentrancyGuard, Ownable {
    IVerifier public verifier;
    IERC20 public token;
    
    uint256 public nonce;
    uint256 public constant TON_CHAIN_ID = 1;
    
    mapping(bytes32 => bool) public processedTransfers;
    
    event TokensLocked(
        address indexed sender,
        uint256 amount,
        string destinationAddress,
        uint256 nonce
    );
    
    event TokensReleased(
        address indexed recipient,
        uint256 amount,
        bytes32 transferId
    );
    
    constructor(address _token, address _verifier) {
        token = IERC20(_token);
        verifier = IVerifier(_verifier);
    }
    
    function lockTokens(uint256 amount, string calldata tonAddress) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        bytes32 transferId = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                tonAddress,
                nonce
            )
        );
        
        emit TokensLocked(msg.sender, amount, tonAddress, nonce);
        nonce++;
    }
    
    function releaseTokens(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[6] memory input,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        bytes32 transferId = keccak256(
            abi.encodePacked(
                input[0], // source chain (TON)
                block.chainid, // destination chain (current EVM chain)
                amount,
                recipient
            )
        );
        
        require(!processedTransfers[transferId], "Transfer already processed");
        require(verifier.verifyProof(a, b, c, input), "Invalid proof");
        
        processedTransfers[transferId] = true;
        require(token.transfer(recipient, amount), "Transfer failed");
        
        emit TokensReleased(recipient, amount, transferId);
    }
    
    function updateVerifier(address _verifier) external onlyOwner {
        verifier = IVerifier(_verifier);
    }
    
    // Emergency withdrawal in case of stuck tokens
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(to, balance), "Transfer failed");
    }
}

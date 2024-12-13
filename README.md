# ZK-Bridge

A zero-knowledge proof bridge between EVM and TON blockchain networks.

## Overview

This ZK-Bridge enables secure and trustless asset transfers between EVM-compatible chains (like Ethereum, BSC, etc.) and TON blockchain using zero-knowledge proofs. The bridge ensures the integrity and privacy of cross-chain transactions while maintaining high security standards.

### Key Features

- Trustless cross-chain transfers
- Zero-knowledge proof-based verification
- Support for multiple EVM chains
- Secure asset locking and unlocking
- Fast finality for transfers
- Privacy-preserving transactions

## Project Structure

```
zk-bridge/
├── build/                  # Generated artifacts
│   └── circuits/          # Circuit compilation outputs
│       ├── bridge.r1cs    # R1CS constraint system
│       ├── bridge.sym     # Symbol file
│       ├── bridge_js/     # JavaScript witness generator
│       ├── bridge.zkey    # Proving key
│       └── verification_key.json
├── circuits/              # Circuit implementations
│   ├── bridge.circom     # Main bridge circuit
│   └── circomlib/        # Circom standard library
├── contracts/            # Smart contracts
│   ├── evm/             # Ethereum contracts
│   │   └── ZKBridgeVerifier.sol
│   └── ton/             # TON contracts
│       └── bridge.fc
├── off-chain/           # TypeScript implementation
│   ├── config.ts        # Bridge configuration
│   ├── prover.ts        # Proof generation
│   └── types.ts         # Type definitions
├── scripts/             # Build and deployment scripts
│   └── compile-circuits.js
└── test/               # Test files
    └── Bridge.test.js
```

## Prerequisites

- Node.js >= 16.0.0
- Rust >= 1.60.0 (for circuit compilation)
- TON CLI tools
- Circom 2.0
- Solidity compiler ^0.8.0

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Install TON dependencies:
```bash
npm run install-ton-deps
```

3. Compile circuits:
```bash
node scripts/compile-circuits.js
```

This will:
- Compile the circuit to generate R1CS and WASM
- Generate the proving key (zkey)
- Generate the verification key
- Generate the Solidity verifier contract

## Bridge Components

### 1. Zero-Knowledge Circuit
The circuit in `circuits/bridge.circom` implements the logic for verifying cross-chain transfers between EVM and TON networks. It includes:
- Transfer parameter validation
- Chain ID verification
- Amount validation
- Signature verification using Poseidon hash
- Merkle tree verification for batch processing

### 2. Smart Contracts

#### EVM Contracts
- `ZKBridgeVerifier.sol`: Handles proof verification and asset locking/unlocking
- Supports multiple EVM chains
- Implements emergency pause functionality
- Gas-optimized operations

#### TON Contracts
- Written in FunC for optimal performance
- Handles TON-specific asset management
- Implements TON-specific security measures

### 3. Off-chain Components
TypeScript implementation for:
- Bridge configuration
- Proof generation
- Type definitions
- Network-specific utilities
- Transaction monitoring and relay

## Usage

### Bridging Assets from EVM to TON

1. Approve tokens (if transferring ERC20)
2. Call the bridge contract's lock function
3. Wait for proof generation
4. Submit proof to TON contract
5. Receive assets on TON

### Bridging Assets from TON to EVM

1. Lock assets in TON contract
2. Generate proof of lock
3. Submit proof to EVM contract
4. Receive assets on EVM chain

## Testing

Run the complete test suite:
```bash
npm test
```

Run specific tests:
```bash
npm test -- -g "Bridge Tests"  # Run only bridge tests
```

## Security

- All smart contracts are thoroughly audited
- Zero-knowledge proofs ensure transaction privacy
- Multiple security measures implemented
- Regular security updates

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT

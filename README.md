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
- Real-time event monitoring

## Project Structure

```
zk-bridge/
├── build/                  # Build artifacts
│   └── circuits/          # Circuit compilation outputs
│       ├── bridge.r1cs    # R1CS constraint system
│       ├── bridge.sym     # Symbol file
│       ├── bridge.zkey    # Proving key
│       └── verification_key.json
├── circuits/              # Circuit implementations
│   ├── bridge.circom     # Main bridge circuit
│   ├── transfer.circom   # Transfer circuit
│   ├── circomlib/        # Circom standard library
│   └── bridge_js/        # JavaScript witness generator
│       ├── bridge.wasm
│       ├── generate_witness.js
│       └── witness_calculator.js
├── contracts/            # Smart contracts
│   ├── evm/             # Ethereum contracts
│   │   ├── src/         # Contract source files
│   │   ├── test/        # Contract tests
│   │   └── script/      # Deployment scripts
│   └── ton/             # TON contracts
│       ├── contracts/   # FunC contract source
│       ├── scripts/     # Deployment scripts
│       ├── tests/       # Contract tests
│       └── wrappers/    # Contract wrappers
├── off-chain/           # Off-chain services
│   ├── config.ts        # Configuration
│   ├── prover.ts        # Proof generation
│   ├── validator.ts     # Validation logic
│   ├── types.ts         # Type definitions
│   └── ton-event-listener.ts  # TON event monitoring
├── scripts/             # Build scripts
│   ├── compile-circuits.js  # Circuit compilation
│   └── compile-func.js     # FunC compilation
└── test/               # Integration tests
    └── Bridge.test.js  # Bridge tests
```

## Prerequisites

- Node.js >= 16.0.0
- Rust >= 1.60.0 (for circuit compilation)
- TON CLI tools
- Circom 2.0
- Solidity compiler ^0.8.0
- Foundry (for EVM contract development)

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Install TON dependencies:
```bash
cd contracts/ton && npm install
```

3. Install Foundry (for EVM contracts):
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

4. Compile circuits:
```bash
node scripts/compile-circuits.js
```

## Bridge Components

### 1. Zero-Knowledge Circuits

#### Main Bridge Circuit (`bridge.circom`)
- Transfer parameter validation
- Chain ID verification
- Amount validation
- Signature verification using Poseidon hash

#### Transfer Circuit (`transfer.circom`)
- Cross-chain transfer validation
- Merkle tree verification for batch processing

### 2. Smart Contracts

#### EVM Contracts (Solidity)
- `ZKBridgeVerifier.sol`: Handles proof verification and asset locking/unlocking
- Supports multiple EVM chains
- Implements emergency pause functionality
- Gas-optimized operations

#### TON Contracts (FunC)
- `bridge.fc`: Main bridge contract
  - Handles asset locking/unlocking
  - Emits events for cross-chain transfers
  - Implements security checks and validations
- Written in FunC for optimal performance
- Implements TON-specific security measures

### 3. Off-chain Components

#### Event Listener (`ton-event-listener.ts`)
- Real-time monitoring of TON bridge events
- Tracks lock/unlock operations
- Provides detailed event information:
  - Transaction amount
  - Source/destination addresses
  - Chain IDs
  - Nonce tracking

#### Prover (`prover.ts`)
- Generates zero-knowledge proofs
- Handles witness generation
- Proof verification utilities

#### Validator (`validator.ts`)
- Transaction validation
- Chain-specific checks
- Security validations

## Usage

### Monitoring Bridge Events

1. Configure environment variables:
```bash
# In off-chain/.env
BRIDGE_CONTRACT_ADDRESS="your_bridge_address"
TON_ENDPOINT="https://toncenter.com/api/v2/jsonRPC"
```

2. Start the event listener:
```bash
cd off-chain
npm install
npm run start
```

### Deploying Contracts

#### TON Contract
```bash
cd contracts/ton
npm run deploy
```

#### EVM Contract
```bash
cd contracts/evm
forge build
forge deploy
```

## Testing

```bash
# TON contracts
cd contracts/ton
npm test

# EVM contracts
cd contracts/evm
forge test

# Circuits
npm run test-circuits
```

## Security

- All contracts are designed with security-first principles
- Implements emergency pause mechanisms
- Includes comprehensive validation checks
- Uses battle-tested cryptographic primitives

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

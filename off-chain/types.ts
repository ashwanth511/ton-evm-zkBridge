import { Dictionary, Message } from '@ton/core';

export interface NetworkConfig {
    chainId: number | string;
    bridgeAddress: string;
    rpc: string;
}

export interface BridgeConfig {
    evmNetwork: NetworkConfig;
    tonNetwork: NetworkConfig;
    wasmFile: string;
    zkeyFile: string;
}

export interface ValidatorConfig {
    sourceNetwork: NetworkConfig;
    destinationNetwork: NetworkConfig;
    privateKey: string;
}

export interface SnarkjsProof {
    proof: {
        pi_a: string[];
        pi_b: string[][];
        pi_c: string[];
    };
    publicSignals: string[];
}

export enum BridgeDirection {
    EVM_TO_TON = 'EVM_TO_TON',
    TON_TO_EVM = 'TON_TO_EVM'
}

export interface LockEvent {
    nonce: number;
    amount: string;
    destinationAddress: string;
    destinationChainId: number;
    sourceChainId: number;
    sourceBridgeAddress: string;
}

export interface ProofInput {
    nonce: number;
    amount: string;
    destinationAddress: string;
    destinationChainId: number;
    sourceChainId: number;
    sourceBridgeAddress: string;
}

export interface TonTransaction {
    tx: {
        lt: string;
        hash: Buffer;
        outMessages: Dictionary<number, Message>;
    };
}

import { BridgeConfig } from './types';

export const config: BridgeConfig = {
    evmNetwork: {
        chainId: 1, // Ethereum mainnet
        bridgeAddress: '0x...', // EVM bridge contract address
        rpc: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID'
    },
    tonNetwork: {
        chainId: 'mainnet', // TON mainnet
        bridgeAddress: 'EQC...', // TON bridge contract address
        rpc: 'https://toncenter.com/api/v2/jsonRPC'
    },
    wasmFile: '../circuits/bridge.wasm',
    zkeyFile: '../circuits/bridge.zkey'
};

import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';

export type Bridge2Config = {
    owner_address: Address;
    usdt_jetton_wallet: Address;
    total_locked: bigint;
};

export function bridge2ConfigToCell(config: Bridge2Config): Cell {
    return beginCell()
        .storeAddress(config.owner_address)
        .storeAddress(config.usdt_jetton_wallet)
        .storeCoins(config.total_locked)
        .endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
    receive_tokens: 0x7362d09c, // op for receive_tokens
};

export class Bridge2 implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Bridge2(address);
    }

    static createFromConfig(config: Bridge2Config, code: Cell, workchain = 0) {
        const data = bridge2ConfigToCell(config);
        const init = { code, data };
        return new Bridge2(contractAddress(workchain, init), init);
    }

    async deploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value, 
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async send(provider: ContractProvider, via: Sender, opts: { value: bigint; body: Cell }) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: opts.body,
        });
    }

    // Helper to create transfer notification message
    static createTransferNotification(amount: bigint, fromAddress: Address, evmAddress: string): Cell {
        // Remove '0x' prefix if present
        const cleanEvmAddress = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress;
        
        return beginCell()
            .storeUint(Opcodes.receive_tokens, 32)  // op::receive_tokens
            .storeCoins(amount)                     // amount
            .storeAddress(fromAddress)              // from_address
            .storeUint(BigInt('0x' + cleanEvmAddress), 160) // EVM address
            .endCell();
    }

    // Method to receive tokens and emit deposit event
    async receiveTokens(
        provider: ContractProvider,
        via: Sender,
        opts: {
            amount: bigint,
            fromAddress: Address,
            evmAddress: string,
            value?: bigint
        }
    ) {
        const msgBody = Bridge2.createTransferNotification(
            opts.amount,
            opts.fromAddress,
            opts.evmAddress
        );

        await this.send(provider, via, {
            value: opts.value ?? toNano('0.05'),
            body: msgBody
        });
    }

    async getState() {
        // This is just a placeholder - the actual state depends on your contract
        return {
            balance: 0n,
            seqno: 0,
            lastTransactionId: { lt: 0n, hash: Buffer.alloc(0) },
        };
    }
} 
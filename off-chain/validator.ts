import { ethers } from 'ethers';
import { 
    SnarkjsProof, 
    ValidatorConfig, 
    LockEvent, 
    ProofInput, 
    BridgeDirection,
    TonTransaction
} from './types';
import { generateZKProof } from './prover';
import { TonClient4 as TonClient } from '@ton/ton';
import { 
    Address, 
    Dictionary, 
    Message, 
    Cell, 
    beginCell,
    Slice,
    toNano
} from '@ton/core';

class BridgeValidator {
    private sourceProvider: ethers.providers.JsonRpcProvider | TonClient;
    private destProvider: ethers.providers.JsonRpcProvider | TonClient;
    private wallet: ethers.Wallet;
    private bridgeContract: ethers.Contract;
    private config: ValidatorConfig;
    private direction: BridgeDirection;
    private lastProcessedLt?: string;
    private lastProcessedHash?: Buffer;

    constructor(
        config: ValidatorConfig,
        bridgeABI: any,
        direction: BridgeDirection
    ) {
        this.config = config;
        this.direction = direction;
        
        if (direction === BridgeDirection.EVM_TO_TON) {
            this.sourceProvider = new ethers.providers.JsonRpcProvider(config.sourceNetwork.rpc);
            this.destProvider = new TonClient({ endpoint: config.destinationNetwork.rpc });
        } else {
            this.sourceProvider = new TonClient({ endpoint: config.sourceNetwork.rpc });
            this.destProvider = new ethers.providers.JsonRpcProvider(config.destinationNetwork.rpc);
        }
        
        this.wallet = new ethers.Wallet(config.privateKey, 
            direction === BridgeDirection.TON_TO_EVM ? this.destProvider as ethers.providers.JsonRpcProvider : undefined
        );
        this.bridgeContract = new ethers.Contract(
            config.destinationNetwork.bridgeAddress,
            bridgeABI,
            this.wallet
        );
    }

    async start(): Promise<void> {
        console.log('Starting bridge validator...');
        console.log(`Direction: ${this.direction}`);
        console.log(`Source Chain: ${this.config.sourceNetwork.chainId}`);
        console.log(`Destination Chain: ${this.config.destinationNetwork.chainId}`);
        
        try {
            if (this.direction === BridgeDirection.EVM_TO_TON) {
                await this.listenToEvmLockEvents();
            } else {
                await this.listenToTonLockEvents();
            }
        } catch (error) {
            console.error('Error starting validator:', error);
            throw error;
        }
    }

  /*  private async listenToTonLockEvents(): Promise<void> {
        const bridgeAddress = Address.parse(this.config.sourceNetwork.bridgeAddress);
        const tonClient = this.sourceProvider as TonClient;

        console.log('Starting TON event listener...');

        setInterval(async () => {
            try {
                const { last } = await tonClient.getLastBlock();
                const transactions = await tonClient.getAccountTransactions(bridgeAddress, Buffer.from(last.seqno.toString(), 'hex'), 20);

                for (const tx of transactions) {
                    const transaction = tx as TonTransaction;
                    if (!transaction?.tx) continue;

                    if (await this.isTonLockEvent(transaction.tx)) {
                        console.log('Found TON lock event, processing...');
                        await this.handleTonLockEvent(transaction.tx);
                    }

                    this.lastProcessedLt = transaction.tx.lt;
                    this.lastProcessedHash = transaction.tx.hash;
                }
            } catch (error) {
                console.error('Error polling TON events:', error);
            }
        }, 10000);
    } */




        private async listenToTonLockEvents(): Promise<void> {
            const bridgeAddress = Address.parse(this.config.sourceNetwork.bridgeAddress);
            const tonClient = this.sourceProvider as TonClient;
        
            console.log('Starting TON event listener...');
        
            setInterval(async () => {
                try {
                    const { last } = await tonClient.getLastBlock();
        
                    // Convert seqno to bigint
                    const transactions = await tonClient.getAccountTransactions(bridgeAddress, BigInt(last.seqno), 20);
        
                    for (const tx of transactions) {
                        const transaction = tx as TonTransaction;
        
                        // Skip if no transaction is present
                        if (!transaction?.tx) continue;
        
                        // Check if it's a TON lock event
                        if (await this.isTonLockEvent(transaction.tx)) {
                            console.log('Found TON lock event, processing...');
                            await this.handleTonLockEvent(transaction.tx);
                        }
        
                        // Update last processed LT and hash (ensure bigint for LT)
                        this.lastProcessedLt = transaction.tx.lt; // Ensure `lt` is bigint
                        this.lastProcessedHash = transaction.tx.hash; // Ensure `hash` matches your defined type
                    }
                } catch (error) {
                    console.error('Error polling TON events:', error);
                }
            }, 10000);
        }
        
        
        




    private async isTonLockEvent(tx: TonTransaction['tx']): Promise<boolean> {
        try {
            if (!tx.outMessages) return false;
            const messages = Array.from(tx.outMessages.values());
            if (messages.length === 0) return false;

            const message = messages[0];
            if (!message?.body) return false;

            const slice = message.body.beginParse();
            const opCode = slice.loadUint(32);
            
            const LOCK_EVENT_CODE = 0x7362d09c;
            return opCode === LOCK_EVENT_CODE;
        } catch (error) {
            console.error('Error checking TON lock event:', error);
            return false;
        }
    }

    private async handleTonLockEvent(tx: TonTransaction['tx']): Promise<void> {
        try {
            if (!tx.outMessages) throw new Error('No outMessages in transaction');
            const messages = Array.from(tx.outMessages.values());
            if (messages.length === 0) throw new Error('Empty outMessages array');

            const message = messages[0];
            if (!message?.body) throw new Error('No message body');

            const slice = message.body.beginParse();
            slice.loadUint(32); // Skip op code
            
            const lockEvent = this.parseTonLockEvent(slice);
            console.log('Parsed lock event:', lockEvent);

            const proofInput: ProofInput = {
                nonce: lockEvent.nonce,
                amount: lockEvent.amount,
                destinationAddress: lockEvent.destinationAddress,
                destinationChainId: lockEvent.destinationChainId,
                sourceChainId: lockEvent.sourceChainId,
                sourceBridgeAddress: lockEvent.sourceBridgeAddress
            };

            const proof = await generateZKProof(proofInput, this.direction);
            await this.submitProof(proof);
            
            console.log('Successfully processed TON lock event');
        } catch (error) {
            console.error('Error handling TON lock event:', error);
            throw error;
        }
    }

    private parseTonLockEvent(slice: Slice): LockEvent {
        try {
            return {
                nonce: Number(slice.loadUint(64)),
                amount: slice.loadCoins().toString(),
                destinationAddress: slice.loadUint(160).toString(16).padStart(40, '0'),
                destinationChainId: Number(slice.loadUint(32)),
                sourceChainId: Number(this.config.sourceNetwork.chainId),
                sourceBridgeAddress: this.config.sourceNetwork.bridgeAddress
            };
        } catch (error) {
            console.error('Error parsing TON lock event:', error);
            throw error;
        }
    }

    private async listenToEvmLockEvents(): Promise<void> {
        console.log('Starting EVM event listener...');
        
        try {
            const filter = this.bridgeContract.filters.TokensLocked();
            console.log('Created event filter:', filter);

            (this.sourceProvider as ethers.providers.JsonRpcProvider).on(filter, async (event) => {
                try {
                    console.log('Found EVM lock event, processing...');
                    await this.handleEvmLockEvent(event);
                } catch (error) {
                    console.error('Error handling EVM lock event:', error);
                }
            });
        } catch (error) {
            console.error('Error setting up EVM event listener:', error);
            throw error;
        }
    }

    private decodeLockEvent(event: ethers.Event): LockEvent {
        try {
            const data = this.bridgeContract.interface.parseLog(event);
            
            return {
                nonce: data.args.nonce.toNumber(),
                amount: data.args.amount.toString(),
                destinationAddress: data.args.destinationAddress,
                destinationChainId: data.args.destinationChainId,
                sourceChainId: Number(this.config.sourceNetwork.chainId),
                sourceBridgeAddress: this.config.sourceNetwork.bridgeAddress
            };
        } catch (error) {
            console.error('Error decoding EVM lock event:', error);
            throw error;
        }
    }

    private async handleEvmLockEvent(event: ethers.Event): Promise<void> {
        try {
            console.log('Decoding EVM lock event...');
            const lockEvent = this.decodeLockEvent(event);
            console.log('Decoded lock event:', lockEvent);

            const proofInput: ProofInput = {
                nonce: lockEvent.nonce,
                amount: lockEvent.amount,
                destinationAddress: lockEvent.destinationAddress,
                destinationChainId: lockEvent.destinationChainId,
                sourceChainId: lockEvent.sourceChainId,
                sourceBridgeAddress: lockEvent.sourceBridgeAddress
            };

            const proof = await generateZKProof(proofInput, this.direction);
            console.log('ZK proof generated successfully');

            const tonClient = this.destProvider as TonClient;
            const messageBody = this.createTonMessage(proof, lockEvent);
            
            console.log('Submitting proof to TON contract...');
            const boc = messageBody.toBoc();
            await tonClient.sendMessage(boc);
            console.log('Successfully submitted proof to TON contract');
        } catch (error) {
            console.error('Error handling EVM lock event:', error);
            throw error;
        }
    }

    private createTonMessage(proof: SnarkjsProof, lockEvent: LockEvent): Cell {
        try {
            const UNLOCK_OP = 0x8362d09c;
            
            return beginCell()
                .storeUint(UNLOCK_OP, 32)
                .storeRef(
                    beginCell()
                        .storeUint(proof.proof.pi_a.length, 8)
                        .storeStringTail(proof.proof.pi_a.join(','))
                        .storeUint(proof.proof.pi_b.length, 8)
                        .storeStringTail(proof.proof.pi_b.map(arr => arr.join(',')).join('|'))
                        .storeUint(proof.proof.pi_c.length, 8)
                        .storeStringTail(proof.proof.pi_c.join(','))
                        .storeStringTail(proof.publicSignals.join(','))
                        .endCell()
                )
                .storeUint(lockEvent.nonce, 64)
                .storeCoins(toNano(lockEvent.amount))
                .storeUint(BigInt('0x' + lockEvent.destinationAddress), 160)
                .storeUint(lockEvent.destinationChainId, 32)
                .storeUint(lockEvent.sourceChainId, 32)
                .storeStringTail(lockEvent.sourceBridgeAddress)
                .endCell();
        } catch (error) {
            console.error('Error creating TON message:', error);
            throw error;
        }
    }

    private async submitProof(proof: SnarkjsProof): Promise<void> {
        if (this.direction === BridgeDirection.TON_TO_EVM) {
            try {
                const tx = await this.bridgeContract.submitProof(
                    proof.proof.pi_a,
                    proof.proof.pi_b,
                    proof.proof.pi_c,
                    proof.publicSignals
                );
                await tx.wait();
                console.log('Proof submitted successfully to EVM chain');
            } catch (error) {
                console.error('Error submitting proof to EVM chain:', error);
                throw error;
            }
        }
    }
}

export { BridgeValidator };

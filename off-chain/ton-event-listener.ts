import { TonClient } from "@ton/ton";
import { Address, beginCell, Cell } from "@ton/core";

// Configuration
const BRIDGE_ADDRESS = process.env.BRIDGE_CONTRACT_ADDRESS || '';
const TON_ENDPOINT = process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC';

async function initTonClient() {
    return new TonClient({ endpoint: TON_ENDPOINT });
}

interface LockEvent {
    nonce: bigint;
    amount: bigint;
    destinationAddress: string;
    destinationChainId: number;
    timestamp: number;
    transactionHash: string;
}

class TonEventListener {
    private client: TonClient | null = null;
    private isRunning: boolean = false;

    async start() {
        if (!BRIDGE_ADDRESS) {
            throw new Error('Bridge contract address not configured');
        }

        this.client = await initTonClient();
        const bridgeAddress = Address.parse(BRIDGE_ADDRESS);
        this.isRunning = true;

        console.log('Starting event listener for bridge contract:', BRIDGE_ADDRESS);
        console.log('Connected to TON endpoint:', TON_ENDPOINT);
        
        while (this.isRunning) {
            try {
                // Get latest transactions
                const transactions = await this.client.getTransactions(bridgeAddress, {
                    limit: 100
                });

                for (const tx of transactions) {
                    if (tx.inMessage?.body) {
                        const slice = tx.inMessage.body.beginParse();
                        try {
                            const eventId = slice.loadUint(16);
                            if (eventId === 0x1234) { // Lock event ID
                                const event = this.parseLockEvent(slice, tx);
                                this.handleLockEvent(event);
                            }
                        } catch (e) {
                            // Skip if message doesn't match our event format
                            continue;
                        }
                    }
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            } catch (error) {
                console.error('Error fetching transactions:', error);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
            }
        }
    }

    private parseLockEvent(slice: any, transaction: any): LockEvent {
        const nonce = slice.loadUint(64);
        const amount = slice.loadCoins();
        const destinationAddress = slice.loadSlice();
        const destinationChainId = slice.loadUint(32);

        return {
            nonce: BigInt(nonce),
            amount: amount,
            destinationAddress: destinationAddress.toString(),
            destinationChainId: destinationChainId,
            timestamp: transaction.now || Math.floor(Date.now() / 1000),
            transactionHash: transaction.hash || ''
        };
    }

    private handleLockEvent(event: LockEvent) {
        console.log('\n🔒 Lock Event Detected:');
        console.log('------------------------');
        console.log('Nonce:', event.nonce.toString());
        console.log('Amount:', event.amount.toString(), 'TON');
        console.log('Destination Address:', event.destinationAddress);
        console.log('Destination Chain ID:', event.destinationChainId);
        console.log('Timestamp:', new Date(event.timestamp * 1000).toISOString());
        console.log('Transaction Hash:', event.transactionHash);
        console.log('------------------------\n');
    }

    async stop() {
        this.isRunning = false;
        console.log('Event listener stopped');
    }
}

// Start the listener
const listener = new TonEventListener();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await listener.stop();
    process.exit(0);
});

// Start listening for events
listener.start().catch(console.error);

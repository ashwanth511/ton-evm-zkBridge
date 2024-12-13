import { TonClient } from "@ton/ton";
import { Address, beginCell, Cell } from "@ton/core";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// Configuration
const BRIDGE_ADDRESS = "EQDXKTA14xyde2ZqkPCfNOSnGMiAGGBJDsijHHh2trBxyMdi";

async function initTonClient() {
    // Get the best endpoint for TON mainnet
    const endpoint = await getHttpEndpoint({
        network: "testnet",// "mainnet"  // or "testnet" if you're using testnet
    });
    return new TonClient({ endpoint });
}

interface DepositEvent {
    queryId: string;
    sender: string;
    evmAddress: string;
    jettonAmount: string;
    timestamp: string;
    transactionHash: string;
}

class TonEventListener {
    private client: TonClient | null = null;
    private isRunning: boolean = false;
    private lastTransactionLt: bigint | undefined;

    async start() {
        try {
            this.client = await initTonClient();
            this.isRunning = true;
            await this.listen();
        } catch (error) {
            console.error('Failed to start listener:', error);
            throw error;
        }
    }

    private async listen() {
        if (!this.client) throw new Error('Client not initialized');
        const bridgeAddress = Address.parse(BRIDGE_ADDRESS);

        console.log('Starting to listen for deposit events...');
        console.log('Monitoring bridge contract:', BRIDGE_ADDRESS);

        while (this.isRunning) {
            try {
                const transactions = await this.client.getTransactions(bridgeAddress, {
                    limit: 100,
                    lt: this.lastTransactionLt ? this.lastTransactionLt.toString() : undefined
                });

                for (const tx of transactions) {
                    // Update last transaction lt
                    const currentLt = BigInt(tx.lt);
                    if (!this.lastTransactionLt || currentLt > this.lastTransactionLt) {
                        this.lastTransactionLt = currentLt;
                    }

                    // Process transaction messages
                    const messages = tx.outMessages;
                    if (!messages) continue;

                    for (const [_, message] of messages) {
                        if (!message.body) continue;

                        try {
                            const slice = message.body.beginParse();
                            const op = slice.loadUint(32);

                            // Check if this is a DepositNotification event
                            if (op === 0x7362d09c) {
                                const queryId = slice.loadUint(64);
                                const sender = slice.loadAddress();
                                const evmAddress = slice.loadUint(160);
                                const jettonAmount = slice.loadCoins();

                                const event: DepositEvent = {
                                    queryId: queryId.toString(),
                                    sender: sender.toString(),
                                    evmAddress: '0x' + evmAddress.toString(16).padStart(40, '0'),
                                    jettonAmount: jettonAmount.toString(),
                                    timestamp: new Date(tx.now * 1000).toISOString(),
                                    transactionHash: tx.hash().toString('hex')
                                };

                                this.handleDepositEvent(event);
                            }
                        } catch (e) {
                            // Skip messages that can't be parsed
                            continue;
                        }
                    }
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, 10000));
            } catch (error) {
                console.error('Error while listening:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private handleDepositEvent(event: DepositEvent) {
        console.log('\n💸 Deposit Event Detected:');
        console.log('------------------------');
        console.log('Query ID:', event.queryId);
        console.log('Sender:', event.sender);
        console.log('EVM Address:', event.evmAddress);
        console.log('Jetton Amount:', event.jettonAmount);
        console.log('Timestamp:', event.timestamp);
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

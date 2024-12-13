import { TonClient, Address, Cell, beginCell } from "@ton/ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// Configuration
const BRIDGE_ADDRESS = "EQBrT2-9PpAjFqy_JDNLgF0MgZw3Vt2k74bvmQ7sXoipUzPD";

interface DepositEvent {
    queryId: bigint;
    sender: Address;
    evmAddress: bigint;
    tonAmount: bigint;
}

class TonEventListener {
    private client: TonClient | null = null;
    private isRunning: boolean = false;
    private lastTransactionLt: bigint | undefined;
    private seenTransactions: Set<string> = new Set();

    async start() {
        if (this.isRunning) return;
        
        try {
            // Initialize TON client with testnet
            const endpoint = await getHttpEndpoint({ network: 'testnet' });
            this.client = new TonClient({ endpoint });
            this.isRunning = true;
            
            console.log("🟢 Starting event listener on testnet...");
            console.log("📡 Connected to endpoint:", endpoint);
            console.log("🔍 Monitoring bridge address:", BRIDGE_ADDRESS);
            console.log("\n⏳ Waiting for new events...\n");
            
            // Get latest transaction to start from
            const latestTx = await this.client.getTransactions(Address.parse(BRIDGE_ADDRESS), { limit: 1 });
            if (latestTx.length > 0) {
                this.lastTransactionLt = BigInt(latestTx[0].lt);
                const hash = latestTx[0].hash().toString('hex');
                this.seenTransactions.add(hash);
            }
            
            await this.listen();
        } catch (error) {
            console.error("Failed to start listener:", error);
            process.exit(1);
        }
    }

    async listen() {
        while (this.isRunning && this.client) {
            try {
                // Get transactions since last check
                const transactions = await this.client.getTransactions(
                    Address.parse(BRIDGE_ADDRESS),
                    { 
                        limit: 100, 
                        lt: this.lastTransactionLt ? this.lastTransactionLt.toString() : undefined 
                    }
                );

                // Process transactions in reverse (oldest to newest)
                for (const tx of transactions.reverse()) {
                    // Skip if we've seen this transaction
                    const hash = tx.hash().toString('hex');
                    if (this.seenTransactions.has(hash)) {
                        continue;
                    }
                    
                    // Mark as seen
                    this.seenTransactions.add(hash);
                    
                    // Update last transaction lt if newer
                    const txLt = BigInt(tx.lt);
                    if (!this.lastTransactionLt || txLt > this.lastTransactionLt) {
                        this.lastTransactionLt = txLt;
                    }

                    // Check for events in transaction
                    if (tx.outMessages && tx.outMessages.size > 0) {
                        for (const [_, msg] of tx.outMessages) {
                            if (msg.body) {
                                try {
                                    const slice = msg.body.beginParse();
                                    const event = this.parseDepositEvent(slice);
                                    if (event) {
                                        await this.handleDepositEvent(event);
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                        }
                    }
                }

                // Clean up old transaction hashes (keep last 1000)
                if (this.seenTransactions.size > 1000) {
                    const oldestToKeep = Array.from(this.seenTransactions).slice(-1000);
                    this.seenTransactions = new Set(oldestToKeep);
                }

                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error: any) {
                const errorMessage = error?.message || 'Unknown error occurred';
                console.error("\n❌ Error in event listener:", errorMessage);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private parseDepositEvent(slice: any): DepositEvent | null {
        try {
            const queryId = slice.loadUintBig(64);
            const sender = slice.loadAddress();
            const evmAddress = slice.loadUintBig(160);
            const tonAmount = slice.loadCoins();

            return {
                queryId,
                sender,
                evmAddress,
                tonAmount
            };
        } catch (e) {
            return null;
        }
    }

    async handleDepositEvent(event: DepositEvent) {
        console.log('\n🔵 New Deposit Event Detected:');
        console.log('├─ Query ID:', event.queryId.toString());
        console.log('├─ From:', event.sender.toString());
        console.log('├─ To EVM: 0x' + event.evmAddress.toString(16).padStart(40, '0'));
        console.log('└─ Amount:', event.tonAmount.toString(), 'nanoTON');
        console.log('');
    }

    stop() {
        this.isRunning = false;
        console.log("\n🔴 Stopping event listener...");
    }
}

// Start the listener
const listener = new TonEventListener();
listener.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
    listener.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    listener.stop();
    process.exit(0);
});

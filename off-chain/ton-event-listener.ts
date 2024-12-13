import { TonClient } from "@ton/ton";
import { Address, beginCell, Cell } from "@ton/core";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// Configuration
const BRIDGE_ADDRESS = "EQBrT2-9PpAjFqy_JDNLgF0MgZw3Vt2k74bvmQ7sXoipUzPD";

// Event structure matching the contract
interface DepositEvent {
    queryId: bigint;
    sender: string;
    evmAddress: string;
    tonAmount: bigint;
}

class TonEventListener {
    private client: TonClient | null = null;
    private isRunning: boolean = false;
    private lastTransactionLt: bigint | undefined;

    async start() {
        if (this.isRunning) return;
        
        // Initialize TON client with TONX endpoint
        const endpoint = "https://mainnet-rpc.tonxapi.com/v2/json-rpc/c8d4c912-a2ff-42cf-8792-76fcce6edde5";
        this.client = new TonClient({ endpoint });
        this.isRunning = true;
        
        console.log("Starting event listener...");
        await this.listen();
    }

    async listen() {
        console.clear();
        console.log(" Listening for bridge events on:", BRIDGE_ADDRESS);
        console.log("Waiting for deposits...\n");
        
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

                for (const tx of transactions) {
                    // Update last transaction lt
                    if (!this.lastTransactionLt || tx.lt > this.lastTransactionLt) {
                        this.lastTransactionLt = tx.lt;
                    }

                    // Check for events in transaction
                    if (tx.outMessages) {
                        for (const [_, msg] of tx.outMessages) {
                            if (msg.body) {
                                try {
                                    const slice = msg.body.beginParse();
                                    const op = slice.loadUint(32);
                                    
                                    // Check if this is a DepositEvent
                                    if (op === 0xf8b8c913) {
                                        const event = this.parseDepositEvent(slice);
                                        await this.handleDepositEvent(event);
                                    }
                                } catch (e) {
                                    // Skip messages that can't be parsed
                                    continue;
                                }
                            }
                        }
                    }
                }

                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error("\n Error in event listener:", error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private parseDepositEvent(slice: any): DepositEvent {
        return {
            queryId: slice.loadUintBig(64),
            sender: slice.loadAddress().toString(),
            evmAddress: '0x' + slice.loadUintBig(160).toString(16).padStart(40, '0'),
            tonAmount: slice.loadCoins()
        };
    }

    async handleDepositEvent(event: DepositEvent) {
        console.log(' New Deposit Event Detected:');
        console.log('─ From:', event.sender);
        console.log('─ To EVM:', event.evmAddress);
        console.log('─ Amount:', event.tonAmount.toString(), 'nanoTON');
        console.log('─ Query ID:', event.queryId.toString());
        console.log('');
    }

    stop() {
        this.isRunning = false;
        console.log("\n Stopping event listener...");
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

import { TonClient, Address } from "@ton/ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// Configuration
const BRIDGE_ADDRESS = "EQBrT2-9PpAjFqy_JDNLgF0MgZw3Vt2k74bvmQ7sXoipUzPD";

async function main() {
    try {
        // Initialize TON client with testnet
        const endpoint = await getHttpEndpoint({ network: 'testnet' });
        const client = new TonClient({ endpoint });
        
        console.log("Starting event listener on testnet...");
        console.log("Connected to endpoint:", endpoint);
        console.log("Monitoring bridge address:", BRIDGE_ADDRESS);
        console.log("\nWaiting for events...\n");
        
        let lastLt: bigint | undefined;
        let eventCounter = 0;
        
        // Get initial transaction lt
        const initialTx = await client.getTransactions(Address.parse(BRIDGE_ADDRESS), { limit: 1 });
        if (initialTx.length > 0) {
            lastLt = BigInt(initialTx[0].lt);
            console.log("Starting from transaction lt:", lastLt.toString());
        }

        while (true) {
            try {
                // Get new transactions
                const transactions = await client.getTransactions(
                    Address.parse(BRIDGE_ADDRESS),
                    { 
                        limit: 50,
                        lt: lastLt ? lastLt.toString() : undefined
                    }
                );

                if (transactions.length > 0) {
                    console.log("\nFound", transactions.length, "transactions");
                }

                // Process new transactions in reverse order (oldest first)
                for (const tx of transactions.reverse()) {
                    // Update last seen lt if newer
                    const txLt = BigInt(tx.lt);
                    if (!lastLt || txLt > lastLt) {
                        lastLt = txLt;
                    }

                    // Check messages
                    if (tx.outMessages) {
                        const msgCount = tx.outMessages.size;
                        if (msgCount > 0) {
                            console.log(`Processing ${msgCount} messages from tx:`, tx.hash().toString('hex'));
                        }

                        for (const [_, msg] of tx.outMessages) {
                            if (msg.body) {
                                try {
                                    const slice = msg.body.beginParse();
                                    
                                    // Try to parse message
                                    try {
                                        // Load and check operation (32-bit unsigned)
                                        const op = slice.loadUint(32);
                                        console.log("Message op:", op.toString(16));

                                        // Try to parse as deposit event
                                        const queryId = slice.loadUintBig(64);
                                        const sender = slice.loadAddress();
                                        const evmAddress = slice.loadUintBig(160);
                                        const tonAmount = slice.loadCoins();

                                        eventCounter++;
                                        console.log(`\nevent ${eventCounter} = queryId = ${queryId}`);
                                        console.log(`    evmAddress = 0x${evmAddress.toString(16)}`);
                                        console.log(`    amount = ${tonAmount.toString()}`);
                                        console.log(`    sender = ${sender.toString()}\n`);
                                    } catch (error) {
                                        // Not a deposit event message
                                        console.log("Failed to parse as deposit event:", error instanceof Error ? error.message : String(error));
                                        continue;
                                    }
                                } catch (error) {
                                    console.log("Failed to parse message body:", error instanceof Error ? error.message : String(error));
                                    continue;
                                }
                            }
                        }
                    }
                }

                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error("Error:", error instanceof Error ? error.message : String(error));
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        console.error("Fatal error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Start the listener
main().catch(error => {
    console.error("Unhandled error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\nStopping event listener...");
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log("\nStopping event listener...");
    process.exit(0);
});

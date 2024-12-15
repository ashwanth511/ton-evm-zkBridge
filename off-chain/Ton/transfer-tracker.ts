import { TonClient, Address } from "@ton/ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { withdrawToEVM } from './withdraw';

// Configuration
const BRIDGE_ADDRESS = "EQAqO-g7-NpA76JakmlnZnNOafdDdrKy_LMtPpIkWnlkg032";

// Set to store processed queryIds from deposits
const processedQueryIds = new Set<string>();

async function main() {
    try {
        // Initialize TON client with testnet
        const endpoint = await getHttpEndpoint({ network: 'testnet' });
        const client = new TonClient({ endpoint });
        
        console.log("Starting deposit event tracker on testnet...");
        console.log("Connected to endpoint:", endpoint);
        console.log("Monitoring bridge address:", BRIDGE_ADDRESS);
        console.log("\nWaiting for deposit events...\n");
        
        let lastLt: bigint | undefined;
        
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
                                        // Load operation (32-bit unsigned)
                                        const op = slice.loadUint(32);
                                        console.log("Message op:", op.toString(16));

                                        // Load queryId and other fields
                                        const queryId = slice.loadUintBig(64).toString();
                                        const sender = slice.loadAddress();
                                        const evmAddress = slice.loadUintBig(160); // Load evmAddress as uint160
                                        const tonAmount = slice.loadCoins(); // Load tonAmount as coins
                                        
                                        // Check if this queryId has been processed before
                                        if (processedQueryIds.has(queryId)) {
                                            console.log(`Already processed deposit:
    QueryId: ${queryId}
    Sender: ${sender.toString()}
    EVM Address: 0x${evmAddress.toString(16).padStart(40, '0')}
    TON Amount: ${Number(tonAmount) / 1e9} TON`);
                                        } else {
                                            console.log(`New deposit detected:
    QueryId: ${queryId}
    Sender: ${sender.toString()}
    EVM Address: 0x${evmAddress.toString(16).padStart(40, '0')}
    TON Amount: ${Number(tonAmount) / 1e9} TON`);
                                            
                                            try {
                                                // Process the withdrawal
                                                const txHash = await withdrawToEVM({
                                                    evmAddress: `0x${evmAddress.toString(16).padStart(40, '0')}`,
                                                    tonAmount: Number(tonAmount) / 1e9
                                                });
                                                console.log(`Withdrawal processed successfully. Transaction hash: ${txHash}`);
                                                processedQueryIds.add(queryId);
                                            } catch (error) {
                                                console.error("Error processing withdrawal:", error);
                                                // Don't add to processedQueryIds if withdrawal fails
                                                // This will allow retry on next detection
                                            }
                                        }
                                    } catch (e) {
                                        // Skip if message format doesn't match expected structure
                                        continue;
                                    }
                                } catch (e) {
                                    // Skip if message body can't be parsed
                                    continue;
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing transactions:", error);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}

// Start the tracker
main().catch(error => {
    console.error("Unhandled error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
});

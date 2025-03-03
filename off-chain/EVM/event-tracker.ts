import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
 import { withdrawToTon } from './withdraw';
import { ethToTon } from '../utils/priceConverter';


// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

// Import ABI
const bridgeABI = require('./abi.json');

// Configuration
const BRIDGE_ADDRESS = process.env.EVM_BRIDGE_CONTRACT_ADDRESS;
const RPC_URL = process.env.SEPOLIA_RPC_URL;

if (!BRIDGE_ADDRESS || !RPC_URL) {
    throw new Error("Missing required environment variables");
}

// Set to store processed queryIds
const processedQueryIds = new Set<string>();

async function main() {
    try {
        // Initialize provider
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL as string);
        const network = await provider.getNetwork();
        console.log("Connected to network:", network.name);
        
        // Initialize contract
        const bridge = new ethers.Contract(BRIDGE_ADDRESS as string, bridgeABI, provider);
        console.log("Monitoring Bridge2 contract at:", BRIDGE_ADDRESS);
        console.log("\nWaiting for events...\n");

        // Listen for Deposit events
        bridge.on("DepositEvent", async (queryId, sender, tonAddress, amount, event) => {
            // Convert queryId to string for Set storage
            const queryIdStr = queryId.toString();
            
            // Convert tonAddress from bytes to string
            const tonAddressStr = ethers.utils.toUtf8String(tonAddress);
            
            if (processedQueryIds.has(queryIdStr)) {
                console.log(`\nAlready processed deposit:
    QueryId: ${queryId}
    Sender: ${sender}
    TON Address: ${tonAddressStr}
    Amount: ${ethers.utils.formatEther(amount)} ETH
    Transaction Hash: ${event.transactionHash}`);
            } else {
                console.log(`\nNew deposit detected:
    QueryId: ${queryId}
    Sender: ${sender}
    TON Address: ${tonAddressStr}
    Amount: ${ethers.utils.formatEther(amount)} ETH
    Transaction Hash: ${event.transactionHash}`);
                
                try {
                    // Convert ETH amount to TON
                    const ethAmountNumber = parseFloat(ethers.utils.formatEther(amount));
                    const tonAmount = await ethToTon(ethAmountNumber);
                    
                    // Initiate withdrawal to TON
                    const withdrawResult = await withdrawToTon({
                        amount: tonAmount.toString(),
                        toAddress: tonAddressStr
                    });

                

                    
                    console.log(`\nWithdrawal initiated:
    TON Amount: ${tonAmount} TON
    Transaction Hash:  ${withdrawResult.hash}`); 
                    
                    processedQueryIds.add(queryIdStr);
                } catch (error) {
                    console.error(`\nError processing withdrawal for queryId ${queryId}:`, error);
                }
            }
        });

        // Listen for Withdraw events
        bridge.on("WithdrawEvent", async (recipient, amount, event) => {
            console.log(`\nWithdraw detected:
    Recipient: ${recipient}
    Amount: ${ethers.utils.formatEther(amount)} ETH
    Transaction Hash: ${event.transactionHash}`);
        });

        // Keep the process running
        process.stdin.resume();

    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}

// Handle errors and cleanup
process.on('SIGINT', () => {
    console.log("\nGracefully shutting down...");
    process.exit(0);
});

if (require.main === module) {
    main();
}

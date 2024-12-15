import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { tonToEth } from '../utils/priceConverter';

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

// Import ABI
const bridgeABI = require('../EVM/abi.json');

// Configuration
const BRIDGE_ADDRESS = process.env.EVM_BRIDGE_CONTRACT_ADDRESS;
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;

if (!BRIDGE_ADDRESS || !RPC_URL || !PRIVATE_KEY) {
    throw new Error("Missing required environment variables");
}

export interface WithdrawParams {
    evmAddress: string;
    tonAmount: number;
}

async function withdrawToEVM({ evmAddress, tonAmount }: WithdrawParams): Promise<string> {
    try {
        if (!ethers.utils.isAddress(evmAddress)) {
            throw new Error("Invalid EVM address");
        }

        // Initialize provider and signer
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY as string, provider);
        
        // Initialize contract with signer
        const bridge = new ethers.Contract(BRIDGE_ADDRESS as string, bridgeABI, wallet);
        
        // Convert TON amount to ETH
        const ethAmount = await tonToEth(tonAmount);
        
        // Convert ETH amount to Wei (the smallest ETH unit)
        const weiAmount = ethers.utils.parseEther(ethAmount.toString());
        
        console.log(`Converting ${tonAmount} TON to ${ethAmount} ETH (${weiAmount.toString()} wei)`);
        
        // Call withdraw function
        const tx = await bridge.Withdraw(evmAddress, weiAmount);
        console.log("Transaction sent:", tx.hash);
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        
        return tx.hash;
    } catch (error) {
        console.error("Error in withdrawToEVM:", error);
        throw error;
    }
}

// Example usage
async function main() {
    try {
        const withdrawParams: WithdrawParams = {
            evmAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // example address
            tonAmount: 10 // amount in TON
        };
        
        const txHash = await withdrawToEVM(withdrawParams);
        console.log("Withdrawal successful! Transaction hash:", txHash);
    } catch (error) {
        console.error("Error in main:", error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { withdrawToEVM };

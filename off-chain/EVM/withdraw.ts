import { Address, toNano, Cell, beginCell, ContractProvider, OpenedContract } from '@ton/core';
import { TonClient, WalletContractV1R3, internal, SendMode } from '@ton/ton';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Bridge, Withdraw } from './wrappers/bridge2';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { mnemonicToWalletKey } from '@ton/crypto';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Get private key from environment
const MNEMONIC = process.env.TON_MNEMONIC ?? '';
if (!MNEMONIC) {
    throw new Error("Missing TON_MNEMONIC in environment variables");
}

export interface WithdrawToTonParams {
    amount: string;
    toAddress: string;
}

async function getTonEndpoint(retries = 3): Promise<string> {
    const endpoints = [
        () => getHttpEndpoint({ network: 'testnet' }),
        () => Promise.resolve('https://testnet.toncenter.com/api/v2/jsonRPC'),
        () => Promise.resolve('https://testnet.toncenter.com/api/v2/')
    ];

    for (let i = 0; i < retries; i++) {
        for (const getEndpoint of endpoints) {
            try {
                const endpoint = await getEndpoint();
                // Test the endpoint with a simple query
                const client = new TonClient({ endpoint });
                const bridgeAddress = "EQAqO-g7-NpA76JakmlnZnNOafdDdrKy_LMtPpIkWnlkg032";
                await client.isContractDeployed(Address.parse(bridgeAddress));
                console.log('Using TON endpoint:', endpoint);
                return endpoint;
            } catch (error: any) {
                console.log(`Endpoint attempt failed: ${error?.message || 'Unknown error'}`);
                continue;
            }
        }
        if (i < retries - 1) {
            console.log(`Retry attempt ${i + 1}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
    throw new Error('All TON endpoints failed after retries');
}

export async function withdrawToTon({ amount, toAddress }: WithdrawToTonParams) {
    try {
        const owner_address = Address.parse(toAddress);
        const bridgeAddress = "EQAqO-g7-NpA76JakmlnZnNOafdDdrKy_LMtPpIkWnlkg032";
        
        console.log('Using bridge address:', bridgeAddress);

        // Initialize TON client with retry logic
        const endpoint = await getTonEndpoint();
        const client = new TonClient({ endpoint });

        console.log('Initializing wallet...');
        
        // Get wallet key from mnemonic
        const key = await mnemonicToWalletKey(MNEMONIC.split(' '));
        
        // Initialize wallet contract
        const wallet = WalletContractV1R3.create({ 
            publicKey: key.publicKey, 
            workchain: 0
        });

        // Get wallet address
        const walletAddress = wallet.address;
        console.log('Wallet address:', walletAddress.toString());

        // Verify wallet deployment
        const isWalletDeployed = await client.isContractDeployed(walletAddress);
        if (!isWalletDeployed) {
            throw new Error('Wallet contract is not deployed! Please make sure to deploy and fund your wallet first.');
        } 

        // Get wallet balance
        const balance = await client.getBalance(walletAddress);
        console.log('Wallet balance:', balance.toString(), 'nanoTON');

        // Open wallet contract
        const openedWallet = client.open(wallet);

        // Verify bridge contract deployment
        console.log('Verifying bridge contract...');
        const bridgeContractAddress = Address.parse(bridgeAddress);
        const isBridgeDeployed = await client.isContractDeployed(bridgeContractAddress);
        
        if (!isBridgeDeployed) {
            throw new Error(`Bridge contract at address ${bridgeAddress} is not deployed!`);
        }

        // Create withdraw message
        const withdrawAmount = toNano(Number(amount).toFixed(9));
        console.log('Withdraw amount:', withdrawAmount.toString(), 'nanoTON');
        
        const withdrawMsg: Withdraw = {
            $$type: 'Withdraw',
            queryId: 1n,
            toAddress: owner_address,
            amount: withdrawAmount
        };

        console.log('Withdrawing', amount, 'TON to', toAddress);

        // Create the message body
        const messageBody = beginCell()
            .storeUint(0x7362d09c, 32) // op code for withdraw
            .storeUint(withdrawMsg.queryId, 64)
            .storeAddress(withdrawMsg.toAddress)
            .storeCoins(withdrawMsg.amount)
            .endCell();

        // Get current seqno
        const walletContract = client.open(wallet);
        const seqno = await walletContract.getSeqno();

        // Send the transaction using the wallet
        console.log('Sending withdrawal transaction...');
        
        // Create the transfer
        const transfer = await openedWallet.sendTransfer({
            seqno,
            secretKey: key.secretKey,
            message: internal({
                to: bridgeContractAddress,
                value: toNano('0.05'), // Include some gas
                body: messageBody
            })
        });

        // Send the transfer
      //  const result = await client.sendExternalMessage(wallet, transfer);
        
        console.log('Withdrawal transaction sent successfully');
        console.log('Transaction ID:', seqno);

        return { hash: seqno };
    } catch (error: any) {
        console.error("Error in withdrawToTon:", error);
        throw error;
    }
}

// Example usage
async function main() {
    try {
        const result = await withdrawToTon({
            amount: '0.02',
            toAddress: "0QAXPxxHYsTmCWowXn66wPQpO_jqyiZ7ckumefvQ2YF4spca"
        });
        console.log("Withdrawal initiated! Hash:", result.hash);
    } catch (error: any) {
        console.error("Error in main:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

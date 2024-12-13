import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { BridgeTact } from '../wrappers/BridgeTact';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // Bridge contract address
    const bridgeAddress = "EQDTHfFwAyr9Rkprt65KIxz1G24c-P_m2PRRtBY7J9UN182h";
    
    console.log('Using bridge address:', bridgeAddress);

    // Verify contract deployment
    const address = Address.parse(bridgeAddress);
    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Bridge contract at address ${bridgeAddress} is not deployed!`);
        return;
    }

    const bridgeTact = provider.open(BridgeTact.fromAddress(address));

    // Get bridge's USDT wallet address and USDT master
    const bridgeUsdtWallet = await bridgeTact.getGetBridgeUsdtWallet();
    const usdtMaster = await bridgeTact.getGetUsdtMaster();
    console.log('Bridge USDT wallet:', bridgeUsdtWallet.toString());
    console.log('USDT Master:', usdtMaster.toString());

    // Send deposit transaction with more TON for gas
    console.log('Sending deposit transaction...');
    await bridgeTact.send(
        provider.sender(),
        {
            value: toNano('0.15'), // Increased gas amount
        },
        {
            $$type: 'Deposit',
            queryId: 0n,
            evmAddress: 0x1234567890123456789012345678901234567890n,
            jettonAmount: toNano('1'), // 1 USDT
        }
    );

    console.log('Deposit transaction sent successfully');
    console.log('Waiting for confirmation...');
    
    // Wait a bit and check the total locked amount
    await new Promise(resolve => setTimeout(resolve, 5000));
    const totalLocked = await bridgeTact.getGetTotalLocked();
    console.log('Total locked USDT:', totalLocked.toString());
}

import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Bridge } from '../wrappers/bridge2';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // Bridge contract address
    const bridgeAddress = "EQBrT2-9PpAjFqy_JDNLgF0MgZw3Vt2k74bvmQ7sXoipUzPD";
    
    console.log('Using bridge address:', bridgeAddress);

    // Verify contract deployment
    const address = Address.parse(bridgeAddress);
    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Bridge contract at address ${bridgeAddress} is not deployed!`);
        return;
    }

    const bridgeTact = provider.open(Bridge.fromAddress(address));

    // Get bridge's USDT wallet address and USDT master
  //  const bridgeUsdtWallet = await bridgeTact.getGetBridgeUsdtWallet();
   // const usdtMaster = await bridgeTact.getGetUsdtMaster();
    //console.log('Bridge USDT wallet:', bridgeUsdtWallet.toString());
    //console.log('USDT Master:', usdtMaster.toString());

    // Send deposit transaction with more TON for gas
    console.log('Sending deposit transaction...');
    await bridgeTact.send(
        provider.sender(),
        {
            value: toNano('0.13'), // Increased gas amount
        },
        {
            $$type: 'Deposit',
            queryId: 1n,
            evmAddress: 0x1234567890123456789012345678901234567890n,
          //  amount: toNano('1'), // 1 USDT
        }
    );

    console.log('Deposit transaction sent successfully');
    console.log('Waiting for confirmation...');
    
    // Wait a bit and check the total locked amount

 //   const bridgeUsdtWallet = await bridgeTact.getGetJettonMaster();
  //  console.log('Bridge USDT wallet:', bridgeUsdtWallet.toString());

 //   await new Promise(resolve => setTimeout(resolve, 5000));
  //  const totalLocked = await bridgeTact.getGetTotalLocked();
   // console.log('Total locked USDT:', totalLocked.toString());
}

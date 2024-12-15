import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Bridge } from '../wrappers/bridge2';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
const owner = "0QAXPxxHYsTmCWowXn66wPQpO_jqyiZ7ckumefvQ2YF4spca"
const owner_address = Address.parse(owner);
    // Bridge contract address
    const bridgeAddress = "EQCFX97P86v7GNUVgwlrf-G6qNBiQo68GpeK05E-i3zeZcni";
    
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
            value: toNano('0.01'), // Increased gas amount
        },
        {
            $$type: 'Withdraw',
            queryId: 1n,
            toAddress: owner_address,
           amount: toNano('0.02'), // 1 USDT
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

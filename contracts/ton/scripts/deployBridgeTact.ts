import { Address, toNano } from '@ton/core';
import { BridgeTact } from '../wrappers/BridgeTact';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Owner address - replace with actual owner address
    const owner = Address.parse('0QAXPxxHYsTmCWowXn66wPQpO_jqyiZ7ckumefvQ2YF4spca');
    
    // USDT master contract address - replace with actual USDT master address
    const usdtMaster = Address.parse('kQD7ZnSh9s8FJhlqWfeHOg6Y8UJPoGn3knrxp7SVEkjvXX5u');

    // Initialize contract with owner and USDT master
    const bridgeTact = provider.open(await BridgeTact.fromInit(owner, usdtMaster));

    console.log('Bridge contract address:', bridgeTact.address.toString());

    // Check if contract is already deployed
    if (await provider.isContractDeployed(bridgeTact.address)) {
        console.log('Contract already deployed');
    } else {
        console.log('Deploying contract...');
        
        // Deploy with more TON for initial setup
        await bridgeTact.send(
            provider.sender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        await provider.waitForDeploy(bridgeTact.address);
        console.log('Bridge contract deployed successfully');
    }

    // Initialize the bridge's USDT wallet
    console.log('Initializing bridge USDT wallet...');
    await bridgeTact.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        "init_bridge_wallet"
    );
    
    // Wait a bit for the transaction to process
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Now let's check the bridge's USDT wallet
    console.log('Getting bridge USDT wallet address...');
    const bridgeUsdtWallet = await bridgeTact.getGetBridgeUsdtWallet();
    console.log('Bridge USDT wallet:', bridgeUsdtWallet.toString());

    // Also verify USDT master
    const storedUsdtMaster = await bridgeTact.getGetUsdtMaster();
    console.log('USDT Master:', storedUsdtMaster.toString());
}

//EQDXKTA14xyde2ZqkPCfNOSnGMiAGGBJDsijHHh2trBxyMdi - bridge
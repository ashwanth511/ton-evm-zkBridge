import { toNano, Address } from '@ton/core';
import { Bridge2 } from '../../wrappers/func/Bridge2';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const sender = provider.sender();
    
    if (!sender.address) {
        throw new Error('Sender address required');
    }

    const bridge2 = provider.open(
        Bridge2.createFromConfig(
            {
                owner_address: sender.address,  // Use deployer as owner
                usdt_jetton_wallet: Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), // Replace with actual USDT jetton wallet address
                total_locked: toNano('0')  // Initial total locked amount
            },
            await compile('Bridge2'),
            0  // workchain ID (0 for basic workchain)
        )
    );

    // Get the contract provider from the network provider
    const contractProvider = provider.api().provider(bridge2.address);

    await bridge2.deploy(
        contractProvider,
        sender,
        toNano('0.05')
    );

    const address = bridge2.address;
    console.log('Bridge2 deployed at:', address);
}

import { Address, toNano, SendMode, beginCell, Sender } from '@ton/core';
import { Bridge2 } from '../../wrappers/func/Bridge2';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Bridge2 address')); //EQCo3RGUsAnHZi_ZwAjJ3AkV8o5lMJ2VOScjf_yc2x0xrEec
    
    const sender = provider.sender();
    if (!sender.address) {
        throw new Error('Sender address not available');
    }

    const bridge2 = provider.open(Bridge2.createFromAddress(address));
    const contractProvider = provider.api().provider(address);

    const amount = toNano('1'); // Example amount, adjust as needed
    const evmAddress = '0x1234567890123456789012345678901234567890'; // Example EVM address, replace with actual address

    await bridge2.receiveTokens(
        contractProvider,
        {
            address: sender.address,
            send: async (args: { to: Address; value: bigint; body: any }) => {
                await contractProvider.internal(sender, {
                    value: args.value,
                    sendMode: SendMode.PAY_GAS_SEPARATELY,
                    body: args.body
                });
            }
        },
        {
            amount: amount,
            fromAddress: sender.address,
            evmAddress: evmAddress,
        }
    );

    ui.write('Waiting for deposit confirmation...');
    await sleep(5000); // Wait 5 seconds
}

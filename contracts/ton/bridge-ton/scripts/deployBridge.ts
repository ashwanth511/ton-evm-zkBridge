import { toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const bridge = provider.open(
        Bridge.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('Bridge')
        )
    );

    await bridge.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bridge.address);

    console.log('ID', await bridge.getID());
}

import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/bridge_tact.tact',
    options: {
        debug: true,
    },
};

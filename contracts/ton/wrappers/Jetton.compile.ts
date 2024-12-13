import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/Jetton/Jetton.tact',
    options: {
        debug: true,
    },
};

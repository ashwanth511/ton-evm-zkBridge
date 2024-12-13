import { groth16, zKey } from 'snarkjs';
import { SnarkjsProof, BridgeDirection } from './types';
import { config } from './config';

export async function generateZKProof(
    input: any,
    direction: BridgeDirection
): Promise<SnarkjsProof> {
    try {
        // Add direction-specific input preprocessing
        const processedInput = {
            ...input,
            sourceChainId: direction === BridgeDirection.EVM_TO_TON 
                ? config.evmNetwork.chainId 
                : config.tonNetwork.chainId,
            destChainId: direction === BridgeDirection.EVM_TO_TON 
                ? config.tonNetwork.chainId 
                : config.evmNetwork.chainId
        };

        // Generate the proof
        const { proof, publicSignals } = await groth16.fullProve(
            processedInput,
            config.wasmFile,
            config.zkeyFile
        );

        // Verify the proof
        const vKey = await zKey.exportVerificationKey(config.zkeyFile);
        const isValid = await groth16.verify(vKey, publicSignals, proof);

        if (!isValid) {
            throw new Error('Invalid proof generated');
        }

        return { proof, publicSignals };
    } catch (error) {
        console.error('Error generating ZK proof:', error);
        throw error;
    }
}

// Helper function to convert proof to solidity format
export function formatProofForSolidity(proof: any): any {
    return [
        proof.pi_a[0], proof.pi_a[1],
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
        proof.pi_c[0], proof.pi_c[1]
    ];
}

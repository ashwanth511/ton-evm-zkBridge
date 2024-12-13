pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template TransferVerifier() {
    // Public inputs
    signal input sourceChainId;
    signal input destinationChainId;
    signal input amount;
    signal input sourceAddress;
    signal input destinationAddress;
    signal input nonce;
    
    // Private inputs
    signal input signature;
    signal input privateKey;
    
    // Intermediate signals
    signal transferHash;
    signal validSignature;
    
    // Compute transfer hash using Poseidon
    component hasher = Poseidon(6);
    hasher.inputs[0] <== sourceChainId;
    hasher.inputs[1] <== destinationChainId;
    hasher.inputs[2] <== amount;
    hasher.inputs[3] <== sourceAddress;
    hasher.inputs[4] <== destinationAddress;
    hasher.inputs[5] <== nonce;
    
    transferHash <== hasher.out;
    
    // Verify signature
    component signatureVerifier = Poseidon(2);
    signatureVerifier.inputs[0] <== transferHash;
    signatureVerifier.inputs[1] <== privateKey;
    
    // Check if signature is valid
    component isEqual = IsEqual();
    isEqual.in[0] <== signatureVerifier.out;
    isEqual.in[1] <== signature;
    
    validSignature <== isEqual.out;
    
    // Constraints
    signal amountPositive;
    component greaterThanZero = GreaterThan(64);
    greaterThanZero.in[0] <== amount;
    greaterThanZero.in[1] <== 0;
    amountPositive <== greaterThanZero.out;
    
    // Final constraints
    1 === validSignature;
    1 === amountPositive;
}

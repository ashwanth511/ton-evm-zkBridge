pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template Bridge() {
    // Public inputs
    signal input sourceChainId;
    signal input destChainId;
    signal input amount;
    signal input nonce;
    signal input sender;
    signal input recipient;

    // Private inputs
    signal input privateKey;

    // Intermediate signals
    signal messageHash;
    signal signature;

    // Compute message hash using Poseidon
    component hasher = Poseidon(6);
    hasher.inputs[0] <== sourceChainId;
    hasher.inputs[1] <== destChainId;
    hasher.inputs[2] <== amount;
    hasher.inputs[3] <== nonce;
    hasher.inputs[4] <== sender;
    hasher.inputs[5] <== recipient;
    messageHash <== hasher.out;

    // Verify signature
    component signatureVerifier = Poseidon(2);
    signatureVerifier.inputs[0] <== messageHash;
    signatureVerifier.inputs[1] <== privateKey;
    signature <== signatureVerifier.out;

    // Verify amount is positive
    component greaterThanZero = GreaterThan(252);
    greaterThanZero.in[0] <== amount;
    greaterThanZero.in[1] <== 0;
    greaterThanZero.out === 1;

    // Public outputs
    signal output verified;
    verified <== signature;
}

component main = Bridge();

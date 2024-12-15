import { mnemonicToPrivateKey } from "ton-crypto";

// Your 24-word seed phrase (mnemonics)
const mnemonics = [
    "wedding", "shove", "high", "project", "snap", "potato", "swallow", "okay", "tip", "inner", "used", "worth", "human", "found", "afraid", "wild", "inquiry", "manual", "decline", "popular", "steel", "nurse", "learn"
];

async function main() {
    // Derive the private key
    const keyPair = await mnemonicToPrivateKey(mnemonics);
   const ownerPrivateKey = keyPair.secretKey.toString('hex');
    console.log("Public Key:", keyPair.publicKey.toString('hex'));
    console.log("Owner Private Key:", ownerPrivateKey);
}

main().catch(console.error);

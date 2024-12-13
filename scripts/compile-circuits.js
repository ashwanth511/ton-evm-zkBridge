const snarkjs = require("snarkjs");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const execAsync = promisify(exec);

async function compileCircuit() {
    // Input paths
    const circuitPath = path.join(__dirname, "../circuits/bridge.circom");
    const ptauPath = path.join(__dirname, "../circuits/pot12_final.ptau");
    
    // Output paths in build directory
    const buildDir = path.join(__dirname, "../build/circuits");
    const r1csPath = path.join(buildDir, "bridge.r1cs");
    const wasmPath = path.join(buildDir, "bridge_js/bridge.wasm");
    const zkeyPath = path.join(buildDir, "bridge.zkey");
    const vkeyPath = path.join(buildDir, "verification_key.json");
    const verifierPath = path.join(__dirname, "../contracts/evm/ZKBridgeVerifier.sol");

    try {
        // Create build directory if it doesn't exist
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }

        // Step 1: Compile circuit to r1cs and wasm
        console.log("Compiling circuit to r1cs and wasm...");
        await execAsync(`circom ${circuitPath} --r1cs --wasm --output ${buildDir}`);

        // Step 2: Download Powers of Tau file if not exists
        if (!fs.existsSync(ptauPath)) {
            console.log("Downloading Powers of Tau file...");
            const response = await fetch("https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau");
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(ptauPath, Buffer.from(buffer));
        }

        // Step 3: Generate zkey
        console.log("Generating zkey...");
        await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkeyPath);

        // Step 4: Export verification key
        console.log("Exporting verification key...");
        const vKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
        fs.writeFileSync(vkeyPath, JSON.stringify(vKey, null, 2));

        // Step 5: Generate Solidity verifier
        console.log("Generating Solidity verifier...");
        const templates = {
            groth16: fs.readFileSync(
                path.join(__dirname, "../node_modules/snarkjs/templates/verifier_groth16.sol.ejs"),
                "utf8"
            ),
        };
        const verifierCode = await snarkjs.zKey.exportSolidityVerifier(zkeyPath, templates);
        fs.writeFileSync(verifierPath, verifierCode);

        console.log("Circuit setup completed successfully!");
        console.log("Artifacts generated in:", buildDir);
        console.log("Solidity verifier generated in:", verifierPath);
    } catch (error) {
        console.error("Error during circuit setup:", error);
        process.exit(1);
    }
}

compileCircuit().then(() => {
    console.log("Done!");
    process.exit(0);
});

const { compileFunc } = require("@ton-community/func-js");
const fs = require("fs");
const path = require("path");

async function compileFuncContract() {
    const contractsDir = path.join(__dirname, "../contracts");
    const outputDir = path.join(__dirname, "../build/ton");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        console.log("Compiling FunC contracts...");
        const result = await compileFunc({
            sources: {
                "stdlib.fc": fs.readFileSync(path.join(contractsDir, "stdlib/stdlib.fc"), "utf8"),
                "constants.fc": fs.readFileSync(path.join(contractsDir, "stdlib/constants.fc"), "utf8"),
                "message_utils.fc": fs.readFileSync(path.join(contractsDir, "stdlib/message_utils.fc"), "utf8"),
                "bridge.fc": fs.readFileSync(path.join(contractsDir, "bridge.fc"), "utf8")
            },
            entryPoints: ["bridge.fc"]
        });

        if (result.status === "error") {
            console.error("Compilation failed:", result.message);
            process.exit(1);
        }

        // Write the compiled code to file
        fs.writeFileSync(
            path.join(outputDir, "bridge.cell"),
            Buffer.from(result.codeBoc, "base64")
        );

        console.log("FunC compilation completed successfully!");
    } catch (error) {
        console.error("Error compiling FunC contracts:", error);
        process.exit(1);
    }
}

compileFuncContract().then(() => {
    process.exit(0);
});

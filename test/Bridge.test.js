const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bridge", function () {
    let bridge;
    let token;
    let owner;
    let addr1;

    beforeEach(async function () {
        // Deploy mock token
        const Token = await ethers.getContractFactory("MockERC20");
        token = await Token.deploy("Mock Token", "MTK");
        await token.deployed();

        // Deploy bridge
        const Bridge = await ethers.getContractFactory("Bridge");
        [owner, addr1] = await ethers.getSigners();
        bridge = await Bridge.deploy(token.address, owner.address); // Using owner as mock verifier for now
        await bridge.deployed();
    });

    it("Should lock tokens", async function () {
        const amount = ethers.utils.parseEther("1");
        const tonAddress = "EQByzb3BxY2PQKpzGGsLNXql096n_wTHbXd9uZE-AhYHhzxw";

        // Approve tokens
        await token.approve(bridge.address, amount);

        // Lock tokens
        await expect(bridge.lockTokens(amount, tonAddress))
            .to.emit(bridge, "TokensLocked")
            .withArgs(owner.address, amount, tonAddress, 0);
    });
});

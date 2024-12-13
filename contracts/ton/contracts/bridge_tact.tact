import "@stdlib/deploy";
import "@stdlib/ownable";

struct JettonWalletData {
    balance: Int as coins;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
}

fun calculateJettonWalletAddress(
    ownerAddress: Address,
    jettonMasterAddress: Address,
    jettonWalletCode: Cell
): Address {

    let initData = JettonWalletData{
        balance: 0,
        ownerAddress,
        jettonMasterAddress,
        jettonWalletCode,
    };

    return contractAddress(StateInit{
        code: jettonWalletCode,
        data: initData.toCell(),
    });
}

message(0x7362d09c) JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

// Message for deposit operation
message Deposit {
    queryId: Int as uint64;
    evmAddress: Int as uint160; // Changed to uint160 for 20-byte Ethereum address
    jettonAmount: Int as coins;
}

// Message for withdraw operation
message Withdraw {
    queryId: Int as uint64;
    tonAddress: Address;
    jettonAmount: Int as coins;
}

/* // Jetton transfer notification
message JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
} */

// Event message for deposit input
message DepositNotification {
    queryId: Int as uint64;
    sender: Address;
    evmAddress: Int as uint160; 
    jettonAmount: Int as coins;
}

// Event message for withdraw input
message WithdrawNotification {
    queryId: Int as uint64;
    sender: Address;
    tonAddress: Address;
    jettonAmount: Int as coins;
}



contract BridgeTact with Deployable, OwnableTransferable {
    owner: Address;                    // Contract owner address
    usdtMaster: Address;              // USDT Jetton master contract
    bridgeUsdtWallet: Address;        // Bridge's USDT wallet address
    totalLocked: Int as coins;        // Total USDT locked in bridge

    init(owner: Address, usdtMaster: Address) {
        self.owner = owner;
        self.usdtMaster = usdtMaster;
        self.bridgeUsdtWallet = newAddress(0, 0); // Will be set after deployment
        self.totalLocked = 0;
    }

    // Anyone can call this function to deposit USDT
    receive(msg: Deposit) {
        // Verify the message has enough value attached
        require(context().value >= ton("0.05"), "Insufficient fees attached");

        // Request USDT transfer from sender to bridge
        send(SendParameters{
            to: self.usdtMaster,
            value: 0,
            mode: SendRemainingValue,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)     // transfer operation
                .storeUint(msg.queryId, 64)    // query id
                .storeCoins(msg.jettonAmount)  // amount
                .storeAddress(myAddress())     // to address (bridge)
                .storeAddress(sender())        // response destination
                .storeBool(true)              // custom payload
                .storeRef(                    // storing evmAddress in payload
                    beginCell()
                        .storeUint(msg.evmAddress, 160)
                        .endCell()
                )
                .endCell()
        });

                
        // Emit deposit notification first
        emit(DepositNotification{
            queryId: msg.queryId,
            sender: sender(),
            evmAddress: msg.evmAddress,
            jettonAmount: msg.jettonAmount
        }.toCell());
    }

    // Handle jetton transfer notification
    receive(msg: JettonTransferNotification) {
        // Verify this is from our USDT wallet
        require(sender() == self.bridgeUsdtWallet, "Invalid jetton sender");
        
        // Parse the evmAddress from forward payload
        let evmAddress: Int = msg.forwardPayload.loadUint(160);
        
        // Update total locked amount
        self.totalLocked = self.totalLocked + msg.amount;

        // Emit deposit notification
        emit(DepositNotification{
            queryId: msg.queryId,
            sender: msg.sender,
            evmAddress: evmAddress,
            jettonAmount: msg.amount
        }.toCell());
    }

    // Only owner can withdraw USDT
    receive(msg: Withdraw) {
        // Check that only owner can call this
        self.requireOwner();
        
        // Verify we have enough locked tokens
        require(self.totalLocked >= msg.jettonAmount, "Insufficient locked balance");
        
        // Update total locked amount
        self.totalLocked = self.totalLocked - msg.jettonAmount;

        // Request USDT transfer from bridge to user
        send(SendParameters{
            to: self.usdtMaster,  // Send to USDT master contract
            value: 0,
            mode: SendRemainingValue,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)     // transfer operation
                .storeUint(msg.queryId, 64)    // query id
                .storeCoins(msg.jettonAmount)  // amount
                .storeAddress(msg.tonAddress)  // to address (user)
                .storeAddress(myAddress())     // response destination
                .storeBool(false)             // no custom payload
                .storeCoins(0)                // no forward amount
                .storeBool(false)             // no forward payload
                .endCell()
        });

        // Emit withdraw notification
        emit(WithdrawNotification{
            queryId: msg.queryId,
            sender: sender(),
            tonAddress: msg.tonAddress,
            jettonAmount: msg.jettonAmount
        }.toCell());
    }

    // Set the bridge's USDT wallet address
    receive("set_bridge_wallet") {
        require(sender() == self.owner, "Only owner can set wallet");
        self.bridgeUsdtWallet = sender();
    }

    // Getter to check total locked amount
    get fun getTotalLocked(): Int {
        return self.totalLocked;
    }

    // Getter to check USDT master contract
    get fun getUsdtMaster(): Address {
        return self.usdtMaster;
    }

    // Getter to check bridge's USDT wallet
    get fun getBridgeUsdtWallet(): Address {
        return self.bridgeUsdtWallet;
    }
}

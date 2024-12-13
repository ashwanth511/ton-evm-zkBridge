import "@stdlib/deploy";
import "@stdlib/ownable";
import "@stdlib/stoppable";

// Jetton wallet discovery message
message GetWalletAddress {
    owner_address: Address;
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

// Jetton transfer notification
message JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

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

    // Initialize the bridge's USDT wallet
    receive("init_bridge_wallet") {
        // Only owner can initialize
        require(sender() == self.owner, "Only owner can initialize wallet");
        
        // Request wallet address from master contract
        send(SendParameters{
            to: self.usdtMaster,
            value: 0,
            mode: SendRemainingValue,
            body: GetWalletAddress{
                owner_address: myAddress()
            }.toCell()
        });
    }

    // Receive wallet address from master contract
    receive(msg: GetWalletAddress) {
        // Only accept from USDT master
        require(sender() == self.usdtMaster, "Only USDT master can set wallet");
        self.bridgeUsdtWallet = msg.owner_address;
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
                
        // Emit deposit notification
        emit(DepositNotification{
            queryId: msg.queryId,
            sender: sender(),
            evmAddress: msg.evmAddress,
            jettonAmount: msg.jettonAmount
        }.toCell());
    }

    // Process USDT transfer notification
    receive(msg: JettonTransferNotification) {
        // Update total locked amount
        self.totalLocked = self.totalLocked + msg.amount;
    }

    // Process withdraw request
    receive(msg: Withdraw) {
        // Only owner can process withdrawals
        require(sender() == self.owner, "Only owner can withdraw");
        
        // Verify we have enough balance
        require(self.totalLocked >= msg.jettonAmount, "Insufficient bridge balance");

        // Update total locked amount
        self.totalLocked = self.totalLocked - msg.jettonAmount;

        // Transfer USDT to recipient
        send(SendParameters{
            to: self.bridgeUsdtWallet,
            value: 0,
            mode: SendRemainingValue,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)     // transfer operation
                .storeUint(msg.queryId, 64)    // query id
                .storeCoins(msg.jettonAmount)  // amount
                .storeAddress(msg.tonAddress)  // recipient address
                .storeAddress(myAddress())     // response destination
                .storeBool(false)             // no custom payload
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

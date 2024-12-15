import "@stdlib/deploy";
import "@stdlib/ownable";

message Deposit {
    queryId: Int as uint64;
    evmAddress: Int as uint160;
  //  amount: Int as coins;
}

message Withdraw {
    queryId: Int as uint64;
    toAddress: Address;
    amount: Int as coins;
}

message DepositEvent {
    queryId: Int as uint64;
    sender: Address;
    evmAddress: Int as uint160;
    tonAmount: Int as coins;
}

message WithdrawEvent {
    queryId: Int as uint64;
    sender: Address;
    toAddress: Address;
    amount: Int as coins;
}

contract Bridge with Deployable {
    owner: Address;
   nonce: Int;
    
    init(owner: Address) {
        self.owner = owner;
        self.nonce = 0;
    }

    // Handle deposit requests 
    receive(msg: Deposit) {
        let gas: Int = gasConsumed();
        // Require minimum fees for processing
        require(context().value > gas, "Insufficient fee"); //  ton("0.1")
        let newNonce: Int = self.nonce + 1;
        self.nonce = newNonce;
        // Calculate actual deposit amount after gas fees
        let depositAmount: Int = context().value -  gas; //  ton("0.1")
        
        // Emit deposit event with EVM address and TON value after gas
        emit(DepositEvent{
            queryId: newNonce,// msg.queryId,
            sender: sender(),
            evmAddress: msg.evmAddress,
            tonAmount: depositAmount
        }.toCell());
    }
    
    // Only owner can withdraw
    receive(msg: Withdraw) {
        // Verify sender is owner
         let gas: Int = gasConsumed();
        require(sender() == self.owner, "Only owner can withdraw");
        
        // Verify contract has enough balance
        require(myBalance() >= msg.amount + gas , "Insufficient contract balance"); //  ton("0.1")
        
        // Emit withdraw event
        emit(WithdrawEvent{
            queryId: msg.queryId,
            sender: sender(),
            toAddress: msg.toAddress,
            amount: msg.amount
        }.toCell());
        
        // Send TON to recipient
        send(SendParameters{
            to: msg.toAddress,
            value: msg.amount,
            mode: SendIgnoreErrors,
            body: "Withdrawal from bridge".asComment()
        });
    }
    
    // Getter for owner address
    get fun owner(): Address {
        return self.owner;
    }
}
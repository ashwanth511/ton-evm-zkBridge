-include .env

.PHONY: all test clean deploy  format anvil 

format :; forge fmt

snapshot :; forge snapshot 

anvil :; anvil -m 'test test test test test test test test test test test junk' --steps-tracing --block-time 1

deployAnvil :; forge script script/deploy.sol:DeployBridge --rpc-url ${ANVIL_URL} --private-key ${ANVIL_PRIVATE_KEY} --broadcast  

deploySepolia :; forge script script/deploy.sol:DeployBridge --rpc-url ${SEPOLIA_RPC_URL} --account myaccount --broadcast  

depositAnvil :; forge script script/Deposit.sol:DepositScript --rpc-url ${ANVIL_URL} --private-key ${ANVIL_PRIVATE_KEY} --broadcast 

depositSepolia :; forge script script/Deposit.sol:DepositScript --rpc-url ${SEPOLIA_RPC_URL} --account myaccount --broadcast
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Bridge2} from "../src/Bridge2.sol";
import {DevOpsTools} from "lib/foundry-devops/src/DevOpsTools.sol";

contract DepositScript is Script {
    
  
    string constant TON_ADDRESS = "EQCFX97P86v7GNUVgwlrf-G6qNBiQo68GpeK05E-i3zeZcni";
    address USER_ADDRESS = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    uint256 AMOUNT = 0.001 ether;

    function run() external {
         address contractAddress = DevOpsTools.get_most_recent_deployment("Bridge2", block.chainid);
       
        bytes memory tonAddressBytes = bytes(TON_ADDRESS);
        
        vm.startBroadcast();
      
      
           Bridge2 bridge =   Bridge2(contractAddress);
        
       
        bridge.Withdraw(USER_ADDRESS,AMOUNT);
        
        vm.stopBroadcast();
    }
}
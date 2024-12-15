// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Bridge2} from "../src/Bridge2.sol";
import {DevOpsTools} from "lib/foundry-devops/src/DevOpsTools.sol";

contract DepositScript is Script {
    
  
    string constant TON_ADDRESS = "EQAXPxxHYsTmCWowXn66wPQpO_jqyiZ7ckumefvQ2YF4snFV";

    function run() external {
         address contractAddress = DevOpsTools.get_most_recent_deployment("Bridge2", block.chainid);
       
        bytes memory tonAddressBytes = bytes(TON_ADDRESS);
        
        vm.startBroadcast();
      
      
           Bridge2 bridge =   Bridge2(contractAddress);
        
       
        bridge.Deposit{value: 0.0002 ether}(tonAddressBytes);
        
        vm.stopBroadcast();
    }
}
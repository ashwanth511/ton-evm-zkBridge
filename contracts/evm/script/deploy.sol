// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Bridge2} from "../src/Bridge2.sol";

contract DeployBridge is Script {
    function run() external returns (Bridge2) {
        vm.startBroadcast();
        
        Bridge2 bridge = new Bridge2();
        
        vm.stopBroadcast();
        
        return bridge;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DepositEscrow} from "../src/DepositEscrow.sol";

/// Deploys DepositEscrow on Arc testnet. Deployer = landlord key (any funded key works).
/// Env: LANDLORD_PRIVATE_KEY, ARC_USDC_ADDRESS, optional APPEAL_WINDOW_SECONDS (default 7 days).
contract Deploy is Script {
    function run() external returns (DepositEscrow escrow) {
        require(block.chainid == 5042002, "Arc testnet only");
        uint256 pk = vm.envUint("LANDLORD_PRIVATE_KEY");
        address usdc = vm.envAddress("ARC_USDC_ADDRESS");
        uint64 window = uint64(vm.envOr("APPEAL_WINDOW_SECONDS", uint256(7 days)));

        vm.startBroadcast(pk);
        escrow = new DepositEscrow(IERC20(usdc), window);
        vm.stopBroadcast();

        console.log("DepositEscrow:", address(escrow));
        console.log("appealWindow (s):", window);
    }
}

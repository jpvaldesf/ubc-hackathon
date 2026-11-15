// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DepositEscrow} from "../src/DepositEscrow.sol";

/// Deploys DepositEscrow on Arc testnet. Deployer = landlord key (any funded key works).
/// Env: LANDLORD_PRIVATE_KEY, ARC_USDC_ADDRESS. Optional windows in seconds:
/// APPEAL_WINDOW_SECONDS (7 days), PROPOSE_WINDOW_SECONDS (21 days, CA return deadline),
/// RESOLVE_WINDOW_SECONDS (14 days).
contract Deploy is Script {
    function run() external returns (DepositEscrow escrow) {
        require(block.chainid == 5042002, "Arc testnet only");
        uint256 pk = vm.envUint("LANDLORD_PRIVATE_KEY");
        address usdc = vm.envAddress("ARC_USDC_ADDRESS");
        uint64 appealW = uint64(vm.envOr("APPEAL_WINDOW_SECONDS", uint256(7 days)));
        uint64 proposeW = uint64(vm.envOr("PROPOSE_WINDOW_SECONDS", uint256(21 days)));
        uint64 resolveW = uint64(vm.envOr("RESOLVE_WINDOW_SECONDS", uint256(14 days)));

        vm.startBroadcast(pk);
        escrow = new DepositEscrow(IERC20(usdc), appealW, proposeW, resolveW);
        vm.stopBroadcast();

        console.log("DepositEscrow:", address(escrow));
        console.log("windows (s) appeal/propose/resolve:", appealW, proposeW, resolveW);
    }
}

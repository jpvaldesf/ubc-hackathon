// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DepositEscrow} from "../src/DepositEscrow.sol";

/// Runs the demo path once against a deployed escrow, each step signed by the right party:
/// create lease (landlord) -> approve + deposit (tenant) -> commit move-in + move-out photos (tenant)
/// -> propose deduction, undisputed part to tenant (landlord) -> accept, deduction to landlord (tenant).
/// Env: ESCROW_ADDRESS, ARC_USDC_ADDRESS, LANDLORD_PRIVATE_KEY, TENANT_PRIVATE_KEY, ARBITER_ADDRESS,
///      optional DEMO_DEPOSIT (default 10e6 = $10) and DEMO_DEDUCTION (default 1.2e6 = $1.20).
/// Photo and report hashes here are placeholders until the server computes real ones.
contract DemoRun is Script {
    function run() external {
        require(block.chainid == 5042002, "Arc testnet only");
        DepositEscrow escrow = DepositEscrow(vm.envAddress("ESCROW_ADDRESS"));
        IERC20 usdc = IERC20(vm.envAddress("ARC_USDC_ADDRESS"));
        uint256 landlordPk = vm.envUint("LANDLORD_PRIVATE_KEY");
        uint256 tenantPk = vm.envUint("TENANT_PRIVATE_KEY");
        address tenant = vm.addr(tenantPk);
        address arbiter = vm.envAddress("ARBITER_ADDRESS");
        uint256 amount = vm.envOr("DEMO_DEPOSIT", uint256(10e6));
        uint256 deduction = vm.envOr("DEMO_DEDUCTION", uint256(1.2e6));

        require(usdc.balanceOf(tenant) >= amount, "tenant needs more testnet USDC");

        vm.startBroadcast(landlordPk);
        uint256 id = escrow.createLease(tenant, arbiter, amount);
        vm.stopBroadcast();

        vm.startBroadcast(tenantPk);
        usdc.approve(address(escrow), amount);
        escrow.deposit(id);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveIn, keccak256(abi.encode("demo move-in", id)));
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveOut, keccak256(abi.encode("demo move-out", id)));
        vm.stopBroadcast();

        vm.startBroadcast(landlordPk);
        escrow.proposeDeductions(id, deduction, keccak256(abi.encode("demo report", id)));
        vm.stopBroadcast();

        vm.startBroadcast(tenantPk);
        escrow.accept(id);
        vm.stopBroadcast();

        console.log("lease id:", id);
        console.log("deposit / deduction (USDC base units):", amount, deduction);
    }
}

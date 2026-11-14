// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DepositEscrow} from "../src/DepositEscrow.sol";

/// 6-decimal stand-in for Arc's USDC ERC-20 interface (unit tests only).
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

contract DepositEscrowTest is Test {
    // Demo amounts (scaled 1:100 for the 20-USDC faucet): $10 deposit, $1.20 deduction, $8.80 back.
    uint256 constant DEPOSIT = 10e6;
    uint256 constant DEDUCTION = 1.2e6;
    uint64 constant WINDOW = 7 days;

    MockUSDC usdc;
    DepositEscrow escrow;

    address landlord = makeAddr("landlord");
    address tenant = makeAddr("tenant");
    address arbiter = makeAddr("arbiter");
    address stranger = makeAddr("stranger");

    bytes32 constant IN_HASH = keccak256("move-in manifest");
    bytes32 constant OUT_HASH = keccak256("move-out manifest");
    bytes32 constant REPORT = keccak256("findings json");

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new DepositEscrow(IERC20(address(usdc)), WINDOW);
        usdc.mint(tenant, DEPOSIT);
        vm.prank(tenant);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ---------------------------------------------------------------- helpers

    function _create() internal returns (uint256 id) {
        vm.prank(landlord);
        id = escrow.createLease(tenant, arbiter, DEPOSIT);
    }

    function _funded() internal returns (uint256 id) {
        id = _create();
        vm.prank(tenant);
        escrow.deposit(id);
    }

    function _photosDone() internal returns (uint256 id) {
        id = _funded();
        vm.prank(tenant);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveIn, IN_HASH);
        vm.prank(tenant);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveOut, OUT_HASH);
    }

    function _proposed() internal returns (uint256 id) {
        id = _photosDone();
        vm.prank(landlord);
        escrow.proposeDeductions(id, DEDUCTION, REPORT);
    }

    function _status(uint256 id) internal view returns (DepositEscrow.Status) {
        return escrow.getLease(id).status;
    }

    // ---------------------------------------------------------------- happy path

    function test_HappyPath_ProposeThenAccept() public {
        uint256 id = _photosDone();
        assertEq(usdc.balanceOf(address(escrow)), DEPOSIT);

        vm.prank(landlord);
        escrow.proposeDeductions(id, DEDUCTION, REPORT);
        assertEq(usdc.balanceOf(tenant), DEPOSIT - DEDUCTION, "undisputed paid immediately");
        assertEq(usdc.balanceOf(address(escrow)), DEDUCTION);
        assertEq(uint8(_status(id)), uint8(DepositEscrow.Status.Proposed));

        vm.prank(tenant);
        escrow.accept(id);
        assertEq(usdc.balanceOf(landlord), DEDUCTION);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(_status(id)), uint8(DepositEscrow.Status.Closed));

        DepositEscrow.Lease memory l = escrow.getLease(id);
        assertEq(l.moveInHash, IN_HASH);
        assertEq(l.moveOutHash, OUT_HASH);
        assertEq(l.reportHash, REPORT);
    }

    function test_ZeroDeductionClosesAndRefundsAll() public {
        uint256 id = _photosDone();
        vm.prank(landlord);
        escrow.proposeDeductions(id, 0, REPORT);
        assertEq(usdc.balanceOf(tenant), DEPOSIT);
        assertEq(uint8(_status(id)), uint8(DepositEscrow.Status.Closed));
    }

    // ---------------------------------------------------------------- appeal path

    function test_AppealPath_ArbiterSplits() public {
        uint256 id = _proposed();
        vm.prank(tenant);
        escrow.appeal(id);
        assertEq(uint8(_status(id)), uint8(DepositEscrow.Status.Appealed));

        vm.prank(arbiter);
        escrow.resolve(id, 0.5e6);
        assertEq(usdc.balanceOf(landlord), 0.5e6);
        assertEq(usdc.balanceOf(tenant), DEPOSIT - 0.5e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(_status(id)), uint8(DepositEscrow.Status.Closed));
    }

    function test_ArbiterCannotAwardMoreThanDeduction() public {
        uint256 id = _proposed();
        vm.prank(tenant);
        escrow.appeal(id);
        vm.prank(arbiter);
        vm.expectRevert(DepositEscrow.DeductionTooHigh.selector);
        escrow.resolve(id, DEDUCTION + 1);
    }

    function test_CannotAppealAfterWindow() public {
        uint256 id = _proposed();
        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(tenant);
        vm.expectRevert(DepositEscrow.AppealWindowClosed.selector);
        escrow.appeal(id);
    }

    // ---------------------------------------------------------------- silent tenant

    function test_FinalizeAfterWindowPaysLandlord() public {
        uint256 id = _proposed();
        vm.expectRevert(DepositEscrow.AppealWindowOpen.selector);
        escrow.finalize(id);

        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(stranger); // anyone can trigger; funds still go only to the landlord
        escrow.finalize(id);
        assertEq(usdc.balanceOf(landlord), DEDUCTION);
        assertEq(usdc.balanceOf(stranger), 0);
    }

    // ---------------------------------------------------------------- access control

    function test_StrangerCannotMoveFunds() public {
        uint256 id = _create();
        vm.startPrank(stranger);
        vm.expectRevert(DepositEscrow.NotTenant.selector);
        escrow.deposit(id);
        vm.stopPrank();

        vm.prank(tenant);
        escrow.deposit(id);

        vm.startPrank(stranger);
        vm.expectRevert(DepositEscrow.NotParty.selector);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveIn, IN_HASH);
        vm.stopPrank();

        vm.prank(tenant);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveIn, IN_HASH);
        vm.prank(landlord);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveOut, OUT_HASH);

        vm.startPrank(stranger);
        vm.expectRevert(DepositEscrow.NotLandlord.selector);
        escrow.proposeDeductions(id, DEPOSIT, REPORT);
        vm.stopPrank();

        vm.prank(tenant); // the tenant can't propose either
        vm.expectRevert(DepositEscrow.NotLandlord.selector);
        escrow.proposeDeductions(id, 0, REPORT);

        vm.prank(landlord);
        escrow.proposeDeductions(id, DEDUCTION, REPORT);

        vm.startPrank(stranger);
        vm.expectRevert(DepositEscrow.NotTenant.selector);
        escrow.accept(id);
        vm.expectRevert(DepositEscrow.NotTenant.selector);
        escrow.appeal(id);
        vm.stopPrank();

        vm.prank(landlord); // the landlord can't accept on the tenant's behalf
        vm.expectRevert(DepositEscrow.NotTenant.selector);
        escrow.accept(id);

        vm.prank(tenant);
        escrow.appeal(id);

        vm.prank(stranger);
        vm.expectRevert(DepositEscrow.NotArbiter.selector);
        escrow.resolve(id, DEDUCTION);
        vm.prank(landlord);
        vm.expectRevert(DepositEscrow.NotArbiter.selector);
        escrow.resolve(id, DEDUCTION);

        assertEq(usdc.balanceOf(stranger), 0);
    }

    // ---------------------------------------------------------------- double release

    function test_CannotReleaseTwice() public {
        uint256 id = _proposed();
        vm.prank(tenant);
        escrow.accept(id);

        vm.startPrank(tenant);
        vm.expectRevert(
            abi.encodeWithSelector(
                DepositEscrow.WrongStatus.selector, DepositEscrow.Status.Proposed, DepositEscrow.Status.Closed
            )
        );
        escrow.accept(id);
        vm.expectRevert(
            abi.encodeWithSelector(
                DepositEscrow.WrongStatus.selector, DepositEscrow.Status.Proposed, DepositEscrow.Status.Closed
            )
        );
        escrow.appeal(id);
        vm.stopPrank();

        vm.warp(block.timestamp + WINDOW + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                DepositEscrow.WrongStatus.selector, DepositEscrow.Status.Proposed, DepositEscrow.Status.Closed
            )
        );
        escrow.finalize(id);

        vm.prank(landlord);
        vm.expectRevert(
            abi.encodeWithSelector(
                DepositEscrow.WrongStatus.selector, DepositEscrow.Status.Funded, DepositEscrow.Status.Closed
            )
        );
        escrow.proposeDeductions(id, 0, REPORT);

        assertEq(usdc.balanceOf(landlord), DEDUCTION);
        assertEq(usdc.balanceOf(tenant), DEPOSIT - DEDUCTION);
    }

    function test_CannotDepositTwice() public {
        uint256 id = _funded();
        usdc.mint(tenant, DEPOSIT);
        vm.prank(tenant);
        vm.expectRevert(
            abi.encodeWithSelector(
                DepositEscrow.WrongStatus.selector, DepositEscrow.Status.Created, DepositEscrow.Status.Funded
            )
        );
        escrow.deposit(id);
    }

    // ---------------------------------------------------------------- input checks

    function test_DeductionAboveDepositRejected() public {
        uint256 id = _photosDone();
        vm.prank(landlord);
        vm.expectRevert(DepositEscrow.DeductionTooHigh.selector);
        escrow.proposeDeductions(id, DEPOSIT + 1, REPORT);
    }

    function test_ProposeRequiresMoveOutPhotos() public {
        uint256 id = _funded();
        vm.prank(landlord);
        vm.expectRevert(DepositEscrow.MoveOutMissing.selector);
        escrow.proposeDeductions(id, DEDUCTION, REPORT);
    }

    function test_PhotosCommitOnceAndInOrder() public {
        uint256 id = _funded();
        vm.prank(tenant);
        vm.expectRevert(DepositEscrow.MoveInMissing.selector);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveOut, OUT_HASH);

        vm.prank(tenant);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveIn, IN_HASH);
        vm.prank(landlord);
        vm.expectRevert(DepositEscrow.AlreadyCommitted.selector);
        escrow.commitPhotos(id, DepositEscrow.Phase.MoveIn, bytes32(uint256(1)));
    }

    function test_CreateLeaseRejectsBadParties() public {
        vm.startPrank(landlord);
        vm.expectRevert(DepositEscrow.InvalidAddress.selector);
        escrow.createLease(landlord, arbiter, DEPOSIT); // landlord as tenant
        vm.expectRevert(DepositEscrow.InvalidAddress.selector);
        escrow.createLease(tenant, landlord, DEPOSIT); // landlord as own arbiter
        vm.expectRevert(DepositEscrow.InvalidAddress.selector);
        escrow.createLease(tenant, tenant, DEPOSIT); // tenant as arbiter
        vm.expectRevert(DepositEscrow.ZeroAmount.selector);
        escrow.createLease(tenant, arbiter, 0);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- fuzz: money is conserved

    function testFuzz_FundsConservedAndOnlyToParties(uint256 deduction, uint256 toLandlord, bool doAppeal) public {
        deduction = bound(deduction, 0, DEPOSIT);
        uint256 id = _photosDone();
        vm.prank(landlord);
        escrow.proposeDeductions(id, deduction, REPORT);

        if (deduction > 0) {
            if (doAppeal) {
                toLandlord = bound(toLandlord, 0, deduction);
                vm.prank(tenant);
                escrow.appeal(id);
                vm.prank(arbiter);
                escrow.resolve(id, toLandlord);
            } else {
                vm.prank(tenant);
                escrow.accept(id);
            }
        }
        assertEq(usdc.balanceOf(tenant) + usdc.balanceOf(landlord), DEPOSIT);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(usdc.balanceOf(arbiter), 0);
    }
}

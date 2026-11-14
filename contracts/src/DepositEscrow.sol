// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DepositEscrow
/// @notice Neutral escrow for rental deposits in USDC on Arc.
///
/// Safety properties (keep these true; the README and the pitch rely on them):
///  - Funds leave only to the lease's tenant or landlord. There is no owner and no admin withdrawal.
///  - USDC moves only through the ERC-20 interface (6 decimals). The contract has no payable or
///    receive function and never touches native value, so allowance-based accounting is complete.
///  - The undisputed part (deposit - deduction) goes to the tenant in the same tx as the proposal.
///  - The deduction goes to the landlord only if the tenant accepts, the appeal window passes
///    without an appeal, or the arbiter rules. The arbiter can award at most the disputed amount.
///  - Nothing stays locked: if the landlord never proposes within `proposeWindow` of the move-out
///    photos, the tenant can reclaim the full deposit; if the arbiter never rules within
///    `resolveWindow` of an appeal, the disputed amount returns to the tenant.
///  - Every state change emits an event. State is updated before any transfer (CEI) and every
///    fund-moving function is nonReentrant.
contract DepositEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None, // lease does not exist
        Created, // landlord created it; waiting for the tenant's deposit
        Funded, // deposit held; photos can be committed
        Proposed, // undisputed part paid to tenant; deduction held pending accept/appeal/window
        Appealed, // tenant disputed; waiting for the arbiter
        Closed // everything paid out
    }

    enum Phase {
        MoveIn,
        MoveOut
    }

    struct Lease {
        address landlord;
        address tenant;
        address arbiter;
        Status status;
        uint64 appealDeadline;
        uint64 moveOutAt; // when move-out photos were committed (starts the propose window)
        uint64 resolveDeadline; // arbiter must rule by this time after an appeal
        uint256 amount; // deposit, USDC base units (6 decimals)
        uint256 deduction; // proposed deduction, USDC base units
        bytes32 moveInHash; // hash of the move-in photo manifest
        bytes32 moveOutHash; // hash of the move-out photo manifest
        bytes32 reportHash; // hash of the AI findings JSON behind the deduction
    }

    IERC20 public immutable usdc;
    uint64 public immutable appealWindow;
    uint64 public immutable proposeWindow;
    uint64 public immutable resolveWindow;
    uint64 public constant MIN_WINDOW = 1 hours;

    uint256 public leaseCount;
    mapping(uint256 => Lease) private _leases;

    event LeaseCreated(
        uint256 indexed id, address indexed landlord, address indexed tenant, address arbiter, uint256 amount
    );
    event Deposited(uint256 indexed id, address indexed tenant, uint256 amount);
    event PhotosCommitted(uint256 indexed id, Phase phase, bytes32 manifestHash, address by);
    event DeductionsProposed(
        uint256 indexed id, uint256 deduction, uint256 paidToTenant, bytes32 reportHash, uint64 appealDeadline
    );
    event Accepted(uint256 indexed id, uint256 paidToLandlord);
    event Finalized(uint256 indexed id, uint256 paidToLandlord);
    event Appealed(uint256 indexed id);
    event Resolved(uint256 indexed id, uint256 paidToLandlord, uint256 paidToTenant);
    event Reclaimed(uint256 indexed id, uint256 paidToTenant);
    event AppealExpired(uint256 indexed id, uint256 paidToTenant);

    error NotLandlord();
    error NotTenant();
    error NotArbiter();
    error NotParty();
    error WrongStatus(Status expected, Status actual);
    error InvalidAddress();
    error ZeroAmount();
    error ZeroHash();
    error AlreadyCommitted();
    error MoveInMissing();
    error MoveOutMissing();
    error DeductionTooHigh();
    error AppealWindowOpen();
    error AppealWindowClosed();
    error WindowTooShort();
    error ProposeWindowOpen();
    error ResolveWindowOpen();

    constructor(IERC20 usdc_, uint64 appealWindow_, uint64 proposeWindow_, uint64 resolveWindow_) {
        if (address(usdc_) == address(0)) revert InvalidAddress();
        if (appealWindow_ < MIN_WINDOW || proposeWindow_ < MIN_WINDOW || resolveWindow_ < MIN_WINDOW) {
            revert WindowTooShort();
        }
        usdc = usdc_;
        appealWindow = appealWindow_;
        proposeWindow = proposeWindow_;
        resolveWindow = resolveWindow_;
    }

    // ------------------------------------------------------------------ views

    function getLease(uint256 id) external view returns (Lease memory) {
        return _leases[id];
    }

    // ------------------------------------------------------------------ lease lifecycle

    /// @notice Landlord (msg.sender) creates a lease. The tenant sees the terms, including the
    /// arbiter, before depositing; depositing is their consent.
    function createLease(address tenant, address arbiter, uint256 amount) external returns (uint256 id) {
        if (tenant == address(0) || arbiter == address(0)) revert InvalidAddress();
        if (tenant == msg.sender || arbiter == msg.sender || arbiter == tenant) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();

        id = ++leaseCount;
        Lease storage l = _leases[id];
        l.landlord = msg.sender;
        l.tenant = tenant;
        l.arbiter = arbiter;
        l.amount = amount;
        l.status = Status.Created;

        emit LeaseCreated(id, msg.sender, tenant, arbiter, amount);
    }

    /// @notice Tenant pays the deposit in. Requires a prior USDC approve for `amount`.
    function deposit(uint256 id) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Created);
        if (msg.sender != l.tenant) revert NotTenant();

        l.status = Status.Funded;
        emit Deposited(id, msg.sender, l.amount);

        usdc.safeTransferFrom(msg.sender, address(this), l.amount);
    }

    /// @notice Tenant or landlord records the photo manifest hash for a phase. Each phase once.
    function commitPhotos(uint256 id, Phase phase, bytes32 manifestHash) external {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Funded);
        if (msg.sender != l.tenant && msg.sender != l.landlord) revert NotParty();
        if (manifestHash == bytes32(0)) revert ZeroHash();

        if (phase == Phase.MoveIn) {
            if (l.moveInHash != bytes32(0)) revert AlreadyCommitted();
            l.moveInHash = manifestHash;
        } else {
            if (l.moveInHash == bytes32(0)) revert MoveInMissing();
            if (l.moveOutHash != bytes32(0)) revert AlreadyCommitted();
            l.moveOutHash = manifestHash;
            l.moveOutAt = uint64(block.timestamp);
        }
        emit PhotosCommitted(id, phase, manifestHash, msg.sender);
    }

    /// @notice Landlord proposes the deduction backed by a report hash. The undisputed part is
    /// paid to the tenant immediately. A zero deduction closes the lease.
    function proposeDeductions(uint256 id, uint256 deduction, bytes32 reportHash) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Funded);
        if (msg.sender != l.landlord) revert NotLandlord();
        if (l.moveOutHash == bytes32(0)) revert MoveOutMissing();
        if (reportHash == bytes32(0)) revert ZeroHash();
        if (deduction > l.amount) revert DeductionTooHigh();

        uint256 toTenant = l.amount - deduction;
        uint64 deadline = uint64(block.timestamp) + appealWindow;

        l.deduction = deduction;
        l.reportHash = reportHash;
        l.appealDeadline = deadline;
        l.status = deduction == 0 ? Status.Closed : Status.Proposed;

        emit DeductionsProposed(id, deduction, toTenant, reportHash, deadline);

        if (toTenant > 0) usdc.safeTransfer(l.tenant, toTenant);
    }

    /// @notice Tenant accepts the deduction; it goes to the landlord.
    function accept(uint256 id) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Proposed);
        if (msg.sender != l.tenant) revert NotTenant();

        uint256 toLandlord = l.deduction;
        l.status = Status.Closed;
        emit Accepted(id, toLandlord);

        usdc.safeTransfer(l.landlord, toLandlord);
    }

    /// @notice Tenant disputes the deduction before the window closes.
    function appeal(uint256 id) external {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Proposed);
        if (msg.sender != l.tenant) revert NotTenant();
        if (block.timestamp > l.appealDeadline) revert AppealWindowClosed();

        l.status = Status.Appealed;
        l.resolveDeadline = uint64(block.timestamp) + resolveWindow;
        emit Appealed(id);
    }

    /// @notice If the landlord never proposes within `proposeWindow` of the move-out photos,
    /// anyone can return the full deposit to the tenant.
    function reclaim(uint256 id) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Funded);
        if (l.moveOutHash == bytes32(0)) revert MoveOutMissing();
        if (block.timestamp <= uint256(l.moveOutAt) + proposeWindow) revert ProposeWindowOpen();

        uint256 toTenant = l.amount;
        l.status = Status.Closed;
        emit Reclaimed(id, toTenant);

        usdc.safeTransfer(l.tenant, toTenant);
    }

    /// @notice If the arbiter never rules within `resolveWindow` of the appeal, anyone can return
    /// the disputed amount to the tenant.
    function expireAppeal(uint256 id) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Appealed);
        if (block.timestamp <= l.resolveDeadline) revert ResolveWindowOpen();

        uint256 toTenant = l.deduction;
        l.status = Status.Closed;
        emit AppealExpired(id, toTenant);

        usdc.safeTransfer(l.tenant, toTenant);
    }

    /// @notice After the window passes with no appeal, anyone can release the deduction to the
    /// landlord (so funds never stay locked if the tenant goes silent).
    function finalize(uint256 id) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Proposed);
        if (block.timestamp <= l.appealDeadline) revert AppealWindowOpen();

        uint256 toLandlord = l.deduction;
        l.status = Status.Closed;
        emit Finalized(id, toLandlord);

        usdc.safeTransfer(l.landlord, toLandlord);
    }

    /// @notice Arbiter splits the disputed deduction. At most the deduction goes to the landlord;
    /// the rest returns to the tenant.
    function resolve(uint256 id, uint256 toLandlord) external nonReentrant {
        Lease storage l = _leases[id];
        _requireStatus(l, Status.Appealed);
        if (msg.sender != l.arbiter) revert NotArbiter();
        if (toLandlord > l.deduction) revert DeductionTooHigh();

        uint256 toTenant = l.deduction - toLandlord;
        l.status = Status.Closed;
        emit Resolved(id, toLandlord, toTenant);

        if (toLandlord > 0) usdc.safeTransfer(l.landlord, toLandlord);
        if (toTenant > 0) usdc.safeTransfer(l.tenant, toTenant);
    }

    // ------------------------------------------------------------------ internal

    function _requireStatus(Lease storage l, Status expected) private view {
        if (l.status != expected) revert WrongStatus(expected, l.status);
    }
}

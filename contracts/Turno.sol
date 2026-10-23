// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Turno — savings circles where the contract holds the pot.
/// @notice A circle has 2-10 members, a fixed USDC contribution and a round
///         duration. Each round, every member contributes once. The final
///         contribution of a round automatically pays the full pot to that
///         round's member, in the same transaction. The circle completes when
///         every member has collected once.
///
///         No owner, no admin, no fees. Money leaves the contract in exactly
///         two ways: the scheduled payout to the member whose turn it is, or
///         a refund of a member's own contribution to a round that has stalled
///         past its deadline.

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Turno {
    uint256 public constant MIN_ROUND_DURATION = 1 hours;
    uint256 public constant MAX_ROUND_DURATION = 90 days;

    IERC20 public immutable usdc;

    struct Circle {
        address creator;
        uint256 contribution;  // in USDC smallest units (6 decimals on Arc)
        uint256 roundDuration; // seconds a round may stay open before it can be refunded
        uint256 roundEnd;      // after this timestamp an incomplete round can be refunded
        uint256 round;         // current round, 0-based; == memberCount when done
        uint256 paidCount;     // contributions held for the current round
        bool completed;
        bool cancelled;        // a stalled round was refunded; circle accepts nothing more
        address[] members;     // payout order, fixed at creation
    }

    Circle[] private _circles;

    // circleId => member => is in the circle
    mapping(uint256 => mapping(address => bool)) public isMember;
    // circleId => round => member => has contributed that round (and not been refunded)
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaidInRound;

    event CircleCreated(
        uint256 indexed circleId,
        address indexed creator,
        uint256 contribution,
        uint256 memberCount,
        uint256 roundDuration
    );
    event Contribution(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount);
    event Payout(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);
    event CircleCancelled(uint256 indexed circleId, uint256 indexed round);
    event Refund(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "Turno: zero token address");
        usdc = IERC20(usdcAddress);
    }

    /// @notice Create a circle. `members` is the payout order: members[i]
    ///         collects the pot in round i. `roundDuration` (seconds, 1 hour
    ///         to 90 days) is how long a round may stay unfinished before the
    ///         members who already paid can take their contribution back.
    function createCircle(address[] calldata members, uint256 contribution, uint256 roundDuration)
        external
        returns (uint256 circleId)
    {
        require(members.length >= 2 && members.length <= 10, "Turno: circle needs 2-10 members");
        require(contribution > 0, "Turno: contribution must be > 0");
        require(
            roundDuration >= MIN_ROUND_DURATION && roundDuration <= MAX_ROUND_DURATION,
            "Turno: round duration must be 1 hour to 90 days"
        );

        circleId = _circles.length;
        Circle storage c = _circles.push();
        c.creator = msg.sender;
        c.contribution = contribution;
        c.roundDuration = roundDuration;
        c.roundEnd = block.timestamp + roundDuration;

        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != address(0), "Turno: zero member address");
            require(!isMember[circleId][members[i]], "Turno: duplicate member");
            isMember[circleId][members[i]] = true;
            c.members.push(members[i]);
        }

        emit CircleCreated(circleId, msg.sender, contribution, members.length, roundDuration);
    }

    /// @notice Pay this round's contribution. If this completes the round,
    ///         the pot is paid to this round's member in the same transaction.
    ///         Late contributions are accepted until someone refunds the round.
    function contribute(uint256 circleId) external {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        require(!c.completed, "Turno: circle completed");
        require(!c.cancelled, "Turno: circle cancelled");
        require(isMember[circleId][msg.sender], "Turno: not a member");
        require(!hasPaidInRound[circleId][c.round][msg.sender], "Turno: already paid this round");

        uint256 round = c.round;
        uint256 amount = c.contribution;

        // Effects before interactions.
        hasPaidInRound[circleId][round][msg.sender] = true;
        c.paidCount += 1;

        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "Turno: contribution transfer failed"
        );
        emit Contribution(circleId, round, msg.sender, amount);

        if (c.paidCount == c.members.length) {
            address recipient = c.members[round];
            uint256 pot = amount * c.members.length;

            // Advance state before paying out, so the payout cannot re-trigger.
            c.round += 1;
            c.paidCount = 0;
            if (c.round == c.members.length) {
                c.completed = true;
            } else {
                c.roundEnd = block.timestamp + c.roundDuration;
            }

            require(usdc.transfer(recipient, pot), "Turno: payout transfer failed");
            emit Payout(circleId, round, recipient, pot);
            if (c.completed) {
                emit CircleCompleted(circleId);
            }
        }
    }

    /// @notice Take back your own contribution to a round that has stalled
    ///         past its deadline. The first refund cancels the circle (no more
    ///         contributions); every member who paid into the stalled round
    ///         can then reclaim their own contribution. Only returns money
    ///         the caller put into the current round — pots already paid out
    ///         in earlier rounds are final.
    function refund(uint256 circleId) external {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        require(!c.completed, "Turno: circle completed");

        uint256 round = c.round;
        require(hasPaidInRound[circleId][round][msg.sender], "Turno: nothing to refund");
        require(c.cancelled || block.timestamp > c.roundEnd, "Turno: round still open");

        // Effects before interactions.
        if (!c.cancelled) {
            c.cancelled = true;
            emit CircleCancelled(circleId, round);
        }
        uint256 amount = c.contribution;
        hasPaidInRound[circleId][round][msg.sender] = false;
        c.paidCount -= 1;

        require(usdc.transfer(msg.sender, amount), "Turno: refund transfer failed");
        emit Refund(circleId, round, msg.sender, amount);
    }

    // ---- Views the app uses ----

    function circleCount() external view returns (uint256) {
        return _circles.length;
    }

    function getCircle(uint256 circleId)
        external
        view
        returns (
            address creator,
            uint256 contribution,
            uint256 round,
            uint256 paidCount,
            uint256 memberCount,
            bool completed,
            bool cancelled,
            uint256 roundEnd
        )
    {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        return (
            c.creator,
            c.contribution,
            c.round,
            c.paidCount,
            c.members.length,
            c.completed,
            c.cancelled,
            c.roundEnd
        );
    }

    function getMembers(uint256 circleId) external view returns (address[] memory) {
        require(circleId < _circles.length, "Turno: no such circle");
        return _circles[circleId].members;
    }

    function hasPaid(uint256 circleId, address member) external view returns (bool) {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        if (c.completed) return false;
        return hasPaidInRound[circleId][c.round][member];
    }

    /// @notice Whether `member` can call `refund` right now.
    function canRefund(uint256 circleId, address member) external view returns (bool) {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        if (c.completed) return false;
        if (!hasPaidInRound[circleId][c.round][member]) return false;
        return c.cancelled || block.timestamp > c.roundEnd;
    }

    function currentRecipient(uint256 circleId) external view returns (address) {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        require(!c.completed, "Turno: circle completed");
        return c.members[c.round];
    }

    function potSize(uint256 circleId) external view returns (uint256) {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        return c.contribution * c.members.length;
    }
}

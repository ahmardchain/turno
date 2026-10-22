// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Turno — savings circles where the contract holds the pot.
/// @notice A circle has 2-10 members and a fixed USDC contribution.
///         Each round, every member contributes once. The final contribution
///         of a round automatically pays the full pot to that round's member,
///         in the same transaction. The circle completes when every member
///         has collected once. No owner, no admin, no fees, no withdrawal
///         function: the only way money leaves is the scheduled payout.

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Turno {
    IERC20 public immutable usdc;

    struct Circle {
        address creator;
        uint256 contribution; // in USDC smallest units (6 decimals on Arc)
        uint256 round;        // current round, 0-based; == memberCount when done
        uint256 paidCount;    // contributions received in the current round
        bool completed;
        address[] members;    // payout order, fixed at creation
    }

    Circle[] private _circles;

    // circleId => member => is in the circle
    mapping(uint256 => mapping(address => bool)) public isMember;
    // circleId => round => member => has contributed that round
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaidInRound;

    event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 contribution, uint256 memberCount);
    event Contribution(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount);
    event Payout(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "Turno: zero token address");
        usdc = IERC20(usdcAddress);
    }

    /// @notice Create a circle. `members` is the payout order: members[i]
    ///         collects the pot in round i.
    function createCircle(address[] calldata members, uint256 contribution)
        external
        returns (uint256 circleId)
    {
        require(members.length >= 2 && members.length <= 10, "Turno: circle needs 2-10 members");
        require(contribution > 0, "Turno: contribution must be > 0");

        circleId = _circles.length;
        Circle storage c = _circles.push();
        c.creator = msg.sender;
        c.contribution = contribution;

        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != address(0), "Turno: zero member address");
            require(!isMember[circleId][members[i]], "Turno: duplicate member");
            isMember[circleId][members[i]] = true;
            c.members.push(members[i]);
        }

        emit CircleCreated(circleId, msg.sender, contribution, members.length);
    }

    /// @notice Pay this round's contribution. If this completes the round,
    ///         the pot is paid to this round's member in the same transaction.
    function contribute(uint256 circleId) external {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        require(!c.completed, "Turno: circle completed");
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
            }

            require(usdc.transfer(recipient, pot), "Turno: payout transfer failed");
            emit Payout(circleId, round, recipient, pot);
            if (c.completed) {
                emit CircleCompleted(circleId);
            }
        }
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
            bool completed
        )
    {
        require(circleId < _circles.length, "Turno: no such circle");
        Circle storage c = _circles[circleId];
        return (c.creator, c.contribution, c.round, c.paidCount, c.members.length, c.completed);
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

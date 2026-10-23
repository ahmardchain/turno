# Turno — Contract reference

Source: [`contracts/Turno.sol`](../contracts/Turno.sol) · Solidity `^0.8.24`
License: MIT

The contract is deliberately small. It manages savings circles; nothing else.

## Concepts

- **Circle** — a fixed set of 2–10 member addresses, a fixed contribution
  amount, a round duration, and a payout order equal to the member list order.
- **Round** — one pass in which every member contributes once. Round `i` pays
  its pot to `members[i]`. A circle has exactly `members.length` rounds.
- **Pot** — `contribution × members.length`, paid automatically when a round
  completes.
- **Deadline** — each round has an end time (`roundEnd`). A round that is still
  unfinished after it is *stalled*: members who already paid into it may take
  their own contribution back. Until someone does, late contributions are
  still accepted.
- **Cancelled** — the first refund of a stalled round closes the circle. It
  accepts no further contributions; every member who paid into the stalled
  round can still reclaim their own contribution.

## State

| Name | Meaning |
| --- | --- |
| `usdc` | The ERC-20 token (immutable, set in the constructor) |
| `MIN_ROUND_DURATION` / `MAX_ROUND_DURATION` | 1 hour / 90 days |
| `_circles[]` | All circles: creator, contribution, round duration, round end, current round, paid count this round, completed flag, cancelled flag, member list |
| `isMember[circleId][address]` | Membership lookup |
| `hasPaidInRound[circleId][round][address]` | Per-round contribution flags — keying by round makes a second payout for the same round impossible; cleared on refund so a contribution can only be refunded once |

## Functions

### `createCircle(address[] members, uint256 contribution, uint256 roundDuration) → uint256 circleId`
Creates a circle. `members` is the payout order and cannot change afterwards.
`roundDuration` is in seconds. The first round's deadline is
`block.timestamp + roundDuration`.

Reverts if: fewer than 2 or more than 10 members · any zero address · any
duplicate member · `contribution == 0` · `roundDuration` below 1 hour or above
90 days.

Emits `CircleCreated`.

### `contribute(uint256 circleId)`
Pays the caller's contribution for the current round.

1. Checks: circle exists, not completed, not cancelled, caller is a member,
   caller has not already contributed this round.
2. Effects: marks the caller paid for this round, increments the paid count.
3. Interactions: `transferFrom` the contribution into the contract; emits
   `Contribution`.
4. If the round is now complete: the state advances to the next round (the
   circle is marked completed if this was the last round, otherwise the next
   round's deadline is set to `now + roundDuration`) **before** the pot is
   transferred to this round's member; emits `Payout` (and `CircleCompleted`
   on the final round).

### `refund(uint256 circleId)`
Takes the caller's own contribution to the current, stalled round back.

1. Checks: circle exists and is not completed; the caller has a live
   contribution in the current round; the round's deadline has passed (or the
   circle is already cancelled).
2. Effects: the first refund marks the circle cancelled (`CircleCancelled`);
   the caller's paid-flag is cleared and the paid count decremented.
3. Interactions: transfers exactly one `contribution` back to the caller; emits
   `Refund`.

Only returns what the caller put into the *current* round. Pots paid out in
earlier rounds are final.

### Views
| Function | Returns |
| --- | --- |
| `circleCount()` | Number of circles ever created |
| `getCircle(id)` | creator, contribution, round, paidCount, memberCount, completed, cancelled, roundEnd |
| `getMembers(id)` | Member addresses in payout order |
| `hasPaid(id, member)` | Whether `member` has a live contribution in the current round |
| `canRefund(id, member)` | Whether `member` can call `refund` right now |
| `currentRecipient(id)` | Who collects this round (reverts if completed) |
| `potSize(id)` | `contribution × memberCount` |

## Events

| Event | When |
| --- | --- |
| `CircleCreated(circleId, creator, contribution, memberCount, roundDuration)` | Circle created |
| `Contribution(circleId, round, member, amount)` | A member pays in |
| `Payout(circleId, round, recipient, amount)` | A round completed and the pot was paid — always in the same transaction as that round's final `Contribution` |
| `CircleCompleted(circleId)` | Final round paid out |
| `CircleCancelled(circleId, round)` | A stalled round was first refunded; the circle is closed |
| `Refund(circleId, round, member, amount)` | A member took their own contribution back |

## Invariants (asserted by `contracts/local-test.mjs`)

1. A pot is paid **exactly once per round**, always to `members[round]`,
   always for `contribution × members.length`.
2. No address can contribute twice in one round; non-members can never
   contribute; a completed or cancelled circle accepts no contributions.
3. At circle completion the contract's token balance attributable to the
   circle is zero, and every member's net across the full cycle is zero.
4. Money leaves the contract in exactly two ways: the round payout to
   `members[round]`, and a refund of a member's own contribution to a stalled
   round, after its deadline. There is no owner and no function for anyone,
   including the deployer, to move other people's tokens.
5. A refund can only be claimed by a member with a live contribution in the
   current round, only after the deadline, and only once per contribution;
   after all refunds the contract holds nothing for that circle.
6. A late contribution (after the deadline, before any refund) still counts and
   still completes the round; the next round then gets a fresh deadline.

## Known limit — default risk

Refunds protect the stalled round only. If a member collects the pot and then
stops paying, members who have not yet collected can lose the contributions
they paid in earlier rounds (the test harness asserts this exact outcome:
the defaulter ends +2 contributions, the others −1 each, in a 3-member circle
that stalls in round 2). Circles are for people who trust each other;
collateral or deposits are post-grant work.

## Security notes

- Checks-effects-interactions ordering in `contribute` and `refund`; round
  state advances (and refund flags clear) before any token transfer.
- The token is assumed to be Arc's USDC (a standard ERC-20 that returns
  `bool`). Fee-on-transfer or rebasing tokens are out of scope by design —
  the constructor takes the token address, and Turno is only ever deployed
  against USDC.
- The contract is **not audited**. It was logic-tested locally against a mock
  USDC (see the test harness). Use small amounts.
- Gas note: the final contribution of a round is the most expensive call
  (contribution + payout + state completion). Wallets estimate it
  automatically; the app adds a 30% buffer to the node's estimate, and
  scripted callers should set an explicit gas limit — local testing on ganache
  showed its estimator can intermittently under-price exactly this transaction.

## Deployment parameters

| Parameter | Mainnet | Testnet |
| --- | --- | --- |
| Constructor arg (`usdcAddress`) | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| Chain ID | 5042 | 5042002 |

Deployment itself is performed in Arc Studio — see
[`studio/STUDIO_PROMPTS.md`](../studio/STUDIO_PROMPTS.md) for the prompt
sequence, test gates and the Studio-vs-reference checklist.

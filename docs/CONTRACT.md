# Turno — Contract reference

Source: [`contracts/Turno.sol`](../contracts/Turno.sol) · Solidity `^0.8.24`
License: MIT

The contract is deliberately small. It manages savings circles; nothing else.

## Concepts

- **Circle** — a fixed set of 2–10 member addresses, a fixed contribution
  amount, and a payout order equal to the member list order.
- **Round** — one pass in which every member contributes once. Round `i` pays
  its pot to `members[i]`. A circle has exactly `members.length` rounds.
- **Pot** — `contribution × members.length`, paid automatically when a round
  completes.

## State

| Name | Meaning |
| --- | --- |
| `usdc` | The ERC-20 token (immutable, set in the constructor) |
| `_circles[]` | All circles: creator, contribution, current round, paid count this round, completed flag, member list |
| `isMember[circleId][address]` | Membership lookup |
| `hasPaidInRound[circleId][round][address]` | Per-round contribution flags — keying by round makes a second payout for the same round impossible |

## Functions

### `createCircle(address[] members, uint256 contribution) → uint256 circleId`
Creates a circle. `members` is the payout order and cannot change afterwards.

Reverts if: fewer than 2 or more than 10 members · any zero address · any
duplicate member · `contribution == 0`.

Emits `CircleCreated`.

### `contribute(uint256 circleId)`
Pays the caller's contribution for the current round.

1. Checks: circle exists, not completed, caller is a member, caller has not
   already contributed this round.
2. Effects: marks the caller paid for this round, increments the paid count.
3. Interactions: `transferFrom` the contribution into the contract; emits
   `Contribution`.
4. If the round is now complete: the state advances to the next round (and the
   circle is marked completed if this was the last round) **before** the pot
   is transferred to this round's member; emits `Payout` (and
   `CircleCompleted` on the final round).

### Views
| Function | Returns |
| --- | --- |
| `circleCount()` | Number of circles ever created |
| `getCircle(id)` | creator, contribution, round, paidCount, memberCount, completed |
| `getMembers(id)` | Member addresses in payout order |
| `hasPaid(id, member)` | Whether `member` has contributed in the current round |
| `currentRecipient(id)` | Who collects this round (reverts if completed) |
| `potSize(id)` | `contribution × memberCount` |

## Events

| Event | When |
| --- | --- |
| `CircleCreated(circleId, creator, contribution, memberCount)` | Circle created |
| `Contribution(circleId, round, member, amount)` | A member pays in |
| `Payout(circleId, round, recipient, amount)` | A round completed and the pot was paid — always in the same transaction as that round's final `Contribution` |
| `CircleCompleted(circleId)` | Final round paid out |

## Invariants (all asserted by `contracts/local-test.mjs`)

1. A pot is paid **exactly once per round**, always to `members[round]`,
   always for `contribution × members.length`.
2. No address can contribute twice in one round; non-members can never
   contribute; a completed circle accepts no contributions.
3. At circle completion the contract's token balance attributable to the
   circle is zero, and every member's net across the full cycle is zero.
4. There is **no function** — for anyone, including the deployer — that moves
   tokens out of the contract other than the round payout. There is no owner.

## Security notes

- Checks-effects-interactions ordering in `contribute`; round state advances
  before the payout transfer.
- The token is assumed to be Arc's USDC (a standard ERC-20 that returns
  `bool`). Fee-on-transfer or rebasing tokens are out of scope by design —
  the constructor takes the token address, and Turno is only ever deployed
  against USDC.
- The contract is **not audited**. It was logic-tested locally against a mock
  USDC over a full cycle (see the test harness). Use small amounts.
- Gas note: the final contribution of a round is the most expensive call
  (contribution + payout + state completion). Wallets estimate it
  automatically; scripted callers should set an explicit gas limit — local
  testing on ganache showed its estimator can intermittently under-price
  exactly this transaction.

## Deployment parameters

| Parameter | Mainnet | Testnet |
| --- | --- | --- |
| Constructor arg (`usdcAddress`) | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| Chain ID | 5042 | 5042002 |

Deployment itself is performed in Arc Studio — see
[`studio/STUDIO_PROMPTS.md`](../studio/STUDIO_PROMPTS.md) for the prompt
sequence, test gates and the Studio-vs-reference checklist.

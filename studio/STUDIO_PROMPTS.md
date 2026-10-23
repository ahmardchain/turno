# Turno — Arc Studio build script

Round 2 eligibility requires the contract and the app to be built in Arc Studio.
Work through these prompts in order, in one Studio project. Keep the Studio
project URL — it goes on the submission form.

Reference implementation (already logic-tested locally against a mock USDC:
full 3-member cycle, auto-payout, stalled-round refunds, reverts — run
`npm run test:contract`): `contracts/Turno.sol`.
The Studio-generated contract must match its function list exactly. If Studio's
version differs in behaviour, fix the Studio version — do not ship the local file.

---

## Prompt 1 — the contract

> Build a Solidity contract called `Turno` for Arc (USDC is the gas token; the
> USDC ERC-20 contract is at 0x3600000000000000000000000000000000000000 with 6
> decimals — take the token address as a constructor argument, do not hardcode it).
>
> Turno runs savings circles. A circle has 2–10 members, a fixed contribution
> amount and a round duration. The member list passed at creation is the payout
> order and cannot change.
>
> Functions:
> - `createCircle(address[] members, uint256 contribution, uint256 roundDuration)`
>   returns the circle id. `roundDuration` is in seconds, between 1 hour and 90
>   days; the first round's deadline is now + roundDuration. Reject: fewer than 2
>   or more than 10 members, zero addresses, duplicate members, zero
>   contribution, round duration outside the allowed range.
> - `contribute(uint256 circleId)`: the circle must not be completed or
>   cancelled; the caller must be a member who has not yet contributed in the
>   current round. Pull their contribution with transferFrom into the contract.
>   Late contributions (after the deadline) are allowed until the circle is
>   cancelled. When this contribution completes the round (every member has
>   paid), immediately — in the same transaction — transfer the full pot
>   (contribution × member count) to the member whose turn this round is
>   (members[round]), then advance to the next round and set its deadline to now
>   + roundDuration. When the final round pays out, mark the circle completed.
> - `refund(uint256 circleId)`: the circle must not be completed; the caller must
>   have a live contribution in the current round; the current round's deadline
>   must have passed (or the circle already be cancelled). The first refund marks
>   the circle cancelled and emits CircleCancelled. Clear the caller's paid-flag,
>   decrement the paid count, and transfer exactly one contribution back to the
>   caller. Emit Refund.
> - Views: `getCircle` (creator, contribution, round, paidCount, memberCount,
>   completed, cancelled, roundEnd), `getMembers`, `hasPaid` (current round),
>   `canRefund(circleId, member)`, `currentRecipient`, `potSize`, `circleCount`.
> - Events: `CircleCreated` (circleId, creator, contribution, memberCount,
>   roundDuration), `Contribution`, `Payout`, `CircleCompleted`,
>   `CircleCancelled`, `Refund`.
>
> Rules: no owner, no admin, no fees. Money leaves the contract in exactly two
> ways: the automatic payout to members[round], or a refund of the caller's own
> contribution to a stalled round. Update state before token transfers. Key the
> paid-flags by round so a round can never pay out twice and a contribution can
> never be refunded twice.

## Prompt 2 — tests (ask Studio to write and run them)

> Write tests for Turno and run them:
> 1. Create a 3-member circle, contribution 2 USDC, 7 days per round. `potSize`
>    is 6 USDC. Creation reverts for 1 or 11 members, a zero address, a
>    duplicate, zero contribution, and a round shorter than 1 hour or longer
>    than 90 days.
> 2. Round 0: after two contributions no payout has happened; the third
>    contribution pays exactly 6 USDC to member 0 in the same transaction
>    (assert the Payout event and balances).
> 3. Contributing twice in one round reverts. A non-member contributing reverts.
> 4. Play all 3 rounds: each member collects the pot exactly once, the circle is
>    completed, the contract balance is 0, and every member's net is 0.
> 5. Contributing or refunding after completion reverts.
> 6. Stalled round: in a 1-day-round circle, finish round 0, then have only two
>    of three members pay round 1. Refund reverts before the deadline, for the
>    member who did not pay, and for a non-member. After the deadline the two
>    payers can each refund exactly once; the first refund cancels the circle;
>    contributing after cancellation reverts; the contract ends with a balance
>    of 0.
> 7. Late contribution: after the deadline passes with no refund, the remaining
>    members can still pay and the round completes and pays out; the next round
>    gets a fresh deadline, so an immediate refund reverts.
> Show me the test results.

## Prompt 3 — review pass

> Review Turno for: reentrancy through the token transfers (in contribute and
> refund), any path that pays a pot twice or refunds a contribution twice, any
> path that lets a non-member contribute or a member skip a round, and any way
> money can leave the contract other than the scheduled payout or a member's
> refund of their own contribution to a stalled round. List what you checked and
> fix anything you find, then re-run the tests.

## Prompt 4 — testnet deploy + rehearsal

> Deploy Turno to Arc testnet with the testnet USDC address as the constructor
> argument. Then create a demo circle with three wallets I control, a 2 USDC
> contribution and 24 hours per round, and walk one full round of contributions so I can see the
> automatic payout fire. Show me the contract address and the payout transaction
> on the testnet explorer.

**Gate: do not go to mainnet until the rehearsal round pays out correctly.**

## Prompt 5 — the app

> Build a web app for Turno (deployed contract address: [PASTE AFTER PROMPT 4]).
> Brand: near-black green `#0B0F0C`, lime `#C8F169`, paper `#F7F5EF`. Motif: a ring
> of dots, one filled = whose turn it is. Plain language only — say "circle",
> "turn", "pot", "pay in", "collect". Never say ROSCA, yield or protocol.
>
> Screens:
> 1. **Home** — my circles (as creator or member), each showing: contribution,
>    round x of n, whose turn it is, pot size. Plus "Start a circle".
> 2. **Start a circle** — contribution amount in USDC, hours per round (1 to
>    2160), and member wallet addresses entered in payout order (2–10). Creates
>    the circle on-chain.
> 3. **Circle view** — the ring of members in order; current recipient
>    highlighted; a checklist of who has paid this round (live from `hasPaid`);
>    the pot; the round deadline; a **Pay in** button that does the USDC approve
>    + `contribute` for the connected wallet; when the round is past its
>    deadline, a **Take my contribution back** button (`refund`) for members who
>    paid; and when a payout happens, show it immediately with a link to the
>    transaction on explorer.arc.io. Completed state: "Circle complete —
>    everyone got their turn." Cancelled state: "Circle closed — the round
>    stalled and was refunded."
>
> Every amount in USDC with 6-decimal handling. Every transaction state
> (waiting, confirming, done, failed) visible — no silent buttons. Set each
> transaction's gas limit to the node's estimate plus 30%, with a fixed fallback
> if estimation fails (the final contribution of a round also pays out, so it is
> the most expensive call).

## Prompt 6 — mainnet (only after the testnet gate + funding decision)

> Switch this project to Arc mainnet. Deploy Turno with the mainnet USDC address
> (0x3600000000000000000000000000000000000000) as the constructor argument. Keep
> amounts small. Give me: the contract address, the deployment transaction, and
> then create the demo circle (3 wallets, 2 USDC contribution, 24 hours per round) and run round 1
> so we produce a real mainnet payout transaction for the submission.

## Before submitting — Studio vs reference checklist

- [ ] Function signatures match `contracts/Turno.sol` (incl. `createCircle`'s
      `roundDuration` and `refund`)
- [ ] No owner/admin in the Studio contract; the only ways money leaves are the
      round payout and a member's refund of their own contribution
- [ ] Studio tests pass (same 7 cases as Prompt 2)
- [ ] Testnet rehearsal payout verified on the explorer
- [ ] Mainnet: contract address + at least one payout tx hash on explorer.arc.io
- [ ] Studio project URL copied into `submission/SUBMISSION.md`

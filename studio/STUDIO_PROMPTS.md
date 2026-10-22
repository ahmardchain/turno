# Turno — Arc Studio build script

Round 2 eligibility requires the contract and the app to be built in Arc Studio.
Work through these prompts in order, in one Studio project. Keep the Studio
project URL — it goes on the submission form.

Reference implementation (already logic-tested locally against a mock USDC:
full 3-member cycle, auto-payout, reverts): `contracts/Turno.sol`.
The Studio-generated contract must match its function list exactly. If Studio's
version differs in behaviour, fix the Studio version — do not ship the local file.

---

## Prompt 1 — the contract

> Build a Solidity contract called `Turno` for Arc (USDC is the gas token; the
> USDC ERC-20 contract is at 0x3600000000000000000000000000000000000000 with 6
> decimals — take the token address as a constructor argument, do not hardcode it).
>
> Turno runs savings circles. A circle has 2–10 members and a fixed contribution
> amount. The member list passed at creation is the payout order and cannot change.
>
> Functions:
> - `createCircle(address[] members, uint256 contribution)` returns the circle id.
>   Reject: fewer than 2 or more than 10 members, zero addresses, duplicate
>   members, zero contribution.
> - `contribute(uint256 circleId)`: the caller must be a member who has not yet
>   contributed in the current round. Pull their contribution with transferFrom
>   into the contract. When this contribution completes the round (every member
>   has paid), immediately — in the same transaction — transfer the full pot
>   (contribution × member count) to the member whose turn this round is
>   (members[round]), then advance to the next round. When the final round pays
>   out, mark the circle completed.
> - Views: `getCircle`, `getMembers`, `hasPaid` (current round), `currentRecipient`,
>   `potSize`, `circleCount`.
> - Events: `CircleCreated`, `Contribution`, `Payout`, `CircleCompleted`.
>
> Rules: no owner, no admin, no fees, no withdrawal function — the automatic
> payout is the only way money leaves. Update state before token transfers.
> Key the paid-flags by round so a round can never pay out twice.

## Prompt 2 — tests (ask Studio to write and run them)

> Write tests for Turno and run them:
> 1. Create a 3-member circle, contribution 2 USDC. `potSize` is 6 USDC.
> 2. Round 0: after two contributions no payout has happened; the third
>    contribution pays exactly 6 USDC to member 0 in the same transaction
>    (assert the Payout event and balances).
> 3. Contributing twice in one round reverts. A non-member contributing reverts.
> 4. Play all 3 rounds: each member collects the pot exactly once, the circle is
>    completed, the contract balance is 0, and every member's net is 0.
> 5. Contributing after completion reverts.
> Show me the test results.

## Prompt 3 — review pass

> Review Turno for: reentrancy through the token transfers, any path that pays a
> pot twice, any path that lets a non-member contribute or a member skip a round,
> and any way money can leave the contract other than the scheduled payout.
> List what you checked and fix anything you find, then re-run the tests.

## Prompt 4 — testnet deploy + rehearsal

> Deploy Turno to Arc testnet with the testnet USDC address as the constructor
> argument. Then create a demo circle with three wallets I control and a 2 USDC
> contribution, and walk one full round of contributions so I can see the
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
> 2. **Start a circle** — contribution amount in USDC, and member wallet
>    addresses entered in payout order (2–10). Creates the circle on-chain.
> 3. **Circle view** — the ring of members in order; current recipient
>    highlighted; a checklist of who has paid this round (live from `hasPaid`);
>    the pot; a **Pay in** button that does the USDC approve + `contribute`
>    for the connected wallet; and when a payout happens, show it immediately
>    with a link to the transaction on explorer.arc.io. Completed state:
>    "Circle complete — everyone got their turn."
>
> Every amount in USDC with 6-decimal handling. Every transaction state
> (waiting, confirming, done, failed) visible — no silent buttons.

## Prompt 6 — mainnet (only after the testnet gate + funding decision)

> Switch this project to Arc mainnet. Deploy Turno with the mainnet USDC address
> (0x3600000000000000000000000000000000000000) as the constructor argument. Keep
> amounts small. Give me: the contract address, the deployment transaction, and
> then create the demo circle (3 wallets, 2 USDC contribution) and run round 1
> so we produce a real mainnet payout transaction for the submission.

## Before submitting — Studio vs reference checklist

- [ ] Function signatures match `contracts/Turno.sol`
- [ ] No owner/admin/withdrawal in the Studio contract
- [ ] Studio tests pass (same 5 cases as Prompt 2)
- [ ] Testnet rehearsal payout verified on the explorer
- [ ] Mainnet: contract address + at least one payout tx hash on explorer.arc.io
- [ ] Studio project URL copied into `submission/SUBMISSION.md`

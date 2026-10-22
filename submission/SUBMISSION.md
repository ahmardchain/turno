# Turno — DoraHacks submission (Arc Microgrants Round 2)

**Name:** Turno
**Tagline:** Everyone gets their turn.
**Deadline:** Sunday 2026-11-01. Rolling review — submit as soon as the mainnet
demo is live, do not wait for the deadline.

## Short description (form field)

Turno is a savings circle — ajo, esusu, susu, tontine — where the smart contract
holds the pot. Groups of 2–10 set a fixed USDC contribution on Arc. Each round,
every member pays in; the moment the last contribution lands, the full pot pays
that round's member automatically, in the same transaction. No organiser holds
the money, no admin can delay or redirect a payout, and the rotation fixed at
creation is visible to everyone. Built end-to-end in Arc Studio.

## Long description

Savings circles move serious money on pure trust, and the failure mode is always
whoever holds the pot: organisers abscond, ledgers get disputed, payouts stall.
The apps that exist today fix the record-keeping — reminders, tracking, shared
ledgers — but deliberately don't touch the money (one leading app states it
plainly: "tracking only — no wallet, no escrow"), or they hold funds as a
licensed local custodian in one currency and one country.

Turno removes the trusted holder entirely. Contributions go to a contract on Arc
with no owner, no admin, no fee and no withdrawal function. The only code path
that moves money out is the payout, and it fires automatically as part of the
final contribution of each round. A circle in Lagos and a diaspora member in
London settle in USDC, in the same circle, with sub-second finality — and every
contribution and payout is verifiable on the Arc explorer.

From here: recurring/cross-circle reputation from on-time contributions,
larger circles with sub-groups, and fiat on-ramps so a member can pay in from
a bank account while the circle still settles in USDC on Arc.

## How Arc Studio was used

[FILL FROM THE REAL BUILD — prompts are in `studio/STUDIO_PROMPTS.md`]
The Turno contract was described, generated and tested in Arc Studio (test cases:
full-cycle payout, double-contribution and non-member reverts, completion), put
through a Studio review pass, deployed to Arc testnet for a rehearsal circle,
and the app was built in Studio around the deployed contract. The same project
was then deployed to Arc mainnet and a live demo circle was run with real USDC.

## Links (fill before submitting)

- Arc Studio project: [PASTE]
- Live app: [PASTE]
- Contract (Arc mainnet): [PASTE address + explorer link]
- Example payout tx: [PASTE hash + explorer link]
- Public repo: [PASTE — push `~/workspace/turno`]
- Video walkthrough: [PASTE]
- Builder profile: github.com/ahmardchain / X @ahmardchain

## Scoring self-check (official weights)

- **Real USDC moving on Arc mainnet (30%)** — demo circle runs real rounds;
  payout tx hash is the example transaction.
- **Arc Studio across the build (25%)** — contract, tests, review, testnet
  rehearsal and app all in one Studio project; video shows it.
- **Working product (25%)** — create circle → pay in → automatic payout →
  completion, all live in the app.
- **Potential to go further (20%)** — savings circles are a global, centuries-old
  practice with named forms on every continent (ajo, esusu, susu, tontine, hui,
  chama, kye…); Turno is the version where no one has to be trusted with the pot.

## Demo video script (~2.5 min)

1. **0:00 — The problem (screen: a WhatsApp group chat).** "This is how millions
   of people save: an ajo circle. Everyone pays in, one person collects. And one
   person holds the money. That's the problem Turno removes."
2. **0:25 — The build (screen: Arc Studio).** Show the Studio project: the
   contract prompt, the generated Turno contract, the passing tests.
3. **0:50 — Create (screen: app).** "Three members, 2 USDC each. Payout order is
   fixed now, in the open."
4. **1:15 — Round 1 (screen: app + wallets).** Each member pays in. On the third
   contribution: "Watch — nobody presses 'pay out'. The contract pays member one
   the full 6 USDC pot inside that same transaction." Cut to the explorer tx.
5. **1:55 — Finish + the guarantee.** Fast-forward rounds 2–3, circle complete.
   "No owner. No admin. No withdrawal button. The only way money ever leaves
   Turno is to the member whose turn it is."
6. **2:20 — Close.** "Turno. Everyone gets their turn. Built in Arc Studio,
   live on Arc mainnet."

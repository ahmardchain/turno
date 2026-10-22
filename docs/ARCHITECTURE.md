# Turno — Architecture

## System overview

Turno has exactly two components. There is no backend and no database: the
contract is the system of record, and the app is a window onto it.

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  Web app (Vite + React)    │  RPC   │  Turno contract on Arc       │
│  hosted on Vercel          │ ─────► │  - circles & round state     │
│                            │        │  - holds USDC pots           │
│  - landing + preview sim   │        │  - auto-payouts              │
│  - live circle UI (ethers) │        │  USDC 0x3600…0000 (ERC-20)   │
└────────────────────────────┘        └──────────────────────────────┘
```

## Design decisions

### 1. One contract, many circles
A single `Turno` deployment manages every circle (`createCircle` returns an
id). One deployment to verify, one address to configure in the app, and the
demo can create circles freely. Circles are fully isolated from each other:
state is keyed by circle id everywhere.

### 2. The payout lives inside `contribute`
The obvious alternative — members contribute, then someone calls `payout()` —
reintroduces exactly the human dependency Turno exists to remove: a button
someone must remember, or an admin key that can delay or redirect. In Turno,
the final contribution of a round *is* the payout trigger. There is no
`payout()` function at all.

### 3. Everyone contributes every round, including the recipient
Some savings circles exempt the round's recipient from contributing. Turno
keeps the rule uniform — every member contributes in every round — because it
makes the invariant trivially checkable (each round moves exactly
`contribution × members` in, then the same amount out) and removes a
special case from both the contract and the UI.

### 4. USDC via the ERC-20 interface, token address as a constructor argument
Arc exposes USDC twice: as the native gas balance (18 decimals) and as an
ERC-20 at `0x3600000000000000000000000000000000000000` (6 decimals). Contract
logic and the app use the ERC-20 interface exclusively. The address is a
constructor argument rather than a constant so the identical bytecode runs on
testnet and mainnet.

### 5. Preview mode is a first-class mode, not a mock
With no contract address configured, the app ships an in-browser simulator of
a full circle (same rules, same amounts as the tests). It is labelled as a
preview everywhere it appears. This is deliberate: judges, users and
contributors can understand the product end-to-end before any wallet or
deployment exists — and the simulator doubles as a behavioural spec for the
live UI.

### 6. No backend, no accounts, no custody — anywhere
The app holds no keys and stores no user data. Wallets sign everything.
Turno (the product) never touches funds at any layer: the contract holds pots
briefly within a round, and only the round's scheduled member can receive
them.

## Data flow (live mode)

1. **Read path:** app → public Arc RPC (`JsonRpcProvider`) → `circleCount`,
   `getCircle`, `getMembers`, `hasPaid`, `currentRecipient`, `potSize`.
2. **Write path:** app → wallet (`BrowserProvider`, network auto-switched to
   Arc) → `createCircle`, or `approve` (only if allowance < contribution)
   followed by `contribute`.
3. **Confirmation:** every write awaits its receipt; if the contribution
   completed a round, the UI says so and shows the transaction hash — the
   payout is in that same receipt's logs (`Payout` event).

## Configuration

All configuration is via Vite environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_ARC_NETWORK` | `mainnet` (default) or `testnet` |
| `VITE_TURNO_CONTRACT_ADDRESS` | Deployed Turno address; empty = preview mode |

Network parameters themselves (chain ids, RPCs, explorers) are constants in
`src/turno.js`, verified against Arc's published network details.

## Failure handling in the app

- Wrong network → the app requests a switch, or adds Arc if the wallet
  doesn't know it (EIP-3085), before any transaction.
- Reverted transaction → the wallet's error message is surfaced in the app;
  there are no silent failures.
- RPC unreachable on load → circle list shows an error with a refresh action.

## What is intentionally not here (yet)

- **Notifications** (round reminders) — needs an off-chain indexer/watcher;
  post-grant work.
- **Fiat on-ramps** — members currently need USDC on Arc; post-grant.
- **Reputation** — contribution history already exists on-chain; surfacing it
  as a portable record is post-grant.

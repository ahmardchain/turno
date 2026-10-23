# Turno — Deployment

Two deployments, kept separate on purpose:

1. **Web app** → Vercel, from this GitHub repository.
2. **Contract** → Arc (testnet first, then mainnet), from Arc Studio.

## 1. Web app on Vercel

The project is a Vite app; Vercel's Vite preset works with zero configuration
(`vercel.json` pins the framework, build command and output directory anyway).

**Setup (once):**

1. Import `github.com/ahmardchain/turno` in Vercel (or link the existing
   project to the repo). Root directory: repository root.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Set environment variables (Production + Preview):

| Variable | Value |
| --- | --- |
| `VITE_ARC_NETWORK` | `mainnet` (use `testnet` for rehearsal builds) |
| `VITE_TURNO_CONTRACT_ADDRESS` | Deployed Turno address — leave unset until the contract is live; the app runs in preview mode without it |

4. Every push to `main` deploys production; other branches get preview URLs.

**Verify a deployment:**

- Page loads, hero + preview simulator visible (or live mode if the contract
  address is set).
- Click through a full preview circle: 3 pay-ins → automatic pot message →
  rounds 2 and 3 → "Circle complete".
- In live mode, a circle created with a short round length shows its round
  deadline; after the deadline, members who paid see the refund button.
- Footer links resolve (GitHub, DoraHacks, Arc docs, explorer).

## 2. Contract on Arc (via Arc Studio)

Follow [`studio/STUDIO_PROMPTS.md`](../studio/STUDIO_PROMPTS.md) in order.
The gates that matter:

1. **Studio tests pass** — the same seven cases the local harness asserts
   (`npm run test:contract` runs the reference harness).
2. **Testnet rehearsal** — deploy to Arc testnet, create a 3-wallet circle,
   play one full round, confirm the payout transaction on the testnet
   explorer. **Do not proceed to mainnet unless this works.**
3. **Mainnet funding decision** — mainnet USDC is real money and there is no
   mainnet faucet. The demo circle needs each member wallet to hold the
   contribution (2 USDC × 3 rounds = 6 USDC per member) plus a little extra
   USDC for gas, bridged to Arc via CCTP from a supported chain. Amounts
   stay small on purpose.
4. **Mainnet deploy** — constructor argument is the mainnet USDC address
   `0x3600000000000000000000000000000000000000`. Record: contract address,
   deployment transaction, Studio project URL.
5. **Go live in the app** — set `VITE_TURNO_CONTRACT_ADDRESS` in Vercel to the
   mainnet address and redeploy. Run the demo circle round 1 and save the
   payout transaction hash — it is the submission's example transaction.

## 3. Submission checklist (DoraHacks)

From [`submission/SUBMISSION.md`](../submission/SUBMISSION.md) — every field
must be filled from the *real* build:

- [ ] Arc Studio project URL
- [ ] Live app URL (Vercel)
- [ ] Contract address + explorer link
- [ ] Example payout transaction hash + explorer link
- [ ] Public repo URL (this repo)
- [ ] Video walkthrough (script in the submission doc)
- [ ] Builder profile links (GitHub / X)

Deadline: **Sunday 2026-11-01**, rolling review — submit as soon as the
mainnet demo circle has run, not at the deadline.

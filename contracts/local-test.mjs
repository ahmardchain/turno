// Local logic test for contracts/Turno.sol.
// Run from the repo root:  npm install && npm run test:contract
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import solc from "solc";
import ganache from "ganache";
import { ethers } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const turnoSrc = fs.readFileSync(path.join(here, "Turno.sol"), "utf8");
const mockSrc = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }
    function approve(address sp, uint256 amt) external returns (bool) { allowance[msg.sender][sp] = amt; return true; }
    function transfer(address to, uint256 amt) external returns (bool) {
        require(balanceOf[msg.sender] >= amt, "bal"); balanceOf[msg.sender] -= amt; balanceOf[to] += amt; return true;
    }
    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        require(balanceOf[from] >= amt, "bal");
        require(allowance[from][msg.sender] >= amt, "allow");
        allowance[from][msg.sender] -= amt; balanceOf[from] -= amt; balanceOf[to] += amt; return true;
    }
}
`;

function compile(sources) {
  const input = { language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors || []).filter((e) => e.severity === "error");
  assert.equal(errors.length, 0, errors.map((e) => e.formattedMessage).join("\n"));
  return out.contracts;
}

const contracts = compile({ "Turno.sol": { content: turnoSrc }, "MockUSDC.sol": { content: mockSrc } });
console.log("COMPILE OK");

const provider = new ethers.BrowserProvider(ganache.provider({ logging: { quiet: true } }));
const signers = [];
for (let i = 0; i < 5; i++) signers.push(await provider.getSigner(i));
const [deployer, m0, m1, m2, outsider] = signers;
const A = async (s) => await s.getAddress();

// Explicit gas limit: ganache's estimator can under-price the final-round payout tx.
const GAS = { gasLimit: 800000 };

async function send(txPromise, label) {
  const tx = await txPromise;
  let rc;
  try {
    rc = await tx.wait();
  } catch (e) {
    console.error(`SEND FAILED [${label}] hash=${tx.hash}: ${e.shortMessage || e.message}`);
    if (e.receipt) console.error(`  gasUsed=${e.receipt.gasUsed} gasLimit=${tx.gasLimit}`);
    throw e;
  }
  assert.equal(rc.status, 1, `${label}: tx reverted on-chain`);
  return rc;
}
async function expectRevert(call, label, reason) {
  let err = null;
  try { await call(); } catch (e) { err = e; }
  assert.ok(err, `${label}: expected the call to revert`);
  if (reason) {
    const text = `${err.reason || ""} ${err.shortMessage || ""} ${err.message || ""}`;
    assert.ok(text.includes(reason), `${label}: expected revert reason "${reason}", got: ${text}`);
  }
  console.log("REVERT OK:", label);
}
async function advance(seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

const mockC = contracts["MockUSDC.sol"]["MockUSDC"];
const mock = await new ethers.ContractFactory(mockC.abi, mockC.evm.bytecode.object, deployer).deploy();
const mockAddr = await mock.getAddress();
const turnoC = contracts["Turno.sol"]["Turno"];
const turno = await new ethers.ContractFactory(turnoC.abi, turnoC.evm.bytecode.object, deployer).deploy(mockAddr);
const turnoAddr = await turno.getAddress();
console.log("DEPLOYED turno:", turnoAddr);

const U = 1_000_000n, CONTRIB = 2n * U;
const DAY = 86_400, HOUR = 3_600;
for (const m of [m0, m1, m2]) {
  await send(mock.mint(await A(m), 100n * U), "mint");
  await send(mock.connect(m).approve(turnoAddr, 100n * U), "approve");
}
const members = [await A(m0), await A(m1), await A(m2)];
const bal = async (s) => await mock.balanceOf(await A(s));
const pay = (m, id, label) => send(turno.connect(m).contribute(id, GAS), label);

// ---------------------------------------------------------------------------
// Creation validation
// ---------------------------------------------------------------------------
const zero = ethers.ZeroAddress;
await expectRevert(() => turno.createCircle.staticCall([members[0]], CONTRIB, DAY), "create: 1 member", "needs 2-10");
await expectRevert(
  () => turno.createCircle.staticCall(Array.from({ length: 11 }, (_, i) => ethers.Wallet.createRandom().address), CONTRIB, DAY),
  "create: 11 members",
  "needs 2-10"
);
await expectRevert(() => turno.createCircle.staticCall([members[0], zero], CONTRIB, DAY), "create: zero address member", "zero member address");
await expectRevert(() => turno.createCircle.staticCall([members[0], members[0]], CONTRIB, DAY), "create: duplicate member", "duplicate member");
await expectRevert(() => turno.createCircle.staticCall(members, 0n, DAY), "create: zero contribution", "must be > 0");
await expectRevert(() => turno.createCircle.staticCall(members, CONTRIB, HOUR - 1), "create: round shorter than 1 hour", "round duration");
await expectRevert(() => turno.createCircle.staticCall(members, CONTRIB, 90 * DAY + 1), "create: round longer than 90 days", "round duration");

// ---------------------------------------------------------------------------
// Circle 0 — the happy path: full 3-member cycle
// ---------------------------------------------------------------------------
await send(turno.createCircle(members, CONTRIB, 7 * DAY), "createCircle 0");
assert.equal(await turno.potSize(0), 3n * CONTRIB);
console.log("CIRCLE OK: pot = 6 USDC");

const start = [await bal(m0), await bal(m1), await bal(m2)];

// ROUND 0
await pay(m0, 0, "r0 m0");
await pay(m1, 0, "r0 m1");
assert.equal(await bal(m0), start[0] - CONTRIB, "no payout before round completes");
await expectRevert(() => turno.connect(m1).contribute.staticCall(0), "double-pay same round (m1 again)", "already paid");
await expectRevert(() => turno.connect(outsider).contribute.staticCall(0), "non-member contribute", "not a member");
const rc0 = await pay(m2, 0, "r0 m2");
const payout0 = rc0.logs.map((l) => { try { return turno.interface.parseLog(l); } catch { return null; } }).find((p) => p?.name === "Payout");
assert.ok(payout0, "Payout event missing in the final contribution tx");
assert.equal(payout0.args.recipient, members[0]);
assert.equal(payout0.args.amount, 3n * CONTRIB);
assert.equal(await bal(m0), start[0] - CONTRIB + 3n * CONTRIB);
console.log("ROUND 0 OK: pot auto-paid to member 0 inside member 2's contribution tx");

// ROUND 1
for (const m of [m0, m1]) await pay(m, 0, "r1 pay");
const b1before = await bal(m1);
await pay(m2, 0, "r1 m2");
assert.equal(await bal(m1), b1before + 3n * CONTRIB, "round 1 payout to member 1");
console.log("ROUND 1 OK: pot paid to member 1");

// ROUND 2 (final)
for (const m of [m0, m1]) await pay(m, 0, "r2 pay");
const b2before = await bal(m2);
await pay(m2, 0, "r2 m2");
assert.equal(await bal(m2), b2before - CONTRIB + 3n * CONTRIB, "round 2 payout to member 2");
console.log("ROUND 2 OK: pot paid to member 2");

const view = await turno.getCircle(0);
assert.equal(view.completed, true, "circle must be completed");
assert.equal(view.cancelled, false, "completed circle is not cancelled");
assert.equal(view.round, 3n);
assert.equal(await mock.balanceOf(turnoAddr), 0n, "contract must end empty");
for (let i = 0; i < 3; i++) assert.equal(await bal([m0, m1, m2][i]), start[i], `member ${i} net zero`);
await expectRevert(() => turno.connect(m0).contribute.staticCall(0), "contribute after completion", "circle completed");
await expectRevert(() => turno.connect(m0).refund.staticCall(0), "refund after completion", "circle completed");
console.log("FULL CYCLE OK: completed, contract empty, all members net 0, post-completion calls revert");

// ---------------------------------------------------------------------------
// Circle 1 — a round stalls past its deadline and is refunded
// ---------------------------------------------------------------------------
await send(turno.createCircle(members, CONTRIB, DAY), "createCircle 1");
const s1 = [await bal(m0), await bal(m1), await bal(m2)];

for (const m of [m0, m1, m2]) await pay(m, 1, "c1 r0 pay"); // round 0 completes: m0 collects
await pay(m0, 1, "c1 r1 m0");
await pay(m1, 1, "c1 r1 m1"); // m2 never pays round 1

await expectRevert(() => turno.connect(m0).refund.staticCall(1), "refund before the deadline", "round still open");
assert.equal(await turno.canRefund(1, members[0]), false);

await advance(2 * DAY);

assert.equal(await turno.canRefund(1, members[0]), true, "payer can refund after the deadline");
assert.equal(await turno.canRefund(1, members[2]), false, "non-payer cannot refund");
await expectRevert(() => turno.connect(m2).refund.staticCall(1), "refund by a member who did not pay this round", "nothing to refund");
await expectRevert(() => turno.connect(outsider).refund.staticCall(1), "refund by a non-member", "nothing to refund");

const m0Before = await bal(m0);
await send(turno.connect(m0).refund(1, GAS), "c1 refund m0");
assert.equal(await bal(m0), m0Before + CONTRIB, "m0 gets own contribution back");
let v1 = await turno.getCircle(1);
assert.equal(v1.cancelled, true, "first refund cancels the circle");
assert.equal(v1.paidCount, 1n);
await expectRevert(() => turno.connect(m2).contribute.staticCall(1), "contribute after cancellation", "circle cancelled");
await expectRevert(() => turno.connect(m0).refund.staticCall(1), "second refund by the same member", "nothing to refund");

const m1Before = await bal(m1);
await send(turno.connect(m1).refund(1, GAS), "c1 refund m1");
assert.equal(await bal(m1), m1Before + CONTRIB, "m1 gets own contribution back");
v1 = await turno.getCircle(1);
assert.equal(v1.paidCount, 0n);
assert.equal(await mock.balanceOf(turnoAddr), 0n, "contract holds nothing once the stalled round is refunded");

// Known limit, asserted so it stays documented: refunds return only the stalled
// round's contributions. Pots already paid out are final, so a member who
// collected early and then stopped paying leaves later members behind.
assert.equal(await bal(m0), s1[0] + 2n * CONTRIB, "m0 collected round 0 and defaulted: +2c");
assert.equal(await bal(m1), s1[1] - CONTRIB, "m1 paid round 0 only (round 1 refunded): -c");
assert.equal(await bal(m2), s1[2] - CONTRIB, "m2 paid round 0 only: -c");
console.log("STALL OK: stalled round refunded, circle cancelled, contract empty (default risk documented)");

// ---------------------------------------------------------------------------
// Circle 2 — a late contribution still counts until someone refunds
// ---------------------------------------------------------------------------
await send(turno.createCircle(members, CONTRIB, DAY), "createCircle 2");
await pay(m0, 2, "c2 r0 m0");
await advance(2 * DAY); // deadline passes, nobody refunds
await pay(m1, 2, "c2 r0 m1 (late)");
const c2m0Before = await bal(m0);
await pay(m2, 2, "c2 r0 m2 (late)");
assert.equal(await bal(m0), c2m0Before + 3n * CONTRIB, "late round still pays out to member 0");
let v2 = await turno.getCircle(2);
assert.equal(v2.round, 1n);
assert.equal(v2.cancelled, false);
await pay(m0, 2, "c2 r1 m0");
await expectRevert(() => turno.connect(m0).refund.staticCall(2), "new round gets a fresh deadline", "round still open");
console.log("LATE PAY OK: late contributions complete the round and the next round gets a fresh deadline");

console.log("ALL TESTS PASSED");
process.exit(0);

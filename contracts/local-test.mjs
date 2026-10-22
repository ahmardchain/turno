import fs from "node:fs";
import assert from "node:assert/strict";
import solc from "solc";
import ganache from "ganache";
import { ethers } from "ethers";

const turnoSrc = fs.readFileSync("/home/hatch/workspace/turno/contracts/Turno.sol", "utf8");
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
async function expectRevert(fn, label) {
  let threw = false;
  try { await fn.staticCall(0); } catch { threw = true; }
  assert.ok(threw, `${label}: expected staticCall to revert`);
  console.log("REVERT OK:", label);
}

const mockC = contracts["MockUSDC.sol"]["MockUSDC"];
const mock = await new ethers.ContractFactory(mockC.abi, mockC.evm.bytecode.object, deployer).deploy();
const mockAddr = await mock.getAddress();
const turnoC = contracts["Turno.sol"]["Turno"];
const turno = await new ethers.ContractFactory(turnoC.abi, turnoC.evm.bytecode.object, deployer).deploy(mockAddr);
const turnoAddr = await turno.getAddress();
console.log("DEPLOYED turno:", turnoAddr);

const U = 1_000_000n, CONTRIB = 2n * U;
for (const m of [m0, m1, m2]) {
  await send(mock.mint(await A(m), 100n * U), "mint");
  await send(mock.connect(m).approve(turnoAddr, 100n * U), "approve");
}
const members = [await A(m0), await A(m1), await A(m2)];
await send(turno.createCircle(members, CONTRIB), "createCircle");
assert.equal(await turno.potSize(0), 3n * CONTRIB);
console.log("CIRCLE OK: pot = 6 USDC");

const bal = async (s) => await mock.balanceOf(await A(s));
const start = [await bal(m0), await bal(m1), await bal(m2)];

// ROUND 0
await send(turno.connect(m0).contribute(0), "r0 m0");
await send(turno.connect(m1).contribute(0), "r0 m1");
assert.equal(await bal(m0), start[0] - CONTRIB, "no payout before round completes");
await expectRevert(turno.connect(m1).contribute, "double-pay same round (m1 again)");
await expectRevert(turno.connect(outsider).contribute, "non-member contribute");
const rc0 = await send(turno.connect(m2).contribute(0), "r0 m2");
const payout0 = rc0.logs.map((l) => { try { return turno.interface.parseLog(l); } catch { return null; } }).find((p) => p?.name === "Payout");
assert.ok(payout0, "Payout event missing in the final contribution tx");
assert.equal(payout0.args.recipient, members[0]);
assert.equal(payout0.args.amount, 3n * CONTRIB);
assert.equal(await bal(m0), start[0] - CONTRIB + 3n * CONTRIB);
console.log("ROUND 0 OK: pot auto-paid to member 0 inside member 2's contribution tx");

// ROUND 1
for (const m of [m0, m1]) await send(turno.connect(m).contribute(0), "r1 pay");
const b1before = await bal(m1);
await send(turno.connect(m2).contribute(0), "r1 m2");
assert.equal(await bal(m1), b1before + 3n * CONTRIB, "round 1 payout to member 1");
console.log("ROUND 1 OK: pot paid to member 1");

// ROUND 2 (final)
for (const m of [m0, m1]) await send(turno.connect(m).contribute(0), "r2 pay");
const b2before = await bal(m2);
try {
  await turno.connect(m2).contribute.staticCall(0);
  console.log("r2 m2 staticCall: OK");
} catch (e) {
  console.log("r2 m2 staticCall REVERTS:", e.shortMessage || e.message);
  const v = await turno.getCircle(0);
  console.log("state:", JSON.stringify({ round: v.round.toString(), paidCount: v.paidCount.toString(), completed: v.completed }));
  console.log("m2 hasPaid:", await turno.hasPaid(0, members[2]), "| m2 bal:", (await bal(m2)).toString(),
    "| m2 allowance:", (await mock.allowance(members[2], turnoAddr)).toString(),
    "| contract bal:", (await mock.balanceOf(turnoAddr)).toString());
  throw e;
}
await send(turno.connect(m2).contribute(0, { gasLimit: 600000 }), "r2 m2");
assert.equal(await bal(m2), b2before - CONTRIB + 3n * CONTRIB, "round 2 payout to member 2");
console.log("ROUND 2 OK: pot paid to member 2");

const view = await turno.getCircle(0);
assert.equal(view.completed, true, "circle must be completed");
assert.equal(view.round, 3n);
assert.equal(await mock.balanceOf(turnoAddr), 0n, "contract must end empty");
for (let i = 0; i < 3; i++) assert.equal(await bal([m0, m1, m2][i]), start[i], `member ${i} net zero`);
await expectRevert(turno.connect(m0).contribute, "contribute after completion");
console.log("FULL CYCLE OK: completed, contract empty, all members net 0, post-completion contribute reverts");
console.log("ALL TESTS PASSED");
process.exit(0);

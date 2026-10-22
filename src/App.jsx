import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  LIVE,
  NETWORK,
  TURNO_ABI,
  USDC_ABI,
  USDC_ADDRESS,
  fmtUSDC,
  parseUSDC,
  readContract,
  shortAddr,
  walletProvider,
} from "./turno.js";

/* ---------- Shared bits ---------- */

function Ring({ count, active = -1, paidSet = new Set(), size = 120 }) {
  const cx = 50;
  const cy = 50;
  const r = 38;
  const dots = [];
  for (let i = 0; i < count; i++) {
    const ang = ((-90 + (360 / count) * i) * Math.PI) / 180;
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    let cls = "dot";
    if (paidSet.has(i)) cls += " dot-paid";
    if (i === active) cls += " dot-active";
    dots.push(<circle key={i} cx={x} cy={y} r={i === active ? 7 : 5.5} className={cls} />);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} className="ring-track" />
      {dots}
    </svg>
  );
}

function Logo() {
  return (
    <span className="logo">
      <Ring count={6} active={0} size={30} />
      <span className="logo-word">TURNO</span>
    </span>
  );
}

/* ---------- Landing sections ---------- */

function Hero() {
  return (
    <section className="hero">
      <div className="hero-ring">
        <Ring count={8} active={2} size={190} />
      </div>
      <p className="eyebrow">A savings circle on Arc · USDC</p>
      <h1>
        Everyone gets
        <br />
        their <span className="lime">turn.</span>
      </h1>
      <p className="hero-sub">
        Turno is an ajo / esusu savings circle where the <strong>smart contract holds
        the pot</strong> — not the organiser. Everyone pays in each round. The moment
        the last contribution lands, the full pot pays that round's member
        automatically, in the same transaction.
      </p>
      <div className="hero-cta">
        <a className="btn btn-lime" href="#app">
          {LIVE ? "Open the app" : "Try the interactive preview"}
        </a>
        <a className="btn btn-ghost" href="https://github.com/ahmardchain/turno" target="_blank" rel="noreferrer">
          Read the code
        </a>
      </div>
      <p className="hero-note">
        {LIVE ? (
          <>
            Live on {NETWORK.name} · Contract{" "}
            <a href={`${NETWORK.explorer}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
              {shortAddr(CONTRACT_ADDRESS)}
            </a>
          </>
        ) : (
          "Contract deployment in progress — the app below is an interactive preview, clearly labelled. Nothing here moves real money yet."
        )}
      </p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      t: "Start a circle",
      d: "Pick a contribution — say 5 USDC — and list 2–10 members in payout order. That order is fixed on-chain for the whole circle.",
    },
    {
      n: "2",
      t: "Everyone pays in",
      d: "Each round, every member pays their contribution into the contract. The app shows who has paid and who is still owing.",
    },
    {
      n: "3",
      t: "The pot pays itself out",
      d: "The final contribution triggers the payout automatically — the full pot goes to this round's member in the same transaction. No button, no admin, no delay.",
    },
  ];
  return (
    <section className="section" id="how">
      <h2>How it works</h2>
      <div className="steps">
        {steps.map((s) => (
          <div className="step" key={s.n}>
            <div className="step-n">{s.n}</div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyTurno() {
  return (
    <section className="section" id="why">
      <h2>The holder was always the risk</h2>
      <p className="section-sub">
        Savings circles run on trust, and they break in one place: whoever holds the
        money. Organisers abscond. Ledgers get argued over. Payouts get delayed.
      </p>
      <div className="compare">
        <div className="card card-dim">
          <h3>Savings apps today</h3>
          <ul>
            <li>Track contributions in a ledger — the money still sits with a person</li>
            <li>Or a company custodies the funds, in one currency, in one country</li>
            <li>Payout happens when an admin decides to send it</li>
            <li>Disputes are settled by whoever kept the records</li>
          </ul>
        </div>
        <div className="card card-bright">
          <h3>Turno</h3>
          <ul>
            <li>The contract holds the pot — no person, no company, no account to run off with</li>
            <li>Payout is code: it fires inside the final contribution transaction</li>
            <li>No owner, no admin, no fees, no withdrawal function — by design</li>
            <li>Every contribution and payout is verifiable on the Arc explorer</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Status() {
  const rows = [
    ["Brand, product spec and reference contract", true],
    ["Contract logic-tested locally (full 3-member cycle, payouts, reverts)", true],
    ["This app, documentation and public repo", true],
    ["Contract + app built in Arc Studio, testnet rehearsal", false],
    ["Mainnet deployment and live demo circle with real USDC", false],
    ["DoraHacks submission — Arc Microgrants Round 2 (closes Sun Nov 1, 2026)", false],
  ];
  return (
    <section className="section" id="status">
      <h2>Build status</h2>
      <div className="status-list">
        {rows.map(([label, done]) => (
          <div className="status-row" key={label}>
            <span className={done ? "status-dot done" : "status-dot"} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Preview app (in-browser simulator) ---------- */

const PREVIEW_MEMBERS = ["Adaeze", "Tunde", "Maya"];
const PREVIEW_CONTRIB = 2;

function PreviewApp() {
  const [round, setRound] = useState(0);
  const [paid, setPaid] = useState(new Set());
  const [log, setLog] = useState([]);
  const completed = round >= PREVIEW_MEMBERS.length;

  function payIn(i) {
    if (completed || paid.has(i)) return;
    const next = new Set(paid);
    next.add(i);
    const entries = [`${PREVIEW_MEMBERS[i]} paid in ${PREVIEW_CONTRIB} USDC (round ${round + 1})`];
    if (next.size === PREVIEW_MEMBERS.length) {
      entries.push(
        `Pot of ${PREVIEW_CONTRIB * PREVIEW_MEMBERS.length} USDC paid automatically to ${PREVIEW_MEMBERS[round]} — same transaction, no admin`
      );
      setPaid(new Set());
      setRound(round + 1);
    } else {
      setPaid(next);
    }
    setLog((l) => [...entries, ...l].slice(0, 8));
  }

  function reset() {
    setRound(0);
    setPaid(new Set());
    setLog([]);
  }

  return (
    <div className="appbox">
      <div className="preview-badge">
        Interactive preview — this runs in your browser, not on-chain. It shows exactly
        how the live app behaves; the contract is being deployed on Arc (see build status).
      </div>
      <div className="app-grid">
        <div className="app-left">
          <Ring count={PREVIEW_MEMBERS.length} active={completed ? -1 : round} paidSet={paid} size={170} />
          <p className="ring-caption">
            {completed
              ? "Circle complete — everyone got their turn."
              : `Round ${round + 1} of ${PREVIEW_MEMBERS.length} · ${PREVIEW_MEMBERS[round]} collects next`}
          </p>
        </div>
        <div className="app-right">
          <h3>Demo circle · {PREVIEW_CONTRIB} USDC each</h3>
          <div className="member-list">
            {PREVIEW_MEMBERS.map((name, i) => (
              <div className="member-row" key={name}>
                <span className="member-name">
                  {name}
                  {i === round && !completed && <em className="turn-tag">collects this round</em>}
                </span>
                <span className="member-state">{completed ? "collected ✓" : paid.has(i) ? "paid ✓" : "owing"}</span>
                <button className="btn btn-small" disabled={completed || paid.has(i)} onClick={() => payIn(i)}>
                  Pay in
                </button>
              </div>
            ))}
          </div>
          <div className="pot-line">
            Pot this round: <strong>{PREVIEW_CONTRIB * PREVIEW_MEMBERS.length} USDC</strong>
            {completed && (
              <button className="btn btn-small btn-ghost-dark" onClick={reset}>
                Run it again
              </button>
            )}
          </div>
          {log.length > 0 && (
            <ul className="log">
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Live app (on-chain) ---------- */

function LiveApp() {
  const [account, setAccount] = useState("");
  const [circles, setCircles] = useState([]);
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [contribution, setContribution] = useState("2");
  const [membersText, setMembersText] = useState("");
  const busyRef = useRef(false);

  const loadCircles = useCallback(async () => {
    const c = readContract();
    const count = Number(await c.circleCount());
    const rows = [];
    for (let i = Math.max(0, count - 25); i < count; i++) {
      const g = await c.getCircle(i);
      rows.push({
        id: i,
        contribution: g.contribution,
        round: Number(g.round),
        memberCount: Number(g.memberCount),
        completed: g.completed,
      });
    }
    setCircles(rows.reverse());
  }, []);

  useEffect(() => {
    loadCircles().catch(() => setMsg("Could not reach the Arc RPC yet — try refresh."));
  }, [loadCircles]);

  async function connect() {
    try {
      const provider = await walletProvider();
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());
      setMsg("");
    } catch (e) {
      setMsg(e.shortMessage || e.message);
    }
  }

  async function openCircle(id) {
    setBusy(true);
    try {
      const c = readContract();
      const g = await c.getCircle(id);
      const members = await c.getMembers(id);
      const paidMap = {};
      if (!g.completed) {
        for (const m of members) paidMap[m] = await c.hasPaid(id, m);
      }
      const recipient = g.completed ? null : await c.currentRecipient(id);
      const pot = await c.potSize(id);
      setDetail({
        id,
        creator: g.creator,
        contribution: g.contribution,
        round: Number(g.round),
        paidCount: Number(g.paidCount),
        memberCount: Number(g.memberCount),
        completed: g.completed,
        members,
        paidMap,
        recipient,
        pot,
      });
    } catch (e) {
      setMsg(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function createCircle() {
    if (busyRef.current) return;
    const members = membersText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (members.some((m) => !ethers.isAddress(m))) {
      setMsg("Every member must be a valid wallet address, one per line.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const provider = await walletProvider();
      const signer = await provider.getSigner();
      const c = new ethers.Contract(CONTRACT_ADDRESS, TURNO_ABI, signer);
      setMsg("Creating the circle — confirm in your wallet…");
      const tx = await c.createCircle(members, parseUSDC(contribution));
      await tx.wait();
      setMsg("Circle created.");
      await loadCircles();
    } catch (e) {
      setMsg(e.shortMessage || e.message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function payIn() {
    if (!detail || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const provider = await walletProvider();
      const signer = await provider.getSigner();
      const me = await signer.getAddress();
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      const allowance = await usdc.allowance(me, CONTRACT_ADDRESS);
      if (allowance < detail.contribution) {
        setMsg("Step 1 of 2: approve USDC for the Turno contract…");
        const txA = await usdc.approve(CONTRACT_ADDRESS, detail.contribution);
        await txA.wait();
      }
      setMsg("Step 2 of 2: paying in your contribution…");
      const c = new ethers.Contract(CONTRACT_ADDRESS, TURNO_ABI, signer);
      const tx = await c.contribute(detail.id);
      const receipt = await tx.wait();
      setMsg(
        detail.paidCount + 1 === detail.memberCount
          ? `Paid in — and that completed the round, so the pot was paid out in the same transaction (${receipt.hash.slice(0, 10)}…).`
          : "Paid in. The pot pays out when everyone has contributed."
      );
      await openCircle(detail.id);
      await loadCircles();
    } catch (e) {
      setMsg(e.shortMessage || e.message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const myTurnPaid = detail && account ? detail.paidMap[account] : undefined;

  return (
    <div className="appbox">
      <div className="app-toolbar">
        <span className="live-badge">Live on {NETWORK.name}</span>
        {account ? (
          <span className="wallet-pill">{shortAddr(account)}</span>
        ) : (
          <button className="btn btn-lime btn-small" onClick={connect}>
            Connect wallet
          </button>
        )}
        <button className="btn btn-small btn-ghost-dark" onClick={() => loadCircles()}>
          Refresh
        </button>
      </div>

      <div className="app-grid">
        <div className="app-left">
          <h3>Start a circle</h3>
          <label className="field">
            Contribution (USDC, per member per round)
            <input value={contribution} onChange={(e) => setContribution(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            Member addresses, in payout order (one per line, 2–10)
            <textarea rows={5} value={membersText} onChange={(e) => setMembersText(e.target.value)} placeholder={"0x…\n0x…\n0x…"} />
          </label>
          <button className="btn btn-lime" disabled={busy || !account} onClick={createCircle}>
            {account ? "Create circle" : "Connect wallet to create"}
          </button>

          <h3 className="mt">Circles</h3>
          {circles.length === 0 && <p className="dim">No circles yet.</p>}
          <div className="circle-list">
            {circles.map((c) => (
              <button key={c.id} className="circle-row" onClick={() => openCircle(c.id)}>
                <span>Circle #{c.id}</span>
                <span>
                  {fmtUSDC(c.contribution)} USDC ·{" "}
                  {c.completed ? "complete" : `round ${c.round + 1} of ${c.memberCount}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="app-right">
          {!detail && <p className="dim">Pick a circle to see who has paid, whose turn it is, and to pay in.</p>}
          {detail && (
            <>
              <div className="detail-head">
                <Ring
                  count={detail.memberCount}
                  active={detail.completed ? -1 : detail.round}
                  paidSet={new Set(detail.members.map((m, i) => (detail.paidMap[m] ? i : -1)).filter((i) => i >= 0))}
                  size={120}
                />
                <div>
                  <h3>Circle #{detail.id}</h3>
                  <p>
                    {fmtUSDC(detail.contribution)} USDC each · Pot{" "}
                    <strong>{fmtUSDC(detail.pot)} USDC</strong>
                  </p>
                  <p>
                    {detail.completed
                      ? "Circle complete — everyone got their turn."
                      : `Round ${detail.round + 1} of ${detail.memberCount} · ${shortAddr(detail.recipient)} collects`}
                  </p>
                </div>
              </div>
              <div className="member-list">
                {detail.members.map((m, i) => (
                  <div className="member-row" key={m}>
                    <span className="member-name">
                      {shortAddr(m)}
                      {account && m.toLowerCase() === account.toLowerCase() && <em className="turn-tag">you</em>}
                      {!detail.completed && i === detail.round && <em className="turn-tag">collects this round</em>}
                    </span>
                    <span className="member-state">
                      {detail.completed ? "collected ✓" : detail.paidMap[m] ? "paid ✓" : "owing"}
                    </span>
                  </div>
                ))}
              </div>
              {!detail.completed && (
                <button className="btn btn-lime" disabled={busy || !account || myTurnPaid} onClick={payIn}>
                  {!account ? "Connect wallet to pay in" : myTurnPaid ? "You've paid this round" : `Pay in ${fmtUSDC(detail.contribution)} USDC`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {msg && <p className="app-msg">{msg}</p>}
    </div>
  );
}

/* ---------- Page ---------- */

export default function App() {
  return (
    <div className="page">
      <header className="header">
        <Logo />
        <nav>
          <a href="#how">How it works</a>
          <a href="#why">Why Turno</a>
          <a href="#status">Status</a>
          <a href="#app">App</a>
        </nav>
      </header>

      <Hero />
      <HowItWorks />
      <WhyTurno />

      <section className="section" id="app">
        <h2>{LIVE ? "Your circles" : "See it move"}</h2>
        {LIVE ? <LiveApp /> : <PreviewApp />}
      </section>

      <Status />

      <footer className="footer">
        <Logo />
        <div className="footer-links">
          <a href="https://github.com/ahmardchain/turno" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://dorahacks.io/hackathon/arc-microgrants-2/detail" target="_blank" rel="noreferrer">
            Arc Microgrants Round 2
          </a>
          <a href="https://docs.arc.io" target="_blank" rel="noreferrer">Arc docs</a>
          <a href={NETWORK.explorer} target="_blank" rel="noreferrer">Arc explorer</a>
        </div>
        <p className="footer-note">
          Turno is an experiment built for Arc Microgrants Round 2. Contracts are not
          audited — use small amounts. You keep full ownership of your circles; Turno
          takes no fee and cannot move your money.
        </p>
      </footer>
    </div>
  );
}

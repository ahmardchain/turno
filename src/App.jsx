import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  GitBranch,
  Globe,
  Link2,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Timer,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Marquee } from "@/components/magic/marquee";
import { DotPattern } from "@/components/magic/dot-pattern";
import { BorderBeam } from "@/components/magic/border-beam";
import { BlurFade } from "@/components/magic/blur-fade";
import { cn } from "@/lib/utils";
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

/* ---------------- Brand ring ---------------- */

function Ring({ count, active = -1, paidSet = new Set(), size = 120, dark = false }) {
  const c = 50;
  const r = 38;
  const dots = [];
  for (let i = 0; i < count; i++) {
    const ang = ((-90 + (360 / count) * i) * Math.PI) / 180;
    let cls = "dot";
    if (paidSet.has(i)) cls += " dot-paid";
    if (i === active) cls += " dot-active";
    dots.push(
      <circle key={i} cx={c + r * Math.cos(ang)} cy={c + r * Math.sin(ang)} r={i === active ? 7 : 5.5} className={cls} />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={dark ? "ring-on-dark" : undefined}>
      <circle cx={c} cy={c} r={r} className="ring-track" />
      {dots}
    </svg>
  );
}

function Logo() {
  return (
    <a href="#top" className="inline-flex items-center gap-2.5 no-underline">
      <Ring count={6} active={0} size={30} />
      <span className="text-[19px] font-extrabold tracking-[0.14em]">TURNO</span>
    </a>
  );
}

/* ---------------- Landing ---------------- */

const TRADITIONS = ["AJO", "ESUSU", "SUSU", "TONTINE", "HUI", "CHAMA", "KYE", "ADASHE", "PALUWAGAN", "EKUB", "PARTNER", "STOKVEL"];

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-14 text-paper sm:px-12 sm:py-[68px]">
      <DotPattern />
      <div className="absolute right-10 top-12 hidden animate-float lg:block">
        <Ring count={8} active={2} size={196} dark />
      </div>
      <div className="relative">
        <Badge variant="lime" className="mb-5 tracking-[0.14em] uppercase">
          A savings circle on Arc · USDC
        </Badge>
        <h1 className="mb-5 max-w-[640px] text-[clamp(46px,7.5vw,78px)] font-extrabold leading-[0.98] tracking-tight">
          Everyone gets
          <br />
          their <span className="text-lime">turn.</span>
        </h1>
        <p className="mb-8 max-w-[560px] text-lg leading-relaxed text-paper/75">
          Turno is an ajo / esusu savings circle where the <strong className="text-paper">smart contract holds the pot</strong> —
          not the organiser. Everyone pays in each round. The moment the last contribution lands, the full pot pays that
          round's member automatically, in the same transaction.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="lime" size="lg" asChild>
            <a href="#app">
              {LIVE ? "Open the app" : "Try the interactive preview"} <ArrowRight />
            </a>
          </Button>
          <Button variant="ghostDark" size="lg" asChild>
            <a href="https://github.com/ahmardchain/turno" target="_blank" rel="noreferrer">
              <GitBranch /> Read the code
            </a>
          </Button>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-paper/60">
          <span className="inline-flex items-center gap-2"><Users className="size-4 text-lime" /> 2–10 members per circle</span>
          <span className="inline-flex items-center gap-2"><Zap className="size-4 text-lime" /> Payout fires automatically</span>
          <span className="inline-flex items-center gap-2"><CircleDollarSign className="size-4 text-lime" /> Zero fees, ever</span>
          <span className="inline-flex items-center gap-2"><Timer className="size-4 text-lime" /> Sub-second settlement on Arc</span>
        </div>
        <p className="mt-7 text-[13.5px] text-paper/45">
          {LIVE ? (
            <>
              Live on {NETWORK.name} · Contract{" "}
              <a className="text-lime underline" href={`${NETWORK.explorer}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
                {shortAddr(CONTRACT_ADDRESS)}
              </a>
            </>
          ) : (
            "Contract deployment in progress — the app below is an interactive preview, clearly labelled. Nothing here moves real money yet."
          )}
        </p>
      </div>
    </section>
  );
}

function TraditionMarquee() {
  return (
    <div className="border-b border-line py-5" aria-hidden="true">
      <Marquee>
        {TRADITIONS.map((name) => (
          <span key={name} className="inline-flex items-center gap-11 text-[15px] font-extrabold tracking-[0.22em] text-ink/45">
            {name} <span className="size-2 rounded-full bg-lime ring-1 ring-ink/60" />
          </span>
        ))}
      </Marquee>
      <p className="mt-3 text-center text-[13px] text-muted">One practice, a hundred names. Turno is the version where nobody holds the pot.</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, sub }) {
  return (
    <div className="mb-8">
      <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
      <h2 className="text-[clamp(28px,4vw,38px)] font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="mt-3 max-w-[640px] text-[17px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Users, t: "Start a circle", d: "Pick a contribution — say 5 USDC — and list 2–10 members in payout order. That order is fixed on-chain for the whole circle." },
    { icon: PiggyBank, t: "Everyone pays in", d: "Each round, every member pays their contribution into the contract. The app shows who has paid and who is still owing." },
    { icon: Zap, t: "The pot pays itself out", d: "The final contribution triggers the payout automatically — the full pot goes to this round's member in the same transaction. No button, no admin, no delay." },
  ];
  return (
    <section className="pt-16" id="how">
      <BlurFade>
        <SectionHeading eyebrow="How it works" title="Three steps. No middleman." />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.t} className="transition-transform duration-200 hover:-translate-y-1">
              <CardHeader>
                <span className="mb-3.5 inline-flex size-11 items-center justify-center rounded-full bg-lime ring-1 ring-ink/70">
                  <s.icon className="size-5" />
                </span>
                <CardTitle>
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {s.t}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted">{s.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </BlurFade>
    </section>
  );
}

function WhyTurno() {
  return (
    <section className="pt-16" id="why">
      <BlurFade>
        <SectionHeading
          eyebrow="Why Turno"
          title="The holder was always the risk"
          sub="Savings circles run on trust, and they break in one place: whoever holds the money. Organisers abscond. Ledgers get argued over. Payouts get delayed."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-ink bg-ink-soft text-paper md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lime">The contract holds the pot</CardTitle>
              <CardDescription className="text-paper/60">
                Not the organiser, not a company, not an account someone can empty.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.14em] text-paper/40">Savings apps today</p>
                  <ul className="space-y-2 text-[15px] leading-relaxed text-paper/65">
                    <li>Track contributions — the money still sits with a person</li>
                    <li>Or a custodian holds funds, one currency, one country</li>
                    <li>Payout happens when an admin decides</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.14em] text-lime">Turno</p>
                  <ul className="space-y-2 text-[15px] leading-relaxed text-paper/90">
                    <li>The contract custodies the pot for the round</li>
                    <li>Payout is code — it fires in the final contribution tx</li>
                    <li>No owner, no admin, no withdrawal function at all</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-lime ring-1 ring-ink/70">
                <ShieldCheck className="size-5" />
              </span>
              <CardTitle>Nothing to compromise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted">
                No admin key exists, so no admin key can be stolen, abused or pressured. The code only knows one way
                money leaves: to the member whose turn it is.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-lime ring-1 ring-ink/70">
                <Link2 className="size-5" />
              </span>
              <CardTitle>Proof, not screenshots</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted">
                Every contribution and payout is a public transaction on the Arc explorer. "I sent it" stops being an
                argument.
              </p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-lime ring-1 ring-ink/70">
                <Globe className="size-5" />
              </span>
              <CardTitle>One circle, any country</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="max-w-[560px] leading-relaxed text-muted">
                Circles settle in USDC on Arc, so a trader in Lagos and her sister in London are in the same circle —
                same pot, same order, no FX desk or transfer rail in between.
              </p>
            </CardContent>
          </Card>
        </div>
      </BlurFade>
    </section>
  );
}

function Status() {
  const rows = [
    ["Brand, product spec and reference contract", true],
    ["Contract logic-tested locally (full 3-member cycle, payouts, reverts)", true],
    ["This app, documentation and public repo", true],
    ["Hosted on Vercel, linked to GitHub", true],
    ["Contract + app built in Arc Studio, testnet rehearsal", false],
    ["Mainnet deployment and live demo circle with real USDC", false],
    ["DoraHacks submission — Arc Microgrants Round 2 (closes Sun Nov 1, 2026)", false],
  ];
  const doneCount = rows.filter(([, d]) => d).length;
  return (
    <section className="pt-16" id="status">
      <BlurFade>
        <SectionHeading eyebrow="Status" title="Build status" />
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-paper-dim">
              <div className="h-full rounded-full bg-lime ring-1 ring-ink/40 transition-all" style={{ width: `${(doneCount / rows.length) * 100}%` }} />
            </div>
            <p className="mb-4 text-sm font-bold text-muted">
              {doneCount} of {rows.length} done
            </p>
            <div className="divide-y divide-paper-dim">
              {rows.map(([label, done]) => (
                <div key={label} className="flex items-center gap-3 py-3">
                  {done ? <CheckCircle2 className="size-5 shrink-0 text-ink" fill="#c8f169" /> : <Circle className="size-5 shrink-0 text-line" />}
                  <span className={cn(done ? "text-ink" : "text-muted")}>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </section>
  );
}

/* ---------------- Preview simulator ---------------- */

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
    const entries = [`${PREVIEW_MEMBERS[i]} paid in ${PREVIEW_CONTRIB} USDC — round ${round + 1}`];
    if (next.size === PREVIEW_MEMBERS.length) {
      entries.push(
        `✓ Pot of ${PREVIEW_CONTRIB * PREVIEW_MEMBERS.length} USDC paid automatically to ${PREVIEW_MEMBERS[round]} — same transaction, no admin`
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
    <div>
      <Alert variant="warm" className="mb-6">
        <strong>Interactive preview.</strong> This runs in your browser, not on-chain — it shows exactly how the live
        app behaves. The contract is being deployed on Arc; see build status below.
      </Alert>
      <div className="grid gap-8 md:grid-cols-[270px_1fr]">
        <div className="flex flex-col items-center text-center">
          <Ring count={PREVIEW_MEMBERS.length} active={completed ? -1 : round} paidSet={paid} size={176} />
          <p className="mt-4 max-w-[230px] leading-relaxed text-muted">
            {completed ? (
              <strong className="text-ink">Circle complete — everyone got their turn.</strong>
            ) : (
              <>
                Round {round + 1} of {PREVIEW_MEMBERS.length} · <strong className="text-ink">{PREVIEW_MEMBERS[round]}</strong> collects
              </>
            )}
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-extrabold">Demo circle · {PREVIEW_CONTRIB} USDC each</h3>
          <div className="space-y-2.5">
            {PREVIEW_MEMBERS.map((name, i) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3">
                <span className="inline-flex items-center gap-2 font-bold">
                  {name}
                  {i === round && !completed && <Badge variant="lime">collects this round</Badge>}
                </span>
                <span className="ml-auto text-sm whitespace-nowrap text-muted">
                  {completed ? "collected ✓" : paid.has(i) ? "paid ✓" : "owing"}
                </span>
                <Button size="sm" disabled={completed || paid.has(i)} onClick={() => payIn(i)}>
                  Pay in
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-4 text-base">
            Pot this round: <strong className="tnum">{PREVIEW_CONTRIB * PREVIEW_MEMBERS.length} USDC</strong>
            {completed && (
              <Button size="sm" variant="outline" onClick={reset}>
                <RefreshCw /> Run it again
              </Button>
            )}
          </p>
          {log.length > 0 && (
            <ul className="mt-5 space-y-1.5 rounded-xl bg-ink px-5 py-4 text-[13.5px] leading-relaxed text-paper/80">
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

/* ---------------- Live on-chain app ---------------- */

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
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <Badge variant="lime">Live on {NETWORK.name}</Badge>
        {account ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[13.5px] font-bold text-lime">
            <Wallet className="size-4" /> {shortAddr(account)}
          </span>
        ) : (
          <Button variant="lime" size="sm" onClick={connect}>
            <Wallet /> Connect wallet
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => loadCircles()}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      <div className="grid gap-9 md:grid-cols-[320px_1fr]">
        <div>
          <h3 className="mb-4 text-lg font-extrabold">Start a circle</h3>
          <label className="mb-4 block text-sm font-bold">
            Contribution (USDC, per member per round)
            <Input className="mt-1.5 font-normal" value={contribution} onChange={(e) => setContribution(e.target.value)} inputMode="decimal" />
          </label>
          <label className="mb-4 block text-sm font-bold">
            Member addresses, in payout order (one per line, 2–10)
            <Textarea className="mt-1.5 font-normal" rows={5} value={membersText} onChange={(e) => setMembersText(e.target.value)} placeholder={"0x…\n0x…\n0x…"} />
          </label>
          <Button variant="lime" disabled={busy || !account} onClick={createCircle}>
            {account ? "Create circle" : "Connect wallet to create"}
          </Button>

          <h3 className="mb-3 mt-8 text-lg font-extrabold">Circles</h3>
          {circles.length === 0 && <p className="text-muted">No circles yet.</p>}
          <div className="space-y-2">
            {circles.map((c) => (
              <button
                key={c.id}
                onClick={() => openCircle(c.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-left text-[14.5px] transition-colors hover:border-ink"
              >
                <span className="font-bold">Circle #{c.id}</span>
                <span className="tnum text-muted">
                  {fmtUSDC(c.contribution)} USDC · {c.completed ? "complete" : `round ${c.round + 1} of ${c.memberCount}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {!detail && <p className="text-muted">Pick a circle to see who has paid, whose turn it is, and to pay in.</p>}
          {detail && (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-5">
                <Ring
                  count={detail.memberCount}
                  active={detail.completed ? -1 : detail.round}
                  paidSet={new Set(detail.members.map((m, i) => (detail.paidMap[m] ? i : -1)).filter((i) => i >= 0))}
                  size={118}
                />
                <div>
                  <h3 className="text-lg font-extrabold">Circle #{detail.id}</h3>
                  <p className="tnum mt-1 text-muted">
                    {fmtUSDC(detail.contribution)} USDC each · Pot <strong className="text-ink">{fmtUSDC(detail.pot)} USDC</strong>
                  </p>
                  <p className="mt-1 text-muted">
                    {detail.completed
                      ? "Circle complete — everyone got their turn."
                      : `Round ${detail.round + 1} of ${detail.memberCount} · ${shortAddr(detail.recipient)} collects`}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {detail.members.map((m, i) => (
                  <div key={m} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-bold">
                      {shortAddr(m)}
                      {account && m.toLowerCase() === account.toLowerCase() && <Badge variant="lime">you</Badge>}
                      {!detail.completed && i === detail.round && <Badge variant="lime">collects this round</Badge>}
                    </span>
                    <span className="ml-auto text-sm text-muted">{detail.completed ? "collected ✓" : detail.paidMap[m] ? "paid ✓" : "owing"}</span>
                  </div>
                ))}
              </div>
              {!detail.completed && (
                <Button variant="lime" className="mt-5" disabled={busy || !account || myTurnPaid} onClick={payIn}>
                  {!account ? "Connect wallet to pay in" : myTurnPaid ? "You've paid this round" : `Pay in ${fmtUSDC(detail.contribution)} USDC`}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {msg && (
        <Alert variant="warm" className="mt-6">
          {msg}
        </Alert>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function App() {
  return (
    <div id="top" className="mx-auto max-w-[1080px] px-5 pb-20">
      <header className="sticky top-0 z-40 -mx-5 border-b border-line/70 bg-paper/85 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-6 text-[15px] text-muted sm:flex">
            <a className="transition-colors hover:text-ink" href="#how">How it works</a>
            <a className="transition-colors hover:text-ink" href="#why">Why Turno</a>
            <a className="transition-colors hover:text-ink" href="#status">Status</a>
            <Button variant="lime" size="sm" asChild>
              <a href="#app">Open app</a>
            </Button>
          </nav>
        </div>
      </header>

      <div className="pt-6">
        <Hero />
      </div>
      <TraditionMarquee />
      <HowItWorks />
      <WhyTurno />

      <section className="pt-16" id="app">
        <BlurFade>
          <SectionHeading eyebrow="The app" title={LIVE ? "Your circles" : "See it move"} />
          <div className="relative rounded-[22px]">
            <Card className="rounded-[22px] p-6 sm:p-8">
              {LIVE ? <LiveApp /> : <PreviewApp />}
            </Card>
            <BorderBeam />
          </div>
        </BlurFade>
      </section>

      <Status />

      <footer className="mt-[70px] border-t border-line pt-7">
        <Logo />
        <div className="my-4 flex flex-wrap gap-5 text-[15px] font-bold">
          <a className="hover:underline" href="https://github.com/ahmardchain/turno" target="_blank" rel="noreferrer">GitHub</a>
          <a className="hover:underline" href="https://dorahacks.io/hackathon/arc-microgrants-2/detail" target="_blank" rel="noreferrer">
            Arc Microgrants Round 2
          </a>
          <a className="hover:underline" href="https://docs.arc.io" target="_blank" rel="noreferrer">Arc docs</a>
          <a className="hover:underline" href={NETWORK.explorer} target="_blank" rel="noreferrer">Arc explorer</a>
        </div>
        <p className="max-w-[640px] text-[13.5px] leading-relaxed text-muted">
          Turno is an experiment built for Arc Microgrants Round 2. Contracts are not audited — use small amounts.
          You keep full ownership of your circles; Turno takes no fee and cannot move your money.
        </p>
      </footer>
    </div>
  );
}

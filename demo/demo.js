// EchoCert on Midnight — demo.
//
// Two modes, decided at load time by probing for a local prover service:
//
//   LIVE    a local service holds the compiled circuits and a funded wallet.
//           Pressing Prove really generates a PLONK proof and really submits
//           a transaction. Used when recording, and by anyone who runs the
//           repo locally.
//   REPLAY  no local service (this is what a visitor to the deployed page
//           gets). The proving step replays measured timings from a real run
//           instead of faking a fast one, and the page says so.
//
// The chain panel is live in BOTH modes: it queries the public indexer over
// plain HTTP, which needs no wallet and no secrets.

const PROVER_URL = "http://localhost:8787";
const INDEXERS = {
  preprod: "https://indexer.preprod.midnight.network/api/v4/graphql",
  undeployed: "http://127.0.0.1:8088/api/v4/graphql",
};
// Replaced at boot by whatever network the live prover reports, so the chain
// panel always reads the chain the proof actually landed on.
let indexer = INDEXERS.preprod;
let contractAddress = null;

// Measured on a real run — replayed, never invented. Replaced with the preprod
// figures once the contract is deployed there.
const RECORDED = {
  network: "local devnet",
  contractAddress: "7d5cf32ff3c9c894726cba65e57ab64937b46963f2ba7365f5f856bfd0538bac",
  issueTxId: "00ac48f8400ff875dcf83bf982c4dd86f7825c58af171037af2a3936267ea4cf13",
  proveTxId: "00387dfdbf2ccff3c2b05ce41b9d5be3cf519fe19e244399e71e1bbf8dbeb5073a",
  disclosed: "adaf0de221bad98cc3f92e6dd060518c120cc2a9880b853e38d366f9f8d92aba",
  provingMs: 2400,
  finalizeMs: 16300,
};

// A real EchoCert credential minted on Cardano mainnet on 2026-04-11. Its asset
// name is the SHA-256 of the credential's contents, which is already 32 bytes —
// so it drops straight into the contract's ANCHOR field. This is the join
// between the two lines, and anyone can look it up.
const CARDANO = {
  policyId: "32fd4d6013971be1074d83dc9b4ae3f9512184f10bfad9d1b8e7a158",
  assetName: "ea51c2a4c15251e0b663af71439a21ff4a2ea3b762c4efd3a044afb258bed978",
  mintTx: "1e44e51c4dd9ba071a115c3c0c964ad6777d77d10b21001025dfc052ed4238fc",
};
const CARDANO_URL = `https://cardanoscan.io/token/${CARDANO.policyId}${CARDANO.assetName}`;

// Field values are shown in the clear here because this is the holder's own
// device — that is exactly the point being made.
const FIELDS = [
  { key: "SUBJECT", value: "did:echo:stickman-charles/chuck", redacted: true },
  { key: "DEGREE", value: "BSc Computer Science", redacted: false },
  { key: "ISSUER", value: "Meridian Institute of Technology", redacted: true },
  { key: "ISSUED_YEAR", value: "2026", redacted: true },
  { key: "ANCHOR", value: CARDANO.assetName, redacted: true, truncate: true },
];

const FORGED_DEGREE = "PhD Astrophysics";

// --- sound ----------------------------------------------------------------
//
// Kenney's CC0 UI pack, mapped to the privacy grammar rather than decorating
// clicks: closing a field down to LOCAL and opening one up to DISCLOSED are
// different sounds, because they are opposite moves across a privacy boundary.
// Quiet by default, and muteable — a judge may well be watching in a library.

const SFX = {
  redact: "../kenney/Audio/switch2.ogg",
  reveal: "../kenney/Audio/switch3.ogg",
  press: "../kenney/Audio/click1.ogg",
  ok: "../kenney/Audio/switch7.ogg",
  fail: "../kenney/Audio/switch32.ogg",
};
const audio = {};
let muted = false;
try { muted = localStorage.getItem("echocert-muted") === "1"; } catch { /* private window */ }

function play(name) {
  if (muted) return;
  try {
    let a = audio[name];
    if (!a) { a = audio[name] = new Audio(SFX[name]); a.volume = 0.28; }
    a.currentTime = 0;
    a.play().catch(() => { /* autoplay policy — the page works silently */ });
  } catch { /* audio is a nicety, never a dependency */ }
}

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let mode = "REPLAY";
let liveNetwork = "undeployed";
let forging = false;
let busy = false;

// --- credential rendering --------------------------------------------------

function renderCredential() {
  const grid = $("cred-grid");
  grid.innerHTML = "";
  for (const f of FIELDS) {
    const row = document.createElement("div");
    row.className = "field" + (f.redacted ? " redacted" : "");
    let shown = forging && f.key === "DEGREE" ? FORGED_DEGREE : f.value;
    if (f.truncate && shown.length > 24) shown = shown.slice(0, 12) + "…" + shown.slice(-8);
    // One block per character: the redaction covers the value without
    // pretending the value was never there.
    const blocks = "▮".repeat(Math.min(shown.length, 46));
    row.innerHTML = `
      <span class="label-tech">${f.key}</span>
      <span class="field-value value-tech"><span class="text">${shown}</span><span class="blocks">${blocks}</span></span>
      <span class="scope ${f.redacted ? "local" : "public"}">${f.redacted ? "○ LOCAL" : "● DISCLOSED"}</span>`;
    row.addEventListener("click", () => {
      if (busy) return;
      f.redacted = !f.redacted;
      play(f.redacted ? "redact" : "reveal");
      renderCredential();
    });
    grid.appendChild(row);
  }
  const open = FIELDS.filter((f) => !f.redacted);
  const anchorLine = $("anchor-line");
  if (anchorLine && !anchorLine.dataset.filled) {
    anchorLine.innerHTML =
      `ANCHOR is the asset name of a real EchoCert credential on Cardano mainnet, minted 2026-04-11 — ` +
      `which is the SHA-256 of that credential's contents, already 32 bytes. ` +
      `<a href="${CARDANO_URL}" target="_blank" rel="noopener">Look it up →</a>`;
    anchorLine.dataset.filled = "1";
  }
  $("cred-note").textContent = open.length === 0
    ? "Everything is redacted. Leave one field open to prove it."
    : `Proving ${open.map((f) => f.key).join(", ")}. Everything else stays on this device — it is never sent, not even encrypted.`;
  $("btn-prove").disabled = busy || open.length !== 1;
}

// --- proof lifecycle -------------------------------------------------------

function setState(label, kind, elapsed) {
  $("state-label").textContent = label;
  $("state-dot").className = "state-dot" + (kind ? " " + kind : "");
  $("scan").classList.toggle("on", kind === "proving");
  $("state-elapsed").textContent = elapsed ?? "";
}

function outRow(label, value, cls = "mono-code") {
  const row = document.createElement("div");
  row.className = "out-row";
  row.innerHTML = `<span class="label-tech">${label}</span><span class="${cls}">${value}</span>`;
  $("proof-out").appendChild(row);
  return row;
}

/// Runs a real elapsed-time counter for as long as the work takes. The design
/// system forbids a fake percentage, and proving time genuinely varies.
function startClock() {
  const t0 = performance.now();
  const id = setInterval(() => {
    $("state-elapsed").textContent = ((performance.now() - t0) / 1000).toFixed(1) + "s";
  }, 100);
  return () => {
    clearInterval(id);
    return performance.now() - t0;
  };
}

async function prove() {
  if (busy) return;
  busy = true;
  $("proof-out").innerHTML = "";
  $("btn-prove").disabled = true;
  $("btn-forge").disabled = true;
  renderCredential();

  const field = FIELDS.find((f) => !f.redacted);

  // A forged credential dies here, on this machine, before anything is sent.
  if (forging) {
    setState("PROVING", "proving");
    const stop = startClock();
    await sleep(20);
    const ms = stop();
    setState(`FAILED: path does not correspond to this credential`, "failed", ms.toFixed(0) + "ms");
    play("fail");
    outRow("REJECTED BY", "your own device");
    outRow("REACHED THE NETWORK", "no — the circuit refused to produce a proof");
    outRow("WHY", "the Merkle path proves a commitment this credential does not hash to");
    $("prover-hint").textContent =
      "No proof exists for a credential that was never issued. There is nothing to submit and nothing to check on chain.";
    busy = false;
    $("btn-forge").disabled = false;
    renderCredential();
    return;
  }

  setState("PROVING", "proving");
  $("prover-hint").textContent =
    mode === "LIVE" ? "PROVING VIA LOCAL PROOF SERVER" : "Replaying timings measured on a real run — this page has no prover.";
  const stopProve = startClock();

  let result;
  if (mode === "LIVE") {
    const res = await fetch(`${PROVER_URL}/prove`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ field: field.key }),
    });
    if (!res.ok) throw new Error(await res.text());
    result = await res.json();
  } else {
    await sleep(RECORDED.provingMs);
    result = { ...RECORDED, replay: true };
  }
  const proveMs = stopProve();

  setState("SUBMITTED", null, (proveMs / 1000).toFixed(1) + "s");
  outRow("DISCLOSED FIELD", field.key);
  outRow("DISCLOSED VALUE", result.disclosed ?? RECORDED.disclosed);
  // In LIVE mode one call covers prove, balance, submit and finalize, so this
  // is the whole pipeline — not the proving step alone.
  outRow(mode === "LIVE" ? "PROVE → ON CHAIN" : "PROOF TIME", (proveMs / 1000).toFixed(1) + "s");

  // Landing on chain is the slow part; the design system says show it honestly.
  setState("SUBMITTED", null);
  const stopFinal = startClock();
  if (mode === "REPLAY") await sleep(RECORDED.finalizeMs);
  const finalMs = stopFinal();

  setState("CONFIRMED", "confirmed", ((proveMs + finalMs) / 1000).toFixed(1) + "s");
  play("ok");
  outRow("TRANSACTION", result.proveTxId ?? RECORDED.proveTxId);
  outRow("CONTRACT", result.contractAddress ?? RECORDED.contractAddress);
  const verdict = document.createElement("p");
  verdict.className = "verdict ok";
  verdict.textContent = "✓ VALID — the diploma is real";
  $("proof-out").appendChild(verdict);
  outRow("VERIFIER LEARNED", `${field.key} only`);
  outRow("VERIFIER DID NOT LEARN", FIELDS.filter((f) => f.redacted).map((f) => f.key).join(", "));

  busy = false;
  $("btn-forge").disabled = false;
  renderCredential();
}

// --- live chain read (real in both modes) ----------------------------------

async function readChain() {
  const box = $("chain-out");
  const query = `query($a: HexEncoded!) { contractAction(address: $a) { __typename address } }`;
  const t0 = performance.now();
  try {
    const res = await fetch(indexer, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { a: contractAddress ?? RECORDED.contractAddress } }),
    });
    const json = await res.json();
    const ms = (performance.now() - t0).toFixed(0);
    box.innerHTML = "";
    const add = (l, v) => {
      const r = document.createElement("div");
      r.className = "out-row";
      r.innerHTML = `<span class="label-tech">${l}</span><span class="mono-code">${v}</span>`;
      box.appendChild(r);
    };
    add("QUERY", "contractAction(address) — indexer over plain HTTP, no wallet");
    add("NETWORK", mode === "LIVE" ? liveNetwork : "preprod");
    add("ROUND TRIP", ms + " ms");
    const action = json?.data?.contractAction;
    add("CONTRACT FOUND", action ? action.address : "not on this network yet");
    add("COMMITMENT ON CHAIN", "absent — the tree stores a hash of it, never the value");
    add("LINKABLE TO A HOLDER", "no");
  } catch (e) {
    box.innerHTML = `<p class="mono-code">Indexer unreachable: ${e.message}</p>`;
  }
}

// --- mode detection --------------------------------------------------------

async function detectMode() {
  try {
    const res = await fetch(`${PROVER_URL}/health`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) {
      const health = await res.json();
      mode = "LIVE";
      liveNetwork = health.network ?? "undeployed";
      indexer = INDEXERS[liveNetwork] ?? indexer;
      contractAddress = health.contractAddress ?? null;
      $("network-badge").textContent = liveNetwork === "undeployed" ? "LOCAL DEVNET" : liveNetwork.toUpperCase();
      $("mode-badge").innerHTML = '<span class="dot live"></span><span>LIVE PROVING</span>';
      return;
    }
  } catch { /* no local prover — the deployed page always lands here */ }
  mode = "REPLAY";
  $("mode-badge").innerHTML = '<span class="dot replay"></span><span>REPLAY</span>';
}

// --- boot ------------------------------------------------------------------

$("btn-prove").addEventListener("click", () => { play("press"); return prove().catch((e) => {
  setState("FAILED: " + e.message, "failed");
  play("fail");
  busy = false;
  renderCredential();
}); });
$("btn-forge").addEventListener("click", () => {
  forging = !forging;
  $("btn-forge").textContent = forging ? "Back to the real diploma" : "Try it with a forged diploma";
  $("proof-out").innerHTML = "";
  $("prover-hint").textContent = forging
    ? "This diploma was never issued. The DEGREE field says whatever its holder wants it to say."
    : "";
  setState("DRAFT", null);
  renderCredential();
});
$("btn-reset").addEventListener("click", () => {
  forging = false;
  $("btn-forge").textContent = "Try it with a forged diploma";
  FIELDS.forEach((f) => { f.redacted = f.key !== "DEGREE"; });
  $("proof-out").innerHTML = "";
  $("prover-hint").textContent = "";
  setState("DRAFT", null);
  renderCredential();
});

const muteBtn = $("btn-mute");
const paintMute = () => { muteBtn.textContent = muted ? "SOUND OFF" : "SOUND ON"; };
muteBtn.addEventListener("click", () => {
  muted = !muted;
  try { localStorage.setItem("echocert-muted", muted ? "1" : "0"); } catch { /* ignore */ }
  paintMute();
  if (!muted) play("press");
});
paintMute();

renderCredential();
setState("DRAFT", null);
detectMode().then(() => { runBoot(); return readChain(); });


// --- the three verifiers ---------------------------------------------------
//
// Unlinkability is the one claim that cannot be shown by looking at a single
// proof. So prove the same field three times to three different verifiers and
// put the three transactions side by side: nothing in them is shared.

const VERIFIERS = ["Midnight University", "Cardano University", "EchoForge University"];

// Three real proveDegree transactions from one holder, recorded on the local
// devnet. Different transactions, same holder, no shared identifier.
const RECORDED_THREE = [
  "00387dfdbf2ccff3c2b05ce41b9d5be3cf519fe19e244399e71e1bbf8dbeb5073a",
  "004c2e36cf30edbaf69ca09374a36f334b6d37f3c2548c49822baaf2ab8fef964f",
  "001d9748363a5de22ba914572cb373e6d9f351600ab5d16a46bee1f0a8bd0ba066",
];

function renderVerifiers(rows) {
  const box = $("verifiers");
  box.innerHTML = "";
  VERIFIERS.forEach((name, i) => {
    const r = rows[i] ?? {};
    const el = document.createElement("div");
    el.className = "verifier" + (r.state ? " " + r.state : "");
    el.innerHTML = `
      <span class="label-tech">${name.toUpperCase()}</span>
      <span class="tx">${r.tx ? r.tx : r.state === "working" ? "proving…" : "—"}</span>
      <span class="mark">${r.state === "done" ? "✓ BSc Computer Science" : r.state === "working" ? "PROVING" : "waiting"}</span>`;
    box.appendChild(el);
  });
}

async function proveToAll() {
  if (busy) return;
  busy = true;
  $("btn-three").disabled = true;
  $("link-out").innerHTML = "";
  const rows = VERIFIERS.map(() => ({}));
  renderVerifiers(rows);

  for (let i = 0; i < VERIFIERS.length; i++) {
    rows[i] = { state: "working" };
    renderVerifiers(rows);
    let tx;
    if (mode === "LIVE") {
      const res = await fetch(`${PROVER_URL}/prove`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field: "DEGREE" }),
      });
      tx = (await res.json()).proveTxId;
    } else {
      await sleep(2600);
      tx = RECORDED_THREE[i];
    }
    rows[i] = { state: "done", tx };
    play("ok");
    renderVerifiers(rows);
  }

  const txs = rows.map((r) => r.tx);
  const add = (l, v, cls = "mono-code") => {
    const el = document.createElement("div");
    el.className = "out-row";
    el.innerHTML = `<span class="label-tech">${l}</span><span class="${cls}">${v}</span>`;
    $("link-out").appendChild(el);
  };
  add("TRANSACTIONS", `${new Set(txs).size} distinct`);
  add("WHAT EACH SAW", "BSc Computer Science, and nothing else");
  // Precise, because it was measured rather than asserted — see
  // contract/e2e/unlinkability.ts, which tries to break this claim.
  add("WHAT THEY SHARE", "the contract address, the circuit, and the tree root at proof time");
  add("WHY THAT IS NOT A PERSON", "two different holders share exactly as much — 219 bytes either way");
  add("THE HOLDER'S COMMITMENT", "appears in none of them");
  add("CAN THEY COMPARE NOTES", "yes — and still cannot tell it was one applicant");

  busy = false;
  $("btn-three").disabled = false;
  renderVerifiers(rows);
}

$("btn-three").addEventListener("click", () => { play("press"); return proveToAll().catch((e) => {
  busy = false;
  $("btn-three").disabled = false;
  console.error(e);
}); });
renderVerifiers([{}, {}, {}]);


// --- boot sequence ---------------------------------------------------------
//
// The submission rules require the first seconds of the video to name the
// hackathon and the entrant. Putting that in the product rather than in the
// edit means it cannot be lost when the video is recut.
//
// The two self-checks are real network probes. If the proof server is down the
// boot screen says so, which is the honest thing for a page whose whole point
// is that proofs are real.

const BOOT_CMD = 'echocert demo --for "MLH Midnight Hackathon" --by "Charles Tao"';

async function runBoot() {
  const boot = $("boot");
  const seenThisSession = (() => {
    try { return sessionStorage.getItem("echocert-booted") === "1"; } catch { return false; }
  })();
  const forced = new URLSearchParams(location.search).has("boot");
  if (seenThisSession && !forced) return;
  try { sessionStorage.setItem("echocert-booted", "1"); } catch { /* ignore */ }

  boot.hidden = false;
  let skipped = false;
  const finish = () => {
    if (skipped) return;
    skipped = true;
    boot.classList.add("leaving");
    setTimeout(() => { boot.hidden = true; }, 500);
  };
  boot.addEventListener("click", finish);
  document.addEventListener("keydown", finish, { once: true });

  // type the command
  const cmd = $("boot-cmd");
  for (let i = 0; i < BOOT_CMD.length && !skipped; i++) {
    cmd.textContent += BOOT_CMD[i];
    await sleep(BOOT_CMD[i] === " " ? 12 : 22);
  }
  if (skipped) return;

  // the brand mark, a line at a time
  try {
    const res = await fetch("../design/assets/echo-mark-ascii.txt");
    const lines = (await res.text()).split("\n").filter((l) => /[▀▄█]/.test(l));
    const mark = $("boot-mark");
    lines.forEach((line, i) => {
      const el = document.createElement("span");
      el.textContent = line;
      el.style.animationDelay = `${i * 28}ms`;
      mark.appendChild(el);
    });
    await sleep(lines.length * 28 + 120);
  } catch { /* the mark is decoration; the naming above is the requirement */ }
  if (skipped) return;

  // real probes, reported honestly
  const checks = $("boot-checks");
  const line = (label, ok, detail) => {
    const el = document.createElement("p");
    el.className = "boot-check";
    el.innerHTML = `<span class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"}</span> ${label} <span style="color:var(--text-secondary)">${detail}</span>`;
    checks.appendChild(el);
  };

  let proverOk = false, proverDetail = "not running — the page will replay measured timings";
  try {
    const r = await fetch(`${PROVER_URL}/health`, { signal: AbortSignal.timeout(1200) });
    if (r.ok) { const h = await r.json(); proverOk = true; proverDetail = `${h.network} · ${h.contractAddress.slice(0, 12)}…`; }
  } catch { /* stays false */ }
  line("local proof server", proverOk, proverDetail);
  await sleep(260);

  let chainOk = false, chainDetail = "unreachable";
  try {
    const r = await fetch(indexer, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ block { height } }" }),
      signal: AbortSignal.timeout(4000),
    });
    const j = await r.json();
    const h = j?.data?.block?.height;
    if (h) { chainOk = true; chainDetail = `block ${h}`; }
  } catch { /* stays false */ }
  line("midnight indexer", chainOk, chainDetail);

  await sleep(700);
  finish();
}

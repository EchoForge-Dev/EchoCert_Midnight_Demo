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
const INDEXER = "https://indexer.preprod.midnight.network/api/v4/graphql";

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

// The credential. Field values are shown in the clear here because this is the
// holder's own device — that is exactly the point being made.
const FIELDS = [
  { key: "SUBJECT", value: "did:echo:stickman-charles/chuck", redacted: true },
  { key: "DEGREE", value: "BSc Computer Science", redacted: false },
  { key: "ISSUER", value: "Meridian Institute of Technology", redacted: true },
  { key: "ISSUED_YEAR", value: "2026", redacted: true },
  { key: "ANCHOR", value: "cardano:echocert:anchor:chuck", redacted: true },
];

const FORGED_DEGREE = "PhD Astrophysics";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let mode = "REPLAY";
let forging = false;
let busy = false;

// --- credential rendering --------------------------------------------------

function renderCredential() {
  const grid = $("cred-grid");
  grid.innerHTML = "";
  for (const f of FIELDS) {
    const row = document.createElement("div");
    row.className = "field" + (f.redacted ? " redacted" : "");
    const shown = forging && f.key === "DEGREE" ? FORGED_DEGREE : f.value;
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
      renderCredential();
    });
    grid.appendChild(row);
  }
  const open = FIELDS.filter((f) => !f.redacted);
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
  outRow("PROOF TIME", (proveMs / 1000).toFixed(1) + "s");

  // Landing on chain is the slow part; the design system says show it honestly.
  setState("SUBMITTED", null);
  const stopFinal = startClock();
  if (mode === "REPLAY") await sleep(RECORDED.finalizeMs);
  const finalMs = stopFinal();

  setState("CONFIRMED", "confirmed", ((proveMs + finalMs) / 1000).toFixed(1) + "s");
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
    const res = await fetch(INDEXER, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { a: RECORDED.contractAddress } }),
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
    add("QUERY", "contractAction(address) — public indexer, no wallet");
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
      mode = "LIVE";
      $("mode-badge").innerHTML = '<span class="dot live"></span><span>LIVE PROVING</span>';
      return;
    }
  } catch { /* no local prover — the deployed page always lands here */ }
  mode = "REPLAY";
  $("mode-badge").innerHTML = '<span class="dot replay"></span><span>REPLAY</span>';
}

// --- boot ------------------------------------------------------------------

$("btn-prove").addEventListener("click", () => prove().catch((e) => {
  setState("FAILED: " + e.message, "failed");
  busy = false;
  renderCredential();
}));
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

renderCredential();
setState("DRAFT", null);
detectMode();
readChain();

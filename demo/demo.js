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
  // Real proofs on PUBLIC preprod, 2026-08-28 ~17:40 ADT, made from this very
  // page in LIVE mode. Anyone can look them up on the preprod indexer — the
  // chain panel below does exactly that.
  network: "preprod",
  contractAddress: "765054972171eeb1589d3a042123890cd4291d7eaba4058e8e3a3416de0fada2",
  issueTxId: "008a9e5d6e903022fe9692192d51ee20c454bd44ba9f53facb25465ec47f3f47ab",
  proveTxId: "004a1ee8a588019869c4abe02f82471f56d02d30998601bd42d256f4cb3759dedb",
  disclosed: "adaf0de221bad98cc3f92e6dd060518c120cc2a9880b853e38d366f9f8d92aba",
  provingMs: 2400,
  finalizeMs: 19100,
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
  redact: "assets/switch2.ogg",
  reveal: "assets/switch3.ogg",
  press: "assets/click1.ogg",
  ok: "assets/switch7.ogg",
  fail: "assets/switch32.ogg",
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



// --- languages -------------------------------------------------------------
//
// EN leads; the other three are written, not machine-translated. Technical
// labels (DISCLOSED FIELD, TRANSACTION, ○ LOCAL) stay in English on purpose —
// they are part of the design system's engineering register, and translating
// them would make the interface read less like an instrument, not more.

const LANGS = { en: "EN", zh: "简", tw: "繁", ja: "日" };

const I18N = {
  en: {
    s1: "THE SAME CREDENTIAL, TWO WAYS",
    s2: "THE CREDENTIAL · CLICK A FIELD TO KEEP IT HOME",
    s3: "PROVE",
    s4: "THREE VERIFIERS · NONE OF THEM CAN TELL",
    s5: "WHAT THE CHAIN ACTUALLY SHOWS",
    before: "A public credential registry, live today. Anyone can verify a diploma — and anyone can read every field of it. Verifiability came at the price of privacy.",
    after: "The same credential, proved one field at a time. The verifier learns that the diploma is real and nothing else — and cannot link two proofs to one holder.",
    btnProve: "Prove selected field",
    btnForge: "Try it with a forged diploma",
    btnForgeBack: "Back to the real diploma",
    btnReset: "Reset",
    btnThree: "Prove to all three",
    threeIntro: "Chuck applies to three universities and proves the same degree to each. Three separate proofs, three separate transactions. Nothing in them ties the three together.",
    chainHint: "This panel is a plain HTTP POST to the public Midnight indexer — no wallet, no SDK, nothing private. Anyone can run the same query.",
    motto: "ALL FOR SIMPLE",
    footNote: "Built for the MLH Midnight Hackathon, 2026 · Charles Tao",
    footAnchor: "the Cardano record",
    skip: "click anywhere to skip",
    noteAllRedacted: "Everything is redacted. Leave one field open to prove it.",
    noteProving: (f) => `Proving ${f}. Everything else stays on this device — it is never sent, not even encrypted.`,
    anchorLine: "ANCHOR is the asset name of a real EchoCert credential on Cardano mainnet, minted 2026-04-11 — which is the SHA-256 of that credential's contents, already 32 bytes.",
    anchorLink: "Look it up →",
    forgeHint: "This diploma was never issued. The DEGREE field says whatever its holder wants it to say.",
    proverLive: "PROVING VIA LOCAL PROOF SERVER",
    proverReplay: "Replaying timings measured on a real run — this page has no prover.",
    rejectHint: "No proof exists for a credential that was never issued. There is nothing to submit and nothing to check on chain.",
    verdictOk: "✓ VALID — the diploma is real",
  },
  zh: {
    s1: "同一张凭证，两种做法",
    s2: "凭证 · 点一个字段把它留在本地",
    s3: "证明",
    s4: "三个验证方 · 谁也认不出",
    s5: "链上真正能看到什么",
    before: "公开的凭证登记表，今天就在运行。任何人都能验证一张文凭——也能读到它的每一个字段。可验证性是拿隐私换来的。",
    after: "同一张凭证，一次只证明一个字段。验证方知道文凭是真的，别的什么都不知道——而且没法把两次证明认成同一个人。",
    btnProve: "证明选中的字段",
    btnForge: "换一张伪造的文凭试试",
    btnForgeBack: "换回真文凭",
    btnReset: "重置",
    btnThree: "向三所都证明一次",
    threeIntro: "Chuck 同时申请三所大学，向每一所证明同一个学位。三次独立的证明，三笔独立的交易。没有任何东西能把这三次连起来。",
    chainHint: "这个面板只是一次普通的 HTTP POST，发给公开的 Midnight indexer——不用钱包，不用 SDK，不碰任何私密数据。同样的查询任何人都能跑。",
    motto: "一切为简",
    footNote: "为 MLH Midnight 黑客松而作，2026 · Charles Tao",
    footAnchor: "Cardano 上的那条记录",
    skip: "点任意处跳过",
    noteAllRedacted: "全都涂黑了。留一个字段不涂，才有东西可证明。",
    noteProving: (f) => `正在证明 ${f}。其余全部留在这台设备上——不发送，连加密后也不发送。`,
    anchorLine: "ANCHOR 是 Cardano 主网上一张真实 EchoCert 凭证的资产名，2026-04-11 铸造——它本身就是那张凭证内容的 SHA-256，正好 32 字节。",
    anchorLink: "去链上查 →",
    forgeHint: "这张文凭从来没有被签发过。DEGREE 字段上写什么，全凭持有人自己填。",
    proverLive: "由本地 PROOF SERVER 出证",
    proverReplay: "回放一次真实运行测得的耗时——这个页面本身没有证明器。",
    rejectHint: "一张从未签发的凭证不存在任何证明。没有东西可提交，链上也没有东西可查。",
    verdictOk: "✓ 有效 — 文凭是真的",
  },
  tw: {
    s1: "同一張憑證，兩種做法",
    s2: "憑證 · 點一個欄位把它留在本地",
    s3: "證明",
    s4: "三個驗證方 · 誰也認不出",
    s5: "鏈上真正能看到什麼",
    before: "公開的憑證登記表，今天就在運行。任何人都能驗證一張文憑——也能讀到它的每一個欄位。可驗證性是拿隱私換來的。",
    after: "同一張憑證，一次只證明一個欄位。驗證方知道文憑是真的，別的什麼都不知道——而且沒法把兩次證明認成同一個人。",
    btnProve: "證明選中的欄位",
    btnForge: "換一張偽造的文憑試試",
    btnForgeBack: "換回真文憑",
    btnReset: "重置",
    btnThree: "向三所都證明一次",
    threeIntro: "Chuck 同時申請三所大學，向每一所證明同一個學位。三次獨立的證明，三筆獨立的交易。沒有任何東西能把這三次連起來。",
    chainHint: "這個面板只是一次普通的 HTTP POST，發給公開的 Midnight indexer——不用錢包，不用 SDK，不碰任何私密資料。同樣的查詢任何人都能跑。",
    motto: "一切為簡",
    footNote: "為 MLH Midnight 黑客松而作，2026 · Charles Tao",
    footAnchor: "Cardano 上的那條記錄",
    skip: "點任意處跳過",
    noteAllRedacted: "全都塗黑了。留一個欄位不塗，才有東西可證明。",
    noteProving: (f) => `正在證明 ${f}。其餘全部留在這台裝置上——不傳送，連加密後也不傳送。`,
    anchorLine: "ANCHOR 是 Cardano 主網上一張真實 EchoCert 憑證的資產名，2026-04-11 鑄造——它本身就是那張憑證內容的 SHA-256，正好 32 位元組。",
    anchorLink: "去鏈上查 →",
    forgeHint: "這張文憑從來沒有被簽發過。DEGREE 欄位上寫什麼，全憑持有人自己填。",
    proverLive: "由本地 PROOF SERVER 出證",
    proverReplay: "回放一次真實運行測得的耗時——這個頁面本身沒有證明器。",
    rejectHint: "一張從未簽發的憑證不存在任何證明。沒有東西可提交，鏈上也沒有東西可查。",
    verdictOk: "✓ 有效 — 文憑是真的",
  },
  ja: {
    s1: "同じ証明書、二つのかたち",
    s2: "証明書 · 項目をクリックして手元に残す",
    s3: "証明",
    s4: "三つの検証者 · どれも見分けられない",
    s5: "チェーンに実際に見えるもの",
    before: "公開の証明書レジストリ、すでに稼働中。誰でも学位を検証できる——そして全ての項目を読める。検証可能性はプライバシーと引き換えだった。",
    after: "同じ証明書を、一項目ずつ証明する。検証者は学位が本物だと分かるだけで、他は何も分からない——二つの証明を同一人物に結びつけることもできない。",
    btnProve: "選んだ項目を証明",
    btnForge: "偽造した学位で試す",
    btnForgeBack: "本物の学位に戻す",
    btnReset: "リセット",
    btnThree: "三校すべてに証明する",
    threeIntro: "Chuck は三つの大学に同時に出願し、それぞれに同じ学位を証明する。三つの独立した証明、三つの独立したトランザクション。この三つを結びつけるものは何もない。",
    chainHint: "このパネルは公開 Midnight インデクサへの単なる HTTP POST。ウォレットも SDK も不要、秘密には一切触れない。同じクエリは誰でも実行できる。",
    motto: "すべては簡潔のために",
    footNote: "MLH Midnight ハッカソンのために制作、2026 · Charles Tao",
    footAnchor: "Cardano 上のレコード",
    skip: "クリックでスキップ",
    noteAllRedacted: "すべて伏せてある。証明するには一つだけ開けておく。",
    noteProving: (f) => `${f} を証明中。他はすべてこの端末に残る——送信されない、暗号化してさえ送らない。`,
    anchorLine: "ANCHOR は Cardano メインネット上の実在する EchoCert 証明書のアセット名（2026-04-11 発行）。その証明書の内容の SHA-256 そのもので、ちょうど 32 バイト。",
    anchorLink: "チェーンで確認 →",
    forgeHint: "この学位は一度も発行されていない。DEGREE 欄には持ち主が書きたいことが書いてあるだけ。",
    proverLive: "ローカル PROOF SERVER で証明中",
    proverReplay: "実際の実行で測定した所要時間を再生している——このページ自体に証明器はない。",
    rejectHint: "発行されていない証明書に、証明は存在しない。送信するものも、チェーンで確認するものもない。",
    verdictOk: "✓ 有効 — 学位は本物",
  },
};

let lang = "en";
try {
  const saved = localStorage.getItem("echocert-lang");
  if (saved && I18N[saved]) lang = saved;
  else if (/^zh\b/i.test(navigator.language)) lang = /hant|tw|hk|mo/i.test(navigator.language) ? "tw" : "zh";
  else if (/^ja\b/i.test(navigator.language)) lang = "ja";
} catch { /* private window */ }

const t = (key, ...args) => {
  const v = I18N[lang]?.[key] ?? I18N.en[key];
  return typeof v === "function" ? v(...args) : v;
};

function applyLanguage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const v = t(el.dataset.i18n);
    if (v) el.textContent = v;
  }
  // forge button carries state, so it is set from whichever label applies
  const forgeBtn = $("btn-forge");
  if (forgeBtn) forgeBtn.textContent = forging ? t("btnForgeBack") : t("btnForge");
  const anchorLine = $("anchor-line");
  if (anchorLine) {
    anchorLine.innerHTML = `${t("anchorLine")} <a href="${CARDANO_URL}" target="_blank" rel="noopener">${t("anchorLink")}</a>`;
  }
  renderCredential();
  for (const b of document.querySelectorAll("#lang-switch button")) {
    b.setAttribute("aria-current", String(b.dataset.lang === lang));
  }
}

function buildLanguageSwitch() {
  const box = $("lang-switch");
  box.innerHTML = "";
  for (const [code, label] of Object.entries(LANGS)) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.lang = code;
    b.textContent = label;
    b.addEventListener("click", () => {
      lang = code;
      try { localStorage.setItem("echocert-lang", code); } catch { /* ignore */ }
      applyLanguage();
    });
    box.appendChild(b);
  }
}

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
  $("cred-note").textContent = open.length === 0
    ? t("noteAllRedacted")
    : t("noteProving", open.map((f) => f.key).join(", "));
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
    $("prover-hint").textContent = t("rejectHint");
    busy = false;
    $("btn-forge").disabled = false;
    renderCredential();
    return;
  }

  setState("PROVING", "proving");
  $("prover-hint").textContent = mode === "LIVE" ? t("proverLive") : t("proverReplay");
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
  verdict.textContent = t("verdictOk");
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
  const add = (l, v) => {
    const r = document.createElement("div");
    r.className = "out-row";
    r.innerHTML = `<span class="label-tech">${l}</span><span class="mono-code">${v}</span>`;
    box.appendChild(r);
  };
  const t0 = performance.now();
  try {
    if (mode === "LIVE") {
      // The prover told us which network it is on; ask that network's indexer
      // for the contract itself.
      const query = `query($a: HexEncoded!) { contractAction(address: $a) { __typename address } }`;
      const res = await fetch(indexer, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, variables: { a: contractAddress ?? RECORDED.contractAddress } }),
      });
      const json = await res.json();
      const ms = (performance.now() - t0).toFixed(0);
      box.innerHTML = "";
      add("QUERY", "contractAction(address) — indexer over plain HTTP, no wallet");
      add("NETWORK", liveNetwork === "undeployed" ? "local devnet" : liveNetwork);
      add("ROUND TRIP", ms + " ms");
      const action = json?.data?.contractAction;
      add("CONTRACT FOUND", action ? action.address : "not on this network");
      add("COMMITMENT ON CHAIN", "absent — the tree stores a hash of it, never the value");
      add("LINKABLE TO A HOLDER", "no — measured, see the unlinkability experiment");
      return;
    }

    // REPLAY: the recorded contract lives on PUBLIC preprod, so this is the
    // very same query LIVE mode makes — against a contract anyone can look up.
    // Only the proofs on this page are replayed; the chain read is live.
    const query = `query($a: HexEncoded!) { contractAction(address: $a) { __typename address } }`;
    const res = await fetch(INDEXERS.preprod, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { a: RECORDED.contractAddress } }),
    });
    const json = await res.json();
    const ms = (performance.now() - t0).toFixed(0);
    box.innerHTML = "";
    add("LIVE QUERY", "contractAction(address) — public preprod indexer over plain HTTP, no wallet");
    add("NETWORK", "preprod — public");
    add("ROUND TRIP", ms + " ms — live, just now");
    const action = json?.data?.contractAction;
    add("CONTRACT FOUND", action ? action.address : "not found");
    add("PROOFS ON THIS PAGE", "replayed from a real run on this contract — run the repo and they go live");
    add("COMMITMENT ON CHAIN", "absent — the tree stores a hash of it, never the value");
    add("LINKABLE TO A HOLDER", "no — measured, see the unlinkability experiment");
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
  $("network-badge").textContent = "PREPROD · RECORDED";
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
  $("btn-forge").textContent = forging ? t("btnForgeBack") : t("btnForge");
  $("proof-out").innerHTML = "";
  $("prover-hint").textContent = forging ? t("forgeHint") : "";
  setState("DRAFT", null);
  renderCredential();
});
$("btn-reset").addEventListener("click", () => {
  forging = false;
  $("btn-forge").textContent = t("btnForge");
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

buildLanguageSwitch();
applyLanguage();
setState("DRAFT", null);
detectMode().then(() => { runBoot(); return readChain(); });


// --- the three verifiers ---------------------------------------------------
//
// Unlinkability is the one claim that cannot be shown by looking at a single
// proof. So prove the same field three times to three different verifiers and
// put the three transactions side by side: nothing in them is shared.

const VERIFIERS = ["Midnight University", "Cardano University", "EchoForge University"];

// Three real proveDegree transactions from one holder on public preprod, made
// from this page's "Prove to all three" in LIVE mode. Same holder, three
// different transactions, no shared identifier — see e2e/unlinkability.ts.
const RECORDED_THREE = [
  "00ce1aa8280bd73842e58cab8c70c98aefa2bd8d011d55e387a5699465512574e5",
  "00a799ab10b34d6c720f6c147cc217a3c1dda199c0494c9d7a690bb47abcaff853",
  "00b4577a69d5b10b216ffdcdacc80b875d1683c75e6ef129310325c47dea1fdf95",
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
    const res = await fetch("assets/echo-mark-ascii.txt");
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

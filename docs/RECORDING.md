# Recording guide

Maps each shot in `VIDEO-SCRIPT.md` to what to actually do on screen. Every shot
below is real footage — nothing here is mocked.

## Before you start

**Containers run under OrbStack, not Docker Desktop.** Docker Desktop's VM
kernel-panicked this machine twice on 2026-08-28 under sustained network load
(`com.docker.virtualization` was the panicked task both times). Quit Docker
Desktop before recording; do not let it autostart.

```bash
# 0. make sure docker talks to OrbStack, and Docker Desktop is not running
docker context use orbstack
pgrep -fl "Docker Desktop" && echo "QUIT DOCKER DESKTOP FIRST"

# 1. proof server + local devnet (one compose file; images pull once)
docker compose -f ~/.midnight-expert/devnet/devnet.yml up -d
curl -sf localhost:6300/health                      # proof server
curl -s -H 'content-type: application/json' \
  -d '{"query":"{ block { height } }"}' localhost:8088/api/v4/graphql   # indexer

# 2. the prover behind LIVE mode — on PUBLIC PREPROD (what the video shows)
#    Restores the wallet from contract/e2e/.wallet-state-preprod checkpoints
#    (run e2e/sync-preprod.sh once first), deploys + issues on first run (~90s
#    including the restore), then reuses its contract on every restart.
cd contract && MIDNIGHT_NETWORK=preprod MIDNIGHT_WALLET_SEED=… npm run prover
#    Fallback, local devnet only (badge will read LOCAL DEVNET):
#    rm -f e2e/.deployment-undeployed.json && npm run prover

# 3. serve the page (demo/ is self-contained — any static server, any path)
python3 -m http.server 8080
```

Open `http://localhost:8080/demo/index.html?boot`. The badge must read
**LIVE PROVING**. If it reads REPLAY the prover is not up, and every proof you
record will be a replay — check before you roll.

Recording chain: OBS for picture, Dipper for system audio (macOS will not give
OBS the internal audio on its own). Do one 10-second test and play it back
before recording anything you care about.

## Per shot

| Shot | What to do | Watch for |
|---|---|---|
| 1 · naming (0:00–0:04) | Load with `?boot`. The command types itself, the mark draws, two real checks report. | **The eligibility line is this shot.** Confirm the command line reads `--for "MLH Midnight Hackathon" --by "Charles Tao"` before moving on. |
| 2 · BEFORE | Section 01, left panel. Cut to the real EchoCert page on Cardano if you want the product itself on screen. | The word BEFORE must be legible. |
| 3 · AFTER | Section 01 right panel, then scroll to section 02 with all five fields open. | Click each redacted field once to open it first, so the shot starts with everything visible. |
| 4 · redaction | Click SUBJECT, ISSUER, ISSUED_YEAR, ANCHOR in turn. Each one blocks out and its scope flips to ○ LOCAL. | Leave DEGREE open. Sound on — redact and reveal are deliberately different tones. |
| 5 · PROVE | Press *Prove selected field*. Do not cut. | Real proving takes 1–4.5s and the elapsed counter is real. Let it breathe; the variability is the point. |
| 6 · FINALIZE | Same take, keep rolling to CONFIRMED. Speed this up in the edit and caption it. | Freeze on TRANSACTION and CONTRACT — those are the values a judge can look up. |
| 7 · VERIFY | Same take: ✓ VALID, then scroll to section 05. | The chain panel's round trip is genuinely single-digit milliseconds. |
| 8 · the forgery | Press *Try it with a forged diploma*, then *Prove selected field*. | It fails in ~20ms. Caption that the request never left the machine. |
| 9 · unlinkability | Section 04, press *Prove to all three*. Three real proofs, ~20s each. | Speed up in the edit. Land on the summary rows — especially "two different holders share exactly as much". |
| 9b · closing card | Claude Design. | No age anywhere in the video. |
| 10 · lockup | Scroll to the footer: mark, ALL FOR SIMPLE, live URL, Cardano record. | Already on screen — no separate card needed. |

## If you want a second language on screen

The EN/简/繁/日 switch is in the header and every visible string follows it.
Latin stays in IBM Plex Mono in all four.

## Facts you can safely say on camera

- The proof is a real PLONK proof generated on this machine.
- Nothing but the chosen field leaves the device. The other four fields are not
  sent, encrypted or otherwise.
- A forged credential is refused locally, in about 20 milliseconds, before any
  network call.
- The credential is anchored to a real EchoCert record on Cardano mainnet,
  minted 2026-04-11, and the demo links to it.
- Two proofs by the same holder share nothing that two proofs by *different*
  holders do not also share — measured, see `contract/e2e/unlinkability.ts`.
- The contract is deployed on the public Midnight preprod network and every
  proof in the video lands there. Anyone can query it:
  `4719d2f6ebcddbda079ac07ec1cc7ea4019471ba254ca1846461c8e204d0769b`
  (with the prover on preprod, the header badge reads **PREPROD** — check it
  before you roll; if it reads LOCAL DEVNET, say "devnet" instead).
- Getting onto preprod meant finding that a read-only proof computes a zero
  fee and the wallet chokes on it — a one-line fix that also explained a
  failure I'd spent two days on before the event.

## Do not say

- A network the badge does not show. It reads PREPROD or LOCAL DEVNET — say
  what it says.
- Any timing you have not just watched happen. The numbers vary run to run.

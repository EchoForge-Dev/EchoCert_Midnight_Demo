# Prior work declaration

**Track: Integrate Midnight to Upgrade an Existing App**
**Event: MLH Midnight Hackathon, 2026-08-28 → 2026-08-30**
**Entrant: Charles Tao (solo)**

> Contest rule: *"You may not submit projects that include prior work, unless you are
> submitting to the 'Integrate Midnight' track and specify what was completed beforehand."*

This file is the required specification. It is the first commit in this repository, so the
git history itself shows the boundary: everything after this commit was written during the
event.

The rule of thumb I held myself to: **prior work may be the "before" and the assets. The
"after" — every line of Midnight-side code — is built during the event.**

## What existed before the hackathon

| Item | What it is | When | Where |
|---|---|---|---|
| **EchoCert (Cardano)** — the "before" | Shipped product: a public credential registry anchored on Cardano. Every field of a credential is public and verifiable by anyone. | since 2026-04-10, last change 2026-08-21 | echoforgeef.com · main repo `EchoForge`, `credential/` |
| Brand & design system | `EchoForge.svg`, `EFB.svg`, EchoForgeStyle spec (`design/DESIGN.md`), Midnight landing draft (`design/EchoForge Midnight.dc.html`) | 2026-08-05 → 08-26 | `brand/`, `design/` |
| Sound library — uisfx | Third-party (MIT code / CC0 audio). Unmodified npm dependency, not vendored. | added 2026-08-21 | `package.json` |
| Sound library — Kenney UI pack | Third-party CC0 audio, vendored unchanged. | added 2026-08-03 | `kenney/` |
| Midnight knowledge base | `MIDNIGHT_KB.html` and the EchoMKB agent skill (separate public repo, installed here) | 2026-08-04 → 08-26 | `docs/MIDNIGHT_KB.html`, `.agents/skills/echomkb`, `skills-lock.json` |
| Compact reference examples | 4 study contracts written while learning Compact (counter / age-credential / document-anchor / private-ballot) | 2026-08-05 | `examples/` |
| Principle diagram | `echocert-principle.svg` | 2026-08-21 | `docs/` |
| Video storyboard | `VIDEO-SCRIPT.md` | 2026-08-22 → 08-26 | `docs/` |

## What is deliberately NOT here: the rehearsal

I did a full dry run before the event (2026-08-21 → 08-23): a rehearsal contract, local-devnet
and preprod pipelines, timing measurements, and a wallet-SDK bug report.

**None of that code is in this submission.** What carried over is experience — a runbook of
version pins, disclosure rules, pitfalls and measured timings. The contract, witnesses,
pipeline and demo in this repository were written during the event, from scratch.

That is what a rehearsal is for, and drawing the line here is deliberate: if the contract were
declared as prior work, the "after" I am being judged on would be empty.

## What I build during the hackathon

- **Compact contract** — selective-disclosure credential: commitment + `HistoricMerkleTree`
  path proof for unlinkability + a path/commitment binding guard — and its TypeScript witnesses
- Proof and transaction pipeline: local proof server, deploy, issue, prove, indexer reads
- Demo application: credential view, redact-to-disclose, real local proving, verify + tamper
  demo, wallet-less live chain panel
- Integration into the shipped product: a "Prove privately on Midnight →" entry point on the
  existing EchoCert page, so the "after" is reachable from the "before"
- Deployment to m.echoforgeef.com, contract on preprod
- README with the BEFORE/AFTER comparison, this declaration, and the 2-minute video

## Third-party licenses

- uisfx — MIT (code), CC0 (audio)
- Kenney UI audio — CC0


---
name: echomkb
description: Midnight Network knowledge for coding agents — Compact language, midnight-js SDK, wallet/DApp Connector, indexer, proof server, node ops, versions. Searches docs.midnight.network LIVE on every use (llms.txt index → ranked pages → cited excerpts) and reports version drift between the support matrix and the newest releases. Use for any question or task involving Midnight, Compact, @midnight-ntwrk packages, Lace/DApp Connector, ZK proving, DUST/NIGHT, or which versions to pin.
---

# EchoMKB — live Midnight knowledge

Your training data about Midnight and Compact is stale and partly wrong. This skill exists so you never answer from memory: **every use starts with a live search of docs.midnight.network**, and every fact you state carries the URL it came from.

Requires Node ≥ 18 (global `fetch`). No dependencies. Scripts live next to this file in `scripts/`. Contacts only `docs.midnight.network`, plus `registry.npmjs.org` (via `npm view`) and `api.github.com` for the `versions` command; nothing from the user's project is sent anywhere.

## Protocol (do this in order, every time)

1. **Search live first.**
   `node <skill-dir>/scripts/echomkb.mjs search "<3–8 words describing the task>"`
   Run 2–3 searches with different wording if the first is thin. Use `--section compact`, `--section api-reference`, `--section guides` … to focus. Identifier-style queries (`persistentHash`, `deployContract`, `MerkleTree`) automatically favour API reference pages.
2. **Read the whole page before relying on it.**
   `node <skill-dir>/scripts/echomkb.mjs page <url>` — excerpts are for triage, not for quoting signatures or syntax.
3. **For anything involving versions**, run
   `node <skill-dir>/scripts/echomkb.mjs versions`
   and report *both* columns: what the support matrix has **tested** and what is **newest**. Say explicitly when they differ (they usually do). Deployments follow the matrix; compiler ↔ runtime must match exactly; pin `@midnight-ntwrk/*` without `^`/`~`.
4. **Cite.** Every Midnight-specific claim in your answer names its source URL. If you could not find a page that states the fact, say so instead of inferring.
5. **Verify code.** Compact and SDK code is only "correct" after it compiles (`compact compile`) and, where possible, runs. Present unverified code as unverified.

## When the network is down

`node <skill-dir>/scripts/echomkb.mjs doctor` tells you. If the live index is unreachable, read `kb/MIDNIGHT_KB.md` (an English snapshot of the EchoForge MIDNIGHT_KB — its crawl and verification dates are in the file header) and **state in the answer that the source is a dated snapshot**. Never silently downgrade to snapshot or recall.

## Commands

| Command | What it does |
|---|---|
| `search <query> [--max 8] [--fetch 3] [--section s] [--json]` | Rank pages from the live `llms.txt` index (≈1,300 pages), open the top hits, print heading-anchored excerpts with URLs and the page's own "Compact language X, compiler Y" stamp when present. |
| `page <path-or-url> [--max-chars N]` | Full page as markdown (`.md` endpoint; strips HTML if a page has none). |
| `versions [--no-npm] [--no-github] [--json]` | Support matrix per network vs release-notes latest vs npm latest vs GitHub latest, with a drift column. |
| `index` | Sections of the live docs index with counts — orient yourself before searching. |
| `doctor` | Connectivity + cache check (cache in the OS temp dir, 15 min for the index, 60 min for pages; `--fresh` bypasses). |

## Hard rules

- Live docs > `kb/MIDNIGHT_KB.md` snapshot > anything recalled. On conflict, the higher source wins and you mention the conflict.
- The support matrix page is newer than per-component release-notes pages when they disagree; GitHub tags and npm can be *ahead* of both (unsupported yet).
- Docs pages carry a stamp like "Compact language version 0.26.0, compiler version 0.34.0" — repeat it when quoting syntax, because syntax changes between language versions.
- Do not invent package names, CLI flags, stdlib signatures, or disclosure rules. If the docs do not show it, you do not know it.
- Privacy is the product: default to the minimal on-chain footprint (data minimisation) when proposing designs, and flag every `disclose()`.

## Provenance

Built by EchoForge (m.echoforgeef.com/echomkb) as the agent-facing twin of the human-readable MIDNIGHT_KB (m.echoforgeef.com/kb). Source: https://github.com/EchoForge-Dev/EchoMKB · Apache-2.0.

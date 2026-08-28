# Devpost draft

Paste-ready copy for the submission form. Update the video link and repo URL when they exist.

---

**Project name:** EchoCert on Midnight

**Elevator pitch (one line):**
Prove one field of a diploma. Reveal nothing else. Leave nothing behind that
links two proofs to the same person.

**Track:** Integrate Midnight to Upgrade an Existing App

---

## Inspiration

EchoCert is my credential registry on Cardano — a real product, live since
April. It does its job: a school anchors a diploma, anyone can verify it. But I
built it with a flaw I could not fix on a transparent chain: to prove *one*
thing about yourself you must publish *everything*. Name, school, year, anchor —
public, forever, linkable.

Midnight is the first chain where I could fix that without giving up the part
that works: anyone can still verify.

## What it does

The holder keeps the credential on their own device. The chain holds only a
commitment, hashed again before it is stored. To convince a university, the
holder proves in zero knowledge that their credential is in the registry and
disclosing exactly one field — DEGREE, say. The university learns "the diploma
is real, the degree is BSc Computer Science" and nothing else.

Three properties, all demonstrated live in the demo:

- **Selective disclosure** — click fields to redact them; what is blacked out
  never leaves the device, not even encrypted.
- **Local refusal of forgeries** — a forged diploma fails on the forger's own
  machine in ~20 ms, before any network call. There is nothing to submit.
- **Unlinkability** — the same holder proves to three universities; the three
  transactions share nothing that two *different* holders' proofs don't also
  share. This is measured by an experiment in the repo, not asserted.

The BEFORE half is real too: the demo credential is anchored to an actual
EchoCert record minted on Cardano mainnet on 2026-04-11 — the anchor field *is*
that record's asset name, and the demo links to it so you can check.

## How I built it

- **Compact contract** (6 circuits): commitment registry on a
  `HistoricMerkleTree` — historic roots mean issuing a new credential doesn't
  invalidate paths already in holders' hands. The one line that carries the
  security: `assert(path.leaf == commitment)`, without which a forger could
  pair someone else's genuine Merkle path with an invented credential.
- **TypeScript witnesses** with nullable secrets that throw locally rather
  than fall back to defaults (a zero-byte issuer secret would be forgeable by
  anyone).
- **Real pipeline**: local proof server (PLONK), deploy/issue/prove on a
  Midnight devnet, wallet-less chain
  reads through the public indexer.
- **The demo** is vanilla HTML/CSS/JS in my design system, with a LIVE mode
  (a local prover service generates real proofs behind the page) and an honest
  REPLAY mode that replays measured timings and says so.
- Built by pair-programming with Claude Code, disclosed in the repo.

## Challenges

- **The zero-fee trap.** A circuit that only reads state computes a zero fee on
  an idle chain; the wallet then builds an empty DustActions and the ledger
  rejects it (`Invalid Transaction: Custom error: 117` — NotNormalized). Deploy
  and issue write state, so only the *proof* transactions failed — a uniquely
  confusing asymmetry. One line fixes it: a small `additionalFeeOverhead`.
- **I nearly shipped a false claim.** My demo said the three proofs "share no
  identifier". When I actually diffed the raw transaction bytes, they shared a
  41-byte run — which turned out to be the Merkle root at proof time, not an
  identity. The claim survived, narrower and now backed by a repeatable
  experiment (`contract/e2e/unlinkability.ts`). The commit history keeps the
  wrong turn.
- **Preprod cold sync vs. 16 GB of RAM.** Syncing a wallet from genesis
  OOM-crashed Node at 4, 8 and 10 GB heaps. I built a resumable sync that
  checkpoints all three wallet states to disk every 40 s and restores after
  every crash — progress is monotone even if every attempt dies. It got past halfway — and
  then the machine kernel-panicked twice in twenty minutes while it ran, so I
  stopped. The demo stands on a local devnet, and says so on screen.

## Accomplishments

17/17 local checks including the forgery attack; 7/7 end-to-end checks on a
devnet with real proofs; an unlinkability claim that is *measured*; a demo
where the eligibility line, the privacy grammar (○ LOCAL / ● DISCLOSED), four
languages and the sound design are all part of the product.

## What I learned

That "compiles" and even "passes tests" mean nothing until you grep the raw
transaction bytes. Taint analysis is not a privacy audit — the compiler was
happy long before the chain stopped leaking.

## What's next

Range proofs on `issuedYear` ("graduated before 2027" without the year), more
issuers, and folding this back into the EchoCert product line as the private
verification path next to the public registry.

---

**Built with:** Compact 0.31.1 · midnight-js 4.1.1 · proof server 8.1.0 ·
React-free vanilla JS · IBM Plex Mono · Kenney CC0 audio

**Links:** repo ⟨URL when pushed⟩ · live demo m.echoforgeef.com ⟨when deployed⟩ ·
the Cardano anchor: cardanoscan.io/token/32fd4d60…bed978

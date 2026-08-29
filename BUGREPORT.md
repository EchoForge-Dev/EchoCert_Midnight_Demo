# Bug report: a read-only circuit call computes a zero fee, and the wallet cannot handle it

**Status:** root cause found and worked around during the MLH Midnight Hackathon
(2026-08-28). Not yet filed upstream — this is the write-up I intend to post to the
Midnight developer community. Everything below is reproducible from this repository.

## Summary

A Compact circuit that only *reads* ledger state — here, a single
`HistoricMerkleTree.checkRoot()` plus a disclosed return value — produces a
transaction whose fee the wallet SDK computes as **zero** on an idle chain. The
dust wallet then balances it with an empty `DustActions`, which is not a valid
transaction. What happens next depends on the node:

| Network | Node | Where it fails | What you see |
|---|---|---|---|
| Local devnet | `midnight-node` 0.22.5 (pre-GA) | The **node** rejects the submitted tx | `1010: Invalid Transaction: Custom error: 117` (NotNormalized), in ~2 s |
| Public preprod | `midnight-node` 1.0.1 and 1.0.2 (GA) | The **wallet** panics before submission, inside the fee dry-run | `(FiberFailure) Wallet.Other: unreachable` — a WASM `RuntimeError: unreachable` — after a 21–25 min hang (first attempt) or ~150 s (retry) |

Circuits that *write* state (the constructor, an insert circuit) never hit this,
because their fee is never zero. That produces a confusing asymmetry: **deploy and
issue succeed every time, the proof transaction fails every time.**

**Workaround:** give the dust wallet a positive fee overhead.

```ts
import { DEFAULT_DUST_OPTIONS } from "@midnight-ntwrk/testkit-js";
DEFAULT_DUST_OPTIONS.additionalFeeOverhead = 1_000_000n; // any positive value
```

With that one line the identical transaction lands on both networks in ~18–19 s.

## Environment

- `@midnightntwrk/wallet-sdk` 1.2.0 → `@midnight-ntwrk/wallet-sdk-dust-wallet` 4.2.0
  (the newest stable in the 1.2.0 line; 1.2.1 exists only as canary builds, 2.0.0 as beta)
- `@midnight-ntwrk/midnight-js` 4.1.1, `@midnight-ntwrk/testkit-js` 4.1.1
- `@midnight-ntwrk/compact-runtime` 0.16.0, `@midnight-ntwrk/onchain-runtime-v3` 3.0.0, `@midnight-ntwrk/ledger-v8` 8.1.0 — all exact-pinned
- Compact toolchain 0.31.1 (language 0.23.0); proof server 8.1.0 (Docker)
- Preprod: indexer 4.3.3-hotfix, node 1.0.1 (2026-08-23) and 1.0.2 (2026-08-28), same result
- Local devnet: indexer 4.2.1, node 0.22.5

## Reproduction

The contract is [`contract/src/echocert.compact`](contract/src/echocert.compact).
The failing circuit is `proveDegree`:

```compact
export circuit proveDegree(): Bytes<32> {
    return disclose(verifiedCredential().degree);
}
// verifiedCredential() asserts path.leaf == commitment and
// credentials.checkRoot(disclose(merkleTreePathRoot<10, Bytes<32>>(path)))
// — it reads the ledger and writes nothing.
```

Steps, with the default `additionalFeeOverhead: 0n`:

1. Deploy the contract and call the insert circuit (`issue`) — both land.
2. Call `proveDegree` through `callTx` on a chain with no other activity.
3. Local devnet (pre-GA node): the node rejects with error 117 within seconds.
   Preprod (GA node): the call hangs for 21–25 minutes, then throws
   `Wallet.Other: unreachable` from `wallet-sdk-dust-wallet/dist/v1/Transacting.js:285`,
   the `catch` around `dryRunFee(...)`.

[`contract/e2e/devnet.ts`](contract/e2e/devnet.ts) and
[`contract/e2e/preprod.ts`](contract/e2e/preprod.ts) run the full pipeline on each
network. Remove the `additionalFeeOverhead` line to reproduce the failure; keep it
to see the fix.

## Evidence

- **Proof server log (preprod):** per attempt exactly one `/check` and one `/prove`
  for the circuit, completing in 1–2 s (`proof ok`), then nothing. The dust fee
  proof request is never sent, so the wallet dies before it has a transaction to
  submit.
- **Indexer:** no such transaction ever lands; the contract's latest action stays
  the insert.
- **Stack:** identical across all 8 reproductions and both GA node versions —
  WASM module `026b209a`, `function[18274] → [14304] → [3178]`, same offsets.
- **Not a funds problem:** 375–4,186 tDUST and ≥ 1 spendable coin, checked
  immediately before every attempt; wallet fully synced (`waitForSyncedState`).
- **Not position-dependent:** fails as the third transaction of a session and as
  the first transaction of a fresh, fully synced session.
- **Devnet error code:** `117` decodes to `NotNormalized` in the node's error tables.

## How it was misdiagnosed, and how it was found

During a rehearsal before the event (2026-08-21 → 08-23) the failure reproduced
6/6 on preprod while the same code passed on a local devnet. The only visible
difference was the node generation (GA vs pre-GA) and the only unusual thing in
the failing circuit was the historic Merkle root, so the working theory became
"the wallet SDK mishandles transactions that reference historic roots on GA
networks". Two more reproductions on 2026-08-28 (node 1.0.2) did not change it.

On the hackathon day the same contract was run against a *fresh* local devnet —
and there the proof transaction failed too, but with a **node** error instead of
a wallet panic: `Custom error: 117`. Looking that code up gave the real mechanism
in one line: the fee is zero, the balancing output is empty, the transaction is
not normalized. The asymmetry that had looked like a Merkle-root problem was a
read-only-vs-write problem. Setting a positive overhead fixed the devnet
immediately and, an hour later, preprod: deploy, issue and `proveDegree` landed
7/7 (contract `4719d2f6…d0769b`, proof tx `00eb3b27…d583ab`, 18.7 s).

The lesson I am keeping: when the *same* asymmetry shows up on two different
networks, suspect the mechanism they share before the code that differs.

## What I think the SDK should do

Any of these would have saved two days:

1. **Refuse a zero-fee balancing with a clear error** instead of submitting an
   unnormalized transaction (pre-GA) or panicking in `dryRunFee` (GA). Something
   like `Wallet.ZeroFee: the transaction's computed fee is 0; set additionalFeeOverhead`.
2. **Apply a minimal positive overhead by default** for call transactions, so
   read-only circuits work out of the box.
3. **Document** that circuits which do not write state can compute a zero fee on
   quiet chains, and that `additionalFeeOverhead` is the knob.

## Open question

Why the GA wallet path panics where the pre-GA node merely rejects is not
proven here. The fee dry-run consumes ledger parameters fetched from the live
network; the most plausible reading is that with preprod's parameters the
zero-fee path reaches an `unwrap`/division that the devnet's default parameters
do not. I did not go further than the workaround.

---

*Charles Tao (EchoForge), 2026-08-28. Part of the MLH Midnight Hackathon entry
[EchoCert on Midnight](README.md).*

// End-to-end proof of the whole thing against a local Midnight devnet:
// real PLONK proofs, real transactions, real chain reads.
//
// The local test harness (test/run.ts) proves the circuits are correct.
// This proves they survive the full pipeline.
//
// Prerequisites: local devnet + proof server running.
// Run: npm run e2e

import { WebSocket } from "ws";
// @ts-expect-error — the graphql client needs a global WebSocket in Node
globalThis.WebSocket = WebSocket;

import { createHash, randomBytes } from "node:crypto";
import * as Rx from "rxjs";
import pino from "pino";

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { deployContract, findDeployedContract, getPublicStates } from "@midnight-ntwrk/midnight-js-contracts";
import { DEFAULT_DUST_OPTIONS, MidnightWalletProvider, inMemoryPrivateStateProvider, type EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js";

import { Contract, ledger, pureCircuits } from "../build/contract/index.js";
import { witnesses, createPrivateState, type Credential, type EchoCertPrivateState, type HeldCredential } from "../src/witnesses.js";

// --- environment -----------------------------------------------------------

const ENV: EnvironmentConfiguration = {
  walletNetworkId: "undeployed" as any,
  networkId: "undeployed",
  indexer: "http://127.0.0.1:8088/api/v4/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v4/graphql/ws",
  node: "http://127.0.0.1:9944",
  nodeWS: "ws://127.0.0.1:9944",
  proofServer: "http://localhost:6300",
  faucet: undefined,
} as EnvironmentConfiguration;

setNetworkId(ENV.networkId);

// A circuit that only reads state — proveDegree does a checkRoot and nothing
// else — computes a fee of zero on an idle chain. The wallet then balances it
// with an empty DustActions, which the ledger rejects as not-normalized
// (node error 117). Paying a small deliberate overhead makes the fee real.
// Circuits that write state (issue) are unaffected, which is exactly the
// asymmetry observed: deploy and issue land, the read-only proof does not.
DEFAULT_DUST_OPTIONS.additionalFeeOverhead = 1_000_000n;

// The local devnet's genesis mint wallet. Source: midnightntwrk/midnight-local-dev.
const GENESIS_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

// testkit's wallet builder logs the seed at info level — keep it at warn.
const logger = pino({ level: "warn" });

// --- helpers ---------------------------------------------------------------

const field = (s: string): Uint8Array => new Uint8Array(createHash("sha256").update(s).digest());
const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

const timings: Record<string, number> = {};
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  console.log(`\n>>> ${label}`);
  try {
    const out = await fn();
    timings[label] = performance.now() - t0;
    console.log(`    [${(performance.now() - t0).toFixed(0)} ms] ${label}`);
    return out;
  } catch (e) {
    timings[`${label} (FAILED)`] = performance.now() - t0;
    console.log(`    [${(performance.now() - t0).toFixed(0)} ms] ${label} — FAILED`);
    throw e;
  }
}

let passed = 0;
let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? passed++ : failed++;
};

// --- the credential --------------------------------------------------------

const ISSUER_SECRET = new Uint8Array(randomBytes(32));
const chuckHeld: HeldCredential = {
  credential: {
    subject: field("did:echo:stickman-charles/chuck"),
    degree: field("BSc Computer Science"),
    issuer: field("Meridian Institute of Technology"),
    issuedYear: 2026n,
    anchor: field("cardano:echocert:anchor:chuck"),
  },
  nonce: new Uint8Array(randomBytes(32)),
};

// --- providers -------------------------------------------------------------

const zkConfigProvider = new NodeZkConfigProvider<
  "issue" | "proveDegree" | "proveIssuer" | "proveSubject" | "proveAnchor" | "proveIssuedYear"
>("build");
const proofProvider = httpClientProofProvider(ENV.proofServer, zkConfigProvider, { timeout: 600_000 });
const publicDataProvider = indexerPublicDataProvider(ENV.indexer, ENV.indexerWS);
const privateStateProvider = inMemoryPrivateStateProvider<string, EchoCertPrivateState>();

const providersFor = (wallet: MidnightWalletProvider): any => ({
  privateStateProvider,
  publicDataProvider,
  zkConfigProvider,
  proofProvider,
  walletProvider: wallet,
  midnightProvider: wallet,
});

const CompiledEchoCert = CompiledContract.make<any>("EchoCert", Contract as any).pipe(
  CompiledContract.withWitnesses(witnesses as any),
  CompiledContract.withCompiledFileAssets("build"),
);

// --- main ------------------------------------------------------------------

async function main() {
  const summary: Record<string, unknown> = {};

  console.log("\n========== 1. wallet ==========");
  const wallet = await timed("build genesis wallet", () => MidnightWalletProvider.build(logger, ENV, GENESIS_SEED));
  await timed("start wallet sync", async () => {
    await wallet.wallet.start(wallet.zswapSecretKeys, wallet.dustSecretKey);
  });
  const state: any = await timed("wait for synced state", () => wallet.wallet.waitForSyncedState());
  const dust: bigint = state.dust?.balance?.(new Date()) ?? 0n;
  const coins: number = state.dust?.availableCoins?.length ?? 0;
  console.log(`    DUST=${dust} spendableCoins=${coins}`);
  check("wallet has spendable DUST", dust > 0n && coins >= 1);

  console.log("\n========== 2. deploy ==========");
  const deployed = await timed("deployContract (real proof + submit + finalize)", () =>
    deployContract(providersFor(wallet), {
      compiledContract: CompiledEchoCert,
      privateStateId: "echocert-issuer",
      initialPrivateState: createPrivateState({ issuerSecret: ISSUER_SECRET }),
    } as any),
  );
  const contractAddress = (deployed as any).deployTxData.public.contractAddress;
  console.log(`    contract: ${contractAddress}`);
  summary.contractAddress = contractAddress;

  console.log("\n========== 3. issue ==========");
  await privateStateProvider.set("echocert-issuer", createPrivateState({ issuerSecret: ISSUER_SECRET, held: chuckHeld }));
  const issuerContract = await findDeployedContract(providersFor(wallet), {
    compiledContract: CompiledEchoCert,
    contractAddress,
    privateStateId: "echocert-issuer",
    initialPrivateState: createPrivateState({ issuerSecret: ISSUER_SECRET, held: chuckHeld }),
  } as any);
  const issueTx = await timed("issue() full pipeline", () => (issuerContract as any).callTx.issue());
  console.log(`    issue tx: ${issueTx.public.txId}`);
  summary.issueTxId = issueTx.public.txId;

  console.log("\n========== 4. proveDegree (holder) ==========");
  const holderContract = await findDeployedContract(providersFor(wallet), {
    compiledContract: CompiledEchoCert,
    contractAddress,
    privateStateId: "echocert-holder",
    initialPrivateState: createPrivateState({ held: chuckHeld }),
  } as any);
  const proveTx = await timed("proveDegree() full pipeline", () => (holderContract as any).callTx.proveDegree());
  const disclosed = hex(proveTx.private.result);
  console.log(`    disclosed: ${disclosed}`);
  console.log(`    tx: ${proveTx.public.txId}`);
  check("disclosed field is the degree, byte for byte", disclosed === hex(chuckHeld.credential.degree));
  summary.proveDegreeTxId = proveTx.public.txId;
  summary.disclosedDegree = disclosed;

  console.log("\n========== 5. chain read, no wallet ==========");
  const raw = await timed("plain GraphQL POST (no wallet, no SDK)", async () => {
    const res = await fetch(ENV.indexer, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `query($a: HexEncoded!) { contractAction(address: $a) { state } }`,
        variables: { a: contractAddress },
      }),
    });
    return res.json();
  });
  check("indexer returns contract state", ((raw as any).data?.contractAction?.state?.length ?? 0) > 0);

  const publicStates = await getPublicStates(indexerPublicDataProvider(ENV.indexer, ENV.indexerWS), contractAddress);
  const view = ledger((publicStates as any).contractState.data);
  console.log(`    issuedCount=${view.issuedCount} issuerKey=${hex(view.issuerKey).slice(0, 16)}…`);
  check("issuedCount is 1 on chain", view.issuedCount === 1n);

  console.log("\n========== 6. unlinkability ==========");
  const commitment = pureCircuits.commitmentOf(chuckHeld);
  const txRaw = async (id: string) => {
    const res = await fetch(ENV.indexer, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `query($id: HexEncoded!) { transactions(offset: { identifier: $id }) { hash raw contractActions { address state } } }`,
        variables: { id },
      }),
    });
    const j: any = await res.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data.transactions[0];
  };
  const issueRaw = await txRaw(issueTx.public.txId);
  const proveRaw = await txRaw(proveTx.public.txId);
  const c = hex(commitment).toLowerCase();
  check("commitment absent from issue tx bytes", !issueRaw.raw.toLowerCase().includes(c));
  check("commitment absent from proveDegree tx bytes", !proveRaw.raw.toLowerCase().includes(c));
  check("commitment absent from public ledger state", !(issueRaw.contractActions[0]?.state ?? "").toLowerCase().includes(c));
  summary.commitment = hex(commitment);

  console.log("\n========== timings ==========");
  console.log(JSON.stringify({ ...summary, timingsMs: Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Math.round(v)])) }, null, 2));
  console.log(`\n${failed === 0 ? "ALL" : failed + " FAILED /"} ${passed + failed} checks\n`);
  await wallet.stop?.().catch?.(() => {});
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});

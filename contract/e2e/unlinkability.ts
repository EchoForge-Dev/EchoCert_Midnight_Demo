// Unlinkability, as an experiment rather than a claim.
//
// "Two proofs by the same holder cannot be linked" is easy to assert and hard
// to believe. This script tries to break it, against a real chain:
//
//   1. one holder proves the same field three times     -> what do the three
//                                                          transactions share?
//   2. a different holder proves                        -> do they share it too?
//   3. the tree moves on, the first holder proves again -> does the shared
//                                                          value follow them?
//
// A value that follows the holder across (3) would be a linking identifier and
// the design would be broken. A value that two different holders share in (2)
// is a global constant and carries no identity.
//
// Run (local devnet + proof server): npm run unlinkability

import { WebSocket } from "ws";
// @ts-expect-error — node needs a global WebSocket for the graphql client
globalThis.WebSocket = WebSocket;

import { createHash, randomBytes } from "node:crypto";
import pino from "pino";

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { DEFAULT_DUST_OPTIONS, MidnightWalletProvider, inMemoryPrivateStateProvider, type EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js";

import { Contract, pureCircuits } from "../build/contract/index.js";
import { witnesses, createPrivateState, type EchoCertPrivateState, type HeldCredential } from "../src/witnesses.js";
import { DEMO_CREDENTIAL } from "../src/credential.js";

DEFAULT_DUST_OPTIONS.additionalFeeOverhead = 1_000_000n;

const INDEXER = "http://127.0.0.1:8088/api/v4/graphql";
const ENV = {
  walletNetworkId: "undeployed", networkId: "undeployed",
  indexer: INDEXER, indexerWS: "ws://127.0.0.1:8088/api/v4/graphql/ws",
  node: "http://127.0.0.1:9944", nodeWS: "ws://127.0.0.1:9944",
  proofServer: "http://localhost:6300", faucet: undefined,
} as unknown as EnvironmentConfiguration;
setNetworkId(ENV.networkId);

const field = (s: string) => new Uint8Array(createHash("sha256").update(s).digest());
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const rawTx = async (id: string): Promise<string> => {
  const r = await fetch(INDEXER, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: `query($id: HexEncoded!){ transactions(offset:{identifier:$id}){ raw } }`, variables: { id } }),
  });
  const j: any = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data.transactions[0].raw.toLowerCase();
};

/// Maximal runs of hex present in every one of the given transaction bodies.
function sharedRuns(bodies: string[], minBytes = 16): string[] {
  const min = minBytes * 2;
  const [first, ...rest] = bodies;
  const runs: string[] = [];
  for (let i = 0; i + min <= first.length; i++) {
    const window = first.slice(i, i + min);
    if (!rest.every((b) => b.includes(window))) continue;
    let end = i + min;
    while (end < first.length && rest.every((b) => b.includes(first.slice(i, end + 1)))) end++;
    const run = first.slice(i, end);
    if (!runs.some((r) => r.includes(run))) runs.push(run);
  }
  return [...new Set(runs)].sort((a, b) => b.length - a.length);
}

async function main() {
  const wallet = await MidnightWalletProvider.build(pino({ level: "silent" }) as any, ENV,
    "0000000000000000000000000000000000000000000000000000000000000001");
  await wallet.wallet.start(wallet.zswapSecretKeys, wallet.dustSecretKey);
  await wallet.wallet.waitForSyncedState();

  const zk = new NodeZkConfigProvider<any>("build");
  const providers: any = {
    privateStateProvider: inMemoryPrivateStateProvider<string, EchoCertPrivateState>(),
    publicDataProvider: indexerPublicDataProvider(ENV.indexer, ENV.indexerWS),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(ENV.proofServer, zk, { timeout: 600_000 }),
    walletProvider: wallet, midnightProvider: wallet,
  };
  const Compiled = CompiledContract.make<any>("EchoCert", Contract as any).pipe(
    CompiledContract.withWitnesses(witnesses as any), CompiledContract.withCompiledFileAssets("build"));

  const issuerSecret = new Uint8Array(randomBytes(32));
  const chuck: HeldCredential = { credential: DEMO_CREDENTIAL, nonce: new Uint8Array(randomBytes(32)) };
  const dalia: HeldCredential = {
    credential: { ...DEMO_CREDENTIAL, subject: field("did:echo:dalia"), degree: field("MSc Cryptography") },
    nonce: new Uint8Array(randomBytes(32)),
  };

  console.log("\n== setting up a fresh registry ==");
  const deployed: any = await deployContract(providers, {
    compiledContract: Compiled, privateStateId: "issuer",
    initialPrivateState: createPrivateState({ issuerSecret }),
  } as any);
  const address = deployed.deployTxData.public.contractAddress;
  console.log(`  contract ${address}`);

  const issue = async (held: HeldCredential, id: string) => {
    const c: any = await findDeployedContract(providers, {
      compiledContract: Compiled, contractAddress: address, privateStateId: id,
      initialPrivateState: createPrivateState({ issuerSecret, held }),
    } as any);
    return (await c.callTx.issue()).public.txId;
  };
  const proveAs = async (held: HeldCredential, id: string) => {
    const c: any = await findDeployedContract(providers, {
      compiledContract: Compiled, contractAddress: address, privateStateId: id,
      initialPrivateState: createPrivateState({ held }),
    } as any);
    return (await c.callTx.proveDegree()).public.txId;
  };

  await issue(chuck, "issue-chuck");
  console.log("  issued Chuck's credential");

  console.log("\n== 1. the same holder proves three times ==");
  const chuckTxs: string[] = [];
  for (let i = 0; i < 3; i++) {
    chuckTxs.push(await proveAs(chuck, `chuck-${i}`));
    console.log(`  proof ${i + 1}: ${chuckTxs[i]}`);
  }
  const chuckBodies = await Promise.all(chuckTxs.map(rawTx));
  const sharedByChuck = sharedRuns(chuckBodies);
  console.log(`  runs of >=16 bytes common to all three: ${sharedByChuck.length}`);
  for (const r of sharedByChuck.slice(0, 4)) console.log(`    ${r.length / 2} bytes  ${r.slice(0, 56)}…`);

  const commitment = hex(pureCircuits.commitmentOf(chuck));
  check("the credential's commitment appears in none of them",
    !chuckBodies.some((b) => b.includes(commitment)));

  console.log("\n== 2. a different holder proves against the same root ==");
  await issue(dalia, "issue-dalia");
  const daliaTx = await proveAs(dalia, "dalia-0");
  const daliaBody = await rawTx(daliaTx);
  console.log(`  proof: ${daliaTx}`);

  // Chuck's three proofs were made before Dalia was issued, so they used an
  // older root. Have Chuck prove again now, against the same root Dalia used.
  const chuckAgainTx = await proveAs(chuck, "chuck-again");
  const chuckAgainBody = await rawTx(chuckAgainTx);
  console.log(`  Chuck proves again on the new root: ${chuckAgainTx}`);

  const crossHolder = sharedRuns([chuckAgainBody, daliaBody]);
  const biggestCross = crossHolder[0]?.length ? crossHolder[0].length / 2 : 0;
  const biggestSame = sharedByChuck[0]?.length ? sharedByChuck[0].length / 2 : 0;
  console.log(`  longest run shared by TWO DIFFERENT holders: ${biggestCross} bytes`);
  console.log(`  longest run shared by ONE holder's three proofs: ${biggestSame} bytes`);
  check("two different holders share at least as much as one holder does with themselves",
    biggestCross >= biggestSame,
    "so a shared run is evidence of a common root and circuit, not of a common person");

  console.log("\n== 3. does anything follow the holder across a root change? ==");
  // Any run the earlier three shared that is NOT explained by the old root
  // would have to reappear once Chuck proves again. Check every one of them.
  const followed = sharedByChuck.filter((r) => chuckAgainBody.includes(r));
  const dropped = sharedByChuck.filter((r) => !chuckAgainBody.includes(r));
  console.log(`  runs that survived into Chuck's later proof: ${followed.length}`);
  console.log(`  runs that vanished when the root changed:    ${dropped.length}`);
  for (const r of followed) {
    const alsoInDalia = daliaBody.includes(r);
    console.log(`    ${r.length / 2} bytes — also in a different holder's proof? ${alsoInDalia ? "yes" : "NO"}`);
    check(`a run that follows the holder is also present for other holders (${r.length / 2} bytes)`, alsoInDalia,
      alsoInDalia ? "global constant" : "THIS WOULD BE A LINKING IDENTIFIER");
  }

  console.log(`\n${failed === 0 ? "NOTHING LINKS THE PROOFS" : failed + " CHECK(S) FAILED"}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

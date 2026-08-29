// The local prover behind the demo's LIVE mode.
//
// Holds the compiled circuits, a funded wallet and one issued credential, and
// exposes two endpoints the demo page calls:
//
//   GET  /health   the page probes this to decide LIVE vs REPLAY
//   POST /prove    { field } -> generates a real PLONK proof for that field
//                  and submits the transaction, returning what landed
//
// Deployment state is cached in .deployment.json so a restart reconnects to
// the existing contract instead of deploying a new one.
//
// Run against the local devnet:  npm run prover
// Run against preprod:           MIDNIGHT_NETWORK=preprod MIDNIGHT_WALLET_SEED=... npm run prover

import { WebSocket } from "ws";
// @ts-expect-error — the graphql client needs a global WebSocket in Node
globalThis.WebSocket = WebSocket;

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import pino from "pino";

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { DEFAULT_DUST_OPTIONS, MidnightWalletProvider, inMemoryPrivateStateProvider, type EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js";

import { Contract } from "../build/contract/index.js";
import { witnesses, createPrivateState, type EchoCertPrivateState, type HeldCredential } from "../src/witnesses.js";
import { CARDANO_ANCHOR, DEMO_CREDENTIAL, DEMO_PLAINTEXT } from "../src/credential.js";

// A read-only circuit computes a zero fee on an idle chain, which the ledger
// rejects as not-normalized. See e2e/devnet.ts for the full explanation.
DEFAULT_DUST_OPTIONS.additionalFeeOverhead = 1_000_000n;

const PORT = Number(process.env.PORT ?? 8787);
const NETWORK = process.env.MIDNIGHT_NETWORK ?? "undeployed";
const STATE_FILE = new URL(`./.deployment-${NETWORK}.json`, import.meta.url);

const DEVNET: EnvironmentConfiguration = {
  walletNetworkId: "undeployed", networkId: "undeployed",
  indexer: "http://127.0.0.1:8088/api/v4/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v4/graphql/ws",
  node: "http://127.0.0.1:9944", nodeWS: "ws://127.0.0.1:9944",
  proofServer: "http://localhost:6300", faucet: undefined,
} as unknown as EnvironmentConfiguration;

const PREPROD: EnvironmentConfiguration = {
  walletNetworkId: "preprod", networkId: "preprod",
  indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
  indexerWS: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  node: "https://rpc.preprod.midnight.network", nodeWS: "wss://rpc.preprod.midnight.network",
  proofServer: "http://localhost:6300", faucet: undefined,
} as unknown as EnvironmentConfiguration;

const ENV = NETWORK === "preprod" ? PREPROD : DEVNET;
setNetworkId(ENV.networkId);

// devnet has a known genesis wallet; preprod needs a funded one from the env.
const SEED = NETWORK === "preprod"
  ? process.env.MIDNIGHT_WALLET_SEED?.trim()
  : "0000000000000000000000000000000000000000000000000000000000000001";
if (!SEED) {
  console.error("MIDNIGHT_WALLET_SEED is required when MIDNIGHT_NETWORK=preprod");
  process.exit(1);
}

const logger = pino({ level: "warn" });
const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

// Deterministic per deployment, so a restart keeps proving the same diploma.
function credentialFor(nonceHex: string): HeldCredential {
  return { credential: DEMO_CREDENTIAL, nonce: new Uint8Array(Buffer.from(nonceHex, "hex")) };
}

const CIRCUITS = ["proveDegree", "proveIssuer", "proveSubject", "proveAnchor", "proveIssuedYear"] as const;
type CircuitName = (typeof CIRCUITS)[number];
const FIELD_TO_CIRCUIT: Record<string, CircuitName> = {
  DEGREE: "proveDegree", ISSUER: "proveIssuer", SUBJECT: "proveSubject",
  ANCHOR: "proveAnchor", ISSUED_YEAR: "proveIssuedYear",
};

async function main() {
  const zkConfigProvider = new NodeZkConfigProvider<CircuitName | "issue">("build");
  const rawProofProvider = httpClientProofProvider(ENV.proofServer, zkConfigProvider, { timeout: 600_000 });
  // callTx is opaque until the transaction has landed, but the demo wants to
  // show the moment proving finished — that is the shot whose timing varies.
  // Wrapping proveTx exposes that instant without touching the pipeline.
  let provedHook: ((ms: number) => void) | null = null;
  const proofProvider = {
    proveTx: async (...args: any[]) => {
      const t0 = performance.now();
      const out = await (rawProofProvider as any).proveTx(...args);
      provedHook?.(Math.round(performance.now() - t0));
      return out;
    },
  };
  let inFlight = false;
  const publicDataProvider = indexerPublicDataProvider(ENV.indexer, ENV.indexerWS);
  const privateStateProvider = inMemoryPrivateStateProvider<string, EchoCertPrivateState>();

  const Compiled = CompiledContract.make<any>("EchoCert", Contract as any).pipe(
    CompiledContract.withWitnesses(witnesses as any),
    CompiledContract.withCompiledFileAssets("build"),
  );

  console.log(`[prover] network=${NETWORK} — building wallet…`);
  let wallet: MidnightWalletProvider;
  if (NETWORK === "preprod") {
    // Preprod cold syncs OOM; restore from the resumable sync's checkpoints.
    const { ZswapSecretKeys, DustSecretKey } = await import("@midnight-ntwrk/midnight-js-protocol/ledger");
    const { buildOrRestoreFacade } = await import("./sync-preprod.js");
    const { facade, seeds, keystore } = await buildOrRestoreFacade(SEED);
    wallet = await MidnightWalletProvider.withWallet(
      logger, ENV, facade as any,
      ZswapSecretKeys.fromSeed(seeds.shielded), DustSecretKey.fromSeed(seeds.dust), keystore as any,
    );
  } else {
    wallet = await MidnightWalletProvider.build(logger, ENV, SEED);
  }
  await wallet.wallet.start(wallet.zswapSecretKeys, wallet.dustSecretKey);
  console.log("[prover] syncing wallet (a cold preprod sync takes over an hour)…");
  await wallet.wallet.waitForSyncedState();
  console.log("[prover] wallet synced");

  const providers: any = {
    privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider,
    walletProvider: wallet, midnightProvider: wallet,
  };

  let deployment: { contractAddress: string; issuerSecret: string; nonce: string; issueTxId: string };

  if (existsSync(STATE_FILE)) {
    deployment = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    console.log(`[prover] reusing contract ${deployment.contractAddress}`);
  } else {
    const issuerSecret = new Uint8Array(randomBytes(32));
    const nonce = new Uint8Array(randomBytes(32));
    const held = credentialFor(hex(nonce));

    console.log("[prover] deploying…");
    const deployed = await deployContract(providers, {
      compiledContract: Compiled,
      privateStateId: "issuer",
      initialPrivateState: createPrivateState({ issuerSecret }),
    } as any);
    const contractAddress = (deployed as any).deployTxData.public.contractAddress;

    console.log("[prover] issuing the credential…");
    const issuer = await findDeployedContract(providers, {
      compiledContract: Compiled, contractAddress, privateStateId: "issuer",
      initialPrivateState: createPrivateState({ issuerSecret, held }),
    } as any);
    const issueTx = await (issuer as any).callTx.issue();

    deployment = {
      contractAddress,
      issuerSecret: hex(issuerSecret),
      nonce: hex(nonce),
      issueTxId: issueTx.public.txId,
    };
    // Contains an issuer secret: readable only by this user.
    writeFileSync(STATE_FILE, JSON.stringify(deployment, null, 2), { mode: 0o600 });
    console.log(`[prover] deployed ${contractAddress}`);
  }

  const held = credentialFor(deployment.nonce);
  const holder = await findDeployedContract(providers, {
    compiledContract: Compiled,
    contractAddress: deployment.contractAddress,
    privateStateId: "holder",
    initialPrivateState: createPrivateState({ held }),
  } as any);

  // The deployed page (https, public origin) probes this loopback service to
  // decide LIVE vs REPLAY. Chrome's Private Network Access rules only let a
  // public page reach localhost if the local server opts in with the
  // allow-private-network header on the preflight — so "run the repo and the
  // deployed page goes live" holds.
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-private-network": "true",
    "content-type": "application/json",
  };

  createServer(async (req, res) => {
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();

    if (req.url === "/health") {
      return res.writeHead(200, cors).end(JSON.stringify({
        status: "ok", network: NETWORK,
        contractAddress: deployment.contractAddress,
        issueTxId: deployment.issueTxId,
        cardanoAnchor: CARDANO_ANCHOR,
        plaintext: DEMO_PLAINTEXT,
      }));
    }

    if (req.url === "/prove" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const wanted = (JSON.parse(body || "{}").field ?? "DEGREE") as string;
      const circuit = FIELD_TO_CIRCUIT[wanted];
      if (!circuit) return res.writeHead(400, cors).end(JSON.stringify({ error: `unknown field ${wanted}` }));
      if (inFlight) return res.writeHead(409, cors).end(JSON.stringify({ error: "a proof is already in flight" }));

      // With `Accept: text/event-stream` the phases stream as they happen:
      // proving → proved (with the real proving time) → landed. Plain clients
      // still get one JSON document at the end.
      const sse = (req.headers.accept ?? "").includes("text/event-stream");
      const send = (obj: unknown) => { if (sse) res.write(`data: ${JSON.stringify(obj)}\n\n`); };
      if (sse) res.writeHead(200, { ...cors, "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });

      inFlight = true;
      console.log(`[prover] ${circuit}…`);
      const t0 = performance.now();
      let proveMs: number | null = null;
      provedHook = (ms) => { proveMs = ms; console.log(`[prover] ${circuit} proved in ${ms}ms`); send({ phase: "proved", proveMs: ms }); };
      send({ phase: "proving" });
      try {
        const tx = await (holder as any).callTx[circuit]();
        const ms = Math.round(performance.now() - t0);
        const raw = tx.private.result;
        console.log(`[prover] ${circuit} landed in ${ms}ms — ${tx.public.txId}`);
        const result = {
          phase: "landed",
          field: wanted,
          disclosed: typeof raw === "bigint" ? raw.toString() : hex(raw),
          proveTxId: tx.public.txId,
          contractAddress: deployment.contractAddress,
          blockHeight: tx.public.blockHeight ?? null,
          proveMs,
          totalMs: ms,
          network: NETWORK,
        };
        if (sse) { send(result); return res.end(); }
        return res.writeHead(200, cors).end(JSON.stringify(result));
      } catch (e) {
        const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
        console.error(`[prover] ${circuit} failed: ${msg}`);
        if (sse) { send({ phase: "failed", error: msg }); return res.end(); }
        return res.writeHead(500, cors).end(JSON.stringify({ error: msg }));
      } finally {
        provedHook = null;
        inFlight = false;
      }
    }

    res.writeHead(404, cors).end(JSON.stringify({ error: "not found" }));
  }).listen(PORT, () => {
    console.log(`[prover] ready on http://localhost:${PORT} — the demo page will switch to LIVE`);
  });
}

main().catch((e) => { console.error("[prover] fatal:", e); process.exit(1); });

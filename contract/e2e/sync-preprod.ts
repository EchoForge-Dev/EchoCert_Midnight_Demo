// Resumable preprod wallet sync.
//
// A cold preprod sync has crashed Node three times today (heap OOM at 4, 8 and
// 10 GB) — the chain is ~75k blocks longer than at the rehearsal, and one
// uninterrupted sync no longer fits in memory. So: checkpoint instead.
//
// Every CHECKPOINT_MS the three wallets' states are serialized to disk
// (atomically — tmp file, then rename). On restart, if checkpoints exist, the
// wallets are restored from them and the sync continues from where it died
// instead of from genesis. Each attempt's memory starts from the checkpoint's
// footprint, not from an ever-growing stream, so progress is monotone even if
// every single run OOMs eventually.
//
// The run is finished when the unshielded and dust wallets are fully synced
// and spendable DUST exists — this contract never touches shielded coins, so
// shielded completeness is recorded but not waited for.
//
// Run:  MIDNIGHT_WALLET_SEED=... npx tsx e2e/sync-preprod.ts
// Loop: e2e/sync-preprod.sh (restarts on crash until READY)

import { WebSocket } from "ws";
// @ts-expect-error — node needs a global WebSocket for the graphql client
globalThis.WebSocket = WebSocket;

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Rx from "rxjs";

import { LedgerParameters, ZswapSecretKeys, DustSecretKey } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {
  InMemoryTransactionHistoryStorage, WalletEntrySchema, mergeWalletEntries,
  ShieldedWallet, UnshieldedWallet, PublicKey, DustWallet, WalletFacade, createKeystore,
} from "@midnight-ntwrk/wallet-sdk";
import { WalletSeeds } from "@midnight-ntwrk/testkit-js";

const SEED = process.env.MIDNIGHT_WALLET_SEED?.trim();
if (!SEED) { console.error("MIDNIGHT_WALLET_SEED is not set"); process.exit(1); }

// fileURLToPath, not .pathname — the repo path contains a space, and pathname
// would hand back %20, silently checkpointing into a wrong directory.
const STATE_DIR = fileURLToPath(new URL("./.wallet-state-preprod/", import.meta.url));
const CHECKPOINT_MS = 90_000;
const READY_FLAG = join(STATE_DIR, "READY");

// Mirrors testkit's mapEnvironmentToConfiguration for the preprod endpoints.
const baseConfig = () => ({
  indexerClientConnection: {
    indexerHttpUrl: "https://indexer.preprod.midnight.network/api/v4/graphql",
    indexerWsUrl: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  },
  provingServerUrl: new URL("http://localhost:6300"),
  networkId: "preprod",
  relayURL: new URL("wss://rpc.preprod.midnight.network"),
  txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
  costParameters: { feeBlocksMargin: 5 },
});

// The read-only-circuit fee fix rides along so anything restored from these
// checkpoints balances with a real fee. See e2e/devnet.ts.
const dustConfig = () => ({
  ...baseConfig(),
  costParameters: {
    ledgerParams: LedgerParameters.initialParameters(),
    additionalFeeOverhead: 1_000_000n,
    feeBlocksMargin: 5,
  },
});

const ckptPath = (name: string) => join(STATE_DIR, `${name}.state`);
const hasCkpt = (name: string) => existsSync(ckptPath(name));
const readCkpt = (name: string) => readFileSync(ckptPath(name), "utf8");
const writeCkpt = (name: string, data: string) => {
  const tmp = ckptPath(name) + ".tmp";
  writeFileSync(tmp, data);
  renameSync(tmp, ckptPath(name)); // atomic on the same filesystem
};

export async function buildOrRestoreFacade(seedHex: string) {
  const seeds = WalletSeeds.fromMasterSeed(seedHex);
  const keystore = createKeystore(seeds.unshielded, "preprod");
  const resuming = hasCkpt("shielded") && hasCkpt("unshielded") && hasCkpt("dust");
  console.log(`[sync] ${resuming ? "RESUMING from checkpoints" : "cold start — no checkpoints yet"}`);

  const Shielded = ShieldedWallet(baseConfig() as any);
  const Unshielded = UnshieldedWallet(baseConfig() as any);
  const Dust = DustWallet(dustConfig() as any);

  const shielded = resuming
    ? Shielded.restore(readCkpt("shielded"))
    : Shielded.startWithSeed(seeds.shielded);
  const unshielded = resuming
    ? Unshielded.restore(readCkpt("unshielded"))
    : Unshielded.startWithPublicKey(PublicKey.fromKeyStore(keystore));
  const dust = resuming
    ? Dust.restore(readCkpt("dust"))
    : Dust.startWithSeed(seeds.dust, LedgerParameters.initialParameters().dust);

  const facade = await WalletFacade.init({
    configuration: baseConfig() as any,
    shielded: () => shielded as any,
    unshielded: () => unshielded as any,
    dust: () => dust as any,
  });
  return { facade, seeds, keystore };
}

async function main() {
  mkdirSync(STATE_DIR, { recursive: true });
  const { facade, seeds } = await buildOrRestoreFacade(SEED);

  await facade.start(ZswapSecretKeys.fromSeed(seeds.shielded), DustSecretKey.fromSeed(seeds.dust));
  console.log("[sync] started; checkpointing every", CHECKPOINT_MS / 1000, "s");

  let saving = false;
  const save = async (label: string) => {
    if (saving) return; // a slow save must never overlap the next one
    saving = true;
    try {
      const t0 = performance.now();
      writeCkpt("shielded", await (facade as any).shielded.serializeState());
      writeCkpt("unshielded", await (facade as any).unshielded.serializeState());
      writeCkpt("dust", await (facade as any).dust.serializeState());
      console.log(`[sync] checkpoint (${label}) in ${(performance.now() - t0).toFixed(0)} ms`);
    } catch (e) {
      console.log(`[sync] checkpoint failed (${label}): ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    } finally {
      saving = false;
    }
  };

  const ckptTimer = setInterval(() => void save("periodic"), CHECKPOINT_MS);

  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 20_000));
    const s: any = await Rx.firstValueFrom(facade.state().pipe(Rx.take(1)));
    const un = s.unshielded?.progress?.isStrictlyComplete?.() === true;
    const du = s.dust?.state?.progress?.isStrictlyComplete?.() === true;
    const sh = s.shielded?.state?.progress?.isStrictlyComplete?.() === true;
    const dust: bigint = s.dust?.balance?.(new Date()) ?? 0n;
    const coins: number = s.dust?.availableCoins?.length ?? 0;
    const heapMB = Math.round(process.memoryUsage().heapUsed / 1048576);
    console.log(`[sync] +${((Date.now() - t0) / 60000).toFixed(1)}min shielded=${sh} unshielded=${un} dust=${du} DUST=${dust} coins=${coins} heap=${heapMB}MB`);

    if (un && du && dust > 0n && coins >= 1) {
      clearInterval(ckptTimer);
      await save("final");
      writeFileSync(READY_FLAG, JSON.stringify({ finishedAt: new Date().toISOString(), shieldedComplete: sh, dust: dust.toString(), coins }, null, 2));
      console.log("[sync] READY — unshielded + dust synced, spendable DUST present");
      process.exit(0);
    }
  }
}

// Only run the sync loop when invoked directly, so e2e scripts can import
// buildOrRestoreFacade without starting anything.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) {
  main().catch((e) => { console.error("[sync] FATAL:", e); process.exit(1); });
}

// The credential the demo proves things about.
//
// Every field is a 32-byte value the DApp computes off-chain, so the circuit
// only ever handles fixed-width data.
//
// ANCHOR is not a made-up hash. It is the asset name of a real EchoCert
// credential minted on Cardano mainnet on 2026-04-11 — which is itself the
// SHA-256 of that credential's contents, and therefore already exactly 32
// bytes. That is the join between the two lines: the public Cardano record is
// the thing this private Midnight proof is about.
//
//   policy  32fd4d6013971be1074d83dc9b4ae3f9512184f10bfad9d1b8e7a158
//   asset   ea51c2a4c15251e0b663af71439a21ff4a2ea3b762c4efd3a044afb258bed978
//   mint tx 1e44e51c4dd9ba071a115c3c0c964ad6777d77d10b21001025dfc052ed4238fc

import { createHash } from "node:crypto";
import type { Credential } from "./witnesses.js";

/// Fields that are plain text off-chain become fixed-width by hashing.
export const field = (s: string): Uint8Array => new Uint8Array(createHash("sha256").update(s).digest());

const fromHex = (h: string): Uint8Array => new Uint8Array(Buffer.from(h, "hex"));

export const CARDANO_ANCHOR = {
  policyId: "32fd4d6013971be1074d83dc9b4ae3f9512184f10bfad9d1b8e7a158",
  assetName: "ea51c2a4c15251e0b663af71439a21ff4a2ea3b762c4efd3a044afb258bed978",
  mintTx: "1e44e51c4dd9ba071a115c3c0c964ad6777d77d10b21001025dfc052ed4238fc",
  label: "EchoCert: Stickman Charles",
  mintedOn: "2026-04-11",
} as const;

export const DEMO_CREDENTIAL: Credential = {
  subject: field("did:echo:stickman-charles/chuck"),
  degree: field("BSc Computer Science"),
  issuer: field("Meridian Institute of Technology"),
  issuedYear: 2026n,
  anchor: fromHex(CARDANO_ANCHOR.assetName),
};

/// The plain-text values behind the hashes, for anything that needs to show a
/// human what is being proved.
export const DEMO_PLAINTEXT = {
  SUBJECT: "did:echo:stickman-charles/chuck",
  DEGREE: "BSc Computer Science",
  ISSUER: "Meridian Institute of Technology",
  ISSUED_YEAR: "2026",
  ANCHOR: CARDANO_ANCHOR.assetName,
} as const;

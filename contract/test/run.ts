// Local execution of every circuit against the JavaScript runtime.
// No proof server, no network: this is the fast correctness harness.
//
// Run: npm test

import { createHash, randomBytes } from "node:crypto";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";

import { Contract, ledger, pureCircuits } from "../build/contract/index.js";
import {
  witnesses,
  createPrivateState,
  MissingPrivateStateError,
  CredentialNotIssuedError,
  type Credential,
  type EchoCertPrivateState,
  type HeldCredential,
} from "../src/witnesses.js";

// --- helpers ---------------------------------------------------------------

/// Fields are hashed off-chain so the circuit only handles fixed-width data.
const field = (s: string): Uint8Array => new Uint8Array(createHash("sha256").update(s).digest());
const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");
const nonce = (): Uint8Array => new Uint8Array(randomBytes(32));

const COIN_PUBLIC_KEY = "0".repeat(64);
const ADDRESS = sampleContractAddress();

let passed = 0;
let failed = 0;

const check = (label: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? passed++ : failed++;
};

/// Assert that a circuit call fails, and that it fails for the stated reason.
const checkRejects = (label: string, fn: () => unknown, expect: (e: unknown) => boolean, want: string) => {
  try {
    fn();
    check(label, false, "call SUCCEEDED — it must not");
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    check(label, expect(e), `rejected: ${msg}`);
    if (!expect(e)) console.log(`        expected ${want}`);
  }
};

const messageIncludes = (needle: string) => (e: unknown) =>
  e instanceof Error && (e.message.includes(needle) || (e.cause instanceof Error && e.cause.message.includes(needle)));

// --- the world -------------------------------------------------------------

const ISSUER_SECRET = new Uint8Array(randomBytes(32));
const WRONG_SECRET = new Uint8Array(randomBytes(32));

const chuckNonce = nonce();
const chuck: Credential = {
  subject: field("did:echo:stickman-charles/chuck"),
  degree: field("BSc Computer Science"),
  issuer: field("Meridian Institute of Technology"),
  issuedYear: 2026n,
  anchor: field("cardano:echocert:anchor:chuck"),
};
const chuckHeld: HeldCredential = { credential: chuck, nonce: chuckNonce };

// A second credential, issued later, to prove that issuing does not
// invalidate a path already in someone's hands.
const daliaHeld: HeldCredential = {
  credential: { ...chuck, subject: field("did:echo:dalia"), degree: field("MSc Cryptography") },
  nonce: nonce(),
};

const contract = new Contract<EchoCertPrivateState>(witnesses);

const contextFor = (state: any, ps: EchoCertPrivateState): CircuitContext<EchoCertPrivateState> =>
  createCircuitContext(ADDRESS, COIN_PUBLIC_KEY, state, ps);

// --- 1. deployment ---------------------------------------------------------

console.log("\n== deployment ==");

const issuerState = createPrivateState({ issuerSecret: ISSUER_SECRET });
const deployed = contract.initialState(createConstructorContext(issuerState, COIN_PUBLIC_KEY));
// initialState() hands back a ContractState; ledger() wants its ChargedState.
let chainState: any = deployed.currentContractState.data;

const initialLedger = ledger(chainState);
check("issuerKey is published on deploy", initialLedger.issuerKey.length === 32);
check("registry starts empty", initialLedger.issuedCount === 0n);

// A contract deployed without a real secret would be forgeable by anyone,
// so the witness must refuse rather than substitute a placeholder.
checkRejects(
  "deploying with no issuer secret is refused locally",
  () => contract.initialState(createConstructorContext(createPrivateState(), COIN_PUBLIC_KEY)),
  (e) => e instanceof MissingPrivateStateError || messageIncludes("issuerSecret")(e),
  "MissingPrivateStateError",
);

// --- 2. issuance -----------------------------------------------------------

console.log("\n== issuance ==");

const issuerWithCredential = createPrivateState({ issuerSecret: ISSUER_SECRET, held: chuckHeld });
const issued = contract.circuits.issue(contextFor(chainState, issuerWithCredential));
// After a circuit run the evolved state lives on the query context.
chainState = issued.context.currentQueryContext.state;

const afterIssue = ledger(chainState);
check("issuedCount incremented", afterIssue.issuedCount === 1n);

const commitment = pureCircuits.commitmentOf(chuckHeld);
check("commitment is a 32-byte value", commitment.length === 32);
check("commitment is in the tree", afterIssue.credentials.findPathForLeaf(commitment) !== undefined);

checkRejects(
  "issuing with the wrong issuer secret is refused",
  () =>
    contract.circuits.issue(
      contextFor(chainState, createPrivateState({ issuerSecret: WRONG_SECRET, held: daliaHeld })),
    ),
  messageIncludes("caller is not the issuer"),
  "assert: caller is not the issuer",
);

// --- 3. selective disclosure ----------------------------------------------

console.log("\n== selective disclosure (holder has no issuer secret) ==");

const holderState = createPrivateState({ held: chuckHeld });

const disclosures: [string, () => any, Uint8Array | bigint][] = [
  ["proveDegree", () => contract.circuits.proveDegree(contextFor(chainState, holderState)), chuck.degree],
  ["proveIssuer", () => contract.circuits.proveIssuer(contextFor(chainState, holderState)), chuck.issuer],
  ["proveSubject", () => contract.circuits.proveSubject(contextFor(chainState, holderState)), chuck.subject],
  ["proveAnchor", () => contract.circuits.proveAnchor(contextFor(chainState, holderState)), chuck.anchor],
  ["proveIssuedYear", () => contract.circuits.proveIssuedYear(contextFor(chainState, holderState)), chuck.issuedYear],
];

for (const [name, run, expected] of disclosures) {
  const out = run().result;
  const ok = typeof expected === "bigint" ? out === expected : hex(out as Uint8Array) === hex(expected);
  check(`${name} reveals exactly its own field`, ok, typeof out === "bigint" ? String(out) : hex(out).slice(0, 16) + "…");
}

// --- 4. forgery attempts ---------------------------------------------------

console.log("\n== forgery attempts ==");

checkRejects(
  "a credential that was never issued cannot be proved",
  () =>
    contract.circuits.proveDegree(
      contextFor(chainState, createPrivateState({ held: { credential: { ...chuck, subject: field("did:echo:mallory") }, nonce: nonce() } })),
    ),
  (e) => e instanceof CredentialNotIssuedError || messageIncludes("never issued")(e),
  "CredentialNotIssuedError",
);

checkRejects(
  "the right credential with the wrong nonce cannot be proved",
  () => contract.circuits.proveDegree(contextFor(chainState, createPrivateState({ held: { credential: chuck, nonce: nonce() } }))),
  (e) => e instanceof CredentialNotIssuedError || messageIncludes("never issued")(e),
  "CredentialNotIssuedError",
);

// The attack the binding assert exists to stop: take a genuine path that is
// really in the tree, pair it with a credential you invented.
const forgedHeld: HeldCredential = { credential: { ...chuck, degree: field("PhD Astrophysics") }, nonce: chuckNonce };
const stolenPathWitnesses = {
  ...witnesses,
  // Hand the circuit Chuck's real path while the credential says PhD.
  credentialPath: ({ ledger: l, privateState }: any) => [privateState, l.credentials.findPathForLeaf(commitment)!],
};
const forgerContract = new Contract<EchoCertPrivateState>(stolenPathWitnesses as any);

checkRejects(
  "a forged credential carrying someone else's genuine path is rejected",
  () => forgerContract.circuits.proveDegree(contextFor(chainState, createPrivateState({ held: forgedHeld }))),
  messageIncludes("path does not correspond"),
  "assert: path does not correspond to this credential",
);

// --- 5. historic roots -----------------------------------------------------

console.log("\n== historic roots (why HistoricMerkleTree, not MerkleTree) ==");

const issuedSecond = contract.circuits.issue(
  contextFor(chainState, createPrivateState({ issuerSecret: ISSUER_SECRET, held: daliaHeld })),
);
chainState = issuedSecond.context.currentQueryContext.state;
check("a second credential was issued", ledger(chainState).issuedCount === 2n);

const stillValid = contract.circuits.proveDegree(contextFor(chainState, holderState));
check(
  "the first holder can still prove after a later issuance",
  hex(stillValid.result) === hex(chuck.degree),
);

// --- summary ---------------------------------------------------------------

console.log(`\n${failed === 0 ? "ALL" : failed + " FAILED /"} ${passed + failed} checks — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);

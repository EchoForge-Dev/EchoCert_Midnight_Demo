// Witness implementations — the holder's and issuer's side of the contract.
//
// Everything here runs on the user's own machine. Return values feed the
// circuit as private inputs and never leave the device in the clear.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits, type Ledger } from "../build/contract/index.js";

export type Credential = {
  subject: Uint8Array;
  degree: Uint8Array;
  issuer: Uint8Array;
  issuedYear: bigint;
  anchor: Uint8Array;
};

export type HeldCredential = {
  credential: Credential;
  nonce: Uint8Array;
};

/// What a participant keeps locally. Both fields are nullable by design:
/// an issuer has no credential to prove, a holder has no issuing secret,
/// and neither role may fall back to a placeholder value.
export type EchoCertPrivateState = {
  readonly issuerSecret: Uint8Array | null;
  readonly held: HeldCredential | null;
};

export const createPrivateState = (
  init: Partial<EchoCertPrivateState> = {},
): EchoCertPrivateState => ({
  issuerSecret: init.issuerSecret ?? null,
  held: init.held ?? null,
});

/// Thrown when a circuit asks for private data this participant does not
/// have. Failing here is the point: it happens locally, before proving, so
/// nothing is sent and nothing is leaked.
export class MissingPrivateStateError extends Error {
  constructor(readonly field: "issuerSecret" | "held") {
    super(`no ${field} in this private state — this participant cannot run that circuit`);
    this.name = "MissingPrivateStateError";
  }
}

export class CredentialNotIssuedError extends Error {
  constructor() {
    super("no Merkle path for this credential — it was never issued, or the nonce is wrong");
    this.name = "CredentialNotIssuedError";
  }
}

/// NEVER give this a default. A zero-byte secret derives an issuer key that
/// anyone can recompute, which would let anyone issue credentials against a
/// contract deployed without a real key.
const requireIssuerSecret = (ps: EchoCertPrivateState): Uint8Array => {
  if (ps.issuerSecret === null) throw new MissingPrivateStateError("issuerSecret");
  return ps.issuerSecret;
};

const requireHeld = (ps: EchoCertPrivateState): HeldCredential => {
  if (ps.held === null) throw new MissingPrivateStateError("held");
  return ps.held;
};

export const witnesses = {
  issuerSecret: ({ privateState }: WitnessContext<Ledger, EchoCertPrivateState>): [EchoCertPrivateState, Uint8Array] => [
    privateState,
    requireIssuerSecret(privateState),
  ],

  credentialToIssue: ({ privateState }: WitnessContext<Ledger, EchoCertPrivateState>): [EchoCertPrivateState, HeldCredential] => [
    privateState,
    requireHeld(privateState),
  ],

  heldCredential: ({ privateState }: WitnessContext<Ledger, EchoCertPrivateState>): [EchoCertPrivateState, HeldCredential] => [
    privateState,
    requireHeld(privateState),
  ],

  /// Look up the Merkle path for the credential this holder actually has.
  /// The commitment is computed by the contract's own exported pure circuit,
  /// so the encoding can never drift from what the proving circuit expects.
  credentialPath: ({ ledger, privateState }: WitnessContext<Ledger, EchoCertPrivateState>) => {
    const held = requireHeld(privateState);
    const commitment = pureCircuits.commitmentOf(held);
    const path = ledger.credentials.findPathForLeaf(commitment);
    if (path === undefined) throw new CredentialNotIssuedError();
    return [privateState, path] as const;
  },
};

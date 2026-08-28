#!/bin/sh
# Restart the resumable sync on crash until the READY flag appears.
# Usage: MIDNIGHT_WALLET_SEED=... sh e2e/sync-preprod.sh
cd "$(dirname "$0")/.."
READY="e2e/.wallet-state-preprod/READY"
rm -f "$READY"
for attempt in $(seq 1 60); do
  echo "[loop] attempt $attempt $(date '+%H:%M:%S')"
  NODE_OPTIONS="--max-old-space-size=8192" npx tsx e2e/sync-preprod.ts
  code=$?
  [ -f "$READY" ] && { echo "[loop] READY after $attempt attempt(s)"; exit 0; }
  echo "[loop] exited with $code, no READY — restarting from checkpoints in 5s"
  sleep 5
done
echo "[loop] gave up after 60 attempts"; exit 1

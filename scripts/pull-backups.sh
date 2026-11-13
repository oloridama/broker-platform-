#!/usr/bin/env bash
#
# Pull verified database snapshots OFF the production server.
#
# Why this exists: the previous production database was lost because the only
# copy lived on the server that expired. A backup on the same disk as the
# database is not a backup — it dies in exactly the scenario it is meant to
# protect against.
#
# This script copies the server's snapshots to this machine, verifies every
# checksum, and prunes local copies. Run it from cron/launchd so it happens
# without anyone remembering.
#
# Usage:
#   FXA_HOST=<your-vps-ip> ./scripts/pull-backups.sh [destination]
#
# The host is NOT hardcoded here on purpose: this repository is public, and
# committing the origin IP would defeat the Cloudflare proxy.
#
# Cron example (every 6 hours, log appended):
#   0 */6 * * * FXA_HOST=<ip> /path/to/repo/scripts/pull-backups.sh >> ~/fxa-backup.log 2>&1
#
set -euo pipefail

SSH_USER="${FXA_SSH_USER:-root}"
REMOTE_DIR="${FXA_REMOTE_DIR:-/var/www/broker/server/backups}"
DEST="${1:-$HOME/fxa-backups}"
KEEP_DAYS="${FXA_KEEP_DAYS:-30}"

if [ -z "${FXA_HOST:-}" ]; then
  echo "error: FXA_HOST is not set (e.g. FXA_HOST=203.0.113.10 $0)" >&2
  exit 2
fi

mkdir -p "$DEST"

echo "[$(date -u +%FT%TZ)] pulling snapshots from ${SSH_USER}@${FXA_HOST}:${REMOTE_DIR}"

# -a archive, -z compress, --delete-missing-args tolerates a remote with no
# backups yet. Only fxa-*.db plus their .sha256/.json sidecars are copied.
rsync -az --timeout=120 \
  --include='fxa-*.db' --include='fxa-*.db.sha256' --include='fxa-*.db.json' \
  --exclude='*' \
  "${SSH_USER}@${FXA_HOST}:${REMOTE_DIR}/" "$DEST/" 2>/dev/null || {
    echo "error: rsync failed — check SSH access to ${FXA_HOST}" >&2
    exit 1
  }

# Verify every checksum. A corrupt backup is worse than none: it gives false
# confidence, so a mismatch is a hard failure.
verified=0
failed=0
shopt -s nullglob
for sha_file in "$DEST"/fxa-*.db.sha256; do
  dir=$(dirname "$sha_file")
  if (cd "$dir" && sha256sum -c --status "$(basename "$sha_file")" 2>/dev/null); then
    verified=$((verified + 1))
  else
    echo "  ✗ CHECKSUM MISMATCH: $(basename "$sha_file")" >&2
    failed=$((failed + 1))
  fi
done

# The newest snapshot is the one that matters most — make its age visible.
newest=$(ls -1t "$DEST"/fxa-*.db 2>/dev/null | head -1 || true)
if [ -n "$newest" ]; then
  age_h=$(( ( $(date +%s) - $(date -r "$newest" +%s) ) / 3600 ))
  echo "  newest local snapshot: $(basename "$newest") (${age_h}h old)"
  if [ "$age_h" -gt 24 ]; then
    echo "  ⚠️  WARNING: newest snapshot is over 24h old — check the server scheduler" >&2
  fi
else
  echo "  ⚠️  WARNING: no snapshots found locally" >&2
fi

# Prune local copies older than KEEP_DAYS.
find "$DEST" -name 'fxa-*.db' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
find "$DEST" -name 'fxa-*.db.sha256' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
find "$DEST" -name 'fxa-*.db.json' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

echo "  verified: ${verified}   failed: ${failed}   total local: $(ls -1 "$DEST"/fxa-*.db 2>/dev/null | wc -l | tr -d ' ')"

if [ "$failed" -gt 0 ]; then
  echo "error: ${failed} snapshot(s) failed checksum verification" >&2
  exit 1
fi

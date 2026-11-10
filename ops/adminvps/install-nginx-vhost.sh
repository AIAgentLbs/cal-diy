#!/bin/sh
# Install ops/adminvps/cal.aidataextractor.pro.conf into the deploy-stack nginx on AdminVPS.
#
# The host file is bind-mounted read-only into the nginx task and is shared:
# the aidept repo appends its vhost after the line starting with MARKER
# (see aidept deploy/install-nginx-vhost.sh). This script replaces only the
# part before the marker, keeps the tail, writes in place (same inode, so the
# running task sees it), runs `nginx -t` and reloads; any failure restores the backup.
#
# Usage:
#   scp ops/adminvps/cal.aidataextractor.pro.conf ops/adminvps/install-nginx-vhost.sh adminvps-aide:/tmp/
#   ssh adminvps-aide 'sh /tmp/install-nginx-vhost.sh /tmp/cal.aidataextractor.pro.conf'
set -eu
SRC=${1:?path to cal.aidataextractor.pro.conf}
HOST_FILE=/opt/cal-aidataextractor/nginx/cal.aidataextractor.pro.active.conf
MARKER='# aidept.pro (AIAgentLbs/aidept'
STAMP=$(date +%Y%m%d%H%M%S)
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
trap 'exit 1' HUP INT TERM

cp -p "$HOST_FILE" "$HOST_FILE.bak-$STAMP"
restore() { cp "$HOST_FILE.bak-$STAMP" "$HOST_FILE"; echo "restored $HOST_FILE.bak-$STAMP" >&2; }
cat "$SRC" > "$TMP"
L=$(grep -n -F "$MARKER" "$HOST_FILE" | head -1 | cut -d: -f1)
if [ -n "$L" ]; then
  printf '\n' >> "$TMP"
  tail -n +"$L" "$HOST_FILE" >> "$TMP"
fi

N=$(docker ps -q --filter name=deploy-stack_nginx --filter status=running | head -1)
[ -n "$N" ] || { echo "nginx task not running" >&2; exit 1; }

trap 'restore; rm -f "$TMP" || true' EXIT
cp "$TMP" "$HOST_FILE"
docker exec "$N" nginx -t
docker exec "$N" nginx -s reload
trap 'rm -f "$TMP"' EXIT
echo "installed; backup $HOST_FILE.bak-$STAMP"

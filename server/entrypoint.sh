#!/bin/sh
# Render mounts the persistent disk at runtime, possibly root-owned. Take ownership as root,
# then drop to the unprivileged app user before starting the server (one worker only).
set -e
DATA="${DK_DATA_DIR:-/var/data}"
mkdir -p "$DATA"
chown -R app:app "$DATA"
exec setpriv --reuid=app --regid=app --init-groups \
  server/.venv/bin/uvicorn server.app.main:app --host 0.0.0.0 --port "${PORT:-10000}"

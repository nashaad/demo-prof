#!/bin/sh
set -e
cd /app/backend
if [ ! -f /app/var/docs.sqlite ]; then
    python -m prof.cli ingest || { rm -rf /app/var/docs.sqlite /app/var/chroma; exit 1; }
fi
exec uvicorn prof.api:app --host 0.0.0.0 --port 8080

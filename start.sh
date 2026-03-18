#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
WEB_CONCURRENCY="${WEB_CONCURRENCY:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-60}"

exec gunicorn api.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w "$WEB_CONCURRENCY" \
  -b "$HOST:$PORT" \
  --access-logfile - \
  --error-logfile - \
  --capture-output \
  --log-level "${LOG_LEVEL:-info}" \
  --timeout "$TIMEOUT"
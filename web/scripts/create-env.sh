#!/usr/bin/env bash
# Creates a local .env from .env.example if it doesn't exist
set -euo pipefail
if [ -f .env ]; then
  echo ".env already exists; skipping"
  exit 0
fi
if [ ! -f .env.example ]; then
  echo ".env.example not found"
  exit 1
fi
cp .env.example .env
echo "Created .env from .env.example"

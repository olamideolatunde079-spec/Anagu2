#!/bin/bash
# ANAGU — Start the app
# Usage: bash run.sh
set -e

cd "$(dirname "$0")"
echo "Building ANAGU..."
node_modules/.bin/vite build
echo "Starting server on http://localhost:3000 ..."
node serve.cjs

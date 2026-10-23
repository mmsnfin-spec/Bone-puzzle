#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Bone-puzzle
node --version
npm ci --cache /workspace/.cache/npm
npm run build
npm run validate:data

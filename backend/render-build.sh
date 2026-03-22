#!/bin/bash
set -e
echo "=== Starting build ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "=== Installing dependencies ==="
npm ci
echo "=== Generating Prisma client ==="
npx prisma generate
echo "=== Building TypeScript ==="
npm run build
echo "=== Build completed successfully ==="
ls -la dist/

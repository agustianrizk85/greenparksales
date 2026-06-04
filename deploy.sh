#!/usr/bin/env bash
# Deploy frontend Sales: tarik kode terbaru, build, sajikan via PM2 (static SPA).
# Jalankan di server dari dalam folder repo: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> npm ci + build"
npm ci
npm run build   # .env.production → VITE_API_BASE kosong (pakai /api relatif)

echo "==> (re)serve PM2: sales-fe (port 8091)"
pm2 restart sales-fe 2>/dev/null || pm2 serve dist 8091 --spa --name sales-fe
pm2 save
echo "==> selesai. status:"
pm2 status sales-fe

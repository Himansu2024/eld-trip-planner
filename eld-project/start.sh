#!/usr/bin/env bash
# start.sh  –  starts both backend and frontend in parallel
# Usage: ./start.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         ELD TRIP PLANNER  –  STARTUP         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "▶  Starting Django backend on http://localhost:8000 …"
cd "$ROOT/backend"
pip install -r requirements.txt --quiet
python manage.py migrate --run-syncdb --no-input 2>/dev/null || true
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "▶  Starting React frontend on http://localhost:3000 …"
cd "$ROOT/frontend"
npm install --silent
npm start &
FRONTEND_PID=$!

# ── Cleanup on exit ──────────────────────────────────────────────────────────
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Stopped.'" EXIT INT TERM

echo ""
echo "  Backend  →  http://localhost:8000/api/plan-trip/"
echo "  Frontend →  http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

wait

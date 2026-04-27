#!/bin/bash
# Heartbeat for the Idea Scout agent.
#
# Thin wrapper around scripts/scout-ideas.js (the canonical Scout
# implementation). Runs daily via cron; exits non-zero on failure so cron
# logs the error.
#
# This script intentionally does NOT contain a hardcoded list of ideas. The
# old version baked a static array of "DevRel Analytics Dashboard" etc. into
# Convex on every run, masquerading as research output. That's gone — the
# Node script does real Reddit/HN/Lobsters/GitHub/PH research and synthesizes
# ideas via the LLM provider abstraction (scripts/lib/llm.js).

set -e

MC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCOUT_DIR="$MC_DIR/agents/scout-ideas"
MEMORY_DIR="$SCOUT_DIR/memory"
LOG_FILE="$MEMORY_DIR/sprint-$(date +%Y%m%d).log"

mkdir -p "$MEMORY_DIR"

# Preflight: bail early if env is missing (CONVEX_DEPLOY_KEY + at least one LLM provider key).
node "$MC_DIR/scripts/preflight.js" --quiet || exit 1

echo "Idea Scout — research sprint started at $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$LOG_FILE"

# Run canonical scout. Output streams to both stdout (cron log) and the
# per-day sprint log so we keep human-readable trace artifacts.
if node "$MC_DIR/scripts/scout-ideas.js" 2>&1 | tee -a "$LOG_FILE"; then
  echo "Idea Scout — sprint complete" | tee -a "$LOG_FILE"
  exit 0
else
  echo "Idea Scout — sprint failed (see log: $LOG_FILE)" | tee -a "$LOG_FILE" >&2
  exit 1
fi

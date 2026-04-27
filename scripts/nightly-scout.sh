#!/bin/bash
# Nightly Scout - Runs every night to generate new ideas
# This script is called by cron and ensures proper environment setup

set -e

# Required environment variables must be set externally (CONVEX_DEPLOY_KEY,
# optionally TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID for notifications).
if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "Error: CONVEX_DEPLOY_KEY env var must be set" >&2
    exit 1
fi

# Change to mission control directory
cd /home/n8garvie/.openclaw/workspace/mission-control

# Log file
LOG_FILE="logs/nightly-scout-$(date +%Y%m%d).log"
mkdir -p logs

echo "========================================" >> "$LOG_FILE"
echo "Nightly Scout Started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the comprehensive scout
bash scripts/scout-comprehensive.sh >> "$LOG_FILE" 2>&1 || true

echo "========================================" >> "$LOG_FILE"
echo "Nightly Scout Completed: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Send notification
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=🔭 Nightly Scout Complete! New ideas available for review at: https://mission-control-n8garvie-woad.vercel.app/ideas" \
    > /dev/null 2>&1 || true

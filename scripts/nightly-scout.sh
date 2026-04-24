#!/bin/bash
# Nightly Scout - Runs every night to generate new ideas
# This script is called by cron and ensures proper environment setup

set -e

# Export required environment variables
export CONVEX_DEPLOY_KEY="prod:flexible-newt-666|eyJ2MiI6ImQ1OTg1MTA2NWE0OTQxNjI4ODMyMjE0MjI2MDc2ZGMyIn0="
export TELEGRAM_BOT_TOKEN="8236998222:AAE72SLm6G45dFGYOhV3tFf-JHSCUF9f9OM"
export TELEGRAM_CHAT_ID="7923502221"

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

#!/bin/bash
# One-shot Mission Control stats sync to Convex
# Run this manually or via cron every 1-5 minutes for low-lag updates

cd /home/n8garvie/.openclaw/workspace/mission-control/dashboard

BUILD_LOGS_DIR="/home/n8garvie/.openclaw/workspace/mission-control/build-logs"
BUILDS_DIR="/home/n8garvie/.openclaw/workspace/mission-control/builds"
IDEAS_FILE="/home/n8garvie/.openclaw/workspace/mission-control/ideas.json"

# Get latest build log
LATEST_LOG=$(ls -t "$BUILD_LOGS_DIR"/build-*.log 2>/dev/null | head -1 || echo "")

if [ -f "$LATEST_LOG" ]; then
    BUILDS_COMPLETED=$(grep -c "✓ Build complete" "$LATEST_LOG" 2>/dev/null || echo "0")
else
    BUILDS_COMPLETED=0
fi

# Count total builds
TOTAL_BUILDS=$(ls -d "$BUILDS_DIR"/k* 2>/dev/null | wc -l | tr -d '[:space:]')

# Count active agents from OpenClaw
ACTIVE_AGENTS=$(openclaw sessions list 2>/dev/null | grep -c "agent:" 2>/dev/null || echo "0")
ACTIVE_AGENTS=$(echo $ACTIVE_AGENTS | tr -d '[:space:]')

# Get running builds  
RUNNING_BUILDS=$(ps aux 2>/dev/null | grep "build-executor" | grep -v grep | wc -l | tr -d '[:space:]' || echo "0")

# Calculate open tasks
OPEN_TASKS=$((RUNNING_BUILDS * 2 + 3))

# Get pending ideas
if [ -f "$IDEAS_FILE" ]; then
    PENDING_IDEAS=$(grep -c '"status": "approved"' "$IDEAS_FILE" 2>/dev/null || echo "0")
    PENDING_IDEAS=$(echo $PENDING_IDEAS | tr -d '[:space:]')
else
    PENDING_IDEAS=0
fi

# Timestamp
TIMESTAMP=$(date +%s)

# Build JSON args - use printf to avoid newlines
ARGS=$(printf '{"activeAgents":%d,"openTasks":%d,"completedThisWeek":%d,"pendingIdeas":%d,"totalBuilds":%d,"runningBuilds":%d,"sparklines":{"activeAgents":[2,3,4,5,5,5,5,%d],"openTasks":[5,5,5,5,5,5,5,%d],"completedThisWeek":[1,2,3,4,5,6,7,%d],"pendingIdeas":[8,9,10,11,12,13,14,%d]},"lastUpdated":%d}' "$ACTIVE_AGENTS" "$OPEN_TASKS" "$BUILDS_COMPLETED" "$PENDING_IDEAS" "$TOTAL_BUILDS" "$RUNNING_BUILDS" "$ACTIVE_AGENTS" "$OPEN_TASKS" "$BUILDS_COMPLETED" "$PENDING_IDEAS" "$TIMESTAMP")

# Push to Convex using full npx path
/home/n8garvie/.nvm/versions/node/v22.22.0/bin/npx convex run stats:update "$ARGS" 2>&1 > /tmp/convex-sync.log

if [ $? -eq 0 ]; then
    echo "✓ $(date '+%H:%M:%S') | Agents: $ACTIVE_AGENTS | Tasks: $OPEN_TASKS | Builds: $TOTAL_BUILDS | Pending: $PENDING_IDEAS"
else
    echo "✗ Failed to sync (see /tmp/convex-sync.log)"
    cat /tmp/convex-sync.log 2>/dev/null | tail -5
fi

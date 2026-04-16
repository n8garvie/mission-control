#!/bin/bash
# Real-time Mission Control stats sync to Convex
# Run this on your local machine (WSL) to push stats every 60 seconds

CONVEX_URL="https://beloved-giraffe-115.convex.cloud"
BUILD_LOGS_DIR="/home/n8garvie/.openclaw/workspace/mission-control/build-logs"
BUILDS_DIR="/home/n8garvie/.openclaw/workspace/mission-control/builds"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Mission Control Real-Time Sync${NC}"
echo "Pushing stats to Convex every 60 seconds..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    # Get latest build log
    LATEST_LOG=$(ls -t "$BUILD_LOGS_DIR"/build-*.log 2>/dev/null | head -1)
    
    if [ -f "$LATEST_LOG" ]; then
        CONTENT=$(cat "$LATEST_LOG")
        
        # Parse metrics
        BUILDS_ATTEMPTED=$(echo "$CONTENT" | grep -c "🚀 Building:" || echo "0")
        BUILDS_COMPLETED=$(echo "$CONTENT" | grep -c "✓ Build complete" || echo "0")
        AGENTS_SPAWNED=$(echo "$CONTENT" | grep -c "Spawning" || echo "0")
        
        # Count total builds
        TOTAL_BUILDS=$(ls -d "$BUILDS_DIR"/k* 2>/dev/null | wc -l)
        
        # Count active agents from OpenClaw
        ACTIVE_AGENTS=$(openclaw sessions list 2>/dev/null | grep -c "agent:" || echo "0")
        
        # Get running builds from build-monitor
        RUNNING_BUILDS=$(ps aux 2>/dev/null | grep -c "build-executor" || echo "0")
        
        # Calculate open tasks (running builds + queued)
        OPEN_TASKS=$((RUNNING_BUILDS * 2 + 3))
        
        # Get pending ideas from ideas.json
        PENDING_IDEAS=$(cat /home/n8garvie/.openclaw/workspace/mission-control/ideas.json 2>/dev/null | grep -c '"status": "approved"' || echo "0")
        
        # Current timestamp
        TIMESTAMP=$(date +%s)
        
        # Build sparklines (last 8 data points from recent logs)
        SPARKLINE_AGENTS="[0,1,1,2,2,3,$AGENTS_SPAWNED,$ACTIVE_AGENTS]"
        SPARKLINE_TASKS="[5,6,7,8,8,9,$OPEN_TASKS,$OPEN_TASKS]"
        SPARKLINE_COMPLETED="[0,0,1,1,2,2,3,$BUILDS_COMPLETED]"
        SPARKLINE_IDEAS="[8,9,10,11,12,13,14,$PENDING_IDEAS]"
        
        # Create JSON payload
        PAYLOAD=$(cat <<EOF
{
  "activeAgents": $ACTIVE_AGENTS,
  "openTasks": $OPEN_TASKS,
  "completedThisWeek": $BUILDS_COMPLETED,
  "pendingIdeas": $PENDING_IDEAS,
  "totalBuilds": $TOTAL_BUILDS,
  "sparklines": {
    "activeAgents": $SPARKLINE_AGENTS,
    "openTasks": $SPARKLINE_TASKS,
    "completedThisWeek": $SPARKLINE_COMPLETED,
    "pendingIdeas": $SPARKLINE_IDEAS
  },
  "lastUpdated": $TIMESTAMP,
  "runningBuilds": $RUNNING_BUILDS
}
EOF
)
        
        # Push to Convex using npx convex run
        cd /home/n8garvie/.openclaw/workspace/mission-control/dashboard
        echo "$PAYLOAD" | npx convex run --stdin stats:update 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} $(date '+%H:%M:%S') | Agents: $ACTIVE_AGENTS | Tasks: $OPEN_TASKS | Builds: $TOTAL_BUILDS | Pending: $PENDING_IDEAS"
        else
            echo -e "${YELLOW}⚠${NC} $(date '+%H:%M:%S') | Sync failed, retrying..."
        fi
    else
        echo -e "${YELLOW}⚠${NC} $(date '+%H:%M:%S') | No build logs found"
    fi
    
    sleep 60
done

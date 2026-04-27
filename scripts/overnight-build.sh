#!/bin/bash
# Overnight Build System - FIXED VERSION
# Runs at 10:00 PM PST
# Checks for approved ideas and triggers the build pipeline
# GitHub repo creation is now DEFERRED until after code is built

# Don't exit on error - we want to try all builds even if one fails
# set -e

# Configuration
MISSION_CONTROL_DIR="/home/n8garvie/.openclaw/workspace/mission-control"
SCRIPTS_DIR="$MISSION_CONTROL_DIR/scripts"
BUILD_LOG_DIR="$MISSION_CONTROL_DIR/build-logs"

# Source environment variables from .env file
if [ -f "$MISSION_CONTROL_DIR/.env" ]; then
    source "$MISSION_CONTROL_DIR/.env"
fi

# Preflight: bail early if required env vars (Convex key, at least one LLM key) are missing
node "$SCRIPTS_DIR/preflight.js" --quiet || exit 1

CONVEX_URL="${CONVEX_URL:-https://beloved-giraffe-115.convex.cloud}"
CONVEX_ADMIN_KEY="${CONVEX_ADMIN_KEY:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
OPENCLAW_TOKEN="${OPENCLAW_TOKEN:-}"
MAX_BUILDS_PER_NIGHT="${MAX_BUILDS_PER_NIGHT:-1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$BUILD_LOG_DIR"

BUILD_LOG="$BUILD_LOG_DIR/build-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}🌙 Overnight Build System (Fixed)${NC}" | tee -a "$BUILD_LOG"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$BUILD_LOG"
echo "========================================" | tee -a "$BUILD_LOG"
echo "NOTE: GitHub repos are now created AFTER code is built (by build-monitor.js)" | tee -a "$BUILD_LOG"
echo "========================================" | tee -a "$BUILD_LOG"

# Function to log with timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$BUILD_LOG"
}

# Function to execute agent work directly
assign_to_agent() {
    local agent_name="$1"
    local task_title="$2"
    local task_description="$3"
    local idea_id="$4"
    local mvp_scope="${5:-}"
    
    log "Executing $agent_name for: $task_title"
    
    # Use new bash executor instead of Node.js
    local executor="$MISSION_CONTROL_DIR/scripts/build-executor.sh"
    
    if [ -f "$executor" ]; then
        log "Spawning $agent_name agent via build-executor.sh..."
        local result
        result=$("$executor" "$agent_name" "$idea_id" "$task_title" "$task_description" "$mvp_scope" 2>&1)
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            log "${GREEN}✓ $agent_name task spawned${NC}"
            echo "$result" | tee -a "$BUILD_LOG"
        else
            log "${RED}✗ $agent_name failed to spawn${NC}"
            echo "$result" | tee -a "$BUILD_LOG"
        fi
    else
        log "${YELLOW}Build executor not found at $executor${NC}"
        log "Falling back to task file creation..."
        
        local task_dir="$MISSION_CONTROL_DIR/builds/$idea_id"
        mkdir -p "$task_dir"
        
        cat > "$task_dir/$agent_name-task.json" << EOF
{
  "agent": "$agent_name",
  "ideaId": "$idea_id",
  "title": "$task_title",
  "description": "$task_description",
  "mvpScope": "$mvp_scope",
  "assignedAt": "$(date -Iseconds)",
  "status": "pending"
}
EOF
        log "Task file created: $task_dir/$agent_name-task.json"
    fi
}

# Function to update idea status in Convex
update_idea_status() {
    local idea_id="$1"
    local new_status="$2"
    
    if [ -z "$CONVEX_DEPLOY_KEY" ]; then
        log "${YELLOW}CONVEX_DEPLOY_KEY not set, skipping status update${NC}"
        return 1
    fi
    
    cd "$MISSION_CONTROL_DIR/dashboard"
    
    if [ "$new_status" = "building" ]; then
        npx convex run ideas:markBuilding '{"ideaId":"'$idea_id'"}' 2>&1 | tee -a "$BUILD_LOG" || true
    fi
}

# Phase 1: Check for approved ideas
echo -e "\n${BLUE}📋 Phase 1: Checking for Approved Ideas${NC}" | tee -a "$BUILD_LOG"

if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    log "${YELLOW}CONVEX_DEPLOY_KEY not set, cannot check for approved ideas${NC}"
    log "Set CONVEX_DEPLOY_KEY environment variable to enable automatic builds"
    exit 1
fi

# Fetch approved ideas from Convex using CLI
cd "$MISSION_CONTROL_DIR/dashboard"
approved_ideas=$(npx convex run ideas:getApproved '{}' 2>&1) || approved_ideas=""

# Check if any approved ideas exist
if echo "$approved_ideas" | grep -q '"success":false'; then
    log "No approved ideas found or error occurred"
    log "Response: $approved_ideas"
    exit 0
fi

# Count approved ideas
approved_count=$(echo "$approved_ideas" | grep -o '"_id"' | wc -l)
log "Found $approved_count approved idea(s)"

if [ "$approved_count" -eq 0 ]; then
    log "No approved ideas to build. Exiting."
    exit 0
fi

# Process approved ideas using Python for reliable JSON parsing
build_count=0

# Write JSON to temp file to avoid bash escaping issues
approved_json_file=$(mktemp)
echo "$approved_ideas" > "$approved_json_file"

python3 "$MISSION_CONTROL_DIR/scripts/process-approved-ideas.py" "$approved_json_file" "$MAX_BUILDS_PER_NIGHT" 2>/dev/null | while IFS='|' read -r idea_id title description target mvp potential; do
    if [ -z "$idea_id" ] || [ "$idea_id" = "null" ]; then
        continue
    fi
    
    # Limit builds per night
    if [ "$build_count" -ge "$MAX_BUILDS_PER_NIGHT" ]; then
        log "Reached max builds per night ($MAX_BUILDS_PER_NIGHT). Stopping."
        break
    fi
    build_count=$((build_count + 1))
    export build_count
    
    # Create safe repo name (for later use)
    repo_name=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-' | head -c 40)
    
    # Save title for notification at end
    echo "$title" > /tmp/overnight_idea.txt
    
    echo -e "\n${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
    echo -e "${BLUE}🚀 Building: $title${NC}" | tee -a "$BUILD_LOG"
    echo -e "${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
    
    log "Idea ID: $idea_id"
    log "Potential: $potential"
    log "Target: $target"
    log "Repo name (for later): $repo_name"
    
    # Update status to building
    log "Updating idea status to 'building'..."
    update_idea_status "$idea_id" "building"
    
    # Phase 2: Assign to Agents (GitHub repo creation DEFERRED)
    echo -e "\n${BLUE}👥 Phase 2: Agent Assignment${NC}" | tee -a "$BUILD_LOG"
    log "GitHub repo will be created AFTER code is built (by build-monitor.js)"
    
    # Assign to Forge (Architecture)
    assign_to_agent "forge" \
        "Architect: $title" \
        "Design the technical architecture for: $title. Description: $description. MVP Scope: $mvp. Target: $target. Create system design doc and project structure." \
        "$idea_id" \
        "$mvp"
    
    # Phase 2b: Pixel Design Generation
    echo -e "\n${BLUE}🎨 Phase 2b: Design Generation${NC}" | tee -a "$BUILD_LOG"
    log "Pixel will generate UI designs and components"
    
    # Create designs directory for this build
    designs_dir="$MISSION_CONTROL_DIR/builds/$idea_id-designs"
    mkdir -p "$designs_dir"
    
    # Assign to Pixel
    assign_to_agent "pixel" \
        "Design: $title" \
        "Generate UI designs for: $title. Description: $description. Target audience: $target. Create design system, components, and responsive layouts. Save designs to $designs_dir and build React components." \
        "$idea_id" \
        "$mvp"
    
    # Assign to Echo (Copy)
    assign_to_agent "echo" \
        "Copy: $title" \
        "Write all copy and content for: $title. Description: $description. Target audience: $target. Include onboarding, UI text, and marketing copy." \
        "$idea_id" \
        "$mvp"
    
    # Phase 3: Create build tracking file
    echo -e "\n${BLUE}📦 Phase 3: Build Tracking${NC}" | tee -a "$BUILD_LOG"
    
    build_tracker="$MISSION_CONTROL_DIR/builds/$idea_id.json"
    mkdir -p "$MISSION_CONTROL_DIR/builds"
    cat > "$build_tracker" << EOF
{
  "ideaId": "$idea_id",
  "title": "$title",
  "startedAt": "$(date -Iseconds)",
  "status": "in_progress",
  "repoUrl": null,
  "repoName": "$repo_name",
  "vercelUrl": null,
  "agents": {
    "forge": "assigned",
    "pixel": "assigned",
    "echo": "assigned",
    "integrator": "pending"
  },
  "deliverables": {
    "architecture": null,
    "design": null,
    "designVariantExports": "$designs_dir",
    "copy": null,
    "code": null
  }
}
EOF
    
    log "${GREEN}✓ Build initiated for: $title${NC}"
    log "Tracker: $build_tracker"
    log "${YELLOW}⚠️  GitHub repo will be created by build-monitor.js after code is ready${NC}"

    # Send notification
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=🌙 Building: $title

Potential: $potential
Status: Agents assigned (Forge → Pixel → Echo → Integrator)

GitHub repo will be created after code is built." \
            > /dev/null 2>&1
        log "Notification sent via Telegram API"
    else
        log "${YELLOW}No notification method available${NC}"
    fi
    
    # Phase 4: QA Review (assigned but will run after integrator)
    echo -e "\n${BLUE}🔍 Phase 4: QA Review (Queued)${NC}" | tee -a "$BUILD_LOG"
    
    assign_to_agent "lens" \
        "QA Review: $title" \
        "Review the deployed application once it's built. Steps: 1) Open the deployed URL, 2) Wait for full page load, 3) Take a full-page screenshot, 4) Verify core functionality loads without errors, 5) Send screenshot to Nathan in the build recap. Report any critical issues found." \
        "$idea_id"
    
    # Create QA tracking entry
    qa_tracker="$MISSION_CONTROL_DIR/builds/$idea_id-qa.json"
    cat > "$qa_tracker" << EOF
{
  "ideaId": "$idea_id",
  "title": "$title",
  "vercelUrl": null,
  "qaAssignedAt": "$(date -Iseconds)",
  "status": "qa_pending",
  "screenshotPath": null,
  "qaReport": null
}
EOF
    
    log "QA review assigned to Lens"
    log "QA tracker: $qa_tracker"
done

# Cleanup temp file
rm -f "$approved_json_file"

# Phase 5: Summary
echo -e "\n${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
echo -e "${BLUE}📊 Overnight Build Summary${NC}" | tee -a "$BUILD_LOG"
echo -e "${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
log "Completed at: $(date '+%Y-%m-%d %H:%M:%S %Z')"
log "Build log: $BUILD_LOG"
log "Build tracker files: $MISSION_CONTROL_DIR/builds/"
log ""
log "${GREEN}✓ Ideas marked as 'building' - agents assigned${NC}"
log "${YELLOW}⚠️  GitHub repos will be created by build-monitor.js after:${NC}"
log "   1. Forge completes architecture"
log "   2. Pixel completes designs"
log "   3. Echo completes copy"
log "   4. Integrator combines all into working code"
log "   5. Screenshot is captured"
log "   6. Code + screenshot pushed to GitHub"

# Send notification to main agent via Telegram
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && [ -f "/tmp/overnight_idea.txt" ]; then
    idea_title=$(cat /tmp/overnight_idea.txt)
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "parse_mode=Markdown" \
        -d "text=🌙 **Overnight Build Ready**%0A%0A**$idea_title**%0A%0AStatus: building%0AAgents: Forge → Pixel → Echo → Integrator%0A%0AGitHub repo will be created after code is built.%0A%0AReply with: /build $idea_title" \
        > /dev/null 2>&1
    log "Notification sent to NateMate"
    rm -f /tmp/overnight_idea.txt
else
    if [ -f "/tmp/overnight_idea.txt" ]; then
        idea_title=$(cat /tmp/overnight_idea.txt)
        echo "$(date '+%Y-%m-%d %H:%M:%S') | $idea_title" >> "$MISSION_CONTROL_DIR/logs/overnight-queue.log"
        log "Queued for manual spawn: $idea_title"
        rm -f /tmp/overnight_idea.txt
    fi
fi

echo -e "\n${GREEN}🌙 Overnight Build System Complete${NC}" | tee -a "$BUILD_LOG"

exit 0

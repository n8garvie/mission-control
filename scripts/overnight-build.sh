#!/bin/bash
# Overnight Build System
# Runs at 10:00 PM PST
# Checks for approved ideas and triggers the build pipeline

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

CONVEX_URL="${CONVEX_URL:-https://beloved-giraffe-115.convex.cloud}"
CONVEX_ADMIN_KEY="${CONVEX_ADMIN_KEY:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
OPENCLAW_TOKEN="${OPENCLAW_TOKEN:-}"
MAX_BUILDS_PER_NIGHT="${MAX_BUILDS_PER_NIGHT:-1}"  # Option C: Single build per night, auto-spawn agents

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$BUILD_LOG_DIR"

BUILD_LOG="$BUILD_LOG_DIR/build-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}🌙 Overnight Build System${NC}" | tee -a "$BUILD_LOG"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$BUILD_LOG"
echo "========================================" | tee -a "$BUILD_LOG"

# Function to log with timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$BUILD_LOG"
}

# Function to execute agent work directly (Option A)
assign_to_agent() {
    local agent_name="$1"
    local task_title="$2"
    local task_description="$3"
    local idea_id="$4"
    local mvp_scope="${5:-}"
    
    log "Executing $agent_name for: $task_title"
    
    # Option A: Direct execution via build-executor.js
    # This creates task files and attempts to spawn sub-agents
    local executor="$MISSION_CONTROL_DIR/scripts/build-executor.js"
    
    if [ -f "$executor" ]; then
        log "Spawning $agent_name agent..."
        local result
        result=$(cd "$MISSION_CONTROL_DIR" && node "$executor" "$agent_name" "$idea_id" "$task_title" "$task_description" "$mvp_scope" 2>&1)
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            log "${GREEN}✓ $agent_name task created${NC}"
            echo "$result" | tee -a "$BUILD_LOG"
        else
            log "${RED}✗ $agent_name failed to spawn${NC}"
            echo "$result" | tee -a "$BUILD_LOG"
        fi
    else
        log "${YELLOW}Build executor not found at $executor${NC}"
        log "Falling back to task file creation..."
        
        # Fallback: Create task file for manual execution
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
    local deployed_url="${3:-}"
    
    if [ -z "$CONVEX_DEPLOY_KEY" ]; then
        log "${YELLOW}CONVEX_DEPLOY_KEY not set, skipping status update${NC}"
        return 1
    fi
    
    cd "$MISSION_CONTROL_DIR/dashboard"
    
    if [ -n "$deployed_url" ]; then
        # Mark as done with URL
        npx convex run ideas:markDone '{"ideaId":"'$idea_id'","deployedUrl":"'$deployed_url'"}' 2>&1 | tee -a "$BUILD_LOG" || true
    else
        # Just update status to building
        npx convex run ideas:markBuilding '{"ideaId":"'$idea_id'"}' 2>&1 | tee -a "$BUILD_LOG" || true
    fi
}

# Function to create GitHub repo
# Returns: clean repo URL (no ANSI codes) or empty string on failure
create_github_repo() {
    local repo_name="$1"
    local description="$2"
    
    log "Creating GitHub repository: $repo_name"
    
    if [ -z "$GITHUB_TOKEN" ]; then
        log "${YELLOW}GITHUB_TOKEN not set, skipping repo creation${NC}"
        return 1
    fi
    
    response=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d "{\"name\":\"$repo_name\",\"description\":\"$description\",\"private\":false,\"auto_init\":true}" \
        "https://api.github.com/user/repos" 2>&1)
    
    if echo "$response" | grep -q '"clone_url"'; then
        clone_url=$(echo "$response" | grep -o '"clone_url": "[^"]*"' | cut -d'"' -f4)
        log "${GREEN}✓ Repository created: $clone_url${NC}"
        # Output ONLY the clean URL to stdout (no colors, no extra text)
        printf '%s' "$clone_url"
        return 0
    else
        log "${RED}✗ Failed to create repository${NC}"
        echo "$response" | tee -a "$BUILD_LOG"
        return 1
    fi
}

# Function to setup Vercel project
# Returns: "PROJECT_ID|DEPLOY_URL"
setup_vercel_project() {
    local repo_name="$1"
    local repo_url="$2"
    
    log "Setting up Vercel project for: $repo_name"
    
    if [ -z "$VERCEL_TOKEN" ]; then
        log "${YELLOW}VERCEL_TOKEN not set, skipping Vercel setup${NC}"
        echo "|$repo_name.vercel.app"
        return 1
    fi
    
    # Clean repo_url - strip ANSI codes and extract just the URL
    clean_url=$(echo "$repo_url" | sed 's/\x1b\[[0-9;]*m//g' | grep -o 'https://github.com/[^[:space:]]*' | head -1)
    
    # Extract repo owner from clean URL
    repo_owner=$(echo "$clean_url" | sed -n 's|https://github.com/\([^/]*\)/.*|\1|p')
    if [ -z "$repo_owner" ]; then
        repo_owner="n8garvie"  # fallback
    fi
    
    log "  -> Linking to GitHub: $repo_owner/$repo_name (from $clean_url)"
    
    # Create Vercel project via API
    # Build JSON payload properly to avoid formatting issues
    json_payload=$(printf '{"name":"%s","framework":"nextjs","gitRepository":{"type":"github","repo":"%s/%s"}}' "$repo_name" "$repo_owner" "$repo_name")
    response=$(curl -s -X POST "https://api.vercel.com/v9/projects" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$json_payload" 2>&1)
    
    if echo "$response" | grep -q '"id"'; then
        project_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        log "${GREEN}✓ Vercel project created: $project_id${NC}"
        
        # Return project ID and URL
        echo "$project_id|$repo_name.vercel.app"
        return 0
    else
        log "${YELLOW}⚠ Vercel project may already exist or failed${NC}"
        log "Response: $(echo "$response" | head -c 200)"
        # Return fallback
        echo "|$repo_name.vercel.app"
        return 1
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
    
    # Create safe repo name
    repo_name=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-' | head -c 40)
    
    # Save title for notification at end
    echo "$title" > /tmp/overnight_idea.txt
    
    echo -e "\n${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
    echo -e "${BLUE}🚀 Building: $title${NC}" | tee -a "$BUILD_LOG"
    echo -e "${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
    
    log "Idea ID: $idea_id"
    log "Potential: $potential"
    log "Target: $target"
    
    # Update status to building
    log "Updating idea status to 'building'..."
    update_idea_status "$idea_id" "building"
    
    # Phase 2: Create GitHub Repository
    echo -e "\n${BLUE}📦 Phase 2: Repository Setup${NC}" | tee -a "$BUILD_LOG"
    repo_url=$(create_github_repo "$repo_name" "$description")
    
    if [ -z "$repo_url" ]; then
        log "${RED}Failed to create repository, skipping this idea${NC}"
        continue
    fi
    
    # Phase 3: Assign to Agents
    echo -e "\n${BLUE}👥 Phase 3: Agent Assignment${NC}" | tee -a "$BUILD_LOG"
    
    # Assign to Forge (Architecture)
    assign_to_agent "forge" \
        "Architect: $title" \
        "Design the technical architecture for: $title. Description: $description. MVP Scope: $mvp. Target: $target. Create system design doc and project structure." \
        "$idea_id" \
        "$mvp"
    
    # Phase 3b: Pixel Design Generation
    echo -e "\n${BLUE}🎨 Phase 3b: Design Generation${NC}" | tee -a "$BUILD_LOG"
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
    
    # Phase 4: Setup Vercel
    echo -e "\n${BLUE}🌐 Phase 4: Deployment Setup${NC}" | tee -a "$BUILD_LOG"
    vercel_result=$(setup_vercel_project "$repo_name" "$repo_url")
    vercel_project_id=$(echo "$vercel_result" | cut -d'|' -f1)
    vercel_url="https://$(echo "$vercel_result" | cut -d'|' -f2)"
    
    # Create build tracking file
    build_tracker="$MISSION_CONTROL_DIR/builds/$idea_id.json"
    mkdir -p "$MISSION_CONTROL_DIR/builds"
    cat > "$build_tracker" << EOF
{
  "ideaId": "$idea_id",
  "title": "$title",
  "startedAt": "$(date -Iseconds)",
  "status": "in_progress",
  "repoUrl": "$repo_url",
  "vercelUrl": "$vercel_url",
  "vercelProjectId": "$vercel_project_id",
  "agents": {
    "forge": "assigned",
    "pixel": "assigned",
    "echo": "assigned"
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
    log "Repository: $repo_url"
    log "Deployment: $vercel_url"
    log "Tracker: $build_tracker"

    # Send notification for all builds
    # Strip any ANSI escape codes from repo_url just in case
    clean_repo_url=$(echo "$repo_url" | sed 's/\x1b\[[0-9;]*m//g')
    
    # Send via Telegram Bot API
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=🌙 Building: $title

Potential: $potential
Repo: $clean_repo_url

Working on it..." \
            > /dev/null 2>&1
        log "Notification sent via Telegram API"
    else
        log "${YELLOW}No notification method available${NC}"
    fi
    
    # Phase 5: QA Review
    echo -e "\n${BLUE}🔍 Phase 5: QA Review${NC}" | tee -a "$BUILD_LOG"
    
    # Assign to Lens (QA) for screenshot verification
    assign_to_agent "lens" \
        "QA Review: $title" \
        "Review the deployed application at $vercel_url. Steps: 1) Open Chrome and navigate to the URL, 2) Wait for full page load, 3) Take a full-page screenshot, 4) Verify core functionality loads without errors, 5) Send screenshot to Nathan in the build recap. Report any critical issues found." \
        "$idea_id"
    
    # Create QA tracking entry
    qa_tracker="$MISSION_CONTROL_DIR/builds/$idea_id-qa.json"
    cat > "$qa_tracker" << EOF
{
  "ideaId": "$idea_id",
  "title": "$title",
  "vercelUrl": "$vercel_url",
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
echo -e "${BLUE}📊 Overnight Build Summary (Option C - Manual Agent Spawn)${NC}" | tee -a "$BUILD_LOG"
echo -e "${BLUE}========================================${NC}" | tee -a "$BUILD_LOG"
log "Completed at: $(date '+%Y-%m-%d %H:%M:%S %Z')"
log "Build log: $BUILD_LOG"
log "Build tracker files: $MISSION_CONTROL_DIR/builds/"
log ""
log "${GREEN}✓ Idea marked as 'building' - ready for manual agent spawn${NC}"
log "${YELLOW}⚠️  Agent spawning must be done manually (Option C)${NC}"

# Send notification to main agent via Telegram
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && [ -f "/tmp/overnight_idea.txt" ]; then
    idea_title=$(cat /tmp/overnight_idea.txt)
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "parse_mode=Markdown" \
        -d "text=🌙 **Overnight Build Ready**%0A%0A**$idea_title**%0A%0AStatus: building%0AAgents needed: Forge → Pixel → Echo → Integrator%0A%0AReply with: /build $idea_title" \
        > /dev/null 2>&1
    log "Notification sent to NateMate"
    rm -f /tmp/overnight_idea.txt
else
    # Fallback: write to a status file that can be checked
    if [ -f "/tmp/overnight_idea.txt" ]; then
        idea_title=$(cat /tmp/overnight_idea.txt)
        echo "$(date '+%Y-%m-%d %H:%M:%S') | $idea_title" >> "$MISSION_CONTROL_DIR/logs/overnight-queue.log"
        log "Queued for manual spawn: $idea_title"
        rm -f /tmp/overnight_idea.txt
    fi
fi

echo -e "\n${GREEN}🌙 Overnight Build System Complete${NC}" | tee -a "$BUILD_LOG"

exit 0

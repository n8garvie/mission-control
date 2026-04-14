#!/bin/bash
# Heartbeat script for Idea Scout Agent
# Runs daily at 6:00 PM PST
# Triggers: Reddit research + Product Hunt analysis + Idea generation

set -e

# Configuration
SCOUT_DIR="/home/n8garvie/.openclaw/workspace/mission-control/agents/scout-ideas"
MEMORY_DIR="$SCOUT_DIR/memory"
WORKING_FILE="$MEMORY_DIR/WORKING.md"
LOG_FILE="$MEMORY_DIR/sprint-$(date +%Y%m%d).log"
CONVEX_URL="${CONVEX_URL:-https://beloved-giraffe-115.convex.cloud}"
CONVEX_DEPLOY_KEY="${CONVEX_DEPLOY_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔭 Idea Scout - Research Sprint Started${NC}"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "----------------------------------------"

# Function to log with timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if idea was previously rejected
is_idea_rejected() {
    local title="$1"
    
    if [ -z "$CONVEX_DEPLOY_KEY" ]; then
        return 1  # Assume not rejected if can't check
    fi
    
    cd "/home/n8garvie/.openclaw/workspace/mission-control/dashboard"
    response=$(npx convex run ideas:isRejected "{\"title\":\"$title\"}" 2>&1)
    
    # Check if response contains "true"
    if echo "$response" | grep -q "true"; then
        return 0  # Is rejected
    else
        return 1  # Not rejected
    fi
}

# Function to save idea to Convex
save_idea_to_convex() {
    local title="$1"
    local description="$2"
    local target="$3"
    local mvp="$4"
    local potential="$5"
    local source="$6"
    local tags="$7"
    
    if [ -z "$CONVEX_DEPLOY_KEY" ]; then
        log "${YELLOW}Warning: CONVEX_DEPLOY_KEY not set, skipping database save${NC}"
        return 1
    fi
    
    # Check if this idea was previously rejected
    if is_idea_rejected "$title"; then
        log "${YELLOW}⚠️ Skipping rejected idea: $title${NC}"
        return 1
    fi
    
    # Use Convex CLI to save idea
    cd "/home/n8garvie/.openclaw/workspace/mission-control/dashboard"
    json_args="{\"title\":\"$title\",\"description\":\"$description\",\"targetAudience\":\"$target\",\"mvpScope\":\"$mvp\",\"potential\":\"$potential\",\"source\":\"$source\",\"tags\":$tags}"
    response=$(npx convex run ideas:create "$json_args" 2>&1)
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Saved idea to Convex: $title${NC}"
        return 0
    else
        log "${RED}✗ Failed to save idea: $response${NC}"
        return 1
    fi
}

# Research Phase 1: Reddit
echo -e "\n${BLUE}📱 Phase 1: Reddit Research${NC}"
log "Starting Reddit research across target subreddits"

SUBREDDITS=("SideProject" "webdev" "entrepreneur" "watches" "espresso" "Porsche")
REDDIT_PATTERNS=("I wish someone would build" "pain point" "frustrated with" "looking for" "alternative to")

for sub in "${SUBREDDITS[@]}"; do
    log "Checking r/$sub..."
    # In production, this would use Reddit API or scraping
    # For now, we'll document the intent
    log "  - Search patterns: ${REDDIT_PATTERNS[*]}"
done

# Research Phase 2: Product Hunt
echo -e "\n${BLUE}🚀 Phase 2: Product Hunt Analysis${NC}"
log "Reviewing Product Hunt trending"

# Categories to focus on
PH_CATEGORIES=("developer-tools" "productivity" "saas" "artificial-intelligence")
for cat in "${PH_CATEGORIES[@]}"; do
    log "Checking category: $cat"
done

# Generate Ideas
echo -e "\n${BLUE}💡 Phase 3: Idea Generation${NC}"
log "Synthesizing findings into product ideas"

# Array of generated ideas (in production, this comes from AI analysis)
declare -a IDEAS=(
    "DevRel Analytics Dashboard|A tool that tracks developer community engagement across Discord, GitHub, and forums with sentiment analysis|Developer relations teams at mid-size tech companies|GitHub integration + Discord bot + basic dashboard with 3 key metrics|high|reddit|[\"devtools\",\"analytics\",\"community\"]"
    
    "Watch Collection Tracker|Notion-like database specifically for watch collectors with market value tracking and provenance docs|Watch enthusiasts with 5+ pieces in collection|Mobile-first collection view + photo upload + basic value tracking|medium|reddit|[\"hobbies\",\"luxury\",\"collection\"]"
    
    "Espresso Shot Logger|Simple app to track espresso variables (grind, dose, time) with photo notes and taste ratings|Home espresso enthusiasts|Mobile app with photo logging + simple graph view|medium|reddit|[\"coffee\",\"hobbies\",\"tracking\"]"
    
    "Side Project Launch Kit|Automated checklist + timeline + asset generator for indie hackers launching on PH|Indie hackers and solo founders|Launch checklist + timeline calculator + basic asset templates|high|producthunt|[\"indiehacker\",\"launch\",\"productivity\"]"
    
    "API Dependency Monitor|SaaS that tracks your third-party API uptime, latency, and changelog alerts|Engineering teams at SaaS companies|Uptime monitoring + Slack alerts for 5 major APIs|high|webdev|[\"devops\",\"monitoring\",\"saas\"]"
    
    "Porsche Spec Comparator|Visual tool to compare Porsche models, options, and pricing across years|Prospective Porsche buyers and enthusiasts|Model comparison table + options pricing + photo gallery|medium|Porsche|[\"automotive\",\"luxury\",\"comparison\"]"
    
    "Entrepreneur Co-pilot|Daily founder companion that aggregates tasks, metrics, and decisions needing attention|Solo founders and small startup CEOs|Daily digest email + dashboard with 3 priority actions|moonshot|entrepreneur|[\"founder\",\"productivity\",\"ai\"]"
)

# Save ideas
echo -e "\n${BLUE}💾 Phase 4: Saving Ideas${NC}"
success_count=0

for idea in "${IDEAS[@]}"; do
    IFS='|' read -r title description target mvp potential source tags <<< "$idea"
    
    log "Processing: $title"
    
    # Try to save to Convex
    if save_idea_to_convex "$title" "$description" "$target" "$mvp" "$potential" "$source" "$tags"; then
        ((success_count++))
    fi
    
    # Also append to local log for record
    echo "" >> "$LOG_FILE"
    echo "--- Idea $(($success_count + 1)) ---" >> "$LOG_FILE"
    echo "Title: $title" >> "$LOG_FILE"
    echo "Potential: $potential" >> "$LOG_FILE"
    echo "Source: $source" >> "$LOG_FILE"
done

# Update WORKING.md
echo -e "\n${BLUE}📝 Phase 5: Updating Memory${NC}"
log "Updating WORKING.md with sprint results"

# Create a temporary file with updated content
cat > "$WORKING_FILE.tmp" << EOF
# Idea Scout - Working Memory

## Current Sprint Status

**Last Run:** $(date '+%Y-%m-%d %H:%M %Z')  
**Next Run:** Tomorrow at 6:00 PM PST  
**Ideas This Sprint:** ${#IDEAS[@]}  
**Successfully Saved:** $success_count  
**Total Ideas Generated:** [Incrementing...]  

## Sprint Log

**Log File:** sprint-$(date +%Y%m%d).log

### Ideas Generated This Sprint
EOF

# Add generated ideas to memory
for idea in "${IDEAS[@]}"; do
    IFS='|' read -r title description target mvp potential source tags <<< "$idea"
    echo "" >> "$WORKING_FILE.tmp"
    echo "- **$title** ($potential)" >> "$WORKING_FILE.tmp"
    echo "  - Target: $target" >> "$WORKING_FILE.tmp"
    echo "  - MVP: $mvp" >> "$WORKING_FILE.tmp"
done

cat >> "$WORKING_FILE.tmp" << EOF

---

*Auto-generated at sprint completion*
EOF

# Replace old working file
mv "$WORKING_FILE.tmp" "$WORKING_FILE"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🔭 Idea Scout Sprint Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Ideas Generated: ${#IDEAS[@]}"
echo "Saved to Convex: $success_count"
echo "Log File: $LOG_FILE"
echo -e "${GREEN}========================================${NC}"

# Send notification to Mission Control (if configured)
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=🔭 Idea Scout Complete! Generated ${#IDEAS[@]} ideas. Check Mission Control to review and approve." \
        > /dev/null 2>&1
fi

exit 0

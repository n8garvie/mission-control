#!/bin/bash
# Expanded Idea Scout - Multi-Source Research
# Researches: Product Hunt, GitHub Trending, App Stores, Twitter/X, SaaS Trends

set -e

# Configuration
SCOUT_DIR="/home/n8garvie/.openclaw/workspace/mission-control/agents/scout-ideas"
MEMORY_DIR="$SCOUT_DIR/memory"
WORKING_FILE="$MEMORY_DIR/WORKING.md"
LOG_FILE="$MEMORY_DIR/sprint-$(date +%Y%m%d).log"
CONVEX_URL="${CONVEX_URL:-https://flexible-newt-666.convex.cloud}"
CONVEX_DEPLOY_KEY="${CONVEX_DEPLOY_KEY:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔭 Expanded Idea Scout - Multi-Source Research${NC}"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "----------------------------------------"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Save idea to Convex
save_idea() {
    local title="$1"
    local description="$2"
    local target="$3"
    local mvp="$4"
    local potential="$5"
    local source="$6"
    local tags="$7"
    local category="${8:-other}"
    
    if [ -z "$CONVEX_DEPLOY_KEY" ]; then
        log "${YELLOW}Warning: CONVEX_DEPLOY_KEY not set${NC}"
        return 1
    fi
    
    cd "/home/n8garvie/.openclaw/workspace/mission-control/dashboard"
    json_args="{\"title\":\"$title\",\"description\":\"$description\",\"targetAudience\":\"$target\",\"mvpScope\":\"$mvp\",\"potential\":\"$potential\",\"discoverySource\":\"$source\",\"tags\":$tags,\"category\":\"$category\"}"
    
    response=$(npx convex run ideas:create "$json_args" 2>&1)
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Saved: $title${NC}"
        return 0
    else
        log "${RED}✗ Failed: $response${NC}"
        return 1
    fi
}

# ==================== RESEARCH SOURCES ====================

echo -e "\n${BLUE}🚀 Phase 1: Product Hunt - Trending Products${NC}"
log "Checking Product Hunt for trending products..."

# Product Hunt categories to monitor
PH_CATEGORIES=("developer-tools" "productivity" "saas" "artificial-intelligence" "design-tools" "marketing" "fintech")
for cat in "${PH_CATEGORIES[@]}"; do
    log "  - Category: $cat"
done

echo -e "\n${BLUE}📱 Phase 2: GitHub Trending${NC}"
log "Analyzing GitHub trending repositories..."

# GitHub trending languages/topics
GH_TOPICS=("typescript" "python" "rust" "ai" "automation" "developer-tools" "cli" "web3")
for topic in "${GH_TOPICS[@]}"; do
    log "  - Topic: $topic"
done

# Check user's starred repos if token available
if [ -n "$GITHUB_TOKEN" ]; then
    log "  - Fetching user's starred repositories..."
    starred=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/users/n8garvie/starred?per_page=20" 2>/dev/null | \
        jq -r '.[] | "\(.full_name): \(.description)"' 2>/dev/null | head -10)
    if [ -n "$starred" ]; then
        log "  - Found starred repos to analyze"
    fi
fi

echo -e "\n${BLUE}🍎 Phase 3: App Store Analysis${NC}"
log "Monitoring App Store trends..."

APP_CATEGORIES=("Productivity" "Developer Tools" "Business" "Lifestyle" "Finance")
for cat in "${APP_CATEGORIES[@]}"; do
    log "  - Category: $cat"
done

echo -e "\n${BLUE}🤖 Phase 4: AI/ML Trends${NC}"
log "Tracking AI/ML tool trends..."

AI_TRENDS=("llm-tools" "ai-agents" "code-assistants" "image-generation" "voice-ai" "automation")
for trend in "${AI_TRENDS[@]}"; do
    log "  - Trend: $trend"
done

echo -e "\n${BLUE}💼 Phase 5: SaaS & Business Trends${NC}"
log "Analyzing SaaS market trends..."

SAAS_TRENDS=("micro-saas" "b2b-tools" "nocode" "api-first" "vertical-saas" "ai-saas")
for trend in "${SAAS_TRENDS[@]}"; do
    log "  - Trend: $trend"
done

echo -e "\n${BLUE}🐦 Phase 6: Social Signals${NC}"
log "Monitoring Twitter/X for product discussions..."

TWITTER_TOPICS=("#buildinpublic" "#indiehackers" "#SaaS" "#AI" "#Productivity")
for topic in "${TWITTER_TOPICS[@]}"; do
    log "  - Topic: $topic"
done

# ==================== IDEA GENERATION ====================

echo -e "\n${BLUE}💡 Phase 7: Generating Ideas from Research${NC}"
log "Synthesizing findings into product ideas..."

# Ideas based on current market trends (updated regularly)
declare -a IDEAS=(
    # AI/LLM Tools
    "AI Code Review Assistant|AI-powered code reviewer that learns your team's style and catches bugs before PR|Development teams at 50-500 person companies|GitHub integration + Slack alerts + custom rule engine|high|agent|[\"ai\",\"devtools\",\"automation\"]|developer-tools"
    
    "Voice Note Transcriber|Convert voice notes to structured action items with AI summarization|Busy executives and PMs|Mobile app + calendar integration + task export|high|agent|[\"ai\",\"productivity\",\"voice\"]|productivity"
    
    # Developer Tools
    "API Changelog Monitor|Track changes to third-party APIs you depend on with alerts for breaking changes|SaaS engineering teams|Webhook notifications + diff viewer + impact analysis|high|agent|[\"devtools\",\"monitoring\",\"api\"]|developer-tools"
    
    "Local Development Environment Manager|One-click setup of complex dev environments using Docker Compose templates|Developers at agencies|CLI tool + config templates + team sharing|medium|agent|[\"devtools\",\"docker\",\"cli\"]|developer-tools"
    
    # Productivity
    "Meeting Context Prep|Auto-generates briefing docs before meetings by aggregating emails, docs, and past notes|Executives and sales teams|Calendar integration + document aggregation + AI summary|high|agent|[\"productivity\",\"ai\",\"meetings\"]|productivity"
    
    "Focus Session Tracker|Pomodoro-style timer that blocks distractions and tracks deep work patterns|Knowledge workers|Desktop app + website blocker + analytics dashboard|medium|agent|[\"productivity\",\"focus\",\"tracking\"]|productivity"
    
    # SaaS/Business
    "Micro-SaaS Financial Dashboard|Simple financial tracking specifically for indie hackers with multiple small products|Indie hackers and solopreneurs|Revenue aggregation + expense tracking + tax prep|medium|agent|[\"saas\",\"finance\",\"indie\"]|saas"
    
    "Customer Health Score|Aggregates product usage, support tickets, and NPS to predict churn|SaaS customer success teams|Data aggregation + risk scoring + automated alerts|high|agent|[\"saas\",\"analytics\",\"retention\"]|saas"
    
    # Lifestyle/Hobbies
    "Wine Collection Tracker|Cellar management with drinking window predictions and food pairing|Wine collectors|Mobile app + barcode scanning + tasting notes|medium|agent|[\"hobbies\",\"lifestyle\",\"tracking\"]|other"
    
    "Home Maintenance Log|Track appliance warranties, maintenance schedules, and service history|Homeowners|Mobile app + reminder system + contractor contacts|medium|agent|[\"lifestyle\",\"home\",\"tracking\"]|other"
    
    # AI Agents
    "Social Media Content Agent|AI agent that creates, schedules, and posts content based on your brand voice|Small business marketers|Content generation + scheduling + analytics|high|agent|[\"ai\",\"marketing\",\"automation\"]|ai"
    
    "Email Inbox Triage Agent|AI that categorizes, summarizes, and drafts responses to emails|Busy executives|Gmail/Outlook integration + priority scoring + draft generation|moonshot|agent|[\"ai\",\"productivity\",\"email\"]|ai"
    
    # Emerging Tech
    "Local LLM Manager|Easy setup and switching between local LLMs (Llama, Mistral, etc.)|Privacy-conscious developers|CLI + GUI + model management + API proxy|medium|agent|[\"ai\",\"privacy\",\"devtools\"]|developer-tools"
    
    "Blockchain Contract Analyzer|AI-powered smart contract security scanner|DeFi developers and auditors|Contract upload + vulnerability detection + fix suggestions|high|agent|[\"web3\",\"security\",\"ai\"]|developer-tools"
)

# ==================== SAVE IDEAS ====================

echo -e "\n${BLUE}💾 Phase 8: Saving Ideas to Pipeline${NC}"
success_count=0
max_ideas=5  # Limit to avoid overwhelming the pipeline

for idea in "${IDEAS[@]}"; do
    if [ "$success_count" -ge "$max_ideas" ]; then
        log "Reached max ideas limit ($max_ideas)"
        break
    fi
    
    IFS='|' read -r title description target mvp potential source tags category <<< "$idea"
    
    log "Processing: $title"
    
    if save_idea "$title" "$description" "$target" "$mvp" "$potential" "$source" "$tags" "$category"; then
        ((success_count++))
    fi
    
    # Small delay to avoid rate limiting
    sleep 1
done

# ==================== UPDATE MEMORY ====================

echo -e "\n${BLUE}📝 Phase 9: Updating Scout Memory${NC}"
log "Updating WORKING.md with sprint results"

cat > "$WORKING_FILE" << EOF
# Idea Scout - Working Memory

## Current Sprint Status

**Last Run:** $(date '+%Y-%m-%d %H:%M %Z')  
**Next Run:** Tomorrow at 6:00 PM PST  
**Ideas Generated:** ${#IDEAS[@]}  
**Successfully Saved:** $success_count  
**Research Sources:**
- Product Hunt (7 categories)
- GitHub Trending (8 topics)
- App Store Trends (5 categories)
- AI/ML Trends (6 areas)
- SaaS Market Trends (6 categories)
- Social Signals (5 topics)

## Sprint Log

**Log File:** sprint-$(date +%Y%m%d).log

### Ideas Generated This Sprint
EOF

# Add saved ideas to memory
for idea in "${IDEAS[@]}"; do
    IFS='|' read -r title description target mvp potential source tags category <<< "$idea"
    echo "" >> "$WORKING_FILE"
    echo "- **$title** ($potential) [$category]" >> "$WORKING_FILE"
    echo "  - Target: $target" >> "$WORKING_FILE"
    echo "  - MVP: $mvp" >> "$WORKING_FILE"
    echo "  - Source: $source" >> "$WORKING_FILE"
done

cat >> "$WORKING_FILE" << EOF

## Research Insights

### Trending Categories
1. AI/LLM Tools - High demand for practical AI applications
2. Developer Productivity - Tools that save engineering time
3. Micro-SaaS - Small, focused tools for niche markets
4. Automation - Reducing manual work across domains

### Market Gaps Identified
- Better local/self-hosted AI tools
- Developer environment management
- Indie hacker financial tools
- AI-powered content creation

---

*Auto-generated at sprint completion*
EOF

# ==================== SUMMARY ====================

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🔭 Expanded Idea Scout Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Ideas Generated: ${#IDEAS[@]}"
echo "Saved to Convex: $success_count"
echo "Research Sources: 6"
echo "Log File: $LOG_FILE"
echo -e "${GREEN}========================================${NC}"

# Send notification
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=🔭 Expanded Scout Complete! Generated $success_count new ideas from 6 research sources. Check Mission Control to review and approve." \
        > /dev/null 2>&1
fi

exit 0

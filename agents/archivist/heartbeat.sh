#!/bin/bash
# Archivist Heartbeat - Archive Scout's research to wiki
# Runs daily at 6:30 PM PST (30 min after Scout)

set -e

MISSION_CONTROL_DIR="/home/n8garvie/.openclaw/workspace/mission-control"
WIKI_DIR="/home/n8garvie/NateMate/notes/NateMateNotes/SavedWiki"
SCOUT_MEMORY="$MISSION_CONTROL_DIR/agents/scout-ideas/memory"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📚 Archivist Heartbeat${NC}"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# Check for Scout's latest sprint
LATEST_SPRINT=$(ls -t "$SCOUT_MEMORY"/sprint-*.json 2>/dev/null | head -1)

if [ -z "$LATEST_SPRINT" ]; then
    echo -e "${YELLOW}⚠️  No Scout sprint found${NC}"
    exit 0
fi

# Check if already archived
SPRINT_DATE=$(basename "$LATEST_SPRINT" | sed 's/sprint-//' | sed 's/.json//')
ARCHIVE_MARKER="$SCOUT_MEMORY/.archived-$SPRINT_DATE"

if [ -f "$ARCHIVE_MARKER" ]; then
    echo -e "${GREEN}✓ Already archived: $SPRINT_DATE${NC}"
    exit 0
fi

echo "Processing sprint: $SPRINT_DATE"

# Create wiki directories
mkdir -p "$WIKI_DIR/ideas"
mkdir -p "$WIKI_DIR/research/reddit"
mkdir -p "$WIKI_DIR/research/producthunt"
mkdir -p "$WIKI_DIR/research/hackernews"
mkdir -p "$WIKI_DIR/patterns"

# Process the sprint data
node "$MISSION_CONTROL_DIR/agents/archivist/archive-sprint.js" "$LATEST_SPRINT"

if [ $? -eq 0 ]; then
    touch "$ARCHIVE_MARKER"
    echo -e "${GREEN}✓ Archive complete${NC}"
else
    echo -e "${RED}✗ Archive failed${NC}"
    exit 1
fi

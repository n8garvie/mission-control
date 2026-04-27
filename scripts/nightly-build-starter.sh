#!/bin/bash
# Nightly Build Starter - Automatically start builds for approved ideas
# Runs daily at 1 AM to spawn agents for approved ideas

set -e

# Required environment variables must be set externally
if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "Error: CONVEX_DEPLOY_KEY env var must be set" >&2
    exit 1
fi

# Change to mission control directory
cd /home/n8garvie/.openclaw/workspace/mission-control

# Log file
LOG_FILE="logs/nightly-build-starter-$(date +%Y%m%d).log"
mkdir -p logs

echo "========================================" >> "$LOG_FILE"
echo "Nightly Build Starter: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Get list of approved ideas
cd dashboard

echo "Checking for approved ideas to build..." >> "$LOG_FILE"

# Query for approved ideas
APPROVED_JSON=$(npx convex run ideas:list 2>/dev/null | jq -r '[.[] | select(.pipelineStatus == "approved") | {id: ._id, title: .title}]')

if [ "$APPROVED_JSON" == "[]" ] || [ -z "$APPROVED_JSON" ]; then
    echo "No approved ideas found." >> "$LOG_FILE"
    exit 0
fi

# Count ideas to build
IDEA_COUNT=$(echo "$APPROVED_JSON" | jq 'length')
echo "Found $IDEA_COUNT approved ideas" >> "$LOG_FILE"

# Process each approved idea
echo "$APPROVED_JSON" | jq -c '.[]' | while read -r idea; do
    IDEA_ID=$(echo "$idea" | jq -r '.id')
    IDEA_TITLE=$(echo "$idea" | jq -r '.title')
    
    echo "" >> "$LOG_FILE"
    echo "Processing: $IDEA_TITLE" >> "$LOG_FILE"
    echo "Idea ID: $IDEA_ID" >> "$LOG_FILE"
    
    # Generate a build ID
    BUILD_ID="build-$(date +%Y%m%d)-$(echo $IDEA_ID | cut -c1-8)"
    
    # Update idea status to spawning
    npx convex run ideas:updateStatus "{\"id\": \"$IDEA_ID\", \"status\": \"spawning\"}" 2>&1 >> "$LOG_FILE" || true
    
    # Spawn the build agent using OpenClaw
    cd /home/n8garvie/.openclaw/workspace/mission-control
    
    # Create the agent spawn payload
    PAYLOAD=$(jq -n \
        --arg ideaId "$IDEA_ID" \
        --arg buildId "$BUILD_ID" \
        --arg title "$IDEA_TITLE" \
        '{ideaId: $ideaId, buildId: $buildId, title: $title}')
    
    echo "Spawning build agent for: $IDEA_TITLE" >> "$LOG_FILE"
    
    # Use OpenClaw to spawn a subagent for the build
    # This will create a new session that runs the build
    openclaw sessions spawn \
        --task "Build the app: $IDEA_TITLE. Read the idea details from Mission Control (idea ID: $IDEA_ID) and implement a working MVP. Use the build-executor pattern. Report progress back to Mission Control." \
        --mode session \
        --timeout 3600 \
        2>&1 >> "$LOG_FILE" || echo "Spawn command failed for $IDEA_TITLE" >> "$LOG_FILE"
    
    # Wait between spawns to avoid overwhelming
    sleep 10
done

echo "" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "Nightly Build Starter Complete: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

exit 0

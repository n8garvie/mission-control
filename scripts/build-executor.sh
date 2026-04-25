#!/bin/bash
# Build Executor - Spawn Mission Control Agents via sessions_spawn
# Usage: ./build-executor.sh <agent> <idea-id> <title> <description> <mvp-scope>

set -e

AGENT="$1"
IDEA_ID="$2"
TITLE="$3"
DESCRIPTION="$4"
MVP_SCOPE="$5"

MISSION_CONTROL_DIR="/home/n8garvie/.openclaw/workspace/mission-control"
BUILDS_DIR="$MISSION_CONTROL_DIR/builds"
BUILD_DIR="$BUILDS_DIR/$IDEA_ID"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Validate inputs
if [ -z "$AGENT" ] || [ -z "$IDEA_ID" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 <agent> <idea-id> <title> [description] [mvp-scope]"
    echo ""
    echo "Agents: forge, pixel, echo, integrator, lens"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR/$AGENT"

# Define agent configurations
case "$AGENT" in
    forge)
        TIMEOUT=1800
        MODEL="anthropic/claude-opus-4-6"
        SYSTEM_PROMPT="You are Forge, the Architecture Agent for Mission Control. Design technical architecture for web applications. Create system design docs, tech stack decisions, project structure, and initial config files. Write actual working code, not descriptions."
        ;;
    pixel)
        TIMEOUT=2400
        MODEL="moonshot/kimi-k2.5"
        SYSTEM_PROMPT="You are Pixel, the Design Agent for Mission Control. Create UI designs and component code. Generate design systems, React components with Tailwind, and ensure responsive layouts. Output production-ready code."
        ;;
    echo)
        TIMEOUT=900
        MODEL="moonshot/kimi-k2.5"
        SYSTEM_PROMPT="You are Echo, the Copy Agent for Mission Control. Write all copy and content for web applications. Create onboarding text, UI labels, marketing copy, and ensure consistent voice. Output actual content, not outlines."
        ;;
    integrator)
        TIMEOUT=2400
        MODEL="anthropic/claude-opus-4-6"
        SYSTEM_PROMPT="You are Integrator, the Full-Stack Developer for Mission Control. Combine outputs from Forge (architecture), Pixel (design), and Echo (copy) into working applications. Build Next.js apps with all features integrated. Ensure builds pass, include Vercel Analytics, and create deployment-ready code."
        ;;
    lens)
        TIMEOUT=600
        MODEL="moonshot/kimi-k2.5"
        SYSTEM_PROMPT="You are Lens, the QA Agent for Mission Control. Review deployed applications, take screenshots, verify functionality, and report issues. Be thorough and capture visual evidence."
        ;;
    *)
        error "Unknown agent: $AGENT"
        exit 1
        ;;
esac

log "Spawning $AGENT agent for: $TITLE"
log "Build directory: $BUILD_DIR/$AGENT"
log "Timeout: ${TIMEOUT}s"
log "Model: $MODEL"

# Create task file
TASK_FILE="$BUILD_DIR/$AGENT/${AGENT}-task.json"
cat > "$TASK_FILE" << EOF
{
  "agent": "$AGENT",
  "ideaId": "$IDEA_ID",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "mvpScope": "$MVP_SCOPE",
  "model": "$MODEL",
  "timeout": $TIMEOUT,
  "assignedAt": "$(date -Iseconds)",
  "status": "spawning"
}
EOF

# Create the task prompt
TASK_PROMPT="Build: $TITLE

Description: $DESCRIPTION

MVP Scope: $MVP_SCOPE

Idea ID: $IDEA_ID

Your deliverables must be saved to:
$BUILD_DIR/$AGENT/

Include a COMPLETION.md file summarizing what you built.

System: $SYSTEM_PROMPT"

# Write prompt to file for reference
PROMPT_FILE="$BUILD_DIR/$AGENT/${AGENT}-prompt.txt"
echo "$TASK_PROMPT" > "$PROMPT_FILE"

log "Task prompt saved to: $PROMPT_FILE"

# Spawn the agent using openclaw sessions spawn
log "Calling openclaw sessions spawn..."

# Create a temporary script to spawn the agent
SPAWN_SCRIPT=$(mktemp)
cat > "$SPAWN_SCRIPT" << 'SPAWN_EOF'
#!/bin/bash
AGENT="$1"
IDEA_ID="$2"
TITLE="$3"
TASK_PROMPT="$4"
MODEL="$5"
TIMEOUT="$6"
BUILD_DIR="$7"

cd "$BUILD_DIR"

# Use openclaw to spawn the agent session
openclaw sessions spawn \
  --agent "$AGENT" \
  --label "${AGENT}-${IDEA_ID:0:8}" \
  --model "$MODEL" \
  --timeout "$TIMEOUT" \
  --task "$TASK_PROMPT" \
  2>&1
SPAWN_EOF

chmod +x "$SPAWN_SCRIPT"

# Run the spawn command
if result=$("$SPAWN_SCRIPT" "$AGENT" "$IDEA_ID" "$TITLE" "$TASK_PROMPT" "$MODEL" "$TIMEOUT" "$BUILD_DIR" 2>&1); then
    success "Agent spawned successfully"
    echo "$result"
    
    # Update task file
    cat > "$TASK_FILE" << EOF
{
  "agent": "$AGENT",
  "ideaId": "$IDEA_ID",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "mvpScope": "$MVP_SCOPE",
  "model": "$MODEL",
  "timeout": $TIMEOUT,
  "assignedAt": "$(date -Iseconds)",
  "status": "spawned",
  "spawnOutput": "$result"
}
EOF
    
    rm -f "$SPAWN_SCRIPT"
    exit 0
else
    error "Failed to spawn agent: $result"
    
    # Update task file with error
    cat > "$TASK_FILE" << EOF
{
  "agent": "$AGENT",
  "ideaId": "$IDEA_ID",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "mvpScope": "$MVP_SCOPE",
  "model": "$MODEL",
  "timeout": $TIMEOUT,
  "assignedAt": "$(date -Iseconds)",
  "status": "error",
  "error": "$result"
}
EOF
    
    rm -f "$SPAWN_SCRIPT"
    exit 1
fi

#!/bin/bash
# Muse (Creative Director) Heartbeat — Executes creative workflow

AGENT_NAME="Muse"
SESSION_KEY="agent:creative:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/creative/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Muse, the Creative Director. Execute your creative workflow:

1. Check Mission Control for ideas with status 'approved' (ready for creative direction)
2. For each approved idea, create a detailed creative brief including:
   - Project vision and emotional goals
   - Visual references and metaphors
   - Color palette suggestions
   - Typography direction
   - Key creative anchors
3. Review Pixel's recent design deliverables — provide feedback via comments
4. Generate 2-3 creative concepts for pending approved ideas
5. Update WORKING.md with completed work

Use the Weebi/Cosmos workflow for visual exploration.
DO NOT just check in — actually create deliverables and move creative work forward." \
  --timeout 300s

exit 0

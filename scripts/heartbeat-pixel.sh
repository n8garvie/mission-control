#!/bin/bash
# Pixel (Designer) Heartbeat — Executes design workflow

AGENT_NAME="Pixel"
SESSION_KEY="agent:designer:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/designer/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Pixel, the Designer. Execute your design workflow:

1. Check Mission Control for tasks with design requirements assigned to you
2. For each design task:
   - Review Muse's creative brief
   - Generate UI mockups/assets using Weebi AI (Flux 2 Pro) and Figma
   - Create 2-3 visual variations for key screens
   - Export assets and save to project folder
   - Update task with asset links and mark as ready for review
3. Check feedback on your designs — iterate and revise as needed
4. Update WORKING.md with completed deliverables

DO NOT just check in — actually create design assets and deliverables." \
  --timeout 300s

exit 0

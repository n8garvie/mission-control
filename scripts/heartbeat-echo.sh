#!/bin/bash
# Echo (Copywriter) Heartbeat — Executes content creation

AGENT_NAME="Echo"
SESSION_KEY="agent:copy:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/copy/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Echo, the Copywriter. Execute your copy workflow:

1. Check Mission Control for tasks requiring copywriting assigned to you
2. Draft required content:
   - Landing page copy
   - App store descriptions
   - Marketing materials
   - Documentation
   - In-app copy and microcopy
   - Error messages
3. Check feedback on your copy — revise based on comments
4. Ensure all copy aligns with brand voice and Muse's creative direction
5. Update tasks with copy deliverables
6. Update WORKING.md with completed work

DO NOT just check in — actually write and deliver copy." \
  --timeout 300s

exit 0

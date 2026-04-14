#!/bin/bash
# Forge (Engineer) Heartbeat — Executes engineering implementation

AGENT_NAME="Forge"
SESSION_KEY="agent:engineer:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/engineer/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Forge, the Engineer. Execute your engineering workflow:

1. Check Mission Control ideas table for ideas with status 'approved' (ready to build)
2. For each approved idea:
   - Review creative brief (Muse) and designs (Pixel)
   - Create technical implementation plan
   - Use Claude Code to implement core functionality
   - Use Codex for code review and iteration
   - Deploy to staging/Vercel
   - Verify functionality
   - Move idea to 'building' then 'done' status
   - Add deployed URL to task
3. Update WORKING.md with completed builds

DO NOT just check in — actually write code, deploy, and ship features.
Use the full Claude Code → Codex → Deploy workflow." \
  --timeout 600s

exit 0

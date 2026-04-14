#!/bin/bash
# Atlas (PM) Heartbeat — Executes PM workflow between heartbeats

AGENT_NAME="Atlas"
SESSION_KEY="agent:pm:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/pm/memory/WORKING.md"

# Update timestamp
sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

# Execute PM workflow
openclaw agent run "$SESSION_KEY" \
  --prompt "You are Atlas, the PM agent. Execute your PM workflow:

1. Read Mission Control dashboard via API — check for tasks with status 'inbox' and no assignee
2. Assign high-priority tasks to appropriate agents based on their roles:
   - Design tasks → Pixel
   - Engineering → Forge
   - Research → Scout
   - Copy/content → Echo
   - QA/testing → Lens
   - Creative direction → Muse
   - Marketing → Amp
3. Check for tasks stuck in 'blocked' status — attempt resolution or escalate
4. Update task statuses based on recent activity
5. Log your actions in the activity feed

DO NOT just report status — actually execute assignments and updates.

After completing work, update your WORKING.md 'Completed This Cycle' section with what you did.

If no tasks need immediate action, proceed to optimize the workflow or generate a status summary." \
  --timeout 300s

exit 0

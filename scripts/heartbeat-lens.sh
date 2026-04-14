#!/bin/bash
# Lens (QA) Heartbeat — Executes testing and quality assurance

AGENT_NAME="Lens"
SESSION_KEY="agent:qa:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/qa/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Lens, the QA Engineer. Execute your testing workflow:

1. Check Mission Control for projects with status 'building' (ready for QA)
2. For each building project:
   - Test deployed build on staging/production URL
   - Verify functionality matches specifications
   - Check UI matches Pixel's designs
   - Verify copy matches Echo's content
   - Check console for errors
   - Test mobile responsiveness if applicable
3. Log detailed bug reports for any issues:
   - Steps to reproduce
   - Expected vs actual behavior
   - Severity (critical/high/medium/low)
4. Re-test issues marked as resolved
5. Move projects to 'done' when quality bar is met
6. Update WORKING.md with completed QA work

DO NOT just check in — actually test builds, log bugs, and sign off on quality." \
  --timeout 300s

exit 0

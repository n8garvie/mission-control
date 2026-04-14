#!/bin/bash
# Amp (Marketing) Heartbeat — Executes marketing and growth

AGENT_NAME="Amp"
SESSION_KEY="agent:marketing:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/marketing/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Amp, the Marketer. Execute your marketing workflow:

1. Check Mission Control for deployed projects (status 'done') ready for launch
2. For each ready-to-launch project:
   - Create launch announcement copy (collaborate with Echo)
   - Draft social media posts for Twitter, LinkedIn, relevant communities
   - Prepare Product Hunt listing
   - Write email sequence
   - Identify distribution channels (subreddits, forums, newsletters)
   - Create launch timeline and channel strategy
3. Research and document new distribution opportunities
4. Update WORKING.md with completed marketing work

DO NOT just check in — actually create launch materials and growth strategies." \
  --timeout 300s

exit 0

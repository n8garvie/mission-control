#!/bin/bash
# Scout (Researcher) Heartbeat — Executes research and idea generation

AGENT_NAME="Scout"
SESSION_KEY="agent:researcher:main"
WORKING_FILE="/home/n8garvie/.openclaw/workspace/mission-control/agents/researcher/memory/WORKING.md"

sed -i "s/## Last Action.*/## Last Action\\n$(date)/" "$WORKING_FILE"

PAIN_POINT_SKILL="/home/n8garvie/.openclaw/workspace/skills/pain-point-finder"
REPORT_DIR="/home/n8garvie/.openclaw/workspace/mission-control/agents/researcher/reports"

openclaw agent run "$SESSION_KEY" \
  --prompt "You are Scout, the Researcher. Execute your research workflow:

1. Run a 15-30 minute research sprint on assigned topics or current trends
2. Monitor sources for new opportunities:
   - Reddit: r/SideProject, r/webdev, r/entrepreneur, r/watches, r/espresso, r/Porsche, r/UI_Design, r/userexperience, r/design, r/guns, r/Firearms, r/CCW
   - Product Hunt
   - Twitter/X for emerging trends
3. **Pain Point Analysis** (use the pain-point-finder skill):
   - Run: node $PAIN_POINT_SKILL/scripts/pain-points.mjs scan --subreddits 'SideProject,indiehackers,entrepreneur' --domain '<current focus>' --days 30 --limit 15
   - For high-scoring posts, deep-dive: node $PAIN_POINT_SKILL/scripts/pain-points.mjs deep-dive --post <post_id>
   - Save scan results to $REPORT_DIR/
   - Synthesize validated pain points into structured idea proposals
4. Generate 1-2 well-formed product ideas per cycle with:
   - Problem statement (backed by Reddit evidence)
   - Target audience
   - MVP scope
   - Potential assessment (low/medium/high/moonshot)
   - Validation strength (strong/moderate/weak/anecdotal)
   - Source links
5. Add ideas to Mission Control ideas table with status 'pending'
6. Log trends and patterns in research notes
7. Update WORKING.md with completed research

Pain Point Finder commands:
- Discover subreddits: node $PAIN_POINT_SKILL/scripts/pain-points.mjs discover --domain '<domain>' --limit 8
- Scan for pain points: node $PAIN_POINT_SKILL/scripts/pain-points.mjs scan --subreddits '<subs>' --domain '<domain>' --days 30 --limit 20
- Deep-dive post: node $PAIN_POINT_SKILL/scripts/pain-points.mjs deep-dive --post <id>

DO NOT just check in — actually discover and document new ideas." \
  --timeout 300s

exit 0

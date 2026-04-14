#!/bin/bash
# Pain Point Scanner — Runs via Scout's research workflow
# Scans configured subreddits for validated pain points and outputs JSON reports
# to mission-control/agents/researcher/reports/

SKILL_DIR="/home/n8garvie/.openclaw/workspace/skills/pain-point-finder"
REPORT_DIR="/home/n8garvie/.openclaw/workspace/mission-control/agents/researcher/reports"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)

mkdir -p "$REPORT_DIR"

# Domains to monitor (aligned with Nathan's interests)
# Add/remove domains as needed
DOMAINS=(
  "watches:watches,Watchexchange,WatchesCirclejerk,JapaneseWatches"
  "espresso:espresso,Coffee,cafe"
  "side projects:SideProject,indiehackers,EntrepreneurRideAlong"
  "AI agents:ClaudeCode,LocalLLaMA,OpenAI,MachineLearning"
  "Porsche:Porsche,Porsche_Cayman,993,996"
  "design:design,graphic_design,web_design,DesignDesign"
  "UI design:UI_Design,userexperience,UXDesign,FigmaDesign"
  "firearms:guns,Firearms,CCW,GunAccessoriesForSale,longrange"
)

for entry in "${DOMAINS[@]}"; do
  DOMAIN="${entry%%:*}"
  SUBS="${entry##*:}"
  SAFE_DOMAIN=$(echo "$DOMAIN" | tr ' ' '_')
  
  echo "[$(date)] Scanning domain: $DOMAIN (subs: $SUBS)" >&2
  
  node "$SKILL_DIR/scripts/pain-points.mjs" scan \
    --subreddits "$SUBS" \
    --domain "$DOMAIN" \
    --days 30 \
    --limit 15 \
    --minComments 3 \
    > "$REPORT_DIR/scan_${SAFE_DOMAIN}_${TIMESTAMP}.json" 2>/dev/null
  
  # Rate limit between domains
  sleep 5
done

echo "[$(date)] Pain point scan complete. Reports in $REPORT_DIR" >&2

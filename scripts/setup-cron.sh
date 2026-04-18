#!/bin/bash
# Setup cron jobs for all agents
# Staggered every 2 minutes within each 15-minute window

SCRIPT_DIR="/home/n8garvie/.openclaw/workspace/mission-control/scripts"

echo "Setting up Mission Control agent cron jobs..."
echo ""
echo "Schedule:"
echo "  :00, :15, :30, :45 - Atlas (PM)"
echo "  :02, :17, :32, :47 - Muse (Creative Director)"
echo "  :04, :19, :34, :49 - Pixel (Designer)"
echo "  :06, :21, :36, :51 - Scout (Researcher)"
echo "  :07, :22, :37, :52 - Archivist (Knowledge Manager) - 1 min after Scout"
echo "  :08, :23, :38, :53 - Forge (Tech Lead)"
echo "  :10, :25, :40, :55 - Lens (QA)"
echo "  :12, :27, :42, :57 - Echo (Copywriter)"
echo "  :14, :29, :44, :59 - Amp (Marketer)"
echo ""

# Create a temporary crontab file
TEMP_CRON=$(mktemp)

# Get existing crontab (if any)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Add Mission Control jobs (remove any existing ones first)
sed -i '/mission-control/d' "$TEMP_CRON"

cat >> "$TEMP_CRON" << EOF

# Mission Control Agent Heartbeats
0,15,30,45 * * * * $SCRIPT_DIR/heartbeat-atlas.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/atlas.log 2>&1
2,17,32,47 * * * * $SCRIPT_DIR/heartbeat-muse.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/muse.log 2>&1
4,19,34,49 * * * * $SCRIPT_DIR/heartbeat-pixel.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/pixel.log 2>&1
6,21,36,51 * * * * $SCRIPT_DIR/heartbeat-scout.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/scout.log 2>&1
7,22,37,52 * * * * /home/n8garvie/.openclaw/workspace/mission-control/agents/archivist/heartbeat.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/archivist.log 2>&1
8,23,38,53 * * * * $SCRIPT_DIR/heartbeat-forge.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/forge.log 2>&1
10,25,40,55 * * * * $SCRIPT_DIR/heartbeat-lens.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/lens.log 2>&1
12,27,42,57 * * * * $SCRIPT_DIR/heartbeat-echo.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/echo.log 2>&1
14,29,44,59 * * * * $SCRIPT_DIR/heartbeat-amp.sh >> /home/n8garvie/.openclaw/workspace/mission-control/logs/amp.log 2>&1
EOF

# Install the new crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# Create logs directory
mkdir -p /home/n8garvie/.openclaw/workspace/mission-control/logs

echo "✅ Cron jobs installed successfully!"
echo ""
echo "To view active cron jobs: crontab -l"
echo "To remove cron jobs: crontab -e (then delete the lines)"
echo ""
echo "Logs will be written to: /home/n8garvie/.openclaw/workspace/mission-control/logs/"

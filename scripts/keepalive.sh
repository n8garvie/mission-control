#!/bin/bash
# Mission Control Dashboard Keepalive Script

if ! pgrep -f "next dev" > /dev/null; then
    echo "$(date): Dashboard not running, starting..." >> /tmp/dashboard-keepalive.log
    cd /home/n8garvie/.openclaw/workspace/mission-control/dashboard
    nohup npm run dev > /tmp/dashboard.log 2>&1 &
    echo "$(date): Dashboard started" >> /tmp/dashboard-keepalive.log
fi

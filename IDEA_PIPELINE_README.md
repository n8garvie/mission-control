# Nightly Idea Pipeline

An automated system for discovering, evaluating, and building product ideas overnight.

## Overview

The Nightly Idea Pipeline consists of:

1. **Idea Scout Agent** 🔭 - Daily research sprints at 6 PM PST
2. **Idea Pipeline Dashboard** 💡 - Review and approve ideas
3. **Overnight Build System** 🌙 - Automated builds at 10 PM PST

## Components

### Convex Backend

- **Schema**: `convex/schema.ts` - Added `ideas` table
- **Functions**: `convex/ideas.ts` - CRUD operations and workflow state management

### Dashboard UI

- **Ideas Page**: `/dashboard/app/ideas/page.tsx`
- **Idea Card**: `/dashboard/app/components/IdeaCard.tsx`
- **Navigation**: Updated main page with Ideas link and badge

### Agents

- **Scout Configuration**: `agents/scout-ideas/SOUL.md`
- **Working Memory**: `agents/scout-ideas/memory/WORKING.md`
- **Pixel Configuration**: `agents/designer/SOUL.md` - Updated with Variant integration
- **Pixel Workflow**: `agents/designer/memory/WORKING.md` - Design generation process
- **Variant Guide**: `agents/designer/memory/VARIANT_GUIDE.md` - Prompt library and workflow

### Scripts

- **Heartbeat**: `scripts/heartbeat-scout-ideas.sh` - 6 PM daily
- **Overnight Build**: `scripts/overnight-build.sh` - 10 PM daily
- **Variant Helper**: `scripts/variant-generate.sh` - Design generation helper

## Setup Instructions

### 1. Deploy Convex Schema Changes

```bash
cd mission-control/dashboard
npx convex dev  # or npx convex deploy for production
```

This will push the updated schema with the new `ideas` table.

### 2. Set Environment Variables

Create a `.env` file in `/mission-control/` with:

```bash
# Convex
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_ADMIN_KEY=your-admin-key

# GitHub (for repo creation)
GITHUB_TOKEN=ghp_your-token

# Vercel (for deployment)
VERCEL_TOKEN=your-vercel-token

# OpenClaw (optional, for agent spawning)
OPENCLAW_TOKEN=your-openclaw-token

# Telegram (optional, for notifications)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

### 3. Set Up Cron Jobs

Install the cron jobs for automated execution:

```bash
# Edit crontab
crontab -e

# Add these lines (adjust paths):
0 2 * * * cd /home/n8garvie/.openclaw/workspace/mission-control && bash scripts/heartbeat-scout-ideas.sh >> logs/scout-cron.log 2>&1
0 6 * * * cd /home/n8garvie/.openclaw/workspace/mission-control && bash scripts/overnight-build.sh >> logs/build-cron.log 2>&1
```

Or use the provided file:
```bash
crontab crontab.txt
```

### 4. Verify Dashboard

Start the Next.js development server:

```bash
cd mission-control/dashboard
npm run dev
```

Navigate to `http://localhost:3000/ideas` to see the Idea Pipeline.

## Workflow

### Daily Schedule

| Time (PST) | Action | Agent |
|------------|--------|-------|
| 6:00 PM | Research sprint begins | Scout 🔭 |
| 6:30 PM | Ideas saved to Convex | Scout 🔭 |
| Evening | Review & approve ideas | You 👤 |
| 10:00 PM | Check for approved ideas | System |
| 10:05 PM | Trigger overnight build | System |
| Overnight | Architecture, UI, Copy | Forge, Pixel, Echo |
| Morning | Review deployment | You 👤 |

### Idea States

```
pending → approved → building → done
   ↓
 (deleted)
```

- **Pending**: New ideas from Scout, awaiting your review
- **Approved**: You've approved it for building
- **Building**: Overnight build is in progress
- **Done**: Successfully deployed

## Manual Testing

### Test Scout Script

```bash
export CONVEX_URL=...
export CONVEX_ADMIN_KEY=...
./scripts/heartbeat-scout-ideas.sh
```

### Test Build Script

```bash
export CONVEX_URL=...
export CONVEX_ADMIN_KEY=...
export GITHUB_TOKEN=...
export VERCEL_TOKEN=...
./scripts/overnight-build.sh
```

### Test Dashboard

1. Manually create an idea via Convex dashboard
2. Navigate to `/ideas` in the dashboard
3. Click "Approve & Build"
4. Check that status changes to "approved"

## File Structure

```
mission-control/
├── agents/
│   └── scout-ideas/
│       ├── SOUL.md              # Agent personality & purpose
│       └── memory/
│           └── WORKING.md       # Working memory & logs
├── scripts/
│   ├── heartbeat-scout-ideas.sh # 6 PM daily research sprint
│   └── overnight-build.sh       # 10 PM build trigger
├── builds/                      # Build tracking files
├── logs/                        # Cron job logs
├── crontab.txt                  # Cron job configuration
└── dashboard/
    ├── convex/
    │   ├── schema.ts            # Updated with ideas table
    │   └── ideas.ts             # Ideas API functions
    └── app/
        ├── ideas/
        │   └── page.tsx         # Ideas dashboard
        └── components/
            └── IdeaCard.tsx     # Idea card component
```

## Monitoring

### Logs

```bash
# Scout agent logs
tail -f logs/scout-cron.log
tail -f agents/scout-ideas/memory/sprint-YYYYMMDD.log

# Build logs
tail -f logs/build-cron.log
tail -f logs/build-YYYYMMDD-HHMMSS.log
```

### Dashboard

- **Ideas Page**: View all ideas by status
- **Stats**: Real-time counts in header
- **Activity Feed**: See idea-related activities

## Troubleshooting

### Ideas not appearing in dashboard

1. Check Convex deployment: `npx convex dev`
2. Verify schema has `ideas` table
3. Check browser console for errors

### Scout script not running

1. Verify cron job: `crontab -l`
2. Check script permissions: `chmod +x scripts/*.sh`
3. Check logs: `cat logs/scout-cron.log`

### Build not triggering

1. Ensure CONVEX_ADMIN_KEY is set
2. Check approved ideas exist: query `ideas:getApproved`
3. Verify GitHub/Vercel tokens

## Future Enhancements

- [ ] AI-powered idea generation (not just templates)
- [ ] Reddit/Product Hunt API integration
- [ ] Email notifications for new ideas
- [ ] Idea voting/ranking system
- [ ] Integration with more deployment targets (Netlify, Railway, etc.)
- [ ] Automatic GitHub issue creation for each idea
- [ ] A/B test tracking for deployed ideas

## Credits

Part of the Mission Control multi-agent design studio.

# Mission Control - Multi-Agent Design Studio

A production-ready multi-agent AI system for managing a design studio team. Built with Next.js, Convex, and OpenClaw.

## Latest Architecture (April 2025)

### Unified Pipeline: Idea → Build → Deploy

Mission Control now operates as a unified pipeline with 6 stages:

1. **Pending** - Ideas waiting for approval
2. **Approved** - Ideas approved for building
3. **Building** - Agents working on implementation
4. **Code Ready** - Agents completed, code generated
5. **GitHub** - Code pushed to GitHub repository
6. **Live** - Deployed to Vercel

### The Team
- **Atlas** (PM) - Product Manager, coordinates the team
- **Muse** (Creative Director) - Vision and creative direction
- **Pixel** (UI Designer) - Visual design and interfaces
- **Scout** (Researcher) - User research and market analysis, generates ideas
- **Forge** (Tech Lead) - Engineering and implementation
- **Lens** (QA) - Quality assurance and testing
- **Echo** (Copywriter) - Content and copy
- **Amp** (Marketer) - Marketing and promotion

### System Components

1. **Convex Backend** (`dashboard/convex/`)
   - Serverless database and functions
   - Real-time subscriptions
   - Type-safe queries and mutations
   - **New:** `builds` table tracks pipeline status
   - **New:** `ideas` table for idea pipeline

2. **Next.js Dashboard** (`dashboard/app/`)
   - **Pipeline Overview** - 6-stage pipeline with stats
   - **Idea Inbox** - Review and approve ideas from Scout
   - **Build Tracking** - Monitor builds from code to deployment
   - Real-time activity feed
   - Mobile-responsive design

3. **Agent Memory** (`agents/*/memory/`)
   - WORKING.md - Current state and active tasks
   - Daily logs - Historical record

4. **Build Pipeline** (`scripts/`)
   - `overnight-build.sh` - Processes approved ideas
   - `build-executor.sh` - Spawns agents for builds
   - `build-monitor.js` - Monitors build progress
   - `scout-ideas.js` - Generates ideas from Reddit/HN

## Pipeline Flow

```
Scout Research → Idea Inbox → Approval → Build → GitHub → Vercel
     ↓                ↓            ↓         ↓         ↓        ↓
  Reddit/HN      Pending      Approved   Building   Pushed   Live
```

### Current Stats (as of latest sync)
- **Total Builds:** 62
- **GitHub Repos:** 34
- **Vercel Deployments:** 50+

## Setup

### 1. Install Dependencies
```bash
cd dashboard
npm install
```

### 2. Configure Convex
```bash
# Create a Convex project at https://convex.dev
# Copy your deployment URL

# Create dashboard/.env.local:
echo "NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud" > .env.local
```

### 3. Initialize Database
```bash
# Start Convex dev server
npm run convex:dev

# Deploy schema
npx convex dev --once
```

### 4. Start Dashboard
```bash
npm run dev
# Visit http://localhost:3000
```

### 5. Set Up Environment Variables
```bash
# In mission-control/.env:
export CONVEX_URL=https://your-deployment.convex.cloud
export CONVEX_DEPLOY_KEY=your-deploy-key
export GITHUB_TOKEN=your-github-token
export VERCEL_TOKEN=your-vercel-token
```

## Usage

### Generating Ideas
Scout automatically runs research and generates ideas:
```bash
cd mission-control
node scripts/scout-ideas.js
```

### Approving Ideas
1. Visit `/ideas` in the dashboard
2. Review pending ideas from Scout
3. Click "Approve for Build" to add to pipeline

### Monitoring Builds
1. Dashboard shows real-time pipeline stats
2. Click on any build to see details
3. Links to GitHub and Vercel when deployed

### Manual Build Trigger
```bash
cd mission-control
bash scripts/overnight-build.sh
```

## File Structure
```
mission-control/
├── README.md                    # This file
├── AGENTS.md                    # Team roster
├── dashboard/
│   ├── app/                     # Next.js app
│   │   ├── page.tsx             # Pipeline dashboard
│   │   ├── ideas/page.tsx       # Idea inbox
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── convex/                  # Backend functions
│   │   ├── schema.ts            # Database schema
│   │   ├── agents.ts            # Agent operations
│   │   ├── tasks.ts             # Task management
│   │   ├── ideas.ts             # Idea pipeline
│   │   ├── builds.ts            # Build tracking (NEW)
│   │   ├── activities.ts        # Activity feed
│   │   └── documents.ts         # Deliverables
│   └── package.json
├── agents/
│   ├── scout/                   # Idea generation agent
│   │   ├── SOUL.md
│   │   └── memory/
│   ├── forge/                   # Architecture agent
│   ├── pixel/                   # Design agent
│   ├── echo/                    # Copy agent
│   └── ...
├── builds/                      # Active builds
│   └── k17.../                  # Build directories
├── build-logs/                  # Build logs
├── scripts/
│   ├── scout-ideas.js           # Idea generation
│   ├── overnight-build.sh       # Build pipeline
│   ├── build-executor.sh        # Agent spawning
│   ├── build-monitor.js         # Progress monitoring
│   └── sync-builds-to-convex.js # Data sync
└── ideas/                       # Idea storage
```

## API Reference

### Queries
- `agents.list()` - Get all agents
- `ideas.list()` - Get all ideas
- `ideas.getApproved()` - Get approved ideas ready for build
- `builds.list()` - Get all builds in pipeline
- `builds.getStats()` - Get pipeline statistics
- `tasks.list()` - Get all tasks
- `activities.listRecent(limit)` - Get activity feed

### Mutations
- `ideas.approve(ideaId)` - Approve idea for build
- `ideas.create({...})` - Create new idea (Scout)
- `builds.upsert({...})` - Create/update build
- `builds.updateAgentStatus(...)` - Update agent progress
- `agents.heartbeat(sessionKey)` - Record heartbeat
- `tasks.create({...})` - Create new task

## Architecture Decisions

### Why Convex?
- Real-time sync between dashboard and builds
- Serverless - no backend to manage
- Type-safe queries
- Works with Vercel (no filesystem access issues)

### Pipeline Stages
- **Explicit stages** make it clear where work is stuck
- **GitHub/Vercel integration** tracks actual deployment status
- **Agent tracking** shows which agents are working on what

### Mobile-First Dashboard
- Pipeline stats in scrollable cards
- Responsive grid layouts
- Touch-friendly buttons

## Monitoring

### View Dashboard
```bash
# Production
open https://mission-control-n8garvie-woad.vercel.app

# Local
npm run dev
```

### Check Build Logs
```bash
tail -f build-logs/build-*.log
```

### Convex Dashboard
Visit your Convex deployment URL to:
- View database tables
- Run queries and mutations
- Monitor function calls
- Check logs

## Troubleshooting

### Dashboard shows 0 builds
- Builds need to be synced to Convex
- Run: `node scripts/sync-builds-to-convex.js`
- Or manually add via Convex dashboard

### Agents not spawning
- Check `openclaw` CLI is installed and configured
- Verify environment variables in `.env`
- Check build-executor.sh has correct paths

### Ideas not appearing
- Scout needs API keys for Reddit/HN
- Check `agents/scout/` configuration
- Run scout manually: `node scripts/scout-ideas.js`

## Recent Changes

### April 2025
- **New:** Unified pipeline dashboard
- **New:** Builds table in Convex
- **New:** Mobile-responsive design
- **New:** Idea inbox for manual approval
- **Fixed:** URL extraction for GitHub/Vercel
- **Removed:** Filesystem-based API (Vercel incompatible)

## Credits

Based on Bhanu Teja's multi-agent architecture guide.
Built with Next.js, Convex, Tailwind CSS, and OpenClaw.

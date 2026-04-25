# Mission Control - Quick Start Guide

Get Mission Control running in under 10 minutes.

## Prerequisites
- Node.js 18+ installed
- OpenClaw configured
- A Convex account (free at https://convex.dev)

## Step-by-Step Setup

### 1. Initialize the System
```bash
cd /home/n8garvie/.openclaw/workspace/mission-control
./scripts/init-system.sh
```

This will:
- Install dependencies
- Create necessary directories
- Make scripts executable

### 2. Set Up Convex

**Create a new Convex project:**
```bash
cd dashboard
npx convex dev
```

This will:
- Create a new Convex project (or link to existing)
- Give you a deployment URL
- Start the Convex dev server

**Copy your deployment URL** (looks like `https://your-name.convex.cloud`)

**Create `.env.local`:**
```bash
echo "NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud" > .env.local
```

### 3. Initialize Agents

Open the Convex dashboard: https://dashboard.convex.dev

Navigate to your project → Functions tab

Run this command in the console:
```javascript
await api.agents.seedSampleData({});
```

This will:
- Create all 8 agents
- Add sample tasks
- Populate the activity feed

### 4. Start the Dashboard

In a new terminal:
```bash
cd dashboard
npm run dev
```

Visit http://localhost:3000

You should see:
- ✅ 8 agent cards
- ✅ Task board with sample tasks
- ✅ Activity feed with recent events

### 5. Set Up Agent Cron Jobs

```bash
cd scripts
./setup-cron.sh
```

This configures all 8 agents to check Mission Control every 15 minutes (staggered).

### 6. Verify Everything Works

**Check the dashboard:**
- Visit http://localhost:3000
- You should see agents, tasks, and activities

**Check cron jobs:**
```bash
crontab -l | grep mission-control
```

**Test a heartbeat manually:**
```bash
./scripts/heartbeat-atlas.sh
```

**Check logs:**
```bash
tail -f ../logs/atlas.log
```

## Quick Test

Create a task and mention an agent:

1. Open Convex dashboard → Functions
2. Run:
```javascript
await api.tasks.create({
  title: "Test task for Scout",
  description: "Please research competitor pricing",
  priority: "high",
  assigneeIds: ["<Scout's agent ID from agents table>"]
});
```

3. Add a comment with a mention:
```javascript
await api.messages.create({
  taskId: "<task ID from above>",
  content: "@Scout can you look into this ASAP?",
  fromHuman: true
});
```

4. Wait for Scout's next heartbeat (check logs/scout.log)

## Troubleshooting

### "Cannot find module" errors
```bash
cd dashboard
npm install
```

### Convex connection errors
- Check `.env.local` has correct URL
- Make sure `npx convex dev` is running
- Try hard refresh in browser

### Cron jobs not running
```bash
# Check if cron service is running
service cron status

# View logs
tail -f logs/*.log
```

### Agents not initialized
Run in Convex dashboard:
```javascript
await api.agents.initialize({});
```

## What's Next?

- Read [README.md](README.md) for full documentation
- Customize agent SOUL files in `agents/*/SOUL.md`
- Adjust cron schedules in `scripts/setup-cron.sh`
- Modify the dashboard UI in `dashboard/app/`
- Add your own tasks and workflows

## Common Tasks

**Create a task:**
```javascript
// In Convex dashboard
await api.tasks.create({
  title: "Your task title",
  description: "Detailed description",
  priority: "high", // critical, high, medium, low
  assigneeIds: [/* agent IDs */]
});
```

**Move a task:**
```javascript
await api.tasks.updateStatus({
  taskId: "<task-id>",
  status: "in_progress" // inbox, assigned, in_progress, review, done
});
```

**Add a comment:**
```javascript
await api.messages.create({
  taskId: "<task-id>",
  content: "Your comment here. @AgentName to mention",
  fromHuman: true
});
```

**Check agent status:**
```javascript
const agents = await api.agents.list({});
console.table(agents.map(a => ({
  name: a.name,
  status: a.status,
  lastHeartbeat: new Date(a.lastHeartbeat).toLocaleString()
})));
```

## Support

- Check logs in `logs/`
- Review Convex dashboard for errors
- Read [README.md](README.md) for detailed docs
- Check AGENTS.md for team roster

---

Built with ❤️ using Next.js, Convex, and OpenClaw

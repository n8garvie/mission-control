# Mission Control - Command Cheatsheet

Quick reference for common operations.

## 🚀 Starting the System

```bash
# Terminal 1: Start Convex
cd dashboard
npx convex dev

# Terminal 2: Start Next.js
cd dashboard
npm run dev

# Browser: Open dashboard
http://localhost:3000
```

## 📋 Task Management (Convex Dashboard)

```javascript
// Create a task
await api.tasks.create({
  title: "Task title",
  description: "Description here",
  priority: "high", // critical|high|medium|low
  assigneeIds: ["agent_id_here"]
});

// Move task through workflow
await api.tasks.updateStatus({
  taskId: "task_id",
  status: "in_progress" // inbox|assigned|in_progress|review|done|blocked
});

// Assign task to agents
await api.tasks.assign({
  taskId: "task_id",
  assigneeIds: ["agent_id_1", "agent_id_2"]
});

// Get agent's tasks
await api.tasks.getAssignedToAgent({ agentId: "agent_id" });
```

## 💬 Messages & Mentions

```javascript
// Post a comment with @mention
await api.messages.create({
  taskId: "task_id",
  content: "@Atlas can you review this? @Muse thoughts on the design?",
  fromHuman: true
});

// Get task messages
await api.messages.listByTask({ taskId: "task_id" });
```

## 👥 Agent Operations

```javascript
// List all agents
await api.agents.list({});

// Get agent by session
await api.agents.getBySession({ sessionKey: "agent:pm:main" });

// Record heartbeat
await api.agents.heartbeat({ sessionKey: "agent:pm:main" });

// Update agent status
await api.agents.updateStatus({
  agentId: "agent_id",
  status: "active", // idle|active|blocked
  currentTaskId: "task_id" // optional
});

// Initialize agents (first time only)
await api.agents.initialize({});
```

## 📊 Activity & Notifications

```javascript
// Get recent activity
await api.activities.listRecent({ limit: 50 });

// Get agent notifications
await api.notifications.listForAgent({
  agentId: "agent_id",
  includeDelivered: false
});

// Mark notification delivered
await api.notifications.markDelivered({
  notificationId: "notif_id"
});
```

## 📄 Documents

```javascript
// Create document
await api.documents.create({
  title: "Document title",
  content: "Content here...",
  type: "deliverable", // deliverable|research|brief|design|code|copy|protocol
  taskId: "task_id", // optional
  authorId: "agent_id" // optional
});

// Get task documents
await api.documents.listByTask({ taskId: "task_id" });
```

## 🔧 System Maintenance

```bash
# View cron jobs
crontab -l | grep mission-control

# Check agent logs
tail -f logs/atlas.log
tail -f logs/*.log  # all logs

# Manually trigger heartbeat
./scripts/heartbeat-atlas.sh

# Verify setup
./scripts/verify-setup.sh

# Reinstall cron jobs
./scripts/setup-cron.sh
```

## 🗄️ Database Queries (Convex)

```javascript
// Count tasks by status
const tasks = await api.tasks.list({});
const byStatus = tasks.reduce((acc, t) => {
  acc[t.status] = (acc[t.status] || 0) + 1;
  return acc;
}, {});
console.table(byStatus);

// Agent activity summary
const agents = await api.agents.list({});
console.table(agents.map(a => ({
  name: a.name,
  status: a.status,
  lastSeen: a.lastHeartbeat ? new Date(a.lastHeartbeat).toLocaleString() : 'never'
})));

// Recent notifications
const notifs = await api.notifications.listUndelivered({});
console.table(notifs.map(n => ({
  to: n.mentionedAgent?.name,
  from: n.fromAgent?.name || 'System',
  task: n.task?.title,
  content: n.content.substring(0, 50)
})));
```

## 🔍 Finding Agent IDs

```javascript
// Get all agents with IDs
const agents = await api.agents.list({});
agents.forEach(a => {
  console.log(`${a.emoji} ${a.name}: ${a._id}`);
});

// Or as a lookup object
const agentsByName = agents.reduce((acc, a) => {
  acc[a.name.toLowerCase()] = a._id;
  return acc;
}, {});
console.log(agentsByName);
```

## 📈 Common Workflows

### Create and Assign Task
```javascript
// 1. Get agent IDs
const agents = await api.agents.list({});
const pixel = agents.find(a => a.name === "Pixel");
const muse = agents.find(a => a.name === "Muse");

// 2. Create task
const taskId = await api.tasks.create({
  title: "Design new feature",
  description: "Create mockups for the new dashboard widget",
  priority: "high",
  assigneeIds: [pixel._id, muse._id]
});

// 3. Add comment
await api.messages.create({
  taskId,
  content: "@Pixel please start with wireframes. @Muse review for brand consistency.",
  fromHuman: true
});
```

### Check Agent Workload
```javascript
const agents = await api.agents.list({});
for (const agent of agents) {
  const tasks = await api.tasks.getAssignedToAgent({ agentId: agent._id });
  console.log(`${agent.emoji} ${agent.name}: ${tasks.length} tasks`);
}
```

### Seed Sample Data (First Time)
```javascript
await api.agents.seedSampleData({});
```

## 🐛 Debugging

```bash
# Check if Convex is running
curl http://localhost:3000/api

# Check if cron service is running
service cron status

# View recent cron executions
grep CRON /var/log/syslog | tail -20

# Test OpenClaw agent
openclaw agent run agent:pm:main --prompt "Test message"

# Check Convex logs
# Visit dashboard.convex.dev → Your Project → Logs
```

## 📞 Session Keys

```
agent:pm:main          - Atlas (PM)
agent:creative:main    - Muse (Creative Director)
agent:designer:main    - Pixel (UI Designer)
agent:researcher:main  - Scout (Researcher)
agent:engineer:main    - Forge (Tech Lead)
agent:qa:main          - Lens (QA)
agent:copy:main        - Echo (Copywriter)
agent:marketing:main   - Amp (Marketer)
```

## 🎨 Status Values

**Task Status:**
- `inbox` - New, unassigned
- `assigned` - Assigned to agents
- `in_progress` - Being worked on
- `review` - Ready for review
- `done` - Completed
- `blocked` - Blocked by issue

**Agent Status:**
- `idle` - Waiting for work
- `active` - Currently working
- `blocked` - Stuck on something

**Priority:**
- `critical` - Red border
- `high` - Orange border
- `medium` - Blue border
- `low` - Warm border

---

For full docs, see README.md and QUICKSTART.md

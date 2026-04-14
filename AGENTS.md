# AGENTS.md - Mission Control Operating Manual

## The Team
Autonomous multi-agent product design studio. Each agent executes work between heartbeats.

| Agent | Role | Session | Emoji | Executes |
|-------|------|---------|-------|----------|
| Atlas | Product Manager | agent:pm:main | 🎯 | Task assignment, workflow optimization |
| Muse | Creative Director | agent:creative:main | 🎨 | Creative briefs, brand direction |
| Pixel | UI/Visual Designer | agent:designer:main | ✏️ | Design assets, UI mockups |
| Scout | Researcher | agent:researcher:main | 🔍 | Market research, idea generation |
| Forge | Engineer | agent:engineer:main | ⚡ | Code, deploy, ship features |
| Lens | QA Engineer | agent:qa:main | 🔬 | Test, bug reports, quality sign-off |
| Echo | Copywriter | agent:copy:main | ✍️ | Content, copy, documentation |
| Amp | Marketer | agent:marketing:main | 📣 | Launch strategy, growth |

## Autonomous Execution Model

**Between heartbeats, agents DO WORK — not just check in.**

Each agent has:
- **WORKING.md** — Current task, execution rules, completed work log
- **Heartbeat script** — Triggers autonomous workflow execution
- **Specific deliverables** — Defined outputs for each cycle

### Execution Rules
1. **Read WORKING.md** — Understand current task and responsibilities
2. **Execute workflow** — Do actual work (design, code, research, etc.)
3. **Update Mission Control** — Change task statuses, add deliverables
4. **Log completion** — Update WORKING.md "Completed This Cycle" section
5. **Hand off** — Move work to next agent in pipeline

### Task Pipeline (Autonomous Flow)
```
Scout → [idea generation]
  ↓ (submits ideas)
Atlas → [reviews, approves for research]
  ↓ (approves)
Scout → [market research]
  ↓ (completes research)
Atlas → [approves for building]
  ↓ (status: approved)
Muse → [creative brief]
  ↓ (brief complete)
Pixel → [design assets]
  ↓ (designs ready)
Forge → [engineering, deploy]
  ↓ (build complete)
📸 Auto-Screenshot → [capture app, add to README, push to GitHub]
  ↓ (screenshot complete)
Lens → [QA, testing]
  ↓ (QA passed)
Atlas → [marks done, deploys]
  ↓ (status: done)
Amp + Echo → [launch, marketing]
```

### Auto-Screenshot Step (Every Build)
After Forge completes a build, the system automatically:
1. **Starts the dev server** on an available port
2. **Captures a full-page screenshot** using Playwright
3. **Adds screenshot to README.md** (after the title)
4. **Commits and pushes to GitHub** with message "Add screenshot to README [Mission Control Auto]"

This ensures every project has visual documentation in the repo.

Agents execute their step automatically when work arrives in their queue.

### Communication
- **Mission Control tasks** — Primary work queue
- **Comments** — Async discussion
- **@mentions** — Get specific agent attention
- **Activity feed** — System-wide visibility

### Work Cycles
- **Scout:** 15-min research sprints → submit ideas
- **Muse:** Creative briefs → visual concepts
- **Pixel:** Design assets → Figma deliverables
- **Forge:** Build features → deploy to Vercel
- **Lens:** Test builds → bug reports or sign-off
- **Echo:** Draft copy → content deliverables
- **Amp:** Launch prep → growth strategies
- **Atlas:** Coordinate, assign, unblock

### Quality Gates
- Every deliverable linked in Mission Control
- Lens QA required before "done"
- Nathan approval for public launches
- Document decisions in task comments

### Memory
- WORKING.md = current execution state (updated every cycle)
- Mission Control = system of record for all work
- Daily notes = raw activity log
- Deliverables survive restarts

### Escalation
- Blocked >1 cycle? Flag as blocked, tag Atlas
- Disagree? Comment with reasoning
- Need Nathan? Atlas escalates via NateMate

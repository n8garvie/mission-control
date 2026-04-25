# Mission Control Agents

## Overview

Four specialized agents collaborate to build complete applications:

| Agent | Role | Model | Timeout |
|-------|------|-------|---------|
| **Forge** | Architecture | Opus 4.6 | 30 min |
| **Pixel** | Design | Opus 4.6 | 40 min |
| **Echo** | Copy | Kimi K2.5 | 15 min |
| **Integrator** | Full-Stack | Opus 4.6 | 40 min |

## Pipeline

```
Idea Approved
     ↓
Forge (Architecture) ──┐
                       ├──→ Parallel
Pixel (Design) ────────┤
                       │
Echo (Copy) ───────────┘
     ↓
All Complete
     ↓
Integrator (Build)
     ↓
Deploy (Vercel/TestFlight)
```

## Individual Agent Docs

- [FORGE.md](./FORGE.md) — System architecture
- [PIXEL.md](./PIXEL.md) — UI/UX design
- [ECHO.md](./ECHO.md) — Copy and content
- [INTEGRATOR.md](./INTEGRATOR.md) — Full-stack integration

## Triggering Builds

### Automatic (Overnight)
- 6 AM PST: Pick highest potential approved idea
- Mark as "building"
- Build monitor spawns agents every 10 min

### Manual
```bash
# Spawn specific agents
sessions_spawn --agent main --label forge-[name] --model opus --task "..."
sessions_spawn --agent main --label pixel-[name] --model opus --task "..."
sessions_spawn --agent main --label echo-[name] --model kimi --task "..."

# Or use build monitor script
node scripts/build-monitor.js
```

## Agent Coordination

Each agent saves to:
```
/builds/[idea-id]/
├── forge/
├── pixel/
├── echo/
└── integrator/final/
```

Integrator reads from all three and produces the final app.

## Models

**Opus 4.6** (Forge, Pixel, Integrator)
- Best for: Complex coding, architecture, design decisions
- Cost: Higher
- Quality: Best

**Kimi K2.5** (Echo)
- Best for: Copywriting, fast iterations
- Cost: Lower
- Quality: Good for text

## Future Agents

- **Lens** — QA/Testing (screenshot verification)
- **Amp** — DevOps/Deployment automation
- **Scout** — Idea generation (already running separately)
- **EAS Builder** — iOS/React Native builds (see [EAS-BUILDER.md](./EAS-BUILDER.md))

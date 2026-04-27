# Convex Database Backup - April 27, 2026

**Backup Date:** 2026-04-27  
**Deployment:** flexible-newt-666 (production)  
**Total Size:** 92K

## Backup Files

### Complete Dumps
| File | Size | Description |
|------|------|-------------|
| `ideas-backup-20260427-092252.json` | 30K | All ideas (complete database dump) |
| `stats-backup-20260427-092303.json` | 474 bytes | Pipeline statistics |

### By Pipeline Status
| Status | File | Size | Count |
|--------|------|------|-------|
| Approved | `ideas-approved-20260427.json` | 8.7K | 6 ideas |
| Rejected | `ideas-rejected-20260427.json` | 20K | ~15 ideas |
| Archived | `ideas-archived-20260427.json` | 1.1K | 1 idea |
| Scouted | `ideas-scouted-20260427.json` | 3 bytes | 0 ideas (nearly empty) |
| Spawning | `ideas-spawning-20260427.json` | 0 bytes | 0 ideas |
| Building | `ideas-building-20260427.json` | 0 bytes | 0 ideas |
| Testing | `ideas-testing-20260427.json` | 0 bytes | 0 ideas |
| Committing | `ideas-committing-20260427.json` | 0 bytes | 0 ideas |
| Deploying | `ideas-deploying-20260427.json` | 0 bytes | 0 ideas |
| Live | `ideas-live-20260427.json` | 0 bytes | 0 ideas |

## Current Pipeline Status

**6 Approved Ideas Ready to Build:**
1. Screenshot to React Converter
2. Local-First Notes with AI
3. Open Source Calendly Alternative
4. Personal Finance Visualizer
5. AI-Powered Contract Reviewer
6. Land & Tax Auction Explorer

**~15 Rejected Ideas** (archived for reference)

**1 Archived Idea** (duplicate cleanup)

## How to Restore

```bash
# Export CONVEX_DEPLOY_KEY first
export CONVEX_DEPLOY_KEY="prod:flexible-newt-666|..."

# Restore from backup (example)
cd dashboard
npx convex import --table ideas < ../backups/ideas-backup-20260427-092252.json
```

## Notes
- Backup created before merging PR #1 (major system update)
- All data preserved in JSON format
- Empty files indicate no ideas in that pipeline stage
- Scouted count is low because duplicate detection has been working

## Backup Location
Local: `/home/n8garvie/.openclaw/workspace/mission-control/backups/`

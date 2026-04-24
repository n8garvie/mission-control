# Mission Control Project Log

## April 22, 2026 - Dashboard & Pipeline Fixes

### Issues Fixed

#### 1. Approve Button Not Working (CRITICAL)
**Problem:** The "Approve" button on the `/ideas` page was a static button that didn't actually call the backend mutation. Users had 83 ideas but couldn't approve any of them.

**Root Cause:** The button was missing the `onClick` handler and `useMutation` hook.

**Fix:** Updated `/dashboard/app/ideas/page.tsx`:
- Added `useMutation` import from Convex
- Added `approveIdea` mutation hook
- Added `onClick={() => approveIdea({ ideaId: idea._id })}` handler to the Approve button
- Added Reject button with similar functionality
- Fixed filtering to use `pipelineStatus` instead of `status`

**Files Modified:**
- `dashboard/app/ideas/page.tsx`

---

#### 2. Vercel Deployment Issues
**Problem:** Multiple deployment failures with various errors:
- "Unexpected error" from Vercel CLI
- Commit email mismatch (nathan@nategarvie.com vs nathang87@gmail.com)
- Root Directory not set correctly for monorepo structure
- Missing environment variables in Vercel

**Fixes Applied:**
1. Updated git config: `git config user.email "nathang87@gmail.com"`
2. Created root `vercel.json` with proper build commands for monorepo
3. Set environment variables via Vercel CLI:
   - `NEXT_PUBLIC_CONVEX_URL=https://flexible-newt-666.convex.cloud`
   - `CONVEX_DEPLOY_KEY=prod:flexible-newt-666|...`
4. User manually set Root Directory to `dashboard` in Vercel dashboard

**Files Modified:**
- `vercel.json` (root)
- `dashboard/vercel.json`

---

#### 3. Convex Schema Field Name Mismatch
**Problem:** Scout script was failing to save ideas with error:
```
ArgumentValidationError: Object contains extra field `source` that is not in the validator
```

**Root Cause:** The script used `source` field but Convex schema expects `discoverySource`.

**Fix:** Updated `heartbeat-scout-ideas.sh` to use `discoverySource` instead of `source`.

**Files Modified:**
- `scripts/heartbeat-scout-ideas.sh`

---

#### 4. Hardcoded kimi-k2.6 Model References
**Problem:** Newer Moonshot/Kimi models weren't available in OpenClaw gateway, causing cron job failures.

**Fix:** Updated all build scripts to use available models:
- Changed `kimi-k2.6` → `kimi-k2.5` for pixel, echo, lens agents
- Changed `kimi-k2.6` → `anthropic/claude-opus-4-6` for forge agent

**Files Modified:**
- `scripts/build-executor.js`
- `scripts/build-monitor.js`
- `scripts/build-executor.sh`

---

#### 5. URL Standardization
**Problem:** Multiple different Vercel URLs were being used across the project.

**Fix:** Standardized on `https://mission-control-n8garvie-woad.vercel.app`

**Files Modified:**
- `README.md`
- `scripts/manual-build.js`
- Created `PROJECT_URLS.md` for reference

---

### Current Status

✅ Dashboard deployed and working at: https://mission-control-n8garvie-woad.vercel.app
✅ Approve/Reject buttons functional
✅ Convex backend connected (flexible-newt-666)
✅ Scout agent generating ideas
✅ Build scripts using correct model names

### Pipeline Stats (as of fix)
- **Total Ideas:** 84
- **Scouted:** 1 (newly added: DevRel Analytics Dashboard)
- **Approved:** 67
- **Building:** 16

---

## April 24, 2026 - Unified Pipeline & Project Consolidation

### Changes Made

#### 1. Unified Pipeline & Dashboard
**Problem:** Pipeline and Dashboard were showing as two separate tiles but should be one continuous flow.

**Solution:**
- Consolidated Pipeline and Dashboard into single unified pipeline
- Removed "reviewing" step - now just: Scouted → Approved/Rejected
- Created 8-stage unified flow: Scouted → Approved → Spawning → Building → Testing → Committing → Deploying → Live
- Updated navigation: Ideas → Pipeline (instead of separate Pipeline/Dashboard)

**Files Modified:**
- `dashboard/app/page.tsx` - Unified pipeline view
- `dashboard/app/pipeline/page.tsx` - Simplified tabs (removed reviewing)
- `dashboard/convex/schema.ts` - Removed "reviewing" from pipelineStatus enum
- `dashboard/convex/ideas.ts` - Updated queries and mutations

#### 2. Duplicate Ideas Cleanup
**Problem:** Found duplicate entries:
- "Local-First Knowledge Base with AI" appeared twice (rejected + archived)
- "Test Idea" was present

**Solution:**
- Removed duplicate "Local-First Knowledge Base with AI" (archived version)
- Removed "Test Idea"

**Result:** Cleaned from 14 ideas to 12 ideas

#### 3. Old Vercel Project Archived
**Problem:** Two Vercel projects existed with same code:
- `dashboard` (new unified version)
- `mission-control-n8garvie` (old version with separate tiles)

**Action:**
- ✅ Removed old Vercel project: `mission-control-n8garvie`
- ✅ Kept unified version: `dashboard` → `mission-control-n8garvie-woad.vercel.app`
- ✅ Both projects used same Convex database, so no data loss

**Command Used:**
```bash
vercel remove mission-control-n8garvie --yes
```

#### 4. Cron Job Fix for Nightly Scout
**Problem:** Scout agent wasn't running properly due to missing CONVEX_DEPLOY_KEY in cron environment.

**Solution:**
- Created `nightly-scout.sh` wrapper script that exports all required env vars
- Updated crontab to use new script
- Removed conflicting/duplicate cron entries

**Files Created:**
- `scripts/nightly-scout.sh`

**Files Modified:**
- Crontab (via `crontab -e`)

### Current Status

✅ Unified pipeline deployed: https://mission-control-n8garvie-woad.vercel.app
✅ 12 clean ideas (6 approved, 6 rejected)
✅ No duplicates
✅ Old Vercel project archived
✅ Nightly scout cron job fixed

### Pipeline Stats (Current)
- **Total Ideas:** 12
- **Approved:** 6 (ready to build)
- **Rejected:** 6
- **Scouted:** 0 (all processed)

### Approved Ideas Ready to Build
1. Screenshot to React Converter (moonshot)
2. Local-First Notes with AI (high)
3. Open Source Calendly Alternative (medium)
4. Personal Finance Visualizer (medium)
5. AI-Powered Contract Reviewer (high)
6. Land & Tax Auction Explorer (high)

### Next Steps
1. Assign agents to approved ideas to start building
2. Monitor build progress in unified pipeline
3. Review new ideas when nightly scout runs

---

## April 24, 2026 - Convex Database Mismatch Fix (CRITICAL)

### Problem
Dashboard was showing **83 ideas** (from dev database) instead of **21 ideas** (from production database).
- Pipeline showed: 0 scouted, 0 approved, 0 in progress
- Ideas page showed: 83 total ideas
- All ideas displayed were from wrong database (Claude Codex Bridge, Hockey Terminal, etc.)

### Root Cause
Vercel deployment was connected to **wrong Convex database**:
- **Wrong:** `beloved-giraffe-115` (dev deployment) - 83 ideas
- **Correct:** `flexible-newt-666` (prod deployment) - 21 ideas

The `NEXT_PUBLIC_CONVEX_URL` environment variable was baked into JavaScript at build time, so even after updating env vars, old URL persisted in compiled code.

### Solution Applied
```bash
# 1. Update Vercel environment variables
cd dashboard
vercel env rm NEXT_PUBLIC_CONVEX_URL production --yes
vercel env add NEXT_PUBLIC_CONVEX_URL production "https://flexible-newt-666.convex.cloud"
vercel env rm CONVEX_DEPLOYMENT production --yes
vercel env add CONVEX_DEPLOYMENT production "prod:flexible-newt-666"
vercel env rm NEXT_PUBLIC_CONVEX_SITE_URL production --yes
vercel env add NEXT_PUBLIC_CONVEX_SITE_URL production "https://flexible-newt-666.convex.site"

# 2. Clear build cache and force complete rebuild
rm -rf .next
vercel deploy --prod --force

# 3. Reassign alias to new deployment
vercel alias set dashboard-dia3wexmx-n8garvies-projects.vercel.app mission-control-n8garvie-woad.vercel.app
```

### Files Updated
- `ARCHITECTURE.md` - Added troubleshooting section for this issue
- `PROJECT_LOG.md` - This entry

### Current Status (Post-Fix)
✅ Dashboard shows correct **21 ideas**
✅ Pipeline shows correct counts: 6 approved, 6 rejected, 9 scouted
✅ Connected to production Convex: `flexible-newt-666`
✅ URL: https://mission-control-n8garvie-woad.vercel.app

### Prevention Measures
- Documented in ARCHITECTURE.md under "Common Issues"
- Always verify Convex deployment URL in Vercel dashboard
- Use `npx convex run ideas:getStats` to verify correct database before deploying
- Keep dev and prod Convex deployments clearly labeled

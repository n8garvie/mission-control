# Mission Control - Project URLs & Configuration

## Production Dashboard
**Primary URL:** https://mission-control-n8garvie-woad.vercel.app

This is the main dashboard for reviewing ideas, approving builds, and monitoring the pipeline.

## Backend Services

### Convex (Database & API)
- **Production:** https://flexible-newt-666.convex.cloud
- **Site URL:** https://flexible-newt-666.convex.site
- **Project:** agents-mission-control
- **Team:** nathang87

### Vercel Deployment
- **Project Name:** mission-control-n8garvie
- **Dashboard:** https://vercel.com/n8garvie/mission-control-n8garvie

## Environment Variables

### Required in `.env.local` (dashboard/)
```bash
NEXT_PUBLIC_CONVEX_URL=https://flexible-newt-666.convex.cloud
CONVEX_DEPLOYMENT=prod:flexible-newt-666
NEXT_PUBLIC_CONVEX_SITE_URL=https://flexible-newt-666.convex.site
CONVEX_DEPLOY_KEY=dev:beloved-giraffe-115|eyJ2MiI6IjFkMjVkMjc2MGQzYzQzMjhhYmMzYmM4NDc5NjZlYjdjIn0=
```

### Required in `.env` (mission-control/)
```bash
export CONVEX_URL=https://beloved-giraffe-115.convex.cloud
export CONVEX_DEPLOY_KEY="prod:flexible-newt-666|eyJ2MiI6ImQ1OTg1MTA2NWE0OTQxNjI4ODMyMjE0MjI2MDc2ZGMyIn0="
export CONVEX_ADMIN_KEY="prod:flexible-newt-666|eyJ2MiI6ImQ1OTg1MTA2NWE0OTQxNjI4ODMyMjE0MjI2MDc2ZGMyIn0="
export GITHUB_TOKEN=ghp_...
export VERCEL_TOKEN=vcp_...
```

## Deployment Commands

### Deploy Dashboard to Vercel
```bash
cd ~/.openclaw/workspace/mission-control/dashboard
vercel --prod
```

### Deploy Convex Schema
```bash
cd ~/.openclaw/workspace/mission-control/dashboard
export CONVEX_DEPLOY_KEY="dev:beloved-giraffe-115|eyJ2MiI6IjFkMjVkMjc2MGQzYzQzMjhhYmMzYmM4NDc5NjZlYjdjIn0="
npx convex deploy
```

## Pages

- **Home/Pipeline:** https://mission-control-n8garvie-woad.vercel.app/
- **Ideas Inbox:** https://mission-control-n8garvie-woad.vercel.app/ideas
- **Pipeline Review:** https://mission-control-n8garvie-woad.vercel.app/pipeline
- **Dashboard:** https://mission-control-n8garvie-woad.vercel.app/dashboard

## Last Updated
April 22, 2026 - Updated all URLs to use mission-control-n8garvie-woad.vercel.app

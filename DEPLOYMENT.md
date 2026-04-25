# Mission Control Deployment Pipeline

## Overview

The build pipeline now requires **successful deployment** before marking a build as "complete". Builds go through the following stages:

```
approved → building → [forge → pixel → echo → integrator → deploy] → done
```

## Pipeline Stages

### 1. Forge (Architecture)
- Creates the technical architecture
- Sets up project structure
- Implements core functionality

### 2. Pixel (Design)
- Creates visual designs
- Implements UI components
- Ensures responsive design

### 3. Echo (Copy)
- Writes all copy and content
- Creates marketing materials
- Ensures consistent tone

### 4. Integrator
- Merges all agent outputs
- Creates production-ready codebase
- Ensures code quality and consistency

### 5. Deploy
- Creates private GitHub repository
- Pushes code to GitHub
- Deploys to hosting provider (Vercel/Netlify)
- **Build is NOT marked complete until this succeeds**

## Configuration

### Required Environment Variables

```bash
# GitHub (required for repo creation)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export GITHUB_OWNER="n8garvie"  # Your GitHub username/org

# Vercel (optional, for hosting)
export VERCEL_TOKEN="vercel_token_here"
export VERCEL_TEAM_ID=""  # Optional: for team deployments

# Netlify (optional, alternative hosting)
export NETLIFY_TOKEN="netlify_token_here"

# Hosting provider preference
export HOSTING_PROVIDER="vercel"  # or "netlify"
```

### GitHub Token Setup

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with these scopes:
   - `repo` (full control of private repositories)
   - `workflow` (if using GitHub Actions)

### Vercel Token Setup

1. Go to Vercel → Settings → Tokens
2. Create a new token
3. Copy the token value

### Netlify Token Setup

1. Go to Netlify → User settings → Applications
2. Generate a new personal access token

## Build Notifications

When a build completes successfully, you'll receive a Telegram notification with:
- ✅ List of completed agents
- 🚀 Live site URL (if deployed)
- 📦 GitHub repository URL
- 🛠 Tech stack used
- 📋 What was built

## Deployment Status

The deployment status is tracked in:
```
mission-control/builds/{ideaId}/deploy-status.json
```

Status values:
- `pending` — Not started
- `in_progress` — Currently deploying
- `completed` — Successfully deployed to both GitHub and hosting
- `partial` — Partially deployed (e.g., GitHub only)
- `failed` — Deployment failed (will retry)

## Troubleshooting

### Build stuck in "building" state
Check the agent task files:
```bash
ls -la mission-control/builds/{ideaId}/*/
```

### Deployment failed
Check the deploy status:
```bash
cat mission-control/builds/{ideaId}/deploy-status.json
```

### Missing tokens
The pipeline will skip deployment steps if tokens aren't configured, but the build won't be marked as "done" until deployment succeeds.

## Manual Deployment

If automatic deployment fails, you can manually deploy:

```bash
cd mission-control/builds/{ideaId}/integrator/final

# Push to GitHub
git init
git add .
git commit -m "Initial build"
git remote add origin https://github.com/n8garvie/{ideaId}.git
git push -u origin main

# Deploy to Vercel
npx vercel --prod
```

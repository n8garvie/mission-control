#!/bin/bash
# FULLY AUTOMATED deployment — no manual steps
# Usage: auto-deploy.sh <project-name> <build-directory>

set -e

PROJECT_NAME=$1
BUILD_DIR=$2
GITHUB_USER="n8garvie"

if [ -z "$PROJECT_NAME" ] || [ -z "$BUILD_DIR" ]; then
    echo "Usage: auto-deploy.sh <project-name> <build-directory>"
    exit 1
fi

echo "🚀 Auto-deploying: $PROJECT_NAME"

cd "$BUILD_DIR"

# 1. Ensure git repo
git init 2>/dev/null || true
git add .
git commit -m "Auto-deploy $(date)" || true

# 2. Create GitHub repo (idempotent)
if ! git remote get-url origin 2>/dev/null | grep -q github; then
    echo "📦 Creating GitHub repo..."
    gh repo create "$PROJECT_NAME" --private --source=. --push || {
        # Repo might exist, try to push
        git remote add origin "https://github.com/$GITHUB_USER/$PROJECT_NAME.git" 2>/dev/null || true
        git push -u origin master || git push -u origin main || true
    }
else
    git push origin HEAD || true
fi

# 3. Deploy to Vercel (using token, no team auth issues)
echo "▲ Deploying to Vercel..."

# Use npx vercel to avoid permission issues
VERCEL_CMD="npx vercel"

# Deploy with explicit token
DEPLOY_OUTPUT=$($VERCEL_CMD --token "$VERCEL_TOKEN" --yes --prod 2>&1)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*\.vercel\.app' | head -1)

if [ -n "$DEPLOY_URL" ]; then
    echo "✓ Deployed: $DEPLOY_URL"
    echo "$DEPLOY_URL" > .vercel-url
else
    echo "⚠️  Deploy may have failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# 4. Set environment variables (if .env.local exists)
if [ -f ".env.local" ]; then
    echo "🔧 Setting environment variables..."
    while IFS= read -r line; do
        if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            KEY=$(echo "$line" | cut -d= -f1)
            VALUE=$(echo "$line" | cut -d= -f2-)
            $VERCEL_CMD --token "$VERCEL_TOKEN" env add "$KEY" production <<< "$VALUE" 2>/dev/null || true
        fi
    done < .env.local
fi

echo ""
echo "✓ Auto-deploy complete!"
echo "  URL: $DEPLOY_URL"
echo "  Repo: https://github.com/$GITHUB_USER/$PROJECT_NAME"

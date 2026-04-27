#!/bin/bash
# Auto-deploy setup for Mission Control builds
# Usage: setup-vercel-deploy <project-name> <build-directory>

PROJECT_NAME=$1
BUILD_DIR=$2
CONVEX_KEY="${CONVEX_DEPLOY_KEY}"
if [ -z "$CONVEX_KEY" ]; then
    echo "Error: CONVEX_DEPLOY_KEY env var not set" >&2
    exit 1
fi

if [ -z "$PROJECT_NAME" ] || [ -z "$BUILD_DIR" ]; then
    echo "Usage: setup-vercel-deploy <project-name> <build-directory>"
    exit 1
fi

cd "$BUILD_DIR" || exit 1

echo "🚀 Setting up auto-deploy for $PROJECT_NAME..."

# 1. Ensure git repo exists and is pushed
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial commit"
fi

# Set correct author for Vercel
git config user.email "natemate2026@gmail.com"
git config user.name "NateMate"

# Create GitHub repo if not exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "📦 Creating GitHub repo..."
    gh repo create "$PROJECT_NAME" --private --source=. --push
else
    git push origin HEAD
fi

# 2. Create Vercel project and link
echo "▲ Creating Vercel project..."
vercel --yes --name "$PROJECT_NAME" --prod 2>&1 | tee /tmp/vercel-output.log

# Extract project URL from output
PROJECT_URL=$(grep -o 'https://[^[:space:]]*\.vercel\.app' /tmp/vercel-output.log | head -1)

if [ -n "$PROJECT_URL" ]; then
    echo "✓ Deployed: $PROJECT_URL"
    
    # 3. Set environment variables
    echo "🔧 Setting environment variables..."
    vercel env add CONVEX_DEPLOY_KEY production <<< "$CONVEX_KEY"
    vercel env add CONVEX_DEPLOY_KEY preview <<< "$CONVEX_KEY"
    
    echo "✓ Auto-deploy configured!"
    echo "  GitHub: https://github.com/n8garvie/$PROJECT_NAME"
    echo "  Vercel: $PROJECT_URL"
    echo ""
    echo "Future pushes to GitHub will auto-deploy."
else
    echo "⚠️  Deploy may have failed. Check manually:"
    echo "  cd $BUILD_DIR && vercel --prod"
fi

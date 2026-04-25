#!/bin/bash
# Pre-Deploy Check Script
# Validates build before deployment to catch common issues

set -e

CODE_DIR="$1"

if [ -z "$CODE_DIR" ]; then
    echo "Usage: $0 <code-directory>"
    exit 1
fi

if [ ! -d "$CODE_DIR" ]; then
    echo "❌ Code directory not found: $CODE_DIR"
    exit 1
fi

cd "$CODE_DIR"

echo "🔍 Running pre-deploy checks..."
echo ""

ERRORS=0
WARNINGS=0

# Check 1: node_modules should not be in git
echo "1. Checking for node_modules in git..."
if git ls-files | grep -q "^node_modules/"; then
    echo "   ❌ ERROR: node_modules found in git index"
    echo "   Fixing: Removing node_modules from git..."
    git rm -r --cached node_modules 2>/dev/null || true
    rm -rf node_modules
    echo "   ✅ node_modules removed"
    ((ERRORS++))
else
    echo "   ✅ node_modules not in git"
fi

# Check 2: .gitignore should exist and include node_modules
echo ""
echo "2. Checking .gitignore..."
if [ ! -f ".gitignore" ]; then
    echo "   ❌ ERROR: .gitignore missing"
    echo "   Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
/node_modules
/.pnp
.pnp.js

# Next.js
/.next/
/out/
/dist/

# Production
/build

# Misc
.DS_Store
*.pem
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea
.vscode
*.swp
*.swo
EOF
    echo "   ✅ .gitignore created"
    ((WARNINGS++))
elif ! grep -q "node_modules" .gitignore; then
    echo "   ❌ WARNING: node_modules not in .gitignore"
    echo "node_modules/" >> .gitignore
    echo "   ✅ Added node_modules to .gitignore"
    ((WARNINGS++))
else
    echo "   ✅ .gitignore properly configured"
fi

# Check 3: package.json should exist
echo ""
echo "3. Checking package.json..."
if [ ! -f "package.json" ]; then
    echo "   ❌ ERROR: package.json missing"
    ((ERRORS++))
else
    echo "   ✅ package.json exists"
    
    # Check for @vercel/analytics
    if ! grep -q "@vercel/analytics" package.json; then
        echo "   ⚠️  WARNING: @vercel/analytics not in dependencies"
        echo "   Add it with: npm i @vercel/analytics"
        ((WARNINGS++))
    else
        echo "   ✅ @vercel/analytics included"
    fi
fi

# Check 4: Build should pass
echo ""
echo "4. Running build test..."
if [ -f "package.json" ]; then
    if npm run build 2>&1 | tail -20; then
        echo "   ✅ Build successful"
    else
        echo "   ❌ ERROR: Build failed"
        ((ERRORS++))
    fi
else
    echo "   ⚠️  Skipping build test (no package.json)"
fi

# Check 5: Check for large files (>50MB)
echo ""
echo "5. Checking for large files..."
LARGE_FILES=$(find . -type f -size +50M -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)
if [ -n "$LARGE_FILES" ]; then
    echo "   ❌ WARNING: Large files detected:"
    echo "$LARGE_FILES" | head -5
    ((WARNINGS++))
else
    echo "   ✅ No large files found"
fi

# Check 6: Environment variables template
echo ""
echo "6. Checking environment variables..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo "   ⚠️  WARNING: .env files present (should not be committed)"
    if [ ! -f ".env.example" ]; then
        echo "   Creating .env.example template..."
        echo "# Copy to .env.local and fill in your values" > .env.example
        ((WARNINGS++))
    fi
else
    echo "   ✅ No env files in repo"
fi

echo ""
echo "========================================"
if [ $ERRORS -gt 0 ]; then
    echo "❌ Pre-deploy checks failed: $ERRORS errors, $WARNINGS warnings"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Pre-deploy checks passed with $WARNINGS warnings"
    exit 0
else
    echo "✅ All pre-deploy checks passed"
    exit 0
fi

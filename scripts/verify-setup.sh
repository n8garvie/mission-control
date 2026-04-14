#!/bin/bash
# Verify Mission Control setup

echo "🔍 Mission Control Setup Verification"
echo "====================================="
echo ""

ERRORS=0
WARNINGS=0

# Check project structure
echo "📁 Checking project structure..."

check_file() {
    if [ -f "$1" ]; then
        echo "  ✅ $1"
    else
        echo "  ❌ Missing: $1"
        ((ERRORS++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "  ✅ $1/"
    else
        echo "  ⚠️  Missing: $1/"
        ((WARNINGS++))
    fi
}

# Core files
check_file "README.md"
check_file "AGENTS.md"
check_file "QUICKSTART.md"

# Dashboard
check_file "dashboard/package.json"
check_file "dashboard/next.config.js"
check_file "dashboard/tsconfig.json"
check_file "dashboard/convex.json"
check_file "dashboard/app/layout.tsx"
check_file "dashboard/app/page.tsx"
check_file "dashboard/app/globals.css"

# Convex functions
echo ""
echo "🔧 Checking Convex functions..."
check_file "dashboard/convex/schema.ts"
check_file "dashboard/convex/agents.ts"
check_file "dashboard/convex/tasks.ts"
check_file "dashboard/convex/messages.ts"
check_file "dashboard/convex/activities.ts"
check_file "dashboard/convex/documents.ts"
check_file "dashboard/convex/notifications.ts"
check_file "dashboard/convex/seed.ts"

# UI Components
echo ""
echo "🎨 Checking UI components..."
check_file "dashboard/app/components/AgentCards.tsx"
check_file "dashboard/app/components/TaskBoard.tsx"
check_file "dashboard/app/components/TaskCard.tsx"
check_file "dashboard/app/components/TaskModal.tsx"
check_file "dashboard/app/components/ActivityFeed.tsx"

# Scripts
echo ""
echo "⚙️  Checking scripts..."
check_file "scripts/init-system.sh"
check_file "scripts/setup-cron.sh"
check_file "scripts/heartbeat-atlas.sh"
check_file "scripts/heartbeat-muse.sh"
check_file "scripts/heartbeat-pixel.sh"
check_file "scripts/heartbeat-scout.sh"
check_file "scripts/heartbeat-forge.sh"
check_file "scripts/heartbeat-lens.sh"
check_file "scripts/heartbeat-echo.sh"
check_file "scripts/heartbeat-amp.sh"

# Check script permissions
echo ""
echo "🔐 Checking script permissions..."
for script in scripts/*.sh; do
    if [ -x "$script" ]; then
        echo "  ✅ $script (executable)"
    else
        echo "  ⚠️  $script (not executable - run: chmod +x $script)"
        ((WARNINGS++))
    fi
done

# Agent directories
echo ""
echo "👥 Checking agent directories..."
for agent in pm creative designer researcher engineer qa copy marketing; do
    check_dir "agents/$agent"
    check_file "agents/$agent/SOUL.md"
    check_dir "agents/$agent/memory"
    check_file "agents/$agent/memory/WORKING.md"
done

# Check for node_modules
echo ""
echo "📦 Checking dependencies..."
if [ -d "dashboard/node_modules" ]; then
    echo "  ✅ node_modules installed"
else
    echo "  ⚠️  node_modules not found - run: cd dashboard && npm install"
    ((WARNINGS++))
fi

# Check for .env.local
echo ""
echo "🔧 Checking configuration..."
if [ -f "dashboard/.env.local" ]; then
    echo "  ✅ .env.local exists"
    if grep -q "NEXT_PUBLIC_CONVEX_URL" dashboard/.env.local; then
        echo "  ✅ Convex URL configured"
    else
        echo "  ⚠️  Convex URL not set in .env.local"
        ((WARNINGS++))
    fi
else
    echo "  ⚠️  .env.local not found"
    echo "     Create it with: echo 'NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud' > dashboard/.env.local"
    ((WARNINGS++))
fi

# Check for logs directory
check_dir "logs"

# Summary
echo ""
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! System is ready."
    echo ""
    echo "Next steps:"
    echo "  1. cd dashboard && npx convex dev"
    echo "  2. npm run dev"
    echo "  3. Visit http://localhost:3000"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Setup complete with $WARNINGS warning(s)"
    echo "   System should work but review warnings above"
    exit 0
else
    echo "❌ Setup incomplete: $ERRORS error(s), $WARNINGS warning(s)"
    echo "   Review errors above and run ./scripts/init-system.sh"
    exit 1
fi

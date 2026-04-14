#!/bin/bash
# Initialize Mission Control System

set -e

echo "🚀 Mission Control System Initialization"
echo "========================================"
echo ""

# Check if in correct directory
if [ ! -f "README.md" ]; then
    echo "❌ Error: Must run from mission-control root directory"
    exit 1
fi

# 1. Install dashboard dependencies
echo "📦 Installing dashboard dependencies..."
cd dashboard
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
cd ..

# 2. Check for .env.local
if [ ! -f "dashboard/.env.local" ]; then
    echo ""
    echo "⚠️  Missing .env.local configuration"
    echo ""
    echo "Please create dashboard/.env.local with your Convex URL:"
    echo "  NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
    echo ""
    echo "Get your URL from: https://dashboard.convex.dev"
    echo ""
    read -p "Press Enter once you've created .env.local..."
fi

# 3. Create logs directory
echo ""
echo "📁 Creating logs directory..."
mkdir -p logs
echo "✅ Logs directory created"

# 4. Make scripts executable
echo ""
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh
echo "✅ Scripts are executable"

# 5. Check agent memory directories
echo ""
echo "📝 Checking agent memory directories..."
for agent in pm creative designer researcher engineer qa copy marketing; do
    if [ ! -d "agents/$agent/memory" ]; then
        mkdir -p "agents/$agent/memory"
        echo "  Created agents/$agent/memory/"
    fi
done
echo "✅ Agent memory directories ready"

# 6. Summary
echo ""
echo "✅ System initialization complete!"
echo ""
echo "Next steps:"
echo "  1. Start Convex dev server:"
echo "     cd dashboard && npm run convex:dev"
echo ""
echo "  2. Initialize agents (in Convex dashboard):"
echo "     await api.agents.initialize({});"
echo ""
echo "  3. Start Next.js dashboard:"
echo "     npm run dev"
echo ""
echo "  4. Set up cron jobs:"
echo "     cd scripts && ./setup-cron.sh"
echo ""
echo "Visit http://localhost:3000 to view Mission Control"

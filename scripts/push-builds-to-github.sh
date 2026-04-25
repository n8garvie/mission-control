#!/bin/bash
# Fix empty GitHub repos by pushing existing Mission Control builds
# This finds builds with integrator/final code and pushes them to GitHub

set -e

MISSION_CONTROL_DIR="/home/n8garvie/.openclaw/workspace/mission-control"
BUILDS_DIR="$MISSION_CONTROL_DIR/builds"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing Empty Mission Control Repos${NC}"
echo "========================================"
echo ""

# Find all builds with integrator/final code
builds_with_code=()
for dir in "$BUILDS_DIR"/k17*; do
  if [ -d "$dir/integrator/final" ] && [ -f "$dir/integrator/final/package.json" ]; then
    builds_with_code+=("$dir")
  fi
done

echo "Found ${#builds_with_code[@]} builds with integrator code"
echo ""

# Also find builds with forge code (fallback)
builds_with_forge=()
for dir in "$BUILDS_DIR"/k17*; do
  if [ -d "$dir/forge" ] && [ -f "$dir/forge/package.json" ] && [ ! -d "$dir/integrator" ]; then
    builds_with_forge+=("$dir")
  fi
done

echo "Found ${#builds_with_forge[@]} builds with forge code only"
echo ""

# Function to get repo name from build
guess_repo_name() {
  local build_dir="$1"
  local build_id=$(basename "$build_dir")
  
  # Try to read from tracker file
  if [ -f "$build_dir.json" ]; then
    repo_name=$(cat "$build_dir.json" | grep -o '"repoName": "[^"]*"' | cut -d'"' -f4 2>/dev/null)
    if [ -n "$repo_name" ]; then
      echo "$repo_name"
      return
    fi
  fi
  
  # Try to get from forge completion
  if [ -f "$build_dir/forge/COMPLETION.md" ]; then
    title=$(head -5 "$build_dir/forge/COMPLETION.md" | grep -i "built\|project\|app" | head -1)
    if [ -n "$title" ]; then
      # Convert to repo name format
      echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-' | head -c 40
      return
    fi
  fi
  
  # Fallback to build ID
  echo "$build_id"
}

# Function to push build to GitHub
push_build_to_github() {
  local build_dir="$1"
  local build_id=$(basename "$build_dir")
  local code_dir="$build_dir/integrator/final"
  
  # Fallback to forge if no integrator
  if [ ! -d "$code_dir" ]; then
    code_dir="$build_dir/forge"
  fi
  
  local repo_name=$(guess_repo_name "$build_dir")
  
  echo "========================================"
  echo -e "${BLUE}📦 Processing: $repo_name${NC}"
  echo "Build ID: $build_id"
  echo "Code dir: $code_dir"
  echo ""
  
  # Check if GitHub repo exists
  repo_info=$(gh api repos/n8garvie/$repo_name 2>/dev/null || echo "{}")
  repo_exists=$(echo "$repo_info" | jq -r '.id // empty')
  
  if [ -z "$repo_exists" ]; then
    echo -e "${YELLOW}⚠️  Repo $repo_name doesn't exist on GitHub${NC}"
    echo "Creating repo..."
    
    # Get description from forge completion
    description="Mission Control build"
    if [ -f "$build_dir/forge/COMPLETION.md" ]; then
      description=$(head -3 "$build_dir/forge/COMPLETION.md" | tail -1 | cut -c1-100)
    fi
    
    gh repo create "$repo_name" --public --description "$description" || {
      echo -e "${RED}❌ Failed to create repo $repo_name${NC}"
      return 1
    }
    echo -e "${GREEN}✅ Created repo: $repo_name${NC}"
  else
    echo -e "${GREEN}✅ Repo exists: $repo_name${NC}"
  fi
  
  # Check if repo is empty (only README)
  file_count=$(gh api repos/n8garvie/$repo_name/contents/ 2>/dev/null | jq 'length' || echo "0")
  
  if [ "$file_count" -gt 1 ]; then
    echo -e "${GREEN}✅ Repo already has code ($file_count files). Skipping.${NC}"
    return 0
  fi
  
  echo "📝 Repo is empty or has only README. Pushing code..."
  
  # Navigate to code directory
  cd "$code_dir"
  
  # Initialize git if needed
  if [ ! -d ".git" ]; then
    git init
    git branch -M main
  fi
  
  # Add remote
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/n8garvie/$repo_name.git"
  
  # Stage all files
  git add -A
  
  # Commit
  git commit -m "Initial build from Mission Control" || {
    echo -e "${YELLOW}⚠️  Nothing to commit or commit failed${NC}"
  }
  
  # Push
  git push -u origin main --force || git push -u origin master --force || {
    echo -e "${RED}❌ Failed to push to $repo_name${NC}"
    return 1
  }
  
  echo -e "${GREEN}✅ Code pushed to $repo_name${NC}"
  
  # Try to capture screenshot
  echo "📸 Attempting to capture screenshot..."
  
  if [ -f "package.json" ]; then
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
      echo "Installing dependencies..."
      npm install 2>&1 | tail -3
    fi
    
    # Build first
    echo "Building project..."
    npm run build 2>&1 | tail -5 || echo "Build may have failed, continuing..."
    
    # Start dev server
    echo "Starting dev server..."
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server
    sleep 8
    
    # Try to capture screenshot
    npx playwright screenshot --full-page --wait-for-timeout 5000 http://localhost:3000 screenshot.png 2>&1 || {
      echo -e "${YELLOW}⚠️  Screenshot capture failed${NC}"
    }
    
    # Kill server
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
    
    # Add screenshot to README if captured
    if [ -f "screenshot.png" ]; then
      echo -e "${GREEN}✅ Screenshot captured${NC}"
      
      # Add to README
      if [ -f "README.md" ]; then
        if ! grep -q "screenshot.png" README.md; then
          echo "" >> README.md
          echo "![App Screenshot](./screenshot.png)" >> README.md
          echo ""
          git add README.md screenshot.png
          git commit -m "Add screenshot [Mission Control Auto]"
          git push
          echo -e "${GREEN}✅ Screenshot added to README${NC}"
        fi
      fi
    fi
  fi
  
  echo ""
  return 0
}

# Process builds with integrator code
echo -e "${BLUE}Processing builds with integrator code...${NC}"
echo ""

for build_dir in "${builds_with_code[@]}"; do
  push_build_to_github "$build_dir" || true
done

# Process builds with forge-only code
echo ""
echo -e "${BLUE}Processing builds with forge code only...${NC}"
echo ""

for build_dir in "${builds_with_forge[@]}"; do
  # Skip if integrator exists now
  if [ -d "$build_dir/integrator" ]; then
    continue
  fi
  push_build_to_github "$build_dir" || true
done

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Repo fix complete!${NC}"
echo "========================================"

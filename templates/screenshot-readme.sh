#!/bin/bash
# screenshot-readme.sh - Capture screenshot of a running Next.js app and add to README
# Usage: ./screenshot-readme.sh [port] [screenshot_filename]

set -e

PORT=${1:-3000}
SCREENSHOT_NAME=${2:-screenshot.png}
README_FILE="README.md"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📸 Screenshot README Generator${NC}"
echo "================================"

# Check if README exists
if [ ! -f "$README_FILE" ]; then
    echo -e "${YELLOW}⚠️  No README.md found, skipping screenshot addition${NC}"
    exit 0
fi

# Check if server is already running
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Server detected on port $PORT${NC}"
    SERVER_URL="http://localhost:$PORT"
else
    # Try to find an available port
    echo -e "${YELLOW}⚠️  Port $PORT not available, searching for open port...${NC}"
    for try_port in 3001 3002 3003 3004 3005; do
        if ! lsof -Pi :$try_port -sTCP:LISTEN -t >/dev/null 2>&1; then
            PORT=$try_port
            echo -e "${GREEN}✓ Found available port: $PORT${NC}"
            break
        fi
    done
    
    # Start dev server in background
    echo -e "${BLUE}🚀 Starting dev server on port $PORT...${NC}"
    npm run dev -- --port $PORT &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo -e "${BLUE}⏳ Waiting for server to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:$PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Server ready!${NC}"
            break
        fi
        sleep 1
    done
    
    SERVER_URL="http://localhost:$PORT"
fi

# Check if playwright is available
if ! command -v npx &> /dev/null; then
    echo -e "${YELLOW}⚠️  npx not found, cannot capture screenshot${NC}"
    [ -n "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Capture screenshot
echo -e "${BLUE}📷 Capturing screenshot from $SERVER_URL...${NC}"
npx playwright screenshot \
    --full-page \
    --wait-for-timeout 3000 \
    --color-scheme=dark \
    "$SERVER_URL" \
    "$SCREENSHOT_NAME"

if [ ! -f "$SCREENSHOT_NAME" ]; then
    echo -e "${YELLOW}⚠️  Screenshot capture failed${NC}"
    [ -n "$SERVER_PID" ] && kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✓ Screenshot saved: $SCREENSHOT_NAME${NC}"

# Add screenshot to README if not already present
if ! grep -q "!\[.*\](.*$SCREENSHOT_NAME)" "$README_FILE"; then
    echo -e "${BLUE}📝 Adding screenshot to README...${NC}"
    
    # Create temp file with screenshot added after title
    awk -v screenshot="\n![App Screenshot](./$SCREENSHOT_NAME)\n" '
        /^# / && !added {
            print
            print screenshot
            added = 1
            next
        }
        { print }
    ' "$README_FILE" > "${README_FILE}.tmp"
    
    mv "${README_FILE}.tmp" "$README_FILE"
    echo -e "${GREEN}✓ Screenshot added to README${NC}"
else
    echo -e "${GREEN}✓ Screenshot already in README${NC}"
fi

# Cleanup: kill server if we started it
if [ -n "$SERVER_PID" ]; then
    echo -e "${BLUE}🛑 Stopping dev server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✅ Screenshot automation complete!${NC}"
echo "   - Screenshot: $SCREENSHOT_NAME"
echo "   - Updated: $README_FILE"

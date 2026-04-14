#!/bin/bash
# Quick API test without npm dependencies

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AI Design Workflow - API Test                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if keys are set
if [ -z "$ARENA_TOKEN" ]; then
    echo -e "${RED}✗ ARENA_TOKEN not set${NC}"
    exit 1
fi

if [ -z "$REPLICATE_API_TOKEN" ]; then
    echo -e "${RED}✗ REPLICATE_API_TOKEN not set${NC}"
    exit 1
fi

if [ -z "$IDEOGRAM_API_KEY" ]; then
    echo -e "${RED}✗ IDEOGRAM_API_KEY not set${NC}"
    exit 1
fi

if [ -z "$FIGMA_ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ FIGMA_ACCESS_TOKEN not set${NC}"
    exit 1
fi

# Test Are.na
echo -e "${YELLOW}Testing Are.na...${NC}"
ARENA_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ARENA_TOKEN" \
    "https://api.are.na/v2/channels")
if [ "$ARENA_TEST" = "200" ]; then
    echo -e "${GREEN}✓ Are.na working${NC}"
else
    echo -e "${RED}✗ Are.na failed (HTTP $ARENA_TEST)${NC}"
fi

# Test Replicate
echo -e "${YELLOW}Testing Replicate...${NC}"
REPLICATE_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
    "https://api.replicate.com/v1/models")
if [ "$REPLICATE_TEST" = "200" ]; then
    echo -e "${GREEN}✓ Replicate working${NC}"
else
    echo -e "${RED}✗ Replicate failed (HTTP $REPLICATE_TEST)${NC}"
fi

# Test Ideogram (quick auth check)
echo -e "${YELLOW}Testing Ideogram...${NC}"
IDEOGRAM_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Api-Key: $IDEOGRAM_API_KEY" \
    "https://api.ideogram.ai/api/v1/generate" \
    -d '{"prompt":"test","model":"V_3"}')
# 422 is expected (missing required fields), 401 means auth failed
if [ "$IDEOGRAM_TEST" = "422" ] || [ "$IDEOGRAM_TEST" = "200" ]; then
    echo -e "${GREEN}✓ Ideogram working${NC}"
else
    echo -e "${RED}✗ Ideogram failed (HTTP $IDEOGRAM_TEST)${NC}"
fi

# Test Figma
echo -e "${YELLOW}Testing Figma...${NC}"
FIGMA_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
    "https://api.figma.com/v1/me")
if [ "$FIGMA_TEST" = "200" ]; then
    echo -e "${GREEN}✓ Figma working${NC}"
else
    echo -e "${RED}✗ Figma failed (HTTP $FIGMA_TEST)${NC}"
fi

echo ""
echo "─────────────────────────────────────────────────────────"

# Summary
ALL_GOOD=true
if [ "$ARENA_TEST" != "200" ]; then ALL_GOOD=false; fi
if [ "$REPLICATE_TEST" != "200" ]; then ALL_GOOD=false; fi
if [ "$IDEOGRAM_TEST" != "422" ] && [ "$IDEOGRAM_TEST" != "200" ]; then ALL_GOOD=false; fi
if [ "$FIGMA_TEST" != "200" ]; then ALL_GOOD=false; fi

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✓ All APIs working!${NC}"
    echo ""
    echo "Next step:"
    echo "  node scripts/muse-create-mood-board.js 'Your app idea'"
    exit 0
else
    echo -e "${RED}✗ Some APIs failed. Check above.${NC}"
    exit 1
fi

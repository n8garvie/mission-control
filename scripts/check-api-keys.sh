#!/bin/bash
# Check API key status for AI Design Workflow

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AI Design Workflow - API Key Status               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

check_key() {
    local name=$1
    local env_var=$2
    local required=$3
    
    if [ -n "${!env_var}" ]; then
        echo -e "${GREEN}✓${NC} $name"
        return 0
    elif [ "$required" = "true" ]; then
        echo -e "${RED}✗${NC} $name ${RED}(REQUIRED)${NC}"
        return 1
    else
        echo -e "${YELLOW}○${NC} $name ${YELLOW}(optional)${NC}"
        return 0
    fi
}

required_missing=0

echo -e "${YELLOW}Required:${NC}"
check_key "Are.na" "ARENA_TOKEN" "true" || ((required_missing++))
check_key "Replicate" "REPLICATE_API_TOKEN" "true" || ((required_missing++))
check_key "Ideogram" "IDEOGRAM_API_KEY" "true" || ((required_missing++))
check_key "Figma" "FIGMA_ACCESS_TOKEN" "true" || ((required_missing++))
check_key "Anthropic (Claude)" "ANTHROPIC_API_KEY" "true" || ((required_missing++))

echo ""
echo -e "${YELLOW}Optional:${NC}"
check_key "Midjourney (Imagine)" "IMAGINE_API_KEY" "false"
check_key "Cloudflare R2" "R2_ACCESS_KEY_ID" "false"

echo ""
if [ $required_missing -eq 0 ]; then
    echo -e "${GREEN}✓ All required keys are set!${NC}"
    echo ""
    echo -e "${BLUE}You can now run:${NC}"
    echo "  node scripts/muse-create-mood-board.js 'Your app idea'"
    exit 0
else
    echo -e "${RED}✗ $required_missing required key(s) missing${NC}"
    echo ""
    echo -e "${BLUE}Run setup:${NC}"
    echo "  bash scripts/setup-api-keys.sh"
    exit 1
fi

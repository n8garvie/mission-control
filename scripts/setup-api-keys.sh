#!/bin/bash
# AI Design Workflow Setup Script
# Checks for API keys and guides you through getting them

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AI Design Workflow - API Key Setup                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists at:${NC} $ENV_FILE"
    read -p "Overwrite? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "Exiting without changes."
        exit 0
    fi
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"
    echo -e "${GREEN}✓ Backup created${NC}"
fi

echo "This script will help you set up API keys for the AI design workflow."
echo ""
echo -e "${YELLOW}Required services:${NC}"
echo "  1. Are.na - Mood board creation (FREE)"
echo "  2. Replicate - Flux 1.1 Pro + background removal (FREE $5 credit)"
echo "  3. Ideogram - Logo/text generation (FREE tier)"
echo "  4. Figma - Design file access (FREE)"
echo ""
echo -e "${YELLOW}Optional:${NC}"
echo "  5. Midjourney - Artistic variations (PAID ~$10/mo via proxy)"
echo "  6. Cloudflare R2 - Asset hosting (FREE tier)"
echo ""

# Function to prompt for API key
prompt_for_key() {
    local name=$1
    local env_var=$2
    local url=$3
    local description=$4
    local required=$5
    
    echo ""
    echo -e "${BLUE}─────────────────────────────────────────────${NC}"
    echo -e "${BLUE}$name${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────${NC}"
    echo "$description"
    echo ""
    
    # Check if already set
    if [ -n "${!env_var}" ]; then
        echo -e "${GREEN}✓ Already set in environment${NC}"
        read -p "Use existing value? (Y/n): " use_existing
        if [[ ! $use_existing =~ ^[Nn]$ ]]; then
            echo "$env_var=${!env_var}" >> "$ENV_FILE"
            return
        fi
    fi
    
    echo -e "Get your key: ${YELLOW}$url${NC}"
    echo ""
    
    if [ "$required" = "true" ]; then
        read -p "Paste your $name API key: " value
        while [ -z "$value" ]; do
            echo -e "${RED}✗ This key is required${NC}"
            read -p "Paste your $name API key: " value
        done
    else
        read -p "Paste your $name API key (or press Enter to skip): " value
        if [ -z "$value" ]; then
            echo -e "${YELLOW}⚠️  Skipped (optional)${NC}"
            echo "#$env_var=" >> "$ENV_FILE"
            return
        fi
    fi
    
    echo "$env_var=$value" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Saved${NC}"
}

# Create .env file
echo "# AI Design Workflow API Keys" > "$ENV_FILE"
echo "# Generated: $(date)" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

# Required keys
prompt_for_key \
    "Are.na" \
    "ARENA_TOKEN" \
    "https://dev.are.na/oauth/applications" \
    "Are.na is used by Muse to create mood boards for each project.\nYou can browse the mood board before generation starts." \
    "true"

prompt_for_key \
    "Replicate" \
    "REPLICATE_API_TOKEN" \
    "https://replicate.com/account/api-tokens" \
    "Replicate runs Flux 1.1 Pro for backgrounds/UI components\nand rembg for background removal. Free $5 credit to start." \
    "true"

prompt_for_key \
    "Ideogram" \
    "IDEOGRAM_API_KEY" \
    "https://ideogram.ai/api" \
    "Ideogram v3 generates logos and text-in-image designs.\nBest model for readable text and typography." \
    "true"

prompt_for_key \
    "Figma" \
    "FIGMA_ACCESS_TOKEN" \
    "https://www.figma.com/developers/api#access-tokens" \
    "Figma token needed for reading design files and exporting.\nThe plugin uses this for the assembler." \
    "true"

# Optional keys
prompt_for_key \
    "Midjourney (via Imagine API)" \
    "IMAGINE_API_KEY" \
    "https://docs.imaginepro.com/" \
    "Midjourney has no official API. This uses a proxy service.\nProvides artistic variations. ~$10/mo. Optional." \
    "false"

prompt_for_key \
    "Cloudflare R2" \
    "R2_ACCESS_KEY_ID" \
    "https://dash.cloudflare.com → R2 → Manage API Tokens" \
    "R2 hosts generated assets for Figma plugin to fetch.\nFree tier: 10GB storage. Optional (can use local URLs)." \
    "false"

if [ -n "$R2_ACCESS_KEY_ID" ]; then
    echo ""
    read -p "R2 Secret Access Key: " r2_secret
    echo "R2_SECRET_ACCESS_KEY=$r2_secret" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Saved${NC}"
    
    read -p "R2 Account ID (from dashboard URL): " r2_account
    echo "R2_ACCOUNT_ID=$r2_account" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Saved${NC}"
    
    read -p "R2 Bucket Name: " r2_bucket
    echo "R2_BUCKET_NAME=$r2_bucket" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Saved${NC}"
fi

# Anthropic (should already be configured but let's check)
echo ""
echo -e "${BLUE}─────────────────────────────────────────────${NC}"
echo -e "${BLUE}Anthropic (Claude)${NC}"
echo -e "${BLUE}─────────────────────────────────────────────${NC}"
echo "Claude Sonnet 4.5 is used to write prompts for all models."
echo "This should be configured in OpenClaw gateway already."
echo ""

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY not found in environment${NC}"
    echo "This is required. Get it at: https://console.anthropic.com/settings/keys"
    read -p "Paste your Anthropic API key: " anthropic_key
    echo "ANTHROPIC_API_KEY=$anthropic_key" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Saved${NC}"
else
    echo -e "${GREEN}✓ Already configured in OpenClaw${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "API keys saved to: ${YELLOW}$ENV_FILE${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. ${YELLOW}Load the environment:${NC}"
echo "   source $ENV_FILE"
echo ""
echo "2. ${YELLOW}Test the pipeline:${NC}"
echo "   node scripts/test-generation.js"
echo ""
echo "3. ${YELLOW}Create your first mood board:${NC}"
echo "   node scripts/muse-create-mood-board.js 'A meditation app that feels calm'"
echo ""
echo -e "${BLUE}Costs estimate:${NC}"
echo "  • Are.na: FREE"
echo "  • Replicate: ~$0.20 per project (Flux + rembg)"
echo "  • Ideogram: ~$0.64 per project (4 logos × $0.08)"
echo "  • Claude: ~$0.12 per project (prompts)"
echo "  ─────────────────────────────"
echo "  Total: ~$1.00 per UI screen"
echo ""
echo -e "${YELLOW}To add these to your shell permanently:${NC}"
echo "  echo 'export \$(cat $ENV_FILE | xargs)' >> ~/.bashrc"
echo ""

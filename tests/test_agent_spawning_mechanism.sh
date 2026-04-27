#!/bin/bash
# E2E Test: Validate Agent Spawning Mechanism for Build Pipeline
# This test validates the complete flow from approved idea → spawned agent

set -e

TEST_DIR="/home/n8garvie/.openclaw/workspace/mission-control"
DASHBOARD_DIR="$TEST_DIR/dashboard"
if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "Error: CONVEX_DEPLOY_KEY env var must be set to run this test" >&2
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     E2E TEST: Agent Spawning Mechanism Validation             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Verify Convex connection
echo "TEST 1: Verify Convex database connection"
cd "$DASHBOARD_DIR"
if npx convex run ideas:getStats > /dev/null 2>&1; then
    echo "  ✓ PASS: Connected to Convex database"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: Cannot connect to Convex database"
    ((TESTS_FAILED++))
fi

# Test 2: Verify approved ideas query works
echo ""
echo "TEST 2: Verify approved ideas query"
APPROVED_JSON=$(npx convex run ideas:list 2>/dev/null | jq -r "[.[] | select(.pipelineStatus == \"approved\")]")
APPROVED_COUNT=$(echo "$APPROVED_JSON" | jq "length")
if [ "$APPROVED_COUNT" -gt 0 ]; then
    echo "  ✓ PASS: Found $APPROVED_COUNT approved ideas"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: No approved ideas found"
    ((TESTS_FAILED++))
fi

# Test 3: Verify each idea has valid structure
echo ""
echo "TEST 3: Validate approved idea structure"
VALID_COUNT=0
echo "$APPROVED_JSON" | jq -c '.[]' | while read -r idea; do
    ID=$(echo "$idea" | jq -r '._id // empty')
    TITLE=$(echo "$idea" | jq -r '.title // empty')
    DESC=$(echo "$idea" | jq -r '.description // empty')
    MVP=$(echo "$idea" | jq -r '.mvpScope // empty')
    
    if [ -n "$ID" ] && [ -n "$TITLE" ] && [ -n "$DESC" ] && [ -n "$MVP" ]; then
        ((VALID_COUNT++))
    fi
done

if [ "$VALID_COUNT" -eq "$APPROVED_COUNT" ]; then
    echo "  ✓ PASS: All $APPROVED_COUNT ideas have valid structure"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: Only $VALID_COUNT of $APPROVED_COUNT ideas are valid"
    ((TESTS_FAILED++))
fi

# Test 4: Verify build starter script components
echo ""
echo "TEST 4: Validate build starter script"
SCRIPT="$TEST_DIR/scripts/nightly-build-starter.sh"
CHECKS=0

# Check script exists
if [ -f "$SCRIPT" ]; then
    echo "  ✓ Script file exists"
    ((CHECKS++))
fi

# Check script is executable
if [ -x "$SCRIPT" ]; then
    echo "  ✓ Script is executable"
    ((CHECKS++))
fi

# Check script contains required components
if grep -q "CONVEX_DEPLOY_KEY" "$SCRIPT"; then
    echo "  ✓ Script exports CONVEX_DEPLOY_KEY"
    ((CHECKS++))
fi

if grep -q "npx convex run ideas:list" "$SCRIPT"; then
    echo "  ✓ Script queries approved ideas"
    ((CHECKS++))
fi

if grep -q "openclaw sessions spawn" "$SCRIPT"; then
    echo "  ✓ Script spawns OpenClaw sessions"
    ((CHECKS++))
fi

if [ "$CHECKS" -eq 5 ]; then
    echo "  ✓ PASS: All script components validated"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: Only $CHECKS of 5 components found"
    ((TESTS_FAILED++))
fi

# Test 5: Verify cron job configuration
echo ""
echo "TEST 5: Validate cron job configuration"
CRON_CHECKS=0

if crontab -l | grep -q "nightly-build-starter.sh"; then
    echo "  ✓ Cron job exists"
    ((CRON_CHECKS++))
fi

if crontab -l | grep "nightly-build-starter.sh" | grep -q "0 1"; then
    echo "  ✓ Cron job scheduled for 1:00 AM"
    ((CRON_CHECKS++))
fi

if crontab -l | grep "nightly-build-starter.sh" | grep -q "logs/nightly-build-starter"; then
    echo "  ✓ Cron job logs to correct location"
    ((CRON_CHECKS++))
fi

if [ "$CRON_CHECKS" -eq 3 ]; then
    echo "  ✓ PASS: Cron job properly configured"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: Only $CRON_CHECKS of 3 cron checks passed"
    ((TESTS_FAILED++))
fi

# Test 6: Verify OpenClaw CLI availability
echo ""
echo "TEST 6: Validate OpenClaw CLI"
if which openclaw > /dev/null 2>&1; then
    echo "  ✓ PASS: OpenClaw CLI found at $(which openclaw)"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: OpenClaw CLI not found in PATH"
    ((TESTS_FAILED++))
fi

# Test 7: Simulate agent spawn command
echo ""
echo "TEST 7: Simulate agent spawn command (dry run)"
SIMULATION_PASSED=0
echo "$APPROVED_JSON" | jq -c '.[]' | head -1 | while read -r idea; do
    IDEA_ID=$(echo "$idea" | jq -r '._id')
    IDEA_TITLE=$(echo "$idea" | jq -r '.title')
    BUILD_ID="build-$(date +%Y%m%d)-$(echo $IDEA_ID | cut -c1-8)"
    
    echo "  Simulating spawn for: $IDEA_TITLE"
    echo "    - Idea ID: $IDEA_ID"
    echo "    - Build ID: $BUILD_ID"
    
    # Validate ID format
    if [[ "$IDEA_ID" =~ ^jh[0-9a-z]{30,}$ ]]; then
        echo "    - ID format: ✓ Valid"
        SIMULATION_PASSED=1
    else
        echo "    - ID format: ✗ Invalid"
    fi
    
    # Show what command would be executed
    echo "    - Would execute: openclaw sessions spawn --task \"Build: $IDEA_TITLE\" ..."
done

if [ "$SIMULATION_PASSED" -eq 1 ]; then
    echo "  ✓ PASS: Agent spawn simulation successful"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: Agent spawn simulation failed"
    ((TESTS_FAILED++))
fi

# Test 8: Verify log directory setup
echo ""
echo "TEST 8: Validate log directory"
if [ -d "$TEST_DIR/logs" ] && [ -w "$TEST_DIR/logs" ]; then
    echo "  ✓ PASS: Log directory exists and is writable"
    ((TESTS_PASSED++))
else
    echo "  ✗ FAIL: Log directory issue"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo "✓ ALL TESTS PASSED"
    echo ""
    echo "Mission Control build agent spawning is properly configured."
    echo "The system will automatically spawn agents for $APPROVED_COUNT approved ideas"
    echo "tonight at 1:00 AM."
    echo ""
    echo "Approved ideas to be built:"
    echo "$APPROVED_JSON" | jq -r '.[] | "  • \(.title)"'
    exit 0
else
    echo "✗ SOME TESTS FAILED"
    exit 1
fi

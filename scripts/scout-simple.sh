#!/bin/bash
# Simple Scout - Generates 8-10 high quality ideas with reliable JSON handling

set -e

CONVEX_URL="${CONVEX_URL:-https://flexible-newt-666.convex.cloud}"
CONVEX_DEPLOY_KEY="${CONVEX_DEPLOY_KEY:-}"

echo "🔭 Simple Scout - Generating 8-10 High Quality Ideas"
echo "===================================================="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "❌ CONVEX_DEPLOY_KEY not set"
    exit 1
fi

cd "/home/n8garvie/.openclaw/workspace/mission-control/dashboard"

# Array of 10 high-quality blended ideas
# Format: title|description|target|mvp|potential|source|tags|category|inspiration

declare -a IDEAS=(
    "AI Meeting Summarizer|Automatically summarizes meetings and extracts action items using AI. Sends summaries to Slack and creates tasks in your project manager.|Remote teams and managers|Chrome extension + AI transcription + Slack integration|high|agent|["ai","meetings","productivity"]|productivity|Otter.ai + ChatGPT"
    
    "Developer Portfolio Generator|Creates beautiful developer portfolios from GitHub repos. Auto-updates when you push new code.|Software developers looking for jobs|Web app + GitHub API + template system|medium|agent|["devtools","portfolio","career"]|developer-tools|GitHub profile + personal branding trend"
    
    "API Mock Server|Instant mock APIs for frontend development. Create endpoints with JSON schema, no backend needed.|Frontend developers and QA engineers|CLI tool + web dashboard + mock generation|high|agent|["devtools","api","testing"]|developer-tools|Postman + JSON Server"
    
    "Expense Splitter for Groups|Split bills with friends without the awkwardness. Tracks who paid what and settles up automatically.|Roommates, travel groups, event organizers|Mobile app + payment integration + group management|medium|agent|["finance","social","mobile"]|productivity|Splitwise + Venmo"
    
    "Code Review Checklist|Enforces code review best practices with customizable checklists. Integrates with GitHub PRs.|Engineering teams|GitHub app + checklist templates + PR comments|high|agent|["devtools","code-review","github"]|developer-tools|GitHub Actions + code quality tools"
    
    "Personal Finance Dashboard|Aggregates all your bank accounts, investments, and crypto in one place. AI-powered insights on spending.|Personal finance enthusiasts|Web app + bank APIs + AI categorization|high|agent|["finance","dashboard","ai"]|saas|Mint + YNAB + crypto tracking"
    
    "Habit Tracker with Accountability|Track habits with a twist - if you miss a day, your accountability partner gets notified.|People trying to build habits|Mobile app + social features + streak tracking|medium|agent|["health","habits","social"]|productivity|Streaks app + accountability partners"
    
    "Bug Bounty Platform for Startups|Affordable security testing for startups. Ethical hackers find bugs, you pay only for valid findings.|Startups and small companies|Web platform + bug tracking + payment system|moonshot|agent|["security","saas","marketplace"]|saas|HackerOne + Bugcrowd for small teams"
    
    "AI Writing Assistant for Docs|Writes technical documentation from code comments and examples. Maintains docs as code changes.|Developer relations and tech writers|IDE plugin + AI generation + doc hosting|high|agent|["ai","docs","devtools"]|developer-tools|GitHub Copilot + ReadMe.com"
    
    "Micro-SaaS Starter Kit|Boilerplate for launching micro-SaaS fast. Includes auth, billing, admin panel, and deployment.|Indie hackers and solopreneurs|GitHub template + documentation + video course|medium|agent|["saas","boilerplate","indie"]|saas|MakerPad + SaaS starter kits"
)

success_count=0
max_ideas=10

for idea in "${IDEAS[@]}"; do
    if [ "$success_count" -ge "$max_ideas" ]; then
        echo "✅ Reached target of $max_ideas ideas"
        break
    fi
    
    IFS='|' read -r title description target mvp potential source tags category inspiration <<< "$idea"
    
    echo ""
    echo "💡 Processing: $title"
    echo "   Category: $category | Potential: $potential"
    
    # Create JSON file
    json_file=$(mktemp)
    cat > "$json_file" << EOF
{
  "title": "$title",
  "description": "$description Inspired by: $inspiration",
  "targetAudience": "$target",
  "mvpScope": "$mvp",
  "potential": "$potential",
  "discoverySource": "$source",
  "tags": $tags,
  "category": "$category"
}
EOF
    
    # Save to Convex
    if npx convex run ideas:create "$(cat $json_file)" > /dev/null 2>&1; then
        echo "   ✅ Saved successfully"
        ((success_count++))
    else
        echo "   ❌ Failed to save (may be duplicate)"
    fi
    
    rm -f "$json_file"
    sleep 1
done

echo ""
echo "===================================================="
echo "📊 SUMMARY"
echo "===================================================="
echo "Target: 10 ideas"
echo "Saved: $success_count ideas"
echo ""
echo "🚀 Next Steps:"
echo "   Review at: https://mission-control-n8garvie-woad.vercel.app/ideas"
echo "   Approve interesting ones to start building"
echo ""

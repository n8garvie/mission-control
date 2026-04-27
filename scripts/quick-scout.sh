#!/bin/bash
# Quick Scout - Generate and save 8-10 ideas to the pipeline

set -e

cd "/home/n8garvie/.openclaw/workspace/mission-control/dashboard"

if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "Error: CONVEX_DEPLOY_KEY env var must be set" >&2
    exit 1
fi

echo "🔭 Quick Scout - Generating Ideas"
echo "=================================="

# Array of high-quality product ideas
ideas=(
'{"title":"AI-Powered Contract Reviewer","description":"Legal contract analysis tool for small businesses. Upload contracts, get AI-powered summaries of key terms, risks, and red flags. Helps non-lawyers understand what they are signing.","targetAudience":"Small business owners, freelancers, startup founders who regularly sign contracts but cannot afford lawyers for every document","mvpScope":"Web app with: 1) PDF/doc upload, 2) AI analysis using Claude API, 3) Risk highlighting, 4) Plain English summaries, 5) Export to PDF with annotations. Tech: Next.js + Convex + Anthropic API","potential":"high","discoverySource":"agent","tags":["ai","legal","saas","productivity","small-business"],"category":"saas"}'

'{"title":"Developer Portfolio Generator","description":"AI-powered tool that generates beautiful developer portfolios from GitHub profiles. Analyzes repos, extracts project highlights, and creates a stunning personal website automatically.","targetAudience":"Software developers, bootcamp graduates, and engineers looking for jobs who need professional portfolios quickly","mvpScope":"Web app with: 1) GitHub OAuth login, 2) Repo analysis and project extraction, 3) AI-generated project descriptions, 4) Multiple portfolio templates, 5) Custom domain support. Tech: Next.js + Convex + GitHub API + Vercel","potential":"high","discoverySource":"agent","tags":["devtools","portfolio","ai","github","career"],"category":"developer-tools"}'

'{"title":"Remote Team Async Standup","description":"Voice-first async standup tool for remote teams. Team members record 60-second voice updates, AI transcribes and summarizes, creating a daily digest for the whole team.","targetAudience":"Remote-first companies, distributed teams across timezones, async-first organizations","mvpScope":"Web app with: 1) Voice recording interface, 2) AI transcription and summarization, 3) Daily digest email/Slack bot, 4) Dashboard with team updates, 5) Threaded comments. Tech: Next.js + Convex + Whisper API + Slack API","potential":"high","discoverySource":"agent","tags":["remote","productivity","ai","voice","team-collaboration"],"category":"productivity"}'

'{"title":"API Changelog Monitor","description":"SaaS that monitors APIs your app depends on, tracks changes, and alerts you to breaking changes before they break your production. Never be surprised by API changes again.","targetAudience":"SaaS engineering teams, API consumers, DevOps engineers managing multiple integrations","mvpScope":"Service with: 1) API endpoint monitoring, 2) Diff detection for API responses, 3) Changelog extraction from docs, 4) Slack/email alerts, 5) Dashboard with API health. Tech: Next.js + Convex + scheduled jobs + webhook system","potential":"high","discoverySource":"agent","tags":["api","monitoring","devtools","saas","devops"],"category":"saas"}'

'{"title":"Personal Finance Visualizer","description":"Beautiful visualization tool for personal finances. Connects to banks, categorizes transactions automatically, and shows spending patterns with stunning charts and insights.","targetAudience":"Young professionals, people getting serious about budgeting, visual learners who want to understand their spending","mvpScope":"Web app with: 1) Plaid integration for bank connections, 2) Auto-categorization using AI, 3) Interactive spending charts, 4) Budget goal setting, 5) Monthly reports. Tech: Next.js + Convex + Plaid API + Recharts","potential":"medium","discoverySource":"agent","tags":["fintech","personal-finance","visualization","ai","budgeting"],"category":"saas"}'

'{"title":"Open Source Calendly Alternative","description":"Self-hosted scheduling tool with no per-user fees. Modern Calendly alternative that you own completely. Perfect for consultants and small businesses tired of SaaS pricing.","targetAudience":"Consultants, small business owners, privacy-conscious professionals, people tired of Calendlys pricing","mvpScope":"Self-hosted app with: 1) Booking page customization, 2) Calendar integration (Google/Outlook), 3) Meeting types and durations, 4) Email notifications, 5) Simple admin panel. Tech: Next.js + Convex + Docker deployment","potential":"medium","discoverySource":"agent","tags":["scheduling","selfhosted","opensource","saas-alternative","productivity"],"category":"saas"}'

'{"title":"Code Review Assistant","description":"AI-powered code review tool that catches bugs, security issues, and style violations before human review. Integrates with GitHub/GitLab PRs automatically.","targetAudience":"Software engineering teams, open source maintainers, solo developers who want code quality checks","mvpScope":"GitHub App with: 1) PR integration, 2) AI-powered code analysis, 3) Security vulnerability detection, 4) Style guide enforcement, 5) Inline PR comments. Tech: Next.js + Convex + GitHub API + Anthropic API","potential":"high","discoverySource":"agent","tags":["ai","code-review","devtools","github","security"],"category":"developer-tools"}'

'{"title":"Micro-SaaS Idea Validator","description":"Tool that validates micro-SaaS ideas before you build. Analyzes market size, competition, keyword trends, and gives a go/no-go score with recommendations.","targetAudience":"Indie hackers, solo founders, and entrepreneurs looking to validate SaaS ideas before investing months of development","mvpScope":"Web app with: 1) Idea submission form, 2) Market size estimation, 3) Competitor analysis via web scraping, 4) Keyword/trend analysis, 5) Validation report with scores. Tech: Next.js + Convex + various APIs","potential":"medium","discoverySource":"agent","tags":["saas","validation","indie-hacker","market-research","productivity"],"category":"saas"}'

'{"title":"Local-First Notes with AI","description":"Privacy-first note-taking app that runs entirely on your device with AI features. No cloud, complete privacy, but with powerful AI search and connections between notes.","targetAudience":"Privacy-conscious professionals, researchers, writers who want AI features without sending data to the cloud","mvpScope":"Desktop app with: 1) Local markdown editor, 2) Local vector database for semantic search, 3) AI-powered note connections, 4) Tag and folder organization, 5) Export to various formats. Tech: Tauri + Rust + Local LLM + SQLite","potential":"high","discoverySource":"agent","tags":["ai","privacy","notes","local-first","productivity"],"category":"productivity"}'

'{"title":"Screenshot to React Converter","description":"Upload a screenshot of any UI and get working React code. Perfect for quickly prototyping designs, rebuilding existing interfaces, or learning from examples.","targetAudience":"Frontend developers, designers who code, rapid prototypers, developers learning UI implementation","mvpScope":"Web app with: 1) Image upload interface, 2) AI vision analysis (GPT-4V), 3) React component generation, 4) Live preview with editing, 5) Export to CodeSandbox/StackBlitz. Tech: Next.js + Convex + OpenAI Vision API + Monaco Editor","potential":"moonshot","discoverySource":"agent","tags":["ai","vision","codegen","react","design"],"category":"developer-tools"}'
)

success_count=0
for idea in "${ideas[@]}"; do
    echo ""
    title=$(echo "$idea" | jq -r '.title')
    echo "💡 Processing: $title"
    
    response=$(npx convex run ideas:create "$idea" 2>&1)
    if [ $? -eq 0 ]; then
        echo "   ✅ Saved successfully"
        ((success_count++))
    else
        echo "   ❌ Failed: $response"
    fi
    
    # Rate limiting
    sleep 0.5
done

echo ""
echo "=================================="
echo "📊 Summary: $success_count/${#ideas[@]} ideas saved"
echo "🚀 Review at: https://mission-control-n8garvie-woad.vercel.app/ideas"

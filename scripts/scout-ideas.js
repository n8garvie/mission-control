#!/usr/bin/env node
/**
 * Scout Agent - Web Research & Idea Generation
 * 
 * Searches Reddit, Hacker News, Product Hunt, and trending topics
 * to generate fresh product ideas. Uses Claude to synthesize findings.
 * 
 * Usage: node scout-ideas.js
 * Env: CONVEX_DEPLOY_KEY (required for saving to dashboard)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCOUT_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/agents/scout-ideas';
const DASHBOARD_DIR = '/home/n8garvie/.openclaw/workspace/mission-control/dashboard';
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || 'dev:beloved-giraffe-115|eyJ2MiI6ImM3ZjkyNDliMDI4ODQ0OThhMDkwMWIyNjIzNDYwMjQ2In0=';

// Diverse sources to search
const SOURCES = {
  reddit: [
    // Tech & building
    { sub: 'SideProject', search: 'launched OR built OR "looking for" OR "wish there was"' },
    { sub: 'indiehackers', search: 'revenue OR launched OR "pain point"' },
    { sub: 'webdev', search: '"I wish" OR "frustrated" OR "alternative to"' },
    { sub: 'selfhosted', search: 'looking OR alternative OR recommend' },
    { sub: 'macapps', search: 'looking OR recommend OR alternative' },
    { sub: 'Entrepreneur', search: '"small business" OR automation OR "save time"' },
    // Nathan's interests
    { sub: 'watches', search: 'tracker OR app OR tool OR spreadsheet' },
    { sub: 'espresso', search: 'app OR tracker OR "dial in" OR log' },
    { sub: 'Porsche', search: 'tool OR app OR compare OR value' },
    { sub: 'homeassistant', search: 'dashboard OR integration OR "wish"' },
    // Design & AI
    { sub: 'UI_Design', search: 'tool OR generator OR "AI" OR automate' },
    { sub: 'artificial', search: 'wrapper OR tool OR "built with" OR API' },
    // Finance & investing
    { sub: 'fatFIRE', search: 'tool OR tracker OR app OR automate' },
    { sub: 'realestateinvesting', search: 'tool OR calculator OR analyze' },
  ],
  hackerNews: [
    'Show HN',
    'Ask HN: What are you working on',
    'Launch HN',
  ],
  productHunt: [
    'developer-tools',
    'productivity',
    'design-tools',
    'artificial-intelligence',
    'fintech',
    'no-code',
  ],
  trends: [
    'trending AI tools 2026',
    'micro SaaS ideas profitable',
    'underserved niches software',
    'boring businesses making money',
    'API first products trending',
  ]
};

async function fetchRedditPosts(subreddit, query, limit = 5) {
  try {
    const url = `https://old.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NateMateBot/1.0)' }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data?.data?.children || []).map(post => ({
      title: post.data.title,
      selftext: (post.data.selftext || '').substring(0, 500),
      score: post.data.score,
      url: `https://reddit.com${post.data.permalink}`,
      subreddit: subreddit,
      source: 'reddit'
    }));
  } catch (err) {
    console.error(`  ⚠️ Reddit r/${subreddit} failed:`, err.message);
    return [];
  }
}

async function fetchHackerNews(query, limit = 5) {
  try {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}&numericFilters=points>5`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.hits || []).map(hit => ({
      title: hit.title,
      selftext: hit.story_text ? hit.story_text.substring(0, 500) : '',
      score: hit.points,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: 'hackernews'
    }));
  } catch (err) {
    console.error(`  ⚠️ HN search failed:`, err.message);
    return [];
  }
}

async function fetchProductHunt(category) {
  try {
    // PH doesn't have a free public API anymore, use their feed
    const url = `https://www.producthunt.com/topics/${category}`;
    // For now, just note the category - in production, use PH API with token
    return [{
      title: `[PH Category: ${category}]`,
      selftext: `Check trending products in ${category}`,
      score: 0,
      url: url,
      source: 'producthunt'
    }];
  } catch (err) {
    return [];
  }
}

async function fetchLobsters(limit = 10) {
  try {
    const response = await fetch('https://lobste.rs/hottest.json');
    if (!response.ok) return [];
    const data = await response.json();
    return data.slice(0, limit).map(post => ({
      title: post.title,
      selftext: post.description || '',
      score: post.score,
      url: post.url || post.short_id_url,
      source: 'lobsters'
    }));
  } catch (err) {
    console.error('  ⚠️ Lobsters failed:', err.message);
    return [];
  }
}

async function fetchGitHubTrending() {
  try {
    // Use GitHub's search API for trending repos
    const response = await fetch('https://api.github.com/search/repositories?q=created:>2026-02-09&sort=stars&order=desc&per_page=10', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map(repo => ({
      title: `${repo.name}: ${repo.description || ''}`.substring(0, 100),
      selftext: repo.description || '',
      score: repo.stargazers_count,
      url: repo.html_url,
      source: 'github-trending'
    }));
  } catch (err) {
    console.error('  ⚠️ GitHub trending failed:', err.message);
    return [];
  }
}

async function gatherResearch() {
  console.log('🔭 Scout: Gathering research from across the web...\n');
  
  const allPosts = [];
  
  // Reddit research (may be rate limited)
  console.log('📱 Reddit (14 subreddits)...');
  for (const { sub, search } of SOURCES.reddit.slice(0, 6)) { // Only first 6 to avoid rate limits
    process.stdout.write(`  r/${sub}... `);
    const posts = await fetchRedditPosts(sub, search, 5);
    allPosts.push(...posts);
    console.log(`${posts.length} posts`);
    await sleep(2000); // Slower rate limit
  }
  
  // Hacker News research
  console.log('\n🟧 Hacker News...');
  for (const query of SOURCES.hackerNews) {
    process.stdout.write(`  "${query}"... `);
    const posts = await fetchHackerNews(query, 8);
    allPosts.push(...posts);
    console.log(`${posts.length} posts`);
    await sleep(500);
  }
  
  // Lobsters
  console.log('\n🦞 Lobsters...');
  process.stdout.write('  Hottest... ');
  const lobsterPosts = await fetchLobsters(10);
  allPosts.push(...lobsterPosts);
  console.log(`${lobsterPosts.length} posts`);
  
  // GitHub Trending
  console.log('\n🐙 GitHub Trending...');
  process.stdout.write('  This week... ');
  const ghPosts = await fetchGitHubTrending();
  allPosts.push(...ghPosts);
  console.log(`${ghPosts.length} repos`);
  
  console.log(`\n📊 Total posts gathered: ${allPosts.length}`);
  return allPosts;
}

async function getExistingIdeas() {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ideas:list 2>/dev/null`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY } }
    );
    return JSON.parse(output).map(i => i.title.toLowerCase());
  } catch {
    return [];
  }
}

async function getRejectedIdeas() {
  try {
    const output = execSync(
      `cd "${DASHBOARD_DIR}" && npx convex run ideas:listRejected 2>/dev/null`,
      { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY } }
    );
    return JSON.parse(output).map(i => i.title.toLowerCase());
  } catch {
    return [];
  }
}

async function generateIdeasFromResearch(posts, existingTitles, rejectedTitles) {
  console.log('\n🧠 Scout: Piping research through Claude for synthesis...\n');
  
  // Build research digest for Claude
  const researchDigest = posts
    .filter(p => p.title && p.title.length > 10)
    .slice(0, 50)
    .map(p => {
      let line = `[${p.source}${p.subreddit ? ` r/${p.subreddit}` : ''}] (score:${p.score}) ${p.title}`;
      if (p.selftext && p.selftext.length > 20) line += `\n  ${p.selftext.substring(0, 300)}`;
      return line;
    })
    .join('\n\n');
  
  const existingList = existingTitles.length > 0 ? existingTitles.join(', ') : 'None';
  const rejectedList = rejectedTitles.length > 0 ? rejectedTitles.join(', ') : 'None';
  
  const prompt = `You are Scout, an AI product idea researcher. You've just scanned the web and found these posts from Reddit, Hacker News, Lobsters, and GitHub Trending.

Your job: Synthesize these raw signals into 5-7 **concrete, buildable product ideas** that a solo developer could ship as a side project in 1-2 weeks.

## Research Digest

${researchDigest}

## Context

- The builder is Nathan, a senior product design director at Meta who builds side projects
- He's interested in: watches, Porsche 997.2, espresso, smart home, AI tools, design tools, finance
- He values: clean UI, data-driven tools, things that save time, premium feel
- He builds with: Next.js, Convex, Vercel, Tailwind, AI APIs

## Already in pipeline (DO NOT suggest these):
${existingList}

## Previously rejected (DO NOT suggest these):
${rejectedList}

## Requirements

For each idea, return a JSON array. Each idea must have:
- **title**: Short, catchy product name (3-5 words max)
- **description**: 2-3 sentence pitch explaining the problem and solution
- **targetAudience**: Who specifically would use this
- **mvpScope**: What the MVP includes (be specific: "X page with Y feature + Z integration")
- **potential**: "low" | "medium" | "high" | "moonshot"
- **source**: Which post(s) inspired this (URL or description)
- **tags**: Array of 2-4 relevant tags

## Rules
1. DO NOT just restate post titles. Synthesize multiple signals into novel ideas.
2. Each idea must be buildable in 1-2 weeks by one developer.
3. Prefer ideas with clear monetization (freemium, one-time purchase, API usage).
4. At least 1 idea should relate to Nathan's personal interests.
5. At least 1 idea should be an AI-powered tool.
6. Names should be memorable and brandable.

Return ONLY a valid JSON array. No markdown, no explanation.`;

  try {
    // Get API key from OpenClaw gateway config
    let apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      // Try to get from OpenClaw config
      try {
        const configOutput = execSync('openclaw config get 2>/dev/null || true', { encoding: 'utf-8' });
        const match = configOutput.match(/ANTHROPIC_API_KEY[=:]\s*(\S+)/);
        if (match) apiKey = match[1];
      } catch {}
    }
    
    if (!apiKey) {
      // Try reading from gateway auth
      try {
        const authFile = '/home/n8garvie/.openclaw/agents/main/agent/auth-profiles.json';
        if (fs.existsSync(authFile)) {
          const auth = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
          apiKey = auth?.profiles?.['anthropic:default']?.key;
        }
      } catch {}
    }
    
    if (!apiKey) {
      console.log('  ⚠️ No Anthropic API key found. Falling back to basic extraction.');
      return fallbackExtract(posts, existingTitles, rejectedTitles);
    }
    
    console.log('  📡 Calling Claude Sonnet...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error(`  ❌ Claude API error: ${err.substring(0, 200)}`);
      return fallbackExtract(posts, existingTitles, rejectedTitles);
    }
    
    const result = await response.json();
    const text = result.content[0].text.trim();
    
    // Parse JSON response
    let ideas;
    try {
      // Handle potential markdown wrapping
      const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      ideas = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('  ❌ Failed to parse Claude response as JSON');
      console.error('  Response:', text.substring(0, 200));
      return fallbackExtract(posts, existingTitles, rejectedTitles);
    }
    
    // Validate and clean ideas
    const validIdeas = ideas
      .filter(idea => idea.title && idea.description && idea.targetAudience)
      .map(idea => ({
        title: idea.title.substring(0, 80),
        description: idea.description.substring(0, 500),
        targetAudience: idea.targetAudience.substring(0, 200),
        mvpScope: (idea.mvpScope || 'TBD').substring(0, 300),
        potential: ['low', 'medium', 'high', 'moonshot'].includes(idea.potential) ? idea.potential : 'medium',
        source: (idea.source || 'web-research').substring(0, 300),
        tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 5) : ['web-research']
      }));
    
    console.log(`  ✅ Claude generated ${validIdeas.length} synthesized ideas`);
    return validIdeas;
    
  } catch (err) {
    console.error('  ❌ Claude synthesis failed:', err.message);
    return fallbackExtract(posts, existingTitles, rejectedTitles);
  }
}

// Fallback: basic extraction without Claude
function fallbackExtract(posts, existingTitles, rejectedTitles) {
  console.log('  📝 Using basic extraction (no Claude)...');
  const seenTitles = new Set([...existingTitles, ...rejectedTitles]);
  
  return posts
    .filter(p => p.score > 5 && p.title.length > 15)
    .filter(p => !seenTitles.has(p.title.toLowerCase()))
    .slice(0, 5)
    .map(p => ({
      title: p.title.substring(0, 60),
      description: p.selftext || p.title,
      targetAudience: 'Tech-savvy professionals',
      mvpScope: 'TBD - needs brief expansion',
      potential: p.score > 100 ? 'high' : 'medium',
      source: p.url,
      tags: [p.source || 'web']
    }));
}

async function saveAndBuildIdeas(ideas) {
  console.log(`\n💾 Saving ${ideas.length} ideas and triggering builds...\n`);
  
  let saved = 0;
  const approvedIdeaIds = [];
  
  for (const idea of ideas) {
    try {
      // Step 1: Create idea (pending status)
      const args = JSON.stringify({
        title: idea.title,
        description: idea.description,
        targetAudience: idea.targetAudience,
        mvpScope: idea.mvpScope,
        potential: idea.potential,
        source: idea.source,
        tags: idea.tags
      });
      
      const output = execSync(
        `cd "${DASHBOARD_DIR}" && npx convex run ideas:create '${args.replace(/'/g, "'\\''")}'`,
        { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
      );
      
      const result = JSON.parse(output);
      const ideaId = result?._id || result;
      
      if (ideaId) {
        // Step 2: Auto-approve (skip manual approval)
        execSync(
          `cd "${DASHBOARD_DIR}" && npx convex run ideas:approve '{"ideaId":"${ideaId}"}'`,
          { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
        );
        
        approvedIdeaIds.push(ideaId);
        console.log(`  ✅ ${idea.title} (approved for build)`);
        saved++;
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${idea.title} - ${err.message.substring(0, 100)}`);
    }
  }
  
  // Step 3: Trigger overnight build immediately if we have approved ideas
  if (approvedIdeaIds.length > 0) {
    console.log(`\n🔨 Triggering builds for ${approvedIdeaIds.length} ideas...`);
    try {
      execSync(
        `cd "/home/n8garvie/.openclaw/workspace/mission-control" && bash scripts/overnight-build.sh`,
        { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
      );
      console.log(`  ✅ Build triggered`);
    } catch (err) {
      console.error(`  ⚠️ Build trigger failed: ${err.message.substring(0, 100)}`);
    }
  }
  
  return saved;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🔭 Scout Agent - Silent Mode                          ║');
  console.log('║  Auto-builds ideas • No approval needed                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}\n`);
  
  try {
    // Step 1: Gather research
    const posts = await gatherResearch();
    
    // Step 2: Get existing and rejected ideas
    const existing = await getExistingIdeas();
    const rejected = await getRejectedIdeas();
    console.log(`\n📋 Existing ideas: ${existing.length}, Rejected: ${rejected.length}`);
    
    // Step 3: Generate ideas
    const ideas = await generateIdeasFromResearch(posts, existing, rejected);
    console.log(`\n💡 Generated ${ideas.length} new ideas`);
    
    if (ideas.length === 0) {
      console.log('\n⚠️ No new ideas found this sprint. Try again later.');
      return;
    }
    
    // Step 4: Save and auto-build ideas (silent mode)
    const saved = await saveAndBuildIdeas(ideas);
    
    // Step 5: Update working memory
    const memoryDir = path.join(SCOUT_DIR, 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    
    const logFile = path.join(memoryDir, `sprint-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      postsScanned: posts.length,
      ideasGenerated: ideas.length,
      ideasSaved: saved,
      ideas: ideas
    }, null, 2));
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Scout Sprint Complete (Silent Mode)');
    console.log('═'.repeat(60));
    console.log(`  Posts scanned: ${posts.length}`);
    console.log(`  Ideas generated: ${ideas.length}`);
    console.log(`  Ideas auto-approved & building: ${saved}`);
    console.log(`  Log: ${logFile}`);
    console.log(`\n  🎯 Silent mode: Builds triggered automatically.`);
    console.log(`     You'll be notified only when deployments complete.`);

  } catch (err) {
    console.error('❌ Scout failed:', err.message);
    process.exit(1);
  }
}

main();
